import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import {
  Package,
  Truck,
  Tag,
  BarChart3,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Palette,
  Sparkles,
  Search,
  Check,
  Edit3,
  X,
  Lock,
  ExternalLink,
  ShieldCheck,
  LogOut,
  Upload
} from 'lucide-react'

export default function Admin() {
  const {
    products,
    orders,
    marqueeText,
    shippingSettings,
    addProduct,
    deleteProduct,
    updateProduct,
    updateOrderStatus,
    updateMarquee,
    updateShippingSettings,
  } = useStudio()

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

  // Authentication State
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('lilycharm_admin_unlocked') === 'true'
  })
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  const [activeTab, setActiveTab] = useState('products')
  const [showAddModal, setShowAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const [productSearch, setProductSearch] = useState('')

  const handleUnlock = (e) => {
    e?.preventDefault()
    if (pinInput === '1234' || pinInput === 'lily2026' || pinInput === '') {
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

  // Edit Product State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const handleStartEdit = (product) => {
    setEditingProduct({ ...product })
    setShowEditModal(true)
  }

  const handleEditImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setEditingProduct((prev) => ({ ...prev, image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (!editingProduct || !editingProduct.title) return
    updateProduct(editingProduct.id, {
      ...editingProduct,
      images: [editingProduct.image, ...(editingProduct.images?.slice(1) || [])],
    })
    setShowEditModal(false)
    setEditingProduct(null)
  }

  // New Product Form State
  const [newFlower, setNewFlower] = useState({
    title: '',
    specimen: `Flower ${products.length + 1}`,
    category: 'velvet-lilies',
    price: 3499,
    materials: 'Handcrafted velvet pipe cleaners, faux pearls, satin ribbon',
    dimensions: '35 cm height',
    image: '/images/products/flower-1-1.jpg',
  })

  // Marquee & Offer State
  const [tempMarquee, setTempMarquee] = useState(marqueeText)
  const [savedMarqueeMsg, setSavedMarqueeMsg] = useState(false)

  // Handlers
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewFlower((prev) => ({ ...prev, image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleAddSubmit = (e) => {
    e.preventDefault()
    if (!newFlower.title) return
    const id = `flower-${Date.now()}`
    addProduct({ ...newFlower, id, images: [newFlower.image] })
    setShowAddModal(false)
    setNewFlower({
      title: '',
      specimen: `Flower ${products.length + 2}`,
      category: 'velvet-lilies',
      price: 3499,
      materials: 'Handcrafted velvet pipe cleaners, faux pearls, satin ribbon',
      dimensions: '35 cm height',
      image: '/images/products/flower-1-1.jpg',
    })
  }

  const handleSaveMarquee = (e) => {
    e.preventDefault()
    updateMarquee(tempMarquee)
    setSavedMarqueeMsg(true)
    setTimeout(() => setSavedMarqueeMsg(false), 3000)
  }

  // Filtered Lists
  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.specimen.toLowerCase().includes(productSearch.toLowerCase())
  )

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'All') return true
    return o.orderStatus === statusFilter
  })

  // Summary Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'Handcrafting' || o.orderStatus === 'Pending').length

  // Lock Screen View
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] max-w-md w-full p-8 space-y-6 shadow-lg">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto flex items-center justify-center border border-[var(--color-line)]">
              <Lock size={24} />
            </div>
            <p className="eyebrow">Studio Management Access</p>
            <h1 className="text-2xl font-bold font-[var(--font-display)] uppercase text-[var(--color-ink)]">
              Lily Charm Admin Portal
            </h1>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Protected manager access to update products, offers, and delivery orders.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div>
              <label className="eyebrow block mb-1">Enter Studio Passcode / PIN</label>
              <input
                type="password"
                placeholder="Enter PIN (Default: 1234)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] font-mono text-center tracking-widest"
              />
              {pinError && (
                <p className="text-xs text-red-600 mt-1 text-center font-medium">Incorrect PIN. Try 1234 or click Unlock below.</p>
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
              ⚡ Quick One-Click Studio Unlock
            </button>
            <br />
            <RouterLink to="/" className="inline-block text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              ← Return to Customer Storefront
            </RouterLink>
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
              Lily Charm Studio Manager
            </span>
          </div>

          <div className="flex items-center gap-4">
            <RouterLink
              to="/"
              target="_blank"
              className="text-xs tracking-wider uppercase font-medium bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 border border-white/20 transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} /> Live Customer Site ↗
            </RouterLink>
            <button
              onClick={handleLock}
              className="text-xs tracking-wider uppercase font-medium bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut size={13} /> Lock Panel
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Dashboard Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10">
        {/* Studio Header Banner */}
        <Reveal>
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="eyebrow">Studio Management Panel</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-[var(--font-display)] uppercase text-[var(--color-ink)]">
                Welcome Back, Studio Manager!
              </h1>
              <p className="text-[var(--color-ink-soft)] text-sm mt-1">
                Manage your handcrafted flower catalog, update offers, and track delivery orders.
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-2 self-start md:self-auto"
            >
              <Plus size={16} /> Add New Flower Creation
            </button>
          </div>
        </Reveal>

      {/* Quick Summary Cards */}
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
          <p className="eyebrow mb-1">Crafting Queue</p>
          <p className="text-2xl font-bold font-[var(--font-display)] text-amber-700">
            {pendingOrdersCount} Orders
          </p>
          <p className="text-xs text-[var(--color-ink-soft)] mt-1">Needs Handcrafting</p>
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
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
              : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
        >
          <Truck size={15} /> 2. Order Delivery Tracking ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('offers')}
          className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'offers'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
              : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
        >
          <Tag size={15} /> 3. Header Marquee & Offers
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3.5 text-xs font-semibold tracking-[0.16em] uppercase flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'analytics'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-card-bg)]'
              : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
          }`}
        >
          <BarChart3 size={15} /> 4. Studio Insights
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
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search flower title or specimen code…"
                className="w-full pl-9 pr-4 py-2 text-xs border border-[var(--color-line)] bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2">
              <Plus size={14} /> Add New Flower Creation
            </button>
          </div>

          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg)] text-[0.68rem] uppercase tracking-[0.16em] text-[var(--color-ink-soft)] font-medium">
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Specimen</th>
                  <th className="py-3 px-4">Creation Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-bg)]/50 transition-colors">
                    <td className="py-3 px-4">
                      <img src={p.image} alt={p.title} className="w-12 h-14 object-cover border border-[var(--color-line)]" />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold">{p.specimen}</td>
                    <td className="py-3 px-4 font-semibold font-[var(--font-display)] text-base">{p.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 border border-[var(--color-line)] bg-[var(--color-bg)] text-[0.65rem] uppercase tracking-wider font-mono">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--color-primary)]">{formatPrice(p.price)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="p-1.5 border border-[var(--color-line)] bg-[var(--color-bg)] text-[var(--color-ink)] hover:bg-[var(--color-primary)] hover:text-white transition-colors mr-2 inline-flex items-center gap-1 text-xs font-medium"
                        title="Edit Creation Details"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${p.title}"?`)) {
                            deleteProduct(p.id)
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

      {/* TAB 2: ORDER TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-2">Filter Status:</span>
            {['All', 'Pending', 'Handcrafting', 'Packed & Dispatched', 'Delivered'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs tracking-wider uppercase border transition-colors ${
                  statusFilter === status
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-bg)] text-[var(--color-ink-soft)] border-[var(--color-line)] hover:border-[var(--color-ink)]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[var(--color-line)] pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{order.id}</span>
                      <span className="text-xs text-[var(--color-ink-soft)]">{order.date}</span>
                    </div>
                    <p className="font-bold text-lg font-[var(--font-display)] mt-0.5">{order.customerName}</p>
                  </div>

                  {/* Easy Order Status Changer for Keerthana */}
                  <div className="flex items-center gap-2">
                    <span className="eyebrow">Update Status:</span>
                    <select
                      value={order.orderStatus}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="border border-[var(--color-line)] bg-[var(--color-bg)] text-xs font-semibold px-3 py-2 focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="Pending">🟡 Pending</option>
                      <option value="Handcrafting">🎨 Handcrafting in Studio</option>
                      <option value="Packed & Dispatched">📦 Packed & Dispatched</option>
                      <option value="Delivered">✅ Delivered</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Delivery Info */}
                  <div className="md:col-span-5 space-y-2 text-xs text-[var(--color-ink-soft)] bg-[var(--color-bg)] p-4 border border-[var(--color-line)]">
                    <p className="eyebrow text-[var(--color-ink)] mb-2">Delivery Details</p>
                    <p><strong className="text-[var(--color-ink)]">Phone:</strong> {order.phone}</p>
                    <p><strong className="text-[var(--color-ink)]">Email:</strong> {order.email}</p>
                    <p><strong className="text-[var(--color-ink)]">Address:</strong> {order.address}, {order.city} - {order.pincode}</p>
                    <p><strong className="text-[var(--color-ink)]">Payment:</strong> {order.paymentMethod} ({order.paymentStatus})</p>
                  </div>

                  {/* Items List */}
                  <div className="md:col-span-7 space-y-3">
                    <p className="eyebrow text-[var(--color-ink)] mb-2">Ordered Flowers</p>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 border border-[var(--color-line)] bg-[var(--color-bg)] p-2">
                        <img src={item.image} alt={item.title} className="w-12 h-14 object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm font-[var(--font-display)]">{item.title}</p>
                          <p className="text-xs text-[var(--color-ink-soft)]">Qty: {item.qty}</p>
                        </div>
                        <p className="font-bold text-sm text-[var(--color-primary)] mr-2">{formatPrice(item.price * item.qty)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--color-line)]">
                      <span className="eyebrow text-[var(--color-ink)]">Total Order Amount:</span>
                      <span className="font-bold text-lg font-[var(--font-display)] text-[var(--color-primary)]">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OFFER & MARQUEE MANAGER */}
      {activeTab === 'offers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Header Marquee Ticker Editor */}
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--color-primary)]" />
              <h3 className="font-bold text-xl font-[var(--font-display)]">Top Header Marquee Announcement</h3>
            </div>
            <p className="text-xs text-[var(--color-ink-soft)]">
              This text scrolls continuously at the top of the website on every page.
            </p>
            <form onSubmit={handleSaveMarquee} className="space-y-4 pt-2">
              <textarea
                rows={4}
                value={tempMarquee}
                onChange={(e) => setTempMarquee(e.target.value)}
                className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] p-3 text-xs focus:outline-none focus:border-[var(--color-primary)] font-mono"
              />
              <div className="flex items-center justify-between">
                <button type="submit" className="btn-primary py-2.5 text-xs flex items-center gap-2">
                  <Check size={14} /> Update Announcement Bar
                </button>
                {savedMarqueeMsg && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Updated Live!
                  </span>
                )}
              </div>
            </form>
          </div>

          </div>

          {/* Shipping Fee & Free Delivery Threshold Manager */}
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-[var(--color-primary)]" />
              <h3 className="font-bold text-xl font-[var(--font-display)]">Shipping Fee & Free Delivery Threshold Settings</h3>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow block mb-1">Standard Shipping Charge (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={tempShipping.standardShippingFee}
                    onChange={(e) => setTempShipping({ ...tempShipping, standardShippingFee: Number(e.target.value) })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="e.g. 100"
                  />
                  <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">Charged on orders below free shipping threshold.</p>
                </div>

                <div>
                  <label className="eyebrow block mb-1">Free Shipping Threshold Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={tempShipping.freeShippingThreshold}
                    onChange={(e) => setTempShipping({ ...tempShipping, freeShippingThreshold: Number(e.target.value) })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] text-emerald-800"
                    placeholder="e.g. 2500"
                  />
                  <p className="text-[0.65rem] text-[var(--color-ink-soft)] mt-1">Orders at or above this subtotal get FREE delivery.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="submit" className="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 font-bold uppercase tracking-wider">
                  <Check size={14} /> Save Shipping Settings
                </button>
                {savedShippingMsg && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Shipping Settings Saved Live!
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-8 space-y-6">
          <h3 className="font-bold text-2xl font-[var(--font-display)]">Studio Performance Summary</h3>
          <p className="text-xs text-[var(--color-ink-soft)]">Most popular flower creation categories at Lily Charm.</p>
          <div className="space-y-4 pt-2">
            {[
              { label: 'Velvet Lilies', percent: 45, count: '14 Orders' },
              { label: 'Golden Sunflowers', percent: 30, count: '9 Orders' },
              { label: 'Heart Bouquets', percent: 15, count: '5 Orders' },
              { label: 'Velvet Tulips', percent: 10, count: '3 Orders' },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div className="w-full bg-[var(--color-bg)] h-3 border border-[var(--color-line)] overflow-hidden">
                  <div className="bg-[var(--color-primary)] h-full" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD NEW PRODUCT MODAL FOR KEERTHANA */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-line)] max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[var(--color-line)] pb-3">
              <h3 className="font-bold text-xl font-[var(--font-display)]">Add New Flower Creation</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:text-red-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="eyebrow block mb-1">Creation Title</label>
                <input
                  required
                  placeholder="e.g. Soft Lavender Velvet Lily"
                  value={newFlower.title}
                  onChange={(e) => setNewFlower({ ...newFlower, title: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow block mb-1">Specimen Code</label>
                  <input
                    required
                    value={newFlower.specimen}
                    onChange={(e) => setNewFlower({ ...newFlower, specimen: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="eyebrow block mb-1">Category</label>
                  <select
                    value={newFlower.category}
                    onChange={(e) => setNewFlower({ ...newFlower, category: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="velvet-lilies">Velvet Lilies</option>
                    <option value="velvet-tulips">Velvet Tulips</option>
                    <option value="sunflowers">Golden Sunflowers</option>
                    <option value="heart-bouquets">Heart Bouquets</option>
                    <option value="studio-baskets">Studio Baskets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={newFlower.price}
                  onChange={(e) => setNewFlower({ ...newFlower, price: Number(e.target.value) })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1">Creation Photo Image</label>
                
                {/* File Explorer Direct Upload Box */}
                <div className="border-2 border-dashed border-[var(--color-line)] bg-[var(--color-bg)] p-4 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                    <Upload size={22} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-[var(--font-button)]">
                      📁 Select Photo from Computer / Phone
                    </span>
                    <span className="text-[0.68rem] text-[var(--color-ink-soft)]">
                      Click to open File Explorer (JPG, PNG, WEBP)
                    </span>
                  </div>
                </div>

                {/* Optional Image URL Fallback */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[0.65rem] uppercase text-[var(--color-ink-soft)] font-mono">Or URL:</span>
                  <input
                    value={newFlower.image}
                    onChange={(e) => setNewFlower({ ...newFlower, image: e.target.value })}
                    placeholder="/images/products/flower-1-1.jpg"
                    className="flex-1 border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)] font-mono"
                  />
                </div>

                {/* Live Image Preview */}
                {newFlower.image && (
                  <div className="mt-3 border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] flex items-center gap-3">
                    <img src={newFlower.image} alt="Preview" className="w-14 h-16 object-cover border border-[var(--color-line)]" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Photo Ready to Publish
                      </p>
                      <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Selected from your device & ready for storefront.</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="eyebrow block mb-1">Materials Used</label>
                <input
                  value={newFlower.materials}
                  onChange={(e) => setNewFlower({ ...newFlower, materials: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1">Dimensions</label>
                <input
                  value={newFlower.dimensions}
                  onChange={(e) => setNewFlower({ ...newFlower, dimensions: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button type="submit" className="btn-primary w-full py-3 text-xs">
                  Publish Creation to Store
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline w-full py-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXISTING PRODUCT MODAL */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-line)] max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[var(--color-line)] pb-3">
              <h3 className="font-bold text-xl font-[var(--font-display)]">Edit Creation: {editingProduct.specimen}</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:text-red-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="eyebrow block mb-1">Creation Title</label>
                <input
                  required
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow block mb-1">Specimen Code</label>
                  <input
                    required
                    value={editingProduct.specimen}
                    onChange={(e) => setEditingProduct({ ...editingProduct, specimen: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)] font-mono"
                  />
                </div>
                <div>
                  <label className="eyebrow block mb-1">Category</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="velvet-lilies">Velvet Lilies</option>
                    <option value="velvet-tulips">Velvet Tulips</option>
                    <option value="sunflowers">Golden Sunflowers</option>
                    <option value="heart-bouquets">Heart Bouquets</option>
                    <option value="studio-baskets">Studio Baskets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)] font-bold text-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1">Update Creation Photo</label>
                
                {/* File Explorer Direct Upload Box */}
                <div className="border-2 border-dashed border-[var(--color-line)] bg-[var(--color-bg)] p-4 text-center hover:border-[var(--color-primary)] transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                    <Upload size={22} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-[var(--font-button)]">
                      📁 Select New Photo from Computer / Phone
                    </span>
                    <span className="text-[0.68rem] text-[var(--color-ink-soft)]">
                      Click to choose new photo (JPG, PNG, WEBP)
                    </span>
                  </div>
                </div>

                {/* Optional Image URL Fallback */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[0.65rem] uppercase text-[var(--color-ink-soft)] font-mono">Or URL:</span>
                  <input
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    className="flex-1 border border-[var(--color-line)] bg-[var(--color-bg)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)] font-mono"
                  />
                </div>

                {/* Live Image Preview */}
                {editingProduct.image && (
                  <div className="mt-3 border border-[var(--color-line)] p-2.5 bg-[var(--color-bg)] flex items-center gap-3">
                    <img src={editingProduct.image} alt="Preview" className="w-14 h-16 object-cover border border-[var(--color-line)]" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Photo Updated
                      </p>
                      <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Current photo preview for storefront.</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="eyebrow block mb-1">Materials Used</label>
                <input
                  value={editingProduct.materials}
                  onChange={(e) => setEditingProduct({ ...editingProduct, materials: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="eyebrow block mb-1">Dimensions</label>
                <input
                  value={editingProduct.dimensions}
                  onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button type="submit" className="btn-primary w-full py-3 text-xs">
                  Save & Update Creation
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-outline w-full py-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
