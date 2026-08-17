import { useState, useEffect } from 'react'
import { Star, X, CheckCircle2, Sparkles, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { API_URL } from '../config/api'
import { useScrollLock } from '../lib/useScrollLock'

export default function ReviewModal({ isOpen, onClose, defaultProductTitle = '', onSuccess }) {
  const { user } = useAuth()

  useScrollLock(isOpen)

  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [productTitle, setProductTitle] = useState(defaultProductTitle || 'Lily Charm Floral Creation')
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      if (user.name && !name) setName(user.name)
      if (user.email && !email) setEmail(user.email)
    }
  }, [user])

  useEffect(() => {
    if (defaultProductTitle) {
      setProductTitle(defaultProductTitle)
    }
  }, [defaultProductTitle])

  const [fieldErrors, setFieldErrors] = useState({})

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!name.trim()) errs.name = 'Please enter your name.'
    if (!comment.trim()) errs.comment = 'Please share your thoughts and review comments.'

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          rating,
          title: title.trim(),
          comment: comment.trim(),
          productTitle: productTitle.trim() || 'Lily Charm Floral Creation',
          userId: user?._id || undefined,
        }),
      })

      if (res.ok) {
        setIsSuccess(true)
        if (onSuccess) onSuccess()
      } else {
        const data = await res.json()
        setErrorMsg(data.message || 'Failed to submit review. Please try again.')
      }
    } catch (err) {
      console.error('Review submission error:', err)
      setErrorMsg('Connection error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsSuccess(false)
    setErrorMsg('')
    setTitle('')
    setComment('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--color-bg)] border border-[var(--color-line)] rounded-3xl p-4 sm:p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-4 sm:space-y-6 text-[var(--color-ink)] my-auto max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors p-1.5 rounded-full hover:bg-black/5"
          aria-label="Close review modal"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-300">
              <CheckCircle2 size={36} />
            </div>
            <span className="eyebrow block text-[var(--color-primary)] font-bold text-xs uppercase tracking-widest">
              Review Received
            </span>
            <h3 className="text-2xl font-bold font-[var(--font-display)] uppercase">
              Thank You for Your Feedback!
            </h3>
            <p className="text-xs md:text-sm text-[var(--color-ink-soft)] max-w-sm mx-auto leading-relaxed">
              Your feedback has been saved! Our studio artisans will review your story and feature it on our public storefront.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="btn-primary px-8 py-3 text-xs uppercase font-bold tracking-wider"
              >
                Close & Return to Store
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
              <span className="eyebrow flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.24em]">
                <Sparkles size={13} /> Customer Feedback & Review
              </span>
              <h2 className="text-2xl font-bold font-[var(--font-display)] uppercase">
                Share Your Experience
              </h2>
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                Tell us about your handcrafted floral creation, velvet bouquet, or keepsake frame.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Star Rating Selector */}
              <div>
                <label className="block font-bold uppercase mb-1.5 text-[var(--color-ink)]">
                  Overall Rating <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const filled = star <= (hoverRating || rating)
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            size={24}
                            className={filled ? 'text-amber-500 fill-amber-400' : 'text-stone-300'}
                          />
                        </button>
                      )
                    })}
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--color-primary)]">
                    {rating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase mb-1">
                    Your Name <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    aria-required="true"
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    className={`w-full border p-2.5 bg-[var(--color-card-bg)] text-xs font-medium focus:outline-none transition-colors ${
                      fieldErrors.name
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line)] focus:border-[var(--color-primary)]'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                      ⚠️ {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-card-bg)] text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              {/* Product Purchased / Creation Name */}
              <div>
                <label className="block font-bold uppercase mb-1">Creation Purchased / Custom Piece (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Velvet Lilies & Wildflowers, Golden Sunflowers, Custom Frame"
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-card-bg)] text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Headline / Title */}
              <div>
                <label className="block font-bold uppercase mb-1">Review Headline (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Truly breathtaking craftsmanship and lasting beauty!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-[var(--color-line)] p-2.5 bg-[var(--color-card-bg)] text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Detailed Review Comment */}
              <div>
                <label className="block font-bold uppercase mb-1">
                  Your Feedback & Story <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  aria-required="true"
                  placeholder="Share details about the quality, floral details, packaging, and unboxing experience..."
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value)
                    if (fieldErrors.comment) setFieldErrors((prev) => ({ ...prev, comment: '' }))
                  }}
                  className={`w-full border p-3 bg-[var(--color-card-bg)] text-xs leading-relaxed focus:outline-none transition-colors ${
                    fieldErrors.comment
                      ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                      : 'border-[var(--color-line)] focus:border-[var(--color-primary)]'
                  }`}
                />
                {fieldErrors.comment && (
                  <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                    ⚠️ {fieldErrors.comment}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-line)]">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="btn-outline px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Heart size={13} fill="currentColor" /> {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
