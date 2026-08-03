import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Menu, X, Sparkles, User as UserIcon, LogOut } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useStudio } from '../context/StudioContext'
import { useAuth } from '../context/AuthContext'
import CustomDesignModal from './CustomDesignModal'
import AuthModal from './AuthModal'

const navLinks = [
  { to: '/', label: 'HOME' },
  { to: '/shop', label: 'SHOP' },
  { to: '/collections', label: 'COLLECTIONS' },
  { to: '/about', label: 'ABOUT' },
  { to: '/contact', label: 'CONTACT' },
  { to: '/journal', label: 'JOURNAL' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  const { count, openCart } = useCart()
  const { marqueeText } = useStudio()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const marqueeDisplay = Array(10).fill(marqueeText).join('   •   ')

  const handleAccountClick = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      setAuthMode('login')
      setIsAuthModalOpen(true)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--color-bg)] transition-shadow duration-300">
        {/* Top Main Navigation */}
        <div className="border-b border-[var(--color-line)] bg-[var(--color-bg)]">
          <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 md:h-20 flex items-center justify-between gap-4">
            
            {/* Left Nav Links */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 flex-1">
              {navLinks.slice(0, 3).map((l) => (
                <NavLink
                  key={l.label}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) =>
                    `text-[0.72rem] tracking-[0.2em] uppercase font-[var(--font-button)] font-medium transition-colors ${
                      isActive ? 'text-[var(--color-primary)] font-bold underline underline-offset-4' : 'text-[var(--color-ink)] hover:text-[var(--color-primary)]'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            {/* Center Brand Title */}
            <Link
              to="/"
              className="font-[var(--font-display)] text-2xl md:text-3xl tracking-[0.2em] uppercase font-bold text-[var(--color-ink)] shrink-0 hover:opacity-85 transition-opacity py-2"
            >
              Lily Charm
            </Link>

            {/* Right Nav Links & Actions */}
            <div className="hidden lg:flex items-center gap-5 xl:gap-6 flex-1 justify-end">
              {navLinks.slice(3).map((l) => (
                <NavLink
                  key={l.label}
                  to={l.to}
                  className={({ isActive }) =>
                    `text-[0.72rem] tracking-[0.2em] uppercase font-[var(--font-button)] font-medium transition-colors ${
                      isActive ? 'text-[var(--color-primary)] font-bold underline underline-offset-4' : 'text-[var(--color-ink)] hover:text-[var(--color-primary)]'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}

              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="bg-[var(--color-primary)] text-white text-[0.65rem] tracking-[0.14em] uppercase font-bold px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-[var(--color-primary)]/90 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Sparkles size={12} /> Custom Design
              </button>

              {/* User Account / Auth Button */}
              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-[0.68rem] tracking-[0.14em] uppercase font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 bg-[var(--color-card-bg)] px-2.5 py-1 border border-[var(--color-line)] whitespace-nowrap"
                  >
                    <UserIcon size={13} /> {user.name?.split(' ')[0] || 'Account'}
                  </button>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="text-[var(--color-ink-soft)] hover:text-rose-600 p-1 transition-colors"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAccountClick}
                  className="text-[0.72rem] tracking-[0.18em] uppercase font-bold text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <UserIcon size={14} /> Sign In
                </button>
              )}

              <button
                onClick={openCart}
                aria-label={`Open cart, ${count} items`}
                className="relative flex items-center gap-1 text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors ml-1"
              >
                <ShoppingBag size={18} strokeWidth={1.5} />
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-white text-[0.6rem] w-4 h-4 rounded-full flex items-center justify-center font-sans font-bold">
                    {count}
                  </span>
                )}
              </button>
            </div>

            <button
              className="md:hidden text-[var(--color-ink)]"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {/* Marquee Banner Bar */}
        <div className="bg-[var(--color-primary)] text-white py-2 overflow-hidden border-b border-[var(--color-line)]">
          <div className="animate-marquee whitespace-nowrap text-[0.68rem] tracking-[0.28em] font-medium font-mono uppercase">
            <span className="mx-4">{marqueeDisplay}</span>
            <span className="mx-4">{marqueeDisplay}</span>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-[var(--color-bg)] border-b border-[var(--color-line)]"
            >
              <div className="flex flex-col px-6 py-6 gap-4">
                {navLinks.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="text-sm tracking-[0.16em] uppercase font-[var(--font-button)] text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}

                {user ? (
                  <div className="pt-2 border-t border-[var(--color-line)] flex items-center justify-between">
                    <button
                      onClick={() => {
                        navigate('/dashboard')
                        setMenuOpen(false)
                      }}
                      className="text-sm tracking-[0.16em] uppercase font-bold text-[var(--color-primary)] flex items-center gap-2"
                    >
                      <UserIcon size={16} /> ACCOUNT ({user.name})
                    </button>
                    <button
                      onClick={() => {
                        logout()
                        setMenuOpen(false)
                      }}
                      className="text-xs text-rose-600 font-bold uppercase"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAuthMode('login')
                      setIsAuthModalOpen(true)
                      setMenuOpen(false)
                    }}
                    className="text-sm tracking-[0.16em] uppercase font-bold text-[var(--color-ink)] flex items-center gap-2 text-left"
                  >
                    <UserIcon size={16} /> SIGN IN / REGISTER
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsCustomModalOpen(true)
                    setMenuOpen(false)
                  }}
                  className="text-sm tracking-[0.16em] uppercase font-[var(--font-button)] text-[var(--color-primary)] font-bold flex items-center gap-2 text-left"
                >
                  <Sparkles size={16} /> REQUEST CUSTOM DESIGN
                </button>
                <button
                  onClick={() => {
                    openCart()
                    setMenuOpen(false)
                  }}
                  className="text-sm tracking-[0.16em] uppercase font-[var(--font-button)] text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors text-left"
                >
                  CART ({count})
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Custom Design Modal */}
      <CustomDesignModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  )
}
