import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import AuthModal from '../components/AuthModal'
import TermsModal from '../components/TermsModal'
import { CheckCircle2, ShoppingBag, AlertTriangle, Package, MapPin } from 'lucide-react'

import { useStudio } from '../context/StudioContext'
import { API_URL, RAZORPAY_KEY_ID } from '../config/api'

export default function Checkout() {
  const { items, subtotal, coupon: activeCoupon, discountAmount, applyCoupon, removeCoupon, clearCart } = useCart()
  const { user, token, loading: authLoading } = useAuth()
  const { shippingSettings, shippingLoading, refreshSettingsFromApi } = useStudio()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('login')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    if (refreshSettingsFromApi) {
      refreshSettingsFromApi()
    }
  }, [])

  const rawEnabled = shippingSettings?.shippingFeeEnabled
  const isShippingEnabled = rawEnabled === true || rawEnabled === 'true' || rawEnabled === undefined || rawEnabled === null
  const standardShippingFee = Number(shippingSettings?.standardShippingFee) || 100
  const freeThreshold = Number(shippingSettings?.freeShippingThreshold) || 2000

  const shipping = isShippingEnabled ? (subtotal >= freeThreshold ? 0 : standardShippingFee) : 0
  const total = Math.max(0, subtotal - discountAmount + shipping)

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    const res = await applyCoupon(couponInput)
    setCouponMsg(res)
    if (res.success) {
      setCouponInput('')
    }
  }

  const handleRemoveCoupon = () => {
    removeCoupon()
    setCouponMsg(null)
  }

  const extract10Digits = (ph) => (ph || '').replace(/\D/g, '').slice(-10)

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: extract10Digits(user?.phone),
    address: user?.address || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
  })

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        name: prev.name !== undefined && prev.name !== '' ? prev.name : (user.name || ''),
        email: prev.email !== undefined && prev.email !== '' ? prev.email : (user.email || ''),
        phone: prev.phone !== undefined ? prev.phone : extract10Digits(user.phone),
        address: prev.address !== undefined && prev.address !== '' ? prev.address : (user.address || ''),
        city: prev.city !== undefined && prev.city !== '' ? prev.city : (user.city || ''),
        pincode: prev.pincode !== undefined && prev.pincode !== '' ? prev.pincode : (user.pincode || ''),
      }))
    }
  }, [user])

  const [pincodeStatus, setPincodeStatus] = useState({ loading: false, success: false, message: '' })
  const [formErrors, setFormErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handlePincodeChange = async (e) => {
    const rawVal = e.target.value
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 6)
    setForm((prev) => ({ ...prev, pincode: digitsOnly }))
    if (formErrors.pincode) {
      setFormErrors((prev) => ({ ...prev, pincode: '' }))
    }

    if (digitsOnly.length < 6) {
      setPincodeStatus({
        loading: false,
        success: false,
        message: digitsOnly.length > 0 ? `PIN code must be 6 digits (${digitsOnly.length}/6)` : '',
      })
      return
    }

    // Auto-fetch location when exactly 6 digits are entered
    setPincodeStatus({ loading: true, success: false, message: 'Fetching city & location...' })
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
        if (formErrors.city) {
          setFormErrors((prev) => ({ ...prev, city: '' }))
        }
        setPincodeStatus({
          loading: false,
          success: true,
          message: `${city}${state ? `, ${state}` : ''}`,
        })
      } else {
        setPincodeStatus({
          loading: false,
          success: false,
          message: 'Invalid PIN code or postal data not found',
        })
      }
    } catch (err) {
      console.error('Pincode auto-fetch error:', err)
      setPincodeStatus({ loading: false, success: false, message: '' })
    }
  }

  const getRawPhoneDigits = (phoneVal) => {
    if (!phoneVal) return ''
    let str = String(phoneVal).trim()
    if (str.startsWith('+91')) str = str.slice(3)
    else if (str.startsWith('91') && str.length > 10) str = str.slice(2)
    else if (str.startsWith('0') && str.length > 10) str = str.slice(1)
    return str.replace(/\D/g, '').slice(0, 10)
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

    if (!user || !token) {
      setAuthInitialMode('login')
      setIsAuthModalOpen(true)
      return
    }

    const errs = {}
    if (!form.name?.trim()) errs.name = 'Full name is required.'
    if (!form.email?.trim()) errs.email = 'Email address is required.'
    const phoneDigits = getRawPhoneDigits(form.phone)
    if (!phoneDigits) {
      errs.phone = 'Phone number is required.'
    } else if (phoneDigits.length !== 10) {
      errs.phone = `Phone number must be exactly 10 digits (${phoneDigits.length}/10).`
    } else if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      errs.phone = 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.'
    }
    if (!form.address?.trim()) errs.address = 'Street address is required.'
    if (!form.city?.trim()) errs.city = 'City / District is required.'
    if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Please enter a valid 6-digit PIN code.'
    if (!termsAccepted) errs.terms = 'Please accept the handmade product terms before placing your order.'

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)

      setTimeout(() => {
        const errorKey = Object.keys(errs)[0]
        const firstErrorEl = document.getElementsByName(errorKey)[0] || document.querySelector('[data-error="true"]')
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          firstErrorEl.focus({ preventScroll: true })
        }
      }, 50)
      return
    }

    setFormErrors({})

    setProcessing(true)

    try {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        alert('Unable to load secure payment screen. Please check your internet connection and try again.')
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
          phone: form.phone ? `+91${form.phone}` : '',
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
        termsAccepted: true,
      }

      const authToken = token || localStorage.getItem('lilycharm_token') || ''

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errorMsg = 'We could not place your order. Please try again.'
        try {
          const errData = await res.json()
          if (errData && errData.message) {
            errorMsg = errData.message
          }
        } catch {}
        console.error('Failed to create order:', res.status, errorMsg)
        alert(errorMsg)
        setProcessing(false)
        return
      }

      const savedOrder = await res.json()
      const razorpayKey = savedOrder.key_id || RAZORPAY_KEY_ID
      let razorpayOrderId = savedOrder.razorpayOrderId || savedOrder.order_id || savedOrder.id

      if (!razorpayOrderId) {
        console.log('Fetching Razorpay order ID from /api/create-order...')
        try {
          const rzpRes = await fetch(`${API_URL}/create-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
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
        alert('We could not start your payment. Please try again.')
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
          name: user?.name || form.name || '',
          email: user?.email || form.email || '',
          contact: user?.phone || form.phone || '',
        },
        theme: {
          color: '#882233',
        },
        handler: async function (response) {
          setProcessing(true)
          try {
            const verifyRes = await fetch(`${API_URL}/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              },
              body: JSON.stringify({
                orderId: savedOrder._id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                token: authToken,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success !== false) {
              setOrderConfirmed(verifyData.order || savedOrder)
              clearCart()
            } else {
              alert(verifyData.message || 'We could not confirm your payment. Please contact studio support if you were charged.')
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr)
            try {
              let attempts = 0
              let confirmed = false
              while (attempts < 3 && !confirmed) {
                await new Promise((r) => setTimeout(r, 2000))
                attempts++
                const checkRes = await fetch(`${API_URL}/orders/${savedOrder._id}`, {
                  headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
                })
                if (checkRes.ok) {
                  const checkData = await checkRes.json()
                  if (checkData.paymentStatus === 'Paid') {
                    setOrderConfirmed(checkData)
                    clearCart()
                    confirmed = true
                  }
                }
              }
              if (!confirmed) {
                alert('Your payment is being confirmed by studio servers. Please check your Account Dashboard in a moment.')
              }
            } catch {
              alert('Connection interrupted while confirming payment. Please check your orders page.')
            }
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false)
            console.log('Payment modal closed by user.')
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        console.error('Razorpay payment failed:', response.error)
        alert(response.error?.description || response.error?.reason || 'Payment could not be completed. Please try again or use another payment method.')
        setProcessing(false)
      })

      rzp.open()
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Something went wrong during checkout. Please try again.')
      setProcessing(false)
    }
  }

  useEffect(() => {
    if (orderConfirmed) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [orderConfirmed])

  if (orderConfirmed) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-20 sm:pb-28 text-center space-y-6 sm:space-y-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#212B1C]/10 text-[#212B1C] border border-black/10 flex items-center justify-center mx-auto luxury-shadow-sm">
          <CheckCircle2 size={40} className="sm:w-12 sm:h-12" />
        </div>
        <div className="space-y-2">
          <span className="eyebrow block text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.24em]">
            Studio Direct Dispatch
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)] uppercase tracking-tight text-[var(--color-ink)]">
            Order Confirmed!
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
            Thank you for your order, <strong className="text-[var(--color-ink)]">{orderConfirmed.shippingAddress?.name || form.name}</strong>! Your order number is{' '}
            <strong className="text-[var(--color-primary)] font-mono font-bold">{orderConfirmed.orderNumber || orderConfirmed._id}</strong>.
          </p>
        </div>

        <div className="bg-[var(--color-card-bg)] p-5 sm:p-7 border border-[var(--color-line)] rounded-3xl luxury-shadow-sm max-w-lg mx-auto text-left text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-[var(--color-line)] pb-3 font-bold uppercase text-[0.68rem] tracking-wider">
            <span className="text-[var(--color-ink-soft)]">Payment Status</span>
            <span className="bg-[var(--color-bg)] px-3 py-1 border border-[var(--color-line)] text-[var(--color-ink)] rounded-full font-mono text-[0.68rem] font-bold">
              PAID (Razorpay)
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[var(--color-ink-soft)]">Shipping To:</span>
            <span className="font-semibold text-right text-[var(--color-ink)] max-w-[240px]">
              {orderConfirmed.shippingAddress?.address}, {orderConfirmed.shippingAddress?.city} - {orderConfirmed.shippingAddress?.pincode}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[var(--color-line)] font-bold text-sm text-[var(--color-ink)]">
            <span>Total Paid:</span>
            <span className="text-[var(--color-primary)] font-bold">{formatPrice(orderConfirmed.grandTotal ?? orderConfirmed.total ?? total)}</span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard?tab=My Orders&order=confirmed')}
            className="btn-primary px-8 py-3.5 text-xs uppercase tracking-widest font-bold flex items-center gap-2 rounded-full shadow-md cursor-pointer"
          >
            <Package size={15} /> View in My Orders
          </button>
          <button
            onClick={() => navigate('/shop')}
            className="btn-outline px-8 py-3.5 text-xs uppercase tracking-widest font-bold rounded-full cursor-pointer"
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-20 sm:pt-28 pb-16 sm:pb-24 space-y-6 sm:space-y-8 w-full max-w-full">
      <Reveal>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-[var(--font-display)] font-bold uppercase tracking-tight">Checkout</h1>

        {!authLoading && (!user || !token) && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 sm:p-5 mt-4 text-xs text-[var(--color-ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                <span>Studio Account:</span> Please log in to complete your order.
              </p>
              <p className="text-[0.72rem] text-amber-900/80 leading-relaxed">
                Log in with your email or Google account. Your bag will be safely merged and kept intact.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAuthInitialMode('login')
                  setIsAuthModalOpen(true)
                }}
                className="btn-primary text-xs py-2 px-4 rounded-xl flex-1 sm:flex-initial text-center font-bold tracking-wider uppercase cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthInitialMode('register')
                  setIsAuthModalOpen(true)
                }}
                className="btn-outline text-xs py-2 px-4 rounded-xl flex-1 sm:flex-initial text-center font-bold tracking-wider uppercase cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        )}
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-8 lg:gap-14 items-start">
        <form onSubmit={handlePay} className="space-y-6 sm:space-y-8">
          <div className="bg-[var(--color-card-bg)]/80 backdrop-blur-sm p-5 sm:p-7 border border-black/10 rounded-3xl luxury-shadow-sm space-y-4">
            <p className="eyebrow mb-1 sm:mb-2">Contact Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 text-xs">
              <div>
                <label className="block font-bold uppercase mb-1 text-[0.68rem] tracking-wider text-[var(--color-ink)]">
                  Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  aria-required="true"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Eleanor Vance"
                  className={`border bg-transparent rounded-xl px-4 py-3 text-xs focus:outline-none w-full transition-colors ${
                    formErrors.name
                      ? 'border-black focus:border-black ring-1 ring-black/40 bg-black/5'
                      : 'border-black/15 focus:border-[var(--color-primary)]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-black font-bold text-[0.68rem] mt-1 flex items-center gap-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase mb-1 text-[0.68rem] tracking-wider text-[var(--color-ink)]">
                  Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  aria-required="true"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. customer@example.com"
                  className={`border bg-transparent rounded-xl px-4 py-3 text-xs focus:outline-none w-full transition-colors ${
                    formErrors.email
                      ? 'border-black focus:border-black ring-1 ring-black/40 bg-black/5'
                      : 'border-black/15 focus:border-[var(--color-primary)]'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-black font-bold text-[0.68rem] mt-1 flex items-center gap-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block font-bold uppercase mb-1 text-[0.68rem] tracking-wider text-[var(--color-ink)]">
                  Phone Number (10 Digits) <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <div className="flex">
                  <div className={`bg-[var(--color-card-bg)] text-[var(--color-ink)] px-3.5 py-3 border border-r-0 font-mono text-xs rounded-l-xl font-bold flex items-center shrink-0 select-none ${
                    formErrors.phone ? 'border-black' : 'border-black/15'
                  }`}>
                    +91
                  </div>
                  <input
                    name="phone"
                    type="tel"
                    required
                    aria-required="true"
                    maxLength={10}
                    inputMode="numeric"
                    value={form.phone || ''}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setForm((prev) => ({ ...prev, phone: digitsOnly }))
                      if (formErrors.phone) {
                        setFormErrors((prev) => ({ ...prev, phone: '' }))
                      }
                    }}
                    placeholder="9876543210"
                    className={`border bg-transparent rounded-r-xl rounded-l-none px-4 py-3 text-xs focus:outline-none font-mono w-full transition-colors ${
                      formErrors.phone
                        ? 'border-black focus:border-black ring-1 ring-black/40 bg-black/5'
                        : 'border-black/15 focus:border-[var(--color-primary)]'
                    }`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-black font-bold text-[0.68rem] mt-1 flex items-center gap-1">
                    {formErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)]/80 backdrop-blur-sm p-5 sm:p-7 border border-black/10 rounded-3xl luxury-shadow-sm space-y-4">
            <p className="eyebrow mb-1 sm:mb-2">Shipping Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 text-xs">
              <div className="col-span-1 sm:col-span-2">
                <label className="block font-bold uppercase mb-1 text-[0.68rem] tracking-wider text-[var(--color-ink)]">
                  Street Address <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="address"
                  type="text"
                  required
                  aria-required="true"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="e.g. Flat 402, Lotus Bloom Residences, 12th Main Rd"
                  className={`border bg-transparent rounded-xl px-4 py-3 text-xs focus:outline-none w-full transition-colors ${
                    formErrors.address
                      ? 'border-black focus:border-black ring-1 ring-black/40 bg-black/5'
                      : 'border-black/15 focus:border-[var(--color-primary)]'
                  }`}
                />
                {formErrors.address && (
                  <p className="text-black font-bold text-[0.68rem] mt-1 flex items-center gap-1">
                    {formErrors.address}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase mb-1 text-[0.68rem] tracking-wider text-[var(--color-ink)]">
                  City / District <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="city"
                  type="text"
                  required
                  aria-required="true"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru"
                  className={`border bg-transparent rounded-xl px-4 py-3 text-xs focus:outline-none font-semibold w-full transition-colors ${
                    formErrors.city
                      ? 'border-black focus:border-black ring-1 ring-black/40 bg-black/5'
                      : 'border-black/15 focus:border-[var(--color-primary)]'
                  }`}
                />
                {formErrors.city && (
                  <p className="text-black font-bold text-[0.68rem] mt-1 flex items-center gap-1">
                    {formErrors.city}
                  </p>
                )}
              </div>

              <div className="w-full">
                <label className="block font-bold uppercase mb-1 text-[0.68rem] tracking-wider text-[var(--color-ink)]">
                  PIN Code (6 digits) <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  name="pincode"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  required
                  aria-required="true"
                  value={form.pincode}
                  onChange={handlePincodeChange}
                  placeholder="e.g. 560001"
                  className={`w-full border bg-transparent rounded-xl px-4 py-3 text-xs focus:outline-none font-mono transition-colors ${
                    formErrors.pincode
                      ? 'border-black focus:border-black ring-1 ring-black/40 bg-black/5'
                      : pincodeStatus.message && !pincodeStatus.success && !pincodeStatus.loading
                      ? 'border-amber-600 focus:border-amber-600'
                      : pincodeStatus.success
                      ? 'border-black focus:border-black'
                      : 'border-black/15 focus:border-[var(--color-primary)]'
                  }`}
                />
                {formErrors.pincode ? (
                  <p className="text-black font-bold text-[0.68rem] mt-1 flex items-center gap-1">
                    {formErrors.pincode}
                  </p>
                ) : pincodeStatus.message ? (
                  <p className={`text-[0.68rem] mt-1.5 font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    pincodeStatus.loading
                      ? 'text-[var(--color-primary)] animate-pulse'
                      : pincodeStatus.success
                      ? 'text-[var(--color-ink)]'
                      : 'text-amber-800'
                  }`}>
                    {pincodeStatus.success && <MapPin size={12} className="text-[var(--color-ink)] shrink-0" />}
                    <span>{pincodeStatus.message}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className="bg-[var(--color-card-bg)]/80 backdrop-blur-sm p-5 sm:p-7 border border-black/10 rounded-3xl luxury-shadow-sm space-y-3">
            <p className="eyebrow mb-1">Payment Method</p>
            <div className="border border-black/10 rounded-2xl px-4 py-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--color-bg)]/40">
              <span className="font-semibold text-[var(--color-ink)]">Cards, UPI, Netbanking, Wallets (Razorpay)</span>
              <span className="specimen-tag bg-[var(--color-primary)] text-white font-mono px-3 py-0.5 rounded-full self-start sm:self-auto shadow-2xs">100% SECURE PREPAID</span>
            </div>
          </div>

          {/* Cancellation Policy Disclaimer */}
          <div className="p-4 sm:p-5 bg-[var(--color-card-bg)] border border-[var(--color-line)] text-[0.7rem] sm:text-[0.72rem] text-[var(--color-ink-soft)] leading-relaxed rounded-2xl space-y-2 shadow-2xs">
            <div className="font-bold uppercase tracking-wider text-[var(--color-primary)] text-xs">
              Studio Cancellation & Refund Policy
            </div>
            <p className="text-[0.68rem] sm:text-[0.7rem]">
              • <strong>Online Self-Cancellation:</strong> You can cancel your order before handcrafting begins. Customer self-cancellation incurs a <strong>3% payment processing fee</strong> (97% net amount is refunded to your original payment method).
            </p>
            <p className="text-[0.68rem] sm:text-[0.7rem]">
              • <strong>Studio Admin Cancellation:</strong> If cancelled by Studio Admin, a <strong>100% full refund</strong> is issued immediately with 0% deduction.
            </p>
          </div>

          {/* Mandatory Handmade Product Terms & Conditions */}
          <div
            data-error={formErrors.terms ? 'true' : undefined}
            className={`p-4 sm:p-5 bg-[var(--color-card-bg)]/80 border rounded-3xl space-y-2 transition-colors ${
              formErrors.terms ? 'border-black bg-black/5 ring-1 ring-black/40' : 'border-black/10'
            }`}
          >
            <label
              htmlFor="handmadeTermsCheckbox"
              className="flex items-start gap-3 text-xs text-[var(--color-ink)] cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="handmadeTermsCheckbox"
                name="handmadeTermsAccepted"
                required
                aria-required="true"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked)
                  if (e.target.checked && formErrors.terms) {
                    setFormErrors((prev) => ({ ...prev, terms: '' }))
                  }
                }}
                className="mt-0.5 w-4 h-4 rounded border-black/30 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer shrink-0"
              />
              <span className="leading-snug font-medium">
                I understand and agree that handmade products may have slight variations from the product images due to their handmade nature.{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowTermsModal(true)
                  }}
                  className="text-[var(--color-primary)] underline font-bold hover:opacity-80 inline-block cursor-pointer"
                >
                  View Terms & Conditions
                </button>
              </span>
            </label>

            {formErrors.terms && (
              <p className="text-red-600 text-[0.7rem] font-bold flex items-center gap-1">
                {formErrors.terms}
              </p>
            )}
          </div>

          <button type="submit" disabled={processing} className="btn-primary w-full py-4 text-xs uppercase tracking-widest font-bold disabled:opacity-60 rounded-full shadow-md cursor-pointer">
            {processing ? 'Processing Payment & Saving Order...' : `Pay ${formatPrice(total)} Now`}
          </button>
        </form>

        <Reveal delay={0.1}>
          <div className="bg-[var(--color-card-bg)]/80 backdrop-blur-md p-5 sm:p-7 lg:sticky lg:top-28 border border-black/10 rounded-3xl space-y-4 sm:space-y-5 w-full luxury-shadow-md">
          <p className="eyebrow mb-2">Order Summary</p>
          <div className="space-y-3 sm:space-y-4 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <img src={item.image} alt={item.title} className="w-14 h-16 object-cover shrink-0 rounded-xl bg-[var(--color-card-bg)] shadow-2xs" />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold leading-tight truncate text-[var(--color-ink)]">{item.title}</p>
                  <p className="text-[var(--color-ink-soft)] mt-0.5">Qty: {item.qty}</p>
                </div>
                <p className="text-xs font-bold text-[var(--color-primary)] shrink-0 font-sans">{formatPrice(item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          {/* Promo Code Entry Box */}
          <div className="pt-3.5 border-t border-black/10 space-y-2">
            {activeCoupon ? (
              <div className="bg-[var(--color-card-bg)] border border-[var(--color-line)] p-3 text-xs flex justify-between items-center rounded-2xl shadow-2xs">
                <div>
                  <p className="font-bold text-[var(--color-ink)] flex items-center gap-1">
                    {activeCoupon.code}
                  </p>
                  <p className="text-[0.68rem] text-[var(--color-primary)]">{activeCoupon.label}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-[0.65rem] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-bold uppercase underline cursor-pointer transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value)
                      if (couponMsg) setCouponMsg(null)
                    }}
                    placeholder="Promo code"
                    className="flex-1 border border-black/15 bg-transparent rounded-full px-4 py-2 text-xs focus:outline-none"
                  />
                  <button type="submit" className="btn-primary text-[0.65rem] py-2 px-4 rounded-full uppercase tracking-wider font-bold cursor-pointer">
                    Apply
                  </button>
                </div>
                <p className="text-[0.62rem] text-[var(--color-ink-soft)]">Try code: <span className="font-mono font-bold text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('LILY10')}>LILY10</span></p>
              </form>
            )}

            {!activeCoupon && couponMsg && (
              <div className={`text-[0.68rem] p-2 rounded-xl ${couponMsg.success ? 'bg-[#212B1C]/10 text-[#212B1C] font-bold' : 'bg-rose-100 text-rose-800'}`}>
                {couponMsg.message}
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs pt-3 border-t border-black/10">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-[var(--color-primary)] font-bold">
                <span>Promo Discount ({activeCoupon?.code})</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span>Shipping Charge</span>
              <span className="font-bold">
                {shippingLoading ? (
                  <span className="text-[var(--color-ink-soft)] font-mono animate-pulse">Calculating...</span>
                ) : shipping === 0 ? (
                  <span className="text-[var(--color-primary)] font-mono">
                    FREE {isShippingEnabled && subtotal >= freeThreshold ? `(> ₹${freeThreshold.toLocaleString('en-IN')})` : ''}
                  </span>
                ) : (
                  formatPrice(shipping)
                )}
              </span>
            </div>
            {isShippingEnabled && shipping > 0 && subtotal < freeThreshold && (
              <p className="text-[0.68rem] text-[var(--color-ink-soft)] text-center font-normal pt-1">
                Add {formatPrice(freeThreshold - subtotal)} more for free shipping
              </p>
            )}
            <div className="flex justify-between font-[var(--font-display)] text-base sm:text-lg font-bold pt-3 border-t border-black/10 text-[var(--color-ink)]">
              <span>Total Amount</span><span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authInitialMode}
        customNotice="Please log in to complete your order."
        onSuccess={(loggedInUser) => {
          setForm((prev) => ({
            ...prev,
            name: loggedInUser.name || prev.name,
            email: loggedInUser.email || prev.email,
            phone: extract10Digits(loggedInUser.phone) || prev.phone,
            address: loggedInUser.address || prev.address,
            city: loggedInUser.city || prev.city,
            pincode: loggedInUser.pincode || prev.pincode,
          }))
          setIsAuthModalOpen(false)
        }}
      />

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  )
}
