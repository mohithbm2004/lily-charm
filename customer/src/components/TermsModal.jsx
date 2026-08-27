import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Heart, RefreshCw, Truck } from 'lucide-react'
import { useScrollLock } from '../lib/useScrollLock'

export default function TermsModal({ isOpen, onClose }) {
  useScrollLock(isOpen)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto modal-overlay">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Floating Modal Body Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[var(--color-card-bg)] border border-[var(--color-line)] text-[var(--color-ink)] w-full max-w-2xl rounded-3xl shadow-2xl z-10 my-auto text-left max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[var(--color-line)] shrink-0 bg-[var(--color-card-bg)]">
              <div>
                <span className="eyebrow text-[0.62rem] font-bold text-[var(--color-brown)] uppercase tracking-[0.22em]">
                  Lily Charm Studio Policies
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] uppercase tracking-tight text-[var(--color-ink)] mt-0.5">
                  Terms & Conditions
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-2 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                aria-label="Close Terms Modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content Container with Uniform Cards */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4 scrollbar-thin text-xs sm:text-sm leading-relaxed text-[var(--color-ink)]">
              {/* Section 1: Handmade Nature */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-line)] p-5 rounded-2xl space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold font-[var(--font-display)] uppercase flex items-center gap-2 text-[var(--color-primary)]">
                  <Heart size={16} /> 1. Handmade Artisan Craftsmanship Disclaimer
                </h3>
                <p>
                  Every flower, botanical arrangement, and bespoke bouquet crafted by <strong>Lily Charm</strong> is 100% meticulously handmade using premium pipe cleaners, floral stems, and artisanal velvet wire.
                </p>
                <p>
                  Because each creation is handcrafted individually by our artisans, <strong>slight variations in petal shape, wire curvature, exact tint, and botanical dimension are natural, expected, and celebrate the unique soul of handmade art.</strong>
                </p>
                <p className="text-[var(--color-ink-soft)] text-xs italic">
                  Photographs on lilycharm.in represent authentic physical creations; however, no two handmade flowers are machine-identical copies.
                </p>
              </div>

              {/* Section 2: Ordering & Payment */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-line)] p-5 rounded-2xl space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold font-[var(--font-display)] uppercase flex items-center gap-2 text-[var(--color-primary)]">
                  <ShieldCheck size={16} /> 2. Ordering, Authentication & Secure Payments
                </h3>
                <p>
                  To safeguard order provenance and transactional communications, all customers must be authenticated with a verified Lily Charm account prior to placing an order or requesting custom quotes.
                </p>
                <p>
                  Online payments are processed securely through <strong>Razorpay Payment Gateway</strong> supporting UPI, Credit/Debit Cards, Net Banking, and Wallets. We never store credit card or payment credentials on our servers.
                </p>
              </div>

              {/* Section 3: Cancellation & Refunds */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-line)] p-5 rounded-2xl space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold font-[var(--font-display)] uppercase flex items-center gap-2 text-[var(--color-primary)]">
                  <RefreshCw size={16} /> 3. Cancellation & Refund Policy
                </h3>
                <p>
                  • <strong>Customer Self-Cancellation:</strong> Customers may cancel their order online before handcrafting begins. Customer-initiated cancellations incur a <strong>3% payment gateway processing fee</strong> (97% of the total amount is refunded to your original payment method).
                </p>
                <p>
                  • <strong>Studio Admin Cancellation:</strong> If an order is cancelled by the Studio Admin due to stock, scheduling, or technical reasons, a <strong>100% full refund</strong> (0% deduction) is processed immediately.
                </p>
              </div>

              {/* Section 4: Shipping & Delivery */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-line)] p-5 rounded-2xl space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold font-[var(--font-display)] uppercase flex items-center gap-2 text-[var(--color-primary)]">
                  <Truck size={16} /> 4. Shipping & Delivery
                </h3>
                <p>
                  Because each flower is crafted by hand, orders generally require 2–4 business days for artisanal crafting prior to dispatch. Orders are packaged in crush-proof botanical packaging and dispatched via premium courier partners (BlueDart / Delhivery) with live tracking.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-[var(--color-line)] bg-[var(--color-card-bg)] shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-[var(--color-ink-soft)]">
                Questions? Contact us at <a href="mailto:support@lilycharm.in" className="text-[var(--color-primary)] underline font-bold">support@lilycharm.in</a>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary py-2.5 px-6 text-[0.68rem] uppercase font-bold tracking-wider rounded-full shadow-sm cursor-pointer w-full sm:w-auto"
              >
                Understood & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
