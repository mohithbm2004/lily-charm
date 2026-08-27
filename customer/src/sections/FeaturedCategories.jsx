import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function FeaturedCategories() {
  const { products } = useStudio()

  if (!products || products.length === 0) return null

  const displayCards = products.slice(0, 3)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-24 w-full max-w-full">
      <Reveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <span className="eyebrow block mb-2 text-[var(--color-brown)] font-semibold tracking-[0.28em]">
              CURATED SELECTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal font-[var(--font-display)] tracking-tight text-[var(--color-ink)]">
              Signature Botanical Collections
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] font-serif italic max-w-xs">
            Handpicked velvet floral sculptures, thoughtfully arranged for enduring elegance.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        {displayCards.map((p, i) => (
          <Reveal key={p.id || i} delay={i * 0.1}>
            <TiltCard3D intensity={5} className="h-full w-full">
              <Link
                to={`/product/${p.id}`}
                className="group block bg-[var(--color-card-bg)] rounded-2xl p-4 luxury-shadow-sm hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between overflow-hidden"
              >
                {/* 3D Image Frame */}
                <div className="relative overflow-hidden aspect-[4/5] bg-[var(--color-bg)] rounded-xl">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Photo</div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-500 rounded-xl" />
                </div>

                {/* Bottom Label Strip */}
                <div
                  style={{ transform: 'translateZ(15px)' }}
                  className="mt-4 bg-[var(--color-bg)] rounded-xl py-3 px-4 flex items-center justify-between gap-2 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all duration-300"
                >
                  <span className="text-[0.68rem] tracking-[0.24em] font-bold uppercase font-[var(--font-button)] truncate">
                    {p.specimen || p.title}
                  </span>
                  <span className="text-xs transition-transform duration-300 group-hover:translate-x-1">⟶</span>
                </div>
              </Link>
            </TiltCard3D>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
