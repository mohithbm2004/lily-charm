import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Plus, Loader2 } from 'lucide-react'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useAlert } from '../context/AlertContext'
import TiltCard3D from './TiltCard3D'

function ProductCard({ product, index = 0 }) {
  const { addItemAsync } = useCart()
  const { showAlert } = useAlert()
  const [loading, setLoading] = useState(false)

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
    <TiltCard3D intensity={10} className="h-full w-full max-w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="group border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-3 sm:p-4 flex flex-col justify-between shadow-md hover:shadow-xl transition-all relative text-center h-full w-full overflow-hidden"
      >
        {/* Vertically Centered Image Section */}
        <div className="flex-1 flex flex-col justify-center items-center my-auto w-full py-1 sm:py-2">
          <Link to={`/product/${product.id}`} className="block relative overflow-hidden border border-[var(--color-line)] bg-[var(--color-bg)] w-full rounded-2xl">
            <div className={`${isLandscape ? 'aspect-[16/11]' : 'aspect-[4/4.5]'} overflow-hidden relative flex items-center justify-center w-full rounded-2xl`}>
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
                    className={`w-full h-full object-cover rounded-2xl ${secondImg ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
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
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-0 group-hover:opacity-100 group-hover:scale-105"
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Image</div>
              )}
            </div>

            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 specimen-tag bg-[var(--color-bg)] border border-[var(--color-line)] rounded-full px-2 sm:px-2.5 py-0.5 font-medium text-[0.58rem] sm:text-[0.65rem] uppercase tracking-wider">
              {product.specimen || 'Specimen'}
            </span>

            <button
              onClick={(e) => {
                e.preventDefault()
              }}
              aria-label="Add to wishlist"
              className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--color-bg)] border border-[var(--color-line)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <Heart size={13} strokeWidth={1.5} />
            </button>
          </Link>
        </div>

        {/* Bottom Section - Title, Price, Button */}
        <div className="pt-2 sm:pt-3 flex flex-col items-center text-center gap-2 sm:gap-2.5 w-full shrink-0">
          <div className="space-y-0.5 sm:space-y-1 w-full flex flex-col items-center text-center">
            <Link
              to={`/product/${product.id}`}
              className="font-[var(--font-display)] text-sm sm:text-base md:text-lg font-semibold leading-snug hover:text-[var(--color-primary)] transition-colors block text-center break-words line-clamp-2 max-w-full"
            >
              {product.title}
            </Link>
            <p className="text-xs sm:text-sm font-medium text-[var(--color-ink-soft)] text-center">{formatPrice(product.price)}</p>
          </div>

          <button
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              if (loading) return
              setLoading(true)
              const res = await addItemAsync(product)
              if (!res || !res.success) {
                showAlert({
                  type: 'error',
                  title: 'Cart Update Failed',
                  message: res?.message || 'Unable to add this item. Please try again.',
                })
              }
              setLoading(false)
            }}
            disabled={loading}
            className="w-full btn-outline rounded-full py-2 px-1 text-[0.6rem] sm:text-[0.68rem] tracking-wider uppercase font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" /> ADDING...
              </>
            ) : (
              <>
                <Plus size={12} /> ADD TO CART
              </>
            )}
          </button>
        </div>
      </motion.div>
    </TiltCard3D>
  )
}

export default memo(ProductCard)
