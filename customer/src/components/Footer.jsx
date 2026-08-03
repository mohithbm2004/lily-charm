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
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <p className="font-[var(--font-display)] text-2xl mb-3">Lily Charm</p>
          <p className="text-sm text-[var(--color-beige)] leading-relaxed max-w-xs">
            Botanical art, hand pressed and cast, made to outlast the season it was cut in.
          </p>
        </div>
        <div>
          <p className="eyebrow text-[var(--color-beige)] mb-4">Quick Links</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:opacity-70">About</Link></li>
            <li><Link to="/journal" className="hover:opacity-70">Journal</Link></li>
            <li><Link to="/contact" className="hover:opacity-70">Contact</Link></li>
            <li><Link to="/dashboard" className="hover:opacity-70">Account</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-[var(--color-beige)] mb-4">Collections</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop?category=pressed" className="hover:opacity-70">Pressed Flower Frames</Link></li>
            <li><Link to="/shop?category=resin" className="hover:opacity-70">Resin Flower Art</Link></li>
            <li><Link to="/shop?category=wedding" className="hover:opacity-70">Wedding Collection</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-[var(--color-beige)] mb-4">Follow</p>
          <div className="flex gap-4">
            <a href="#" aria-label="Instagram" className="hover:opacity-70"><IconInstagram /></a>
            <a href="#" aria-label="Facebook" className="hover:opacity-70"><IconFacebook /></a>
            <a href="#" aria-label="Twitter" className="hover:opacity-70"><IconTwitter /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[var(--color-beige)]">
          <p>© {new Date().getFullYear()} Lily Charm. All rights reserved.</p>
          <Link to="/admin" className="opacity-70 hover:opacity-100 transition-opacity">
            🔒 Studio Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  )
}
