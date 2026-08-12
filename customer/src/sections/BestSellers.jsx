import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'

export default function BestSellers() {
  const { products } = useStudio()
  const bestSellers = products.slice(0, 4)

  if (bestSellers.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-20 md:py-28 w-full max-w-full">
      <Reveal>
        <p className="eyebrow mb-2 sm:mb-3">Best Sellers</p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)]">Featured Handcrafted Creations</h2>
      </Reveal>
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 mt-8 sm:mt-14">
        {bestSellers.map((p, i) => (
          <Reveal key={p.id || i} delay={i * 0.08}>
            <Link to={`/product/${p.id}`} className="block rounded-2xl overflow-hidden shadow-[0_18px_40px_-24px_rgba(43,43,43,0.35)] bg-white group h-full flex flex-col justify-between">
              <div className="aspect-square overflow-hidden bg-[var(--color-bg)]">
                {p.image ? (
                  <img src={p.image} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Image</div>
                )}
              </div>
              <div className="p-3.5 sm:p-5">
                <p className="font-[var(--font-display)] text-base sm:text-lg font-bold leading-snug line-clamp-2">{p.title}</p>
                <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] mt-1">{formatPrice(p.price)}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
