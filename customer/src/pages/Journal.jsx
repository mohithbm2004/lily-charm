import Reveal from '../components/Reveal'

const posts = [
  { title: 'How long does a pressed flower really last?', date: 'Jul 2026' },
  { title: 'Inside a wedding bouquet commission', date: 'Jun 2026' },
  { title: 'Why we never dye our petals', date: 'Apr 2026' },
]

export default function Journal() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      <Reveal>
        <p className="eyebrow mb-2 sm:mb-3">Journal</p>
        <h1 className="text-3xl sm:text-4xl mb-8 sm:mb-12 font-[var(--font-display)] font-bold">Field Notes</h1>
      </Reveal>
      <div className="divide-y divide-[var(--color-line)]">
        {posts.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08} className="py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
            <h2 className="font-[var(--font-display)] text-lg sm:text-xl font-bold">{p.title}</h2>
            <span className="text-xs text-[var(--color-ink-soft)] shrink-0 font-mono">{p.date}</span>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
