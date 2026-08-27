import { Link } from 'react-router-dom'
import { Sparkles, Heart, ArrowRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function BrandIntro() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-14 sm:py-20 md:py-28 w-full max-w-full">
      <div className="bg-[var(--color-card-bg)] rounded-3xl p-6 sm:p-10 md:p-16 luxury-shadow-md overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
          
          {/* Left Column: Editorial Photo Frame */}
          <div className="md:col-span-5 flex justify-center">
            <Reveal>
              <TiltCard3D intensity={5} className="w-full max-w-md">
                <div className="bg-[var(--color-bg)] rounded-2xl p-3 luxury-shadow-sm overflow-hidden">
                  <div className="relative overflow-hidden aspect-[4/5] bg-[var(--color-card-bg)] rounded-xl">
                    <img
                      src="/images/products/flower-crimson-velvet-bouquet.webp"
                      alt="Lily Charm Handcrafted Crimson Red Velvet Floral Bouquet"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 rounded-xl"
                    />
                    <div className="absolute top-3 left-3 bg-[var(--color-bg)]/90 backdrop-blur-md rounded-lg px-3 py-1.5 text-[0.6rem] font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                      Archival Atelier
                    </div>
                  </div>
                </div>
              </TiltCard3D>
            </Reveal>
          </div>

          {/* Right Column: Editorial Story & Quote */}
          <div className="md:col-span-7 space-y-5 sm:space-y-6">
            <Reveal delay={0.1}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0.5 shadow-sm overflow-hidden bg-white shrink-0">
                  <img
                    src="/images/logo.webp"
                    alt="Lily Charm Official Logo Seal"
                    loading="lazy"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <span className="eyebrow block text-[var(--color-brown)] font-bold text-[0.62rem] uppercase tracking-[0.28em] leading-tight">
                    OFFICIAL STUDIO SEAL
                  </span>
                  <span className="text-[0.58rem] sm:text-[0.62rem] tracking-[0.22em] uppercase font-sans text-[var(--color-ink-soft)] font-semibold block mt-0.5">
                    Floral Atelier by Keerthana Bapu
                  </span>
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal font-[var(--font-display)] tracking-tight text-[var(--color-ink)] leading-[1.12]">
                Where Creativity Blossoms Into Timeless Artistry
              </h2>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="p-6 border-l-2 border-[var(--color-primary)] bg-[var(--color-bg)]/90 rounded-r-2xl text-sm md:text-base leading-relaxed text-[var(--color-ink)] space-y-3 font-medium shadow-2xs">
                <p>
                  "Lily Charm is more than a brand—it's a story of love, patience, and everlasting botanical creations designed to outlast every season."
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal">
                Inspired by a childhood passion for fine crafts and named after a one-year-old who lovingly called me "Lily," every velvet floral sculpture and gift is meticulously composed to celebrate life's most precious memories.
              </p>
            </Reveal>

            <Reveal delay={0.25}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full">
                <Link to="/about" className="btn-primary inline-flex items-center justify-center gap-2 text-center whitespace-nowrap text-[0.68rem] py-3.5 px-6 rounded-xl">
                  <Heart size={14} fill="currentColor" /> OUR FULL STORY <ArrowRight size={14} />
                </Link>
                <Link to="/collections" className="btn-outline inline-flex items-center justify-center gap-2 text-center whitespace-nowrap text-[0.68rem] py-3 px-6 rounded-xl">
                  EXPLORE COLLECTIONS
                </Link>
              </div>
            </Reveal>

          </div>
        </div>
      </div>
    </section>
  )
}
