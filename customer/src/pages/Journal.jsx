import Reveal from '../components/Reveal'

const posts = [
  { title: 'How long does a pressed flower really last?', date: 'Jul 2026', tag: 'Care & Preservation' },
  { title: 'Inside a wedding bouquet commission', date: 'Jun 2026', tag: 'Behind the Scenes' },
  { title: 'Why we never dye our petals', date: 'Apr 2026', tag: 'Craftsmanship' },
]

export default function Journal() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      <Reveal>
        <p className="eyebrow mb-2 sm:mb-3">Journal</p>
        <h1 className="text-3xl sm:text-4xl mb-8 sm:mb-12 font-[var(--font-display)] font-bold">Field Notes</h1>
      </Reveal>
      <div className="space-y-4">
        {posts.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08}>
            <div className="p-5 sm:p-6 border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all group cursor-pointer">
              <div className="space-y-1">
                <span className="specimen-tag bg-[var(--color-bg)] border border-[var(--color-line)] px-2.5 py-0.5 rounded-full text-[0.6rem] font-bold text-[var(--color-primary)]">
                  {p.tag}
                </span>
                <h2 className="font-[var(--font-display)] text-lg sm:text-xl font-bold group-hover:text-[var(--color-primary)] transition-colors pt-1">
                  {p.title}
                </h2>
              </div>
              <span className="text-xs text-[var(--color-ink-soft)] shrink-0 font-mono bg-[var(--color-bg)] px-3 py-1 rounded-full border border-[var(--color-line)]">
                {p.date}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
