import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star, Sparkles, Edit3, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { reviews as defaultReviews } from '../data/products'
import Reveal from '../components/Reveal'
import ReviewModal from '../components/ReviewModal'
import { API_URL } from '../config/api'

export default function Reviews() {
  const [reviewsList, setReviewsList] = useState(defaultReviews)
  const [index, setIndex] = useState(0)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const fetchLiveReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/reviews`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setReviewsList(data)
          setIndex(0)
        }
      }
    } catch (e) {
      console.log('Using local reviews fallback')
    }
  }

  useEffect(() => {
    fetchLiveReviews()
  }, [])

  useEffect(() => {
    if (reviewsList.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % reviewsList.length)
    }, 6000)
    return () => clearInterval(id)
  }, [reviewsList.length])

  const review = reviewsList[index] || reviewsList[0] || {}

  const handlePrev = () => {
    setIndex((i) => (i - 1 + reviewsList.length) % reviewsList.length)
  }

  const handleNext = () => {
    setIndex((i) => (i + 1) % reviewsList.length)
  }

  return (
    <section className="bg-[var(--color-beige)]/40 border-y border-[var(--color-line)] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center">
        <Reveal>
          <div className="flex flex-col items-center gap-2 mb-4">
            <span className="eyebrow inline-flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.24em]">
              <Sparkles size={13} /> Real Customer Stories & Feedback
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-[var(--font-display)] text-[var(--color-ink)] uppercase tracking-tight">
              Kept, Framed, and Cherished
            </h2>
            <p className="text-xs md:text-sm text-[var(--color-ink-soft)] max-w-md mx-auto">
              Read how our everlasting handcrafted creations bring joy to homes and celebrate special memories.
            </p>
          </div>
        </Reveal>

        {/* Carousel Display Area */}
        <div className="relative min-h-[220px] md:min-h-[200px] flex items-center justify-center mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={review._id || review.id || index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center max-w-2xl px-4"
            >
              {/* Star Rating */}
              <div className="flex gap-1.5 text-amber-500 mb-4">
                {Array.from({ length: review.rating || 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
                ))}
              </div>

              {/* Review Title if present */}
              {review.title && (
                <h3 className="font-bold text-base md:text-lg font-[var(--font-display)] text-[var(--color-ink)] mb-2">
                  "{review.title}"
                </h3>
              )}

              {/* Review Comment / Quote */}
              <p className="font-[var(--font-display)] text-lg md:text-2xl leading-relaxed text-[var(--color-ink)] font-normal italic">
                "{review.comment || review.quote}"
              </p>

              {/* Reviewer Details */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-ink-soft)] font-medium">
                <strong className="text-[var(--color-ink)] font-bold text-sm">{review.name}</strong>
                {review.productTitle && (
                  <span className="text-[0.7rem] bg-[var(--color-bg)] border border-[var(--color-line)] px-2 py-0.5 rounded font-mono">
                    🌸 {review.productTitle}
                  </span>
                )}
                {review.isVerifiedBuyer !== false && (
                  <span className="inline-flex items-center gap-1 text-[0.68rem] text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                    <CheckCircle2 size={11} /> Verified Buyer
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Controls & Pagination Dots */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handlePrev}
            aria-label="Previous review"
            className="w-8 h-8 rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] hover:bg-[var(--color-primary)] hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex gap-2">
            {reviewsList.map((r, i) => (
              <button
                key={r._id || r.id || i}
                onClick={() => setIndex(i)}
                aria-label={`Show review ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'bg-[var(--color-primary)] w-6' : 'bg-[var(--color-line)]/40 w-2 hover:bg-[var(--color-line)]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            aria-label="Next review"
            className="w-8 h-8 rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] hover:bg-[var(--color-primary)] hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* "Write a Review" CTA Button */}
        <div className="pt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="btn-primary px-6 py-3 text-xs uppercase font-bold tracking-widest flex items-center gap-2 shadow-md hover:scale-105 transition-transform"
          >
            <Edit3 size={14} /> Write a Review & Share Feedback
          </button>
        </div>
      </div>

      {/* Review Modal Form */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSuccess={() => {
          fetchLiveReviews()
        }}
      />
    </section>
  )
}
