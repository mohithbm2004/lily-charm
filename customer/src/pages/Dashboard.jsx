import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import { User, Package, MapPin, Sparkles, Upload, CheckCircle2, Search, Edit3, LogOut, Download, Eye, Truck, RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import OrderDetailsModal from '../components/OrderDetailsModal'
import OrderTimeline from '../components/OrderTimeline'

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://lily-charm-server.onrender.com/api' : 'http://localhost:5000/api')

const tabs = ['My Orders', 'Profile Details', 'Custom Price Quotes', 'Saved Addresses']

export default function Dashboard() {
  const { user, logout, updateUserProfile } = useAuth()
  const { showAlert, showConfirm } = useAlert()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Profile Details')
  const [params] = useSearchParams()
  const justOrdered = params.get('order') === 'confirmed'

  const defaultProfile = {
    name: 'Valued Customer',
    email: 'customer@example.com',
    phone: '+91 98765 43210',
    address: '123 Atelier Studio Street',
    city: 'Bengaluru',
    pincode: '560001',
    profileImage: '',
  }

  // User profile state strictly tied to authenticated user session
  const [userProfile, setUserProfile] = useState(() => {
    if (!user) return null
    try {
      const saved = localStorage.getItem('lilycharm_user_profile')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') return { ...defaultProfile, ...parsed }
      }
    } catch {}
    return user ? { ...defaultProfile, ...user } : null
  })

  useEffect(() => {
    if (user && typeof user === 'object') {
      setUserProfile((prev) => ({ ...defaultProfile, ...(prev || {}), ...user }))
      setAvatarPreview(user.profileImage || '')
      fetchProfileFromApi(user.email)
      fetchUserOrdersAndRequests(user.email)
    } else {
      setUserProfile(null)
      setUserOrders([])
      setUserCustomRequests([])
      setAvatarPreview('')
      localStorage.removeItem('lilycharm_user_profile')
    }
  }, [user])

  const currentEmail = userProfile?.email || user?.email || ''

  const [avatarPreview, setAvatarPreview] = useState(userProfile?.profileImage || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Orders state from MongoDB
  const [userOrders, setUserOrders] = useState([])
  const [userCustomRequests, setUserCustomRequests] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [quoteSearchEmail, setQuoteSearchEmail] = useState('')
  const [confirmedCustomOrder, setConfirmedCustomOrder] = useState(null)

  const fetchProfileFromApi = async (email) => {
    if (!email) return
    try {
      const res = await fetch(`${API_URL}/auth/profile?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object') {
          setUserProfile((prev) => ({ ...defaultProfile, ...prev, ...data }))
          setAvatarPreview(data.profileImage || '')
          localStorage.setItem('lilycharm_user_profile', JSON.stringify(data))
        }
      }
    } catch {
      // offline fallback
    }
  }

  const fetchUserOrdersAndRequests = async (email) => {
    if (!email) return
    try {
      const cleanEmail = email.toLowerCase().trim()
      const [ordRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/orders/mine?email=${encodeURIComponent(cleanEmail)}`),
        fetch(`${API_URL}/custom-requests`),
      ])
      if (ordRes.ok) {
        const ordData = await ordRes.json()
        const rawOrders = Array.isArray(ordData) ? ordData : (ordData.orders || [])
        setUserOrders(rawOrders)
      } else {
        // Fallback to fetch all orders and filter
        const fallbackRes = await fetch(`${API_URL}/orders`)
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          const rawOrders = Array.isArray(fallbackData) ? fallbackData : (fallbackData.orders || [])
          const filtered = rawOrders.filter(
            (o) => o?.shippingAddress?.email && o.shippingAddress.email.toLowerCase().trim() === cleanEmail
          )
          setUserOrders(filtered)
        }
      }

      if (reqRes.ok) {
        const reqs = await reqRes.json()
        const myReqs = (Array.isArray(reqs) ? reqs : []).filter(
          (r) => r?.email && r.email.toLowerCase().trim() === cleanEmail
        )
        setUserCustomRequests(myReqs)
      }
    } catch (e) {
      console.error('Failed to fetch user orders from API:', e)
    }
  }

  useEffect(() => {
    fetchProfileFromApi(currentEmail)
    fetchUserOrdersAndRequests(currentEmail)
  }, [currentEmail])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const [dashPincodeStatus, setDashPincodeStatus] = useState({ loading: false, success: false, message: '' })

  const handleDashboardPincodeChange = async (e) => {
    const rawVal = e.target.value
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 6)
    setUserProfile((prev) => ({ ...prev, pincode: digitsOnly }))

    if (digitsOnly.length < 6) {
      setDashPincodeStatus({
        loading: false,
        success: false,
        message: digitsOnly.length > 0 ? `PIN code must be 6 digits (${digitsOnly.length}/6)` : '',
      })
      return
    }

    setDashPincodeStatus({ loading: true, success: false, message: '🔍 Fetching city & location...' })
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`)
      const data = await res.json()
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        const city = postOffice.District || postOffice.Block || postOffice.Name || ''
        setUserProfile((prev) => ({
          ...prev,
          city: city || prev.city,
        }))
        setDashPincodeStatus({
          loading: false,
          success: true,
          message: `📍 Auto-filled City: ${city}`,
        })
      } else {
        setDashPincodeStatus({
          loading: false,
          success: false,
          message: '⚠️ Invalid PIN code',
        })
      }
    } catch (err) {
      console.error('Dashboard pincode error:', err)
      setDashPincodeStatus({ loading: false, success: false, message: '' })
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

  const handleAcceptQuoteAndPay = async (req) => {
    try {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.')
        return
      }

      const shipping = req.quotedPrice > 8000 ? 0 : 250
      const totalAmount = (req.quotedPrice || 0) + shipping

      // 1. Fetch Razorpay Order ID from backend (amount in paise)
      let rzpOrderData = null
      try {
        const rzpOrderRes = await fetch(`${API_URL}/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Math.round(totalAmount * 100), currency: 'INR' }),
        })
        if (rzpOrderRes.ok) {
          rzpOrderData = await rzpOrderRes.json()
        }
      } catch (e) {
        console.error('Failed to create Razorpay order ID via /create-order:', e)
      }

      if (!rzpOrderData || !rzpOrderData.id) {
        try {
          const fallbackRes = await fetch(`${API_URL}/orders/create-razorpay-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Math.round(totalAmount * 100), currency: 'INR' }),
          })
          if (fallbackRes.ok) {
            rzpOrderData = await fallbackRes.json()
          }
        } catch (e) {
          console.error('Failed to create Razorpay order ID via /orders/create-razorpay-order:', e)
        }
      }

      const razorpayOrderId = rzpOrderData?.id || rzpOrderData?.order_id
      if (!razorpayOrderId) {
        alert('Could not initialize Razorpay payment. Please check backend connection.')
        return
      }

      // 2. Launch Razorpay Standard Checkout Modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TNMb3FlCzDPhzo',
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        name: 'Lily Charm Flower Studio',
        description: `Payment for Custom Artwork Quote #${req._id.slice(-6)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: req.name || userProfile.name,
          email: req.email || userProfile.email,
          contact: req.phone || userProfile.phone || '',
        },
        theme: { color: '#2B3925' },
        handler: async function (response) {
          try {
            const acceptRes = await fetch(`${API_URL}/custom-requests/${req._id}/accept`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                shippingAddress: {
                  name: req.name || userProfile.name,
                  email: req.email || userProfile.email,
                  phone: req.phone || userProfile.phone || '',
                  address: req.address || 'Studio Collection Address',
                  city: req.city || 'Bengaluru',
                  pincode: req.pincode || '560001',
                },
              }),
            })
            const data = await acceptRes.json()
            if (acceptRes.ok) {
              const finalOrder = data.order || {
                orderNumber: data.orderNumber || `LC-${Date.now().toString().slice(-6)}`,
                shippingAddress: {
                  name: req.name || userProfile.name,
                  address: req.address || 'Studio Collection Address',
                  city: req.city || 'Bengaluru',
                  pincode: req.pincode || '560001',
                },
                total: totalAmount,
                grandTotal: totalAmount,
              }
              setConfirmedCustomOrder(finalOrder)
              fetchUserOrdersAndRequests(userProfile.email)
            } else {
              alert(data.message || 'Failed to record custom order payment.')
            }
          } catch (err) {
            console.error('Error recording custom quote payment:', err)
            alert('Connection error recording payment.')
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Error starting Razorpay checkout for quote:', err)
      alert('Network error initializing payment.')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (userProfile.pincode && !/^\d{6}$/.test(userProfile.pincode)) {
      alert('Please enter a valid 6-digit numeric PIN code.')
      return
    }
    setIsSavingProfile(true)
    setSaveSuccessMsg('')

    try {
      const payload = {
        ...userProfile,
        image: avatarPreview,
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        setUserProfile(data.user)
        updateUserProfile(data.user)
        setAvatarPreview(data.user.profileImage || '')
        localStorage.setItem('lilycharm_user_profile', JSON.stringify(data.user))
        setSaveSuccessMsg('✨ Profile updated successfully!')
        setTimeout(() => setSaveSuccessMsg(''), 4000)
      } else {
        alert('Failed to save profile. Please check details.')
      }
    } catch (err) {
      console.error('Failed to save user profile:', err)
      alert('Connection error. Please try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Exact Order Confirmed Page Matching Image 2
  if (confirmedCustomOrder) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-36 pb-24 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-display)] uppercase">ORDER CONFIRMED!</h1>
        <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
          Thank you for your order, <strong className="text-[var(--color-ink)]">{confirmedCustomOrder.shippingAddress?.name || userProfile?.name || 'Valued Customer'}</strong>! Your order number is{' '}
          <strong className="text-[var(--color-primary)] font-mono">{confirmedCustomOrder.orderNumber || confirmedCustomOrder._id}</strong>.
        </p>
        <div className="bg-[var(--color-beige)]/40 p-6 border border-[var(--color-line)] max-w-lg mx-auto text-left text-xs space-y-2">
          <div className="flex justify-between border-b border-[var(--color-line)] pb-2 font-bold uppercase">
            <span>Payment Status</span>
            <span className="text-emerald-700 font-mono">PAID (RAZORPAY)</span>
          </div>
          <div className="flex justify-between pt-1">
            <span>Shipping To:</span>
            <span className="font-semibold text-right">
              {confirmedCustomOrder.shippingAddress?.address || userProfile?.address}, {confirmedCustomOrder.shippingAddress?.city || userProfile?.city} - {confirmedCustomOrder.shippingAddress?.pincode || userProfile?.pincode}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-[var(--color-line)] font-bold text-sm">
            <span>Total Paid:</span>
            <span className="text-[var(--color-primary)]">
              {formatPrice(confirmedCustomOrder.grandTotal ?? confirmedCustomOrder.total ?? 0)}
            </span>
          </div>
        </div>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setConfirmedCustomOrder(null)
              setTab('My Orders')
            }}
            className="btn-primary px-8 py-3 text-xs uppercase tracking-widest font-bold"
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
    )
  }

  // If customer is signed out, render a clean login prompt screen with zero previous user details
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-28 text-center space-y-6 text-[var(--color-ink)]">
        <div className="w-20 h-20 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-line)] flex items-center justify-center mx-auto text-[var(--color-primary)] shadow-sm">
          <User size={36} />
        </div>
        <div className="space-y-2">
          <span className="text-[0.68rem] tracking-[0.2em] uppercase font-bold text-[var(--color-primary)] font-mono">
            Lily Charm Customer Portal
          </span>
          <h1 className="text-3xl font-bold font-[var(--font-display)] uppercase">
            Account Signed Out
          </h1>
          <p className="text-xs text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
            You have been securely signed out of your customer account. Sign in with Google OAuth or your Email OTP to view your orders, saved delivery addresses, and custom design quotes.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-8 py-3 text-xs uppercase tracking-widest font-bold flex items-center gap-2"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 pt-32 pb-24 text-[var(--color-ink)]">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--color-primary)] overflow-hidden bg-[var(--color-card-bg)] shrink-0 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt={userProfile?.name || 'Customer'} className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-[var(--color-primary)]" />
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-[var(--font-display)] uppercase">{userProfile?.name || 'Valued Customer'}</h1>
              <p className="text-xs text-[var(--color-primary)] font-semibold font-mono">{userProfile?.email || 'customer@example.com'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start flex-wrap">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-ink-soft)] bg-[var(--color-card-bg)] border border-[var(--color-line)] px-4 py-2">
              <span>Customer Account:</span>
              <strong className="text-emerald-700">Verified & Active</strong>
            </div>

            <button
              type="button"
              onClick={() => {
                logout()
                setUserProfile(null)
                setUserOrders([])
                setUserCustomRequests([])
                navigate('/')
              }}
              className="border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              title="Sign Out from account"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>

        {justOrdered && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 rounded">
            <CheckCircle2 size={16} /> Order confirmed — your order details have been saved to your profile and sent to our studio delivery team!
          </div>
        )}
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 mt-8 items-start">
        {/* Tab Selector Sidebar */}
        <aside className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-left text-xs font-bold uppercase tracking-wider px-4 py-3 whitespace-nowrap transition-colors border-l-2 ${
                tab === t
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-card-bg)] border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </aside>

        {/* Tab Main Display Area */}
        <div className="space-y-6">
          {/* TAB 1: PROFILE DETAILS */}
          {tab === 'Profile Details' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl text-xs border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 md:p-8 shadow-sm">
              <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <User size={18} className="text-[var(--color-primary)]" /> User Profile Information
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Update your customer account details and shipping information for seamless checkout.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-100 text-emerald-900 font-bold text-xs rounded border border-emerald-300">
                  {saveSuccessMsg}
                </div>
              )}

              {/* Avatar Upload */}
              <div>
                <label className="block font-bold uppercase mb-2">Profile Avatar Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border border-[var(--color-line)] overflow-hidden bg-[var(--color-bg)] shrink-0 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-[var(--color-ink-soft)]" />
                    )}
                  </div>
                  <label className="btn-outline text-[0.68rem] px-4 py-2 cursor-pointer flex items-center gap-1.5 font-bold uppercase">
                    <Upload size={14} /> Choose Avatar Photo
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userProfile?.name || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-bold"
                    placeholder="e.g. Eleanor Vance"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={userProfile?.email || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-semibold"
                    placeholder="e.g. customer@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={userProfile?.phone || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 font-mono"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={userProfile?.city || ''}
                    onChange={(e) => setUserProfile({ ...userProfile, city: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3"
                    placeholder="e.g. Bengaluru"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">Street Address</label>
                <input
                  type="text"
                  value={userProfile?.address || ''}
                  onChange={(e) => setUserProfile({ ...userProfile, address: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3"
                  placeholder="e.g. 123 Atelier Studio Street"
                />
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">PIN Code (6 digits)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={userProfile?.pincode || ''}
                  onChange={handleDashboardPincodeChange}
                  className={`w-full border p-3 font-mono text-xs focus:outline-none ${
                    dashPincodeStatus.message && !dashPincodeStatus.success && !dashPincodeStatus.loading
                      ? 'border-amber-600 focus:border-amber-600 bg-amber-50/20'
                      : dashPincodeStatus.success
                      ? 'border-emerald-600 focus:border-emerald-600 bg-emerald-50/20'
                      : 'border-[var(--color-line)] bg-[var(--color-bg)] focus:border-[var(--color-primary)]'
                  }`}
                  placeholder="e.g. 562159"
                />
                {dashPincodeStatus.message && (
                  <p className={`text-[0.68rem] mt-1 font-semibold ${
                    dashPincodeStatus.loading
                      ? 'text-blue-600 animate-pulse'
                      : dashPincodeStatus.success
                      ? 'text-emerald-700 font-mono'
                      : 'text-amber-700'
                  }`}>
                    {dashPincodeStatus.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="btn-primary w-full py-3 text-xs uppercase font-bold tracking-widest disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving Profile Changes...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {/* TAB 1: MY ORDERS */}
          {tab === 'My Orders' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[var(--color-line)] pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                    <Package size={18} className="text-[var(--color-primary)]" /> My Placed Orders
                  </h2>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    Track every step of your handcrafted order from studio creation to home delivery.
                  </p>
                </div>
                <button
                  onClick={() => fetchUserOrdersAndRequests(userProfile.email)}
                  className="p-2 border border-[var(--color-line)] bg-[var(--color-card-bg)] hover:bg-black/5 flex items-center gap-1 font-bold text-[0.65rem] uppercase"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {userOrders.length === 0 ? (
                <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-[var(--color-ink-soft)] space-y-3">
                  <p className="font-bold uppercase text-sm">No Orders Found for {userProfile.email}</p>
                  <p className="text-[0.7rem]">Place an order at checkout to track delivery status live right here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {userOrders.map((o) => (
                    <div key={o._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Order Header */}
                      <div className="flex flex-wrap justify-between items-start border-b border-[var(--color-line)] pb-3 gap-2">
                        <div>
                          <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{o.orderNumber || o._id}</p>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Placed on: {o.createdAt && !isNaN(new Date(o.createdAt)) ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'Recently Placed'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold uppercase px-2.5 py-1 text-[0.65rem] rounded tracking-wider shadow-sm border ${
                              o.status === 'Cancelled'
                                ? 'bg-rose-800 text-white border-rose-950'
                                : o.status === 'Delivered'
                                ? 'bg-emerald-800 text-white border-emerald-950'
                                : o.status === 'Shipped' || o.status === 'Out For Delivery'
                                ? 'bg-blue-800 text-white border-blue-950'
                                : 'bg-[#212B1C] text-[#F5E8D0] border-[#141A11]'
                            }`}
                          >
                            {o.status || 'Confirmed'}
                          </span>

                          <span
                            className={`font-mono font-bold uppercase px-2.5 py-1 text-[0.65rem] rounded tracking-wider shadow-sm border ${
                              o.paymentStatus === 'Failed'
                                ? 'bg-rose-800 text-white border-rose-950'
                                : 'bg-emerald-800 text-white border-emerald-950'
                            }`}
                          >
                            {o.paymentStatus || 'Paid'}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Preview */}
                      <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-line)]">
                        <OrderTimeline status={o.status} history={o.statusHistory} notes={o.notes} refundId={o.razorpayRefundId} cancellationFee={o.cancellationFee} refundAmount={o.refundAmount} />
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-2">
                        {o.items?.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-[var(--color-bg)] border border-[var(--color-line)]">
                            <div className="flex items-center gap-3">
                              <img src={it.image || '/images/products/flower-1-1.jpg'} alt={it.title} className="w-10 h-12 object-cover border border-[var(--color-line)]" />
                              <div>
                                <p className="font-bold text-xs">{it.title}</p>
                                <p className="text-[0.65rem] text-[var(--color-ink-soft)]">Qty: {it.qty || 1} × {formatPrice(it.price)}</p>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-[var(--color-primary)]">{formatPrice(it.price * (it.qty || 1))}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions & Total */}
                      <div className="pt-3 border-t border-[var(--color-line)] flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <span className="text-[0.68rem] text-[var(--color-ink-soft)] uppercase font-bold">Total Amount Paid</span>
                          <p className="text-emerald-800 text-base font-mono font-bold">{formatPrice(o.grandTotal || o.total)}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="btn-primary py-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <Eye size={12} /> View Details & Timeline
                          </button>

                          <button
                            onClick={() => window.open(`${API_URL}/orders/${o._id}/invoice`, '_blank')}
                            className="btn-outline py-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <Download size={12} /> Invoice PDF
                          </button>

                          {['Pending Payment', 'Paid', 'Confirmed', 'Pending'].includes(o.status) && (
                            <button
                              onClick={() => {
                                const orderTotal = o.grandTotal ?? o.total ?? 0
                                const processingFee = Math.round(orderTotal * 0.03)
                                const netRefund = Math.max(0, orderTotal - processingFee)

                                showConfirm({
                                  title: 'Cancel Order Confirmation',
                                  type: 'warning',
                                  message: `Are you sure you want to cancel order "${o.orderNumber || o._id}"? Automatic refund will be processed back to your payment method via Razorpay.`,
                                  details: [
                                    { label: 'Order Number', value: o.orderNumber || o._id },
                                    { label: 'Original Order Total', value: formatPrice(orderTotal) },
                                    { label: 'Gateway Processing Fee (3%)', value: `- ${formatPrice(processingFee)}`, color: 'text-rose-700 font-bold' },
                                    { label: 'Net Refund to Customer (97%)', value: formatPrice(netRefund), color: 'text-emerald-800 font-bold text-sm', isTotal: true },
                                  ],
                                  disclaimer: 'Customer self-cancellation incurs a 3% payment gateway processing fee. The net 97% refund is automatically credited back to your original payment method via Razorpay within 5–7 banking days. (Note: 100% full refund applies only if cancelled by Studio Admin).',
                                  confirmText: `Confirm Cancellation (${formatPrice(netRefund)} Refund)`,
                                  cancelText: 'Keep Order',
                                  onConfirm: async () => {
                                    try {
                                      const res = await fetch(`${API_URL}/orders/${o._id}/cancel`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reason: 'Cancelled by customer via dashboard' }),
                                      })
                                      const data = await res.json()
                                      if (res.ok) {
                                        showAlert({
                                          title: 'Order Cancelled & Refund Initiated',
                                          type: 'success',
                                          message: `✨ Order ${o.orderNumber || o._id} has been cancelled. Net refund of ${formatPrice(netRefund)} (97%) has been initiated to your original payment method via Razorpay.`,
                                        })
                                        fetchUserOrdersAndRequests(userProfile.email)
                                      } else {
                                        showAlert({
                                          title: 'Cancellation Failed',
                                          type: 'error',
                                          message: data.message || 'Failed to cancel order.',
                                        })
                                      }
                                    } catch {
                                      showAlert({
                                        title: 'Connection Error',
                                        type: 'error',
                                        message: 'Network error attempting order cancellation.',
                                      })
                                    }
                                  },
                                })
                              }}
                              className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-[0.65rem] uppercase tracking-wider px-3 py-2 transition-colors flex items-center gap-1 rounded"
                            >
                              <XCircle size={12} /> Cancel Order
                            </button>
                          )}

                          {['Handcrafting', 'Processing', 'Packed', 'Packed & Dispatched', 'Shipped', 'Out For Delivery'].includes(o.status) && (
                            <span className="text-[0.62rem] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1.5 rounded flex items-center gap-1">
                              🎨 Handcrafting/Dispatch Started — Cannot Cancel Online
                            </span>
                          )}

                          {o.razorpayRefundId && (
                            <span className="text-[0.62rem] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded flex items-center gap-1">
                              ✨ Refund Ref: {o.razorpayRefundId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOM PRICE QUOTES */}
          {tab === 'Custom Price Quotes' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-[var(--color-line)] pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                    <Sparkles size={18} className="text-[var(--color-primary)]" /> Custom Design Price Quotes
                  </h2>
                  <p className="text-xs text-[var(--color-ink-soft)]">
                    Price quotes from lead artisan for your bespoke design requests ({userProfile.name}).
                  </p>
                </div>
                <button
                  onClick={() => fetchUserOrdersAndRequests(userProfile.email)}
                  className="p-2 border border-[var(--color-line)] bg-[var(--color-card-bg)] hover:bg-black/5 flex items-center gap-1 font-bold text-[0.65rem] uppercase"
                >
                  <RefreshCw size={12} /> Refresh Quotes
                </button>
              </div>

              {userCustomRequests.length === 0 ? (
                <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-[var(--color-ink-soft)]">
                  <p className="font-bold uppercase">No Custom Requests Found</p>
                  <p className="text-[0.7rem] mt-1">Submit a custom design request via the header button to receive price quotes!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userCustomRequests.map((req) => (
                    <div key={req._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-4 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start border-b border-[var(--color-line)] pb-3 gap-2">
                        <div>
                          <h4 className="font-bold text-sm font-[var(--font-display)]">{req.stylePreference || 'Custom Botanical Artwork'}</h4>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Submitted: {req.createdAt && !isNaN(new Date(req.createdAt)) ? new Date(req.createdAt).toLocaleDateString('en-IN') : 'Recently Submitted'}</p>
                        </div>
                        <span
                          className={`font-mono font-bold uppercase px-2.5 py-1 text-[0.62rem] rounded tracking-wider shadow-sm border ${
                            req.status?.includes('Accepted')
                              ? 'bg-emerald-800 text-white border-emerald-950'
                              : req.status?.includes('Declined')
                              ? 'bg-rose-800 text-white border-rose-950'
                              : 'bg-amber-700 text-white border-amber-900'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.notes && (
                        <p className="text-xs text-[var(--color-ink-soft)] italic bg-[var(--color-bg)] p-2.5 border border-[var(--color-line)]">
                          "{req.notes}"
                        </p>
                      )}

                      {req.quotedPrice > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 space-y-2">
                          <span className="eyebrow text-[0.65rem] font-bold text-amber-900 uppercase">Studio Quoted Price</span>
                          <p className="text-xl font-bold font-mono text-emerald-800">{formatPrice(req.quotedPrice)}</p>
                          {req.adminNotes && <p className="text-xs italic text-amber-900 font-medium">Studio Note: {req.adminNotes}</p>}

                          {/* Accept / Decline Action Bar if status is Quoted */}
                          {req.status === 'Quoted' && (
                            <div className="pt-2 flex flex-wrap gap-2 items-center">
                              <button
                                onClick={() => handleAcceptQuoteAndPay(req)}
                                className="btn-primary py-2.5 px-5 text-[0.68rem] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                              >
                                💳 Accept Quote & Pay Now ({formatPrice((req.quotedPrice || 0) + ((req.quotedPrice || 0) > 8000 ? 0 : 250))})
                              </button>

                              <button
                                onClick={async () => {
                                  if (!confirm('Decline this price quote?')) return
                                  try {
                                    await fetch(`${API_URL}/custom-requests/${req._id}/decline`, { method: 'PATCH' })
                                    fetchUserOrdersAndRequests(userProfile.email)
                                  } catch (e) {
                                    console.error('Error declining quote:', e)
                                  }
                                }}
                                className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[0.65rem] font-bold uppercase"
                              >
                                Decline Quote
                              </button>
                            </div>
                          )}

                          {req.status?.includes('Accepted') && (
                            <div className="pt-2">
                              <button
                                onClick={() => setTab('My Orders')}
                                className="btn-primary py-2 px-4 text-[0.65rem] font-bold uppercase tracking-wider flex items-center gap-1.5"
                              >
                                <Package size={13} /> View Order in My Orders Tab ➔
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED ADDRESSES */}
          {tab === 'Saved Addresses' && (
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-2 max-w-md text-xs">
              <div className="flex items-center gap-2 font-bold uppercase text-sm border-b border-[var(--color-line)] pb-2">
                <MapPin size={16} className="text-[var(--color-primary)]" /> Primary Shipping Address
              </div>
              <p className="font-bold text-sm">{userProfile.name}</p>
              <p className="text-[var(--color-ink-soft)]">{userProfile.address}</p>
              <p className="text-[var(--color-ink-soft)]">{userProfile.city} - {userProfile.pincode}</p>
              <p className="text-[var(--color-primary)] font-mono">{userProfile.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details & Live Tracking Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onRefresh={() => fetchUserOrdersAndRequests(userProfile.email)}
      />
    </div>
  )
}
