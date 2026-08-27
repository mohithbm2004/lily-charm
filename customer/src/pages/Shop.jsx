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
  const { products = [], collections = [], loading = false } = useStudio()
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
    let list = products.filter((p) => {
      if (activeCategory === 'all') return true
      const catLower = activeCategory.toLowerCase()
      const pCat = (p.category || '').toLowerCase()
      const pCatId = (p.category || '').toString()

      if (pCat === catLower || pCatId === activeCategory) return true

      const matchCol = collections.find(
        (c) => (c.slug || '').toLowerCase() === catLower ||
               (c.id || c._id || '').toString() === activeCategory ||
               (c.title || '').toLowerCase() === catLower
      )
      if (matchCol) {
        const colSlug = (matchCol.slug || '').toLowerCase()
        const colId = (matchCol.id || matchCol._id || '').toString()
        const colTitle = (matchCol.title || '').toLowerCase()
        return pCat === colSlug || pCatId === colId || pCat === colTitle
      }
      return false
    })
    list = list.filter((p) => (Number(p.price) || 0) <= maxPrice)
    if (inStockOnly) list = list.filter((p) => p.stock === undefined || p.stock > 0)
    if (sort === 'price-asc') list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
    if (sort === 'price-desc') list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
    return list
  }, [products, collections, activeCategory, sort, maxPrice, inStockOnly])

  const renderFilterPanel = (isMobile = false) => (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="eyebrow">Category</p>
          {activeCategory !== 'all' && (
            <button
              onClick={() => setParams({})}
              className="text-[0.68rem] text-[var(--color-primary)] font-bold hover:underline uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={() => {
              setParams({})
              if (!isMobile) setFiltersOpen(false)
            }}
            className={`block text-xs sm:text-sm text-left transition-colors cursor-pointer ${
              activeCategory === 'all' ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
            }`}
          >
            All Pieces
          </button>
          {collections.map((c) => {
            const catId = c.slug || c.id || c._id
            return (
              <button
                key={catId}
                onClick={() => {
                  setParams({ category: catId })
                  if (!isMobile) setFiltersOpen(false)
                }}
                className={`block text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                  activeCategory === catId ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                }`}
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
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="accent-[var(--color-primary)] cursor-pointer w-4 h-4 rounded"
          />
          <span>In stock only</span>
        </label>
      </div>

      {isMobile && (
        <div className="pt-6 border-t border-black/10 space-y-2.5">
          <button
            onClick={() => setFiltersOpen(false)}
            className="btn-primary w-full py-3.5 rounded-xl text-xs font-bold tracking-[0.16em] uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            Apply Filters ({filtered.length} {filtered.length === 1 ? 'Piece' : 'Pieces'})
          </button>
          {(activeCategory !== 'all' || selectedMaxPrice !== null || inStockOnly) && (
            <button
              onClick={() => {
                setParams({})
                setSelectedMaxPrice(null)
                setInStockOnly(false)
              }}
              className="btn-outline w-full py-2.5 rounded-xl text-[0.7rem] font-bold uppercase tracking-wider text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )

  const currentCollection = useMemo(() => {
    if (!activeCategory || activeCategory === 'all') return null
    const catLower = activeCategory.toLowerCase()
    return collections.find(
      (c) => (c.slug || '').toLowerCase() === catLower ||
             (c.id || c._id || '').toString() === activeCategory ||
             (c.title || '').toLowerCase() === catLower
    )
  }, [collections, activeCategory])

  const pageTitle = currentCollection ? currentCollection.title : (activeCategory !== 'all' ? (activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)) : 'The Full Collection')
  const pageEyebrow = activeCategory !== 'all' ? 'COLLECTION ARCHIVE' : 'STUDIO CATALOG'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-3 sm:pt-6 md:pt-8 pb-16 sm:pb-24 w-full max-w-full">
      <div className="sticky top-[89px] md:top-[105px] z-20 bg-[var(--color-bg)] opacity-100 py-2.5 sm:py-3.5 mb-4 sm:mb-6 border-b border-black/10 transition-all">
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                <span className="eyebrow text-[var(--color-brown)] tracking-[0.28em]">{pageEyebrow}</span>
                {activeCategory !== 'all' && (
                  <button
                    onClick={() => setParams({})}
                    className="text-[0.62rem] font-bold text-[var(--color-primary)] hover:underline uppercase tracking-wider bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full cursor-pointer"
                  >
                    ✕ View All
                  </button>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal font-[var(--font-display)] tracking-tight text-[var(--color-ink)]">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-xs sm:text-sm text-[var(--color-brown)] font-semibold uppercase tracking-wider font-mono">
                {loading && products.length === 0 ? 'Loading Catalog...' : `Showing ${filtered.length} Handcrafted Pieces`}
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

      {/* Mobile Filters Bar (Circled duplicate Featured sort removed) */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 md:hidden">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 text-xs sm:text-sm border border-black/15 bg-[var(--color-card-bg)] rounded-xl px-4 py-2.5 font-bold uppercase tracking-wider shadow-2xs cursor-pointer"
        >
          <SlidersHorizontal size={14} /> Filters
          {(activeCategory !== 'all' || selectedMaxPrice !== null || inStockOnly) && (
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 md:gap-12 items-start">
        {/* Desktop Sidebar Filter */}
        <aside className="hidden md:block sticky top-[190px] bg-[var(--color-card-bg)] p-6 rounded-2xl luxury-shadow-sm">
          {renderFilterPanel(false)}
        </aside>

        <div>
          {loading && products.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 gap-y-5 sm:gap-y-12">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-[var(--color-card-bg)] rounded-2xl p-3 sm:p-4 animate-pulse space-y-3">
                  <div className="aspect-[4/5] bg-black/5 rounded-xl" />
                  <div className="h-4 bg-black/5 rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-black/5 rounded w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6 gap-y-5 sm:gap-y-12">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 border border-dashed border-black/20 rounded-3xl p-8 bg-[var(--color-card-bg)]/40">
              <p className="text-sm text-[var(--color-ink-soft)] font-medium">No botanical creations match those criteria.</p>
              <button
                onClick={() => { setParams({}); setSelectedMaxPrice(null); setInStockOnly(false); }}
                className="mt-4 btn-outline text-xs rounded-full cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal with Apply Button */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[1100] bg-[var(--color-bg)] p-5 sm:p-6 overflow-y-auto md:hidden rounded-t-3xl shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-black/10">
              <p className="font-[var(--font-display)] text-xl font-bold uppercase">Filter Creations</p>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-1.5 text-[var(--color-ink)] rounded-full hover:bg-black/5 cursor-pointer"
                aria-label="Close filters"
              >
                <X size={22} />
              </button>
            </div>
            {renderFilterPanel(true)}
          </div>
        </div>
      )}
    </div>
  )
}
