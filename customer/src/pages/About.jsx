import Reveal from '../components/Reveal'

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 pt-32 pb-24">
      <Reveal>
        <p className="eyebrow mb-3">Our Story</p>
        <h1 className="text-4xl md:text-5xl mb-8">Nature Preserved as Art</h1>
        <p className="text-[var(--color-ink-soft)] leading-relaxed mb-5">
          Lily Charm started as a single window ledge crowded with flowers pressed
          between the pages of old textbooks. Nearly six years on, the practice has
          grown into a small studio that treats each bloom the way a conservator
          treats a painting — cataloguing its colour, its shape, its particular
          season, before deciding how it wants to be held.
        </p>
        <p className="text-[var(--color-ink-soft)] leading-relaxed mb-5">
          Nothing here is dyed or artificially preserved. What you see is the
          flower's own colour, slowed down rather than stopped.
        </p>
      </Reveal>
    </div>
  )
}
