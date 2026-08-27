import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="max-w-md w-full bg-[var(--color-card-bg)] border border-[var(--color-line)] p-8 sm:p-12 rounded-3xl shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto text-sm font-bold font-serif">
          LC
        </div>
        
        <div className="space-y-2">
          <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-primary)] font-mono">
            404 • Page Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)]">
            A Blooming Path Lost
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
            The page or creation you were seeking is not available. Explore our handcrafted bouquets and botanical collections.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/shop"
            className="flex-1 btn-primary py-3 px-5 rounded-full text-xs font-bold uppercase tracking-wider text-center"
          >
            Explore Shop
          </Link>
          <Link
            to="/"
            className="flex-1 btn-outline py-3 px-5 rounded-full text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={13} /> Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}
