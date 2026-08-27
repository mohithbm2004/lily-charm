import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import TiltCard3D from '../components/TiltCard3D'

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 md:pt-8 pb-10 sm:pb-16 w-full max-w-full">
      <TiltCard3D intensity={4} className="w-full">
        {/* Main Editorial Hero Frame */}
        <div className="relative h-[540px] xs:h-[580px] sm:h-[620px] md:h-[680px] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[var(--color-bg)] luxury-shadow-lg">
          <motion.img
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
            src="/images/products/flower-10-1.webp"
            alt="Handcrafted botanical floral sculptures by Lily Charm"
            loading="eager"
            fetchpriority="high"
            className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out rounded-2xl sm:rounded-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 rounded-2xl sm:rounded-3xl" />
          
          {/* Floating Editorial Content Overlay */}
          <div className="absolute bottom-6 left-5 right-5 sm:bottom-10 sm:left-10 sm:right-10 md:bottom-14 md:left-14 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10">
            <div className="bg-[var(--color-bg)]/95 backdrop-blur-md p-6 sm:p-8 md:p-10 max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl space-y-3 sm:space-y-4 w-full md:w-auto">
              <span className="eyebrow flex items-center gap-2 text-[var(--color-primary)] font-bold text-[0.6rem] sm:text-[0.66rem] tracking-[0.28em]">
                <Sparkles size={12} className="shrink-0 text-amber-600" /> BOTANICAL ATELIER & STUDIO
              </span>
              <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-[var(--color-ink)] leading-[1.08] font-[var(--font-display)] break-words">
                Flowers, Thoughtfully Composed.
              </h1>
              <p className="text-[var(--color-ink-soft)] text-xs sm:text-sm md:text-base leading-relaxed font-serif italic font-medium max-w-md">
                Archival velvet sculptures &amp; everlasting botanical art, handcrafted to outlast every season.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 w-full">
                <Link
                  to="/shop"
                  className="btn-primary inline-flex items-center justify-center gap-2 text-center w-full sm:w-auto py-3.5 text-[0.68rem] sm:text-[0.72rem] rounded-xl"
                >
                  EXPLORE COLLECTION <ArrowRight size={14} />
                </Link>
                <Link
                  to="/about"
                  className="btn-outline inline-flex items-center justify-center gap-2 text-center w-full sm:w-auto py-3 text-[0.68rem] sm:text-[0.72rem] rounded-xl"
                >
                  OUR STORY
                </Link>
              </div>
            </div>

            {/* Quiet Luxury Emblem (Desktop) */}
            <div className="hidden md:flex bg-[var(--color-primary)]/90 backdrop-blur-md text-white p-5 border border-white/20 shadow-2xl flex-col items-center justify-center text-center w-32 h-32 rounded-full shrink-0">
              <span className="text-[0.55rem] uppercase tracking-[0.24em] font-bold text-[#F5E8D0]">100% Handcrafted</span>
              <span className="text-[0.7rem] font-serif italic font-medium mt-1 text-white/90">Archival Quality</span>
            </div>
          </div>
        </div>
      </TiltCard3D>
    </section>
  )
}
