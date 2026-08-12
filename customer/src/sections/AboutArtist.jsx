import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function AboutArtist() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-24 w-full max-w-full">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Text Column */}
        <div className="md:col-span-6 space-y-4 sm:space-y-6">
          <Reveal>
            <span className="eyebrow block mb-1">Our Heritage & Story</span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold uppercase tracking-tight text-[var(--color-ink)] leading-tight font-[var(--font-display)]">
              A DREAM THAT GREW WITH ME
            </h2>
            <p className="text-sm sm:text-base font-serif italic font-bold text-[var(--color-primary)] mt-2">
              "Where childhood creativity blossomed into timeless artistry." ✨
            </p>
            <p className="text-[var(--color-ink-soft)] text-xs sm:text-sm md:text-base leading-relaxed max-w-lg mt-3">
              Lily Charm is more than a brand—it's a dream that grew with me. What began as a childhood passion for arts and crafts transformed into a business where every creation reflects love, patience, and creativity.
            </p>
            <p className="text-[var(--color-ink-soft)] text-xs sm:text-sm md:text-base leading-relaxed max-w-lg mt-2">
              Every everlasting flower and handcrafted gift is thoughtfully designed to celebrate life's most precious moments, creating timeless memories made to be treasured forever.
            </p>
            <div className="pt-3 sm:pt-4">
              <Link to="/about" className="btn-primary inline-flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform text-center w-full sm:w-auto text-xs py-3 rounded-full">
                READ OUR FULL STORY <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Right Arched Frame Image Column with 3D Tilt */}
        <div className="md:col-span-6 flex justify-center md:justify-end">
          <Reveal delay={0.15}>
            <TiltCard3D intensity={14} className="max-w-md w-full">
              <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-2.5 sm:p-3 shadow-xl overflow-hidden">
                <div className="relative overflow-hidden aspect-[4/5] arch-frame rounded-b-2xl border border-[var(--color-line)] bg-[var(--color-bg)]">
                  <img
                    src="/images/products/flower-crimson-velvet-bouquet.png"
                    alt="Lily Charm handcrafted crimson red velvet flower bouquet"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 rounded-b-2xl"
                  />
                </div>
              </div>
            </TiltCard3D>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
