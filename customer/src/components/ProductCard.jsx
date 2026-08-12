import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingBag } from 'lucide-react'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import TiltCard3D from './TiltCard3D'

export default function ProductCard({ product, index = 0 }) {
  const { addItem, openCart } = useCart()

  const ix = product.imageX ?? 50
  const iy = product.imageY ?? 50
  const isc = product.imageScale ?? 1
  const isLandscape = product.imageOrientation === 'landscape'

  const allImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(i => typeof i === 'object' ? i.url : i)
    : (product.image ? [product.image] : [])

  const firstImg = product.image || allImages[0] || ''
  const secondImg = allImages[1] || null

  return (
    <TiltCard3D intensity={8} className="h-full w-full max-w-full">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.5, delay: (index % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="group card-rounded p-3 sm:p-4 flex flex-col justify-between h-full w-full relative text-center"
      >
        {/* Top Image Container */}
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <Link
            to={`/product/${product.id}`}
            className="block relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] w-full"
          >
            <div className={`${isLandscape ? 'aspect-[16/11]' : 'aspect-[3/3.8]'} overflow-hidden relative flex items-center justify-center w-full`}>
              {firstImg ? (
                <>
                  <img
                    src={firstImg}
                    alt={product.title}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: `${ix}% ${iy}%`,
                      transform: `scale(${isc})`,
                      transformOrigin: `${ix}% ${iy}%`,
                      transition: 'opacity 0.5s ease, transform 0.6s ease-out',
                    }}
                    className={`w-full h-full object-cover ${secondImg ? 'group-hover:opacity-0' : 'group-hover:scale-106'}`}
                  />
                  {secondImg && (
                    <img
                      src={secondImg}
                      alt={`${product.title} alternate`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: `${ix}% ${iy}%`,
                        transform: `scale(${isc})`,
                        transformOrigin: `${ix}% ${iy}%`,
                        transition: 'opacity 0.5s ease, transform 0.6s ease-out',
                      }}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-106"
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Image</div>
              )}
            </div>

            {/* Specimen Tag */}
            <span className="absolute top-2.5 left-2.5 specimen-tag bg-[var(--color-bg)]/90 backdrop-blur-sm border border-[var(--color-line)] px-2 py-0.5 text-[0.58rem] sm:text-[0.62rem] text-[var(--color-primary)] shadow-sm">
              {product.specimen || 'Specimen No.'}
            </span>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
              }}
              aria-label="Add to wishlist"
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-[var(--color-bg)]/90 backdrop-blur-sm border border-[var(--color-line)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--color-primary)] hover:text-white shadow-sm"
            >
              <Heart size={14} strokeWidth={1.6} />
            </button>
          </Link>
        </div>

        {/* Bottom Content Area */}
        <div className="pt-3 sm:pt-4 flex flex-col items-center text-center gap-2 w-full shrink-0">
          <div className="space-y-1 w-full flex flex-col items-center text-center">
            <Link
              to={`/product/${product.id}`}
              className="font-[var(--font-display)] text-base sm:text-lg font-bold leading-snug hover:text-[var(--color-primary)] transition-colors block text-center break-words line-clamp-2 max-w-full text-[var(--color-ink)]"
            >
              {product.title}
            </Link>
            <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] font-serif text-center">
              {formatPrice(product.price)}
            </p>
          </div>

          {/* Add to Bag CTA Button */}
          <button
            type="button"
            onClick={() => {
              addItem(product)
              openCart()
            }}
            className="btn-primary w-full py-2.5 px-3 text-[0.65rem] sm:text-[0.7rem] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-xl mt-1"
          >
            <ShoppingBag size={13} strokeWidth={1.8} />
            <span>Add to Bag</span>
          </button>
        </div>
      </motion.div>
    </TiltCard3D>
  )
}
