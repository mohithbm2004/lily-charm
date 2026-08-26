import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Package,
  Truck,
  Tag,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  Lock,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Search,
  Layers,
  Upload,
  Sparkles,
  Users,
  User,
  Eye,
  EyeOff,
  Star,
  MessageSquare,
  Download,
  CheckCircle2,
  XCircle,
  RefreshCw,
  CreditCard,
  RotateCcw,
  FileText,
  Copy,
  MapPin,
  Calendar,
  Clock,
  Activity,
  Receipt,
  GripVertical,
} from 'lucide-react'
import { useStudio } from '../context/StudioContext'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useScrollLock } from '../lib/useScrollLock'
import StepUpMfaModal from '../components/StepUpMfaModal'
import { formatPrice, formatDateTime, formatDateOnly } from '../lib/format'
import { exportOrdersToCSV, exportUsersToCSV, exportCustomRequestsToCSV, exportReviewsToCSV } from '../lib/exportCSV'
import ImageFocusPicker from '../components/ImageFocusPicker'
import { API_URL, STOREFRONT_URL } from '../config/api'
import { getSocket } from '../services/socket'
const FULFILLMENT_OPTIONS = [
  { value: 'Order Confirmed', label: '✅ Order Confirmed' },
  { value: 'Handcrafting in Studio', label: '🎨 Handcrafting in Studio' },
  { value: 'Studio Processing', label: '✂️ Studio Processing' },
  { value: 'Packed & Sealed', label: '📦 Packed & Sealed' },
  { value: 'Packed & Dispatched', label: '🚚 Packed & Dispatched' },
  { value: 'Shipped', label: '✈️ Shipped' },
  { value: 'Out For Delivery', label: '🛵 Out For Delivery' },
  { value: 'Delivered', label: '🎉 Delivered' },
]

function normalizeAdminFulfillment(st) {
  if (!st) return 'Order Confirmed'
  const trimmed = st.trim()
  if (trimmed === 'Confirmed') return 'Order Confirmed'
  if (trimmed === 'Handcrafting') return 'Handcrafting in Studio'
  if (trimmed === 'Processing') return 'Studio Processing'
  if (trimmed === 'Packed') return 'Packed & Sealed'
  return trimmed
}

