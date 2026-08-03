import Reveal from '../components/Reveal'

const posts = [
  { title: 'How long does a pressed flower really last?', date: 'Jul 2026' },
  { title: 'Inside a wedding bouquet commission', date: 'Jun 2026' },
  { title: 'Why we never dye our petals', date: 'Apr 2026' },
]

export default function Journal() {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 pt-32 pb-24">
      <Reveal>
        <p className="eyebrow mb-3">Journal</p>
        <h1 className="text-4xl mb-12">Field Notes</h1>
      </Reveal>
      <div className="divide-y divide-[var(--color-line)]">
        {posts.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.08} className="py-6 flex items-center justify-between gap-6">
            <h2 className="font-[var(--font-display)] text-xl">{p.title}</h2>
            <span className="text-xs text-[var(--color-ink-soft)] shrink-0">{p.date}</span>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
