import { Link } from 'react-router-dom'
import { Sparkles, Heart, ArrowRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function BrandIntro() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16">
      <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-6 md:p-12 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-center">
          
          {/* Left Column: 3D Framed Photo */}
          <div className="md:col-span-5 flex justify-center">
            <Reveal>
              <TiltCard3D intensity={12} className="w-full max-w-md">
                <div className="border border-[var(--color-line)] bg-[var(--color-bg)] p-3 shadow-2xl">
                  <div className="relative overflow-hidden aspect-[4/4.8] border border-[var(--color-line)] bg-[var(--color-card-bg)]">
                    <img
                      src="/images/products/flower-crimson-velvet-bouquet.png"
                      alt="Lily Charm Handcrafted Crimson Red Velvet Floral Bouquet"
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-[var(--color-bg)]/90 backdrop-blur-sm border border-[var(--color-line)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--color-primary)]">
                      ✨ Handcrafted with Love
                    </div>
                  </div>
                </div>
              </TiltCard3D>
            </Reveal>
          </div>

          {/* Right Column: Welcome Message & Story */}
          <div className="md:col-span-7 space-y-6">
            <Reveal delay={0.1}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)]/40 p-0.5 shadow-md overflow-hidden bg-white shrink-0">
                  <img
                    src="/images/logo.png"
                    alt="Lily Charm Official Logo Seal"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <span className="eyebrow flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.24em] leading-tight">
                    <Sparkles size={13} /> Official Studio Seal
                  </span>
                  <span className="text-[0.62rem] tracking-[0.18em] uppercase font-serif text-[var(--color-ink-soft)] font-semibold block mt-0.5">
                    Floral Creations by Keerthana Bapu
                  </span>
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-[var(--font-display)] uppercase tracking-tight text-[var(--color-ink)] leading-tight pt-1">
                Where Creativity Blossoms Into Timeless Gifts
              </h2>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="p-5 border-l-4 border-[var(--color-primary)] bg-[var(--color-bg)] text-sm md:text-base leading-relaxed text-[var(--color-ink)] space-y-4 font-normal">
                <p>
                  Welcome to <strong>Lily Charm</strong>—where creativity blossoms into timeless gifts. Every bouquet is lovingly handcrafted to celebrate life's special moments.
                </p>
                <p>
                  Inspired by a childhood passion for art and named after a one-year-old who lovingly called me "Lily," <strong>Lily Charm is more than a brand—it's a story of creativity, love, and meaningful handmade creations that last forever.</strong>
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full">
                <Link to="/about" className="btn-primary inline-flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform text-center whitespace-nowrap">
                  <Heart size={14} fill="currentColor" /> OUR FULL STORY <ArrowRight size={15} />
                </Link>
                <Link to="/collections" className="btn-outline inline-flex items-center justify-center gap-2 hover:scale-105 transition-transform text-center whitespace-nowrap">
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
