import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'

export default function FeaturedCollection() {
  const { products } = useStudio()

  if (products.length === 0) return null

  return (
    <section className="bg-[var(--color-beige)]/30 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-20 md:py-28">
        <Reveal className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2 sm:mb-3 font-[var(--font-button)]">Featured Collection</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)]">Handcrafted Creations</h2>
          </div>
          <Link to="/shop" className="text-xs sm:text-sm border-b border-[var(--color-ink)] pb-0.5 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors font-medium">
            View all
          </Link>
        </Reveal>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 gap-y-8 sm:gap-y-12 mt-8 sm:mt-14">
          {products.slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
