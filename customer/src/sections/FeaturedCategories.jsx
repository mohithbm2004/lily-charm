import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function FeaturedCategories() {
  const { products } = useStudio()

  if (!products || products.length === 0) return null

  const displayCards = products.slice(0, 3)

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {displayCards.map((p, i) => (
          <Reveal key={p.id || i} delay={i * 0.1}>
            <TiltCard3D intensity={12} className="h-full">
              <Link
                to={`/product/${p.id}`}
                className="group block border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3.5 shadow-md hover:shadow-2xl transition-all duration-500 h-full flex flex-col justify-between"
              >
                {/* Perfect 3D Image Frame */}
                <div className="relative overflow-hidden aspect-[4/4.5] border border-[var(--color-line)] bg-[var(--color-bg)] shadow-inner">
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

                {/* Bottom Label Button Strip with 3D translateZ */}
                <div
                  style={{ transform: 'translateZ(25px)' }}
                  className="mt-3.5 bg-[var(--color-bg)] border border-[var(--color-line)] py-3 px-4 flex items-center justify-center gap-2 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors duration-300 shadow-sm"
                >
                  <span className="text-[0.72rem] tracking-[0.24em] font-bold uppercase font-[var(--font-button)]">
                    {p.specimen || p.title} ⟶
                  </span>
                </div>
              </Link>
            </TiltCard3D>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

