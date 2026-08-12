import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import TiltCard3D from '../components/TiltCard3D'

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-4 sm:pt-6 md:pt-10 pb-8 sm:pb-14 w-full max-w-full">
      <TiltCard3D intensity={5} className="w-full">
        <div className="card-rounded p-2.5 sm:p-4 shadow-xl relative w-full">

          {/* Main Photo Frame with Perfect Aspect & Border */}
          <div className="relative h-[500px] xs:h-[540px] sm:h-[580px] md:h-[640px] w-full rounded-2xl overflow-hidden bg-[var(--color-bg)] border border-[var(--color-line)]">
            <motion.img
              initial={{ scale: 1.06 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              src="/images/products/flower-10-1.jpg"
              alt="Handcrafted botanical floral arrangements by Lily Charm"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

            {/* Floating Editorial Campaign Card */}
            <div
              style={{ transform: 'translateZ(30px)' }}
              className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6 md:bottom-10 md:left-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 z-10"
            >
              <div className="card-luxury p-5 sm:p-7 md:p-9 max-w-xl shadow-2xl space-y-3 w-full md:w-auto border-2 border-[var(--color-gold)]/40 bg-[var(--color-bg)]/95 backdrop-blur-md">
                <span className="eyebrow flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-[0.62rem] sm:text-[0.68rem]">
                  <Sparkles size={13} className="text-[var(--color-gold)] shrink-0" />
                  Botanical Atelier &amp; Studio
                </span>

                <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-ink)] leading-[1.08] font-[var(--font-display)]">
                  Handcrafted Flowers That Last Forever
                </h1>

                <p className="text-[var(--color-ink-soft)] text-sm sm:text-base leading-relaxed font-serif italic font-medium">
                  Made with love, inspired by creativity.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full">
                  <Link
                    to="/shop"
                    className="btn-primary inline-flex items-center justify-center gap-2 shadow-md text-center w-full sm:w-auto py-3 px-6 text-xs"
                  >
                    <span>Explore Shop</span>
                    <ArrowRight size={15} />
                  </Link>

                  <Link
                    to="/about"
                    className="btn-secondary inline-flex items-center justify-center gap-2 text-center w-full sm:w-auto py-3 px-6 text-xs"
                  >
                    <span>Our Story</span>
                  </Link>
                </div>
              </div>

              {/* Floating Gold Specimen Badge (Desktop) */}
              <div
                style={{ transform: 'translateZ(45px)' }}
                className="hidden md:flex bg-[var(--color-primary)] text-[#FAF8F5] p-4 border-2 border-[var(--color-gold)] shadow-2xl flex-col items-center justify-center text-center w-32 h-32 rounded-full shrink-0"
              >
                <span className="text-[0.58rem] uppercase tracking-widest font-bold text-[var(--color-gold)]">100% Handcrafted</span>
                <span className="text-xs font-serif font-bold mt-1 text-[#FAF8F5]">Archival Quality</span>
              </div>
            </div>
          </div>
        </div>
      </TiltCard3D>
    </section>
  )
}
