import { useStudio } from '../context/StudioContext'
import { Link } from 'react-router-dom'
import Reveal from '../components/Reveal'
import ProductCard from '../components/ProductCard'
import { ArrowRight } from 'lucide-react'

export default function BestSellers() {
  const { products } = useStudio()
  const bestSellers = products.slice(0, 4)

  if (bestSellers.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-16 md:py-24 w-full max-w-full">
      <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <p className="eyebrow mb-2 sm:mb-3">Studio Catalog</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)]">Featured Handcrafted Creations</h2>
        </div>
        <Link
          to="/shop"
          className="btn-outline self-start sm:self-auto text-[0.65rem] sm:text-[0.7rem] tracking-[0.2em] font-bold py-2.5 px-5 rounded-full inline-flex items-center gap-1.5 shrink-0"
        >
          VIEW FULL SHOP <ArrowRight size={13} />
        </Link>
      </Reveal>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
        {bestSellers.map((p, i) => (
          <ProductCard key={p.id || p._id || i} product={p} index={i} />
        ))}
      </div>
    </section>
  )
}
