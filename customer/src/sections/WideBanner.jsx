import Reveal from '../components/Reveal'

export default function WideBanner() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-6 md:py-8">
      <Reveal>
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3">
          <div className="relative overflow-hidden h-[240px] md:h-[340px] border border-[var(--color-line)]">
            <img
              src="/images/products/flower-10-2.jpg"
              alt="Lily Charm Studio Wicker Basket Creation & Official Brand Seal"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
