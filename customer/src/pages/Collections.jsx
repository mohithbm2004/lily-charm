import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext'
import Reveal from '../components/Reveal'
import ProductCard from '../components/ProductCard'
import { ArrowUpRight } from 'lucide-react'

/**
 * Loads an image and returns its natural width/height ratio (w/h).
 * Works for base64 data URIs AND relative/absolute URL paths.
 */
function useImageRatio(src) {
  const [ratio, setRatio] = useState(null)
  useEffect(() => {
    if (!src) return
    const img = new window.Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setRatio(img.naturalWidth / img.naturalHeight)
      }
    }
    img.onerror = () => setRatio(1.5) // default landscape on error
    // For relative paths, prefix with current origin
    img.src = src.startsWith('data:') || src.startsWith('http')
      ? src
      : window.location.origin + (src.startsWith('/') ? '' : '/') + src
  }, [src])
  return ratio
}

/**
 * CollectionHero — renders the image with the correct rectangular frame
 * based on the actual photo's aspect ratio (detected client-side).
 */
function CollectionHero({ collection, isEven = true }) {
  const { image, images, imageX, imageY, imageScale, imageRatio: savedRatio, imageOrientation } = collection
  const allColImages = Array.isArray(images) && images.length > 0 ? images : (image ? [image] : [])
  const [activeImg, setActiveImg] = useState(image || allColImages[0] || '')
  const currentBanner = activeImg || image || allColImages[0] || ''

  const detectedRatio = useImageRatio(currentBanner)

  // Use saved ratio from DB or fallback to client-detected ratio
  const ratio = (savedRatio != null && savedRatio > 0) ? savedRatio : detectedRatio
  const isPortrait = imageOrientation === 'portrait' || (ratio !== null && ratio < 1)

  const ix = imageX ?? 50
  const iy = imageY ?? 50
  const isc = imageScale ?? 1

  return (
    <div className="space-y-3">
      <div
        className={`relative overflow-hidden border border-[var(--color-line)] bg-[var(--color-card-bg)] transition-all duration-500 shadow-sm ${
          isPortrait
            ? `max-w-[420px] w-full h-[500px] md:h-[580px] ${isEven ? 'md:ml-auto md:mr-0' : 'md:ml-0 md:mr-auto'}`
            : 'w-full h-[320px] md:h-[400px]'
        }`}
      >
        <img
          src={currentBanner}
          alt={collection.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${ix}% ${iy}%`,
            transform: `scale(${isc})`,
            transformOrigin: `${ix}% ${iy}%`,
            transition: 'all 0.5s ease',
          }}
        />
        {/* Subtle indicator tag */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[0.6rem] uppercase tracking-widest px-2 py-1 font-mono">
          {isPortrait ? '▬ Portrait Series' : '⬛ Landscape Series'}
        </div>
      </div>

      {/* Multi-image thumbnail bar */}
      {allColImages.length > 1 && (
        <div className={`flex gap-2 ${isPortrait ? (isEven ? 'justify-end' : 'justify-start') : 'justify-start'}`}>
          {allColImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImg(img)}
              className={`w-12 h-12 border overflow-hidden transition-all ${
                currentBanner === img ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 scale-105' : 'border-[var(--color-line)] opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Series thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Collections() {
  const { collections = [], products: liveShopProducts = [] } = useStudio()

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 pt-32 pb-24 space-y-24">
      {/* Header */}
      <Reveal>
        <p className="eyebrow mb-3 font-[var(--font-button)]">Lily Charm Collections</p>
        <h1 className="text-4xl md:text-5xl max-w-2xl leading-tight font-bold uppercase font-[var(--font-display)]">
          Handcrafted Velvet Floral Art
        </h1>
        <p className="text-[var(--color-ink-soft)] mt-4 max-w-xl leading-relaxed text-sm md:text-base">
          Explore our signature handcrafted series — from plush pearl-encrusted velvet lilies to radiant golden sunflowers, delicate heart bouquets, and studio wicker basket arrangements by Keerthana Bapu.
        </p>
      </Reveal>

      {/* Collection Categories from Database / Admin Manager */}
      {collections.length > 0 ? (
        <div className="space-y-20">
          {collections.map((c, i) => {
            const isEven = i % 2 === 0
            const slug = c.slug || c.id
            const categoryProducts = liveShopProducts.filter(
              (p) => p.category === slug || p.category === c.title || p.category === c.id
            )

            return (
              <div key={c.id || c._id || i} className="border-t border-[var(--color-line)] pt-16">
                {/* Zig-Zag Grid: Even = Text Left, Image Right | Odd = Image Left, Text Right */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center mb-12">
                  <div className={`md:col-span-5 space-y-4 ${isEven ? 'order-1' : 'order-1 md:order-2'}`}>
                    <Reveal delay={i * 0.05}>
                      <p className="eyebrow font-[var(--font-button)]">Collection Series No. 0{i + 1}</p>
                      <h2 className="text-3xl md:text-4xl font-[var(--font-display)]">{c.title}</h2>
                      <p className="text-[var(--color-ink-soft)] leading-relaxed text-sm md:text-base">
                        {c.blurb}
                      </p>
                      <div className="pt-2">
                        <Link
                          to={`/shop?category=${slug}`}
                          className="btn-primary inline-flex items-center gap-2 text-xs"
                        >
                          Explore {c.title} Catalog <ArrowUpRight size={16} />
                        </Link>
                      </div>
                    </Reveal>
                  </div>
                  <div className={`md:col-span-7 ${isEven ? 'order-2' : 'order-2 md:order-1'}`}>
                    <Reveal delay={i * 0.1}>
                      <CollectionHero collection={c} isEven={isEven} />
                    </Reveal>
                  </div>
                </div>

                {/* Available Products in this Collection if any */}
                {categoryProducts.length > 0 ? (
                  <div className="mt-8">
                    <p className="text-xs uppercase tracking-[0.16em] font-[var(--font-button)] text-[var(--color-ink-soft)] mb-6">
                      Available Creations in this Series ({categoryProducts.length} pieces)
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {categoryProducts.slice(0, 3).map((p, idx) => (
                        <ProductCard key={p.id || idx} product={p} index={idx} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 border border-dashed border-[var(--color-line)] p-4 bg-[var(--color-card-bg)]/50 flex items-center justify-between">
                    <p className="text-xs text-[var(--color-ink-soft)] font-medium">
                      ✨ New pieces for {c.title} are being handcrafted in studio by Keerthana Bapu.
                    </p>
                    <Link to={`/shop?category=${slug}`} className="text-xs text-[var(--color-primary)] font-bold hover:underline">
                      View Category →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <Reveal className="text-center py-16 border border-[var(--color-line)] bg-[var(--color-card-bg)] p-8">
          <p className="font-[var(--font-display)] text-2xl mb-2">New Collections Coming Soon</p>
          <p className="text-sm text-[var(--color-ink-soft)] max-w-md mx-auto mb-6">
            Our studio is currently handcrafting new signature floral series. Visit our full catalog to explore available creations.
          </p>
          <Link to="/shop" className="btn-primary inline-block">
            View Full Shop Catalog
          </Link>
        </Reveal>
      )}
    </div>
  )
}
