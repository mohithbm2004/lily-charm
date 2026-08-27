import Reveal from '../components/Reveal'
import { Sparkles, ShieldCheck, Heart, AlertCircle, RefreshCw, Truck } from 'lucide-react'

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pt-14 sm:pt-18 pb-16 sm:pb-24 text-[var(--color-ink)]">
      <Reveal>
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} /> Lily Charm Flower Studio
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-[var(--font-display)] uppercase">
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] max-w-lg mx-auto">
            Version 1.0 — Effective August 2026. Please read our handmade product terms and studio policies.
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 text-xs sm:text-sm leading-relaxed border-t border-[var(--color-line)] pt-8">
          {/* Section 1: Handmade Nature */}
          <div className="bg-[var(--color-beige)]/30 border border-[var(--color-line)] p-5 sm:p-6 rounded-3xl space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-[var(--font-display)] uppercase flex items-center gap-2 text-[var(--color-primary)]">
              <Heart size={18} /> 1. Handmade Artisan Craftsmanship Disclaimer
            </h2>
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
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--color-primary)]" /> 2. Ordering, Authentication & Secure Payments
            </h2>
            <p>
              To safeguard order provenance and transactional communications, all customers must be authenticated with a verified Lily Charm account prior to placing an order or requesting custom quotes.
            </p>
            <p>
              Online payments are processed securely through <strong>Razorpay Payment Gateway</strong> supporting UPI, Credit/Debit Cards, Net Banking, and Wallets. We never store credit card or payment credentials on our servers.
            </p>
          </div>

          {/* Section 3: Cancellation & Refunds */}
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
              <RefreshCw size={18} className="text-[var(--color-primary)]" /> 3. Cancellation & Refund Policy
            </h2>
            <p>
              • <strong>Customer Self-Cancellation:</strong> Customers may cancel their order online before handcrafting begins. Customer-initiated cancellations incur a <strong>3% payment gateway processing fee</strong> (97% of the total amount is refunded to your original payment method).
            </p>
            <p>
              • <strong>Studio Admin Cancellation:</strong> If an order is cancelled by the Studio Admin due to stock, scheduling, or technical reasons, a <strong>100% full refund</strong> (0% deduction) is processed immediately.
            </p>
          </div>

          {/* Section 4: Shipping & Delivery */}
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold font-[var(--font-display)] uppercase flex items-center gap-2">
              <Truck size={18} className="text-[var(--color-primary)]" /> 4. Shipping & Delivery
            </h2>
            <p>
              Because each flower is crafted by hand, orders generally require 2–4 business days for artisanal crafting prior to dispatch. Orders are packaged in crush-proof botanical packaging and dispatched via premium courier partners (BlueDart / Delhivery) with live tracking.
            </p>
          </div>

          {/* Contact */}
          <div className="pt-4 text-xs text-[var(--color-ink-soft)] border-t border-[var(--color-line)]">
            For questions regarding these Terms & Conditions, please contact us at <a href="mailto:support@lilycharm.in" className="text-[var(--color-primary)] underline font-bold">support@lilycharm.in</a>.
          </div>
        </div>
      </Reveal>
    </div>
  )
}
