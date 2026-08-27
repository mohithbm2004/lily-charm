import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Upload, CheckCircle2, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'
import { API_URL } from '../config/api'
import { useScrollLock } from '../lib/useScrollLock'

export default function CustomDesignModal({ isOpen, onClose }) {
  const { user, token } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('login')

  useScrollLock(isOpen)

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
    }
  }, [user])
  const [selectedImages, setSelectedImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [errors, setErrors] = useState({})
  const [pincodeStatus, setPincodeStatus] = useState({ loading: false, success: false, message: '' })

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
    setPincodeStatus({ loading: true, success: false, message: 'Fetching city & location...' })
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
          message: '',
        })
      } else {
        setPincodeStatus({
          loading: false,
          success: false,
          message: 'Invalid PIN code or postal data not found',
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

  const handleResetAndClose = () => {
    setSubmittedSuccess(false)
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

          {/* Modal Header */}
          <div className="border-b border-[var(--color-line)] pb-3 pt-1 pr-8">
            <div className="flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs uppercase tracking-widest mb-1 font-mono">
              <Sparkles size={13} /> Bespoke Floral Commissions
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] uppercase tracking-tight text-[var(--color-ink)]">
              Request Custom Design
            </h2>
            <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
              Submit your reference photos, preferred flower styles, and personalized notes for our artisans.
            </p>
          </div>

          {submittedSuccess ? (
            <div className="py-8 sm:py-10 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-[#212B1C]/10 text-[#212B1C] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 size={38} />
              </div>
              <div className="space-y-1">
                <span className="eyebrow text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] font-mono">
                  Bespoke Request Received
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)] uppercase">
                  Quote Request Submitted!
                </h2>
              </div>
              <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
                Thank you, <strong className="text-[var(--color-ink)]">{formData.name}</strong>! Your reference photos and custom design request have been sent directly to our atelier.
              </p>

              {/* Notice to check quote in Profile section */}
              <div className="p-4 bg-[var(--color-card-bg)] border border-[var(--color-line)] rounded-2xl text-left space-y-2 text-xs shadow-2xs">
                <p className="font-bold text-[var(--color-ink)] flex items-center gap-1.5 text-xs sm:text-sm">
                  <Sparkles size={15} className="text-[var(--color-primary)] shrink-0" /> Where to check your quote price:
                </p>
                <p className="text-[var(--color-ink-soft)] leading-relaxed text-xs">
                  Our lead artisan will review your design and provide a personalized price quote. <strong>You can view, track, and accept your price quote anytime in your Profile under the "Custom Price Quotes" section.</strong>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
                <Link
                  to="/dashboard?tab=Custom+Price+Quotes"
                  onClick={handleResetAndClose}
                  className="btn-primary !py-2.5 sm:!py-3 !px-5 text-[0.72rem] sm:text-xs uppercase font-semibold !tracking-wider rounded-xl shadow-sm text-center cursor-pointer"
                >
                  View Custom Quotes in Profile →
                </Link>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="btn-outline !py-2.5 sm:!py-3 !px-5 text-[0.72rem] sm:text-xs uppercase font-semibold !tracking-wider rounded-xl cursor-pointer"
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
                          <span>Studio Account:</span> Please log in to request a custom quote.
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
                      {errors.name && <p className="text-[0.68rem] text-red-600 font-bold mt-1">{errors.name}</p>}
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
                      {errors.email && <p className="text-[0.68rem] text-red-600 font-bold mt-1">{errors.email}</p>}
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
                    {errors.address && <p className="text-[0.68rem] text-red-600 font-bold mt-1">{errors.address}</p>}
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
                      {errors.city && <p className="text-[0.68rem] text-red-600 font-bold mt-1">{errors.city}</p>}
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
                      {errors.pincode && <p className="text-[0.68rem] text-red-600 font-bold mt-1">{errors.pincode}</p>}
                      {pincodeStatus.message && (
                        <p
                          className={`text-[0.68rem] mt-1.5 font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            pincodeStatus.loading
                              ? 'text-[var(--color-primary)] animate-pulse'
                              : pincodeStatus.success
                              ? 'text-[var(--color-ink)]'
                              : 'text-amber-800'
                          }`}
                        >
                          {pincodeStatus.success && <MapPin size={12} className="text-[var(--color-ink)] shrink-0" />}
                          <span>{pincodeStatus.message}</span>
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
                    {errors.image && <p className="text-[0.68rem] text-rose-600 font-bold mt-1">{errors.image}</p>}

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

                  <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-3.5 sm:pt-4 border-t border-[var(--color-line)]">
                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      disabled={isSubmitting}
                      className="btn-outline !py-2 sm:!py-2.5 !px-4 sm:!px-5 !text-[0.68rem] sm:!text-xs font-semibold uppercase !tracking-wider rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary !py-2 sm:!py-2.5 !px-4 sm:!px-5 !text-[0.68rem] sm:!text-xs font-semibold uppercase !tracking-wider rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all whitespace-nowrap"
                    >
                      {isSubmitting ? (
                        <>
                          <Sparkles size={13} className="animate-spin" /> Submitting...
                        </>
                      ) : (
                        <span>
                          Submit <span className="hidden sm:inline">Custom </span>Request
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </>
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
          setIsAuthModalOpen(false)
        }}
      />
    </AnimatePresence>
  )
}
