import Reveal from '../components/Reveal'
import TiltCard3D from '../components/TiltCard3D'
import { Sparkles, Heart } from 'lucide-react'

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 pt-20 sm:pt-24 md:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      {/* Header Title */}
      <Reveal>
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-2 sm:space-y-3">
          <span className="eyebrow flex items-center justify-center gap-1.5 text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.24em]">
            <Sparkles size={14} className="text-[var(--color-gold)]" /> Our Story &amp; Heritage
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-[var(--font-display)] tracking-tight text-[var(--color-ink)] leading-tight">
            A Dream That Grew With Me
          </h1>
          <p className="text-sm sm:text-lg md:text-xl font-serif italic text-[var(--color-primary)] font-semibold pt-1">
            &ldquo;Where childhood creativity blossomed into timeless artistry.&rdquo; ✨
          </p>
        </div>
      </Reveal>

      {/* Grid Layout: Photo + Story */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center mb-12 sm:mb-16">
        {/* Left 3D Photo Frame */}
        <div className="md:col-span-5 flex justify-center">
          <Reveal delay={0.1}>
            <TiltCard3D intensity={10} className="w-full max-w-sm">
              <div className="card-luxury p-2.5 sm:p-3.5 shadow-xl">
                <div className="relative overflow-hidden aspect-[4/5] arch-frame border border-[var(--color-line)] bg-[var(--color-bg)]">
                  <img
                    src="/images/products/flower-crimson-velvet-bouquet.png"
                    alt="Lily Charm handcrafted crimson red velvet flower bouquet"
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </TiltCard3D>
          </Reveal>
        </div>

        {/* Right Story Text */}
        <div className="md:col-span-7 space-y-4 sm:space-y-6 text-xs sm:text-sm md:text-base leading-relaxed text-[var(--color-ink)] font-normal">
          <Reveal delay={0.15}>
            <p className="text-base sm:text-lg font-serif italic font-bold text-[var(--color-primary)] border-l-4 border-[var(--color-primary)] pl-3 sm:pl-4 py-1.5 card-luxury">
              Lily Charm is more than a brand—it's a dream that grew with me.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-[var(--color-ink-soft)]">
              Ever since I was a child, I have been deeply passionate about arts and crafts. I found happiness in creating beautiful things with my own hands, always believing that creativity could turn the simplest materials into something meaningful. What began as a childhood hobby slowly became a part of who I am.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <p className="text-[var(--color-ink-soft)]">
              As I continued my education, one question stayed with me: <em className="font-serif text-[var(--color-primary)] font-semibold">&ldquo;Why not build a future around the one thing I've always loved?&rdquo;</em> That thought inspired me to transform my lifelong passion into a business, where every creation reflects the same love, patience, and creativity that has been with me since childhood.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Continuation Story Cards */}
      <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
        <Reveal delay={0.3}>
          <div className="card-luxury p-5 sm:p-7 md:p-9 shadow-sm space-y-3">
            <h2 className="text-lg sm:text-xl font-bold font-[var(--font-display)] tracking-wider text-[var(--color-primary)] flex items-center gap-2">
              <Heart size={18} fill="currentColor" /> The Heart Behind the Name
            </h2>
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-[var(--color-ink-soft)] font-normal">
              The name Lily Charm holds a very special place in my heart. One day, a little one-year-old child lovingly called me &ldquo;Lily.&rdquo; It was such a sweet and unforgettable moment that I decided to make it a part of my dream. I paired it with &ldquo;Charm&rdquo; because I wanted every creation to carry its own charm, warmth, and lasting beauty. And that's how Lily Charm was born.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.35}>
          <div className="card-rounded p-5 sm:p-7 md:p-9 shadow-sm space-y-4 bg-[var(--color-silk)]">
            <p className="text-xs sm:text-sm md:text-base leading-relaxed text-[var(--color-ink-soft)] font-normal">
              Today, every everlasting flower, bouquet, and handcrafted gift is thoughtfully designed to celebrate life's most precious moments. Each piece is made with meticulous attention to detail, ensuring it becomes more than a gift—it becomes a cherished keepsake that lasts for years.
            </p>
            
            <div className="pt-4 border-t border-[var(--color-line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm sm:text-base md:text-lg font-serif font-bold text-[var(--color-primary)] leading-snug flex-1">
                At Lily Charm, we don't simply create flowers; we create timeless memories, handcrafted with love, inspired by creativity, and made to be treasured forever.
              </p>
              
              <div className="flex items-center gap-3 card-luxury p-2.5 shadow-sm shrink-0 w-full sm:w-auto">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[var(--color-primary)]/40 p-0.5 overflow-hidden bg-white shrink-0">
                  <img
                    src="/images/logo.png"
                    alt="Lily Charm Official Brand Seal"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold font-[var(--font-display)] uppercase text-[var(--color-ink)]">Keerthana Bapu</p>
                  <p className="text-[0.58rem] sm:text-[0.62rem] font-serif uppercase tracking-widest text-[var(--color-primary)] font-semibold">Founder &amp; Lead Artisan</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
