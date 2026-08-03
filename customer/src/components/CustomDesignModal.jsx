import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Upload, CheckCircle2, Search, Check, Ban } from 'lucide-react'
import { formatPrice } from '../lib/format'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function CustomDesignModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('submit') // 'submit' | 'check-quotes'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    stylePreference: 'Velvet Lilies & Wildflowers',
    notes: '',
  })
  const [selectedImages, setSelectedImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  // Quote Checking state
  const [searchEmail, setSearchEmail] = useState('')
  const [myRequests, setMyRequests] = useState([])
  const [isSearchingQuotes, setIsSearchingQuotes] = useState(false)
  const [acceptingId, setAcceptingId] = useState(null)
  const [acceptedSuccessDoc, setAcceptedSuccessDoc] = useState(null)

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
    const errs = {}
    if (!formData.name.trim()) errs.name = 'Full Name is required!'
    if (!formData.email.trim()) errs.email = 'Email Address is required!'
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSubmittedSuccess(true)
        setSearchEmail(formData.email)
      } else {
        const errText = await res.text()
        console.error('Failed to submit custom request:', res.status, errText)
        alert('Failed to submit request. Please try again.')
      }
    } catch (err) {
      console.error('Error submitting custom design request:', err)
      alert('Connection error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchCustomerQuotes = async (emailToSearch) => {
    if (!emailToSearch || !emailToSearch.trim()) return
    setIsSearchingQuotes(true)
    try {
      const res = await fetch(`${API_URL}/custom-requests`)
      if (res.ok) {
        const allData = await res.json()
        const filtered = allData.filter(
          (r) => r.email.toLowerCase().trim() === emailToSearch.toLowerCase().trim()
        )
        setMyRequests(filtered)
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
      const res = await fetch(`${API_URL}/custom-requests/${reqDoc._id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

      if (res.ok) {
        const data = await res.json()
        setAcceptedSuccessDoc(data.order)
        fetchCustomerQuotes(searchEmail || reqDoc.email)
      } else {
        alert('Failed to accept quote. Please try again.')
      }
    } catch (e) {
      console.error('Error accepting quote:', e)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleDeclineQuote = async (reqDoc) => {
    if (!confirm('Are you sure you want to decline this price quote?')) return
    try {
      await fetch(`${API_URL}/custom-requests/${reqDoc._id}/decline`, {
        method: 'PATCH',
      })
      fetchCustomerQuotes(searchEmail || reqDoc.email)
    } catch (e) {
      console.error('Error declining quote:', e)
    }
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
      <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="border border-[var(--color-line)] bg-[var(--color-bg)] p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl relative text-[var(--color-ink)]"
        >
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 right-5 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors p-1 z-10"
          >
            <X size={20} />
          </button>

          {/* Modal Header Tabs */}
          <div className="flex border-b border-[var(--color-line)] gap-4 pt-1">
            <button
              onClick={() => setActiveTab('submit')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
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
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'check-quotes'
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                  : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`}
            >
              💰 2. Check Price Quotes & Accept Orders
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
                    Thank you, <strong className="text-[var(--color-ink)]">{formData.name}</strong>! Your reference photo has been uploaded to Cloudinary & saved to our studio database.
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
                      className="border border-[var(--color-line)] px-6 py-2.5 text-xs uppercase font-bold tracking-wider"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold uppercase mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Keerthana Bapu"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value })
                          if (e.target.value.trim()) setErrors((prev) => ({ ...prev, name: null }))
                        }}
                        className={`w-full border p-3 bg-[var(--color-card-bg)] transition-colors ${
                          errors.name ? 'border-rose-500 bg-rose-50/20 text-rose-900' : 'border-[var(--color-line)]'
                        }`}
                      />
                      {errors.name && <p className="text-[0.68rem] text-rose-600 font-bold mt-1">⚠️ {errors.name}</p>}
                    </div>

                    <div>
                      <label className="block font-bold uppercase mb-1">Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. keerthana@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                          if (e.target.value.trim()) setErrors((prev) => ({ ...prev, email: null }))
                        }}
                        className={`w-full border p-3 bg-[var(--color-card-bg)] transition-colors ${
                          errors.email ? 'border-rose-500 bg-rose-50/20 text-rose-900' : 'border-[var(--color-line)]'
                        }`}
                      />
                      {errors.email && <p className="text-[0.68rem] text-rose-600 font-bold mt-1">⚠️ {errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold uppercase mb-1">Phone Number</label>
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

                  <div>
                    <label className="block font-bold uppercase mb-1">Custom Design Instructions & Color Requirements</label>
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
                      Upload Reference Image / Design Photo (From File Explorer) *
                    </label>
                    <div className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors bg-[var(--color-card-bg)] relative ${
                      errors.image ? 'border-rose-500 bg-rose-50/20' : 'border-[var(--color-line)] hover:border-[var(--color-primary)]'
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
                      <p className="text-[0.65rem] text-[var(--color-ink-soft)]">PNG, JPG, WEBP up to 10MB (Uploaded to Cloudinary)</p>
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
                      className="px-5 py-2.5 border border-[var(--color-line)] hover:bg-[var(--color-card-bg)] font-bold uppercase tracking-wider text-[0.7rem]"
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
                          <Sparkles size={14} className="animate-spin" /> Uploading to Cloudinary & Sending...
                        </>
                      ) : (
                        'Submit Custom Design Request'
                      )}
                    </button>
                  </div>
                </form>
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
                  placeholder="Enter your email (e.g. keerthana@example.com)..."
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
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-2 rounded">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-700" /> Custom Order Placed Successfully!
                  </div>
                  <p className="text-xs">
                    Order Number: <strong className="font-mono text-emerald-800">{acceptedSuccessDoc.orderNumber || acceptedSuccessDoc._id}</strong> — Total: {formatPrice(acceptedSuccessDoc.total)}. Your order has been placed in MongoDB and sent directly to Admin Order Delivery Tracking!
                  </p>
                </div>
              )}

              {isSearchingQuotes ? (
                <p className="text-center py-8 text-[var(--color-ink-soft)] font-mono">Searching studio database for quotes...</p>
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
                          <p className="text-[0.68rem] text-[var(--color-ink-soft)]">Submitted: {new Date(req.createdAt).toLocaleDateString()}</p>
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
                      {req.status === 'Quoted' && req.quotedPrice > 0 && (
                        <div className="p-3 bg-amber-50/80 border border-amber-200 space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[0.65rem] uppercase font-bold text-amber-900">Admin Quoted Price:</span>
                              <p className="text-lg font-bold text-emerald-800">{formatPrice(req.quotedPrice)}</p>
                              {req.adminNotes && <p className="text-[0.68rem] text-amber-900 italic">{req.adminNotes}</p>}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAcceptQuote(req)}
                              disabled={acceptingId === req._id}
                              className="btn-primary flex-1 py-2 text-[0.68rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Check size={14} /> {acceptingId === req._id ? 'Placing Order...' : 'Accept Quote & Place Order'}
                            </button>
                            <button
                              onClick={() => handleDeclineQuote(req)}
                              className="border border-rose-300 text-rose-700 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-wider hover:bg-rose-50 flex items-center gap-1"
                            >
                              <Ban size={13} /> Decline Quote
                            </button>
                          </div>
                        </div>
                      )}

                      {req.status === 'Accepted & Order Created' && (
                        <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[0.68rem] font-bold flex items-center gap-2">
                          <CheckCircle2 size={14} /> Quote Accepted & Order Created in MongoDB Atlas! Total: {formatPrice(req.quotedPrice)}
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
    </AnimatePresence>
  )
}
