import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'
import ImageFocusPicker from '../components/ImageFocusPicker'

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://lily-charm-server.onrender.com/api' : 'http://localhost:5000/api')

export default function AdminDashboard() {
  const {
    products,
    collections = [],
    orders,
    customRequests = [],
    users = [],
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
    updateMarquee,
    updateOffer,
  } = useStudio()

  const [pinInput, setPinInput] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('lilycharm_admin_unlocked') === 'true'
  })
  const [pinError, setPinError] = useState(false)
  const [activeTab, setActiveTab] = useState('products')

  // Search & Filter state for products
  const [searchQuery, setSearchQuery] = useState('')

  // Product Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

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

  // Segment Coupons State
  const [coupons, setCoupons] = useState([])
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

  const fetchCouponsFromApi = async () => {
    try {
      const res = await fetch(`${API_URL}/coupons`)
      if (res.ok) {
        const data = await res.json()
        setCoupons(data)
      }
    } catch (e) {
      console.error('Failed to fetch coupons:', e)
    }
  }

  useEffect(() => {
    fetchCouponsFromApi()
  }, [])

  // Field validation & preview states
  const [previewImageModal, setPreviewImageModal] = useState(null)
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
    try {
      const res = await fetch(`${API_URL}/coupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCoupon),
      })
      if (res.ok) {
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
        fetchCouponsFromApi()
      } else {
        const err = await res.json()
        alert(`Error: ${err.message || 'Failed to create coupon'}`)
      }
    } catch (err) {
      console.error('Failed to create coupon:', err)
      alert('Server error creating coupon')
    }
  }

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) return
    try {
      await fetch(`${API_URL}/coupons/${id}`, { method: 'DELETE' })
      fetchCouponsFromApi()
    } catch (err) {
      console.error('Failed to delete coupon:', err)
    }
  }

  const handleToggleCoupon = async (coupon) => {
    try {
      await fetch(`${API_URL}/coupons/${coupon._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      })
      fetchCouponsFromApi()
    } catch (err) {
      console.error('Failed to toggle coupon status:', err)
    }
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

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specimen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const pendingOrdersCount = orders.filter((o) => o.orderStatus !== 'Delivered').length

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-8 max-w-md w-full shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-bold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-ink)]">
              Lily Charm Admin Portal
            </h1>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Enter security PIN to manage flower catalog, collections, offers, and delivery tracking.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2">
                SECURITY PIN (Default: 1234)
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN"
                className="w-full border border-[var(--color-line)] p-3 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[var(--color-primary)]"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-red-600 font-semibold mt-1 text-center">
                  Incorrect PIN. Please enter 1234 or admin1234.
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2">
              <ShieldCheck size={16} /> Unlock Studio Manager
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--color-line)] text-center space-y-2">
            <button
              onClick={() => {
                setPinInput('1234')
                setIsUnlocked(true)
                localStorage.setItem('lilycharm_admin_unlocked', 'true')
              }}
              className="text-xs text-[var(--color-primary)] hover:underline font-semibold"
            >
              ⚡ Quick One-Click Unlock for Keerthana
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Dedicated Admin Header */}
      <header className="bg-[var(--color-primary)] text-white border-b border-[var(--color-line)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-[var(--font-display)] font-bold text-lg md:text-xl tracking-[0.16em] uppercase">
              Lily Charm Admin Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="text-xs tracking-wider uppercase font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 border border-white/20 transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} /> Open Storefront ↗
            </a>
            <button
              onClick={handleLock}
              className="text-xs tracking-wider uppercase font-medium bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut size={13} /> Lock Panel
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* Welcome Banner */}
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="eyebrow block mb-1">Standalone Admin Application</span>
            <h1 className="text-3xl font-bold font-[var(--font-display)] uppercase tracking-wider text-[var(--color-ink)]">
              Welcome back, Keerthana!
            </h1>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">
              Manage your handcrafted flower catalog, collections, update offers, edit prices, and track delivery orders.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-3 px-5 text-xs flex items-center gap-2"
          >
            <Plus size={15} /> Add New Flower Creation
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5">
            <p className="eyebrow mb-1">Total Studio Sales</p>
            <p className="text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">
              {formatPrice(totalRevenue)}
            </p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Lifetime Revenue</p>
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5">
            <p className="eyebrow mb-1">Active Creations</p>
            <p className="text-2xl font-bold font-[var(--font-display)]">{products.length} Flowers</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Live in Store</p>
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5">
            <p className="eyebrow mb-1">Live Collections</p>
            <p className="text-2xl font-bold font-[var(--font-display)] text-emerald-800">{collections.length} Series</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Active Categories</p>
          </div>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5">
            <p className="eyebrow mb-1">Total Orders</p>
            <p className="text-2xl font-bold font-[var(--font-display)]">{orders.length} Received</p>
            <p className="text-xs text-[var(--color-ink-soft)] mt-1">Customer Orders</p>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex border-b border-[var(--color-line)] overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'products'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Package size={15} /> 1. Flowers & Products ({products.length})
          </button>

          <button
            onClick={() => setActiveTab('collections')}
            className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'collections'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Layers size={15} /> 2. Collections Manager ({collections.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Truck size={15} /> 3. Order Delivery Tracking ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'offers'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Tag size={15} /> 4. Header Marquee & Offers
          </button>

          <button
            onClick={() => setActiveTab('custom-requests')}
            className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'custom-requests'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Sparkles size={15} /> 5. Custom Requests ({customRequests.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'users'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
                : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Users size={15} /> 6. Registered Users ({users.length})
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
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${p.title}"?`)) {
                              deleteProduct(p)
                            }
                          }}
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
                      if (window.confirm('Are you sure you want to delete ALL collections from the Storefront?')) {
                        deleteAllCollections()
                      }
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
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete collection "${c.title}"?`)) {
                              deleteCollection(c)
                            }
                          }}
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

        {/* TAB 3: ORDER TRACKING */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Truck className="text-[var(--color-primary)]" size={20} /> Order Delivery & Fulfillment Manager
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Real-time customer orders placed via storefront with payment & delivery tracking.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start">
                <span className="bg-[var(--color-primary)] text-white text-xs font-bold font-mono px-3 py-1.5 rounded-full">
                  {orders.length} Total Orders
                </span>
                {orders.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete ALL orders from studio database?')) {
                        deleteAllOrders()
                      }
                    }}
                    className="px-3 py-1.5 border border-red-300 text-red-600 text-xs font-bold hover:bg-red-50 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={13} /> Delete All Orders
                  </button>
                )}
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-2">
                <Truck size={32} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="font-bold uppercase text-sm">No Orders Received Yet</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  When customers complete checkout, their order details and shipping address will appear here!
                </p>
              </div>
            ) : (
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] text-[0.68rem] tracking-[0.16em] uppercase font-bold text-[var(--color-ink-soft)] bg-[var(--color-bg)]">
                      <th className="p-4">Order ID & Date</th>
                      <th className="p-4">Customer Shipping Details</th>
                      <th className="p-4">Items Ordered</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Delivery Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)] text-xs">
                    {orders.map((o) => (
                      <tr key={o.id || o._id} className="hover:bg-[var(--color-bg)]/60 transition-colors">
                        <td className="p-4 align-top">
                          <p className="font-mono font-bold text-sm text-[var(--color-primary)]">{o.id || o._id}</p>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)] mt-0.5">{o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '')}</p>
                          <span className="inline-block mt-2 text-[0.6rem] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                            {o.paymentMethod || 'Paid (Razorpay)'}
                          </span>
                        </td>
                        <td className="p-4 space-y-1 align-top">
                          <p className="font-bold text-sm">{o.customerName || o.shippingAddress?.name || 'Customer'}</p>
                          {o.email && <p className="text-[0.68rem] text-[var(--color-primary)] font-semibold">{o.email}</p>}
                          {o.phone && <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">{o.phone}</p>}
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
                                <p className="font-medium leading-tight">{item.title}</p>
                                <p className="text-[0.65rem] text-[var(--color-ink-soft)] font-mono">Qty: {item.qty || 1} • {formatPrice(item.price)}</p>
                              </div>
                            </div>
                          ))}
                        </td>
                        <td className="p-4 font-bold text-sm text-emerald-800 align-top">{formatPrice(o.total)}</td>
                        <td className="p-4 align-top">
                          <select
                            value={o.orderStatus || o.status || 'Handcrafting'}
                            onChange={(e) => updateOrderStatus(o.id || o._id, e.target.value)}
                            className="border border-[var(--color-line)] p-2 text-xs bg-[var(--color-bg)] font-semibold focus:outline-none focus:border-[var(--color-primary)] w-full"
                          >
                            <option value="Handcrafting">🎨 Handcrafting Stems</option>
                            <option value="Packed & Dispatched">📦 Packed & Dispatched</option>
                            <option value="Out for Delivery">🚚 Out for Delivery</option>
                            <option value="Delivered">✅ Delivered to Customer</option>
                            <option value="Cancelled">❌ Cancelled</option>
                          </select>
                        </td>
                        <td className="p-4 text-right align-top">
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete order "${o.id}"?`)) {
                                deleteOrder(o.id || o._id)
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 ml-auto hover:underline"
                          >
                            <Trash2 size={13} /> Delete
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

            {/* MULTI-SEGMENT COUPON MANAGER */}
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-6 shadow-sm">
              <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  🎯 Segment Coupons (Minimum Spend, Discount Capping & Segment Targeting)
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Create customized promo codes with minimum order prices, maximum discount caps, and segment targeting.
                </p>
              </div>

              {/* Coupon Creation Form */}
              <form onSubmit={handleCreateCoupon} className="bg-[var(--color-bg)] p-5 border border-[var(--color-line)] space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--color-primary)]">➕ Create New Segment Coupon</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Coupon Promo Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VELVET30"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().trim() })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-mono font-bold uppercase bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Discount Type *</label>
                    <select
                      value={newCoupon.discountType}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="percentage">Percentage OFF (%)</option>
                      <option value="flat">Flat Amount OFF (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Discount Amount/Value *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 20 for 20% or 500 for ₹500"
                      value={newCoupon.discountValue}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Minimum Order Spend (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 = No Minimum Spend"
                      value={newCoupon.minOrderAmount}
                      onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="text-[0.62rem] text-[var(--color-ink-soft)] mt-0.5">Order subtotal must be at least this amount.</p>
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Maximum Discount Cap (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0 = No Cap (Uncapped)"
                      value={newCoupon.maxDiscountCap}
                      onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscountCap: Number(e.target.value) })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold bg-white focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="text-[0.62rem] text-[var(--color-ink-soft)] mt-0.5">Max discount limit (e.g. 500 = Max ₹500 OFF).</p>
                  </div>

                  <div>
                    <label className="block text-[0.7rem] font-bold uppercase mb-1">Target Segment / Category</label>
                    <select
                      value={newCoupon.targetSegment}
                      onChange={(e) => setNewCoupon({ ...newCoupon, targetSegment: e.target.value })}
                      className="w-full border border-[var(--color-line)] p-2.5 text-xs font-bold bg-white focus:outline-none focus:border-[var(--color-primary)]"
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
                  <label className="block text-[0.7rem] font-bold uppercase mb-1">Offer Title / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. 20% OFF Velvet Sculptures above ₹1,000 (Max ₹500 Cap)"
                    value={newCoupon.title}
                    onChange={(e) => setNewCoupon({ ...newCoupon, title: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 text-xs bg-white focus:outline-none focus:border-[var(--color-primary)]"
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

                  <button type="submit" className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider">
                    Add Segment Coupon
                  </button>
                </div>
              </form>

              {/* Segment Coupons Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Active Segment Coupons List ({coupons.length})</h3>
                {coupons.length === 0 ? (
                  <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-xs text-[var(--color-ink-soft)] font-mono">
                    No custom segment coupons created yet. Fill out the form above to add your first segment offer!
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[var(--color-line)]">
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
                              <span className={`px-2 py-0.5 text-[0.6rem] font-bold uppercase rounded border ${
                                c.isActive !== false ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}>
                                {c.isActive !== false ? 'Active' : 'Paused'}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => handleToggleCoupon(c)}
                                className={`text-[0.65rem] font-bold uppercase px-2 py-1 border ${
                                  c.isActive ? 'border-amber-400 text-amber-900 bg-amber-50' : 'border-emerald-400 text-emerald-900 bg-emerald-50'
                                }`}
                              >
                                {c.isActive ? 'Pause' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCoupon(c._id, c.code)}
                                className="text-rose-600 hover:text-rose-900 text-[0.65rem] font-bold uppercase"
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
                  Direct bespoke requests submitted by customers with custom reference photos.
                </p>
              </div>
              <span className="bg-[var(--color-primary)] text-white text-xs font-bold font-mono px-3 py-1.5 rounded-full self-start">
                {customRequests.length} Requests Received
              </span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customRequests.map((req) => {
                  const reqImages = Array.isArray(req.images) && req.images.length > 0
                    ? req.images
                    : (req.image ? [req.image] : [])
                  const mainPhoto = req.image || reqImages[0] || ''

                  return (
                    <div
                      key={req._id}
                      className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-4 shadow-sm relative flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-line)] pb-3">
                          <div>
                            <h3 className="font-bold text-base font-[var(--font-display)]">{req.name}</h3>
                            <p className="text-xs text-[var(--color-primary)] font-semibold">{req.email}</p>
                            {req.phone && <p className="text-[0.7rem] text-[var(--color-ink-soft)] font-mono">{req.phone}</p>}
                          </div>
                          <span className={`text-[0.62rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                            req.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : req.status === 'Approved'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : req.status === 'In Review'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {req.status || 'Pending'}
                          </span>
                        </div>

                        {/* Style Preference */}
                        <div>
                          <span className="eyebrow text-[0.65rem]">Preferred Style</span>
                          <p className="text-xs font-bold">{req.stylePreference || 'Custom Arrangement'}</p>
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
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: REGISTERED USER PROFILES */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
              <div>
                <h2 className="text-xl font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
                  <Users className="text-[var(--color-primary)]" size={20} /> Registered Customer Profiles
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
                  Real-time customer account profiles and contact details.
                </p>
              </div>
              <span className="bg-[var(--color-primary)] text-white text-xs font-bold font-mono px-3 py-1.5 rounded-full self-start">
                {users.length} Total Users
              </span>
            </div>

            {users.length === 0 ? (
              <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-card-bg)] p-12 text-center space-y-2">
                <Users size={32} className="mx-auto text-[var(--color-ink-soft)]" />
                <p className="font-bold uppercase text-sm">No Registered User Profiles Yet</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  When customers save their account profile on the storefront dashboard, their user details will appear here!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((u) => (
                  <div key={u._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-3">
                      <div className="w-12 h-12 rounded-full border border-[var(--color-line)] overflow-hidden bg-[var(--color-bg)] shrink-0 flex items-center justify-center">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-[var(--color-primary)]" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-base font-[var(--font-display)]">{u.name}</h3>
                        <p className="text-xs text-[var(--color-primary)] font-semibold">{u.email}</p>
                        {u.phone && <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-mono">{u.phone}</p>}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-[var(--color-ink-soft)]">
                      <p><strong>Shipping Address:</strong> {u.address || 'Not specified'}</p>
                      <p><strong>City & PIN:</strong> {u.city ? `${u.city} - ${u.pincode}` : 'Not specified'}</p>
                      <p className="font-mono text-[0.65rem] pt-1">Registered: {new Date(u.createdAt).toLocaleDateString()}</p>
                    </div>
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

      {/* ADD FLOWER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 max-w-4xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold font-[var(--font-display)] uppercase border-b border-[var(--color-line)] pb-3">Add New Flower Creation</h2>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
              
              {/* Left Column — Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase mb-1">Creation Title *</label>
                  <input
                    type="text"
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
                  <label className="block font-bold uppercase mb-1">Specimen Display Code *</label>
                  <input
                    type="text"
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
                  <label className="block font-bold uppercase mb-1">Collection Category *</label>
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
                  <label className="block font-bold uppercase mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
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
                    Photo Upload (Select Multiple Files) *
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
                  <label className="block font-bold uppercase mb-1">Creation Title *</label>
                  <input
                    type="text"
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
                  <label className="block font-bold uppercase mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
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
                  <label className="block font-bold uppercase mb-1">Collection Title *</label>
                  <input
                    type="text"
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
                  <label className="block font-bold uppercase mb-1">Category Slug (e.g. orchid-whispers)</label>
                  <input
                    type="text"
                    placeholder="e.g. orchid-whispers"
                    value={newCol.slug}
                    onChange={(e) => setNewCol({ ...newCol, slug: e.target.value })}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Description Blurb *</label>
                  <textarea
                    rows={3}
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
                    Collection Banner Photos (Select Multiple Files) *
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
    </div>
  )
}
