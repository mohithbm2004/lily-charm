import { useState, useEffect, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { useStudio } from '../context/StudioContext'
import { useAdminAuth } from '../context/AdminAuthContext'
import StepUpMfaModal from '../components/StepUpMfaModal'
import { formatPrice, formatDateTime, formatDateOnly } from '../lib/format'
import { exportOrdersToCSV, exportUsersToCSV, exportCustomRequestsToCSV, exportReviewsToCSV } from '../lib/exportCSV'
import ImageFocusPicker from '../components/ImageFocusPicker'
import { API_URL, STOREFRONT_URL } from '../config/api'

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
    activeOffer,
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
    updateOffer,
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
    if (shippingSettings && !hasInitializedShipping) {
      setTempShipping({
        shippingFeeEnabled: shippingSettings.shippingFeeEnabled ?? true,
        standardShippingFee: shippingSettings.standardShippingFee ?? 100,
        freeShippingThreshold: shippingSettings.freeShippingThreshold ?? 2500,
      })
      setHasInitializedShipping(true)
    }
  }, [shippingSettings, hasInitializedShipping])

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
    if (p.includes('/admin/settings')) return 'offers'
    if (p.includes('/admin/audit-logs')) return 'audit-logs'
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
    else if (p.includes('/admin/settings')) setActiveTab('offers')
    else if (p.includes('/admin/audit-logs')) setActiveTab('audit-logs')
    else if (p.includes('/admin/dashboard')) setActiveTab('dashboard')
    else if (p.includes('/admin/products')) setActiveTab('products')
  }, [location.pathname])

  const handleTabChange = (tabKey, routePath) => {
    setActiveTab(tabKey)
    if (routePath) navigate(routePath)
  }

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)

  const fetchAuditLogs = useCallback(async () => {
    setLoadingAuditLogs(true)
    try {
      const res = await fetch(`${API_URL}/admin/audit-logs`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.success) setAuditLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err)
    } finally {
      setLoadingAuditLogs(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'audit-logs') {
      fetchAuditLogs()
    }
  }, [activeTab, fetchAuditLogs])

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
    category: 'velvet-lilies',
    price: 3499,
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

  // Marquee & Offer edit state
  const [tempMarquee, setTempMarquee] = useState(marqueeText)
  const [tempOffer, setTempOffer] = useState(() => activeOffer)

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
  const [requestFilter, setRequestFilter] = useState('all') // 'all' | 'accepted' | 'rejected' | 'pending'

  // Categorize Custom Requests into Accepted, Rejected, and Pending columns
  const acceptedRequests = useMemo(() => {
    return (customRequests || []).filter(
      (r) =>
        r.status === 'Accepted & Order Created' ||
        r.status === 'Approved' ||
        r.status === 'Completed' ||
        r.isAccepted === true
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
    return (customRequests || []).filter(
      (r) =>
        r.status !== 'Accepted & Order Created' &&
        r.status !== 'Approved' &&
        r.status !== 'Completed' &&
        r.status !== 'Rejected' &&
        r.status !== 'Quote Declined' &&
        r.status !== 'Declined' &&
        !r.isAccepted &&
        !r.isDeclined
    )
  }, [customRequests])

  const renderRequestCard = (req) => {
    const reqImages = Array.isArray(req.images) && req.images.length > 0
      ? req.images
      : (req.image ? [req.image] : [])
    const mainPhoto = req.image || reqImages[0] || ''

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
              req.status === 'Completed' || req.status === 'Accepted & Order Created'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : req.status === 'Approved'
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : req.status === 'In Review'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : req.status === 'Rejected' || req.status === 'Quote Declined'
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

        {/* Admin Quoted Price Form */}
        <div className="pt-3 border-t border-[var(--color-line)] bg-[var(--color-bg)] p-3 space-y-2">
          <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-primary)]">Admin Price Quote (₹ INR)</span>
          {req.quotedPrice ? (
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-800">{formatPrice(req.quotedPrice)}</p>
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

        {/* Card Actions Footer */}
        <div className="pt-3 border-t border-[var(--color-line)] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[0.68rem] uppercase">Status:</label>
            <select
              value={req.status || 'Quote Pending'}
              onChange={(e) => updateCustomRequestStatus(req._id, e.target.value)}
              className="border border-[var(--color-line)] bg-[var(--color-bg)] p-1.5 text-xs font-semibold"
            >
              <option value="Quote Pending">Quote Pending</option>
              <option value="Quoted">Quoted</option>
              <option value="Accepted & Order Created">Accepted & Order Created</option>
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
        category: newFlower.category || collections[0]?.slug || collections[0]?.id || 'general',
        images: pImages,
        image: pImages[0] || '',
      })
      setShowAddModal(false)
      setNewFlower({
        title: '',
        specimen: `Flower ${products.length + 2}`,
        category: collections[0]?.slug || collections[0]?.id || 'general',
        price: 3499,
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

  const handleSaveOffer = (e) => {
    e.preventDefault()
    updateOffer(tempOffer)
    alert('Offer banner updated successfully!')
  }

  const [reviewFilter, setReviewFilter] = useState('all') // 'all', 'displayed', 'hidden'
  const [reviewSearchQuery, setReviewSearchQuery] = useState('')

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

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specimen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const pendingOrdersCount = orders.filter((o) => o.orderStatus !== 'Delivered').length

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
              Manage your handcrafted flower catalog, collections, update offers, edit prices, track orders, and view security audit logs.
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
            onClick={() => handleTabChange('audit-logs', '/admin/audit-logs')}
            className={`px-4 py-3 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors rounded-t-xl ${
              activeTab === 'audit-logs'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)] shadow-sm font-bold'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <ShieldCheck size={15} /> Audit Logs
          </button>
        </div>

        {/* TAB 1: PRODUCTS MANAGER */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]" />
                <input
                  type="text"
                  placeholder="Search flower title or specimen code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-[var(--color-line)] pl-9 pr-4 py-2 text-xs bg-[var(--color-card-bg)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add New Flower Creation
                </button>
              </div>
            </div>

            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[var(--color-ink-soft)] bg-[var(--color-bg)]">
                    <th className="p-4">Photo</th>
                    <th className="p-4">Specimen</th>
                    <th className="p-4">Creation Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price (₹)</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)] text-xs">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--color-bg)]/60 transition-colors">
                      <td className="p-4">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-12 h-12 object-cover border border-[var(--color-line)]" />
                        ) : (
                          <div className="w-12 h-12 bg-stone-200 flex items-center justify-center text-[10px]">No Pic</div>
                        )}
                      </td>
                      <td className="p-4 font-mono font-medium">{p.specimen}</td>
                      <td className="p-4 font-bold font-[var(--font-display)] text-sm">{p.title}</td>
                      <td className="p-4 uppercase tracking-wider text-[0.68rem] font-medium text-[var(--color-ink-soft)]">
                        <span className="bg-[var(--color-bg)] px-2 py-1 border border-[var(--color-line)]">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-emerald-800">{formatPrice(p.price)}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1.5 border border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors inline-flex items-center gap-1 text-xs"
                          title="Edit Creation"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(p)}
                          className="p-1.5 border border-red-300 text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1 text-xs"
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
                  {orders.length} Orders
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
                <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-x-auto shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[var(--color-ink-soft)] bg-[var(--color-bg)]">
                        <th className="p-4">Order ID & Timestamp</th>
                        <th className="p-4">Customer & Address</th>
                        <th className="p-4">Items Ordered</th>
                        <th className="p-4">Amount & Payment</th>
                        <th className="p-4">Courier Tracking</th>
                        <th className="p-4">Fulfillment Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)] text-xs">
                      {orders.map((o) => (
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
                          <td className="p-4 space-y-1 align-top">
                            <p className="font-bold text-sm">{o.customerName || o.shippingAddress?.name || 'Customer'}</p>
                            {(o.email || o.shippingAddress?.email) && (
                              <p className="text-[0.68rem] text-[var(--color-primary)] font-semibold">{o.email || o.shippingAddress?.email}</p>
                            )}
                            {(o.phone || o.shippingAddress?.phone) && (
                              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">{o.phone || o.shippingAddress?.phone}</p>
                            )}
                            <p className="text-[0.68rem] text-[var(--color-ink-soft)] max-w-xs leading-relaxed">
                              {o.address || o.shippingAddress?.address || o.shippingAddress?.line1}, {o.city || o.shippingAddress?.city} - {o.pincode || o.shippingAddress?.pincode}
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
                          <td className="p-4 space-y-1 align-top">
                            <p className="font-bold text-sm text-emerald-800 font-mono">{formatPrice(o.grandTotal || o.total)}</p>
                            <span className="inline-block text-[0.62rem] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 border border-emerald-300">
                              {o.paymentMethod || 'Paid (Razorpay)'}
                            </span>
                            {o.razorpayPaymentId && (
                              <p className="text-[0.6rem] font-mono text-[var(--color-ink-soft)]">ID: {o.razorpayPaymentId}</p>
                            )}
                          </td>

                          {/* Tracking Number Input */}
                          <td className="p-4 align-top space-y-1.5">
                            <input
                              type="text"
                              placeholder="Enter Tracking No..."
                              defaultValue={o.trackingNumber || ''}
                              onBlur={(e) => {
                                if (e.target.value !== o.trackingNumber) {
                                  updateOrderStatus(o.id || o._id, o.status || 'Confirmed', e.target.value)
                                }
                              }}
                              className="w-full border border-[var(--color-line)] p-1.5 text-xs font-mono bg-white focus:border-[var(--color-primary)]"
                            />
                            <p className="text-[0.62rem] text-[var(--color-ink-soft)]">Carrier: {o.carrier || 'BlueDart'}</p>
                          </td>

                          {/* Status Dropdown */}
                          <td className="p-4 align-top space-y-2">
                            <select
                              value={o.status || 'Confirmed'}
                              onChange={(e) => updateOrderStatus(o.id || o._id, e.target.value)}
                              className="border border-[var(--color-line)] p-2 text-xs bg-[var(--color-bg)] font-bold focus:outline-none focus:border-[var(--color-primary)] w-full"
                            >
                              <option value="Pending Payment">⏳ Pending Payment</option>
                              <option value="Paid">💳 Paid</option>
                              <option value="Confirmed">✅ Order Confirmed</option>
                              <option value="Handcrafting">🎨 Handcrafting in Studio</option>
                              <option value="Processing">🎨 Studio Processing</option>
                              <option value="Packed">📦 Packed & Sealed</option>
                              <option value="Packed & Dispatched">📦 Packed & Dispatched</option>
                              <option value="Shipped">🚚 Shipped</option>
                              <option value="Out For Delivery">🛵 Out For Delivery</option>
                              <option value="Delivered">🎉 Delivered</option>
                              <option value="Cancelled">❌ Cancelled</option>
                              <option value="Cancelled & Refunded">💸 Cancelled & Refunded</option>
                              <option value="Refund Requested">⚠️ Refund Requested</option>
                              <option value="Refund Approved">💸 Refund Approved</option>
                              <option value="Refund Rejected">🚫 Refund Rejected</option>
                            </select>

                            {/* Refund Actions if requested */}
                            {o.status === 'Refund Requested' && (
                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  onClick={async () => {
                                    if (confirm('Approve refund for this order?')) {
                                      await fetch(`${API_URL}/orders/${o._id || o.id}/process-refund`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'approve' }),
                                      })
                                      window.location.reload()
                                    }
                                  }}
                                  className="bg-emerald-700 text-white text-[0.6rem] font-bold uppercase px-2 py-1"
                                >
                                  Approve Refund
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('Reject refund request?')) {
                                      await fetch(`${API_URL}/orders/${o._id || o.id}/process-refund`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'reject' }),
                                      })
                                      window.location.reload()
                                    }
                                  }}
                                  className="bg-rose-700 text-white text-[0.6rem] font-bold uppercase px-2 py-1"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-right align-top">
                            <button
                              onClick={() => deleteOrder(o)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 ml-auto hover:underline"
                            >
                              <Trash2 size={13} /> Delete
                            </button>

                            {o.status !== 'Cancelled' && o.status !== 'Cancelled & Refunded' && (
                              <button
                                onClick={async () => {
                                  const reason = prompt('Enter cancellation & refund reason for customer:', 'Cancelled by studio admin')
                                  if (reason !== null) {
                                    try {
                                      const res = await fetch(`${API_URL}/orders/${o._id || o.id}/cancel`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reason, isAdmin: true }),
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
                              >
                                <XCircle size={12} /> Cancel & Auto Refund
                              </button>
                            )}

                            {o.razorpayRefundId && (
                              <span className="text-[0.6rem] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded block mt-1 text-right">
                                Refund ID: {o.razorpayRefundId}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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

            <form onSubmit={handleSaveOffer} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  🏷️ Active Offer Code & Discount Percentage
                </h2>
                <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                  tempOffer.isActive !== false ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {tempOffer.isActive !== false ? 'PROMO ACTIVE' : 'PROMO PAUSED'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">Offer Promo Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LILY10 or SUMMER25"
                    value={tempOffer.code || ''}
                    onChange={(e) => setTempOffer({ ...tempOffer, code: e.target.value.toUpperCase().trim() })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)]"
                  />
                  <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">Customers enter this code at checkout to apply discount.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">Offer Discount Percentage (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    placeholder="e.g. 10, 20, 25"
                    value={tempOffer.discountPercent || ''}
                    onChange={(e) => setTempOffer({ ...tempOffer, discountPercent: Number(e.target.value) })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)]"
                  />
                  <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">Percentage off the cart subtotal (e.g. 25 = 25% OFF).</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5">Offer Title / Description</label>
                <input
                  type="text"
                  placeholder="e.g. 25% OFF Festive Special Offer"
                  value={tempOffer.title || ''}
                  onChange={(e) => setTempOffer({ ...tempOffer, title: e.target.value })}
                  className="w-full border border-[var(--color-line)] p-2.5 text-xs focus:outline-none focus:border-[var(--color-primary)] bg-[var(--color-bg)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveOffer"
                  checked={tempOffer.isActive !== false}
                  onChange={(e) => setTempOffer({ ...tempOffer, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer"
                />
                <label htmlFor="isActiveOffer" className="text-xs font-bold uppercase cursor-pointer">
                  Enable & Activate this offer code on Storefront
                </label>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-1">
                <span className="font-bold text-emerald-900 uppercase text-[0.68rem] tracking-wider block">Storefront Live Preview:</span>
                <p className="text-emerald-800 font-medium">
                  Code: <strong className="font-mono font-bold bg-white px-2 py-0.5 border border-emerald-300 rounded text-emerald-900">{tempOffer.code || 'LILY10'}</strong> ➔ <strong className="font-bold text-emerald-900">{tempOffer.discountPercent || 10}% OFF Discount</strong>
                </p>
              </div>

              <button type="submit" className="btn-primary py-3 px-6 text-xs uppercase font-bold tracking-wider">
                Save Main Banner Offer
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
                  const uEmail = u.email?.toLowerCase().trim()
                  const uIdStr = u._id ? u._id.toString() : ''

                  const userOrdersList = (orders || []).filter((o) => {
                    const oUserId = (o.user?._id || o.user)?.toString()
                    const oEmail = (o.email || o.shippingAddress?.email)?.toLowerCase().trim()
                    if (uIdStr && oUserId && oUserId === uIdStr) return true
                    if (uEmail && oEmail && oEmail === uEmail) return true
                    if (Array.isArray(u.alternateEmails) && oEmail && u.alternateEmails.some((alt) => alt.toLowerCase().trim() === oEmail)) return true
                    return false
                  })

                  const totalSpent = userOrdersList.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0)

                  const userRequestsList = (customRequests || []).filter((r) => {
                    const rUserId = (r.user?._id || r.user)?.toString()
                    const rEmail = r.email?.toLowerCase().trim()
                    if (uIdStr && rUserId && rUserId === uIdStr) return true
                    if (uEmail && rEmail && rEmail === uEmail) return true
                    if (Array.isArray(u.alternateEmails) && rEmail && u.alternateEmails.some((alt) => alt.toLowerCase().trim() === rEmail)) return true
                    return false
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

                        {/* Summary Chips */}
                        <div className="pt-2 border-t border-[var(--color-line)] flex flex-wrap gap-2 text-[0.65rem] font-bold uppercase">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-mono">
                            📦 {userOrdersList.length} Orders
                          </span>
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono">
                            💰 {formatPrice(totalSpent)} Spent
                          </span>
                          {userRequestsList.length > 0 && (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded font-mono">
                              🎨 {userRequestsList.length} Quotes
                            </span>
                          )}
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
        {/* TAB: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[var(--color-primary)]" /> Security & Administrative Audit Trail
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Real-time security log tracking admin logins, product changes, order status updates, refunds, and settings updates.
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="btn-outline text-xs px-4 py-2 font-bold uppercase rounded-full flex items-center gap-1.5 shadow-sm"
              >
                <RefreshCw size={13} /> Refresh Audit Trail
              </button>
            </div>

            {loadingAuditLogs ? (
              <div className="p-8 text-center text-xs font-bold animate-pulse text-[var(--color-ink-soft)]">
                Loading real-time security audit logs...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 border border-dashed border-[var(--color-line)] rounded-3xl text-center text-xs text-[var(--color-ink-soft)] space-y-2 bg-[var(--color-card-bg)]/40">
                <p className="font-bold uppercase text-sm">No Audit Log Entries Found</p>
                <p>Security events will populate automatically as administrative actions occur.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs shadow-sm hover:shadow-md transition-shadow">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-[0.68rem] uppercase px-3 py-1 rounded-full bg-[var(--color-primary)] text-white shadow-sm">
                          {log.action}
                        </span>
                        <span className="font-mono text-[0.68rem] text-[var(--color-ink-soft)] bg-[var(--color-bg)] px-2.5 py-0.5 rounded-full border border-[var(--color-line)]">
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--color-ink)] pt-0.5">
                        Admin: <span className="font-mono text-[var(--color-primary)] font-bold">{log.adminEmail}</span>
                      </p>
                      {log.ipAddress && (
                        <p className="text-[0.65rem] font-mono text-[var(--color-ink-soft)]">
                          IP Address: {log.ipAddress}
                        </p>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="bg-[var(--color-bg)] border border-[var(--color-line)] p-3 rounded-2xl font-mono text-[0.68rem] text-[var(--color-ink)] max-w-full overflow-x-auto shrink-0 leading-relaxed shadow-inner">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
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

      {/* USER PROFILE & ORDER HISTORY MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[var(--color-line)] pb-4">
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
                className="p-2 hover:bg-black/10 text-[var(--color-ink-soft)] font-bold uppercase text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Customer Details & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-[var(--color-bg)] p-4 border border-[var(--color-line)]">
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
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[0.62rem] font-bold uppercase rounded border border-emerald-300">
                  Verified Account
                </span>
              </div>

              <div>
                <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-ink-soft)]">Lifetime Value</span>
                <p className="text-lg font-bold font-mono text-emerald-800 mt-0.5">{formatPrice(selectedUserModal.totalSpent)}</p>
                <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">{selectedUserModal.userOrdersList.length} Orders Placed</p>
              </div>
            </div>

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
                    <div key={o._id || o.id} className="border border-[var(--color-line)] bg-white p-4 space-y-3 shadow-sm">
                      <div className="flex flex-wrap justify-between items-start border-b border-[var(--color-line)] pb-2 gap-2 text-xs">
                        <div>
                          <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{o.id || o.orderNumber || o._id}</p>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Placed on: {new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold uppercase px-2.5 py-1 text-[0.62rem] rounded bg-[#212B1C] text-[#F5E8D0] border border-black">
                            {o.status || o.orderStatus || 'Confirmed'}
                          </span>
                          <span className="font-mono font-bold uppercase px-2.5 py-1 text-[0.62rem] rounded bg-emerald-800 text-white border border-emerald-950">
                            {o.paymentStatus || 'Paid'}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        {o.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs border-b border-dashed border-stone-200 pb-2">
                            {item.image && (
                              <img src={item.image} alt={item.title} className="w-10 h-10 object-cover border border-[var(--color-line)] shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{item.title}</p>
                              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">Qty: {item.qty} × {formatPrice(item.price)}</p>
                            </div>
                            <span className="font-bold font-mono text-xs">{formatPrice((item.price || 0) * (item.qty || 1))}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-1 text-xs">
                        <span className="font-bold text-sm font-mono text-emerald-800">Total: {formatPrice(o.grandTotal || o.total || 0)}</span>
                        <button
                          onClick={() => window.open(`${API_URL}/orders/${o.mongoId || o._id}/invoice`, '_blank')}
                          className="btn-outline py-1.5 px-3 text-[0.65rem] font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <Download size={12} /> Download PDF Invoice
                        </button>
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

      {/* ADD FLOWER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-3">Add New Flower Creation</h2>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
              
              {/* Left Column — Form Fields */}
              <div className="space-y-4">
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
                    Collection Category <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <select
                    value={newFlower.category}
                    onChange={(e) => setNewFlower({ ...newFlower, category: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] font-semibold"
                  >
                    {collections.map((c) => (
                      <option key={c.id || c.slug} value={c.slug || c.id}>
                        {c.title} ({c.slug || c.id})
                      </option>
                    ))}
                  </select>
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
                To confirm this bulk deletion, please type <span className="font-mono bg-red-200 px-2 py-0.5 rounded font-bold text-red-900">{doubleConfirmModal.expectedPhrase}</span> in the box below:
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
    </div>
  )
}
