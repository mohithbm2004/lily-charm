import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function WideBanner() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-6 md:py-8">
      <Reveal>
        <TiltCard3D intensity={6} className="w-full">
          <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3 md:p-4 shadow-lg">
            <div className="relative overflow-hidden aspect-[16/9] sm:aspect-[16/7.5] border border-[var(--color-line)] bg-[#F8F6F0] flex items-center justify-center">
              <img
                src="/images/products/flower-10-2.jpg"
                alt="Lily Charm Studio Wicker Basket Creation & Official Brand Seal"
                className="w-full h-full object-contain p-2 md:p-3 transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </TiltCard3D>
      </Reveal>
    </section>
  )
}
