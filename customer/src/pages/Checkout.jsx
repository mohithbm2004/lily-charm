import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import { CheckCircle2, ShoppingBag } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://lily-charm-server.onrender.com/api' : 'http://localhost:5000/api')

export default function Checkout() {
  const { items, subtotal, coupon: activeCoupon, discountAmount, applyCoupon, removeCoupon, clearCart } = useCart()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState(null)

  const shipping = 0 // Free Shipping for testing
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

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
      const razorpayKey = savedOrder.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TLoEPV6mAmj7q5'
      let razorpayOrderId = savedOrder.razorpayOrderId || savedOrder.order_id || savedOrder.id

      if (!razorpayOrderId) {
        console.log('Fetching Razorpay order ID from /api/create-order...')
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

      // Open Razorpay Standard Checkout Modal
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
          color: '#882233',
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
            console.log('Razorpay payment modal closed by user.')
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
        <div className="w-20 h-20 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-display)] uppercase">Order Confirmed!</h1>
        <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
          Thank you for your order, <strong className="text-[var(--color-ink)]">{orderConfirmed.shippingAddress?.name || form.name}</strong>! Your order number is{' '}
          <strong className="text-[var(--color-primary)] font-mono">{orderConfirmed.orderNumber || orderConfirmed._id}</strong>.
        </p>
        <div className="bg-[var(--color-beige)]/40 p-6 border border-[var(--color-line)] max-w-lg mx-auto text-left text-xs space-y-2">
          <div className="flex justify-between border-b border-[var(--color-line)] pb-2 font-bold uppercase">
            <span>Payment Status</span>
            <span className="text-emerald-700 font-mono">PAID (Razorpay)</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Shipping To:</span>
            <span className="font-semibold text-right">{orderConfirmed.shippingAddress?.address}, {orderConfirmed.shippingAddress?.city} - {orderConfirmed.shippingAddress?.pincode}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-[var(--color-line)] font-bold text-sm">
            <span>Total Paid:</span>
            <span className="text-[var(--color-primary)]">{formatPrice(orderConfirmed.total || total)}</span>
          </div>
        </div>
        <div className="pt-4">
          <button
            onClick={() => navigate('/shop')}
            className="btn-primary px-8 py-3 text-xs uppercase tracking-widest font-bold"
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
        <h1 className="text-2xl mb-1">Your bag is empty</h1>
        <p className="text-[var(--color-ink-soft)] text-sm">Add a piece from the shop before checking out.</p>
        <button onClick={() => navigate('/shop')} className="btn-primary mt-4 px-6 py-2.5 text-xs">
          Explore Shop
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 pt-32 pb-24 grid grid-cols-1 md:grid-cols-[1fr_380px] gap-14">
      <Reveal>
        <h1 className="text-3xl mb-8 font-[var(--font-display)] font-bold uppercase">Checkout</h1>
        <form onSubmit={handlePay} className="space-y-8">
          <div>
            <p className="eyebrow mb-4">Contact Information</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <input name="name" required onChange={handleChange} placeholder="Full name *" className="border border-[var(--color-line)] bg-transparent px-4 py-3 text-xs focus:outline-none focus:border-[var(--color-primary)] col-span-2 sm:col-span-1" />
              <input name="email" type="email" required onChange={handleChange} placeholder="Email address *" className="border border-[var(--color-line)] bg-transparent px-4 py-3 text-xs focus:outline-none focus:border-[var(--color-primary)] col-span-2 sm:col-span-1" />
              <input name="phone" required onChange={handleChange} placeholder="Phone number *" className="border border-[var(--color-line)] bg-transparent px-4 py-3 text-xs focus:outline-none focus:border-[var(--color-primary)] col-span-2 font-mono" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">Shipping Address</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <input name="address" required onChange={handleChange} placeholder="Street address *" className="border border-[var(--color-line)] bg-transparent px-4 py-3 text-xs focus:outline-none focus:border-[var(--color-primary)] col-span-2" />
              <input name="city" required onChange={handleChange} placeholder="City *" className="border border-[var(--color-line)] bg-transparent px-4 py-3 text-xs focus:outline-none focus:border-[var(--color-primary)]" />
              <input name="pincode" required onChange={handleChange} placeholder="PIN code *" className="border border-[var(--color-line)] bg-transparent px-4 py-3 text-xs focus:outline-none focus:border-[var(--color-primary)] font-mono" />
            </div>
          </div>
          <div>
            <p className="eyebrow mb-4">Payment Method</p>
            <div className="border border-[var(--color-line)] px-4 py-3.5 text-xs flex items-center justify-between bg-[var(--color-beige)]/30">
              <span className="font-semibold">Razorpay — Cards, UPI, Netbanking</span>
              <span className="specimen-tag bg-emerald-800 text-white font-mono">100% SECURE</span>
            </div>
          </div>
          <button type="submit" disabled={processing} className="btn-primary w-full py-3.5 text-xs uppercase tracking-widest font-bold disabled:opacity-60">
            {processing ? 'Processing Payment & Saving Order...' : `Pay ${formatPrice(total)} Now`}
          </button>
        </form>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-[var(--color-beige)]/30 p-6 sticky top-28 border border-[var(--color-line)] space-y-5">
          <p className="eyebrow mb-2">Order Summary</p>
          <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img src={item.image} alt={item.title} className="w-14 h-16 object-cover shrink-0 border border-[var(--color-line)]" />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold leading-tight">{item.title}</p>
                  <p className="text-[var(--color-ink-soft)] mt-0.5">Qty: {item.qty}</p>
                </div>
                <p className="text-xs font-bold text-[var(--color-primary)]">{formatPrice(item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          {/* Promo Code Entry Box */}
          <div className="pt-3 border-t border-[var(--color-line)] space-y-2">
            {activeCoupon ? (
              <div className="bg-emerald-50 border border-emerald-300 p-2.5 text-xs flex justify-between items-center rounded">
                <div>
                  <p className="font-bold text-emerald-900 flex items-center gap-1">
                    ✨ {activeCoupon.code}
                  </p>
                  <p className="text-[0.68rem] text-emerald-700">{activeCoupon.label}</p>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-rose-600 font-bold uppercase text-[0.65rem] hover:underline"
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
                    className="flex-1 border border-[var(--color-line)] bg-white px-3 py-2 text-xs uppercase focus:outline-none focus:border-[var(--color-primary)] font-mono"
                  />
                  <button type="submit" className="btn-outline text-[0.68rem] uppercase font-bold text-[var(--color-ink)] px-3">
                    Apply
                  </button>
                </div>
                <p className="text-[0.65rem] text-[var(--color-ink-soft)]">Promo codes: <span className="font-mono font-bold text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('LILY10')}>LILY10</span> (10% OFF), <span className="font-mono font-bold text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('VELVET20')}>VELVET20</span> (20% OFF)</p>
              </form>
            )}

            {couponMsg && (
              <div className={`text-[0.68rem] p-2 rounded ${couponMsg.success ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-rose-100 text-rose-800'}`}>
                {couponMsg.message}
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs pt-3 border-t border-[var(--color-line)]">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Promo Discount ({activeCoupon?.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
            <div className="flex justify-between font-[var(--font-display)] text-lg font-bold pt-3 border-t border-[var(--color-line)] text-[var(--color-ink)]">
              <span>Total Amount</span><span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
