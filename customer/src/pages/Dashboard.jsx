import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Reveal from '../components/Reveal'
import { User, Package, MapPin, Sparkles, Upload, CheckCircle2, LogOut, Download, Eye, RefreshCw, XCircle, Lock, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import { useStudio } from '../context/StudioContext'
import OrderDetailsModal from '../components/OrderDetailsModal'
import OrderTimeline from '../components/OrderTimeline'
import AuthModal from '../components/AuthModal'
import { formatPrice } from '../lib/format'
import { API_URL, RAZORPAY_KEY_ID } from '../config/api'
import { getSocket } from '../services/socket'

const tabs = ['Profile Details', 'My Orders', 'Custom Price Quotes', 'Saved Addresses']

export default function Dashboard() {
  const { user, token, loading: authLoading, logout, updateUserProfile } = useAuth()
  const { showAlert, showConfirm } = useAlert()
  const { shippingSettings } = useStudio()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')

  const getStatusDesc = (st, paymentSt) => {
    const s = st || 'Confirmed'
    if (s.includes('Cancel') || s === 'Refunded' || s === 'Cancelled & Refunded') {
      return 'If you have been charged, a refund is automatically processed back to your original payment method.'
    }
    if (s === 'Pending Payment' || paymentSt === 'Pending' || s === 'Payment Failed') {
      return 'Awaiting payment. Please complete checkout to begin crafting your bespoke order.'
    }
    if (s === 'Order Confirmed' || s === 'Confirmed' || s === 'Paid') {
      return 'Order confirmed. Handcrafting in Studio will start shortly!'
    }
    if (s === 'Handcrafting' || s === 'Handcrafting in Studio') {
      return 'Our artisans are meticulously detailing your botanical creation in the studio.'
    }
    if (s === 'Studio Processing' || s === 'Processing') {
      return 'Your order is undergoing final quality inspection and finishing touches.'
    }
    if (s === 'Packed' || s === 'Packed & Sealed') {
      return 'Your flower charm is safely packed in our gift casing and sealed for dispatch.'
    }
    if (s === 'Packed & Dispatched' || s === 'Shipped') {
      return 'Dispatched! Your package is in transit with our logistics partner.'
    }
    if (s === 'Out For Delivery') {
      return 'Your package is out for delivery with the courier and will arrive today!'
    }
    if (s === 'Delivered') {
      return 'Delivered successfully. We hope this bespoke piece brings elegance to your space!'
    }
    return 'Your order is being processed by our studio.'
  }

  const resolveTab = (param) => {
    if (!param) return 'Profile Details'
    const lower = param.toLowerCase()
    if (lower.includes('order')) return 'My Orders'
    if (lower.includes('profile')) return 'Profile Details'
    if (lower.includes('quote')) return 'Custom Price Quotes'
    if (lower.includes('address')) return 'Saved Addresses'
    return 'Profile Details'
  }

  const [tab, setTab] = useState(() => resolveTab(requestedTab))
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const justOrdered = params.get('order') === 'confirmed'

  useEffect(() => {
    if (requestedTab) {
      setTab(resolveTab(requestedTab))
    }
  }, [requestedTab])

  const rawEnabled = shippingSettings?.shippingFeeEnabled
  const isShippingEnabled = rawEnabled === true || rawEnabled === 'true' || rawEnabled === undefined || rawEnabled === null
  const standardShippingFee = Number(shippingSettings?.standardShippingFee) || 100
  const freeThreshold = Number(shippingSettings?.freeShippingThreshold) || 2000

  const getCustomOrderShipping = (price) => {
    if (!isShippingEnabled) return 0
    return (price || 0) >= freeThreshold ? 0 : standardShippingFee
  }

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
    let base = { ...defaultProfile }
    if (user && typeof user === 'object') {
      base = { ...base, ...user }
    }
    try {
      const saved = localStorage.getItem('lilycharm_user_profile')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') return { ...base, ...parsed }
      }
    } catch {}
    return base
  })

  useEffect(() => {
    const currentToken = token || localStorage.getItem('lilycharm_token')
    let storedUser = user
    if (!storedUser) {
      try {
        const raw = localStorage.getItem('lilycharm_user')
        if (raw) storedUser = JSON.parse(raw)
      } catch {}
    }

    if (storedUser && typeof storedUser === 'object' && currentToken) {
      setUserProfile((prev) => ({ ...defaultProfile, ...(prev || {}), ...storedUser }))
      setAvatarPreview(storedUser.profileImage || '')
      fetchProfileFromApi()
      fetchUserOrdersAndRequests()
    } else if (!storedUser && !currentToken) {
      setUserProfile({ ...defaultProfile })
      setUserOrders([])
      setUserCustomRequests([])
      setAvatarPreview('')
      localStorage.removeItem('lilycharm_user_profile')
    }
  }, [user, token])

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

  const fetchProfileFromApi = async () => {
    const currentToken = token || localStorage.getItem('lilycharm_token')
    if (!currentToken) return
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object') {
          setUserProfile((prev) => ({ ...defaultProfile, ...prev, ...data }))
          setAvatarPreview(data.profileImage || '')
          localStorage.setItem('lilycharm_user_profile', JSON.stringify(data))
        }
      } else if (res.status === 401) {
        logout()
      }
    } catch {
      // offline fallback
    }
  }

  const fetchUserOrdersAndRequests = async () => {
    const currentToken = token || localStorage.getItem('lilycharm_token')
    if (!currentToken) return
    try {
      const [ordRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/orders/mine`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
        fetch(`${API_URL}/custom-requests/mine`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
      ])
      if (ordRes.ok) {
        const ordData = await ordRes.json()
        const rawOrders = Array.isArray(ordData) ? ordData : ordData.orders || []
        setUserOrders(rawOrders)
      } else if (ordRes.status === 401) {
        logout()
      }
      if (reqRes.ok) {
        const reqs = await reqRes.json()
        const myReqs = Array.isArray(reqs) ? reqs : []
        setUserCustomRequests(myReqs)
      }
    } catch (e) {
      console.error('Failed to fetch user orders from API:', e)
    }
  }

  useEffect(() => {
    if (!user) return

    const socket = getSocket()
    const currentUserId = String(user._id || user.id || '')

    const handleOrderCreated = (order) => {
      if (!order) return
      const orderUserId = String(order.user?._id || order.user || '')
      if (orderUserId && orderUserId === currentUserId) {
        setUserOrders((prev) => [order, ...prev.filter((o) => (o._id || o.id) !== (order._id || order.id))])
      }
    }

    const handleOrderUpdated = (order) => {
      if (!order) return
      const targetId = String(order._id || order.id)
      setUserOrders((prev) =>
        prev.map((o) => (String(o._id || o.id) === targetId ? { ...o, ...order } : o))
      )
    }

    const handleOrderCancelled = ({ orderId }) => {
      if (!orderId) return
      setUserOrders((prev) =>
        prev.map((o) =>
          String(o._id || o.id) === String(orderId) ? { ...o, status: 'Cancelled & Refunded' } : o
        )
      )
    }

    const handleCustomRequestCreated = (req) => {
      if (!req) return
      const reqUserId = String(req.user?._id || req.user || '')
      if (reqUserId && reqUserId === currentUserId) {
        setUserCustomRequests((prev) => [req, ...prev.filter((r) => r._id !== req._id)])
      }
    }

    const handleCustomRequestUpdated = (req) => {
      if (!req) return
      const targetId = String(req._id || req.id)
      setUserCustomRequests((prev) =>
        prev.map((r) => (String(r._id || r.id) === targetId ? { ...r, ...req } : r))
      )
    }

    const handleCustomRequestDeleted = ({ requestId }) => {
      if (!requestId) return
      setUserCustomRequests((prev) => prev.filter((r) => String(r._id) !== String(requestId)))
    }

    socket.on('ORDER_CREATED', handleOrderCreated)
    socket.on('ORDER_UPDATED', handleOrderUpdated)
    socket.on('ORDER_STATUS_UPDATED', handleOrderUpdated)
    socket.on('ORDER_CANCELLED', handleOrderCancelled)
    socket.on('CUSTOM_REQUEST_CREATED', handleCustomRequestCreated)
    socket.on('CUSTOM_REQUEST_UPDATED', handleCustomRequestUpdated)
    socket.on('CUSTOM_REQUEST_DELETED', handleCustomRequestDeleted)

    return () => {
      socket.off('ORDER_CREATED', handleOrderCreated)
      socket.off('ORDER_UPDATED', handleOrderUpdated)
      socket.off('ORDER_STATUS_UPDATED', handleOrderUpdated)
      socket.off('ORDER_CANCELLED', handleOrderCancelled)
      socket.off('CUSTOM_REQUEST_CREATED', handleCustomRequestCreated)
      socket.off('CUSTOM_REQUEST_UPDATED', handleCustomRequestUpdated)
      socket.off('CUSTOM_REQUEST_DELETED', handleCustomRequestDeleted)
    }
  }, [currentEmail, user?._id, token])

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
        alert('Unable to load payment screen. Please check your internet connection and try again.')
        return
      }

      const shipping = getCustomOrderShipping(req.quotedPrice)
      const totalAmount = (req.quotedPrice || 0) + shipping

      // 1. Create a Razorpay order bound to this authenticated custom request.
      const rzpOrderRes = await fetch(`${API_URL}/custom-requests/${req._id}/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const rzpOrderData = rzpOrderRes.ok ? await rzpOrderRes.json() : null

      const razorpayOrderId = rzpOrderData?.id || rzpOrderData?.order_id
      if (!razorpayOrderId) {
        alert('We could not start your payment. Please try again.')
        return
      }

      // 2. Launch Razorpay Standard Checkout Modal
      const options = {
        key: rzpOrderData?.key_id || RAZORPAY_KEY_ID,
        amount: rzpOrderData.amount,
        currency: 'INR',
        name: 'Lily Charm Flower Studio',
        description: `Payment for Custom Artwork Quote #${req._id.slice(-6)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || userProfile?.name || req.name || '',
          email: user?.email || userProfile?.email || req.email || '',
          contact: user?.phone || userProfile?.phone || req.phone || '',
        },
        theme: { color: '#2B3925' },
        handler: async function (response) {
          try {
            const acceptRes = await fetch(`${API_URL}/custom-requests/${req._id}/accept`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
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
              alert(data.message || 'Unable to complete order confirmation. Please contact studio support.')
            }
          } catch (err) {
            console.error('Error recording custom quote payment:', err)
            alert('Connection interrupted. Please refresh to view your confirmed order.')
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.error('Error starting Razorpay checkout for quote:', err)
      alert('Connection error. Please try again.')
    }
  }

  const [profileErrors, setProfileErrors] = useState({})

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaveSuccessMsg('')

    const errs = {}
    if (!userProfile?.name?.trim()) errs.name = 'Full name is required.'
    if (userProfile?.pincode && !/^\d{6}$/.test(userProfile.pincode)) {
      errs.pincode = 'Please enter a valid 6-digit numeric PIN code.'
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs)
      return
    }

    setProfileErrors({})
    setIsSavingProfile(true)

    try {
      const currentToken = token || localStorage.getItem('lilycharm_token')
      const payload = {
        ...userProfile,
        image: avatarPreview,
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
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
        alert('Unable to update profile. Please try again.')
      }
    } catch (err) {
      console.error('Failed to save user profile:', err)
      alert('Connection interrupted. Please try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleDeleteAddress = async () => {
    if (!confirm('Are you sure you want to delete your saved shipping address?')) return

    try {
      const currentToken = token || localStorage.getItem('lilycharm_token')
      const updatedProfile = {
        ...userProfile,
        address: '',
        city: '',
        pincode: '',
      }

      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          ...updatedProfile,
          image: avatarPreview,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setUserProfile(data.user)
        updateUserProfile(data.user)
        localStorage.setItem('lilycharm_user_profile', JSON.stringify(data.user))
        alert('✨ Saved shipping address has been deleted.')
      } else {
        alert('Unable to delete address. Please try again.')
      }
    } catch (err) {
      console.error('Failed to delete user address:', err)
      alert('Connection interrupted. Please try again.')
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
            <span className="text-emerald-700 font-mono">PAID ONLINE</span>
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

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-40 pb-28 text-center space-y-4 text-[var(--color-ink)]">
        <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs uppercase tracking-widest font-mono text-[var(--color-ink-soft)]">Loading your studio account & orders...</p>
      </div>
    )
  }

  // If customer is signed out, render a clean login prompt screen with zero previous user details
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 pt-36 sm:pt-40 pb-28 text-center space-y-6 text-[var(--color-ink)]">
        <div className="w-20 h-20 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-line)] flex items-center justify-center mx-auto text-[var(--color-primary)] shadow-sm">
          <User size={36} />
        </div>
        <div className="space-y-2">
          <span className="text-[0.68rem] tracking-[0.2em] uppercase font-bold text-[var(--color-primary)] font-mono">
            Lily Charm Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)] uppercase">
            Sign In to View Orders
          </h1>
          <p className="text-xs text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
            Sign in to your registered customer account to track your orders, live handcrafting updates, invoices, and custom floral design quotes.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="btn-primary px-8 py-3 text-xs uppercase tracking-widest font-bold flex items-center gap-2 shadow-md cursor-pointer"
          >
            <User size={14} /> Sign In / Register
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-outline px-6 py-3 text-xs uppercase tracking-widest font-bold"
          >
            Return to Storefront
          </button>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode="login"
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 text-[var(--color-ink)] w-full max-w-full">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[var(--color-primary)] overflow-hidden bg-[var(--color-card-bg)] shrink-0 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt={userProfile?.name || 'Customer'} className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-[var(--color-primary)] sm:w-8 sm:h-8" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-[var(--font-display)] uppercase truncate">{userProfile?.name || 'Valued Customer'}</h1>
              <p className="text-xs text-[var(--color-primary)] font-semibold font-mono truncate">{userProfile?.email || 'customer@example.com'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-2 text-[0.68rem] sm:text-xs font-mono text-[var(--color-ink-soft)] bg-[var(--color-card-bg)] border border-[var(--color-line)] rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
              <span>Account:</span>
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
              className="border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 text-[0.68rem] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
              title="Sign Out from account"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>

        {justOrdered && (
          <div className="mt-4 p-3.5 sm:p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 rounded-2xl">
            <CheckCircle2 size={16} className="shrink-0" /> Order confirmed — your order details have been saved to your profile and sent to our studio delivery team!
          </div>
        )}
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-10 mt-6 sm:mt-8 items-start">
        {/* Tab Selector Sidebar */}
        <aside className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-thin w-full max-w-full">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setParams({ tab: t })
              }}
              className={`shrink-0 text-left text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-full whitespace-nowrap transition-colors border cursor-pointer ${
                tab === t
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-ink-soft)] bg-[var(--color-card-bg)]/60 hover:bg-[var(--color-card-bg)] border-[var(--color-line)]'
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
            <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl text-xs border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-6 md:p-8 shadow-sm">
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
                  <label className="block font-bold uppercase mb-1">
                    Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    value={userProfile?.name || ''}
                    onChange={(e) => {
                      setUserProfile({ ...userProfile, name: e.target.value })
                      if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    className={`w-full border p-3 font-bold transition-colors ${
                      profileErrors.name
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line)] bg-[var(--color-bg)]'
                    }`}
                    placeholder="e.g. Eleanor Vance"
                  />
                  {profileErrors.name && (
                    <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                      ⚠️ {profileErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase text-[0.68rem] text-[var(--color-ink)]">
                      Email Address
                    </label>
                    <span className="text-[0.65rem] text-[var(--color-ink-soft)] flex items-center gap-1 font-semibold">
                      <Lock size={11} className="text-amber-600" /> Non-modifiable
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={userProfile?.email || user?.email || ''}
                      className="w-full border border-[var(--color-line)] bg-zinc-100/90 dark:bg-zinc-800/50 text-[var(--color-ink-soft)] p-3 font-semibold rounded-none cursor-not-allowed select-none opacity-80"
                      placeholder="customer@example.com"
                      title="Registered email address cannot be changed after sign up."
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)] pointer-events-none">
                      <Lock size={14} className="opacity-60" />
                    </div>
                  </div>
                  <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">
                    Your registered email is permanently linked to your account orders and verification.
                  </p>
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
                  onClick={() => fetchUserOrdersAndRequests()}
                  className="px-3 py-1.5 border border-[var(--color-line)] bg-[var(--color-card-bg)] hover:bg-black/5 rounded-full flex items-center gap-1 font-bold text-[0.65rem] uppercase shadow-sm"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {(!Array.isArray(userOrders) || userOrders.length === 0) ? (
                <div className="border border-dashed border-[var(--color-line)] rounded-3xl p-8 text-center text-[var(--color-ink-soft)] space-y-3 bg-[var(--color-card-bg)]/40">
                  <p className="font-bold uppercase text-sm">No Orders Found</p>
                  <p className="text-[0.7rem]">Place an order at checkout to track delivery status live right here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(userOrders || []).map((o, orderIdx) => {
                    const isExpanded = expandedOrderId === o?._id
                    const items = o?.items || []
                    const maxThumbnails = 3
                    const extraItemsCount = items.length - maxThumbnails
                    const statusDesc = getStatusDesc(o?.status, o?.paymentStatus)

                    return (
                      <div
                        key={o?._id || o?.orderNumber || orderIdx}
                        className={`border rounded-3xl p-5 space-y-4 shadow-sm transition-all duration-300 ${
                          isExpanded
                            ? 'border-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-md'
                            : 'border-[var(--color-line)] bg-[var(--color-card-bg)] hover:shadow-md cursor-pointer hover:bg-stone-50/20'
                        }`}
                      >
                        {/* Compact Header (Always Visible, Clickable to Toggle) */}
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : o?._id)}
                          className="flex items-center gap-4 w-full select-none"
                        >
                          {/* Item Thumbnails Strip (Left) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {items.slice(0, maxThumbnails).map((it, idx) => (
                              <img
                                key={idx}
                                src={it?.image || '/images/products/flower-1-1.jpg'}
                                alt={it?.title || 'Thumbnail'}
                                className="w-10 h-12 object-cover border border-[var(--color-line)] rounded-lg shadow-sm"
                              />
                            ))}
                            {extraItemsCount > 0 && (
                              <div className="w-10 h-12 flex items-center justify-center bg-stone-100 border border-[var(--color-line)] rounded-lg text-[0.68rem] font-bold text-[var(--color-ink-soft)] font-mono">
                                +{extraItemsCount}
                              </div>
                            )}
                          </div>

                          {/* Status and Placed Date (Right) */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <h3
                                className={`text-sm sm:text-base font-bold uppercase tracking-wide ${
                                  o?.status?.includes('Cancel') || o?.status === 'Refunded'
                                    ? 'text-rose-700'
                                    : o?.status === 'Delivered'
                                    ? 'text-emerald-700'
                                    : o?.status?.includes('Shipped') || o?.status?.includes('Delivery') || o?.status?.includes('Dispatch')
                                    ? 'text-blue-700'
                                    : 'text-[var(--color-ink)]'
                                }`}
                              >
                                {o?.status || 'Confirmed'}
                              </h3>
                              <span className="text-[0.65rem] sm:text-[0.68rem] text-[var(--color-ink-soft)] font-mono font-semibold">
                                • Placed on {o?.createdAt && !isNaN(new Date(o.createdAt)) ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                              </span>
                            </div>
                            <p className="text-[0.7rem] sm:text-xs text-[var(--color-ink-soft)] leading-normal line-clamp-2 pr-4">
                              {statusDesc}
                            </p>
                          </div>

                          {/* Expansion Indicator Arrow */}
                          <div className="shrink-0 text-[var(--color-ink-soft)] font-mono text-sm pr-1">
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </div>

                        {/* Collapsible Details Panel (Visible Only When Expanded) */}
                        {isExpanded && (
                          <div className="pt-4 border-t border-[var(--color-line)] space-y-4 animate-fadeIn">
                            {/* Metadata Details Row */}
                            <div className="flex flex-wrap justify-between items-center gap-2 bg-[var(--color-bg)]/40 p-3 rounded-2xl border border-[var(--color-line)]/50">
                              <div>
                                <span className="text-[0.62rem] text-[var(--color-ink-soft)] uppercase font-mono font-bold tracking-wider block">Order ID</span>
                                <span className="font-mono font-bold text-xs text-[var(--color-primary)]">{o?.orderNumber || o?._id}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono font-bold uppercase px-3 py-1 text-[0.65rem] rounded-full tracking-wider border shadow-sm ${
                                    o?.paymentStatus === 'Failed'
                                      ? 'bg-rose-800 text-white border-rose-950'
                                      : 'bg-emerald-800 text-white border-emerald-950'
                                  }`}
                                >
                                  Payment: {o?.paymentStatus || 'Paid'}
                                </span>
                              </div>
                            </div>

                            {/* Timeline Preview */}
                            <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-line)] rounded-2xl">
                              <OrderTimeline
                                status={o?.status || 'Order Confirmed'}
                                history={o?.statusHistory || []}
                                notes={o?.notes || ''}
                                refundId={o?.razorpayRefundId || ''}
                                cancellationFee={o?.cancellationFee || 0}
                                refundAmount={o?.refundAmount || 0}
                                expanded={true}
                                onToggle={() => setExpandedOrderId(null)}
                              />
                            </div>

                            {/* Items Details List */}
                            <div className="space-y-2">
                              <h4 className="text-[0.65rem] text-[var(--color-ink-soft)] uppercase font-bold tracking-wider pl-1">Order Items</h4>
                              {(o?.items || []).map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-2xl">
                                  <div className="flex items-center gap-3">
                                    <img src={it?.image || '/images/products/flower-1-1.jpg'} alt={it?.title || 'Botanical Artwork'} className="w-10 h-12 object-cover border border-[var(--color-line)] rounded-xl" />
                                    <div>
                                      <p className="font-bold text-xs">{it?.title || 'Handcrafted Artwork'}</p>
                                      <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono">Qty: {it?.qty || 1} × {formatPrice(it?.price || 0)}</p>
                                    </div>
                                  </div>
                                  <span className="font-bold font-mono text-[var(--color-primary)]">{formatPrice((it?.price || 0) * (it?.qty || 1))}</span>
                                </div>
                              ))}
                            </div>

                            {/* Footer Actions & Total */}
                            <div className="pt-3 border-t border-[var(--color-line)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                              <div>
                                <span className="text-[0.65rem] sm:text-[0.68rem] text-[var(--color-ink-soft)] uppercase font-bold">Total Amount Paid</span>
                                <p className="text-emerald-800 text-sm sm:text-base font-mono font-bold">{formatPrice(o?.grandTotal || o?.total || 0)}</p>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2">
                                <button
                                  onClick={() => setSelectedOrder(o)}
                                  className="btn-primary py-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1 w-full sm:w-auto text-center rounded-full"
                                >
                                  <Eye size={12} /> View Details & Timeline
                                </button>

                                <button
                                  onClick={() => {
                                    const authToken = token || localStorage.getItem('lilycharm_token') || ''
                                    window.open(`${API_URL}/orders/${o?._id}/invoice?token=${encodeURIComponent(authToken)}`, '_blank')
                                  }}
                                  className="btn-outline py-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1 w-full sm:w-auto text-center rounded-full"
                                >
                                  <Download size={12} /> Invoice PDF
                                </button>

                                {['Pending Payment', 'Pending', 'Order Confirmed', 'Confirmed', 'Paid'].includes(o?.status) && (
                                  <button
                                    onClick={() => {
                                      const isPaidOrder = o?.paymentStatus === 'Paid' || o?.status === 'Order Confirmed' || o?.status === 'Confirmed' || o?.status === 'Paid'
                                      const orderTotal = o?.grandTotal ?? o?.total ?? 0
                                      const processingFee = Math.round(orderTotal * 0.03)
                                      const netRefund = Math.max(0, orderTotal - processingFee)
                                      const authToken = token || localStorage.getItem('lilycharm_token') || ''

                                      if (isPaidOrder) {
                                        const customReason = 'Order cancelled by customer'

                                        showConfirm({
                                          title: 'Cancel Order & Initiate Refund',
                                          type: 'warning',
                                          message: `Are you sure you want to cancel paid order "${o?.orderNumber || o?._id}"? Automatic refund will be processed back to your original payment method.`,
                                          details: [
                                            { label: 'Order Number', value: o?.orderNumber || o?._id },
                                            { label: 'Original Order Total', value: formatPrice(orderTotal) },
                                            { label: 'Processing Fee (3%)', value: `- ${formatPrice(processingFee)}`, color: 'text-rose-700 font-bold' },
                                            { label: 'Net Refund to Customer (97%)', value: formatPrice(netRefund), color: 'text-emerald-800 font-bold text-sm', isTotal: true },
                                          ],
                                          disclaimer: 'Customer self-cancellation incurs a 3% payment processing fee. The net 97% refund is automatically credited back to your original payment method within 5–7 banking days. (Note: 100% full refund applies if cancelled by Studio).',
                                          confirmText: `Confirm Cancellation (${formatPrice(netRefund)} Refund)`,
                                          cancelText: 'Keep Order',
                                          onConfirm: async () => {
                                            try {
                                              const res = await fetch(`${API_URL}/orders/${o?._id}/cancel`, {
                                                method: 'PATCH',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                                                },
                                                body: JSON.stringify({ reason: customReason }),
                                              })
                                              const data = await res.json()
                                              if (res.ok) {
                                                showAlert({
                                                  title: 'Order Cancelled & Refund Initiated',
                                                  type: 'success',
                                                  message: `✨ Order ${o?.orderNumber || o?._id} has been cancelled. Net refund of ${formatPrice(netRefund)} (97%) has been sent to your original payment method.`,
                                                })
                                                fetchUserOrdersAndRequests()
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
                                      } else {
                                        const customReason = 'Cancelled before payment'

                                        showConfirm({
                                          title: 'Cancel Unpaid Order',
                                          type: 'warning',
                                          message: `Are you sure you want to cancel order "${o?.orderNumber || o?._id}"? Because this order is unpaid, no payment has been charged to your account.`,
                                          details: [
                                            { label: 'Order Number', value: o?.orderNumber || o?._id },
                                            { label: 'Order Total', value: formatPrice(orderTotal) },
                                            { label: 'Payment Status', value: 'Unpaid / Pending' },
                                          ],
                                          disclaimer: 'This order will be cancelled immediately. No charges were made to your account.',
                                          confirmText: 'Confirm Order Cancellation',
                                          cancelText: 'Keep Order',
                                          onConfirm: async () => {
                                            try {
                                              const res = await fetch(`${API_URL}/orders/${o?._id}/cancel`, {
                                                method: 'PATCH',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                                                },
                                                body: JSON.stringify({ reason: customReason || 'Cancelled by customer before payment' }),
                                              })
                                              const data = await res.json()
                                              if (res.ok) {
                                                showAlert({
                                                  title: 'Order Cancelled',
                                                  type: 'success',
                                                  message: `✨ Order ${o?.orderNumber || o?._id} has been cancelled. No payment was charged.`,
                                                })
                                                fetchUserOrdersAndRequests()
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
                                      }
                                    }}
                                    className="text-rose-600 border border-rose-300 hover:bg-rose-50 font-bold text-[0.62rem] sm:text-[0.65rem] uppercase tracking-wider px-3 py-2 transition-colors flex items-center justify-center gap-1 rounded-full cursor-pointer transition-colors shadow-sm self-end sm:self-auto"
                                    title="Cancel Order"
                                  >
                                    <XCircle size={11} /> Cancel Order
                                  </button>
                                )}

                                {['Handcrafting', 'Handcrafting in Studio', 'Processing', 'Studio Processing', 'Packed', 'Packed & Sealed', 'Packed & Dispatched', 'Shipped', 'Out For Delivery'].includes(o?.status) && (
                                  <span className="text-[0.62rem] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1.5 rounded flex items-center gap-1">
                                    🎨 Handcrafting/Dispatch Started — Cannot Cancel Online
                                  </span>
                                )}

                                {o?.razorpayRefundId && (
                                  <span className="text-[0.62rem] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded flex items-center gap-1">
                                    ✨ Refund Ref: {o.razorpayRefundId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                    Price quotes from lead artisan for your bespoke design requests ({userProfile?.name || 'Valued Collector'}).
                  </p>
                </div>
                <button
                  onClick={() => fetchUserOrdersAndRequests()}
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

                      {req.quotedPrice > 0 && (() => {
                        const customShipping = getCustomOrderShipping(req.quotedPrice)
                        const totalCustomAmount = (req.quotedPrice || 0) + customShipping
                        return (
                          <div className="p-4 bg-amber-50 border border-amber-200 space-y-2">
                            <span className="eyebrow text-[0.65rem] font-bold text-amber-900 uppercase">Studio Quoted Price</span>
                            <p className="text-xl font-bold font-mono text-emerald-800">{formatPrice(req.quotedPrice)}</p>
                            {customShipping > 0 ? (
                              <p className="text-[0.68rem] text-amber-900 font-mono">+ {formatPrice(customShipping)} Standard Shipping (Total: <strong>{formatPrice(totalCustomAmount)}</strong>)</p>
                            ) : (
                              <p className="text-[0.68rem] text-emerald-800 font-mono font-bold">✨ FREE Shipping (Total: {formatPrice(totalCustomAmount)})</p>
                            )}
                            {req.adminNotes && <p className="text-xs italic text-amber-900 font-medium">Studio Note: {req.adminNotes}</p>}

                            {/* Accept / Decline Action Bar if status is Quoted */}
                            {req.status === 'Quoted' && (
                              <div className="pt-2 flex flex-wrap gap-2 items-center">
                                <button
                                  onClick={() => handleAcceptQuoteAndPay(req)}
                                  className="btn-primary py-2.5 px-5 text-[0.68rem] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                                >
                                  💳 Accept Quote & Pay Now ({formatPrice(totalCustomAmount)})
                                </button>

                                <button
                                  onClick={async () => {
                                    try {
                                      await fetch(`${API_URL}/custom-requests/${req._id}/decline`, { method: 'PATCH' })
                                      fetchUserOrdersAndRequests()
                                    } catch (e) {
                                      console.error('Error declining quote:', e)
                                    }
                                  }}
                                  className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-[0.65rem] font-bold uppercase rounded-full"
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
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED ADDRESSES */}
          {tab === 'Saved Addresses' && (
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4 max-w-md text-xs rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 font-bold uppercase text-sm border-b border-[var(--color-line)] pb-2">
                <MapPin size={16} className="text-[var(--color-primary)]" /> Primary Shipping Address
              </div>
              {!userProfile?.address?.trim() ? (
                <div className="py-4 text-center text-[var(--color-ink-soft)] space-y-2">
                  <p className="font-bold uppercase">No Saved Address Found</p>
                  <p className="text-[0.7rem]">You can add your primary shipping address under the <strong>Profile Details</strong> tab.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="font-bold text-sm text-[var(--color-ink)]">{userProfile?.name || 'Valued Customer'}</p>
                    <p className="text-[var(--color-ink-soft)] text-xs mt-1 leading-relaxed">{userProfile?.address}</p>
                    <p className="text-[var(--color-ink-soft)] text-xs leading-relaxed">{userProfile?.city} - {userProfile?.pincode}</p>
                    <p className="text-[var(--color-primary)] font-mono text-[0.75rem] font-bold mt-1">📞 {userProfile?.phone || '+91 98765 43210'}</p>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-line)] flex justify-end">
                    <button
                      onClick={handleDeleteAddress}
                      className="px-3.5 py-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 text-[0.65rem] font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete Saved Address
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Order Details & Live Tracking Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onRefresh={() => fetchUserOrdersAndRequests()}
      />
    </div>
  )
}
