import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, Minus, Plus, Star, Edit3, CheckCircle2, Loader2 } from 'lucide-react'
import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import { useAlert } from '../context/AlertContext'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import ReviewModal from '../components/ReviewModal'
import { API_URL } from '../config/api'

export default function Product() {
  const { products = [], loading = false } = useStudio()
  const { id } = useParams()
  const product = (products || []).find(
    (p) =>
      p &&
      (String(p.id) === String(id) ||
        String(p.slug) === String(id) ||
        String(p._id) === String(id) ||
        String(p.mongoId) === String(id))
  )
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('description')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [productReviews, setProductReviews] = useState([])
  const { addItemAsync, openCart } = useCart()
  const { showAlert } = useAlert()
  const [loadingCart, setLoadingCart] = useState(false)

  const fetchProductReviews = async () => {
    if (!product) return
    try {
      const res = await fetch(`${API_URL}/reviews`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const matched = data.filter(
            (r) =>
              r &&
              ((r.product && r.product === (product._id || product.id)) ||
                (r.productTitle && r.productTitle.toLowerCase().includes((product.title || '').toLowerCase())))
          )
          setProductReviews(matched)
        }
      }
    } catch {}
  }

  useEffect(() => {
    if (product) fetchProductReviews()
  }, [product?.id, product?._id, product?.title])

  if (loading && !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-36 pb-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs uppercase tracking-widest font-mono text-[var(--color-ink-soft)]">
          Preparing creation details...
        </p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-32 pb-24 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)]">Creation Not Found</h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-3">This floral artwork is not available in our studio catalog.</p>
        <Link to="/shop" className="btn-primary inline-block mt-6 rounded-full">
          Return to Catalog
        </Link>
      </div>
    )
  }

  const related = (products || [])
    .filter((p) => p && p.category === product.category && (p.id || p._id) !== (product.id || product._id))
    .slice(0, 4)

  const ix = product.imageX ?? 50
  const iy = product.imageY ?? 50
  const isc = product.imageScale ?? 1
  const isLandscape = product.imageOrientation === 'landscape'

  const allImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map(i => typeof i === 'object' ? i.url : i)
    : (product.image ? [product.image] : [])

  const [activeImg, setActiveImg] = useState(product.image || allImages[0] || '')

  useEffect(() => {
    setActiveImg(product.image || allImages[0] || '')
    setQty(1)
  }, [product?.id])

  const currentImage = activeImg || product.image || allImages[0] || ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full max-w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-start">
        {/* Left: Product Images */}
        <Reveal>
          <div className="space-y-3 sm:space-y-4">
            <div className={`${isLandscape ? 'aspect-[16/11]' : 'aspect-[4/5]'} overflow-hidden rounded-3xl bg-[var(--color-beige)]/40 border border-[var(--color-line)] relative w-full`}>
              <img
                src={currentImage}
                alt={product.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${ix}% ${iy}%`,
                  transform: `scale(${isc})`,
                  transformOrigin: `${ix}% ${iy}%`,
                  transition: 'all 0.5s ease',
                }}
                className="w-full h-full object-cover hover:scale-105 rounded-3xl"
              />
            </div>

            {/* Thumbnail Gallery selector */}
            {allImages.length > 1 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {allImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImg(imgUrl)}
                    className={`w-14 h-16 sm:w-16 sm:h-20 shrink-0 border rounded-2xl overflow-hidden transition-all ${
                      currentImage === imgUrl
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 scale-105'
                        : 'border-[var(--color-line)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover rounded-2xl" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Right: Product Info & Actions */}
        <Reveal delay={0.1}>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <p className="specimen-tag mb-2 text-[0.62rem] sm:text-[0.68rem]">{product.specimen}</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)]">{product.title}</h1>
              <p className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] mt-2">{formatPrice(product.price)}</p>
            </div>

            <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {product.description || 'Artfully preserved botanicals meticulously handcrafted in our atelier. Every creation is archival quality, capturing timeless organic beauty for years to come.'}
            </p>

            {/* Purchase Action Controls */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2.5 sm:gap-4">
                <div className="flex items-center border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-full shrink-0 overflow-hidden px-1">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-11 flex items-center justify-center hover:bg-black/5 rounded-full cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-10 text-center text-sm font-bold font-mono">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(4, q + 1))}
                    disabled={qty >= 4}
                    className="w-10 h-11 flex items-center justify-center hover:bg-black/5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Increase quantity"
                    title={qty >= 4 ? 'Maximum limit of 4 units per design' : 'Increase quantity'}
                  >
                    <Plus size={13} />
                  </button>
                </div>

                <button
                  onClick={async () => {
                    if (loadingCart) return
                    setLoadingCart(true)
                    const res = await addItemAsync(product, qty)
                    if (res && res.success) {
                      openCart()
                    } else {
                      showAlert({
                        type: 'error',
                        title: 'Cart Update Failed',
                        message: res?.message || 'Unable to add this item. Please try again.',
                      })
                    }
                    setLoadingCart(false)
                  }}
                  disabled={loadingCart}
                  className="btn-primary flex-1 py-3 text-xs uppercase font-bold tracking-widest text-center rounded-full shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingCart ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> ADDING...
                    </>
                  ) : (
                    <>Add to Cart • {formatPrice(product.price * qty)}</>
                  )}
                </button>

                <button
                  aria-label="Add to wishlist"
                  className="w-11 h-11 border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-full flex items-center justify-center shrink-0 hover:bg-black/5 cursor-pointer"
                >
                  <Heart size={16} strokeWidth={1.4} />
                </button>
              </div>

              <p className="text-[0.68rem] text-[var(--color-primary)] font-mono font-medium flex items-center gap-1">
                🌸 Limited Studio Edition: Maximum 4 units per handcrafted design.
              </p>
            </div>

            {/* Details Accordion / Tabs */}
            <div className="pt-6 border-t border-[var(--color-line)] space-y-3 text-xs sm:text-sm">
              <div className="flex border-b border-[var(--color-line)] gap-6">
                <button
                  onClick={() => setTab('description')}
                  className={`pb-2 uppercase font-bold text-xs tracking-wider border-b-2 transition-colors ${
                    tab === 'description' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setTab('care')}
                  className={`pb-2 uppercase font-bold text-xs tracking-wider border-b-2 transition-colors ${
                    tab === 'care' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'
                  }`}
                >
                  Care Guide
                </button>
                <button
                  onClick={() => setTab('reviews')}
                  className={`pb-2 uppercase font-bold text-xs tracking-wider border-b-2 transition-colors ${
                    tab === 'reviews' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'
                  }`}
                >
                  Reviews ({productReviews.length})
                </button>
              </div>

              {tab === 'description' && (
                <div className="space-y-2 text-[var(--color-ink-soft)] pt-2 leading-relaxed">
                  <p>• Handcrafted individually using archival preservation techniques.</p>
                  <p>• Retains rich organic colors and velvet textures indefinitely without water.</p>
                  <p>• Dimensions: approx. 30cm × 22cm (custom sizing available on request).</p>
                </div>
              )}

              {tab === 'care' && (
                <div className="space-y-2 text-[var(--color-ink-soft)] pt-2 leading-relaxed">
                  <p>• Keep away from direct harsh sunlight to prevent UV color shifting.</p>
                  <p>• Display in a dry indoor area; do not expose to heavy moisture or water.</p>
                  <p>• Lightly dust with a soft feather brush every few months.</p>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-xs uppercase tracking-wider">Customer Reviews</p>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="text-xs text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1"
                    >
                      <Edit3 size={12} /> Write Review
                    </button>
                  </div>

                  {productReviews.length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-soft)]">No reviews yet for this piece. Be the first to share your experience!</p>
                  ) : (
                    <div className="space-y-3">
                      {productReviews.map((r, i) => (
                        <div key={r._id || i} className="p-3.5 bg-[var(--color-card-bg)] border border-[var(--color-line)] rounded-2xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{r.name}</span>
                            <div className="flex text-amber-500">
                              {Array.from({ length: r.rating || 5 }).map((_, idx) => (
                                <Star key={idx} size={11} fill="currentColor" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--color-ink-soft)] italic">"{r.comment || r.quote}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* Related Products Section */}
      {related.length > 0 && (
        <div className="mt-20 pt-16 border-t border-[var(--color-line)]">
          <Reveal>
            <p className="eyebrow mb-2">You May Also Like</p>
            <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)] mb-8">Related Creations</h2>
          </Reveal>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 gap-y-8">
            {related.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        defaultProductTitle={product.title}
        onSuccess={fetchProductReviews}
      />
    </div>
  )
}
