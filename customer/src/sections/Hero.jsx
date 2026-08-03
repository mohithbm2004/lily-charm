import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import TiltCard3D from '../components/TiltCard3D'

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 pt-6 md:pt-10 pb-12">
      <TiltCard3D intensity={8} className="w-full">
        <div className="relative border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.18)]">
          {/* Main Photo Frame with Perfect Aspect & Double Border */}
          <div className="relative h-[480px] md:h-[620px] w-full border border-[var(--color-line)] overflow-hidden bg-[var(--color-bg)]">
            <motion.img
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              src="/images/products/flower-10-1.jpg"
              alt="Handcrafting botanical floral arrangements by Lily Charm"
              className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            
            {/* 3D Floating Content Card (translateZ) */}
            <div
              style={{ transform: 'translateZ(45px)' }}
              className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 flex flex-col md:flex-row md:items-end justify-between gap-6 z-10"
            >
              <div className="bg-[var(--color-bg)]/95 backdrop-blur-md p-6 md:p-8 max-w-xl border border-[var(--color-line)] shadow-2xl space-y-3">
                <span className="eyebrow flex items-center gap-1.5 text-[var(--color-primary)] font-bold">
                  <Sparkles size={13} /> Botanical Atelier & Studio
                </span>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--color-ink)] leading-tight font-[var(--font-display)]">
                  Handcrafted Flowers That Last Forever
                </h1>
                <p className="text-[var(--color-ink-soft)] text-sm md:text-base leading-relaxed font-serif italic font-medium">
                  Made with love, inspired by creativity.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 w-full">
                  <Link to="/shop" className="btn-primary inline-flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform text-center">
                    EXPLORE SHOP <ArrowRight size={15} />
                  </Link>
                  <Link to="/about" className="btn-outline inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-center">
                    OUR STORY
                  </Link>
                </div>
              </div>

              {/* 3D Floating Badge */}
              <div
                style={{ transform: 'translateZ(60px)' }}
                className="hidden md:flex bg-[var(--color-primary)] text-white p-4 border border-white/20 shadow-xl flex-col items-center justify-center text-center w-28 h-28 rounded-full"
              >
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

