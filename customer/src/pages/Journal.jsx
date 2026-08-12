import Reveal from '../components/Reveal'
import { Sparkles, ArrowUpRight } from 'lucide-react'

const posts = [
  {
    title: 'How long does a pressed flower really last?',
    date: 'Jul 2026',
    category: 'Preservation Art',
    excerpt: 'Discover the archival techniques behind preserving organic petals, velvet textures, and natural colors for generations.',
  },
  {
    title: 'Inside a wedding bouquet commission',
    date: 'Jun 2026',
    category: 'Atelier Stories',
    excerpt: 'Step behind the scenes with lead artisan Keerthana Bapu as bridal flowers are carefully pressed and archived.',
  },
  {
    title: 'Why we never dye our petals',
    date: 'Apr 2026',
    category: 'Craft Philosophy',
    excerpt: 'Understanding our commitment to 100% natural, unadulterated botanical hues and organic flower dignity.',
  },
]

export default function Journal() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      <Reveal>
        <span className="eyebrow block mb-2 text-[var(--color-primary)] font-bold">Studio Dispatch &amp; Field Notes</span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl mb-8 sm:mb-12 font-[var(--font-display)] font-bold">Botanical Journal</h1>
      </Reveal>

      <div className="space-y-6">
        {posts.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <div className="card-luxury p-5 sm:p-7 group hover:shadow-xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--color-line)]">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="specimen-tag bg-[var(--color-bg)] border border-[var(--color-line)] px-2.5 py-0.5 text-[0.62rem] text-[var(--color-primary)] font-bold">
                    {p.category}
                  </span>
                  <span className="text-xs text-[var(--color-ink-soft)] font-mono">{p.date}</span>
                </div>
                
                <h2 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors">
                  {p.title}
                </h2>

                <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal">
                  {p.excerpt}
                </p>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <div className="w-10 h-10 rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] group-hover:bg-[var(--color-primary)] group-hover:text-white flex items-center justify-center transition-colors">
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
