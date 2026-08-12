import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import { CheckCircle2, ShoppingBag, AlertTriangle, ShieldCheck } from 'lucide-react'

import { useStudio } from '../context/StudioContext'
import { API_URL } from '../config/api'

export default function Checkout() {
  const { items, subtotal, coupon: activeCoupon, discountAmount, applyCoupon, removeCoupon, clearCart } = useCart()
  const { user, token } = useAuth()
  const { shippingSettings } = useStudio()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState(null)

  const isShippingEnabled = shippingSettings?.shippingFeeEnabled ?? true
  const standardShippingFee = shippingSettings?.standardShippingFee ?? 100
  const freeThreshold = shippingSettings?.freeShippingThreshold ?? 2500

  const shipping = isShippingEnabled ? (subtotal >= freeThreshold ? 0 : standardShippingFee) : 0
  const total = Math.max(0, subtotal - discountAmount + shipping)

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    const res = applyCoupon(couponInput)
    setCouponMsg(res)
    if (res.success) {
      setCouponInput('')
    }
  }

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
  })

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || '',
        pincode: prev.pincode || user.pincode || '',
      }))
    }
  }, [user])

  const [pincodeStatus, setPincodeStatus] = useState({ loading: false, success: false, message: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handlePincodeChange = async (e) => {
    const rawVal = e.target.value
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 6)
    setForm((prev) => ({ ...prev, pincode: digitsOnly }))

    if (digitsOnly.length < 6) {
      setPincodeStatus({
        loading: false,
        success: false,
        message: digitsOnly.length > 0 ? `PIN code must be 6 digits (${digitsOnly.length}/6)` : '',
      })
      return
    }

    setPincodeStatus({ loading: true, success: false, message: '🔍 Fetching city & location...' })
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`)
      const data = await res.json()
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        const city = postOffice.District || postOffice.Block || postOffice.Name || ''
        const state = postOffice.State || ''
        setForm((prev) => ({
          ...prev,
          city: city || prev.city,
          state: state || prev.state,
        }))
        setPincodeStatus({
          loading: false,
          success: true,
          message: `📍 ${city}${state ? `, ${state}` : ''}`,
        })
      } else {
        setPincodeStatus({
          loading: false,
          success: false,
          message: '⚠️ Invalid PIN code or postal data not found',
        })
      }
    } catch (err) {
      console.error('Pincode auto-fetch error:', err)
      setPincodeStatus({ loading: false, success: false, message: '' })
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePay = async (e) => {
    e.preventDefault()
    if (processing) return

    if (!/^\d{6}$/.test(form.pincode)) {
      alert('Please enter a valid 6-digit numeric PIN code (e.g. 562159).')
      return
    }

    setProcessing(true)

    try {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.')
        setProcessing(false)
        return
      }

      const payload = {
        items: items.map((i) => ({
          productId: i.id || i._id,
          title: i.title,
          price: i.price,
          qty: i.qty,
          image: i.image,
        })),
        shippingAddress: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          line1: form.address,
          address: form.address,
          city: form.city,
          pincode: form.pincode,
        },
        subtotal,
        discountAmount,
        couponCode: activeCoupon?.code || '',
        shipping,
        total,
        paymentMethod: 'Razorpay Prepaid',
      }

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Failed to create order:', res.status, errText)
        alert('Failed to initialize order on server. Please try again.')
        setProcessing(false)
        return
      }

      const savedOrder = await res.json()
      const razorpayKey = savedOrder.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_TNkyGJugajutew'
      let razorpayOrderId = savedOrder.razorpayOrderId || savedOrder.order_id || savedOrder.id

      if (!razorpayOrderId) {
        try {
          const rzpRes = await fetch(`${API_URL}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(total * 100),
              currency: 'INR',
              receipt: savedOrder._id,
            }),
          })
          if (rzpRes.ok) {
            const rzpData = await rzpRes.json()
            razorpayOrderId = rzpData.id || rzpData.order_id
          }
        } catch (e) {
          console.error('Failed to create Razorpay order ID:', e)
        }
      }

      if (!razorpayOrderId) {
        alert('Could not initialize Razorpay payment. Please try again.')
        setProcessing(false)
        return
      }

      const options = {
        key: razorpayKey,
        amount: Math.round(total * 100),
        currency: 'INR',
        name: 'Lily Charm Floral Studio',
        description: 'Handcrafted Velvet Floral Art Order',
        order_id: razorpayOrderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        theme: {
          color: '#2D3926',
        },
        handler: async function (response) {
          setProcessing(true)
          try {
            const verifyRes = await fetch(`${API_URL}/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: savedOrder._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success !== false) {
              setOrderConfirmed(verifyData.order || savedOrder)
              clearCart()
            } else {
              alert(`Payment Verification Failed: ${verifyData.message || 'Signature mismatch'}`)
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr)
            alert('Connection error while verifying payment.')
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error)
        alert(`Payment Failed: ${response.error.description || response.error.reason || 'Transaction could not be completed.'}`)
        setProcessing(false)
      })

      rzp.open()
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Connection error during checkout. Please try again.')
      setProcessing(false)
    }
  }

  if (orderConfirmed) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-36 pb-24 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto border border-emerald-300 shadow-md">
          <CheckCircle2 size={44} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-display)]">Order Confirmed!</h1>
        <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
          Thank you for your order, <strong className="text-[var(--color-ink)]">{orderConfirmed.shippingAddress?.name || form.name}</strong>! Your order reference is{' '}
          <strong className="text-[var(--color-primary)] font-mono">{orderConfirmed.orderNumber || orderConfirmed._id}</strong>.
        </p>
        <div className="card-luxury p-6 max-w-lg mx-auto text-left text-xs space-y-3">
          <div className="flex justify-between border-b border-[var(--color-line)] pb-2 font-bold uppercase">
            <span>Payment Status</span>
            <span className="text-emerald-700 font-mono flex items-center gap-1"><ShieldCheck size={14} /> PAID (Razorpay)</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Shipping Address:</span>
            <span className="font-semibold text-right max-w-xs">{orderConfirmed.shippingAddress?.address}, {orderConfirmed.shippingAddress?.city} - {orderConfirmed.shippingAddress?.pincode}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[var(--color-line)] font-bold text-sm">
            <span>Total Amount Paid:</span>
            <span className="text-[var(--color-primary)]">{formatPrice(orderConfirmed.grandTotal ?? orderConfirmed.total ?? total)}</span>
          </div>
        </div>
        <div className="pt-4">
          <button
            onClick={() => navigate('/shop')}
            className="btn-primary px-8 py-3.5 text-xs"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-40 pb-24 text-center space-y-4">
        <ShoppingBag size={40} className="mx-auto text-[var(--color-ink-soft)]" />
        <h1 className="text-2xl font-[var(--font-display)]">Your bag is empty</h1>
        <p className="text-[var(--color-ink-soft)] text-sm">Add a piece from the shop before checking out.</p>
        <button onClick={() => navigate('/shop')} className="btn-primary mt-4 px-6 py-3 text-xs">
          Explore Shop
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 w-full max-w-full">
      <Reveal>
        <span className="eyebrow block mb-1.5 text-[var(--color-primary)] font-bold">Secure Storefront Checkout</span>
        <h1 className="text-2xl sm:text-3xl mb-6 sm:mb-8 font-[var(--font-display)] font-bold">Checkout</h1>
        
        <form onSubmit={handlePay} className="space-y-6 sm:space-y-8">
          <div>
            <p className="eyebrow mb-3 sm:mb-4 text-[var(--color-primary)]">1. Contact Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <input name="name" required value={form.name} onChange={handleChange} placeholder="Full name *" className="input-luxury text-xs" />
              <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="Email address *" className="input-luxury text-xs" />
              <input name="phone" required value={form.phone} onChange={handleChange} placeholder="Phone number *" className="input-luxury text-xs col-span-1 sm:col-span-2 font-mono" />
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3 sm:mb-4 text-[var(--color-primary)]">2. Shipping Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              <input name="address" required value={form.address} onChange={handleChange} placeholder="Street address *" className="input-luxury text-xs col-span-1 sm:col-span-2" />
              <input name="city" required value={form.city} onChange={handleChange} placeholder="City / District *" className="input-luxury text-xs font-semibold" />
              
              <div className="w-full">
                <input
                  name="pincode"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  required
                  value={form.pincode}
                  onChange={handlePincodeChange}
                  placeholder="PIN code (6 digits) *"
                  className={`input-luxury text-xs font-mono ${
                    pincodeStatus.message && !pincodeStatus.success && !pincodeStatus.loading
                      ? 'border-amber-600 focus:border-amber-600'
                      : pincodeStatus.success
                      ? 'border-emerald-600 focus:border-emerald-600'
                      : ''
                  }`}
                />
                {pincodeStatus.message && (
                  <p className={`text-[0.68rem] mt-1 font-semibold ${
                    pincodeStatus.loading
                      ? 'text-blue-600 animate-pulse'
                      : pincodeStatus.success
                      ? 'text-emerald-700 font-mono'
                      : 'text-amber-700'
                  }`}>
                    {pincodeStatus.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3 sm:mb-4 text-[var(--color-primary)]">3. Payment Gateway</p>
            <div className="card-luxury p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--color-silk)]">
              <span className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[var(--color-primary)]" />
                Razorpay — Cards, UPI (GPay, PhonePe, Paytm), Netbanking
              </span>
              <span className="specimen-tag bg-emerald-800 text-white font-mono px-2.5 py-1 rounded-md self-start sm:self-auto">
                100% SECURE
              </span>
            </div>
          </div>

          {/* Cancellation Policy Disclaimer */}
          <div className="p-4 bg-amber-50/90 border border-amber-300 text-[0.72rem] text-amber-950 leading-relaxed rounded-xl space-y-1.5 shadow-sm">
            <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-900 text-xs">
              <AlertTriangle size={15} className="text-amber-700 shrink-0" />
              Studio Cancellation &amp; Refund Policy
            </div>
            <p>
              • <strong>Online Self-Cancellation:</strong> You can cancel your order before handcrafting begins. Customer self-cancellation incurs a <strong>3% payment processing fee</strong> (97% net amount is refunded to your original payment method).
            </p>
            <p>
              • <strong>Studio Admin Cancellation:</strong> If cancelled by Studio Admin, a <strong>100% full refund</strong> is issued immediately with 0% deduction.
            </p>
          </div>

          <button type="submit" disabled={processing} className="btn-primary w-full py-4 text-xs uppercase tracking-widest font-bold disabled:opacity-60">
            {processing ? 'Processing Payment & Saving Order...' : `Pay ${formatPrice(total)} Now`}
          </button>
        </form>
      </Reveal>

      {/* Right: Sticky Order Summary */}
      <Reveal delay={0.1}>
        <div className="card-luxury p-5 sm:p-6 lg:sticky lg:top-28 border border-[var(--color-line)] space-y-5 w-full shadow-md">
          <p className="eyebrow text-[var(--color-primary)]">Order Summary</p>
          
          <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <img src={item.image} alt={item.title} className="w-14 h-16 object-cover shrink-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)]" />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold leading-tight truncate">{item.title}</p>
                  <p className="text-[var(--color-ink-soft)] mt-0.5 font-mono">Qty: {item.qty}</p>
                </div>
                <p className="text-xs font-bold text-[var(--color-primary)] font-serif shrink-0">{formatPrice(item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          {/* Promo Code Box */}
          <div className="pt-3 border-t border-[var(--color-line)] space-y-2">
            {activeCoupon ? (
              <div className="bg-emerald-50 border border-emerald-300 p-2.5 text-xs flex justify-between items-center rounded-xl">
                <div>
                  <p className="font-bold text-emerald-900 flex items-center gap-1">
                    ✨ {activeCoupon.code}
                  </p>
                  <p className="text-[0.68rem] text-emerald-700">{activeCoupon.label}</p>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-rose-700 font-bold uppercase text-[0.65rem] hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Promo code"
                    className="input-luxury text-xs uppercase font-mono py-2"
                  />
                  <button type="submit" className="btn-outline text-[0.68rem] uppercase font-bold px-3.5 py-2 shrink-0">
                    Apply
                  </button>
                </div>
                <p className="text-[0.62rem] text-[var(--color-ink-soft)]">Promo codes: <span className="font-mono font-bold text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('LILY10')}>LILY10</span>, <span className="font-mono font-bold text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('VELVET20')}>VELVET20</span></p>
              </form>
            )}

            {couponMsg && (
              <div className={`text-[0.68rem] p-2 rounded-lg ${couponMsg.success ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-rose-100 text-rose-800'}`}>
                {couponMsg.message}
              </div>
            )}
          </div>

          <div className="space-y-2.5 text-xs pt-3 border-t border-[var(--color-line)]">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-serif font-semibold">{formatPrice(subtotal)}</span></div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Promo Discount ({activeCoupon?.code})</span>
                <span className="font-serif">-{formatPrice(discountAmount)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span>Shipping Charge</span>
              <span className="font-bold font-serif">
                {shipping === 0 ? (
                  <span className="text-emerald-700 font-mono">
                    FREE {isShippingEnabled && subtotal >= freeThreshold ? `(> ₹${freeThreshold})` : ''}
                  </span>
                ) : (
                  formatPrice(shipping)
                )}
              </span>
            </div>
            
            {isShippingEnabled && shipping > 0 && subtotal < freeThreshold && (
              <p className="text-[0.68rem] text-emerald-900 bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-medium text-center">
                ✨ Add {formatPrice(freeThreshold - subtotal)} more for <strong>FREE Shipping!</strong>
              </p>
            )}
            
            <div className="flex justify-between font-[var(--font-display)] text-lg font-bold pt-3 border-t border-[var(--color-line)] text-[var(--color-ink)]">
              <span>Total Amount</span>
              <span className="text-[var(--color-primary)] font-serif">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
