import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 pt-6 md:pt-10 pb-12">
      <div className="relative border border-[var(--color-line)] bg-[var(--color-card-bg)] overflow-hidden">
        <div className="relative h-[480px] md:h-[620px] w-full">
          <motion.img
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
            src="/images/products/flower-10-1.jpg"
            alt="Handcrafting botanical floral arrangements by Lily Charm"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/15" />
          
          <div className="absolute bottom-8 left-8 right-8 md:bottom-12 md:left-12 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
            <div className="bg-[var(--color-bg)]/90 backdrop-blur-md p-6 md:p-8 max-w-xl border border-[var(--color-line)]">
              <span className="eyebrow block mb-2">Botanical Atelier & Studio</span>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
                Handcrafted Preserved Floral Art
              </h1>
              <p className="text-[var(--color-ink-soft)] mt-3 text-sm md:text-base leading-relaxed">
                Artisanal blooms preserved at peak perfection — framed pressed florals, resin sculptures, and custom bridal keepsakes.
              </p>
              <div className="flex items-center gap-4 mt-6">
                <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
                  EXPLORE SHOP <ArrowRight size={15} />
                </Link>
                <Link to="/about" className="btn-outline inline-flex items-center gap-2">
                  OUR STORY
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

