import { Link } from 'react-router-dom'

const IconInstagram = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)
const IconFacebook = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
    <path d="M15 8h-2a2 2 0 0 0-2 2v10M9 13h4" />
    <circle cx="12" cy="12" r="9" />
  </svg>
)
const IconTwitter = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
    <path d="M4 4l7.2 8.6L4.4 20H7l5.6-6.3L17 20h3l-7.5-9L19.5 4H17l-5.2 5.8L7 4H4z" />
  </svg>
)

export default function Footer() {
  return (
    <footer className="bg-[var(--color-primary)] text-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
        <div className="space-y-3">
          <p className="font-[var(--font-display)] text-2xl tracking-wider font-bold">Lily Charm</p>
          <p className="text-xs md:text-sm text-[var(--color-beige)]/90 leading-relaxed max-w-xs">
            Handcrafted velvet floral sculptures & botanical art, created to outlast every season.
          </p>
        </div>
        <div>
          <p className="eyebrow text-[var(--color-beige)] font-bold text-xs tracking-[0.2em] uppercase mb-4">Quick Links</p>
          <ul className="space-y-2 text-xs md:text-sm text-[var(--color-beige)]/85">
            <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
            <li><Link to="/shop" className="hover:text-white transition-colors">Shop Catalog</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">About Studio</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link to="/journal" className="hover:text-white transition-colors">Studio Journal</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-[var(--color-beige)] font-bold text-xs tracking-[0.2em] uppercase mb-4">Collections</p>
          <ul className="space-y-2 text-xs md:text-sm text-[var(--color-beige)]/85">
            <li><Link to="/collections" className="hover:text-white transition-colors">Velvet Lilies</Link></li>
            <li><Link to="/collections" className="hover:text-white transition-colors">Velvet Tulips</Link></li>
            <li><Link to="/collections" className="hover:text-white transition-colors">Golden Sunflowers</Link></li>
            <li><Link to="/collections" className="hover:text-white transition-colors">Heart Bouquets</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-[var(--color-beige)] font-bold text-xs tracking-[0.2em] uppercase mb-4">Connect</p>
          <div className="flex gap-4 mb-4">
            <a href="#" aria-label="Instagram" className="p-2 border border-white/20 rounded-full hover:border-white transition-colors"><IconInstagram /></a>
            <a href="#" aria-label="Facebook" className="p-2 border border-white/20 rounded-full hover:border-white transition-colors"><IconFacebook /></a>
            <a href="#" aria-label="Twitter" className="p-2 border border-white/20 rounded-full hover:border-white transition-colors"><IconTwitter /></a>
          </div>
          <p className="text-xs text-[var(--color-beige)]/70">
            Handcrafted with love by Keerthana Bapu.
          </p>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[var(--color-beige)]/80">
          <p>© {new Date().getFullYear()} Lily Charm. All rights reserved.</p>
          <Link to="/admin" className="opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1 font-mono text-[0.7rem] bg-black/20 px-3 py-1 rounded border border-white/10">
            🔒 Studio Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  )
}
