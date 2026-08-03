import { Flower2, Layers, Sun, PenTool, Frame, PackageCheck, Truck } from 'lucide-react'
import Reveal from '../components/Reveal'

const steps = [
  { icon: Flower2, label: 'Fresh Flowers' },
  { icon: Layers, label: 'Hand Pressing' },
  { icon: Sun, label: 'Drying' },
  { icon: PenTool, label: 'Design' },
  { icon: Frame, label: 'Framing' },
  { icon: PackageCheck, label: 'Packaging' },
  { icon: Truck, label: 'Delivered' },
]

export default function Process() {
  return (
    <section className="bg-[var(--color-primary)] text-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <Reveal>
          <p className="eyebrow text-[var(--color-beige)] mb-3">The Process</p>
          <h2 className="text-3xl md:text-4xl max-w-md">From stem to keepsake, in seven steps</h2>
        </Reveal>
        <div className="mt-16 relative">
          <div className="hidden md:block absolute top-6 left-0 right-0 h-px bg-white/20" />
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-y-10 gap-x-4">
            {steps.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <div className="flex flex-col items-center text-center gap-4 relative">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-bg)] text-[var(--color-primary)] flex items-center justify-center relative z-10">
                    <s.icon size={18} strokeWidth={1.4} />
                  </div>
                  <p className="text-xs tracking-[0.1em] uppercase font-[var(--font-button)] text-[var(--color-beige)]">
                    {s.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
