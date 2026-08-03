import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Plus } from 'lucide-react'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group border border-[var(--color-line)] bg-[var(--color-card-bg)] p-3 flex flex-col justify-between hover:shadow-md transition-all relative text-center h-full"
    >
      {/* Vertically Centered Image Section */}
      <div className="flex-1 flex flex-col justify-center items-center my-auto w-full py-2">
        <Link to={`/product/${product.id}`} className="block relative overflow-hidden border border-[var(--color-line)] bg-[var(--color-bg)] w-full">
          <div className={`${isLandscape ? 'aspect-[16/11]' : 'aspect-[4/4.5]'} overflow-hidden relative flex items-center justify-center`}>
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
                    transition: 'opacity 0.5s ease, transform 0.7s ease-out',
                  }}
                  className={`w-full h-full object-cover ${secondImg ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
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
                      transition: 'opacity 0.5s ease, transform 0.7s ease-out',
                    }}
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 group-hover:scale-105"
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Image</div>
            )}
          </div>

          <span className="absolute top-3 left-3 specimen-tag bg-[var(--color-bg)] border border-[var(--color-line)] px-2 py-0.5 font-medium text-[0.65rem] uppercase tracking-wider">
            {product.specimen || 'Specimen'}
          </span>

          <button
            onClick={(e) => {
              e.preventDefault()
            }}
            aria-label="Add to wishlist"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-line)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart size={14} strokeWidth={1.5} />
          </button>
        </Link>
      </div>

      {/* Bottom Section - Title, Price, Button */}
      <div className="pt-3 flex flex-col items-center text-center gap-2.5 w-full shrink-0">
        <div className="space-y-1 w-full flex flex-col items-center text-center">
          <Link
            to={`/product/${product.id}`}
            className="font-[var(--font-display)] text-lg font-semibold leading-snug hover:text-[var(--color-primary)] transition-colors block text-center break-words line-clamp-2 max-w-full"
          >
            {product.title}
          </Link>
          <p className="text-sm font-medium text-[var(--color-ink-soft)] text-center">{formatPrice(product.price)}</p>
        </div>

        <button
          onClick={() => {
            addItem(product)
            openCart()
          }}
          className="w-full btn-outline py-2.5 text-[0.68rem] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={13} /> ADD TO CART
        </button>
      </div>
    </motion.div>
  )
}
