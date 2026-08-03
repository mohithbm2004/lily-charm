import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'

export default function BestSellers() {
  const { products } = useStudio()
  const bestSellers = products.slice(0, 4)

  if (bestSellers.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
      <Reveal>
        <p className="eyebrow mb-3">Best Sellers</p>
        <h2 className="text-3xl md:text-4xl">Featured Handcrafted Creations</h2>
      </Reveal>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
        {bestSellers.map((p, i) => (
          <Reveal key={p.id || i} delay={i * 0.08}>
            <Link to={`/product/${p.id}`} className="block rounded-2xl overflow-hidden shadow-[0_18px_40px_-24px_rgba(43,43,43,0.35)] bg-white">
              <div className="aspect-square overflow-hidden bg-[var(--color-bg)]">
                {p.image ? (
                  <img src={p.image} alt={p.title} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Image</div>
                )}
              </div>
              <div className="p-5">
                <p className="font-[var(--font-display)] text-lg">{p.title}</p>
                <p className="text-sm text-[var(--color-ink-soft)] mt-1">{formatPrice(p.price)}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
