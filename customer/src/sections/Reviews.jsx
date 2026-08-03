import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { reviews } from '../data/products'
import Reveal from '../components/Reveal'

export default function Reviews() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % reviews.length), 5000)
    return () => clearInterval(id)
  }, [])

  const review = reviews[index]

  return (
    <section className="bg-[var(--color-beige)]/30">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
        <Reveal>
          <p className="eyebrow mb-3">Customer Reviews</p>
          <h2 className="text-3xl md:text-4xl mb-14">Kept, framed, and still loved</h2>
        </Reveal>

        <div className="relative h-56">
          <AnimatePresence mode="wait">
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex flex-col items-center"
            >
              <div className="flex gap-1 text-[var(--color-primary)] mb-5">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="font-[var(--font-display)] text-xl md:text-2xl leading-snug max-w-xl">
                "{review.quote}"
              </p>
              <p className="text-sm text-[var(--color-ink-soft)] mt-5">{review.name}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {reviews.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setIndex(i)}
              aria-label={`Show review ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-[var(--color-primary)] w-5' : 'bg-[var(--color-line)]'}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
