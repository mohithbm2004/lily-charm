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
  const { products = [], collections = [] } = useStudio()
  const [params, setParams] = useSearchParams()
  const activeCategory = params.get('category') || 'all'
  const [sort, setSort] = useState('featured')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Compute dynamic min & max prices from actual catalog products, rounded to clean figures
  const { catalogMinPrice, catalogMaxPrice } = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) {
      return { catalogMinPrice: 1000, catalogMaxPrice: 15000 }
    }
    const prices = products.map((p) => Number(p.price) || 0).filter((p) => p > 0)
    if (prices.length === 0) return { catalogMinPrice: 1000, catalogMaxPrice: 15000 }

    const rawMin = Math.min(...prices)
    const rawMax = Math.max(...prices)

    // Round min down to clean 500 multiple, round max up to clean 500/1000 multiple
    const roundedMin = Math.max(0, Math.floor(rawMin / 500) * 500)
    const roundedMax = Math.max(roundedMin + 1000, Math.ceil(rawMax / 500) * 500)

    return { catalogMinPrice: roundedMin, catalogMaxPrice: roundedMax }
  }, [products])

  const [selectedMaxPrice, setSelectedMaxPrice] = useState(null)
  const maxPrice = selectedMaxPrice !== null ? selectedMaxPrice : catalogMaxPrice

  const filtered = useMemo(() => {
    let list = products.filter((p) => (activeCategory === 'all' ? true : (p.category === activeCategory || p.category === activeCategory.toLowerCase())))
    list = list.filter((p) => (Number(p.price) || 0) <= maxPrice)
    if (inStockOnly) list = list.filter((p) => p.stock === undefined || p.stock > 0)
    if (sort === 'price-asc') list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    if (sort === 'price-desc') list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
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
          min={catalogMinPrice}
          max={catalogMaxPrice}
          step={1}
          value={maxPrice}
          onChange={(e) => setSelectedMaxPrice(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)] cursor-pointer"
        />
        <div className="flex justify-between text-[0.65rem] text-[var(--color-ink-soft)] font-mono mt-1">
          <span>₹{catalogMinPrice.toLocaleString('en-IN')}</span>
          <span>₹{catalogMaxPrice.toLocaleString('en-IN')}</span>
        </div>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-20 sm:pt-28 pb-16 sm:pb-24 w-full max-w-full">
      <div className="sticky top-[89px] md:top-[105px] z-20 bg-[var(--color-bg)] opacity-100 py-4 mb-8 border-b border-black/10 transition-all">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="eyebrow block mb-1 text-[var(--color-brown)] tracking-[0.28em]">STUDIO CATALOG</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal font-[var(--font-display)] tracking-tight text-[var(--color-ink)]">The Full Collection</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xs sm:text-sm text-[var(--color-brown)] font-semibold uppercase tracking-wider font-mono">
                Showing {filtered.length} Handcrafted Pieces
              </p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-xs sm:text-sm border border-black/15 rounded-xl px-3.5 py-2 bg-[var(--color-bg)] font-medium cursor-pointer shadow-2xs"
              >
                {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Mobile Filters Bar */}
      <div className="flex items-center justify-between mb-6 md:hidden gap-3">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 text-xs sm:text-sm border border-black/15 bg-[var(--color-card-bg)] rounded-xl px-4 py-2 font-bold uppercase tracking-wider shadow-2xs"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-xs sm:text-sm border border-black/15 rounded-xl px-3 py-2 bg-[var(--color-bg)] font-semibold"
        >
          {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 md:gap-12 items-start">
        {/* Desktop Sidebar Filter */}
        <aside className="hidden md:block sticky top-[190px] bg-[var(--color-card-bg)] p-6 rounded-2xl luxury-shadow-sm">
          {FilterPanel}
        </aside>

        <div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 gap-y-8 sm:gap-y-12">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 border border-dashed border-black/20 rounded-3xl p-8 bg-[var(--color-card-bg)]/40">
              <p className="text-sm text-[var(--color-ink-soft)] font-medium">No botanical creations match those criteria.</p>
              <button
                onClick={() => { setParams({}); setMaxPrice(12000); setInStockOnly(false); }}
                className="mt-4 btn-outline text-xs rounded-full cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[1100] bg-[var(--color-bg)] p-5 sm:p-6 overflow-y-auto md:hidden rounded-t-3xl shadow-2xl">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/10">
            <p className="font-[var(--font-display)] text-xl font-bold uppercase">Filter Creations</p>
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
