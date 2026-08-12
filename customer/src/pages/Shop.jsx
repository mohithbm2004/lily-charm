import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { categories } from '../data/products'
import { useStudio } from '../context/StudioContext'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import EmptyState from '../components/EmptyState'
import { SlidersHorizontal, X, Search, Flower2 } from 'lucide-react'

const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
]

export default function Shop() {
  const { products } = useStudio()
  const [params, setParams] = useSearchParams()
  const activeCategory = params.get('category') || 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState('featured')
  const [maxPrice, setMaxPrice] = useState(12000)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = useMemo(() => {
    let list = products.filter((p) => (activeCategory === 'all' ? true : p.category === activeCategory))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.specimen?.toLowerCase().includes(q))
    }
    list = list.filter((p) => p.price <= maxPrice)
    if (inStockOnly) list = list.filter((_, i) => i % 5 !== 4)
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, activeCategory, searchQuery, sort, maxPrice, inStockOnly])

  const FilterPanel = (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="eyebrow mb-3 sm:mb-4 text-[var(--color-primary)]">Categories</p>
        <div className="space-y-2">
          <button
            onClick={() => { setParams({}); setFiltersOpen(false); }}
            className={`block text-xs sm:text-sm text-left w-full py-1 transition-colors ${activeCategory === 'all' ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}
          >
            All Creations
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => { setParams({ category: c.id }); setFiltersOpen(false); }}
              className={`block text-xs sm:text-sm text-left w-full py-1 transition-colors ${activeCategory === c.id ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3 sm:mb-4 text-[var(--color-primary)]">Price up to ₹{maxPrice.toLocaleString('en-IN')}</p>
        <input
          type="range"
          min={2000}
          max={12000}
          step={500}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[var(--color-primary)] cursor-pointer"
        />
        <div className="flex justify-between text-[0.68rem] text-[var(--color-ink-soft)] font-mono mt-1">
          <span>₹2,000</span>
          <span>₹12,000</span>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3 sm:mb-4 text-[var(--color-primary)]">Availability</p>
        <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer select-none">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[var(--color-primary)] cursor-pointer rounded" />
          <span>In Stock Only</span>
        </label>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      <Reveal className="mb-6 sm:mb-8">
        <p className="eyebrow mb-2">Botanical Storefront</p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-[var(--font-display)]">The Full Collection</h1>
      </Reveal>

      {/* Search Bar & Mobile Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pressed flowers, frames, bouquets..."
            className="input-luxury pl-10 pr-9 py-2.5 text-xs sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <div className="flex items-center justify-between md:hidden gap-3">
          <button
            onClick={() => setFiltersOpen(true)}
            className="btn-outline flex items-center justify-center gap-2 text-xs py-2 px-4"
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-luxury text-xs py-2 px-3 bg-[var(--color-bg)] font-semibold max-w-[180px]"
          >
            {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-10 items-start">
        {/* Desktop Sidebar Filter Panel */}
        <aside className="hidden md:block sticky top-28 card-luxury p-6 border border-[var(--color-line)]">
          {FilterPanel}
        </aside>

        <div>
          <div className="hidden md:flex justify-between items-center mb-6">
            <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] font-medium font-mono">
              Showing {filtered.length} preserved creation{filtered.length !== 1 ? 's' : ''}
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-luxury text-xs sm:text-sm py-2 px-3 max-w-[200px] bg-transparent font-medium cursor-pointer"
            >
              {sortOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 gap-y-8">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>

          {filtered.length === 0 && (
            <EmptyState
              icon={Flower2}
              eyebrow="No Specimen Found"
              title="No pieces match your search"
              message="Try adjusting your filter selection or clear your search terms to explore our full botanical catalogue."
              actionText="Reset All Filters"
              onAction={() => {
                setParams({})
                setSearchQuery('')
                setMaxPrice(12000)
                setInStockOnly(false)
              }}
            />
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[1100] bg-[var(--color-bg)] p-5 sm:p-6 overflow-y-auto md:hidden">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-line)]">
            <p className="font-[var(--font-display)] text-xl font-bold uppercase">Filter Creations</p>
            <button
              onClick={() => setFiltersOpen(false)}
              className="p-1 text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors"
              aria-label="Close filters"
            >
              <X size={22} />
            </button>
          </div>
          {FilterPanel}
          <div className="pt-8">
            <button
              onClick={() => setFiltersOpen(false)}
              className="btn-primary w-full py-3 text-xs uppercase font-bold tracking-widest"
            >
              Show {filtered.length} Results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
