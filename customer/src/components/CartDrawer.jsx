import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingBag, Sparkles } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'

export default function CartDrawer() {
  const { items, open, closeCart, removeItem, setQty, subtotal, coupon: activeCoupon, discountAmount, applyCoupon, removeCoupon } = useCart()
  const { shippingSettings } = useStudio()
  const [couponInput, setCouponInput] = useState('')
  const [couponMsg, setCouponMsg] = useState(null)

  const isShippingEnabled = shippingSettings?.shippingFeeEnabled ?? true
  const standardShippingFee = shippingSettings?.standardShippingFee ?? 100
  const freeThreshold = shippingSettings?.freeShippingThreshold ?? 2500

  const shipping = items.length === 0 ? 0 : isShippingEnabled ? (subtotal >= freeThreshold ? 0 : standardShippingFee) : 0
  const grandTotal = Math.max(0, subtotal - discountAmount + shipping)

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    const res = applyCoupon(couponInput)
    setCouponMsg(res)
    if (res.success) {
      setCouponInput('')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1100]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] max-w-full bg-[var(--color-bg)] z-[1101] flex flex-col shadow-2xl border-l border-[var(--color-line)]"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 h-18 border-b border-[var(--color-line)] shrink-0 bg-[var(--color-card-bg)]">
              <h2 className="font-[var(--font-display)] text-lg sm:text-xl font-bold uppercase text-[var(--color-ink)] flex items-center gap-2">
                <ShoppingBag size={20} className="text-[var(--color-primary)]" />
                <span>Your Bag ({items.length})</span>
              </h2>
              <button
                onClick={closeCart}
                aria-label="Close cart"
                className="w-8 h-8 rounded-full border border-[var(--color-line)] flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Line Items List */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4 scrollbar-thin">
              {items.length === 0 && (
                <div className="text-center py-16 text-[var(--color-ink-soft)] space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-line)] flex items-center justify-center mx-auto text-[var(--color-primary)] shadow-sm">
                    <Sparkles size={24} className="text-[var(--color-gold)]" />
                  </div>
                  <p className="text-xs sm:text-sm max-w-xs mx-auto leading-relaxed">
                    Your bag is empty — every piece here starts as a single fresh bloom.
                  </p>
                  <Link to="/shop" onClick={closeCart} className="btn-primary text-xs inline-block">
                    Explore Shop Catalog
                  </Link>
                </div>
              )}

              {items.map((item) => (
                <div key={item.id} className="card-luxury p-3 flex gap-3.5 border border-[var(--color-line)]">
                  <img src={item.image} alt={item.title} className="w-18 h-22 object-cover shrink-0 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)]" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="font-[var(--font-display)] text-sm font-bold leading-tight truncate text-[var(--color-ink)]">{item.title}</p>
                      <p className="text-xs font-semibold text-[var(--color-primary)] font-serif mt-1">{formatPrice(item.price)}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center border border-[var(--color-line)] bg-[var(--color-bg)] rounded-lg">
                        <button type="button" onClick={() => setQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 rounded-l-lg cursor-pointer" aria-label="Decrease"><Minus size={11} /></button>
                        <span className="w-7 text-center text-xs font-bold font-mono">{item.qty}</span>
                        <button type="button" onClick={() => setQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 rounded-r-lg cursor-pointer" aria-label="Increase"><Plus size={11} /></button>
                      </div>

                      <button type="button" onClick={() => removeItem(item.id)} className="text-[0.68rem] text-rose-700 font-bold uppercase hover:underline cursor-pointer">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="border-t border-[var(--color-line)] px-5 sm:px-6 py-5 space-y-3.5 bg-[var(--color-card-bg)] shrink-0">
                {/* Active Coupon Banner or Input Form */}
                {activeCoupon ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 text-xs flex justify-between items-center rounded-xl">
                    <div>
                      <p className="font-bold text-emerald-900 flex items-center gap-1">
                        ✨ {activeCoupon.code} ({activeCoupon.label})
                      </p>
                      <p className="text-[0.65rem] text-emerald-700">Saved {formatPrice(activeCoupon.discountAmount)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-rose-700 font-bold uppercase text-[0.62rem] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Promo code (e.g. LILY10)"
                        className="input-luxury text-xs uppercase font-mono py-2"
                      />
                      <button type="submit" className="btn-outline text-[0.68rem] uppercase font-bold px-3 shrink-0">
                        Apply
                      </button>
                    </div>
                    <p className="text-[0.62rem] text-[var(--color-ink-soft)] italic">Try code: <strong className="font-mono text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('LILY10')}>LILY10</strong> or <strong className="font-mono text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('VELVET20')}>VELVET20</strong></p>
                  </form>
                )}

                {couponMsg && (
                  <div className={`text-[0.68rem] p-2 rounded-lg ${couponMsg.success ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-rose-100 text-rose-800'}`}>
                    {couponMsg.message}
                  </div>
                )}

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-serif font-semibold">{formatPrice(subtotal)}</span></div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>Promo Discount ({activeCoupon?.code})</span>
                      <span className="font-serif">-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Shipping</span>
                    <span className="font-bold font-serif">
                      {shipping === 0 ? (
                        <span className="text-emerald-700 font-mono">
                          Free {isShippingEnabled && subtotal >= freeThreshold ? `(> ₹${freeThreshold})` : ''}
                        </span>
                      ) : (
                        formatPrice(shipping)
                      )}
                    </span>
                  </div>

                  {isShippingEnabled && shipping > 0 && subtotal < freeThreshold && (
                    <p className="text-[0.65rem] text-emerald-900 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg font-medium text-center">
                      ✨ Add {formatPrice(freeThreshold - subtotal)} more for <strong>FREE Shipping!</strong>
                    </p>
                  )}

                  <div className="flex justify-between font-[var(--font-display)] text-lg pt-2 border-t border-[var(--color-line)] text-[var(--color-ink)] font-bold">
                    <span>Total</span>
                    <span className="text-[var(--color-primary)] font-serif">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  onClick={closeCart}
                  className="btn-primary w-full text-center block py-3.5 uppercase text-xs font-bold tracking-widest shadow-md"
                >
                  Checkout ({formatPrice(grandTotal)})
                </Link>

                <p className="text-[0.62rem] text-amber-950 bg-amber-50/90 border border-amber-200 p-2 rounded-lg text-center leading-tight">
                  ℹ️ <strong>Cancellation Policy:</strong> Self-cancellations incur a 3% fee (97% refund). Studio Admin cancellations = 100% full refund.
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
