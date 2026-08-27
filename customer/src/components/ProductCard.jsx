import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Plus, Loader2 } from 'lucide-react'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useAlert } from '../context/AlertContext'
import TiltCard3D from './TiltCard3D'

function ProductCard({ product, index = 0 }) {
  const { items, addItemAsync } = useCart()
  const { showAlert, showToast } = useAlert()
  const [loading, setLoading] = useState(false)

  const cartItem = items?.find(
    (i) =>
      String(i.id) === String(product.id) ||
      String(i._id) === String(product.id) ||
      (i.slug && i.slug === product.slug) ||
      (product._id && String(i.id) === String(product._id))
  )
  const isMaxQty = cartItem && cartItem.qty >= 4

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
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="group bg-[var(--color-card-bg)] rounded-2xl p-4 flex flex-col justify-between luxury-shadow-sm hover:shadow-2xl transition-all duration-500 relative text-center h-full w-full overflow-hidden"
      >
        {/* Vertically Centered Image Section */}
        <div className="flex-1 flex flex-col justify-center items-center my-auto w-full py-1">
          <Link to={`/product/${product.id}`} className="block relative overflow-hidden bg-[var(--color-bg)] w-full rounded-xl">
            <div className={`${isLandscape ? 'aspect-[16/11]' : 'aspect-[4/5]'} overflow-hidden relative flex items-center justify-center w-full rounded-xl`}>
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
                      transition: 'opacity 0.6s ease, transform 0.8s ease-out',
                    }}
                    className={`w-full h-full object-cover rounded-xl ${secondImg ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
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
                        transition: 'opacity 0.6s ease, transform 0.8s ease-out',
                      }}
                      className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-0 group-hover:opacity-100 group-hover:scale-105"
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-ink-soft)] font-mono">No Image</div>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-stone-900/90 text-white font-bold text-[0.62rem] sm:text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-lg shadow-md">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            <span className="absolute top-3 left-3 specimen-tag bg-[var(--color-bg)]/90 backdrop-blur-md rounded-md px-2.5 py-1 font-semibold text-[0.58rem] sm:text-[0.6rem] text-[var(--color-brown)] uppercase tracking-[0.2em]">
              {product.specimen || 'Specimen'}
            </span>

            <button
              onClick={(e) => {
                e.preventDefault()
              }}
              aria-label="Add to wishlist"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[var(--color-bg)]/90 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-sm hover:scale-110 hover:text-rose-600 cursor-pointer"
            >
              <Heart size={13} strokeWidth={1.6} />
            </button>
          </Link>
        </div>

        {/* Bottom Section - Title, Price, Button */}
        <div className="pt-3.5 flex flex-col items-center text-center gap-2.5 w-full shrink-0">
          <div className="space-y-1 w-full flex flex-col items-center text-center">
            <Link
              to={`/product/${product.id}`}
              className="font-[var(--font-display)] text-sm sm:text-base md:text-lg font-medium leading-snug tracking-tight text-[var(--color-ink)] hover:text-[var(--color-primary)] transition-colors block text-center break-words line-clamp-2 max-w-full"
            >
              {product.title}
            </Link>
            <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] font-sans text-center">{formatPrice(product.price)}</p>
          </div>

          <button
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              if (loading || isMaxQty || product.stock === 0) return
              setLoading(true)
              const res = await addItemAsync(product)
              if (res && res.success) {
                showToast({
                  title: 'Added to Cart',
                  message: product.title,
                  image: firstImg,
                })
              } else {
                showAlert({
                  type: 'error',
                  title: 'Cart Update Failed',
                  message: res?.message || 'Unable to add this item. Please try again.',
                })
              }
              setLoading(false)
            }}
            disabled={loading || isMaxQty || product.stock === 0}
            className={`w-full btn-outline rounded-xl py-3 px-2 text-[0.64rem] sm:text-[0.68rem] tracking-[0.2em] uppercase font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis ${
              product.stock === 0 ? 'border-rose-400/40 text-rose-700/60 bg-rose-50/20' :
              isMaxQty ? 'border-amber-600/40 text-amber-700/60 bg-amber-50/20' : ''
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" /> ADDING...
              </>
            ) : product.stock === 0 ? (
              <>OUT OF STOCK</>
            ) : isMaxQty ? (
              <>LIMIT REACHED (4)</>
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
