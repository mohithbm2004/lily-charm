import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { galleryImages } from '../data/products'
import Reveal from '../components/Reveal'

export default function Gallery() {
  const [active, setActive] = useState(null)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-20 md:py-28 w-full max-w-full">
      <Reveal>
        <p className="eyebrow mb-2 sm:mb-3">Gallery</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl max-w-md font-bold font-[var(--font-display)]">Studio moments &amp; finished pieces</h2>
      </Reveal>
      <div className="columns-2 md:columns-3 gap-3 sm:gap-4 mt-8 sm:mt-14 [column-fill:balance]">
        {galleryImages.map((src, i) => (
          <Reveal key={src} delay={(i % 3) * 0.08} className="mb-3 sm:mb-4 break-inside-avoid">
            <button onClick={() => setActive(src)} className="block w-full group overflow-hidden border border-[var(--color-line)] bg-[var(--color-card-bg)]">
              <img
                src={src}
                alt="Studio and finished botanical artwork"
                loading="lazy"
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </button>
          </Reveal>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-4 sm:p-6"
          >
            <button className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white p-1" onClick={() => setActive(null)} aria-label="Close">
              <X size={26} strokeWidth={1.2} />
            </button>
            <motion.img
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={active}
              alt="Enlarged gallery view"
              className="max-h-[85vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
