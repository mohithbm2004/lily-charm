import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/format'

export default function CartDrawer() {
  const { items, open, closeCart, removeItem, setQty, subtotal } = useCart()
  const [coupon, setCoupon] = useState('')
  const shipping = items.length === 0 ? 0 : subtotal > 8000 ? 0 : 250

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-[var(--color-ink)]/40 z-[60]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[var(--color-bg)] z-[70] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 h-20 border-b border-[var(--color-line)]">
              <h2 className="font-[var(--font-display)] text-xl">Your Bag ({items.length})</h2>
              <button onClick={closeCart} aria-label="Close cart"><X size={20} strokeWidth={1.4} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {items.length === 0 && (
                <p className="text-sm text-[var(--color-ink-soft)]">Your bag is empty — every piece here starts as a single fresh bloom.</p>
              )}
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <img src={item.image} alt={item.title} className="w-20 h-24 object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-[var(--font-display)] text-base">{item.title}</p>
                    <p className="text-sm text-[var(--color-ink-soft)] mt-0.5">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-[var(--color-line)]">
                        <button onClick={() => setQty(item.id, item.qty - 1)} className="w-7 h-7 flex items-center justify-center"><Minus size={12} /></button>
                        <span className="w-8 text-center text-sm">{item.qty}</span>
                        <button onClick={() => setQty(item.id, item.qty + 1)} className="w-7 h-7 flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-xs text-[var(--color-ink-soft)] underline">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[var(--color-line)] px-6 py-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder="Coupon code"
                    className="flex-1 border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button className="btn-outline text-[var(--color-ink)]">Apply</button>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
                  <div className="flex justify-between font-[var(--font-display)] text-lg pt-2 border-t border-[var(--color-line)]">
                    <span>Total</span><span>{formatPrice(subtotal + shipping)}</span>
                  </div>
                </div>
                <Link to="/checkout" onClick={closeCart} className="btn-primary w-full text-center block">
                  Checkout
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
