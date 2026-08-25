import { Sparkles, Flower2, Layers, Sun, PenTool, Frame, PackageCheck, Truck } from 'lucide-react'
import Reveal from '../components/Reveal'

const steps = [
  { num: '01', icon: Flower2, label: 'Botanical Selection', desc: 'Handpicked & curated' },
  { num: '02', icon: Layers, label: 'Hand Pressing', desc: 'Patience & care' },
  { num: '03', icon: Sun, label: 'Drying', desc: 'Preserving color' },
  { num: '04', icon: PenTool, label: 'Design', desc: 'Artistic styling' },
  { num: '05', icon: Frame, label: 'Framing', desc: 'Archival finish' },
  { num: '06', icon: PackageCheck, label: 'Packaging', desc: 'Luxury gift wrap' },
  { num: '07', icon: Truck, label: 'Delivered', desc: 'To your doorstep' },
]

export default function Process() {
  return (
    <section className="bg-[#212B1C] text-[#FAF7F2] relative overflow-hidden border-y border-[#3E4D35] w-full max-w-full">
      {/* Subtle decorative background glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,_rgba(62,77,53,0.35)_0%,_transparent_70%)] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,_rgba(213,194,157,0.12)_0%,_transparent_70%)] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-14 sm:py-20 md:py-28 relative z-10">
        <Reveal>
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[#D5C29D] font-bold text-xs uppercase tracking-[0.24em] font-[var(--font-button)] mb-3 bg-[#2D3926] px-3.5 py-1 rounded-full border border-[#D5C29D]/30">
              <Sparkles size={13} className="text-[#D5C29D]" /> The Creation Journey
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold font-[var(--font-display)] text-[#FAF7F2] tracking-tight leading-tight">
              From stem to keepsake, in seven steps
            </h2>
            <p className="text-[#E2DACB] text-xs sm:text-sm md:text-base leading-relaxed mt-3 font-normal">
              Every handcrafted stem and preserved petal is curated with patience to create an everlasting memory.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 sm:mt-16 md:mt-20 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-7 left-12 right-12 h-[2px] bg-gradient-to-r from-[#D5C29D]/20 via-[#D5C29D]/60 to-[#D5C29D]/20 z-0" />

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-8 gap-x-2.5 sm:gap-x-4">
            {steps.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="flex flex-col items-center text-center gap-2.5 sm:gap-3 relative group">
                  {/* Icon Circle with Step Badge */}
                  <div className="relative z-10">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#FAF7F2] text-[#212B1C] flex items-center justify-center shadow-xl border-2 border-[#D5C29D] group-hover:scale-110 group-hover:bg-[#D5C29D] group-hover:text-[#212B1C] transition-all duration-300">
                      <s.icon size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={1.6} />
                    </div>
                    <span className="absolute -top-2 -right-1 bg-[#D5C29D] text-[#212B1C] text-[0.58rem] sm:text-[0.62rem] font-bold font-mono px-1.5 py-0.5 rounded-full shadow-sm border border-[#FAF7F2]">
                      {s.num}
                    </span>
                  </div>

                  {/* Step Label & Caption */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-[#FAF7F2] font-[var(--font-button)]">
                      {s.label}
                    </h3>
                    <p className="text-[0.68rem] sm:text-[0.72rem] text-[#D5C29D] font-medium leading-tight">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
