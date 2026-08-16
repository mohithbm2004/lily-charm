import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const { products, collections = [] } = useStudio()
  const [params, setParams] = useSearchParams()
  const activeCategory = params.get('category') || 'all'
  const [sort, setSort] = useState('featured')
  const [maxPrice, setMaxPrice] = useState(12000)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = products.filter((p) => (activeCategory === 'all' ? true : (p.category === activeCategory || p.category === activeCategory.toLowerCase())))
    list = list.filter((p) => p.price <= maxPrice)
    if (inStockOnly) list = list.filter((_, i) => i % 5 !== 4) // mock availability
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, activeCategory, sort, maxPrice, inStockOnly])

  const FilterPanel = (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="eyebrow mb-3 sm:mb-4">Category</p>
        <div className="space-y-2">
          <button
            onClick={() => { setParams({}); setFiltersOpen(false); }}
            className={`block text-xs sm:text-sm text-left ${activeCategory === 'all' ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-ink-soft)]'}`}
          >
            All Pieces
          </button>
          {collections.map((c) => {
            const catId = c.slug || c.id || c._id
            return (
              <button
                key={catId}
                onClick={() => { setParams({ category: catId }); setFiltersOpen(false); }}
                className={`block text-xs sm:text-sm text-left ${activeCategory === catId ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-ink-soft)]'}`}
              >
                {c.title}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3 sm:mb-4">Price up to ₹{maxPrice.toLocaleString('en-IN')}</p>
        <input
          type="range"
          min={2000}
          max={12000}
          step={500}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)] cursor-pointer"
        />
      </div>
      <div>
        <p className="eyebrow mb-3 sm:mb-4">Availability</p>
        <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[var(--color-primary)] cursor-pointer" />
          In stock only
        </label>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      <Reveal>
        <p className="eyebrow mb-2 sm:mb-3">Shop</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)]">The Full Collection</h1>
      </Reveal>

      {/* Mobile Filters Bar */}
      <div className="flex items-center justify-between mt-6 sm:mt-10 mb-6 md:hidden gap-3">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 text-xs sm:text-sm border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-full px-4 py-2 font-bold uppercase tracking-wider shadow-sm"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-xs sm:text-sm border border-[var(--color-line)] rounded-xl px-3 py-2 bg-[var(--color-bg)] font-semibold"
        >
          {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-12 mt-4 items-start">
        {/* Desktop Sidebar Filter */}
        <aside className="hidden md:block sticky top-28 bg-[var(--color-card-bg)]/50 p-6 border border-[var(--color-line)] rounded-3xl shadow-sm">
          {FilterPanel}
        </aside>

        <div>
          <div className="hidden md:flex justify-between items-center mb-8">
            <p className="text-sm text-[var(--color-ink-soft)] font-medium">{filtered.length} pieces</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm border border-[var(--color-line)] rounded-xl px-3 py-2 bg-transparent font-medium"
            >
              {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 gap-y-8 sm:gap-y-12">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 border border-dashed border-[var(--color-line)] rounded-2xl p-8">
              <p className="text-sm text-[var(--color-ink-soft)]">No pieces match those filters.</p>
              <button
                onClick={() => { setParams({}); setMaxPrice(12000); setInStockOnly(false); }}
                className="mt-4 btn-outline text-xs rounded-full"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[1100] bg-[var(--color-bg)] p-5 sm:p-6 overflow-y-auto md:hidden rounded-t-3xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-line)]">
            <p className="font-[var(--font-display)] text-xl font-bold uppercase">Filters</p>
            <button
              onClick={() => setFiltersOpen(false)}
              className="p-1.5 text-[var(--color-ink)] rounded-full hover:bg-black/5"
              aria-label="Close filters"
            >
              <X size={22} />
            </button>
          </div>
          {FilterPanel}
        </div>
      )}
    </div>
  )
}