export default function AdminDashboard({ activeTabName = 'Products' }) {
  const { admin, logout, changePassword, logoutAllSessions } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    products,
    collections = [],
    orders,
    customRequests = [],
    users = [],
    reviews = [],
    marqueeText,
    addProduct,
    updateProduct,
    deleteProduct,
    addCollection,
    updateCollection,
    deleteCollection,
    deleteAllCollections,
    updateOrderStatus,
    deleteOrder,
    deleteAllOrders,
    quoteCustomPrice,
    updateCustomRequestStatus,
    deleteCustomRequest,
    toggleReviewDisplay,
    deleteReview,
    refreshReviewsFromApi,
    updateMarquee,
    shippingSettings,
    updateShippingSettings,
    coupons = [],
    addCoupon,
    toggleCoupon,
    deleteCoupon,
  } = useStudio()

  // Double Confirmation Modal state for safe bulk deletion
  const [doubleConfirmModal, setDoubleConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    expectedPhrase: 'DELETE',
    inputText: '',
    actionLabel: 'Permanently Delete All',
    onConfirm: null,
  })

  const [tempShipping, setTempShipping] = useState(() => ({
    shippingFeeEnabled: shippingSettings?.shippingFeeEnabled ?? true,
    standardShippingFee: shippingSettings?.standardShippingFee ?? 100,
    freeShippingThreshold: shippingSettings?.freeShippingThreshold ?? 2500,
  }))
  const [hasInitializedShipping, setHasInitializedShipping] = useState(false)
  const [savedShippingMsg, setSavedShippingMsg] = useState(false)

  useEffect(() => {
    if (shippingSettings) {
      setTempShipping({
        shippingFeeEnabled: shippingSettings.shippingFeeEnabled !== undefined ? Boolean(shippingSettings.shippingFeeEnabled) : true,
        standardShippingFee: Number(shippingSettings.standardShippingFee) || 100,
        freeShippingThreshold: Number(shippingSettings.freeShippingThreshold) || 2000,
      })
    }
  }, [shippingSettings])

  const handleSaveShipping = async (e) => {
    e.preventDefault()
    if (updateShippingSettings) {
      await updateShippingSettings(tempShipping)
    }
    setSavedShippingMsg(true)
    setTimeout(() => setSavedShippingMsg(false), 3000)
  }

  const [activeTab, setActiveTab] = useState(() => {
    const p = location.pathname
    if (p.includes('/admin/orders')) return 'orders'
    if (p.includes('/admin/customers')) return 'users'
    if (p.includes('/admin/custom-designs')) return 'custom-requests'
    if (p.includes('/admin/reviews')) return 'reviews'
    if (p.includes('/admin/payments')) return 'payments'
    if (p.includes('/admin/refunds')) return 'refunds'
    if (p.includes('/admin/coupons')) return 'coupons'
    if (p.includes('/admin/email-security')) return 'email-security'
    if (p.includes('/admin/settings')) return 'offers'
    if (p.includes('/admin/dashboard')) return 'dashboard'
    return activeTabName ? activeTabName.toLowerCase().replace(/\s+/g, '-') : 'products'
  })

  useEffect(() => {
    const p = location.pathname
    if (p.includes('/admin/orders')) setActiveTab('orders')
    else if (p.includes('/admin/customers')) setActiveTab('users')
    else if (p.includes('/admin/custom-designs')) setActiveTab('custom-requests')
    else if (p.includes('/admin/reviews')) setActiveTab('reviews')
    else if (p.includes('/admin/payments')) setActiveTab('payments')
    else if (p.includes('/admin/refunds')) setActiveTab('refunds')
    else if (p.includes('/admin/coupons')) setActiveTab('coupons')
    else if (p.includes('/admin/email-security')) setActiveTab('email-security')
    else if (p.includes('/admin/settings')) setActiveTab('offers')
    else if (p.includes('/admin/dashboard')) setActiveTab('dashboard')
    else if (p.includes('/admin/products')) setActiveTab('products')
  }, [location.pathname])

  const handleTabChange = (tabKey, routePath) => {
    setActiveTab(tabKey)
    if (routePath) navigate(routePath)
  }

  // Step-Up MFA Modal State for High-Risk Actions
  const [stepUpModal, setStepUpModal] = useState({
    isOpen: false,
    title: '',
    actionMessage: '',
    onConfirm: null,
  })

  // Search & Filter state for products
  const [searchQuery, setSearchQuery] = useState('')

  // Product Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  // Security Settings Form State
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [securityMsg, setSecurityMsg] = useState('')
  const [securityErr, setSecurityErr] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // Payments state
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentMetrics, setPaymentMetrics] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    capturedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    refundedPayments: 0,
    reconciledPayments: 0,
    attentionRequiredPayments: 0,
  })
  const [paymentPagination, setPaymentPagination] = useState({
    totalCount: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  })

  // Filters state
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentDateRange, setPaymentDateRange] = useState('all') // 'all' | 'today' | '7days' | '30days' | 'custom'
  const [paymentDateFrom, setPaymentDateFrom] = useState('')
  const [paymentDateTo, setPaymentDateTo] = useState('')
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState(null)
  const [isReconciling, setIsReconciling] = useState(false)

  // Orders filter/search state
  const [orderSearch, setOrderSearch] = useState('')
  const [orderDateRange, setOrderDateRange] = useState('all') // 'all' | 'today' | '7days' | '30days' | 'custom'
  const [orderDateFrom, setOrderDateFrom] = useState('')
  const [orderDateTo, setOrderDateTo] = useState('')

  // Uptime Robot Status
  const [uptimeStatus, setUptimeStatus] = useState({ lastPing: null, history: [], loading: true })
  const [showUptimeModal, setShowUptimeModal] = useState(false)

  const fetchUptimeStatus = useCallback(async () => {
    const sessionId = localStorage.getItem('lilycharm_admin_session_id') || ''
    try {
      const res = await fetch(`${API_URL}/admin/uptime-status`, {
        headers: {
          ...(sessionId ? { 'x-admin-session-id': sessionId } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        setUptimeStatus({ lastPing: data.lastPing, history: data.history || [], loading: false })
      }
    } catch (err) {
      console.error('Failed to fetch uptime status:', err)
    }
  }, [])

  useEffect(() => {
    fetchUptimeStatus()
    const interval = setInterval(fetchUptimeStatus, 60000)
    return () => clearInterval(interval)
  }, [fetchUptimeStatus])

  // Refs and hooks for top/bottom scrollbar synchronization
  const topScrollRef = useRef(null)
  const bottomScrollRef = useRef(null)
  const isScrollingRef = useRef(null)
  const [tableScrollWidth, setTableScrollWidth] = useState(0)

  const handleTopScroll = () => {
    if (isScrollingRef.current === 'bottom') return
    isScrollingRef.current = 'top'
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }
    setTimeout(() => {
      if (isScrollingRef.current === 'top') isScrollingRef.current = null
    }, 50)
  }

  const handleBottomScroll = () => {
    if (isScrollingRef.current === 'top') return
    isScrollingRef.current = 'bottom'
    if (bottomScrollRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft
    }
    setTimeout(() => {
      if (isScrollingRef.current === 'bottom') isScrollingRef.current = null
    }, 50)
  }

  useEffect(() => {
    if (activeTab === 'payments' && bottomScrollRef.current) {
      const timer = setTimeout(() => {
        if (bottomScrollRef.current) {
          setTableScrollWidth(bottomScrollRef.current.scrollWidth)
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [payments, activeTab, paymentsLoading])

  const getHeaders = (extra = {}) => {
    const sessionId = localStorage.getItem('lilycharm_admin_session_id')
    const headers = { ...extra }
    if (sessionId) {
      headers['x-admin-session-id'] = sessionId
    }
    return headers
  }

  const fetchPaymentsData = useCallback(async () => {
    if (activeTab !== 'payments') return

    setPaymentsLoading(true)
    try {
      let url = `${API_URL}/payment/admin/tracking?page=${paymentPagination.page}&limit=${paymentPagination.limit}&status=${paymentStatusFilter}`

      if (paymentSearch.trim()) {
        url += `&search=${encodeURIComponent(paymentSearch.trim())}`
      }

      if (paymentDateRange !== 'all') {
        let fromDate = ''
        let toDate = new Date().toISOString()
        const now = new Date()

        if (paymentDateRange === 'today') {
          now.setHours(0, 0, 0, 0)
          fromDate = now.toISOString()
        } else if (paymentDateRange === '7days') {
          now.setDate(now.getDate() - 7)
          fromDate = now.toISOString()
        } else if (paymentDateRange === '30days') {
          now.setDate(now.getDate() - 30)
          fromDate = now.toISOString()
        } else if (paymentDateRange === 'custom') {
          if (paymentDateFrom) fromDate = new Date(paymentDateFrom).toISOString()
          if (paymentDateTo) toDate = new Date(paymentDateTo).toISOString()
        }

        if (fromDate) url += `&from=${fromDate}`
        if (toDate) url += `&to=${toDate}`
      }

      const res = await fetch(url, {
        headers: getHeaders(),
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
        setPaymentMetrics(data.metrics || {})
        setPaymentPagination(prev => ({
          ...prev,
          totalCount: data.pagination?.totalCount || 0,
          totalPages: data.pagination?.totalPages || 1,
        }))
      }
    } catch (err) {
      console.error('Failed to fetch payments data:', err)
    } finally {
      setPaymentsLoading(false)
    }
  }, [
    activeTab,
    paymentPagination.page,
    paymentPagination.limit,
    paymentStatusFilter,
    paymentSearch,
    paymentDateRange,
    paymentDateFrom,
    paymentDateTo,
  ])

  useEffect(() => {
    fetchPaymentsData()
  }, [fetchPaymentsData])

  useEffect(() => {
    const socket = getSocket()
    if (socket) {
      const handleUpdate = () => {
        fetchPaymentsData()
      }
      socket.on('ORDER_UPDATED', handleUpdate)
      socket.on('ORDER_STATUS_UPDATED', handleUpdate)
      socket.on('ORDER_CREATED', handleUpdate)
      
      return () => {
        socket.off('ORDER_UPDATED', handleUpdate)
        socket.off('ORDER_STATUS_UPDATED', handleUpdate)
        socket.off('ORDER_CREATED', handleUpdate)
      }
    }
  }, [fetchPaymentsData])

  const handleReconcile = async (payment) => {
    if (isReconciling) return
    setIsReconciling(true)
    try {
      const res = await fetch(`${API_URL}/payment/admin/reconcile`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId || `manual-rec-${Date.now()}`,
          amountInRupees: payment.amount,
        }),
        credentials: 'include',
      })

      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Payment reconciled successfully.')
        fetchPaymentsData()
        if (selectedPaymentDetail) {
          setSelectedPaymentDetail(null)
        }
      } else {
        alert(data.message || 'Failed to reconcile payment.')
      }
    } catch (err) {
      console.error(err)
      alert('An error occurred while reconciling the payment.')
    } finally {
      setIsReconciling(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setSecurityMsg('')
    setSecurityErr('')

    if (!currentPass || !newPass || !confirmPass) {
      setSecurityErr('Please fill in all password fields.')
      return
    }

    if (newPass !== confirmPass) {
      setSecurityErr('New passwords do not match.')
      return
    }

    if (newPass.length < 12) {
      setSecurityErr('New password must be at least 12 characters long.')
      return
    }

    setChangingPass(true)
    try {
      const data = await changePassword(currentPass, newPass, confirmPass)
      setSecurityMsg(data.message || 'Password changed successfully! Please sign in with your new password.')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      setSecurityErr(err.message || 'Failed to change password.')
    } finally {
      setChangingPass(false)
    }
  }

  const [newFlower, setNewFlower] = useState({
    title: '',
    specimen: `Flower ${products.length + 1}`,
    category: '',
    price: 3499,
    description: '',
    materials: 'Handcrafted velvet pipe cleaners, faux pearls, satin ribbon',
    dimensions: '35 cm height',
    image: '/images/products/flower-1-1.jpg',
    imageOrientation: 'portrait',
    imageX: 50,
    imageY: 50,
    imageScale: 1,
    imageRatio: null,
  })

  // Collection Add / Edit Modal state
  const [showAddColModal, setShowAddColModal] = useState(false)
  const [showEditColModal, setShowEditColModal] = useState(false)
  const [editingCol, setEditingCol] = useState(null)

  const [newCol, setNewCol] = useState({
    title: '',
    slug: '',
    blurb: '',
    image: '',
    imageOrientation: 'landscape',
    imageX: 50,
    imageY: 50,
    imageScale: 1,
  })

  // Marquee edit state
  const [tempMarquee, setTempMarquee] = useState(marqueeText)

  // Segment Coupon Form State
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    title: '',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountCap: 0,
    targetSegment: 'All Products',
    isActive: true,
  })

  // Field validation & preview states
  const [previewImageModal, setPreviewImageModal] = useState(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [selectedUserModal, setSelectedUserModal] = useState(null)
  const [selectedUserOrderDetail, setSelectedUserOrderDetail] = useState(null)
  const [copiedOrderId, setCopiedOrderId] = useState(false)
  const [orderModalPos, setOrderModalPos] = useState({ x: 0, y: 0 })
  const [isDraggingOrderModal, setIsDraggingOrderModal] = useState(false)
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 })

  // Reset drag position when opening a new order detail modal
  useEffect(() => {
    if (selectedUserOrderDetail) {
      setOrderModalPos({ x: 0, y: 0 })
    }
  }, [selectedUserOrderDetail])

  // Window drag movement listeners
  useEffect(() => {
    if (!isDraggingOrderModal) return

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.startX
      const dy = e.clientY - dragStartRef.current.startY
      setOrderModalPos({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy,
      })
    }

    const handleMouseUp = () => {
      setIsDraggingOrderModal(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingOrderModal])

  // Lock background screen scrolling whenever any modal / floating screen is open
  const isAnyAdminModalOpen = Boolean(
    showAddModal ||
    showEditModal ||
    showAddColModal ||
    showEditColModal ||
    selectedUserModal ||
    selectedUserOrderDetail ||
    previewImageModal ||
    doubleConfirmModal?.isOpen ||
    stepUpModal?.isOpen
  )

  useScrollLock(isAnyAdminModalOpen)

  const handleStartDragOrderModal = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return
    setIsDraggingOrderModal(true)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: orderModalPos.x,
      posY: orderModalPos.y,
    }
  }

  const [requestFilter, setRequestFilter] = useState('all') // 'all' | 'accepted' | 'rejected' | 'pending'

  // Categorize Custom Requests into Accepted, Rejected, and Pending columns
  const acceptedRequests = useMemo(() => {
    return (customRequests || []).filter(
      (r) =>
        r.status === 'Accepted & Order Created' ||
        r.status === 'Paid & Order Placed' ||
        r.status === 'Paid & Confirmed' ||
        r.status === 'Accepted' ||
        r.status === 'Approved' ||
        r.status === 'Completed' ||
        r.isAccepted === true ||
        Boolean(r.convertedOrderId)
    )
  }, [customRequests])

  const rejectedRequests = useMemo(() => {
    return (customRequests || []).filter(
      (r) =>
        r.status === 'Rejected' ||
        r.status === 'Quote Declined' ||
        r.status === 'Declined' ||
        r.isDeclined === true
    )
  }, [customRequests])

  const pendingRequests = useMemo(() => {
    return (customRequests || []).filter((r) => {
      const isAccepted =
        r.status === 'Accepted & Order Created' ||
        r.status === 'Paid & Order Placed' ||
        r.status === 'Paid & Confirmed' ||
        r.status === 'Accepted' ||
        r.status === 'Approved' ||
        r.status === 'Completed' ||
        r.isAccepted === true ||
        Boolean(r.convertedOrderId)

      const isRejected =
        r.status === 'Rejected' ||
        r.status === 'Quote Declined' ||
        r.status === 'Declined' ||
        r.isDeclined === true

      return !isAccepted && !isRejected
    })
  }, [customRequests])

  const renderRequestCard = (req) => {
    const reqImages = Array.isArray(req.images) && req.images.length > 0
      ? req.images
      : (req.image ? [req.image] : [])
    const mainPhoto = req.image || reqImages[0] || ''

    const isPaidOrAccepted =
      req.status === 'Accepted & Order Created' ||
      req.status === 'Paid & Order Placed' ||
      req.status === 'Paid & Confirmed' ||
      req.status === 'Accepted' ||
      req.status === 'Approved' ||
      req.status === 'Completed' ||
      req.isAccepted === true ||
      Boolean(req.convertedOrderId)

    return (
      <div
        key={req._id}
        className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-4 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2 border-b border-[var(--color-line)] pb-3">
            <div>
              <h3 className="font-bold text-base font-[var(--font-display)]">{req.name}</h3>
              <p className="text-xs text-[var(--color-primary)] font-semibold">{req.email}</p>
              {req.phone && <p className="text-[0.7rem] text-[var(--color-ink-soft)] font-mono">{req.phone}</p>}
              <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono font-semibold pt-0.5">
                🕒 {formatDateTime(req.createdAt)}
              </p>
            </div>
            <span className={`text-[0.62rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
              isPaidOrAccepted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : req.status === 'In Review'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : req.status === 'Rejected' || req.status === 'Quote Declined' || req.status === 'Declined'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {req.status || 'Pending'}
            </span>
          </div>

          {/* Style Preference & Delivery Location */}
          <div className="space-y-1">
            <span className="eyebrow text-[0.65rem]">Preferred Style</span>
            <p className="text-xs font-bold">{req.stylePreference || 'Custom Arrangement'}</p>
            {(req.address || req.city || req.pincode) && (
              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-medium pt-0.5">
                📍 <strong>Delivery Address:</strong> {req.address ? `${req.address}, ` : ''}{req.city || ''} {req.pincode ? `- ${req.pincode}` : ''}
              </p>
            )}
          </div>

          {/* Customer Notes */}
          {req.notes && (
            <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-line)] text-xs text-[var(--color-ink-soft)] italic leading-relaxed">
              "{req.notes}"
            </div>
          )}

          {/* Reference Photos */}
          {mainPhoto ? (
            <div className="space-y-2">
              <span className="eyebrow text-[0.65rem]">Customer Reference Photo</span>
              <div
                onClick={() => setPreviewImageModal(mainPhoto)}
                className="relative h-44 border border-[var(--color-line)] overflow-hidden cursor-pointer group bg-[var(--color-bg)]"
              >
                <img
                  src={mainPhoto}
                  alt="Custom reference design"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                  <ExternalLink size={14} /> Click to View Full High-Res
                </div>
              </div>

              {/* Additional images row */}
              {reqImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pt-1">
                  {reqImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewImageModal(img)}
                      className="w-12 h-12 border border-[var(--color-line)] overflow-hidden shrink-0 hover:scale-105 transition-transform"
                    >
                      <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-ink-soft)] italic font-mono">No Reference Photo Attached</p>
          )}
        </div>

        {/* Admin Quoted Price / Converted Order Information */}
        {isPaidOrAccepted ? (
          <div className="pt-3 border-t border-[var(--color-line)] bg-emerald-50/70 border-emerald-200 p-3 space-y-2 rounded">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[0.65rem] font-bold text-emerald-900 uppercase">✨ Accepted & Paid</span>
              <span className="text-[0.62rem] font-mono font-bold bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded border border-emerald-300">
                Paid Online
              </span>
            </div>
            <div>
              <p className="text-base font-bold text-emerald-900 font-mono">
                {formatPrice(req.totalAmount || req.quotedPrice)}
              </p>
              {req.shippingCharge > 0 && (
                <p className="text-[0.62rem] text-emerald-800 font-mono">
                  (Quoted: {formatPrice(req.quotedPrice)} + Shipping: {formatPrice(req.shippingCharge)})
                </p>
              )}
            </div>
            {req.convertedOrderId && (
              <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                <span className="text-[0.65rem] font-mono font-bold text-emerald-950 truncate">
                  📦 Order: {req.convertedOrderId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders')
                    setOrderSearch(req.convertedOrderId)
                  }}
                  className="text-[0.62rem] font-bold uppercase text-emerald-900 hover:underline shrink-0 flex items-center gap-0.5"
                >
                  View in Orders ➔
                </button>
              </div>
            )}
            {req.razorpayPaymentId && (
              <p className="text-[0.58rem] font-mono text-emerald-800 truncate" title={req.razorpayPaymentId}>
                Payment ID: {req.razorpayPaymentId}
              </p>
            )}
          </div>
        ) : (
          <div className="pt-3 border-t border-[var(--color-line)] bg-[var(--color-bg)] p-3 space-y-2">
            <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-primary)]">Admin Price Quote (₹ INR)</span>
            {req.quotedPrice ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-emerald-800 font-mono">{formatPrice(req.quotedPrice)}</p>
                {req.adminNotes && <p className="text-[0.68rem] text-[var(--color-ink-soft)] italic">Note: {req.adminNotes}</p>}
              </div>
            ) : (
              <p className="text-[0.68rem] text-rose-600 font-bold">⚠️ Quote Pending from Admin</p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const priceVal = e.target.priceInput.value
                const notesVal = e.target.notesInput.value
                if (priceVal && Number(priceVal) > 0) {
                  quoteCustomPrice(req._id, Number(priceVal), notesVal)
                }
              }}
              className="space-y-2 pt-1"
            >
              <div className="flex gap-2">
                <input
                  name="priceInput"
                  type="number"
                  placeholder="e.g. 4999"
                  defaultValue={req.quotedPrice || ''}
                  required
                  className="border border-[var(--color-line)] p-1.5 text-xs bg-[var(--color-bg)] font-bold text-emerald-900 w-full"
                />
                <button type="submit" className="btn-primary px-3 py-1.5 text-[0.65rem] uppercase font-bold shrink-0">
                  Quote Price
                </button>
              </div>
              <input
                name="notesInput"
                type="text"
                placeholder="Optional quote details or breakdown..."
                defaultValue={req.adminNotes || ''}
                className="border border-[var(--color-line)] p-1.5 text-[0.68rem] bg-[var(--color-bg)] w-full"
              />
            </form>
          </div>
        )}

        {/* Card Actions Footer */}
        <div className="pt-3 border-t border-[var(--color-line)] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[0.68rem] uppercase">Status:</label>
            <select
              value={req.status || 'Quote Pending'}
              onChange={(e) => {
                const newStatus = e.target.value
                if (newStatus === 'Rejected') {
                  const reason = window.prompt(
                    'Enter rejection feedback/reason to email to the customer:',
                    req.adminNotes || 'Due to botanical availability and studio production capacity, we are unable to handcraft this specific bespoke design concept at this time.'
                  )
                  if (reason === null) return // Admin clicked cancel on prompt
                  updateCustomRequestStatus(req._id, newStatus, reason)
                } else {
                  updateCustomRequestStatus(req._id, newStatus)
                }
              }}
              className="border border-[var(--color-line)] bg-[var(--color-bg)] p-1.5 text-xs font-semibold"
            >
              <option value="Quote Pending">Quote Pending</option>
              <option value="Quoted">Quoted</option>
              <option value="Paid & Order Placed">Paid & Order Placed</option>
              <option value="Accepted & Order Created">Accepted & Order Created</option>
              <option value="Paid & Confirmed">Paid & Confirmed</option>
              <option value="Quote Declined">Quote Declined</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex justify-between items-center pt-1 text-[0.65rem] text-[var(--color-ink-soft)] font-mono">
            <span>Received: {new Date(req.createdAt).toLocaleDateString()}</span>
            <button
              onClick={() => deleteCustomRequest(req._id)}
              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
            >
              <Trash2 size={12} /> Delete Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Return ONLY actual registered MongoDB users from database
  const mergedUsers = useMemo(() => {
    return (users || []).map((u) => ({
      _id: u._id || `user-${u.email}`,
      name: u.name || 'Customer',
      email: u.email,
      alternateEmails: u.alternateEmails || [],
      phone: u.phone || '',
      address: u.address || '',
      city: u.city || '',
      pincode: u.pincode || '',
      createdAt: u.createdAt || Date.now(),
      profileImage: u.profileImage || u.profilePicture || u.avatar || '',
      provider: u.provider || (u.googleId ? 'google' : 'email'),
      googleId: u.googleId || '',
      isVerified: u.isVerified !== false,
    }))
  }, [users])

  const filteredUsers = useMemo(() => {
    const q = (userSearchQuery || '').toLowerCase().trim()
    if (!q) return mergedUsers
    return mergedUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.city?.toLowerCase().includes(q) ||
        u.pincode?.toLowerCase().includes(q)
    )
  }, [mergedUsers, userSearchQuery])
  const [addFlowerErrors, setAddFlowerErrors] = useState({})
  const [editFlowerErrors, setEditFlowerErrors] = useState({})
  const [addColErrors, setAddColErrors] = useState({})
  const [editColErrors, setEditColErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleUnlock = (e) => {
    e.preventDefault()
    if (pinInput === '1234' || pinInput === 'admin1234') {
      setIsUnlocked(true)
      localStorage.setItem('lilycharm_admin_unlocked', 'true')
      setPinError(false)
    } else {
      setPinError(true)
    }
  }

  const handleLock = () => {
    setIsUnlocked(false)
    localStorage.removeItem('lilycharm_admin_unlocked')
  }

  const readMultipleFiles = (files, callback) => {
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    const results = []
    let loadedCount = 0

    fileList.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        results.push(reader.result)
        loadedCount++
        if (loadedCount === fileList.length) {
          callback(results)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAddImageFileChange = (e) => {
    readMultipleFiles(e.target.files, (newImages) => {
      setNewFlower((prev) => {
        const existing = Array.isArray(prev.images) && prev.images.length > 0 ? prev.images : (prev.image ? [prev.image] : [])
        const combined = [...existing, ...newImages]
        return {
          ...prev,
          images: combined,
          image: combined[0] || '',
        }
      })
    })
  }

  const handleEditImageFileChange = (e) => {
    readMultipleFiles(e.target.files, (newImages) => {
      setEditingProduct((prev) => {
        const existing = Array.isArray(prev.images) && prev.images.length > 0 ? prev.images : (prev.image ? [prev.image] : [])
        const combined = [...existing, ...newImages]
        return {
          ...prev,
          images: combined,
          image: combined[0] || '',
        }
      })
    })
  }

  const handleAddColImageChange = (e) => {
    readMultipleFiles(e.target.files, (newImages) => {
      setNewCol((prev) => {
        const existing = Array.isArray(prev.images) && prev.images.length > 0 ? prev.images : (prev.image ? [prev.image] : [])
        const combined = [...existing, ...newImages]
        return {
          ...prev,
          images: combined,
          image: combined[0] || '',
        }
      })
    })
  }

  const handleEditColImageChange = (e) => {
    readMultipleFiles(e.target.files, (newImages) => {
      setEditingCol((prev) => {
        const existing = Array.isArray(prev.images) && prev.images.length > 0 ? prev.images : (prev.image ? [prev.image] : [])
        const combined = [...existing, ...newImages]
        return {
          ...prev,
          images: combined,
          image: combined[0] || '',
        }
      })
    })
  }

  const handleStartEdit = (product) => {
    setEditFlowerErrors({})
    const pImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images.map(i => typeof i === 'object' ? i.url : i)
      : (product.image ? [product.image] : [])

    setEditingProduct({
      ...product,
      description: product.description || '',
      images: pImages,
      image: pImages[0] || product.image || '',
      imageOrientation: product.imageOrientation || 'portrait',
      imageX: product.imageX ?? 50,
      imageY: product.imageY ?? 50,
      imageScale: product.imageScale ?? 1,
      imageRatio: product.imageRatio ?? null,
    })
    setShowEditModal(true)
  }

  const handleStartEditCol = (col) => {
    setEditColErrors({})
    const cImages = Array.isArray(col.images) && col.images.length > 0
      ? col.images
      : (col.image ? [col.image] : [])

    setEditingCol({
      ...col,
      images: cImages,
      image: cImages[0] || col.image || '',
      imageOrientation: col.imageOrientation || 'landscape',
      imageX: col.imageX ?? 50,
      imageY: col.imageY ?? 50,
      imageScale: col.imageScale ?? 1,
    })
    setShowEditColModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingProduct || isSubmitting) return
    const pImages = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
      ? editingProduct.images
      : (editingProduct.image ? [editingProduct.image] : [])

    const errors = {}
    if (!editingProduct.title || !editingProduct.title.trim()) errors.title = 'Creation Title field is empty!'
    if (!editingProduct.price || Number(editingProduct.price) <= 0) errors.price = 'Price field is empty!'
    if (pImages.length === 0) errors.image = 'Photo field is empty! Please upload an image.'

    if (Object.keys(errors).length > 0) {
      setEditFlowerErrors(errors)
      return
    }

    setEditFlowerErrors({})
    setIsSubmitting(true)
    try {
      await updateProduct(editingProduct.id, {
        ...editingProduct,
        images: pImages,
        image: pImages[0] || '',
      })
      setShowEditModal(false)
      setEditingProduct(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    const pImages = Array.isArray(newFlower.images) && newFlower.images.length > 0
      ? newFlower.images
      : (newFlower.image ? [newFlower.image] : [])

    const errors = {}
    if (!newFlower.category || !newFlower.category.trim() || newFlower.category === '__add_new_category__') {
      errors.category = 'Collection Category field is empty! Please select a collection.'
    }
    if (!newFlower.title || !newFlower.title.trim()) errors.title = 'Creation Title field is empty!'
    if (!newFlower.specimen || !newFlower.specimen.trim()) errors.specimen = 'Specimen Code field is empty!'
    if (!newFlower.price || Number(newFlower.price) <= 0) errors.price = 'Price field is empty!'
    if (pImages.length === 0) errors.image = 'Photo field is empty! Please upload an image.'

    if (Object.keys(errors).length > 0) {
      setAddFlowerErrors(errors)
      return
    }

    setAddFlowerErrors({})
    setIsSubmitting(true)
    try {
      const id = `flower-${Date.now()}`
      await addProduct({
        ...newFlower,
        id,
        category: newFlower.category.trim(),
        images: pImages,
        image: pImages[0] || '',
      })
      setShowAddModal(false)
      setNewFlower({
        title: '',
        specimen: `Flower ${products.length + 2}`,
        category: '',
        price: 3499,
        description: '',
        materials: 'Handcrafted velvet pipe cleaners, faux pearls, satin ribbon',
        dimensions: '35 cm height',
        image: '',
        images: [],
        imageOrientation: 'portrait',
        imageX: 50,
        imageY: 50,
        imageScale: 1,
        imageRatio: null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddColSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return
    const cImages = Array.isArray(newCol.images) && newCol.images.length > 0
      ? newCol.images
      : (newCol.image ? [newCol.image] : [])

    const errors = {}
    if (!newCol.title || !newCol.title.trim()) errors.title = 'Collection Title field is empty!'
    if (!newCol.blurb || !newCol.blurb.trim()) errors.blurb = 'Description Blurb field is empty!'
    if (cImages.length === 0) errors.image = 'Photo field is empty! Please upload an image.'

    if (Object.keys(errors).length > 0) {
      setAddColErrors(errors)
      return
    }

    setAddColErrors({})
    setIsSubmitting(true)
    try {
      const slug = newCol.slug || newCol.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      await addCollection({
        ...newCol,
        slug,
        images: cImages,
        image: cImages[0] || '',
      })
      setShowAddColModal(false)
      setNewCol({ title: '', slug: '', blurb: '', image: '', images: [], imageOrientation: 'landscape', imageX: 50, imageY: 50, imageScale: 1 })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditColSubmit = async (e) => {
    e.preventDefault()
    if (!editingCol || isSubmitting) return
    const cImages = Array.isArray(editingCol.images) && editingCol.images.length > 0
      ? editingCol.images
      : (editingCol.image ? [editingCol.image] : [])

    const errors = {}
    if (!editingCol.title || !editingCol.title.trim()) errors.title = 'Collection Title field is empty!'
    if (!editingCol.blurb || !editingCol.blurb.trim()) errors.blurb = 'Description Blurb field is empty!'
    if (cImages.length === 0) errors.image = 'Photo field is empty! Please upload an image.'

    if (Object.keys(errors).length > 0) {
      setEditColErrors(errors)
      return
    }

    setEditColErrors({})
    setIsSubmitting(true)
    try {
      await updateCollection(editingCol.id || editingCol._id, {
        ...editingCol,
        images: cImages,
        image: cImages[0] || '',
      })
      setShowEditColModal(false)
      setEditingCol(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCoupon = async (e) => {
    e.preventDefault()
    if (!newCoupon.code) return
    const res = await addCoupon(newCoupon)
    if (res.success) {
      alert(`✨ Segment Coupon "${newCoupon.code.toUpperCase()}" created successfully!`)
      setNewCoupon({
        code: '',
        title: '',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscountCap: 0,
        targetSegment: 'All Products',
        isActive: true,
      })
    } else {
      alert(`Error: ${res.message || 'Failed to create coupon'}`)
    }
  }

  const handleDeleteCoupon = async (coupon) => {
    await deleteCoupon(coupon)
  }

  const handleToggleCoupon = async (coupon) => {
    await toggleCoupon(coupon)
  }

  const handleSaveMarquee = (e) => {
    e.preventDefault()
    updateMarquee(tempMarquee)
    alert('Marquee text updated successfully!')
  }

  const [reviewFilter, setReviewFilter] = useState('all') // 'all', 'displayed', 'hidden'
  const [reviewSearchQuery, setReviewSearchQuery] = useState('')
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState('all')
  const [productSortField, setProductSortField] = useState('createdAt') // 'createdAt' | 'price' | 'stock' | 'title'
  const [productSortOrder, setProductSortOrder] = useState('desc') // 'asc' | 'desc'

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (reviewFilter === 'displayed' && !r.isDisplayed) return false
      if (reviewFilter === 'hidden' && r.isDisplayed) return false
      if (reviewSearchQuery.trim()) {
        const q = reviewSearchQuery.toLowerCase()
        const matchName = r.name?.toLowerCase().includes(q)
        const matchComment = r.comment?.toLowerCase().includes(q)
        const matchTitle = r.title?.toLowerCase().includes(q)
        const matchProduct = r.productTitle?.toLowerCase().includes(q)
        if (!matchName && !matchComment && !matchTitle && !matchProduct) return false
      }
      return true
    })
  }, [reviews, reviewFilter, reviewSearchQuery])

  const filteredOrders = useMemo(() => {
    let result = [...(orders || [])]

    // 1. Filter by Search Query (Order ID / orderNumber, or Payment ID)
    if (orderSearch.trim()) {
      const query = orderSearch.toLowerCase().trim()
      result = result.filter((o) => {
        const orderNum = (o.orderNumber || '').toLowerCase()
        const orderId = (o._id || o.id || '').toString().toLowerCase()
        const paymentId = (o.razorpayPaymentId || '').toLowerCase()
        return orderNum.includes(query) || orderId.includes(query) || paymentId.includes(query)
      })
    }

    // 2. Filter by Date Range
    if (orderDateRange !== 'all') {
      let fromDate = null
      let toDate = new Date()
      const now = new Date()

      if (orderDateRange === 'today') {
        fromDate = new Date()
        fromDate.setHours(0, 0, 0, 0)
      } else if (orderDateRange === '7days') {
        fromDate = new Date()
        fromDate.setDate(now.getDate() - 7)
        fromDate.setHours(0, 0, 0, 0)
      } else if (orderDateRange === '30days') {
        fromDate = new Date()
        fromDate.setDate(now.getDate() - 30)
        fromDate.setHours(0, 0, 0, 0)
      } else if (orderDateRange === 'custom') {
        if (orderDateFrom) {
          fromDate = new Date(orderDateFrom)
          fromDate.setHours(0, 0, 0, 0)
        }
        if (orderDateTo) {
          toDate = new Date(orderDateTo)
          toDate.setHours(23, 59, 59, 999)
        }
      }

      if (fromDate || orderDateTo) {
        result = result.filter((o) => {
          const orderDate = new Date(o.createdAt || o.date)
          if (isNaN(orderDate.getTime())) return true // fallback
          
          if (fromDate && orderDate < fromDate) return false
          if (orderDateTo && orderDate > toDate) return false
          return true
        })
      }
    }

    return result
  }, [orders, orderSearch, orderDateRange, orderDateFrom, orderDateTo])


  const isProductInCollection = (product, colIdentifier) => {
    if (!colIdentifier || colIdentifier === 'all') return true
    const pCat = (product.category || '').toLowerCase().trim()
    const target = String(colIdentifier).toLowerCase().trim()
    if (pCat === target) return true

    const colObj = collections.find(
      (c) =>
        String(c.slug || c.id || c._id || '').toLowerCase() === target ||
        String(c.title || '').toLowerCase() === target
    )
    if (colObj) {
      const colSlug = (colObj.slug || '').toLowerCase()
      const colId = (colObj.id || colObj._id || '').toString().toLowerCase()
      const colTitle = (colObj.title || '').toLowerCase()
      return pCat === colSlug || pCat === colId || pCat === colTitle
    }
    return false
  }

  const getProductCollectionTitle = (p) => {
    const colObj = collections.find(
      (c) =>
        (c.slug && c.slug.toLowerCase() === (p.category || '').toLowerCase()) ||
        (c.id && String(c.id).toLowerCase() === (p.category || '').toLowerCase()) ||
        (c._id && String(c._id).toLowerCase() === (p.category || '').toLowerCase()) ||
        (c.title && c.title.toLowerCase() === (p.category || '').toLowerCase())
    )
    return colObj?.title || p.category || 'General'
  }

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      // 1. Collection / Series Filter
      if (selectedCollectionFilter !== 'all') {
        if (selectedCollectionFilter === 'uncategorized') {
          const matchesAnyCol = collections.some((col) =>
            isProductInCollection(p, col.slug || col.id || col._id)
          )
          if (matchesAnyCol) return false
        } else if (!isProductInCollection(p, selectedCollectionFilter)) {
          return false
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = p.title?.toLowerCase().includes(q)
        const matchSpecimen = p.specimen?.toLowerCase().includes(q)
        const matchCat = p.category?.toLowerCase().includes(q)
        if (!matchTitle && !matchSpecimen && !matchCat) return false
      }

      return true
    })

    // 3. Sorting
    list.sort((a, b) => {
      let valA = a[productSortField]
      let valB = b[productSortField]

      if (productSortField === 'price' || productSortField === 'stock') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else {
        valA = String(valA || '').toLowerCase()
        valB = String(valB || '').toLowerCase()
      }

      if (valA < valB) return productSortOrder === 'asc' ? -1 : 1
      if (valA > valB) return productSortOrder === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [products, selectedCollectionFilter, searchQuery, collections, productSortField, productSortOrder])

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const pendingOrdersCount = orders.filter((o) => o.orderStatus !== 'Delivered').length

  const getUptimeRobotText = () => {
    if (uptimeStatus.loading) return 'Checking Uptime...'
    if (!uptimeStatus.lastPing) return 'UptimeRobot: Waiting...'
    
    const diffMs = Date.now() - new Date(uptimeStatus.lastPing).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'UptimeRobot: Active (just now)'
    if (diffMins < 60) return `UptimeRobot: Active (${diffMins}m ago)`
    return `UptimeRobot: Dormant (${Math.floor(diffMins / 60)}h ago)`
  }

  const isUptimeActive = !uptimeStatus.loading && uptimeStatus.lastPing && (Date.now() - new Date(uptimeStatus.lastPing).getTime() < 15 * 60000)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Dedicated Admin Header */}
      <header className="bg-[var(--color-primary)] text-white border-b border-[var(--color-line)] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-white/40 p-0.5 shadow-sm overflow-hidden bg-white shrink-0">
              <img
                src="/images/logo.png"
                alt="Lily Charm Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <span className="font-[var(--font-display)] font-bold text-base md:text-lg tracking-[0.16em] uppercase block leading-tight text-white">
                Lily Charm Admin
              </span>
              <span className="text-[0.52rem] md:text-[0.55rem] tracking-[0.2em] uppercase font-serif text-white/80 block">
                Floral Creations by Keerthana Bapu
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Uptime Robot Indicator */}
            <div
              onClick={() => setShowUptimeModal(true)}
              className={`flex items-center gap-1.5 text-[0.68rem] font-mono px-3 py-1 rounded-full border shadow-sm cursor-pointer hover:bg-opacity-95 hover:scale-[1.02] active:scale-95 transition-all select-none ${
                uptimeStatus.loading
                  ? 'bg-stone-800 text-stone-300 border-stone-700'
                  : isUptimeActive
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
              }`}
              title={uptimeStatus.lastPing ? `Last health check ping received: ${new Date(uptimeStatus.lastPing).toLocaleString('en-IN')} (Click to view rolling logs)` : 'Awaiting first Uptime Robot request... (Click to view rolling logs)'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${uptimeStatus.loading ? 'bg-stone-500' : isUptimeActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{getUptimeRobotText()}</span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-emerald-200 font-mono bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30">
              <ShieldCheck size={14} />
              <span>{admin?.email || 'keerthanabm@lilycharm.in'}</span>
            </div>
            <a
              href={STOREFRONT_URL || 'https://lilycharm.in'}
              target="_blank"
              rel="noreferrer"
              className="text-xs tracking-wider uppercase font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full border border-white/20 transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} /> Storefront ↗
            </a>
            <button
              onClick={logout}
              className="text-xs tracking-wider uppercase font-bold bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 rounded-full transition-colors inline-flex items-center gap-1.5 shadow-sm"
              title="Sign Out from Admin Panel"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
          <div>
            <span className="eyebrow block mb-1 text-[var(--color-primary)] font-bold">Studio Administrative Portal</span>
            <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-ink)]">
              Welcome back, Keerthana!
            </h1>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">
              Manage your handcrafted flower catalog, collections, update offers, edit prices, and track orders.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-3 px-5 text-xs flex items-center gap-2 rounded-full"
          >
            <Plus size={15} /> Add New Flower Creation
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-5 shadow-sm">
            <p className="eyebrow mb-1">Total Studio Sales</p>
            <p className="text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">
              {formatPrice(totalRevenue)}
            </p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Lifetime Revenue</p>
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-5 shadow-sm">
            <p className="eyebrow mb-1">Active Creations</p>
            <p className="text-2xl font-bold font-[var(--font-display)]">{products.length} Flowers</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Live in Store</p>
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-5 shadow-sm">
            <p className="eyebrow mb-1">Live Collections</p>
            <p className="text-2xl font-bold font-[var(--font-display)] text-emerald-800">{collections.length} Series</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Active Categories</p>
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-5 shadow-sm">
            <p className="eyebrow mb-1">Total Orders</p>
            <p className="text-2xl font-bold font-[var(--font-display)]">{orders.length} Received</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Customer Orders</p>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-[var(--color-line)] overflow-x-auto gap-2 scrollbar-thin pb-1">
          <button
            onClick={() => handleTabChange('products', '/admin/products')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'products'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Package size={15} /> Products ({products.length})
          </button>

          <button
            onClick={() => handleTabChange('collections', '/admin/products')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'collections'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Layers size={15} /> Collections ({collections.length})
          </button>

          <button
            onClick={() => handleTabChange('orders', '/admin/orders')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'orders'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Truck size={15} /> Orders ({orders.length})
          </button>

          <button
            onClick={() => handleTabChange('offers', '/admin/settings')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'offers'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Tag size={15} /> Settings & Offers
          </button>

          <button
            onClick={() => handleTabChange('custom-requests', '/admin/custom-designs')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'custom-requests'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Sparkles size={15} /> Custom Designs ({customRequests.length})
          </button>

          <button
            onClick={() => handleTabChange('users', '/admin/customers')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'users'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Users size={15} /> Customers ({users.length})
          </button>

          <button
            onClick={() => handleTabChange('reviews', '/admin/reviews')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'reviews'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Star size={15} className="text-amber-500 fill-amber-400" /> Reviews ({reviews.length})
          </button>

          <button
            onClick={() => handleTabChange('coupons', '/admin/coupons')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'coupons'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Tag size={15} /> Coupons ({coupons.length})
          </button>

          <button
            onClick={() => handleTabChange('settings', '/admin/settings')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'settings'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Truck size={15} className="text-amber-600" /> Shipping & Settings
          </button>

          <button
            onClick={() => handleTabChange('email-security', '/admin/email-security')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'email-security'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <ShieldCheck size={15} className="text-emerald-600" /> Email Security
          </button>

          <button
            onClick={() => handleTabChange('payments', '/admin/payments')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'payments'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <CreditCard size={15} className="text-indigo-600" /> Payment Tracking
          </button>
        </div>

        {/* TAB 1: PRODUCTS MANAGER */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Filter Bar: Search + Collection Select + Add Button */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]" />
                  <input
                    type="text"
                    placeholder="Search flower title or specimen code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-[var(--color-line)] pl-9 pr-4 py-2 text-xs bg-[var(--color-card-bg)] rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Collection Filter Dropdown */}
                <div className="relative w-full sm:w-64">
                  <select
                    value={selectedCollectionFilter}
                    onChange={(e) => setSelectedCollectionFilter(e.target.value)}
                    className="w-full border border-[var(--color-line)] px-3 py-2 text-xs bg-[var(--color-card-bg)] rounded-xl font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="all">🌸 All Collections ({products.length})</option>
                    {collections.map((col) => {
                      const count = products.filter((p) => isProductInCollection(p, col.slug || col.id || col._id)).length
                      return (
                        <option key={col.id || col._id || col.slug} value={col.slug || col.id || col._id}>
                          📁 {col.title} ({count})
                        </option>
                      )
                    })}
                    {products.some((p) => !collections.some((col) => isProductInCollection(p, col.slug || col.id || col._id))) && (
                      <option value="uncategorized">
                        📂 Uncategorized ({products.filter((p) => !collections.some((col) => isProductInCollection(p, col.slug || col.id || col._id))).length})
                      </option>
                    )}
                  </select>
                </div>

                {/* Sort Field Select */}
                <div className="relative w-full sm:w-44">
                  <select
                    value={productSortField}
                    onChange={(e) => setProductSortField(e.target.value)}
                    className="w-full border border-[var(--color-line)] px-3 py-2 text-xs bg-[var(--color-card-bg)] rounded-xl font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="createdAt">📅 Sort by Date Added</option>
                    <option value="title">🔤 Sort by Title</option>
                    <option value="price">💰 Sort by Price</option>
                    <option value="stock">📦 Sort by Qty (Stock)</option>
                  </select>
                </div>

                {/* Sort Order Select */}
                <div className="relative w-full sm:w-36">
                  <select
                    value={productSortOrder}
                    onChange={(e) => setProductSortOrder(e.target.value)}
                    className="w-full border border-[var(--color-line)] px-3 py-2 text-xs bg-[var(--color-card-bg)] rounded-xl font-medium focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    <option value="desc">⬇️ Descending</option>
                    <option value="asc">⬆️ Ascending</option>
                  </select>
                </div>

                {(selectedCollectionFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCollectionFilter('all')
                      setSearchQuery('')
                    }}
                    className="text-xs text-[var(--color-primary)] hover:underline font-semibold flex items-center gap-1 shrink-0 self-center"
                  >
                    ✕ Reset Filter
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5 rounded-full"
                >
                  <Plus size={14} /> Add New Flower Creation
                </button>
              </div>
            </div>

            {/* Quick Collection Filter Pills */}
            {collections.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedCollectionFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedCollectionFilter === 'all'
                      ? 'bg-[var(--color-primary)] text-white shadow-sm font-bold'
                      : 'border border-[var(--color-line)] bg-[var(--color-card-bg)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <span>All</span>
                  <span className={`text-[0.62rem] px-1.5 py-0.2 rounded-full ${selectedCollectionFilter === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 text-[var(--color-ink-soft)]'}`}>
                    {products.length}
                  </span>
                </button>

                {collections.map((col) => {
                  const val = col.slug || col.id || col._id
                  const isSelected = selectedCollectionFilter === val
                  const count = products.filter((p) => isProductInCollection(p, val)).length
                  return (
                    <button
                      key={col.id || col._id || col.slug}
                      type="button"
                      onClick={() => setSelectedCollectionFilter(isSelected ? 'all' : val)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-sm font-bold'
                          : 'border border-[var(--color-line)] bg-[var(--color-card-bg)] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <span>{col.title}</span>
                      <span className={`text-[0.62rem] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-[var(--color-ink-soft)]'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Products Table */}
            {filteredProducts.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-3 rounded-2xl">
                <Package size={32} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="font-bold uppercase text-sm">No Flower Creations Found</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {selectedCollectionFilter !== 'all'
                    ? `No products match the selected collection filter.`
                    : `No products match "${searchQuery}".`}
                </p>
                {(selectedCollectionFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCollectionFilter('all')
                      setSearchQuery('')
                    }}
                    className="btn-outline text-xs px-4 py-1.5 rounded-full"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-x-auto shadow-sm rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[var(--color-ink-soft)] bg-[var(--color-bg)]">
                      <th className="p-4">Photo</th>
                      <th className="p-4">Specimen</th>
                      <th className="p-4">Creation Title</th>
                      <th className="p-4">Collection / Category</th>
                      <th className="p-4">Price (₹)</th>
                      <th className="p-4">Stock</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)] text-xs">
                    {filteredProducts.map((p) => (
                      <tr key={p.id || p._id} className="hover:bg-[var(--color-bg)]/60 transition-colors">
                        <td className="p-4">
                          {p.image ? (
                            <img src={p.image} alt={p.title} className="w-12 h-12 object-cover border border-[var(--color-line)] rounded-xl" />
                          ) : (
                            <div className="w-12 h-12 bg-stone-200 flex items-center justify-center text-[10px] rounded-xl">No Pic</div>
                          )}
                        </td>
                        <td className="p-4 font-mono font-medium">{p.specimen}</td>
                        <td className="p-4 font-bold font-[var(--font-display)] text-sm">{p.title}</td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => {
                              const matchCol = collections.find((c) => isProductInCollection(p, c.slug || c.id || c._id))
                              if (matchCol) setSelectedCollectionFilter(matchCol.slug || matchCol.id || matchCol._id)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Click to filter by this collection"
                          >
                            📁 {getProductCollectionTitle(p)}
                          </button>
                        </td>
                        <td className="p-4 font-semibold text-emerald-800">{formatPrice(p.price)}</td>
                        <td className={`p-4 font-mono font-bold ${p.stock === 0 ? 'text-rose-600' : p.stock < 5 ? 'text-amber-600' : 'text-stone-700'}`}>
                          {p.stock !== undefined ? p.stock : 10}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="p-1.5 border border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors inline-flex items-center gap-1 text-xs rounded-lg"
                            title="Edit Creation"
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => deleteProduct(p)}
                            className="p-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1 text-xs rounded-lg"
                            title="Delete Creation"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COLLECTIONS MANAGER */}
        {activeTab === 'collections' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase">Manage Series & Collections</h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Add, edit, or remove collection series dynamically reflected on the Customer Storefront.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {collections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDoubleConfirmModal({
                        isOpen: true,
                        title: 'Clear All Storefront Collections',
                        message: `Are you sure you want to permanently delete ALL ${collections.length} collection series from the storefront? This action cannot be undone.`,
                        expectedPhrase: 'DELETE',
                        inputText: '',
                        actionLabel: 'Permanently Clear All Collections',
                        onConfirm: () => deleteAllCollections(),
                      })
                    }}
                    className="border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={14} /> Clear All ({collections.length})
                  </button>
                )}
                <button
                  onClick={() => setShowAddColModal(true)}
                  className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} /> Create New Collection Series
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {collections.map((c, idx) => {
                const isPortrait = c.imageOrientation === 'portrait'
                const ix = c.imageX ?? 50
                const iy = c.imageY ?? 50
                const isc = c.imageScale ?? 1
                return (
                  <div key={c.id || c._id || idx} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-start gap-4">
                      {/* Photo thumbnail with actual focus/zoom applied */}
                      <div className={`shrink-0 border border-[var(--color-line)] overflow-hidden ${isPortrait ? 'w-20 h-28' : 'w-36 h-20'}`}>
                        <img
                          src={c.image || '/images/products/flower-1-1.jpg'}
                          alt={c.title}
                          style={{
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            objectPosition: `${ix}% ${iy}%`,
                            transform: `scale(${isc})`,
                            transformOrigin: `${ix}% ${iy}%`,
                          }}
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <span className="text-[0.65rem] font-mono uppercase tracking-widest text-[var(--color-primary)] font-bold block">
                          Category: {c.slug || c.id}
                        </span>
                        <h3 className="text-lg font-bold font-[var(--font-display)] leading-tight">{c.title}</h3>
                        <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed line-clamp-2">
                          {c.blurb}
                        </p>
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <span className="text-[0.6rem] uppercase tracking-wider bg-[var(--color-bg)] border border-[var(--color-line)] px-2 py-0.5 font-bold">
                            {isPortrait ? '▬ Portrait' : '⬛ Landscape'}
                          </span>
                          <span className="text-[0.6rem] font-mono bg-[var(--color-bg)] border border-[var(--color-line)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                            x:{ix.toFixed(0)}% y:{iy.toFixed(0)}% {isc.toFixed(2)}×
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--color-line)] flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-500">
                        Collection No. 0{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCol({
                              ...c,
                              imageOrientation: c.imageOrientation || 'landscape',
                              imageX: c.imageX ?? 50,
                              imageY: c.imageY ?? 50,
                              imageScale: c.imageScale ?? 1,
                            })
                            setShowEditColModal(true)
                          }}
                          className="px-3 py-1.5 border border-[var(--color-line)] text-xs hover:bg-[var(--color-bg)] flex items-center gap-1"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => deleteCollection(c)}
                          className="px-3 py-1.5 border border-red-300 text-red-600 text-xs hover:bg-red-50 flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ORDER TRACKING & FULFILLMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Truck className="text-[var(--color-primary)]" size={20} /> Order Delivery & Fulfillment Suite
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Process orders, update courier tracking numbers, approve refunds, and generate PDF invoices.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start flex-wrap">
                <span className="bg-[var(--color-primary)] text-white text-xs font-bold font-mono px-3 py-1.5 rounded">
                  {filteredOrders.length === orders.length ? `${orders.length} Orders` : `${filteredOrders.length} of ${orders.length} Orders`}
                </span>

                {orders.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => exportOrdersToCSV(orders)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm rounded"
                      title="Download complete orders spreadsheet as CSV"
                    >
                      <Download size={13} /> Export Orders (CSV)
                    </button>

                    <button
                      onClick={() => {
                        setDoubleConfirmModal({
                          isOpen: true,
                          title: 'Bulk Delete All Customer Orders',
                          message: `⚠️ DANGER: You are about to permanently delete ALL ${orders.length} orders from the studio database. This will wipe out all order histories, payment tracking, and customer shipping records. This cannot be undone.`,
                          expectedPhrase: 'DELETE',
                          inputText: '',
                          actionLabel: 'Permanently Delete All Orders',
                          onConfirm: () => deleteAllOrders(),
                        })
                      }}
                      className="px-3 py-1.5 border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={13} /> Delete All Orders
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Orders Table Container */}
            {orders.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-2">
                <Truck size={32} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="font-bold uppercase text-sm">No Orders Received Yet</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  When customers complete checkout, their order details and shipping address will appear here!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search & Filter Controls */}
                <div className="bg-[var(--color-card-bg)] border border-[var(--color-line)] p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 text-xs">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search by Order ID / Number or Razorpay Payment ID..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-[var(--color-line)] focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] rounded"
                    />
                    <Search className="absolute left-2.5 top-2.5 text-[var(--color-ink-soft)]" size={14} />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="font-bold uppercase tracking-wider text-[var(--color-ink-soft)] whitespace-nowrap">Date Range:</label>
                    <select
                      value={orderDateRange}
                      onChange={(e) => setOrderDateRange(e.target.value)}
                      className="border border-[var(--color-line)] p-2 focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] rounded"
                    >
                      <option value="all">📅 All Time</option>
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="custom">Custom Range...</option>
                    </select>
                  </div>

                  {orderDateRange === 'custom' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={orderDateFrom}
                        onChange={(e) => setOrderDateFrom(e.target.value)}
                        className="border border-[var(--color-line)] p-1.5 focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] rounded"
                      />
                      <span className="text-[var(--color-ink-soft)]">to</span>
                      <input
                        type="date"
                        value={orderDateTo}
                        onChange={(e) => setOrderDateTo(e.target.value)}
                        className="border border-[var(--color-line)] p-1.5 focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] rounded"
                      />
                    </div>
                  )}

                  {(orderSearch.trim() || orderDateRange !== 'all') && (
                    <button
                      onClick={() => {
                        setOrderSearch('')
                        setOrderDateRange('all')
                        setOrderDateFrom('')
                        setOrderDateTo('')
                      }}
                      className="px-3 py-2 text-[var(--color-primary)] hover:text-white border border-[var(--color-primary)] hover:bg-[var(--color-primary)] transition-colors rounded font-bold"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[var(--color-ink-soft)] bg-[var(--color-bg)]">
                        <th className="p-4">Order ID & Timestamp</th>
                        <th className="p-4">Account Owner</th>
                        <th className="p-4">Shipping Details</th>
                        <th className="p-4">Items Ordered</th>
                        <th className="p-4">Amount & Payment</th>
                        <th className="p-4">Courier Tracking</th>
                        <th className="p-4">Fulfillment Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)] text-xs">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-12 text-center text-[var(--color-ink-soft)] space-y-1">
                            <p className="font-bold uppercase text-sm">No Matching Orders Found</p>
                            <p className="text-xs">Adjust your search query or date range filters and try again.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o) => (
                        <tr key={o.id || o._id} className="hover:bg-[var(--color-bg)]/60 transition-colors">
                          <td className="p-4 align-top space-y-1">
                            <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{o.orderNumber || o.id || o._id}</p>
                            <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono font-semibold">
                              🕒 {formatDateTime(o.createdAt || o.date)}
                            </p>
                            <button
                              onClick={() => window.open(`${API_URL}/orders/${o._id || o.id}/invoice`, '_blank')}
                              className="text-[0.62rem] font-bold text-blue-700 hover:underline flex items-center gap-1 mt-1"
                            >
                              📄 Download Invoice
                            </button>
                          </td>
                          {/* Account Owner Column */}
                          <td className="p-4 space-y-1.5 align-top">
                            {(() => {
                              const ownerId = (o.user?._id || o.user)?.toString()
                              const ownerUser = (typeof o.user === 'object' && o.user?._id && o.user?.email)
                                ? o.user
                                : (users || []).find((u) => u._id && u._id.toString() === ownerId)

                              return (
                                <div className="space-y-1">
                                  <p className="font-bold text-sm text-[var(--color-ink)]">
                                    {ownerUser?.name || (typeof o.user === 'object' && o.user?.name) || 'Registered Account'}
                                  </p>
                                  <p className="text-[0.68rem] text-[var(--color-primary)] font-bold truncate max-w-[170px]" title={ownerUser?.email || o.email}>
                                    ✉️ {ownerUser?.email || (typeof o.user === 'object' && o.user?.email) || o.email || 'No email recorded'}
                                  </p>
                                  {ownerUser?.phone && (
                                    <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono">
                                      📞 {ownerUser.phone}
                                    </p>
                                  )}
                                  <div className="pt-0.5">
                                    {ownerUser?.provider === 'google' || ownerUser?.googleId ? (
                                      <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
                                        Google OAuth
                                      </span>
                                    ) : ownerUser?.isVerified ? (
                                      <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-blue-800 bg-blue-50 border border-blue-300 px-1.5 py-0.5 rounded">
                                        Verified Account
                                      </span>
                                    ) : ownerUser ? (
                                      <span className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                                        Registered User
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-[0.58rem] text-[var(--color-ink-soft)] italic">
                                        Account Linked
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })()}
                          </td>
                          {/* Shipping Details Column */}
                          <td className="p-4 space-y-1 align-top">
                            <p className="font-bold text-sm text-[var(--color-ink)]">{o.shippingAddress?.name || o.customerName || 'N/A'}</p>
                            {(o.shippingAddress?.email || o.email) && (
                              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono truncate max-w-[170px]" title={o.shippingAddress?.email || o.email}>
                                ✉️ {o.shippingAddress?.email || o.email}
                              </p>
                            )}
                            {(o.shippingAddress?.phone || o.phone) && (
                              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">
                                📞 {o.shippingAddress?.phone || o.phone}
                              </p>
                            )}
                            <p className="text-[0.68rem] text-[var(--color-ink-soft)] max-w-xs leading-relaxed pt-0.5">
                              📍 {o.shippingAddress?.address || o.shippingAddress?.line1 || o.address || 'Address not provided'}{o.shippingAddress?.city || o.city ? `, ${o.shippingAddress?.city || o.city}` : ''}{o.shippingAddress?.pincode || o.pincode ? ` - ${o.shippingAddress?.pincode || o.pincode}` : ''}
                            </p>
                          </td>
                          <td className="p-4 space-y-2 align-top">
                            {o.items?.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {item.image && (
                                  <img src={item.image} alt={item.title} className="w-8 h-10 object-cover border border-[var(--color-line)] shrink-0" />
                                )}
                                <div>
                                  <p className="font-medium leading-tight text-xs">{item.title}</p>
                                  <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono">Qty: {item.qty || 1} • {formatPrice(item.price)}</p>
                                </div>
                              </div>
                            ))}
                          </td>
                          {/* Amount & Separate Payment Status Column */}
                          <td className="p-4 space-y-1.5 align-top">
                            <p className="font-bold text-sm text-[var(--color-ink)] font-mono">{formatPrice(o.grandTotal || o.total)}</p>
                            <div>
                              {o.paymentStatus === 'Paid' ? (
                                <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-emerald-300 rounded">
                                  🟢 Payment: Paid
                                </span>
                              ) : o.paymentStatus === 'Refunded' ? (
                                <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono font-bold bg-purple-100 text-purple-900 px-2 py-0.5 border border-purple-300 rounded">
                                  💸 Payment: Refunded
                                </span>
                              ) : o.paymentStatus === 'Partially Refunded' ? (
                                <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 border border-indigo-300 rounded">
                                  🔄 Payment: Partial Refund
                                </span>
                              ) : o.paymentStatus === 'Failed' ? (
                                <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono font-bold bg-rose-100 text-rose-900 px-2 py-0.5 border border-rose-300 rounded">
                                  ❌ Payment: Failed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 border border-amber-300 rounded">
                                  ⏳ Payment: Pending
                                </span>
                              )}
                            </div>
                            <p className="text-[0.62rem] text-[var(--color-ink-soft)] font-mono">{o.paymentMethod || 'Razorpay Prepaid'}</p>
                            {o.razorpayPaymentId && (
                              <p className="text-[0.58rem] font-mono text-[var(--color-ink-soft)] truncate max-w-[130px]" title={o.razorpayPaymentId}>
                                ID: {o.razorpayPaymentId}
                              </p>
                            )}

                            {/* Handmade Terms Acceptance Verification */}
                            <div className="pt-1.5 border-t border-[var(--color-line)]/50">
                              {o.termsAccepted ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[0.62rem] font-mono font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded">
                                    ✓ Terms v{o.termsVersion || '1.0'} Accepted
                                  </span>
                                  {o.termsAcceptedAt && (
                                    <p className="text-[0.58rem] text-[var(--color-ink-soft)] font-mono">
                                      {new Date(o.termsAcceptedAt).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center text-[0.58rem] font-mono text-stone-600 bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded">
                                  Terms: Legacy / None
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Tracking Number Input */}
                          <td className="p-4 align-top space-y-1.5">
                            <input
                              type="text"
                              placeholder="Enter Tracking No..."
                              defaultValue={o.trackingNumber || ''}
                              onBlur={(e) => {
                                if (e.target.value !== o.trackingNumber) {
                                  updateOrderStatus(o.id || o._id, o.status || 'Order Confirmed', e.target.value)
                                }
                              }}
                              className="w-full border border-[var(--color-line)] p-1.5 text-xs font-mono bg-white focus:border-[var(--color-primary)]"
                            />
                            <p className="text-[0.62rem] text-[var(--color-ink-soft)]">Carrier: {o.carrier || 'BlueDart'}</p>
                          </td>

                          {/* Controlled Fulfillment Status Column */}
                          <td className="p-4 align-top space-y-2">
                            {o.status === 'Pending Payment' || o.paymentStatus === 'Pending' || o.status === 'Payment Failed' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold font-mono bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded">
                                  ⏳ Pending Payment
                                </span>
                                <p className="text-[0.62rem] text-[var(--color-ink-soft)] leading-tight">
                                  Awaiting payment confirmation
                                </p>
                              </div>
                            ) : o.status === 'Cancelled' || o.status === 'Cancelled & Refunded' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold font-mono bg-rose-50 text-rose-900 border border-rose-300 px-2.5 py-1 rounded">
                                  {o.refundStatus === 'Failed' ? '❌ Cancellation: Refund Failed' : o.status === 'Cancelled & Refunded' ? '💸 Cancelled & Refunded' : '❌ Cancelled'}
                                </span>
                                {o.refundStatus === 'Failed' && (
                                  <div className="text-[0.6rem] text-rose-900 font-mono font-semibold">
                                    <p>Refund: Failed</p>
                                  </div>
                                )}
                                {o.notes && (
                                  <p className="text-[0.62rem] text-rose-900 font-medium break-words max-w-[200px]" title={o.notes}>
                                    {o.notes}
                                  </p>
                                )}
                                {(o.refundStatus === 'Processed' || o.refundStatus === 'Approved') && (
                                  <div className="text-[0.6rem] text-emerald-800 font-mono font-semibold space-y-0.5">
                                    <p>Refund: {o.refundStatus === 'Approved' ? 'Approved' : 'Processed'}</p>
                                    <p>Refund ID: {o.razorpayRefundId || 'N/A'}</p>
                                    {o.refundAmount && <p>Amount: ₹{o.refundAmount}</p>}
                                  </div>
                                )}
                              </div>
                            ) : o.status === 'Delivered' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold font-mono bg-emerald-50 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded">
                                  🎉 Delivered
                                </span>
                                <p className="text-[0.62rem] text-emerald-700 font-semibold">
                                  Fulfillment complete
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <select
                                  value={normalizeAdminFulfillment(o.status)}
                                  onChange={(e) => updateOrderStatus(o.id || o._id, e.target.value)}
                                  className="border border-[var(--color-line)] p-2 text-xs bg-[var(--color-bg)] font-bold focus:outline-none focus:border-[var(--color-primary)] w-full rounded"
                                >
                                  {FULFILLMENT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Refund Actions if requested by customer */}
                            {(o.status === 'Refund Requested' || o.refundStatus === 'Pending Approval') && (
                              <div className="bg-amber-50 border border-amber-300 p-2 rounded space-y-1.5 mt-2">
                                <p className="text-[0.65rem] font-bold text-amber-950 uppercase">⚠️ Refund Requested</p>
                                {o.refundReason && (
                                  <p className="text-[0.6rem] text-amber-900 italic">"{o.refundReason}"</p>
                                )}
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    onClick={async () => {
                                      if (confirm('Approve refund for this order?')) {
                                        const sessionId = localStorage.getItem('lilycharm_admin_session_id') || ''
                                        await fetch(`${API_URL}/orders/${o._id || o.id}/process-refund`, {
                                          method: 'POST',
                                          credentials: 'include',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            ...(sessionId ? { 'x-admin-session-id': sessionId } : {}),
                                          },
                                          body: JSON.stringify({ action: 'approve' }),
                                        })
                                        window.location.reload()
                                      }
                                    }}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-[0.6rem] font-bold uppercase px-2 py-1 rounded"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Reject refund request?')) {
                                        const sessionId = localStorage.getItem('lilycharm_admin_session_id') || ''
                                        await fetch(`${API_URL}/orders/${o._id || o.id}/process-refund`, {
                                          method: 'POST',
                                          credentials: 'include',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            ...(sessionId ? { 'x-admin-session-id': sessionId } : {}),
                                          },
                                          body: JSON.stringify({ action: 'reject' }),
                                        })
                                        window.location.reload()
                                      }
                                    }}
                                    className="bg-rose-700 hover:bg-rose-800 text-white text-[0.6rem] font-bold uppercase px-2 py-1 rounded"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Separate Actions Column */}
                          <td className="p-4 text-right align-top space-y-2">
                            <button
                              onClick={() => {
                                setDoubleConfirmModal({
                                  isOpen: true,
                                  title: `Delete Order ${o.orderNumber || 'Record'}`,
                                  message: `⚠️ WARNING: You are about to permanently delete order ${o.orderNumber || 'record'} for ₹${o.grandTotal || o.total || 0}. This will remove all order histories, payment logs, and tracking records from the database. This action cannot be undone.`,
                                  expectedPhrase: o.orderNumber || 'DELETE',
                                  inputText: '',
                                  actionLabel: 'Permanently Delete Order',
                                  onConfirm: () => deleteOrder(o),
                                })
                              }}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 ml-auto hover:underline"
                            >
                              <Trash2 size={13} /> Delete
                            </button>

                            {o.status !== 'Cancelled' && o.status !== 'Cancelled & Refunded' && (
                              <div>
                                {o.status === 'Pending Payment' || o.paymentStatus === 'Pending' || o.status === 'Payment Failed' ? (
                                  <button
                                    onClick={async () => {
                                      const reason = prompt('Enter reason for cancelling this unpaid order:', 'Cancelled unpaid order')
                                      if (reason !== null) {
                                        try {
                                          const sessionId = localStorage.getItem('lilycharm_admin_session_id') || ''
                                          const res = await fetch(`${API_URL}/orders/${o._id || o.id}/cancel`, {
                                            method: 'PATCH',
                                            credentials: 'include',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              ...(sessionId ? { 'x-admin-session-id': sessionId } : {}),
                                            },
                                            body: JSON.stringify({ reason: reason || 'Cancelled by admin', isAdmin: true }),
                                          })
                                          const data = await res.json()
                                          alert(data.message || 'Order cancelled successfully (No refund required).')
                                          window.location.reload()
                                        } catch {
                                          alert('Failed to cancel order.')
                                        }
                                      }
                                    }}
                                    className="text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[0.65rem] font-bold uppercase px-2 py-1 rounded flex items-center gap-1 ml-auto transition-colors mt-1.5"
                                    title="Cancel unpaid order without refund"
                                  >
                                    <XCircle size={12} /> Cancel Order
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      const reason = prompt('Enter cancellation reason for customer (100% full refund will be initiated):', 'Cancelled by studio admin')
                                      if (reason !== null) {
                                        try {
                                          const sessionId = localStorage.getItem('lilycharm_admin_session_id') || ''
                                          const res = await fetch(`${API_URL}/orders/${o._id || o.id}/cancel`, {
                                            method: 'PATCH',
                                            credentials: 'include',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              ...(sessionId ? { 'x-admin-session-id': sessionId } : {}),
                                            },
                                            body: JSON.stringify({ reason: reason || 'Cancelled by admin', isAdmin: true }),
                                          })
                                          const data = await res.json()
                                          alert(data.message || 'Order cancelled & refund processed!')
                                          window.location.reload()
                                        } catch {
                                          alert('Failed to process refund.')
                                        }
                                      }
                                    }}
                                    className="text-rose-700 hover:text-rose-900 text-[0.68rem] font-bold uppercase flex items-center gap-1 ml-auto hover:underline mt-1.5"
                                    title="Cancel paid order and issue full refund"
                                  >
                                    <XCircle size={12} /> Cancel & Auto Refund
                                  </button>
                                )}
                              </div>
                            )}

                            {o.razorpayRefundId && (
                              <span className="text-[0.6rem] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded block mt-1 text-right">
                                Refund ID: {o.razorpayRefundId}
                              </span>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: OFFERS & MARQUEE */}
        {activeTab === 'offers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <form onSubmit={handleSaveMarquee} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4">
              <h2 className="text-xl font-bold font-[var(--font-display)] uppercase">Announcement Bar Marquee</h2>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2">Scrolling Marquee Text</label>
                <textarea
                  value={tempMarquee}
                  onChange={(e) => setTempMarquee(e.target.value)}
                  rows={4}
                  className="w-full border border-[var(--color-line)] p-3 text-xs focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)]"
                />
              </div>
              <button type="submit" className="btn-primary py-2.5 px-4 text-xs">
                Save Announcement Text
              </button>
            </form>

            {/* Shipping Fee & Free Delivery Threshold Manager */}
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                <div className="flex items-center gap-2">
                  <Truck size={20} className="text-[var(--color-primary)]" />
                  <h2 className="text-xl font-bold font-[var(--font-display)] uppercase">
                    🚚 Shipping Fee & Free Delivery Threshold Settings
                  </h2>
                </div>
                <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                  tempShipping.shippingFeeEnabled ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {tempShipping.shippingFeeEnabled ? 'SHIPPING FEE ENABLED' : 'STOREWIDE FREE SHIPPING'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Control standard shipping charges and set the minimum order total required for FREE delivery across the store.
              </p>

              <form onSubmit={handleSaveShipping} className="space-y-5 pt-2">
                <div className="flex items-center justify-between p-3.5 border border-[var(--color-line)] bg-[var(--color-bg)]">
                  <div>
                    <p className="font-bold text-xs">Enable Shipping Charge</p>
                    <p className="text-[0.68rem] text-[var(--color-ink-soft)]">When disabled, all orders receive 100% Free Shipping storewide.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempShipping.shippingFeeEnabled}
                      onChange={(e) => setTempShipping({ ...tempShipping, shippingFeeEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700" />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">Standard Shipping Charge (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={tempShipping.standardShippingFee}
                      onChange={(e) => setTempShipping({ ...tempShipping, standardShippingFee: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)]"
                      placeholder="e.g. 100"
                    />
                    <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">Charged on orders below the free shipping threshold.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">Free Shipping Threshold Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={tempShipping.freeShippingThreshold}
                      onChange={(e) => setTempShipping({ ...tempShipping, freeShippingThreshold: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)] text-emerald-800"
                      placeholder="e.g. 2500"
                    />
                    <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">Orders at or above this subtotal get FREE delivery.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button type="submit" className="btn-primary py-3 px-6 text-xs uppercase font-bold tracking-wider">
                    Save Shipping Settings
                  </button>
                  {savedShippingMsg && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      ✨ Shipping Settings Saved Live!
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* ADMIN SECURITY & PASSWORD SETTINGS */}
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-6 space-y-5 shadow-sm md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--color-line)] pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[var(--color-primary)]" />
                  <h2 className="text-xl font-bold font-[var(--font-display)] uppercase">
                    🔒 Admin Password & Security Settings
                  </h2>
                </div>
                {admin?.lastPasswordChange && (
                  <span className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">
                    Last Password Change: {new Date(admin.lastPasswordChange).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>

              {securityMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-700" />
                  <span>{securityMsg}</span>
                </div>
              )}

              {securityErr && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <XCircle size={16} className="shrink-0 text-rose-700" />
                  <span>{securityErr}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold uppercase tracking-wider mb-1">
                      Current Password <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      aria-required="true"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono rounded-xl bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider mb-1">
                      New Password <span className="text-red-500 font-bold ml-0.5">*</span> (Min 12 Chars)
                    </label>
                    <input
                      type="password"
                      required
                      aria-required="true"
                      minLength={12}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="New strong password"
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono rounded-xl bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider mb-1">
                      Confirm New Password <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      aria-required="true"
                      minLength={12}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono rounded-xl bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-[var(--color-line)]">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="btn-primary py-2.5 px-6 text-xs uppercase font-bold tracking-wider rounded-full shadow-sm disabled:opacity-50"
                  >
                    {changingPass ? 'Updating Password...' : 'Update Admin Password'}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Are you sure you want to log out all active admin sessions across all devices?')) {
                        await logoutAllSessions()
                      }
                    }}
                    className="px-4 py-2 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold uppercase text-[0.68rem] tracking-wider rounded-full transition-colors"
                  >
                    🚫 Terminate & Logout All Sessions
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB: SHIPPING & SETTINGS */}
        {(activeTab === 'settings' || activeTab === 'coupons') && (
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-6 shadow-sm rounded-3xl mb-6">
            <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
              <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                🚚 Storefront Shipping Rules & Charges
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)]">
                Configure standard shipping fee and free shipping order threshold for storefront checkout. Updates reflect instantly across all customer sessions.
              </p>
            </div>

            <form onSubmit={handleSaveShipping} className="bg-[var(--color-bg)] p-5 border border-[var(--color-line)] space-y-4 rounded-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-[0.7rem] font-bold uppercase mb-1">
                    Enable Storefront Shipping Fee
                  </label>
                  <select
                    value={tempShipping.shippingFeeEnabled ? 'true' : 'false'}
                    onChange={(e) => setTempShipping({ ...tempShipping, shippingFeeEnabled: e.target.value === 'true' })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="true">YES — Charge Shipping Fee Below Free Threshold</option>
                    <option value="false">NO — 100% Free Shipping Everywhere</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase mb-1">
                    Standard Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="100"
                    value={tempShipping.standardShippingFee}
                    onChange={(e) => setTempShipping({ ...tempShipping, standardShippingFee: Number(e.target.value) })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase mb-1">
                    Free Shipping Order Minimum (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="2500"
                    value={tempShipping.freeShippingThreshold}
                    onChange={(e) => setTempShipping({ ...tempShipping, freeShippingThreshold: Number(e.target.value) })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-line)]">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[#1a2316] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm"
                >
                  💾 Save Shipping Settings
                </button>

                {savedShippingMsg && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5 animate-pulse">
                    <CheckCircle2 size={14} /> Shipping settings saved & synced to storefront!
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* TAB: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* MULTI-SEGMENT COUPON MANAGER */}
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-6 shadow-sm rounded-3xl">
              <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  🎯 Segment Coupons (Minimum Spend, Discount Capping & Segment Targeting)
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Create customized promo codes with minimum order prices, maximum discount caps, and segment targeting.
                </p>
              </div>

              {/* Coupon Creation Form */}
              <form onSubmit={handleCreateCoupon} className="bg-[var(--color-bg)] p-5 border border-[var(--color-line)] space-y-4 rounded-2xl">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--color-primary)]">➕ Create New Segment Coupon</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">
                      Coupon Promo Code <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      aria-required="true"
                      placeholder="e.g. VELVET30"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().trim() })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold uppercase rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">
                      Discount Type <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <select
                      value={newCoupon.discountType}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="percentage">Percentage OFF (%)</option>
                      <option value="flat">Flat Amount OFF (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">
                      Discount Amount/Value <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      aria-required="true"
                      min="1"
                      placeholder="e.g. 20 for 20% or 500 for ₹500"
                      value={newCoupon.discountValue}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Minimum Order Spend (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 = No Minimum Spend"
                      value={newCoupon.minOrderAmount}
                      onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="text-[0.62rem] text-[var(--color-ink-soft)] mt-0.5">Order subtotal must be at least this amount.</p>
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Maximum Discount Cap (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 = No Cap (Uncapped)"
                      value={newCoupon.maxDiscountCap}
                      onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscountCap: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="text-[0.62rem] text-[var(--color-ink-soft)] mt-0.5">Max discount limit (e.g. 500 = Max ₹500 OFF).</p>
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Target Segment / Category</label>
                    <select
                      value={newCoupon.targetSegment}
                      onChange={(e) => setNewCoupon({ ...newCoupon, targetSegment: e.target.value })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="All Products">All Storefront Products</option>
                      <option value="Pressed Flower Frames">Pressed Flower Frames</option>
                      <option value="Resin Flower Art">Resin Flower Art</option>
                      <option value="Wedding Collection">Wedding Collection</option>
                      <option value="Velvet Sculptures">Velvet Sculptures</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-bold uppercase mb-1">Offer Title / Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 20% OFF Velvet Sculptures above ₹1,000 (Max ₹500 Cap)"
                    value={newCoupon.title}
                    onChange={(e) => setNewCoupon({ ...newCoupon, title: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs rounded-xl bg-white focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCoupon.isActive}
                      onChange={(e) => setNewCoupon({ ...newCoupon, isActive: e.target.checked })}
                      className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                    />
                    Set Active Immediately
                  </label>

                  <button type="submit" className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                    Add Segment Coupon
                  </button>
                </div>
              </form>

              {/* Segment Coupons Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Active Segment Coupons List ({coupons.length})</h3>
                {coupons.length === 0 ? (
                  <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-xs text-[var(--color-ink-soft)] font-mono rounded-2xl">
                    No custom segment coupons created yet. Fill out the form above to add your first segment offer!
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[var(--color-line)] rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--color-bg)] uppercase text-[0.65rem] tracking-wider border-b border-[var(--color-line)] text-[var(--color-ink-soft)] font-bold">
                        <tr>
                          <th className="p-3">Code</th>
                          <th className="p-3">Discount</th>
                          <th className="p-3">Min Order Spend</th>
                          <th className="p-3">Max Cap Limit</th>
                          <th className="p-3">Segment</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-line)]">
                        {coupons.map((c) => (
                          <tr key={c._id} className="hover:bg-[var(--color-card-bg)]">
                            <td className="p-3 font-mono font-bold text-[var(--color-primary)]">{c.code}</td>
                            <td className="p-3 font-bold">
                              {c.discountValue}{c.discountType === 'percentage' ? '%' : '₹'} OFF
                            </td>
                            <td className="p-3 font-mono">
                              {c.minOrderAmount > 0 ? `₹${c.minOrderAmount.toLocaleString('en-IN')}` : 'No Min Spend'}
                            </td>
                            <td className="p-3 font-mono">
                              {c.maxDiscountCap > 0 ? `₹${c.maxDiscountCap.toLocaleString('en-IN')}` : 'Uncapped'}
                            </td>
                            <td className="p-3 font-semibold text-[var(--color-ink-soft)]">{c.targetSegment}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 text-[0.6rem] font-bold uppercase rounded-full border ${
                                c.isActive !== false ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {c.isActive !== false ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => handleToggleCoupon(c)}
                                className={`text-[0.65rem] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${
                                  c.isActive ? 'border-amber-400 text-amber-900 bg-amber-50' : 'border-emerald-400 text-emerald-900 bg-emerald-50'
                                }`}
                              >
                                {c.isActive ? 'Pause' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(c)}
                                className="text-rose-600 hover:text-rose-900 text-[0.65rem] font-bold uppercase hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CUSTOMER DESIGN REQUESTS MANAGER */}
        {activeTab === 'custom-requests' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Sparkles className="text-[var(--color-primary)]" size={20} /> Customer Custom Design Requests
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Inspect and manage custom requests in dedicated columns for Accepted, Rejected, and Pending orders.
                </p>
              </div>

              {/* Column Filter Tabs & Export */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRequestFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                    requestFilter === 'all'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-card-bg)] text-[var(--color-ink-soft)] border-[var(--color-line)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  All ({customRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('accepted')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                    requestFilter === 'accepted'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  ✓ Accepted ({acceptedRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('rejected')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                    requestFilter === 'rejected'
                      ? 'bg-rose-700 text-white border-rose-700'
                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  ✕ Rejected ({rejectedRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors border ${
                    requestFilter === 'pending'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  ⏱️ Pending ({pendingRequests.length})
                </button>

                {customRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportCustomRequestsToCSV(customRequests)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm rounded ml-auto sm:ml-2"
                    title="Download custom requests spreadsheet as CSV"
                  >
                    <Download size={13} /> Export Custom Quotes (CSV)
                  </button>
                )}
              </div>
            </div>

            {customRequests.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-2">
                <Sparkles size={32} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="font-bold uppercase text-sm">No Custom Requests Yet</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  When customers submit custom design requests via the storefront header button, their reference photos and requirements will appear here!
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* COLUMN 1: ACCEPTED & CREATED ORDERS */}
                {(requestFilter === 'all' || requestFilter === 'accepted') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2 bg-emerald-50/50 p-3 rounded-t">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-950 font-[var(--font-display)]">
                          Accepted & Created Custom Orders Column ({acceptedRequests.length})
                        </h3>
                      </div>
                      <span className="text-[0.68rem] font-bold text-emerald-800 uppercase bg-emerald-200/60 px-2.5 py-0.5 rounded border border-emerald-300">
                        Accepted Quotes
                      </span>
                    </div>

                    {acceptedRequests.length === 0 ? (
                      <div className="border border-dashed border-emerald-300 bg-emerald-50/30 p-6 text-center text-xs text-emerald-800 italic">
                        No accepted custom quotes in this column yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {acceptedRequests.map((req) => renderRequestCard(req))}
                      </div>
                    )}
                  </div>
                )}

                {/* COLUMN 2: REJECTED & DECLINED ORDERS */}
                {(requestFilter === 'all' || requestFilter === 'rejected') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-rose-600 pb-2 bg-rose-50/50 p-3 rounded-t">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-600 inline-block" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-rose-950 font-[var(--font-display)]">
                          Rejected & Declined Custom Orders Column ({rejectedRequests.length})
                        </h3>
                      </div>
                      <span className="text-[0.68rem] font-bold text-rose-800 uppercase bg-rose-200/60 px-2.5 py-0.5 rounded border border-rose-300">
                        Declined / Rejected
                      </span>
                    </div>

                    {rejectedRequests.length === 0 ? (
                      <div className="border border-dashed border-rose-300 bg-rose-50/30 p-6 text-center text-xs text-rose-800 italic">
                        No rejected or declined requests in this column yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rejectedRequests.map((req) => renderRequestCard(req))}
                      </div>
                    )}
                  </div>
                )}

                {/* COLUMN 3: PENDING & IN REVIEW QUOTES */}
                {(requestFilter === 'all' || requestFilter === 'pending') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-amber-600 pb-2 bg-amber-50/50 p-3 rounded-t">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-600 inline-block" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-amber-950 font-[var(--font-display)]">
                          Pending Quotes & In Review Inquiries Column ({pendingRequests.length})
                        </h3>
                      </div>
                      <span className="text-[0.68rem] font-bold text-amber-800 uppercase bg-amber-200/60 px-2.5 py-0.5 rounded border border-amber-300">
                        Pending Admin Action
                      </span>
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="border border-dashed border-amber-300 bg-amber-50/30 p-6 text-center text-xs text-amber-800 italic">
                        No pending custom design requests in this column right now.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingRequests.map((req) => renderRequestCard(req))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: REGISTERED USER PROFILES & ORDER HISTORY */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Users className="text-[var(--color-primary)]" size={20} /> Registered Customer Profiles & Order History
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Inspect customer accounts, lifetime order histories, and bespoke custom design requests.
                </p>
              </div>
              
              {/* Search Bar */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[var(--color-ink-soft)]" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, phone, city..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-[var(--color-line)] bg-[var(--color-card-bg)] text-xs font-semibold focus:outline-none focus:border-[var(--color-primary)] w-72"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[0.65rem] font-bold text-[var(--color-ink-soft)] hover:text-black uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <span className="bg-[var(--color-primary)] text-white text-xs font-bold font-mono px-3 py-2 rounded shadow-sm shrink-0">
                  {mergedUsers.length} Customers
                </span>

                {mergedUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => exportUsersToCSV(mergedUsers, orders, customRequests)}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm rounded shrink-0"
                    title="Download complete registered users & customer profiles spreadsheet as CSV"
                  >
                    <Download size={13} /> Export Customers (CSV)
                  </button>
                )}
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-2">
                <Users size={32} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="font-bold uppercase text-sm">
                  {userSearchQuery ? `No Users Found Matching "${userSearchQuery}"` : 'No Registered User Profiles Yet'}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {userSearchQuery ? 'Try clearing your search query to view all users.' : 'Registered user accounts from the storefront will appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((u) => {
                  const uIdStr = u._id ? u._id.toString() : ''

                  const userOrdersList = (orders || []).filter((o) => {
                    const oUserId = (o.user?._id || o.user)?.toString()
                    return Boolean(uIdStr && oUserId && oUserId === uIdStr)
                  })

                  const successOrders = userOrdersList.filter((o) => {
                    const st = (o.status || '').toLowerCase()
                    const ps = (o.paymentStatus || '').toLowerCase()
                    return ps === 'paid' || st === 'paid & confirmed' || st === 'delivered' || st === 'shipped' || st === 'packed & sealed' || st === 'packed & dispatched' || st === 'studio processing' || st === 'handcrafting' || st === 'order confirmed'
                  })

                  const cancelledOrders = userOrdersList.filter((o) => {
                    const st = (o.status || '').toLowerCase()
                    const ps = (o.paymentStatus || '').toLowerCase()
                    return st.includes('cancel') || st.includes('refund') || st.includes('decline') || ps === 'failed' || ps === 'refunded'
                  })

                  const pendingOrders = userOrdersList.filter((o) => {
                    return !successOrders.includes(o) && !cancelledOrders.includes(o)
                  })

                  const successTotal = successOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0)
                  const pendingTotal = pendingOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0)
                  const cancelledTotal = cancelledOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0)
                  const totalSpent = successTotal

                  const userRequestsList = (customRequests || []).filter((r) => {
                    const rUserId = (r.user?._id || r.user)?.toString()
                    return Boolean(uIdStr && rUserId && rUserId === uIdStr)
                  })

                  return (
                    <div key={u._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-3">
                          <div className="w-12 h-12 rounded-full border border-[var(--color-line)] overflow-hidden bg-[var(--color-bg)] shrink-0 flex items-center justify-center">
                            {u.profileImage ? (
                              <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={24} className="text-[var(--color-primary)]" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="font-bold text-base font-[var(--font-display)] truncate">{u.name}</h3>
                            <p className="text-xs text-[var(--color-primary)] font-bold truncate">{u.email}</p>
                            {u.phone && <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">{u.phone}</p>}
                            {u.provider === 'google' || u.googleId ? (
                              <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded mt-1">
                                <CheckCircle2 size={11} /> Verified via Google OAuth
                              </span>
                            ) : u.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded mt-1">
                                <CheckCircle2 size={11} /> Verified via Email OTP
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[0.6rem] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded mt-1">
                                🟡 Pending OTP Verification
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs text-[var(--color-ink-soft)]">
                          <p className="truncate"><strong>Shipping Address:</strong> {u.address || 'Not specified'}</p>
                          <p><strong>City & PIN:</strong> {u.city ? `${u.city} - ${u.pincode}` : 'Not specified'}</p>
                          <p className="font-mono text-[0.65rem] pt-1">🕒 Registered: {formatDateTime(u.createdAt)}</p>
                        </div>

                        {/* Summary Chips Split by Status */}
                        <div className="pt-2 border-t border-[var(--color-line)] space-y-1.5 text-[0.65rem] font-bold uppercase">
                          <div className="flex flex-wrap gap-1.5 font-mono">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded" title="Successful orders">
                              ✓ Success ({successOrders.length}): {formatPrice(successTotal)}
                            </span>
                            {pendingOrders.length > 0 && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded" title="Pending orders">
                                ⏳ Pending ({pendingOrders.length}): {formatPrice(pendingTotal)}
                              </span>
                            )}
                            {cancelledOrders.length > 0 && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded" title="Cancelled orders">
                                ✕ Cancelled ({cancelledOrders.length}): {formatPrice(cancelledTotal)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedUserModal({ user: u, userOrdersList, userRequestsList, totalSpent })}
                        className="btn-primary w-full py-2.5 text-[0.68rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mt-3"
                      >
                        <Eye size={13} /> View Profile & Order History ➔
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: CUSTOMER REVIEWS & FEEDBACK MODERATION */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Star className="text-amber-500 fill-amber-400" size={20} /> Customer Reviews & Feedback Moderation
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Approve, moderate, or hide customer reviews and stories before they appear publicly on the storefront.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-[var(--color-ink-soft)]" />
                  <input
                    type="text"
                    placeholder="Search reviews by customer or creation..."
                    value={reviewSearchQuery}
                    onChange={(e) => setReviewSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-2 border border-[var(--color-line)] bg-[var(--color-card-bg)] text-xs font-semibold focus:outline-none focus:border-[var(--color-primary)] w-64"
                  />
                  {reviewSearchQuery && (
                    <button
                      onClick={() => setReviewSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[0.65rem] font-bold text-[var(--color-ink-soft)] hover:text-black uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-[var(--color-card-bg)] p-1 border border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                      reviewFilter === 'all'
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    All ({reviews.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('displayed')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                      reviewFilter === 'displayed'
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    🟢 Displayed ({reviews.filter((r) => r.isDisplayed).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('hidden')}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                      reviewFilter === 'hidden'
                        ? 'bg-stone-700 text-white'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    ⚪ Hidden ({reviews.filter((r) => !r.isDisplayed).length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => exportReviewsToCSV(filteredReviews)}
                  className="btn-outline px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                >
                  <Download size={13} /> Export Reviews CSV
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4">
                <span className="eyebrow text-[0.65rem] block mb-1">Total Submissions</span>
                <p className="text-xl font-bold font-[var(--font-display)]">{reviews.length} Reviews</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4">
                <span className="eyebrow text-[0.65rem] block mb-1">Average Star Rating</span>
                <p className="text-xl font-bold font-[var(--font-display)] text-amber-600 flex items-center gap-1">
                  ⭐ {reviews.length ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : '5.0'} / 5.0
                </p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4">
                <span className="eyebrow text-[0.65rem] block mb-1">Live on Storefront</span>
                <p className="text-xl font-bold font-[var(--font-display)] text-emerald-800">
                  {reviews.filter((r) => r.isDisplayed).length} Visible
                </p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4">
                <span className="eyebrow text-[0.65rem] block mb-1">Pending / Hidden</span>
                <p className="text-xl font-bold font-[var(--font-display)] text-stone-600">
                  {reviews.filter((r) => !r.isDisplayed).length} Hidden
                </p>
              </div>
            </div>

            {/* Reviews Cards List */}
            {filteredReviews.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-2">
                <Star size={32} className="mx-auto text-amber-500" />
                <p className="font-bold uppercase text-sm">No Customer Reviews Found</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Customer feedback and ratings submitted via the storefront will appear here for your moderation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReviews.map((r) => (
                  <div
                    key={r._id}
                    className={`border p-5 space-y-4 shadow-sm flex flex-col justify-between transition-all ${
                      r.isDisplayed
                        ? 'border-emerald-400 bg-white ring-1 ring-emerald-200'
                        : 'border-[var(--color-line)] bg-[var(--color-card-bg)]/80 opacity-90'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header: Customer info & Status */}
                      <div className="flex items-start justify-between gap-2 border-b border-[var(--color-line)] pb-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-base font-[var(--font-display)]">{r.name}</h3>
                            {r.isVerifiedBuyer !== false && (
                              <span className="text-[0.58rem] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-bold">
                                Verified
                              </span>
                            )}
                          </div>
                          {r.email && <p className="text-xs text-[var(--color-primary)] font-semibold">{r.email}</p>}
                          <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono font-semibold pt-0.5">
                            🕒 {formatDateTime(r.createdAt)}
                          </p>
                        </div>

                        {/* Star Rating */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex gap-0.5 text-amber-500">
                            {Array.from({ length: r.rating || 5 }).map((_, si) => (
                              <Star key={si} size={13} fill="currentColor" strokeWidth={0} />
                            ))}
                          </div>
                          <span className="text-[0.62rem] font-bold font-mono text-amber-800">
                            {r.rating}/5 Stars
                          </span>
                        </div>
                      </div>

                      {/* Product Tag */}
                      {r.productTitle && (
                        <div>
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider bg-[var(--color-bg)] border border-[var(--color-line)] px-2 py-0.5 text-[var(--color-ink)] inline-block">
                            🌸 {r.productTitle}
                          </span>
                        </div>
                      )}

                      {/* Review Title & Comment */}
                      <div className="space-y-1">
                        {r.title && <p className="font-bold text-xs text-[var(--color-ink)]">"{r.title}"</p>}
                        <div className="p-3 bg-[var(--color-bg)]/60 border border-[var(--color-line)] text-xs text-[var(--color-ink)] leading-relaxed italic">
                          "{r.comment}"
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                          r.isDisplayed
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}>
                          {r.isDisplayed ? '🟢 Live on Storefront' : '⚪ Hidden from Public'}
                        </span>
                      </div>
                    </div>

                    {/* Moderation Actions */}
                    <div className="pt-3 border-t border-[var(--color-line)] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleReviewDisplay(r._id, !r.isDisplayed)}
                        className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                          r.isDisplayed
                            ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'border-emerald-600 bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm'
                        }`}
                      >
                        {r.isDisplayed ? (
                          <>
                            <EyeOff size={13} /> Hide from Storefront
                          </>
                        ) : (
                          <>
                            <Eye size={13} /> Display on Storefront
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteReview(r._id)}
                        className="px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider border border-rose-300 text-rose-700 hover:bg-rose-50 flex items-center gap-1 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-ink)]">
                Payment Tracking & Auditing
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1">
                Monitor captured Razorpay payments, identify discrepancies, and manually reconcile orphan logs.
              </p>
            </div>

            {/* Metrics Analytics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Total Revenue</span>
                <p className="text-lg font-bold font-mono text-emerald-800">{formatPrice(paymentMetrics.totalRevenue)}</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Total Logs</span>
                <p className="text-lg font-bold font-mono">{paymentMetrics.totalPayments}</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Captured</span>
                <p className="text-lg font-bold font-mono text-emerald-700">{paymentMetrics.capturedPayments}</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Pending</span>
                <p className="text-lg font-bold font-mono text-stone-600">{paymentMetrics.pendingPayments}</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Failed</span>
                <p className="text-lg font-bold font-mono text-rose-600">{paymentMetrics.failedPayments}</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Refunded</span>
                <p className="text-lg font-bold font-mono text-amber-600">{paymentMetrics.refundedPayments}</p>
              </div>
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 rounded-2xl shadow-xs">
                <span className="eyebrow text-[0.62rem] block mb-1">Reconciled</span>
                <p className="text-lg font-bold font-mono text-indigo-700">{paymentMetrics.reconciledPayments}</p>
              </div>
              <div className="border border-rose-200 bg-rose-50/50 p-4 rounded-2xl shadow-xs ring-1 ring-rose-100">
                <span className="eyebrow text-[0.62rem] block mb-1 text-rose-900 font-bold">Needs Attention</span>
                <p className="text-lg font-bold font-mono text-rose-800">{paymentMetrics.attentionRequiredPayments}</p>
              </div>
            </div>

            {/* Mismatch & Mismatched captured payments panel */}
            {payments.filter(p => p.reconciliationStatus === 'attention_required').length > 0 && (
              <div className="border border-rose-300 bg-rose-50/70 p-5 rounded-2xl space-y-3">
                <h3 className="font-bold text-rose-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  ⚠️ Action Required: Payments Requiring Attention ({payments.filter(p => p.reconciliationStatus === 'attention_required').length})
                </h3>
                <div className="space-y-3">
                  {payments.filter(p => p.reconciliationStatus === 'attention_required').map((p) => {
                    const hasOrderDoc = Boolean(p.orderDoc)
                    const isMismatched = hasOrderDoc && p.orderDoc.paymentStatus !== 'Paid'
                    return (
                      <div key={p._id} className="bg-white border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded uppercase font-mono text-[0.62rem]">
                              {!hasOrderDoc ? 'Orphan Payment' : 'Payment Status Mismatch'}
                            </span>
                            <span className="font-semibold text-stone-700 font-mono">Payment ID: {p.razorpayPaymentId || 'N/A'}</span>
                            <span className="font-semibold text-stone-700 font-mono">Order ID: {p.razorpayOrderId}</span>
                          </div>
                          <p className="text-stone-600">
                            {isMismatched ? (
                              <>
                                Captured payment of <strong>₹{p.amount}</strong> exists, but Order <strong>{p.orderNumber}</strong> has paymentStatus = <strong>"{p.orderDoc.paymentStatus}"</strong> (Fulfillment Status: {p.orderDoc.status}).
                              </>
                            ) : (
                              <>
                                Captured payment of <strong>₹{p.amount}</strong> exists, but no internal Order matches Razorpay Order ID <strong>"{p.razorpayOrderId}"</strong>.
                              </>
                            )}
                          </p>
                        </div>
                        {hasOrderDoc && (
                          <button
                            onClick={() => handleReconcile(p)}
                            disabled={isReconciling}
                            className="btn-primary py-2 px-4 rounded-full text-[0.68rem] bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold uppercase tracking-wider whitespace-nowrap"
                          >
                            {isReconciling ? 'Reconciling...' : 'Reconcile Order'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Filter and Search Panel */}
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[var(--color-ink-soft)] pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search Order, Payment, Customer Email..."
                    value={paymentSearch}
                    onChange={(e) => {
                      setPaymentSearch(e.target.value)
                      setPaymentPagination(prev => ({ ...prev, page: 1 }))
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-[var(--color-line)] rounded-xl text-xs bg-white text-[var(--color-ink)]"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value)
                    setPaymentPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="px-3.5 py-2 border border-[var(--color-line)] rounded-xl text-xs bg-white text-stone-750"
                >
                  <option value="all">All Transactions</option>
                  <option value="captured">Captured / Success</option>
                  <option value="pending">Pending Only</option>
                  <option value="failed">Failed Only</option>
                  <option value="refunded">Refunded Only</option>
                  <option value="reconciled">Reconciled Only</option>
                  <option value="attention_required">Attention Required</option>
                </select>

                {/* Date Filter */}
                <select
                  value={paymentDateRange}
                  onChange={(e) => {
                    setPaymentDateRange(e.target.value)
                    setPaymentPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="px-3.5 py-2 border border-[var(--color-line)] rounded-xl text-xs bg-white text-stone-750"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>

                {/* Custom Date Range Picker Inputs */}
                {paymentDateRange === 'custom' && (
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <input
                      type="date"
                      value={paymentDateFrom}
                      onChange={(e) => {
                        setPaymentDateFrom(e.target.value)
                        setPaymentPagination(prev => ({ ...prev, page: 1 }))
                      }}
                      className="px-2 py-1.5 border border-[var(--color-line)] rounded bg-white text-stone-750"
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={paymentDateTo}
                      onChange={(e) => {
                        setPaymentDateTo(e.target.value)
                        setPaymentPagination(prev => ({ ...prev, page: 1 }))
                      }}
                      className="px-2 py-1.5 border border-[var(--color-line)] rounded bg-white text-stone-750"
                    />
                  </div>
                )}
              </div>

              {/* Refresh button */}
              <button
                onClick={() => fetchPaymentsData()}
                className="btn-outline px-4 py-2 rounded-xl text-xs flex items-center gap-2 border-[var(--color-line)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                <RefreshCw size={13} className={paymentsLoading ? 'animate-spin' : ''} />
                Refresh Data
              </button>
            </div>

            {/* Payments Table */}
            {paymentsLoading ? (
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-2xl p-12 text-center">
                <RefreshCw size={24} className="mx-auto animate-spin text-[var(--color-primary)]" />
                <p className="text-xs text-[var(--color-ink-soft)] mt-2 font-semibold">Loading payment transactions...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-2xl p-12 text-center space-y-2">
                <CreditCard size={32} className="mx-auto text-[var(--color-primary)] opacity-50" />
                <p className="font-bold uppercase text-xs">No Payments Found</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Adjust your search queries or active filters to view records.
                </p>
              </div>
            ) : (
              <div className="border border-[var(--color-line)] bg-white rounded-2xl overflow-hidden shadow-xs">
                {/* Upper Horizontal Scrollbar */}
                {tableScrollWidth > 0 && (
                  <div
                    ref={topScrollRef}
                    onScroll={handleTopScroll}
                    className="overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-bg)] scrollbar-thin"
                    style={{ height: '14px' }}
                  >
                    <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
                  </div>
                )}
                <div ref={bottomScrollRef} onScroll={handleBottomScroll} className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                      <tr className="font-bold text-stone-700">
                        <th className="p-4 bg-[var(--color-bg)]">Payment ID</th>
                        <th className="p-4 bg-[var(--color-bg)]">Razorpay Order ID</th>
                        <th className="p-4 bg-[var(--color-bg)]">Order Number</th>
                        <th className="p-4 bg-[var(--color-bg)]">Customer</th>
                        <th className="p-4 text-right bg-[var(--color-bg)]">Amount</th>
                        <th className="p-4 bg-[var(--color-bg)]">Status</th>
                        <th className="p-4 bg-[var(--color-bg)]">Order Status</th>
                        <th className="p-4 bg-[var(--color-bg)]">Reconciliation</th>
                        <th className="p-4 bg-[var(--color-bg)]">Created At</th>
                        <th className="p-4 text-center bg-[var(--color-bg)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {payments.map((p) => {
                        const recStatus = p.reconciliationStatus || 'pending'
                        return (
                          <tr key={p._id} className="hover:bg-stone-50 transition-colors">
                            <td className="p-4 font-mono font-semibold">{p.razorpayPaymentId || 'N/A'}</td>
                            <td className="p-4 font-mono text-[0.68rem] text-stone-600">{p.razorpayOrderId}</td>
                            <td className="p-4 font-mono">
                              {p.orderDoc ? (
                                <button
                                  onClick={() => setSelectedUserOrderDetail({ ...p.orderDoc, mongoId: p.orderDoc._id })}
                                  className="text-[var(--color-primary)] font-bold hover:underline"
                                >
                                  {p.orderNumber}
                                </button>
                              ) : (
                                <span className="text-rose-600 italic">Orphan Payment</span>
                              )}
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-stone-900">{p.userDoc?.name || 'Guest Checkout'}</p>
                              {p.userDoc?.email && <p className="text-[0.68rem] text-[var(--color-primary)] font-semibold">{p.userDoc.email}</p>}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-stone-900">₹{p.amount}</td>
                            <td className="p-4 uppercase">
                              <span className={`px-2 py-0.5 rounded text-[0.62rem] font-bold border ${
                                p.status === 'captured'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : p.status === 'refunded'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-stone-100 text-stone-700 border-stone-300'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {p.orderDoc ? (
                                <span className="font-semibold text-stone-700">{p.orderDoc.status}</span>
                              ) : (
                                <span className="text-rose-500 italic">None</span>
                              )}
                            </td>
                            <td className="p-4 font-semibold">
                              {recStatus === 'normal' && <span className="text-emerald-700">🟢 Normal</span>}
                              {recStatus === 'reconciled' && <span className="text-indigo-700">🟡 Reconciled</span>}
                              {recStatus === 'attention_required' && <span className="text-rose-700">🔴 Attention Required</span>}
                              {recStatus === 'pending' && <span className="text-stone-500">⚪ Pending</span>}
                              {recStatus === 'failed' && <span className="text-rose-600">Failed</span>}
                              {recStatus === 'refunded' && <span className="text-amber-700">Refunded</span>}
                            </td>
                            <td className="p-4 text-[0.68rem] text-stone-600 font-mono whitespace-nowrap">{formatDateTime(p.createdAt)}</td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedPaymentDetail(p)}
                                  className="btn-outline px-3 py-1.5 rounded-lg text-[0.68rem] font-bold uppercase tracking-wider"
                                >
                                  Details
                                </button>
                                {recStatus === 'attention_required' && p.orderDoc && (
                                  <button
                                    onClick={() => handleReconcile(p)}
                                    disabled={isReconciling}
                                    className="px-3 py-1.5 rounded-lg text-[0.68rem] bg-rose-700 text-white font-bold uppercase tracking-wider hover:bg-rose-800 transition-colors disabled:opacity-50"
                                  >
                                    Reconcile
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {paymentPagination.totalPages > 1 && (
                  <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-bg)] flex justify-between items-center text-xs">
                    <span className="font-mono text-stone-600">
                      Showing page {paymentPagination.page} of {paymentPagination.totalPages} ({paymentPagination.totalCount} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={paymentPagination.page <= 1}
                        onClick={() => setPaymentPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="btn-outline px-3 py-1 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        disabled={paymentPagination.page >= paymentPagination.totalPages}
                        onClick={() => setPaymentPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="btn-outline px-3 py-1 rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FULL PHOTO LIGHTBOX MODAL */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden border border-white/20">
            <img
              src={previewImageModal}
              alt="High Res Reference Photo"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <p className="text-white text-xs font-mono text-center py-2 bg-black/80">
              Reference Photo (Click anywhere to close)
            </p>
          </div>
        </div>
      )}

      {/* PAYMENT DETAILS DRAWERS/MODAL */}
      {selectedPaymentDetail && (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] max-w-2xl w-full p-6 space-y-6 shadow-2xl relative rounded-3xl text-[var(--color-ink)]">
            {/* Header */}
            <div className="border-b border-[var(--color-line)] pb-4 flex justify-between items-start">
              <div>
                <span className="eyebrow block mb-1 text-[var(--color-primary)] font-bold">Transaction Record</span>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-ink)]">
                  Payment Detail
                </h2>
              </div>
              <button
                onClick={() => setSelectedPaymentDetail(null)}
                className="p-2 hover:bg-black/10 text-[var(--color-ink-soft)] font-bold uppercase text-xs cursor-pointer rounded-full"
              >
                ✕ Close
              </button>
            </div>

            {/* Info list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Payment ID</span>
                <p className="font-mono text-stone-800">{selectedPaymentDetail.razorpayPaymentId || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Razorpay Order ID</span>
                <p className="font-mono text-stone-800">{selectedPaymentDetail.razorpayOrderId}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Order Number</span>
                <p className="font-mono text-stone-800">{selectedPaymentDetail.orderNumber || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Customer</span>
                <p className="text-stone-800">
                  {selectedPaymentDetail.userDoc?.name || 'Guest Checkout'}
                  {selectedPaymentDetail.userDoc?.email && ` (${selectedPaymentDetail.userDoc.email})`}
                </p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Amount / Currency</span>
                <p className="text-stone-800 font-bold">₹{selectedPaymentDetail.amount} {selectedPaymentDetail.currency || 'INR'}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Payment Status</span>
                <p className="text-stone-800 uppercase">{selectedPaymentDetail.status}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Order Status</span>
                <p className="text-stone-800">{selectedPaymentDetail.orderDoc?.status || 'No Order Connected'}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Method</span>
                <p className="text-stone-800">{selectedPaymentDetail.paymentMethod || 'Razorpay Prepaid'}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Created At</span>
                <p className="text-stone-800 font-mono">{formatDateTime(selectedPaymentDetail.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-[0.62rem] text-stone-500 block">Processed At</span>
                <p className="text-stone-800 font-mono">
                  {selectedPaymentDetail.processedAt ? formatDateTime(selectedPaymentDetail.processedAt) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Reconciliation Warning Banner */}
            {selectedPaymentDetail.reconciliationStatus === 'attention_required' && (
              <div className="border border-rose-300 bg-rose-50/50 p-4 rounded-xl space-y-2">
                <p className="text-xs text-rose-900 font-bold flex items-center gap-1.5">
                  ⚠️ Payment captured but order is not marked Paid
                </p>
                <div className="text-[0.68rem] text-rose-800 space-y-1 font-mono">
                  <p>Razorpay Payment ID: {selectedPaymentDetail.razorpayPaymentId || 'N/A'}</p>
                  <p>Razorpay Order ID: {selectedPaymentDetail.razorpayOrderId}</p>
                  <p>Order Number: {selectedPaymentDetail.orderNumber || 'N/A'}</p>
                  <p>Amount: ₹{selectedPaymentDetail.amount}</p>
                  <p>Current Order Status: {selectedPaymentDetail.orderDoc?.status || 'Orphan Payment'}</p>
                </div>
                {selectedPaymentDetail.orderDoc && (
                  <button
                    onClick={() => handleReconcile(selectedPaymentDetail)}
                    disabled={isReconciling}
                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold uppercase text-[0.68rem] tracking-wider"
                  >
                    {isReconciling ? 'Reconciling...' : 'Reconcile Payment'}
                  </button>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase text-stone-700 tracking-wider">
                Transaction Timeline
              </h3>
              <div className="relative border-l-2 border-stone-200 pl-4 space-y-4 text-xs font-semibold">
                <div className="relative">
                  <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white" />
                  <p className="text-stone-800">Payment Created</p>
                  <p className="text-[0.68rem] text-stone-500 font-mono mt-0.5">{formatDateTime(selectedPaymentDetail.createdAt)}</p>
                </div>

                {selectedPaymentDetail.status === 'captured' && (
                  <div className="relative">
                    <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white" />
                    <p className="text-stone-800">Razorpay Payment Captured</p>
                    <p className="text-[0.68rem] text-stone-500 font-mono mt-0.5">
                      {selectedPaymentDetail.processedAt ? formatDateTime(selectedPaymentDetail.processedAt) : 'Webhook Confirmed'}
                    </p>
                  </div>
                )}

                {selectedPaymentDetail.orderDoc && selectedPaymentDetail.orderDoc.paymentStatus === 'Paid' && (
                  <>
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white" />
                      <p className="text-stone-800">Webhook Received & Verified</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white" />
                      <p className="text-stone-800">Order Marked Paid</p>
                    </div>

                    {selectedPaymentDetail.orderDoc.status !== 'Pending Payment' && (
                      <div className="relative">
                        <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-emerald-600 rounded-full border-2 border-white" />
                        <p className="text-stone-800">Order Confirmed & Stock Adjusted</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE & ORDER HISTORY MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
            {/* Modal Header (Fixed/Sticky at top of modal scroll) */}
            <div className="sticky -top-6 -mx-6 -mt-6 p-6 bg-[var(--color-card-bg)] border-b border-[var(--color-line)] z-20 flex justify-between items-start backdrop-blur-md shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-[var(--color-primary)] overflow-hidden bg-[var(--color-bg)] flex items-center justify-center shrink-0">
                  {selectedUserModal.user.profileImage ? (
                    <img src={selectedUserModal.user.profileImage} alt={selectedUserModal.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-[var(--color-primary)]" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-[var(--font-display)]">{selectedUserModal.user.name}</h2>
                  <p className="text-xs text-[var(--color-primary)] font-bold">{selectedUserModal.user.email}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] font-mono">{selectedUserModal.user.phone || 'No phone recorded'}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserModal(null)}
                className="p-2 hover:bg-black/10 text-[var(--color-ink-soft)] font-bold uppercase text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {(() => {
              const ordersList = selectedUserModal.userOrdersList || []

              const successOrders = ordersList.filter((o) => {
                const st = (o.status || '').toLowerCase()
                const ps = (o.paymentStatus || '').toLowerCase()
                return ps === 'paid' || st === 'paid & confirmed' || st === 'delivered' || st === 'shipped' || st === 'packed & sealed' || st === 'packed & dispatched' || st === 'studio processing' || st === 'handcrafting' || st === 'order confirmed'
              })

              const cancelledOrders = ordersList.filter((o) => {
                const st = (o.status || '').toLowerCase()
                const ps = (o.paymentStatus || '').toLowerCase()
                return st.includes('cancel') || st.includes('refund') || st.includes('decline') || ps === 'failed' || ps === 'refunded'
              })

              const pendingOrders = ordersList.filter((o) => {
                return !successOrders.includes(o) && !cancelledOrders.includes(o)
              })

              const successTotal = successOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0)
              const pendingTotal = pendingOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0)
              const cancelledTotal = cancelledOrders.reduce((sum, o) => sum + (Number(o.grandTotal || o.total) || 0), 0)

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-[var(--color-bg)] p-4 border border-[var(--color-line)] items-start">
                  <div>
                    <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-ink-soft)]">Shipping Address</span>
                    <p className="font-bold text-xs mt-1">{selectedUserModal.user.address || 'Not specified'}</p>
                    <p className="text-[var(--color-ink-soft)]">{selectedUserModal.user.city ? `${selectedUserModal.user.city} - ${selectedUserModal.user.pincode}` : ''}</p>
                  </div>

                  <div>
                    <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-ink-soft)]">Account Registration</span>
                    <p className="font-bold font-mono text-xs mt-1">
                      {new Date(selectedUserModal.user.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {selectedUserModal.user.provider === 'google' || selectedUserModal.user.googleId ? (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[0.62rem] font-bold uppercase rounded border border-emerald-300">
                        Verified via Google OAuth
                      </span>
                    ) : selectedUserModal.user.isVerified ? (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[0.62rem] font-bold uppercase rounded border border-blue-300">
                        Verified via Email OTP
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[0.62rem] font-bold uppercase rounded border border-amber-300">
                        Pending OTP Verification
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-ink-soft)] uppercase tracking-wider block">Lifetime Value</span>
                    <p className="text-xl font-bold font-mono text-emerald-800 mt-0.5">{formatPrice(successTotal)}</p>
                    <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">{ordersList.length} Total Orders Placed</p>

                    <div className="mt-3 space-y-1.5 font-mono text-[0.68rem] border-t border-[var(--color-line)] pt-2">
                      <div className="flex justify-between items-center bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Success ({successOrders.length})
                        </span>
                        <span className="font-bold text-emerald-900 font-mono">{formatPrice(successTotal)}</span>
                      </div>

                      <div className="flex justify-between items-center bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending ({pendingOrders.length})
                        </span>
                        <span className="font-bold text-amber-900 font-mono">{formatPrice(pendingTotal)}</span>
                      </div>

                      <div className="flex justify-between items-center bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                        <span className="font-bold text-rose-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-600"></span> Cancelled ({cancelledOrders.length})
                        </span>
                        <span className="font-bold text-rose-900 font-mono">{formatPrice(cancelledTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ORDER HISTORY SECTION */}
            <div className="space-y-4">
              <h3 className="font-bold text-base font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-2 flex items-center justify-between">
                <span>Customer Order History ({selectedUserModal.userOrdersList.length})</span>
              </h3>

              {selectedUserModal.userOrdersList.length === 0 ? (
                <div className="border border-dashed border-[var(--color-line)] p-6 text-center text-xs text-[var(--color-ink-soft)] font-mono">
                  No orders placed by this user yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedUserModal.userOrdersList.map((o) => (
                    <div key={o._id || o.id} className="border border-[var(--color-line)] bg-white p-4 space-y-3 shadow-sm hover:border-[var(--color-primary)] transition-all">
                      <div className="flex flex-wrap justify-between items-start border-b border-[var(--color-line)] pb-2.5 gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{o.orderNumber || o.id || o._id}</p>
                            <span className="text-[0.62rem] font-bold uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 border border-stone-300 rounded font-mono">
                              {o.paymentMethod || 'Razorpay Prepaid'}
                            </span>
                          </div>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono mt-0.5 flex items-center gap-1">
                            <Calendar size={11} /> {formatDateTime(o.createdAt || Date.now())}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold uppercase px-2.5 py-1 text-[0.62rem] rounded bg-[#212B1C] text-[#F5E8D0] border border-black shadow-xs">
                            {o.status || o.orderStatus || 'Confirmed'}
                          </span>
                          <span className="font-mono font-bold uppercase px-2.5 py-1 text-[0.62rem] rounded bg-emerald-800 text-white border border-emerald-950 shadow-xs">
                            {o.paymentStatus || 'Paid'}
                          </span>
                        </div>
                      </div>

                      {/* Financial Preview Chips: Shipping Fee & Coupon Used */}
                      <div className="flex flex-wrap gap-2 text-[0.65rem] font-mono">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-800 border border-stone-200 rounded">
                          🚚 Shipping: <strong>{Number(o.shippingCharge || 0) > 0 ? formatPrice(o.shippingCharge) : '₹0 (Free)'}</strong>
                        </span>
                        {o.couponCode ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded font-bold">
                            🏷️ Coupon: {o.couponCode} (-{formatPrice(o.discountAmount || 0)})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-stone-50 text-stone-500 border border-stone-200 rounded italic">
                            🏷️ No Coupon
                          </span>
                        )}
                        {o.shippingAddress?.city && (
                          <span className="px-2 py-0.5 bg-sky-50 text-sky-900 border border-sky-200 rounded">
                            📍 {o.shippingAddress.city} {o.shippingAddress?.pincode ? `(${o.shippingAddress.pincode})` : ''}
                          </span>
                        )}
                        {o.termsAccepted ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded font-bold">
                            ✓ Handmade Terms v{o.termsVersion || '1.0'} Accepted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-600 border border-stone-200 rounded">
                            Handmade Terms: Legacy / None
                          </span>
                        )}
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-2 pt-1">
                        {o.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs border-b border-dashed border-stone-200 pb-2">
                            {item.image ? (
                              <img src={item.image} alt={item.title} className="w-10 h-10 object-cover border border-[var(--color-line)] rounded shrink-0 bg-stone-50" />
                            ) : (
                              <div className="w-10 h-10 rounded border border-[var(--color-line)] bg-stone-100 flex items-center justify-center text-sm shrink-0">🌸</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{item.title}</p>
                              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">Qty: {item.qty} × {formatPrice(item.price)}</p>
                            </div>
                            <span className="font-bold font-mono text-xs">{formatPrice((item.price || 0) * (item.qty || 1))}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between items-center pt-2 gap-2 text-xs border-t border-[var(--color-line)]">
                        <span className="font-bold text-sm font-mono text-emerald-900">Grand Total: {formatPrice(o.grandTotal || o.total || 0)}</span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUserOrderDetail(o)}
                            className="btn-primary py-1.5 px-3 text-[0.68rem] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                            title="Inspect complete order details, shipping fee, coupon, and tracking"
                          >
                            <Eye size={12} /> Inspect Full Order Details ➔
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(`${API_URL}/orders/${o.mongoId || o._id}/invoice`, '_blank')}
                            className="btn-outline py-1.5 px-2.5 text-[0.65rem] font-bold uppercase tracking-wider flex items-center gap-1 text-[var(--color-ink-soft)]"
                            title="Download Tax Invoice PDF"
                          >
                            <Download size={12} /> Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CUSTOM DESIGN REQUESTS SECTION */}
            {selectedUserModal.userRequestsList.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-base font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-2">
                  Bespoke Custom Requests ({selectedUserModal.userRequestsList.length})
                </h3>
                <div className="space-y-3">
                  {selectedUserModal.userRequestsList.map((req) => (
                    <div key={req._id} className="border border-[var(--color-line)] bg-amber-50/50 p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold font-[var(--font-display)] text-sm">{req.stylePreference || 'Custom Botanical Artwork'}</span>
                        <span className="font-mono text-[0.65rem] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                          {req.status}
                        </span>
                      </div>
                      {req.notes && <p className="italic text-[var(--color-ink-soft)]">"{req.notes}"</p>}
                      {req.quotedPrice > 0 && (
                        <p className="font-bold text-emerald-800 font-mono">Quoted Price: {formatPrice(req.quotedPrice)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL CUSTOMER ORDER DETAILS DEEP-DIVE MODAL (IN USERS TAB) */}
      {selectedUserOrderDetail && (
        <div 
          className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 md:p-6 overflow-y-auto backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDraggingOrderModal) {
              setSelectedUserOrderDetail(null)
            }
          }}
        >
          <div 
            style={{
              transform: `translate(${orderModalPos.x}px, ${orderModalPos.y}px)`,
              transition: isDraggingOrderModal ? 'none' : 'transform 0.05s ease-out',
            }}
            className="border-2 border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 md:p-8 max-w-3xl w-full space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative"
          >
            
            {/* Draggable & Sticky/Fixed Modal Header */}
            <div 
              onMouseDown={handleStartDragOrderModal}
              title="Click and drag to reposition window"
              className="sticky -top-6 md:-top-8 -mx-6 md:-mx-8 -mt-6 md:-mt-8 p-6 md:p-8 z-30 flex flex-wrap justify-between items-start border-b border-[var(--color-line)] gap-3 cursor-grab active:cursor-grabbing select-none bg-[var(--color-card-bg)] rounded-t shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="text-[var(--color-ink-soft)] hover:text-black shrink-0" title="Drag Handle">
                  <GripVertical size={20} />
                </div>
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Package size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold font-mono text-[var(--color-primary)]">
                      {selectedUserOrderDetail.orderNumber || selectedUserOrderDetail.id || selectedUserOrderDetail._id}
                    </h2>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(selectedUserOrderDetail.orderNumber || selectedUserOrderDetail._id)
                        setCopiedOrderId(true)
                        setTimeout(() => setCopiedOrderId(false), 2000)
                      }}
                      className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 border border-[var(--color-line)] bg-white hover:bg-stone-50 flex items-center gap-1 text-[var(--color-ink-soft)] cursor-pointer"
                      title="Copy Order Reference"
                    >
                      <Copy size={11} /> {copiedOrderId ? 'Copied!' : 'Copy'}
                    </button>
                    <span className="text-[0.62rem] text-stone-500 font-mono italic">
                      (⋮⋮ Drag to move)
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 flex items-center gap-1.5 font-mono">
                    <Calendar size={12} /> Placed on: <strong>{formatDateTime(selectedUserOrderDetail.createdAt || Date.now())}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                <span className="font-mono font-bold uppercase px-3 py-1 text-xs rounded bg-[#212B1C] text-[#F5E8D0] border border-black shadow-sm">
                  {selectedUserOrderDetail.status || selectedUserOrderDetail.orderStatus || 'Confirmed'}
                </span>
                <span className="font-mono font-bold uppercase px-3 py-1 text-xs rounded bg-emerald-800 text-white border border-emerald-950 shadow-sm">
                  {selectedUserOrderDetail.paymentStatus || 'Paid'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUserOrderDetail(null)}
                  className="p-1.5 hover:bg-black/10 text-[var(--color-ink-soft)] font-bold text-sm ml-2 cursor-pointer"
                  title="Close and return to customer profile"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Financial & Payment Breakdown Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[var(--color-bg)] p-4 border border-[var(--color-line)] space-y-2.5 rounded">
                <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-primary)] uppercase flex items-center gap-1">
                  <Receipt size={13} /> Complete Financial Breakdown
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-soft)]">Items Subtotal:</span>
                    <span className="font-bold">{formatPrice(selectedUserOrderDetail.subtotal || selectedUserOrderDetail.total || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-soft)]">Coupon Used:</span>
                    <span className="font-bold">
                      {selectedUserOrderDetail.couponCode ? (
                        <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold border border-emerald-300">
                          {selectedUserOrderDetail.couponCode}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">No coupon applied</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-soft)]">Discount Deducted:</span>
                    <span className="font-bold text-emerald-800">
                      {selectedUserOrderDetail.discountAmount > 0 ? `-${formatPrice(selectedUserOrderDetail.discountAmount)}` : '₹0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-soft)]">Shipping Fee:</span>
                    <span className="font-bold text-[var(--color-primary)]">
                      {Number(selectedUserOrderDetail.shippingCharge || 0) > 0 ? (
                        formatPrice(selectedUserOrderDetail.shippingCharge)
                      ) : (
                        <span className="text-emerald-800 font-bold">₹0 (Free Shipping)</span>
                      )}
                    </span>
                  </div>
                  {selectedUserOrderDetail.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-ink-soft)]">Taxes &amp; GST:</span>
                      <span className="font-bold">{formatPrice(selectedUserOrderDetail.tax)}</span>
                    </div>
                  )}
                  <div className="border-t border-[var(--color-line)] pt-2 mt-2 flex justify-between items-center text-sm">
                    <span className="font-bold uppercase text-[var(--color-ink)]">Grand Total Paid:</span>
                    <span className="font-bold text-base text-emerald-900">{formatPrice(selectedUserOrderDetail.grandTotal || selectedUserOrderDetail.total || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Gateway & Transaction Metadata */}
              <div className="bg-[var(--color-bg)] p-4 border border-[var(--color-line)] space-y-2.5 rounded">
                <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-primary)] uppercase flex items-center gap-1">
                  <CreditCard size={13} /> Payment &amp; Gateway Metadata
                </span>
                <div className="space-y-1.5 font-mono text-[0.7rem] text-[var(--color-ink-soft)]">
                  <div>
                    <span className="block text-[0.62rem] uppercase font-bold text-[var(--color-ink)]">Payment Method:</span>
                    <span className="font-bold text-[var(--color-primary)]">{selectedUserOrderDetail.paymentMethod || 'Razorpay Prepaid'}</span>
                  </div>
                  <div>
                    <span className="block text-[0.62rem] uppercase font-bold text-[var(--color-ink)]">Razorpay Payment ID:</span>
                    <span className="font-mono select-all text-stone-800 font-bold">{selectedUserOrderDetail.razorpayPaymentId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[0.62rem] uppercase font-bold text-[var(--color-ink)]">Razorpay Order ID:</span>
                    <span className="font-mono select-all text-stone-800 font-bold">{selectedUserOrderDetail.razorpayOrderId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[0.62rem] uppercase font-bold text-[var(--color-ink)]">MongoDB Document ID:</span>
                    <span className="font-mono text-[0.65rem] text-stone-500">{selectedUserOrderDetail._id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address Box */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded text-xs space-y-1.5">
              <span className="eyebrow text-[0.65rem] font-bold text-emerald-900 uppercase flex items-center gap-1">
                <MapPin size={13} /> Delivery &amp; Shipping Address
              </span>
              <p className="font-bold text-sm text-emerald-950">
                {selectedUserOrderDetail.shippingAddress?.name || selectedUserModal?.user?.name}
              </p>
              <p className="text-[var(--color-ink)]">
                {selectedUserOrderDetail.shippingAddress?.line1 || selectedUserOrderDetail.shippingAddress?.address || 'Bespoke Studio Address'}
                {selectedUserOrderDetail.shippingAddress?.city ? `, ${selectedUserOrderDetail.shippingAddress.city}` : ''}
                {selectedUserOrderDetail.shippingAddress?.state ? `, ${selectedUserOrderDetail.shippingAddress.state}` : ''}
                {selectedUserOrderDetail.shippingAddress?.pincode ? ` - ${selectedUserOrderDetail.shippingAddress.pincode}` : ''}
              </p>
              <div className="flex flex-wrap gap-4 pt-1 text-[0.7rem] text-[var(--color-ink-soft)] font-mono">
                <span>📞 <strong>Phone:</strong> {selectedUserOrderDetail.shippingAddress?.phone || selectedUserModal?.user?.phone || 'N/A'}</span>
                <span>✉️ <strong>Email:</strong> {selectedUserOrderDetail.shippingAddress?.email || selectedUserOrderDetail.email || selectedUserModal?.user?.email}</span>
              </div>
            </div>

            {/* Ordered Artwork Items */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-2 flex items-center justify-between">
                <span>Ordered Artworks ({selectedUserOrderDetail.items?.length || 0})</span>
              </h3>
              <div className="border border-[var(--color-line)] bg-white overflow-hidden rounded">
                <table className="w-full text-xs">
                  <thead className="bg-[#3E4F36] text-white uppercase text-[0.68rem] tracking-wider">
                    <tr>
                      <th className="p-3 text-left">Artwork Creation</th>
                      <th className="p-3 text-center">Unit Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {selectedUserOrderDetail.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-12 h-12 object-cover border border-[var(--color-line)] rounded shrink-0 bg-stone-50" />
                          ) : (
                            <div className="w-12 h-12 rounded border border-[var(--color-line)] bg-stone-100 flex items-center justify-center text-lg shrink-0">🌸</div>
                          )}
                          <div>
                            <p className="font-bold font-sans text-xs text-[var(--color-ink)]">{item.title}</p>
                            {item.specimen && <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono">{item.specimen}</p>}
                          </div>
                        </td>
                        <td className="p-3 text-center">{formatPrice(item.price)}</td>
                        <td className="p-3 text-center font-bold">{item.qty}</td>
                        <td className="p-3 text-right font-bold text-emerald-900">{formatPrice((item.price || 0) * (item.qty || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Courier Dispatch / Tracking Logistics (if available) */}
            {(selectedUserOrderDetail.carrier || selectedUserOrderDetail.trackingNumber || selectedUserOrderDetail.statusHistory?.length > 0) && (
              <div className="bg-[var(--color-bg)] border border-[var(--color-line)] p-4 rounded text-xs space-y-2">
                <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-primary)] uppercase flex items-center gap-1">
                  <Truck size={13} /> Dispatch Logistics &amp; Fulfillment History
                </span>
                {selectedUserOrderDetail.carrier && (
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span><strong>Carrier:</strong> {selectedUserOrderDetail.carrier}</span>
                    <span><strong>AWB / Tracking #:</strong> <code className="font-bold text-rose-800">{selectedUserOrderDetail.trackingNumber}</code></span>
                    {selectedUserOrderDetail.trackingUrl && (
                      <a href={selectedUserOrderDetail.trackingUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] font-bold underline flex items-center gap-1">
                        <ExternalLink size={12} /> Live Tracking URL
                      </a>
                    )}
                  </div>
                )}
                {selectedUserOrderDetail.statusHistory?.length > 0 && (
                  <div className="pt-2 border-t border-[var(--color-line)] space-y-1">
                    <p className="text-[0.65rem] font-bold uppercase text-[var(--color-ink-soft)]">Status Progression Log:</p>
                    {selectedUserOrderDetail.statusHistory.map((h, i) => (
                      <div key={i} className="text-[0.68rem] text-[var(--color-ink-soft)] flex items-center gap-2">
                        <span className="font-bold text-[var(--color-ink)]">• {h.status}:</span>
                        <span>{h.note || 'No notes'}</span>
                        {h.timestamp && <span className="font-mono text-stone-400">({formatDateTime(h.timestamp)})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Action Footer */}
            <div className="flex flex-wrap justify-between items-center pt-4 border-t border-[var(--color-line)] gap-3">
              <button
                type="button"
                onClick={() => setSelectedUserOrderDetail(null)}
                className="btn-outline px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                ← Back to Customer Profile
              </button>

              <button
                type="button"
                onClick={() => window.open(`${API_URL}/orders/${selectedUserOrderDetail.mongoId || selectedUserOrderDetail._id}/invoice`, '_blank')}
                className="btn-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
              >
                <Download size={13} /> Download Official PDF Invoice
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD FLOWER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-3">Add New Flower Creation</h2>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
              
              {/* Left Column — Form Fields */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase">
                      Collection Category <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddColModal(true)}
                      className="text-[0.68rem] text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1"
                      title="Create a new collection series"
                    >
                      <Plus size={12} /> Add Category
                    </button>
                  </div>
                  <select
                    required
                    value={newFlower.category || ''}
                    onChange={(e) => {
                      if (e.target.value === '__add_new_category__') {
                        setShowAddColModal(true)
                      } else {
                        setNewFlower({ ...newFlower, category: e.target.value })
                        if (e.target.value) setAddFlowerErrors((prev) => ({ ...prev, category: null }))
                      }
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] font-semibold text-xs rounded-lg transition-colors cursor-pointer ${
                      addFlowerErrors.category ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  >
                    <option value="">(Select Collection Category)</option>
                    {collections.map((c) => (
                      <option key={c.id || c.slug || c._id} value={c.slug || c.id || c._id}>
                        {c.title} ({c.slug || c.id})
                      </option>
                    ))}
                    <option value="__add_new_category__" className="font-bold text-[var(--color-primary)]">
                      ➕ + Add New Collection Category...
                    </option>
                  </select>
                  {addFlowerErrors.category && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Please select a Collection Category before publishing!
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Creation Title <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    placeholder="e.g. Royal Blue Velvet Lily Bouquet"
                    value={newFlower.title}
                    onChange={(e) => {
                      setNewFlower({ ...newFlower, title: e.target.value })
                      if (e.target.value.trim()) setAddFlowerErrors(prev => ({ ...prev, title: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] transition-colors ${
                      addFlowerErrors.title ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addFlowerErrors.title && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Creation Title field is empty! Please enter a title.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Specimen Display Code <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    value={newFlower.specimen}
                    onChange={(e) => {
                      setNewFlower({ ...newFlower, specimen: e.target.value })
                      if (e.target.value.trim()) setAddFlowerErrors(prev => ({ ...prev, specimen: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] font-mono transition-colors ${
                      addFlowerErrors.specimen ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addFlowerErrors.specimen && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Specimen Code field is empty! Please enter a code.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Price (₹ INR) <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    aria-required="true"
                    value={newFlower.price}
                    onChange={(e) => {
                      setNewFlower({ ...newFlower, price: Number(e.target.value) })
                      if (Number(e.target.value) > 0) setAddFlowerErrors(prev => ({ ...prev, price: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] font-bold text-emerald-800 transition-colors ${
                      addFlowerErrors.price ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addFlowerErrors.price && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Price field is empty! Please enter a valid price.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Stock / Quantity <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    aria-required="true"
                    min="0"
                    value={newFlower.stock !== undefined ? newFlower.stock : 10}
                    onChange={(e) => {
                      setNewFlower({ ...newFlower, stock: Math.max(0, parseInt(e.target.value) || 0) })
                    }}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] font-mono transition-colors focus:outline-none focus:border-[var(--color-primary)] text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the floral craftsmanship, velvet materials, colors, stem style, and care notes..."
                    value={newFlower.description || ''}
                    onChange={(e) => setNewFlower({ ...newFlower, description: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Photo Upload (Select Multiple Files) <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      handleAddImageFileChange(e)
                      setAddFlowerErrors(prev => ({ ...prev, image: null }))
                    }}
                    className={`w-full border p-2 bg-[var(--color-bg)] cursor-pointer transition-colors ${
                      addFlowerErrors.image ? 'border-rose-500 bg-rose-50/20 text-rose-900' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addFlowerErrors.image && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Photo field is empty! Please upload/choose an image.
                    </p>
                  )}

                  {/* Multi-Image Thumbnails Grid */}
                  {(newFlower.images?.length > 0 || newFlower.image) && (
                    <div className="mt-2.5 flex flex-wrap gap-2 p-2 border border-[var(--color-line)] bg-[var(--color-bg)]">
                      {(newFlower.images?.length > 0 ? newFlower.images : [newFlower.image]).map((img, idx) => (
                        <div key={idx} className="relative group w-14 h-14 border border-[var(--color-line)] overflow-hidden shrink-0">
                          <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          {img === newFlower.image && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-700 text-white text-[0.5rem] font-bold text-center py-0.2">
                              COVER
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Set as Main Cover"
                              onClick={() => setNewFlower(prev => ({ ...prev, image: img }))}
                              className="text-amber-300 font-bold text-xs hover:scale-125"
                            >
                              ★
                            </button>
                            <button
                              type="button"
                              title="Remove Image"
                              onClick={() => {
                                setNewFlower(prev => {
                                  const updated = (prev.images || [prev.image]).filter((_, i) => i !== idx)
                                  return { ...prev, images: updated, image: updated[0] || '' }
                                })
                              }}
                              className="text-rose-400 font-bold text-xs hover:scale-125"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orientation toggle buttons */}
                <div>
                  <label className="block font-bold uppercase mb-1.5">Photo Frame Orientation</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewFlower(prev => ({ ...prev, imageOrientation: 'landscape', imageRatio: 1.5 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        newFlower.imageOrientation === 'landscape'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ⬛ Landscape (Wide)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFlower(prev => ({ ...prev, imageOrientation: 'portrait', imageRatio: 0.75 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        newFlower.imageOrientation === 'portrait'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ▬ Portrait (Tall)
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-[var(--color-line)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? 'Uploading & Publishing...' : 'Publish Creation'}
                  </button>
                </div>
              </div>

              {/* Right Column — Focus & Zoom Preview */}
              <div>
                <ImageFocusPicker
                  image={newFlower.image}
                  x={newFlower.imageX}
                  y={newFlower.imageY}
                  scale={newFlower.imageScale}
                  onChange={({ x, y, scale }) => setNewFlower(prev => ({ ...prev, imageX: x, imageY: y, imageScale: scale }))}
                  onOrientationDetected={({ orientation, ratio }) => setNewFlower(prev => ({ ...prev, imageOrientation: orientation, imageRatio: ratio }))}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FLOWER MODAL */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-3">Edit Creation</h2>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
              
              {/* Left Column — Form Fields */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase">
                      Collection Category <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddColModal(true)}
                      className="text-[0.68rem] text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1"
                      title="Create a new collection series"
                    >
                      <Plus size={12} /> Add Category
                    </button>
                  </div>
                  <select
                    value={editingProduct.category || ''}
                    onChange={(e) => {
                      if (e.target.value === '__add_new_category__') {
                        setShowAddColModal(true)
                      } else {
                        setEditingProduct({ ...editingProduct, category: e.target.value })
                      }
                    }}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    <option value="">(Select Collection Category)</option>
                    {collections.map((c) => (
                      <option key={c.id || c.slug || c._id} value={c.slug || c.id || c._id}>
                        {c.title} ({c.slug || c.id})
                      </option>
                    ))}
                    <option value="__add_new_category__" className="font-bold text-[var(--color-primary)]">
                      ➕ + Add New Collection Category...
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Creation Title <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    value={editingProduct.title}
                    onChange={(e) => {
                      setEditingProduct({ ...editingProduct, title: e.target.value })
                      if (e.target.value.trim()) setEditFlowerErrors(prev => ({ ...prev, title: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] font-bold transition-colors ${
                      editFlowerErrors.title ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {editFlowerErrors.title && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Creation Title field is empty! Please enter a title.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Price (₹ INR) <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    aria-required="true"
                    value={editingProduct.price}
                    onChange={(e) => {
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                      if (Number(e.target.value) > 0) setEditFlowerErrors(prev => ({ ...prev, price: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] font-bold text-emerald-800 transition-colors ${
                      editFlowerErrors.price ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {editFlowerErrors.price && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Price field is empty! Please enter a valid price.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Stock / Quantity <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    aria-required="true"
                    min="0"
                    value={editingProduct.stock !== undefined ? editingProduct.stock : 10}
                    onChange={(e) => {
                      setEditingProduct({ ...editingProduct, stock: Math.max(0, parseInt(e.target.value) || 0) })
                    }}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] font-mono transition-colors focus:outline-none focus:border-[var(--color-primary)] text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the floral craftsmanship, velvet materials, colors, stem style, and care notes..."
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] text-xs focus:outline-none focus:border-[var(--color-primary)] transition-colors leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Update / Add Photos (Select Multiple Files)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      handleEditImageFileChange(e)
                      setEditFlowerErrors(prev => ({ ...prev, image: null }))
                    }}
                    className={`w-full border p-2 bg-[var(--color-bg)] cursor-pointer transition-colors ${
                      editFlowerErrors.image ? 'border-rose-500 bg-rose-50/20 text-rose-900' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {editFlowerErrors.image && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Photo field is empty! Please upload/choose an image.
                    </p>
                  )}

                  {/* Multi-Image Thumbnails Grid */}
                  {(editingProduct.images?.length > 0 || editingProduct.image) && (
                    <div className="mt-2.5 flex flex-wrap gap-2 p-2 border border-[var(--color-line)] bg-[var(--color-bg)]">
                      {(editingProduct.images?.length > 0 ? editingProduct.images : [editingProduct.image]).map((img, idx) => (
                        <div key={idx} className="relative group w-14 h-14 border border-[var(--color-line)] overflow-hidden shrink-0">
                          <img src={typeof img === 'object' ? img.url : img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          {(typeof img === 'object' ? img.url : img) === editingProduct.image && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-700 text-white text-[0.5rem] font-bold text-center py-0.2">
                              COVER
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Set as Main Cover"
                              onClick={() => setEditingProduct(prev => ({ ...prev, image: typeof img === 'object' ? img.url : img }))}
                              className="text-amber-300 font-bold text-xs hover:scale-125"
                            >
                              ★
                            </button>
                            <button
                              type="button"
                              title="Remove Image"
                              onClick={() => {
                                setEditingProduct(prev => {
                                  const list = prev.images || [prev.image]
                                  const updated = list.filter((_, i) => i !== idx)
                                  const nextCover = updated[0] ? (typeof updated[0] === 'object' ? updated[0].url : updated[0]) : ''
                                  return { ...prev, images: updated, image: nextCover }
                                })
                              }}
                              className="text-rose-400 font-bold text-xs hover:scale-125"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orientation toggle buttons */}
                <div>
                  <label className="block font-bold uppercase mb-1.5">Photo Frame Orientation</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(prev => ({ ...prev, imageOrientation: 'landscape', imageRatio: 1.5 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        (editingProduct.imageOrientation || 'portrait') === 'landscape'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ⬛ Landscape (Wide)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(prev => ({ ...prev, imageOrientation: 'portrait', imageRatio: 0.75 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        (editingProduct.imageOrientation || 'portrait') === 'portrait'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ▬ Portrait (Tall)
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-[var(--color-line)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? 'Uploading & Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Right Column — Focus & Zoom Preview */}
              <div>
                <ImageFocusPicker
                  image={editingProduct.image}
                  x={editingProduct.imageX ?? 50}
                  y={editingProduct.imageY ?? 50}
                  scale={editingProduct.imageScale ?? 1}
                  onChange={({ x, y, scale }) => setEditingProduct(prev => ({ ...prev, imageX: x, imageY: y, imageScale: scale }))}
                  onOrientationDetected={({ orientation, ratio }) => setEditingProduct(prev => ({ ...prev, imageOrientation: orientation, imageRatio: ratio }))}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD COLLECTION MODAL */}
      {showAddColModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-3">Create New Collection Series</h2>
            <form onSubmit={handleAddColSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
              
              {/* Left Column — Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Collection Title <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    placeholder="e.g. Orchid Whispers"
                    value={newCol.title}
                    onChange={(e) => {
                      setNewCol({ ...newCol, title: e.target.value })
                      if (e.target.value.trim()) setAddColErrors(prev => ({ ...prev, title: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] transition-colors ${
                      addColErrors.title ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addColErrors.title && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Collection Title field is empty! Please enter a title.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Category Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. orchid-whispers"
                    value={newCol.slug}
                    onChange={(e) => setNewCol({ ...newCol, slug: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Description Blurb <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    aria-required="true"
                    placeholder="Short description of this handcrafted floral series..."
                    value={newCol.blurb}
                    onChange={(e) => {
                      setNewCol({ ...newCol, blurb: e.target.value })
                      if (e.target.value.trim()) setAddColErrors(prev => ({ ...prev, blurb: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] transition-colors ${
                      addColErrors.blurb ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addColErrors.blurb && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Description Blurb field is empty! Please write a blurb.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Collection Banner Photos (Select Multiple Files) <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      handleAddColImageChange(e)
                      setAddColErrors(prev => ({ ...prev, image: null }))
                    }}
                    className={`w-full border p-2 bg-[var(--color-bg)] cursor-pointer transition-colors ${
                      addColErrors.image ? 'border-rose-500 bg-rose-50/20 text-rose-900' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {addColErrors.image && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Photo field is empty! Please upload/choose an image.
                    </p>
                  )}

                  {/* Multi-Image Thumbnails Grid */}
                  {(newCol.images?.length > 0 || newCol.image) && (
                    <div className="mt-2.5 flex flex-wrap gap-2 p-2 border border-[var(--color-line)] bg-[var(--color-bg)]">
                      {(newCol.images?.length > 0 ? newCol.images : [newCol.image]).map((img, idx) => (
                        <div key={idx} className="relative group w-14 h-14 border border-[var(--color-line)] overflow-hidden shrink-0">
                          <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          {img === newCol.image && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-700 text-white text-[0.5rem] font-bold text-center py-0.2">
                              COVER
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Set as Main Cover"
                              onClick={() => setNewCol(prev => ({ ...prev, image: img }))}
                              className="text-amber-300 font-bold text-xs hover:scale-125"
                            >
                              ★
                            </button>
                            <button
                              type="button"
                              title="Remove Image"
                              onClick={() => {
                                setNewCol(prev => {
                                  const updated = (prev.images || [prev.image]).filter((_, i) => i !== idx)
                                  return { ...prev, images: updated, image: updated[0] || '' }
                                })
                              }}
                              className="text-rose-400 font-bold text-xs hover:scale-125"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orientation toggle buttons */}
                <div>
                  <label className="block font-bold uppercase mb-1.5">Photo Frame Orientation</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCol(prev => ({ ...prev, imageOrientation: 'landscape', imageRatio: 1.5 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        newCol.imageOrientation === 'landscape'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ⬛ Landscape (Wide)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCol(prev => ({ ...prev, imageOrientation: 'portrait', imageRatio: 0.75 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        newCol.imageOrientation === 'portrait'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ▬ Portrait (Tall)
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => setShowAddColModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-[var(--color-line)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? 'Uploading & Creating...' : 'Create Collection'}
                  </button>
                </div>
              </div>

              {/* Right Column — Focus & Zoom Preview */}
              <div>
                <ImageFocusPicker
                  image={newCol.image}
                  x={newCol.imageX}
                  y={newCol.imageY}
                  scale={newCol.imageScale}
                  onChange={({ x, y, scale }) => setNewCol(prev => ({ ...prev, imageX: x, imageY: y, imageScale: scale }))}
                  onOrientationDetected={({ orientation, ratio }) => setNewCol(prev => ({ ...prev, imageOrientation: orientation, imageRatio: ratio }))}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COLLECTION MODAL */}
      {showEditColModal && editingCol && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-3">Edit Collection Series</h2>
            <form onSubmit={handleEditColSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
              
              {/* Left Column — Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Collection Title *</label>
                  <input
                    type="text"
                    value={editingCol.title}
                    onChange={(e) => {
                      setEditingCol({ ...editingCol, title: e.target.value })
                      if (e.target.value.trim()) setEditColErrors(prev => ({ ...prev, title: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] transition-colors ${
                      editColErrors.title ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {editColErrors.title && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Collection Title field is empty! Please enter a title.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Description Blurb *</label>
                  <textarea
                    rows={3}
                    value={editingCol.blurb}
                    onChange={(e) => {
                      setEditingCol({ ...editingCol, blurb: e.target.value })
                      if (e.target.value.trim()) setEditColErrors(prev => ({ ...prev, blurb: null }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-bg)] transition-colors ${
                      editColErrors.blurb ? 'border-rose-500 bg-rose-50/20 text-rose-900 focus:border-rose-600' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {editColErrors.blurb && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Description Blurb field is empty! Please write a blurb.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Update / Add Banner Photos (Select Multiple Files)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      handleEditColImageChange(e)
                      setEditColErrors(prev => ({ ...prev, image: null }))
                    }}
                    className={`w-full border p-2 bg-[var(--color-bg)] cursor-pointer transition-colors ${
                      editColErrors.image ? 'border-rose-500 bg-rose-50/20 text-rose-900' : 'border-[var(--color-line)]'
                    }`}
                  />
                  {editColErrors.image && (
                    <p className="text-[0.68rem] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      ⚠️ Photo field is empty! Please upload/choose an image.
                    </p>
                  )}

                  {/* Multi-Image Thumbnails Grid */}
                  {(editingCol.images?.length > 0 || editingCol.image) && (
                    <div className="mt-2.5 flex flex-wrap gap-2 p-2 border border-[var(--color-line)] bg-[var(--color-bg)]">
                      {(editingCol.images?.length > 0 ? editingCol.images : [editingCol.image]).map((img, idx) => (
                        <div key={idx} className="relative group w-14 h-14 border border-[var(--color-line)] overflow-hidden shrink-0">
                          <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          {img === editingCol.image && (
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-700 text-white text-[0.5rem] font-bold text-center py-0.2">
                              COVER
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              title="Set as Main Cover"
                              onClick={() => setEditingCol(prev => ({ ...prev, image: img }))}
                              className="text-amber-300 font-bold text-xs hover:scale-125"
                            >
                              ★
                            </button>
                            <button
                              type="button"
                              title="Remove Image"
                              onClick={() => {
                                setEditingCol(prev => {
                                  const updated = (prev.images || [prev.image]).filter((_, i) => i !== idx)
                                  return { ...prev, images: updated, image: updated[0] || '' }
                                })
                              }}
                              className="text-rose-400 font-bold text-xs hover:scale-125"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orientation toggle buttons */}
                <div>
                  <label className="block font-bold uppercase mb-1.5">Photo Frame Orientation</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCol(prev => ({ ...prev, imageOrientation: 'landscape', imageRatio: 1.5 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        (editingCol.imageOrientation || 'landscape') === 'landscape'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ⬛ Landscape (Wide)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCol(prev => ({ ...prev, imageOrientation: 'portrait', imageRatio: 0.75 }))}
                      className={`flex-1 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                        editingCol.imageOrientation === 'portrait'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                          : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg)]'
                      }`}
                    >
                      ▬ Portrait (Tall)
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-line)]">
                  <button
                    type="button"
                    onClick={() => setShowEditColModal(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-[var(--color-line)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? 'Uploading & Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Right Column — Focus & Zoom Preview */}
              <div>
                <ImageFocusPicker
                  image={editingCol.image}
                  x={editingCol.imageX ?? 50}
                  y={editingCol.imageY ?? 50}
                  scale={editingCol.imageScale ?? 1}
                  onChange={({ x, y, scale }) => setEditingCol(prev => ({ ...prev, imageX: x, imageY: y, imageScale: scale }))}
                  onOrientationDetected={({ orientation, ratio }) => setEditingCol(prev => ({ ...prev, imageOrientation: orientation, imageRatio: ratio }))}
                />
              </div>
            </form>
          </div>
        </div>
      )}


      {/* STEP-UP MFA MODAL FOR HIGH-RISK OPERATIONS */}
      <StepUpMfaModal
        isOpen={stepUpModal.isOpen}
        onClose={() => setStepUpModal({ isOpen: false, title: '', actionMessage: '', onConfirm: null })}
        onConfirm={stepUpModal.onConfirm}
        title={stepUpModal.title}
        actionMessage={stepUpModal.actionMessage}
      />
      {doubleConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 z-[400] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--color-bg)] border-2 border-red-500 p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5 text-[var(--color-ink)] my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4 text-red-700">
              <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-300">
                <Trash2 size={22} className="text-red-700" />
              </div>
              <div>
                <span className="text-[0.65rem] font-bold tracking-widest uppercase text-red-800 font-mono block">
                  Double Confirmation Required
                </span>
                <h3 className="font-bold text-base font-[var(--font-display)] text-red-950 uppercase">
                  {doubleConfirmModal.title}
                </h3>
              </div>
            </div>

            <p className="text-xs md:text-sm text-[var(--color-ink)] leading-relaxed">
              {doubleConfirmModal.message}
            </p>

            <div className="bg-red-50/90 border border-red-300 p-4 space-y-2.5 rounded text-xs text-red-950">
              <p className="font-bold">
                To confirm this deletion, please type <span className="font-mono bg-red-200 px-2 py-0.5 rounded font-bold text-red-900">{doubleConfirmModal.expectedPhrase}</span> in the box below:
              </p>
              <input
                type="text"
                autoFocus
                placeholder={`Type "${doubleConfirmModal.expectedPhrase}" to enable deletion...`}
                value={doubleConfirmModal.inputText}
                onChange={(e) =>
                  setDoubleConfirmModal((prev) => ({ ...prev, inputText: e.target.value }))
                }
                className="w-full border-2 border-red-300 focus:border-red-600 bg-white p-3 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none shadow-inner"
              />
              <p className="text-[0.68rem] text-red-800 italic">
                {doubleConfirmModal.inputText.trim().toUpperCase() === doubleConfirmModal.expectedPhrase.toUpperCase()
                  ? '✅ Phrase matched. Deletion button is now unlocked.'
                  : `⚠️ Type exactly "${doubleConfirmModal.expectedPhrase}" to unlock the button.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDoubleConfirmModal({
                    isOpen: false,
                    title: '',
                    message: '',
                    expectedPhrase: 'DELETE',
                    inputText: '',
                    actionLabel: '',
                    onConfirm: null,
                  })
                }
                className="btn-outline px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
              >
                Cancel & Keep Data
              </button>

              <button
                type="button"
                disabled={
                  doubleConfirmModal.inputText.trim().toUpperCase() !==
                  doubleConfirmModal.expectedPhrase.toUpperCase()
                }
                onClick={async () => {
                  if (
                    doubleConfirmModal.inputText.trim().toUpperCase() ===
                    doubleConfirmModal.expectedPhrase.toUpperCase()
                  ) {
                    if (doubleConfirmModal.onConfirm) {
                      await doubleConfirmModal.onConfirm()
                    }
                    setDoubleConfirmModal({
                      isOpen: false,
                      title: '',
                      message: '',
                      expectedPhrase: 'DELETE',
                      inputText: '',
                      actionLabel: '',
                      onConfirm: null,
                    })
                  }
                }}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5"
              >
                <Trash2 size={13} /> {doubleConfirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uptime Robot Health Logs Modal */}
      {showUptimeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-line)] rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scaleUp text-xs">
            <div className="flex justify-between items-center border-b border-[var(--color-line)] pb-3">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">Uptime Monitor & Health Logs</h3>
              </div>
              <button
                onClick={() => setShowUptimeModal(false)}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-between items-center bg-[var(--color-bg)] p-3 rounded-2xl border border-[var(--color-line)]">
              <div>
                <p className="font-bold text-[var(--color-ink)]">Current Status</p>
                <p className="text-[10px] text-[var(--color-ink-soft)] uppercase mt-0.5">
                  Last Checked: {uptimeStatus.lastPing ? new Date(uptimeStatus.lastPing).toLocaleTimeString('en-IN') : 'Never'}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                isUptimeActive ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isUptimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                {isUptimeActive ? 'Active' : 'Dormant'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-bold uppercase text-[10px] text-[var(--color-ink-soft)] tracking-wider">Recent Pings (Last 20)</h4>
                <button
                  onClick={() => {
                    fetchUptimeStatus()
                  }}
                  className="text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1"
                >
                  🔄 Refresh Logs
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {(!uptimeStatus.history || uptimeStatus.history.length === 0) ? (
                  <div className="p-8 text-center text-[var(--color-ink-soft)] border border-dashed border-[var(--color-line)] rounded-2xl">
                    No logs recorded yet. Uptime Robot will check in shortly.
                  </div>
                ) : (
                  uptimeStatus.history.map((h, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 bg-[var(--color-bg)] border border-[var(--color-line)]/55 rounded-xl hover:border-[var(--color-line)] transition-colors">
                      <div className="flex items-center gap-2">
                        <span>{h.isUptimeRobot ? '🤖' : '🏥'}</span>
                        <div className="text-left">
                          <p className="font-bold text-[var(--color-ink)] text-[11px]">
                            {h.isUptimeRobot ? 'UptimeRobot Health Check' : 'Manual API Health Check'}
                          </p>
                          <p className="text-[9px] text-[var(--color-ink-soft)] font-mono line-clamp-1 max-w-[240px]" title={h.userAgent}>
                            UA: {h.userAgent}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] text-[var(--color-ink-soft)] text-right">
                        {new Date(h.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="block text-[8px] text-[var(--color-ink-soft)]/70">
                          {new Date(h.timestamp).toLocaleDateString('en-IN')}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-line)] flex justify-end">
              <button
                onClick={() => setShowUptimeModal(false)}
                className="btn-primary py-2 px-4 text-[10px] rounded-full uppercase tracking-wider font-bold"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
