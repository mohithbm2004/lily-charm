import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'
import { ArrowRight } from 'lucide-react'

export default function FeaturedCategories() {
  const { products } = useStudio()

  if (!products || products.length === 0) return null

  const displayCards = products.slice(0, 3)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 md:py-16 w-full max-w-full">
      <Reveal className="mb-6 sm:mb-10 text-center max-w-xl mx-auto">
        <span className="eyebrow block mb-1.5 text-[var(--color-primary)]">Curated Atelier Showcase</span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)]">
          Preserved Botanical Collections
        </h2>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-7">
        {displayCards.map((p, i) => (
          <Reveal key={p.id || i} delay={i * 0.1}>
            <TiltCard3D intensity={8} className="h-full w-full">
              <Link
                to={`/product/${p.id}`}
                className={`group block p-3.5 sm:p-4 shadow-md hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between ${i === 0 ? 'card-organic' : i === 1 ? 'card-rounded' : 'card-layered'
                  }`}
              >
                {/* 3D Photo Container */}
                <div className="relative overflow-hidden aspect-[4/4.5] rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)]">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Photo</div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500" />
                </div>

                {/* Bottom Label Button Strip */}
                <div
                  style={{ transform: 'translateZ(20px)' }}
                  className="mt-3.5 bg-[var(--color-bg)] border border-[var(--color-line)] py-3 px-4 rounded-xl flex items-center justify-between gap-2 group-hover:bg-[var(--color-primary)] group-hover:text-[#FAF8F5] transition-all duration-300 shadow-sm"
                >
                  <span className="text-[0.68rem] sm:text-[0.75rem] tracking-[0.2em] font-bold uppercase font-[var(--font-button)] truncate">
                    {p.specimen || p.title}
                  </span>
                  <ArrowRight size={14} className="shrink-0 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </TiltCard3D>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
