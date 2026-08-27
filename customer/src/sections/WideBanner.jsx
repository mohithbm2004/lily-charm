import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'

export default function WideBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-16 md:py-20 w-full max-w-full">
      <Reveal>
        <TiltCard3D intensity={4} className="w-full">
          <div className="bg-[var(--color-card-bg)] rounded-3xl p-3 sm:p-5 luxury-shadow-md overflow-hidden">
            <div className="relative overflow-hidden aspect-[16/9] sm:aspect-[16/7.5] rounded-2xl bg-[#F8F6F0] flex items-center justify-center">
              <img
                src="/images/products/flower-10-2.webp"
                alt="Lily Charm Studio Wicker Basket Creation & Official Brand Seal"
                loading="lazy"
                className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-700 hover:scale-105 rounded-2xl"
              />
            </div>
          </div>
        </TiltCard3D>
      </Reveal>
    </section>
  )
}
