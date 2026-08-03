import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categories } from '../data/products'
import { useStudio } from '../context/StudioContext'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import { SlidersHorizontal, X } from 'lucide-react'

const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
]

export default function Shop() {
  const { products } = useStudio()
  const [params, setParams] = useSearchParams()
  const activeCategory = params.get('category') || 'all'
  const [sort, setSort] = useState('featured')
  const [maxPrice, setMaxPrice] = useState(12000)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = products.filter((p) => (activeCategory === 'all' ? true : p.category === activeCategory))
    list = list.filter((p) => p.price <= maxPrice)
    if (inStockOnly) list = list.filter((_, i) => i % 5 !== 4) // mock availability
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [activeCategory, sort, maxPrice, inStockOnly])

  const FilterPanel = (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-4">Category</p>
        <div className="space-y-2">
          <button
            onClick={() => setParams({})}
            className={`block text-sm ${activeCategory === 'all' ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-soft)]'}`}
          >
            All Pieces
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setParams({ category: c.id })}
              className={`block text-sm ${activeCategory === c.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-soft)]'}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-4">Price up to ₹{maxPrice.toLocaleString('en-IN')}</p>
        <input
          type="range"
          min={2000}
          max={12000}
          step={500}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)]"
        />
      </div>
      <div>
        <p className="eyebrow mb-4">Availability</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[var(--color-primary)]" />
          In stock only
        </label>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 pt-32 pb-24">
      <Reveal>
        <p className="eyebrow mb-3">Shop</p>
        <h1 className="text-3xl md:text-4xl">The Full Collection</h1>
      </Reveal>

      <div className="flex items-center justify-between mt-10 mb-6 md:hidden">
        <button onClick={() => setFiltersOpen(true)} className="flex items-center gap-2 text-sm">
          <SlidersHorizontal size={15} /> Filters
        </button>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-[var(--color-line)] px-3 py-2 bg-transparent">
          {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12 mt-4">
        <aside className="hidden md:block">{FilterPanel}</aside>

        <div>
          <div className="hidden md:flex justify-between items-center mb-8">
            <p className="text-sm text-[var(--color-ink-soft)]">{filtered.length} pieces</p>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-sm border border-[var(--color-line)] px-3 py-2 bg-transparent">
              {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
          {filtered.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">No pieces match those filters.</p>}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[70] bg-[var(--color-bg)] p-6 overflow-y-auto md:hidden">
          <div className="flex justify-between items-center mb-8">
            <p className="font-[var(--font-display)] text-xl">Filters</p>
            <button onClick={() => setFiltersOpen(false)}><X size={20} /></button>
          </div>
          {FilterPanel}
        </div>
      )}
    </div>
  )
}
