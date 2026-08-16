import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'

const IconInstagram = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

export default function Footer() {
  const { collections = [] } = useStudio()

  return (
    <footer className="bg-[#212B1C] text-[#FAF7F2] border-t border-white/10 w-full max-w-full">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 ${collections && collections.length > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-8 sm:gap-12`}>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[#F5E8D0]/40 p-0.5 shadow-sm overflow-hidden bg-white shrink-0">
              <img
                src="/images/logo.png"
                alt="Lily Charm Official Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <p className="font-[var(--font-display)] text-xl sm:text-2xl tracking-widest uppercase font-bold text-[#F5E8D0] leading-tight">Lily Charm</p>
              <p className="text-[0.55rem] sm:text-[0.6rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-[#E2DACB] font-serif">Floral Creations by Keerthana Bapu</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#E2DACB] leading-relaxed max-w-xs font-normal">
            Handcrafted velvet floral sculptures & botanical art, created to outlast every season.
          </p>
        </div>
        <div>
          <p className="text-[#F5E8D0] font-bold text-xs tracking-[0.24em] uppercase mb-3 sm:mb-4 font-[var(--font-button)]">Quick Links</p>
          <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-[#FAF7F2]">
            <li><Link to="/" className="hover:text-[#F5E8D0] hover:underline underline-offset-4 transition-colors">Home</Link></li>
            <li><Link to="/shop" className="hover:text-[#F5E8D0] hover:underline underline-offset-4 transition-colors">Shop Catalog</Link></li>
            <li><Link to="/about" className="hover:text-[#F5E8D0] hover:underline underline-offset-4 transition-colors">About Studio</Link></li>
            <li><Link to="/contact" className="hover:text-[#F5E8D0] hover:underline underline-offset-4 transition-colors">Contact Us</Link></li>
            <li><Link to="/faq" className="hover:text-[#F5E8D0] hover:underline underline-offset-4 transition-colors">Studio FAQ</Link></li>
          </ul>
        </div>
        {collections && collections.length > 0 && (
          <div>
            <p className="text-[#F5E8D0] font-bold text-xs tracking-[0.24em] uppercase mb-3 sm:mb-4 font-[var(--font-button)]">Collections</p>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-[#FAF7F2]">
              {collections.map((col) => (
                <li key={col.id || col._id || col.slug}>
                  <Link
                    to={`/collections#${col.slug || col.id}`}
                    className="hover:text-[#F5E8D0] hover:underline underline-offset-4 transition-colors"
                  >
                    {col.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-[#F5E8D0] font-bold text-xs tracking-[0.24em] uppercase mb-3 sm:mb-4 font-[var(--font-button)]">Connect</p>
          <div className="mb-3 sm:mb-4">
            <a
              href="https://www.instagram.com/lily._charm?igsh=bnkwdWViMjlpMjA1"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Lily Charm on Instagram"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 border border-white/30 rounded-full hover:border-[#F5E8D0] hover:text-[#F5E8D0] hover:bg-white/5 transition-all text-xs font-semibold uppercase tracking-wider group"
            >
              <IconInstagram className="group-hover:scale-110 transition-transform" />
              <span>@lily._charm</span>
            </a>
          </div>
          <p className="text-xs text-[#E2DACB] font-medium">
            Handcrafted with love by Lily Charm Studio.
          </p>
        </div>
      </div>
      <div className="border-t border-white/15 bg-[#1B2317]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 text-xs text-[#E2DACB] font-medium">
          <p>© {new Date().getFullYear()} Lily Charm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
