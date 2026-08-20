import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import TiltCard3D from '../components/TiltCard3D'

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 md:pt-10 pb-8 sm:pb-12 w-full max-w-full">
      <TiltCard3D intensity={8} className="w-full">
        <div className="relative border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-2 sm:p-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.18)] w-full overflow-hidden">
          {/* Main Photo Frame with Perfect Aspect & Soft Rounded Edges */}
          <div className="relative h-[500px] xs:h-[520px] sm:h-[560px] md:h-[620px] w-full border border-[var(--color-line)] rounded-2xl overflow-hidden bg-[var(--color-bg)]">
            <motion.img
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              src="/images/products/flower-10-1.webp"
              alt="Handcrafting botanical floral arrangements by Lily Charm"
              loading="eager"
              fetchpriority="high"
              className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out rounded-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-2xl" />
            
            {/* Floating Content Card */}
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 md:bottom-10 md:left-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 z-10">
              <div className="bg-[var(--color-bg)]/95 p-4 sm:p-6 md:p-8 max-w-xl border border-[var(--color-line)] rounded-2xl shadow-2xl space-y-2 sm:space-y-3 w-full md:w-auto">
                <span className="eyebrow flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-[0.62rem] sm:text-[0.68rem]">
                  <Sparkles size={12} className="shrink-0" /> Botanical Atelier & Studio
                </span>
                <h1 className="text-2xl xs:text-3xl md:text-5xl font-bold tracking-tight text-[var(--color-ink)] leading-tight font-[var(--font-display)] break-words">
                  Handcrafted Flowers That Last Forever
                </h1>
                <p className="text-[var(--color-ink-soft)] text-xs sm:text-sm md:text-base leading-relaxed font-serif italic font-medium">
                  Made with love, inspired by creativity.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2 sm:pt-3 w-full">
                  <Link
                    to="/shop"
                    className="btn-primary inline-flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform text-center w-full sm:w-auto py-2.5 sm:py-3.5 text-[0.7rem] sm:text-[0.75rem] rounded-full"
                  >
                    EXPLORE SHOP <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/about"
                    className="btn-outline inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-center w-full sm:w-auto py-2.5 sm:py-3 text-[0.7rem] sm:text-[0.75rem] rounded-full"
                  >
                    OUR STORY
                  </Link>
                </div>
              </div>

              {/* Floating Badge (Desktop) */}
              <div className="hidden md:flex bg-[var(--color-primary)] text-white p-4 border border-white/20 shadow-xl flex-col items-center justify-center text-center w-28 h-28 rounded-full shrink-0">
                <span className="text-[0.6rem] uppercase tracking-widest font-bold">100% Handcrafted</span>
                <span className="text-xs font-serif font-bold mt-1">Archival Quality</span>
              </div>
            </div>
          </div>
        </div>
      </TiltCard3D>
    </section>
  )
}
