import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
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

  const handleRemoveCoupon = () => {
    removeCoupon()
    setCouponMsg(null)
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
            className="fixed inset-0 bg-[var(--color-ink)]/40 z-[1100]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] max-w-full bg-[var(--color-bg)] z-[1101] flex flex-col shadow-2xl rounded-l-3xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 border-b border-[var(--color-line)] shrink-0">
              <h2 className="font-[var(--font-display)] text-lg sm:text-xl font-bold uppercase">Your Bag ({items.length})</h2>
              <button onClick={closeCart} aria-label="Close cart" className="p-1.5 hover:bg-black/5 rounded-full">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
              {items.length === 0 && (
                <div className="text-center py-12 text-[var(--color-ink-soft)] space-y-3">
                  <p className="text-xs sm:text-sm">Your bag is empty — every piece here starts as a single fresh bloom.</p>
                  <Link to="/shop" onClick={closeCart} className="btn-outline text-xs inline-block rounded-full">
                    Explore Shop
                  </Link>
                </div>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 sm:gap-4 border-b border-[var(--color-line)]/40 pb-4">
                  <img src={item.image} alt={item.title} className="w-16 h-20 sm:w-20 sm:h-24 object-cover shrink-0 border border-[var(--color-line)] rounded-xl bg-[var(--color-card-bg)]" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="font-[var(--font-display)] text-sm sm:text-base font-bold leading-tight truncate">{item.title}</p>
                      <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] mt-0.5">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-full overflow-hidden px-1">
                        <button onClick={() => setQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 rounded-full" aria-label="Decrease"><Minus size={11} /></button>
                        <span className="w-7 text-center text-xs font-bold font-mono">{item.qty}</span>
                        <button onClick={() => setQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-black/5 rounded-full" aria-label="Increase"><Plus size={11} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-[0.68rem] text-rose-700 font-bold uppercase hover:underline">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--color-line)] px-4 sm:px-6 py-4 sm:py-6 space-y-3 sm:space-y-4 bg-[var(--color-card-bg)]/40 shrink-0">
                {/* Active Coupon Banner or Input Form */}
                {activeCoupon ? (
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 text-xs flex justify-between items-center rounded-2xl">
                    <div>
                      <p className="font-bold text-emerald-900 flex items-center gap-1">
                        ✨ {activeCoupon.code} ({activeCoupon.label})
                      </p>
                      <p className="text-[0.65rem] text-emerald-700">Saved {formatPrice(activeCoupon.discountAmount)}</p>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-rose-600 font-bold uppercase text-[0.62rem] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value)
                          if (couponMsg) setCouponMsg(null)
                        }}
                        placeholder="Promo code (e.g. LILY10)"
                        className="flex-1 border border-[var(--color-line)] bg-transparent px-3.5 py-2 text-xs uppercase focus:outline-none focus:border-[var(--color-primary)] font-mono min-w-0 rounded-xl"
                      />
                      <button type="submit" className="btn-outline text-[0.68rem] uppercase font-bold text-[var(--color-ink)] px-3 shrink-0 rounded-xl">
                        Apply
                      </button>
                    </div>
                    <p className="text-[0.62rem] text-[var(--color-ink-soft)] italic">Try code: <strong className="font-mono text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('LILY10')}>LILY10</strong> or <strong className="font-mono text-[var(--color-primary)] cursor-pointer" onClick={() => setCouponInput('VELVET20')}>VELVET20</strong></p>
                  </form>
                )}

                {!activeCoupon && couponMsg && (
                  <div className={`text-[0.68rem] p-2 rounded-xl ${couponMsg.success ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-rose-100 text-rose-800'}`}>
                    {couponMsg.message}
                  </div>
                )}

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Promo Discount ({activeCoupon?.code})</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span>Shipping</span>
                    <span className="font-bold">
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
                    <p className="text-[0.65rem] text-emerald-800 bg-emerald-50 border border-emerald-200 p-1.5 rounded font-semibold text-center">
                      ✨ Add {formatPrice(freeThreshold - subtotal)} more for <strong>FREE Shipping!</strong>
                    </p>
                  )}
                  <div className="flex justify-between font-[var(--font-display)] text-base sm:text-lg pt-2 border-t border-[var(--color-line)] text-[var(--color-ink)] font-bold">
                    <span>Total</span><span className="text-[var(--color-primary)]">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  onClick={closeCart}
                  className="btn-primary w-full text-center block py-3 uppercase text-xs font-bold tracking-widest"
                >
                  Checkout ({formatPrice(grandTotal)})
                </Link>
                <p className="text-[0.6rem] text-amber-900 bg-amber-50/80 border border-amber-200 p-1.5 rounded text-center leading-tight">
                  ℹ️ <strong>Cancellation Policy:</strong> Customer cancellations incur a 3% fee (97% refund). Studio Admin cancellations = 100% full refund.
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
