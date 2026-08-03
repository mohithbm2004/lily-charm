import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import Reveal from '../components/Reveal'

export default function FeaturedCategories() {
  const { products } = useStudio()

  if (!products || products.length === 0) return null

  const displayCards = products.slice(0, 3)

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayCards.map((p, i) => (
          <Reveal key={p.id || i} delay={i * 0.1}>
            <Link
              to={`/product/${p.id}`}
              className="group block border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3 hover:shadow-lg transition-all duration-300"
            >
              {/* Image Frame */}
              <div className="relative overflow-hidden aspect-[4/4.2] border border-[var(--color-line)] bg-[var(--color-bg)]">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)]">No Photo</div>
                )}
              </div>

              {/* Bottom Label Button Strip */}
              <div className="mt-3 bg-[var(--color-bg)] border border-[var(--color-line)] py-3 px-4 flex items-center justify-center gap-2 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors duration-300">
                <span className="text-[0.72rem] tracking-[0.24em] font-medium uppercase font-[var(--font-button)]">
                  {p.specimen || p.title} ⟶
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

