import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Upload, CheckCircle2, Search, Check, Ban, Link as LinkIcon, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useAlert } from '../context/AlertContext'
import { useStudio } from '../context/StudioContext'
import AuthModal from './AuthModal'
import { API_URL, RAZORPAY_KEY_ID } from '../config/api'

export default function CustomDesignModal({ isOpen, onClose }) {
  const { user, token } = useAuth()
  const { showAlert, showConfirm } = useAlert()
  const { shippingSettings } = useStudio()
  const [activeTab, setActiveTab] = useState('submit') // 'submit' | 'check-quotes'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('login')

  const isShippingEnabled = shippingSettings?.shippingFeeEnabled ?? true
  const standardShippingFee = shippingSettings?.standardShippingFee ?? 100
  const freeThreshold = shippingSettings?.freeShippingThreshold ?? 2500

  const getCustomOrderShipping = (price) => {
    if (!isShippingEnabled) return 0
    return (price || 0) >= freeThreshold ? 0 : standardShippingFee
  }

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    pincode: user?.pincode || '',
    stylePreference: 'Velvet Lilies & Wildflowers',
    notes: '',
  })

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || '',
        pincode: prev.pincode || user.pincode || '',
      }))
      setSearchEmail(user.email || '')
    }
  }, [user])
  const [selectedImages, setSelectedImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [pincodeStatus, setPincodeStatus] = useState({ loading: false, success: false, message: '' })

  // Quote Checking state
  const [searchEmail, setSearchEmail] = useState('')
  const [myRequests, setMyRequests] = useState([])
  const [isSearchingQuotes, setIsSearchingQuotes] = useState(false)
  const [acceptingId, setAcceptingId] = useState(null)
  const [acceptedSuccessDoc, setAcceptedSuccessDoc] = useState(null)

  const handlePincodeChange = async (e) => {
    const rawVal = e.target.value || ''
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 6)
    setFormData((prev) => ({ ...prev, pincode: digitsOnly }))

    if (errors.pincode) {
      setErrors((prev) => ({ ...prev, pincode: null }))
    }

    if (digitsOnly.length !== 6) {
      setPincodeStatus({
        loading: false,
        success: false,
        message: digitsOnly.length > 0 ? `PIN code must be 6 digits (${digitsOnly.length}/6)` : '',
      })
      return
    }

    // Auto-fetch location when exactly 6 digits are entered
    setPincodeStatus({ loading: true, success: false, message: '🔍 Fetching city & location...' })
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${digitsOnly}`)
      const data = await res.json()
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0]
        const city = postOffice.District || postOffice.Block || postOffice.Name || ''
        setFormData((prev) => ({
          ...prev,
          city: city || prev.city,
        }))
        if (errors.city) {
          setErrors((prev) => ({ ...prev, city: null }))
        }
        setPincodeStatus({
          loading: false,
          success: true,
          message: `📍 Auto-filled City: ${city}`,
        })
      } else {
        setPincodeStatus({
          loading: false,
          success: false,
          message: '⚠️ Invalid PIN code or postal data not found',
        })
      }
    } catch (err) {
      console.error('Pincode auto-fetch error in custom modal:', err)
      setPincodeStatus({ loading: false, success: false, message: '' })
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const readFiles = []
    let count = 0

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        readFiles.push(reader.result)
        count++
        if (count === files.length) {
          setSelectedImages((prev) => [...prev, ...readFiles])
          setErrors((prev) => ({ ...prev, image: null }))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user || !token) {
      setAuthInitialMode('login')
      setIsAuthModalOpen(true)
      return
    }

    const errs = {}
    if (!formData.name?.trim()) errs.name = 'Full Name is required!'
    if (!formData.email?.trim()) errs.email = 'Email Address is required!'
    if (!formData.address?.trim()) errs.address = 'Delivery Street Address is required!'
    if (!formData.city?.trim()) errs.city = 'City / District is required!'
    if (!formData.pincode?.trim()) {
      errs.pincode = 'PIN Code is required!'
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errs.pincode = 'Please enter a valid 6-digit PIN code'
    }
    if (selectedImages.length === 0) errs.image = 'Reference photo is required!'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        images: selectedImages,
        image: selectedImages[0] || '',
      }

      const res = await fetch(`${API_URL}/custom-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSubmittedSuccess(true)
        setSearchEmail(formData.email)
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.message || 'We could not send your request. Please try again.')
      }
    } catch (err) {
      console.error('Error submitting custom design request:', err)
      alert('Connection interrupted. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const fetchCustomerQuotes = async (emailToSearch) => {
    if (!emailToSearch || !emailToSearch.trim()) return
    setIsSearchingQuotes(true)
    try {
      const res = await fetch(`${API_URL}/custom-requests/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const allData = await res.json()
        const rawList = Array.isArray(allData) ? allData : []
        setMyRequests(rawList)
      }
    } catch (e) {
      console.error('Failed to search quotes:', e)
    } finally {
      setIsSearchingQuotes(false)
    }
  }

  const handleAcceptQuote = async (reqDoc) => {
    setAcceptingId(reqDoc._id)
    try {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        alert('Unable to load payment screen. Please check your internet connection and try again.')
        return
      }

      const shipping = getCustomOrderShipping(reqDoc.quotedPrice)
      const totalAmount = (reqDoc.quotedPrice || 0) + shipping

      // 1. Create a Razorpay order bound to this authenticated custom request.
      const rzpOrderRes = await fetch(`${API_URL}/custom-requests/${reqDoc._id}/create-razorpay-order`, {
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

      // 2. Open Razorpay Payment Gateway Modal
      const options = {
        key: rzpOrderData.key_id || RAZORPAY_KEY_ID,
        amount: rzpOrderData.amount,
        currency: 'INR',
        name: 'Lily Charm Flower Studio',
        description: `Payment for Custom Artwork Quote #${reqDoc._id.slice(-6)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || reqDoc.name || '',
          email: user?.email || reqDoc.email || '',
          contact: user?.phone || reqDoc.phone || '',
        },
        theme: { color: '#2B3925' },
        handler: async function (response) {
          try {
            const acceptRes = await fetch(`${API_URL}/custom-requests/${reqDoc._id}/accept`, {
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
                  name: reqDoc.name,
                  email: reqDoc.email,
                  phone: reqDoc.phone || '',
                  address: reqDoc.address || 'Bespoke Custom Address',
                  city: reqDoc.city || 'Bengaluru',
                  pincode: reqDoc.pincode || '560001',
                },
              }),
            })
            const data = await acceptRes.json()
            if (acceptRes.ok) {
              setAcceptedSuccessDoc(data.order)
              fetchCustomerQuotes(searchEmail || reqDoc.email)
            } else {
              alert(data.message || 'Unable to complete order confirmation. Please contact support.')
            }
          } catch (err) {
            console.error('Error recording payment:', err)
            alert('Connection interrupted. Please refresh to check your confirmed quote.')
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e) {
      console.error('Error accepting quote with Razorpay:', e)
      alert('Something went wrong starting payment. Please try again.')
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDeclineQuote = (reqDoc) => {
    showConfirm({
      title: 'Decline Price Quote',
      type: 'warning',
      message: `Are you sure you want to decline the custom design price quote of ${formatPrice(reqDoc.quotedPrice)}?`,
      confirmText: 'Decline Quote',
      cancelText: 'Keep Quote',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/custom-requests/${reqDoc._id}/decline`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          })
          showAlert({
            title: 'Quote Declined',
            type: 'info',
            message: 'Price quote has been declined.',
          })
          fetchCustomerQuotes(searchEmail || reqDoc.email)
        } catch (e) {
          console.error('Error declining quote:', e)
          showAlert({
            title: 'Error',
            type: 'error',
            message: 'Failed to decline price quote.',
          })
        }
      },
    })
  }

  const handleResetAndClose = () => {
    setSubmittedSuccess(false)
    setAcceptedSuccessDoc(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      pincode: '',
      stylePreference: 'Velvet Lilies & Wildflowers',
      notes: '',
    })
    setSelectedImages([])
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 z-[1200] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="border border-[var(--color-line)] bg-[var(--color-bg)] rounded-3xl p-4 sm:p-6 md:p-8 max-w-2xl w-full space-y-4 sm:space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative text-[var(--color-ink)]"
        >
          <button
            onClick={handleResetAndClose}
            className="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors p-1.5 z-10 rounded-full hover:bg-black/5"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          {/* Modal Header Tabs */}
          <div className="flex flex-col sm:flex-row border-b border-[var(--color-line)] gap-2 sm:gap-4 pt-1">
            <button
              onClick={() => setActiveTab('submit')}
              className={`pb-2 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-left sm:text-center ${
                activeTab === 'submit'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                  : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
            >
              ✨ 1. Request Custom Design
            </button>
            <button
              onClick={() => {
                setActiveTab('check-quotes')
                if (searchEmail) fetchCustomerQuotes(searchEmail)
              }}
              className={`pb-2 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 text-left sm:text-center ${
                activeTab === 'check-quotes'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                  : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
            >
              💰 2. Check Quotes & Orders
            </button>
          </div>

          {activeTab === 'submit' && (
            <>
              {submittedSuccess ? (
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 className="text-2xl font-bold font-[var(--font-display)] uppercase">Request Submitted!</h2>
                  <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto leading-relaxed">
                    Thank you, <strong className="text-[var(--color-ink)]">{formData.name}</strong>! Your reference photo and design request have been received by our studio.
                  </p>
                  <p className="text-xs text-[var(--color-primary)] font-semibold font-mono">
                    Our lead artisan will review your design and quote a price shortly! You can check your quote under the "Check Price Quotes" tab.
                  </p>
                  <div className="flex justify-center gap-3 pt-4">
                    <button
                      onClick={() => {
                        setActiveTab('check-quotes')
                        fetchCustomerQuotes(formData.email)
                      }}
                      className="btn-primary px-6 py-2.5 text-xs uppercase font-bold tracking-wider"
                    >
                      Check Price Quote Status
                    </button>
                    <button
                      onClick={handleResetAndClose}
                      className="btn-outline px-6 py-2.5 text-xs uppercase font-bold tracking-wider rounded-full"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!user && (
                    <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 sm:p-5 mb-4 text-xs text-[var(--color-ink)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                          <span>🌸</span> Please log in to request a custom quote.
                        </p>
                        <p className="text-[0.72rem] text-amber-900/80 leading-relaxed">
                          Sign in to save your bespoke floral request and track studio quote estimates.
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

                  <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold uppercase mb-1">
                        Your Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        aria-required="true"
                        placeholder="e.g. Eleanor Vance"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value })
                          if (e.target.value.trim()) setErrors((prev) => ({ ...prev, name: null }))
                        }}
                        className={`w-full border p-3 bg-[var(--color-card-bg)] transition-colors ${
                          errors.name ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-[var(--color-line)]'
                        }`}
                      />
                      {errors.name && <p className="text-[0.68rem] text-red-600 font-bold mt-1">⚠️ {errors.name}</p>}
                    </div>

                    <div>
                      <label className="block font-bold uppercase mb-1">
                        Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        aria-required="true"
                        placeholder="e.g. customer@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                          if (e.target.value.trim()) setErrors((prev) => ({ ...prev, email: null }))
                        }}
                        className={`w-full border p-3 bg-[var(--color-card-bg)] transition-colors ${
                          errors.email ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-[var(--color-line)]'
                        }`}
                      />
                      {errors.email && <p className="text-[0.68rem] text-red-600 font-bold mt-1">⚠️ {errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold uppercase mb-1">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full border border-[var(--color-line)] p-3 bg-[var(--color-card-bg)] font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase mb-1">Flower / Artwork Style</label>
                      <select
                        value={formData.stylePreference}
                        onChange={(e) => setFormData({ ...formData, stylePreference: e.target.value })}
                        className="w-full border border-[var(--color-line)] p-3 bg-[var(--color-card-bg)] font-semibold"
                      >
                        <option value="Velvet Lilies & Wildflowers">Velvet Lilies & Wildflowers</option>
                        <option value="Orchid Whispers Series">Orchid Whispers Series</option>
                        <option value="Preserved Resin Botanical Frame">Preserved Resin Botanical Frame</option>
                        <option value="Custom Bridal Bouquet Keepsake">Custom Bridal Bouquet Keepsake</option>
                        <option value="Other Bespoke Concept">Other Bespoke Concept</option>
                      </select>
                    </div>
                  </div>

                  {/* Delivery Shipping Address Fields */}
                  <div>
                    <label className="block font-bold uppercase mb-1">
                      Delivery Street Address <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      aria-required="true"
                      placeholder="e.g. Flat 402, Lotus Bloom Residences, 12th Main Rd"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value })
                        if (e.target.value.trim()) setErrors((prev) => ({ ...prev, address: null }))
                      }}
                      className={`w-full border p-3 bg-[var(--color-card-bg)] transition-colors ${
                        errors.address ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-[var(--color-line)]'
                      }`}
                    />
                    {errors.address && <p className="text-[0.68rem] text-red-600 font-bold mt-1">⚠️ {errors.address}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold uppercase mb-1">
                        City / District <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        aria-required="true"
                        placeholder="e.g. Bengaluru"
                        value={formData.city}
                        onChange={(e) => {
                          setFormData({ ...formData, city: e.target.value })
                          if (e.target.value.trim()) setErrors((prev) => ({ ...prev, city: null }))
                        }}
                        className={`w-full border p-3 bg-[var(--color-card-bg)] font-semibold transition-colors ${
                          errors.city ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-[var(--color-line)]'
                        }`}
                      />
                      {errors.city && <p className="text-[0.68rem] text-red-600 font-bold mt-1">⚠️ {errors.city}</p>}
                    </div>

                    <div>
                      <label className="block font-bold uppercase mb-1">
                        PIN Code <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        aria-required="true"
                        maxLength={6}
                        inputMode="numeric"
                        placeholder="e.g. 560001"
                        value={formData.pincode}
                        onChange={handlePincodeChange}
                        className={`w-full border p-3 bg-[var(--color-card-bg)] font-mono transition-colors ${
                          errors.pincode ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-[var(--color-line)]'
                        }`}
                      />
                      {errors.pincode && <p className="text-[0.68rem] text-red-600 font-bold mt-1">⚠️ {errors.pincode}</p>}
                      {pincodeStatus.message && (
                        <p
                          className={`text-[0.68rem] mt-1 font-mono flex items-center gap-1 ${
                            pincodeStatus.loading
                              ? 'text-[var(--color-primary)] font-semibold'
                              : pincodeStatus.success
                              ? 'text-emerald-700 font-bold'
                              : 'text-amber-800'
                          }`}
                        >
                          {pincodeStatus.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-1">Custom Design Instructions (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Describe specific colors, sizes, frame preferences, or special requests..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full border border-[var(--color-line)] p-3 bg-[var(--color-card-bg)]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase mb-1">
                      Upload Reference Image / Design Photo <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <div className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors bg-[var(--color-card-bg)] relative ${
                      errors.image ? 'border-red-500 bg-red-50/20' : 'border-[var(--color-line)] hover:border-[var(--color-primary)]'
                    }`}>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Upload size={24} className="mx-auto text-[var(--color-ink-soft)] mb-1" />
                      <p className="font-bold uppercase text-[0.72rem]">Click or Drag & Drop Reference Photos</p>
                      <p className="text-[0.65rem] text-[var(--color-ink-soft)]">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                    {errors.image && <p className="text-[0.68rem] text-rose-600 font-bold mt-1">⚠️ {errors.image}</p>}

                    {/* Thumbnail Previews */}
                    {selectedImages.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2.5 p-2.5 border border-[var(--color-line)] bg-[var(--color-card-bg)]">
                        {selectedImages.map((img, idx) => (
                          <div key={idx} className="relative group w-16 h-16 border border-[var(--color-line)] overflow-hidden shrink-0">
                            <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[0.55rem] font-bold opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-line)]">
                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      disabled={isSubmitting}
                      className="btn-outline px-6 py-2.5 font-bold uppercase tracking-wider text-[0.7rem] rounded-full"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary px-6 py-2.5 font-bold uppercase tracking-wider text-[0.7rem] flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Sparkles size={14} className="animate-spin" /> Uploading & Sending...
                        </>
                      ) : (
                        'Submit Custom Design Request'
                      )}
                    </button>
                  </div>
                </form>
                </>
              )}
            </>
          )}

          {/* TAB 2: CHECK PRICE QUOTES & ACCEPT ORDER */}
          {activeTab === 'check-quotes' && (
            <div className="space-y-6 text-xs">
              <div className="space-y-1">
                <h3 className="font-bold text-lg font-[var(--font-display)] uppercase">Check Your Custom Price Quotes</h3>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Enter your email address below to view your custom design requests, admin price quotes, and accept quotes to place your order.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  fetchCustomerQuotes(searchEmail)
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  placeholder="Enter your email (e.g. customer@example.com)..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  required
                  className="flex-1 border border-[var(--color-line)] p-3 bg-[var(--color-card-bg)] text-xs font-semibold"
                />
                <button type="submit" className="btn-primary px-6 py-3 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Search size={14} /> Search Quotes
                </button>
              </form>

              {acceptedSuccessDoc && (
                <div className="p-6 md:p-8 bg-[var(--color-bg)] border border-[var(--color-line)] text-center space-y-4 rounded shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-2xl font-bold font-[var(--font-display)] uppercase">ORDER CONFIRMED!</h3>
                  <p className="text-xs text-[var(--color-ink-soft)] max-w-sm mx-auto">
                    Thank you for your order, <strong className="text-[var(--color-ink)]">{acceptedSuccessDoc.shippingAddress?.name || searchEmail}</strong>! Your order number is{' '}
                    <strong className="text-[var(--color-primary)] font-mono">{acceptedSuccessDoc.orderNumber || acceptedSuccessDoc._id}</strong>.
                  </p>
                  <div className="bg-[var(--color-card-bg)] p-4 border border-[var(--color-line)] max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex justify-between border-b border-[var(--color-line)] pb-2 font-bold uppercase">
                      <span>Payment Status</span>
                      <span className="text-emerald-700 font-mono">PAID (RAZORPAY)</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span>Shipping To:</span>
                      <span className="font-semibold text-right">
                        {acceptedSuccessDoc.shippingAddress?.address}, {acceptedSuccessDoc.shippingAddress?.city} - {acceptedSuccessDoc.shippingAddress?.pincode}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[var(--color-line)] font-bold text-sm">
                      <span>Total Paid:</span>
                      <span className="text-[var(--color-primary)]">
                        {formatPrice(acceptedSuccessDoc.grandTotal ?? acceptedSuccessDoc.total ?? 0)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleResetAndClose()
                        navigate('/dashboard')
                      }}
                      className="btn-primary px-6 py-2.5 text-xs uppercase tracking-widest font-bold"
                    >
                      View in My Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleResetAndClose()
                        navigate('/shop')
                      }}
                      className="btn-outline px-6 py-2.5 text-xs uppercase tracking-widest font-bold"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}

              {isSearchingQuotes ? (
                <p className="text-center py-8 text-[var(--color-ink-soft)] font-mono">Finding your design quotes...</p>
              ) : myRequests.length === 0 ? (
                <div className="border border-dashed border-[var(--color-line)] p-8 text-center text-[var(--color-ink-soft)] space-y-1">
                  <p className="font-bold">No Custom Requests Found for this Email</p>
                  <p className="text-[0.7rem]">Submit a request using Tab 1 or search with another email.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {myRequests.map((req) => (
                    <div key={req._id} className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 space-y-3">
                      <div className="flex justify-between items-start border-b border-[var(--color-line)] pb-2">
                        <div>
                          <h4 className="font-bold text-sm font-[var(--font-display)]">{req.stylePreference}</h4>
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Submitted: {req.createdAt && !isNaN(new Date(req.createdAt)) ? new Date(req.createdAt).toLocaleDateString() : 'Recently Submitted'}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider rounded border ${
                          req.status === 'Accepted & Order Created'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : req.status === 'Quoted'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 animate-pulse'
                            : req.status === 'Quote Declined'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {req.notes && <p className="text-xs text-[var(--color-ink-soft)] italic">"{req.notes}"</p>}

                      {/* Quoted Price Display & Acceptance Actions */}
                      {req.status === 'Quoted' && req.quotedPrice > 0 && (() => {
                        const quoteShipping = getCustomOrderShipping(req.quotedPrice)
                        const quoteTotal = (req.quotedPrice || 0) + quoteShipping
                        return (
                          <div className="p-3 bg-amber-50/80 border border-amber-200 space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-[0.65rem] uppercase font-bold text-amber-900">Admin Quoted Price:</span>
                                <p className="text-lg font-bold text-emerald-800">{formatPrice(req.quotedPrice)}</p>
                                {quoteShipping > 0 ? (
                                  <p className="text-[0.68rem] text-amber-900 font-mono">+ {formatPrice(quoteShipping)} Standard Shipping (Total: <strong>{formatPrice(quoteTotal)}</strong>)</p>
                                ) : (
                                  <p className="text-[0.68rem] text-emerald-700 font-mono font-bold">✨ FREE Shipping (Total: {formatPrice(quoteTotal)})</p>
                                )}
                                {req.adminNotes && <p className="text-[0.68rem] text-amber-900 italic mt-0.5">{req.adminNotes}</p>}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleAcceptQuote(req)}
                                disabled={acceptingId === req._id}
                                className="btn-primary flex-1 py-2 text-[0.68rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                              >
                                <Check size={14} /> {acceptingId === req._id ? 'Placing Order...' : `Accept Quote & Pay (${formatPrice(quoteTotal)})`}
                              </button>
                              <button
                                onClick={() => handleDeclineQuote(req)}
                                className="border border-rose-300 text-rose-700 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-wider hover:bg-rose-50 flex items-center gap-1 rounded-full"
                              >
                                <Ban size={13} /> Decline Quote
                              </button>
                            </div>
                          </div>
                        )
                      })()}

                      {req.status === 'Accepted & Order Created' && (
                        <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold space-y-2">
                          <p className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-700" /> Quote Accepted & Converted to Order! Total: {formatPrice(req.quotedPrice)}
                          </p>
                          <Link
                            to="/dashboard"
                            onClick={onClose}
                            className="btn-primary py-2 px-4 text-[0.65rem] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                          >
                            <Package size={13} /> View Order in My Orders Tab ➔
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authInitialMode}
        customNotice="Please log in to request a custom quote."
        onSuccess={(loggedInUser) => {
          setFormData((prev) => ({
            ...prev,
            name: loggedInUser.name || prev.name,
            email: loggedInUser.email || prev.email,
            phone: loggedInUser.phone || prev.phone,
            address: loggedInUser.address || prev.address,
            city: loggedInUser.city || prev.city,
            pincode: loggedInUser.pincode || prev.pincode,
          }))
          setSearchEmail(loggedInUser.email || '')
          setIsAuthModalOpen(false)
        }}
      />
    </AnimatePresence>
  )
}
