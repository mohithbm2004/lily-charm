import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Reveal from '../components/Reveal'

export default function AboutArtist() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* Left Text Column */}
        <div className="md:col-span-6 space-y-6">
          <Reveal>
            <span className="eyebrow block">Our Heritage & Craft</span>
            <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-tight text-[var(--color-ink)] leading-tight font-[var(--font-display)]">
              READ OUR STORY
            </h2>
            <p className="text-[var(--color-ink-soft)] text-sm md:text-base leading-relaxed max-w-lg">
              Lily Charm began with a passion for capturing the fleeting beauty of nature.
              Each botanical specimen is carefully chosen at peak bloom, preserved using traditional pressing and archival casting methods.
            </p>
            <p className="text-[var(--color-ink-soft)] text-sm md:text-base leading-relaxed max-w-lg">
              Our studio preserves flowers in their natural hues without artificial dyes — creating heirloom pieces meant to bring timeless warmth and organic elegance into modern spaces.
            </p>
            <div className="pt-4">
              <Link to="/about" className="btn-primary inline-flex items-center gap-2">
                READ MORE <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Right Arched Frame Image Column matching attached image */}
        <div className="md:col-span-6 flex justify-center md:justify-end">
          <Reveal delay={0.15}>
            <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3 max-w-md">
              <div className="relative overflow-hidden aspect-[4/5] arch-frame border border-[var(--color-line)] bg-[var(--color-bg)]">
                <img
                  src="/images/products/flower-6-1.jpg"
                  alt="Lily Charm floral creation with gold trim and ribbon"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

