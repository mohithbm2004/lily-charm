import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, Minus, Plus, Star, Edit3, CheckCircle2, ShoppingBag } from 'lucide-react'
import { useStudio } from '../context/StudioContext'
import { formatPrice } from '../lib/format'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import ReviewModal from '../components/ReviewModal'
import { API_URL } from '../config/api'

export default function Product() {
  const { products } = useStudio()
  const { id } = useParams()
  const product = products.find((p) => p.id === id) || products[0]
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('description')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [productReviews, setProductReviews] = useState([])
  const { addItem, openCart } = useCart()

  const fetchProductReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/reviews`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const matched = data.filter(
            (r) =>
              (r.product && r.product === (product._id || product.id)) ||
              (r.productTitle && r.productTitle.toLowerCase().includes(product.title.toLowerCase()))
          )
          setProductReviews(matched.length > 0 ? matched : data.slice(0, 3))
        }
      }
    } catch {}
  }

  useEffect(() => {
    fetchProductReviews()
  }, [product?.id, product?._id, product?.title])

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4)

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
        
        {/* Left: High-Impact Image Showcase */}
        <Reveal>
          <div className="space-y-3.5 sm:space-y-4">
            <div className={`card-rounded ${isLandscape ? 'aspect-[16/11]' : 'aspect-[3/3.8]'} overflow-hidden relative w-full border border-[var(--color-line)] bg-[var(--color-bg)] shadow-md`}>
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
                className="w-full h-full object-cover"
              />
              
              <span className="absolute top-3 left-3 specimen-tag bg-[var(--color-bg)]/90 backdrop-blur-sm border border-[var(--color-line)] px-2.5 py-1 text-[0.62rem] text-[var(--color-primary)] font-bold shadow-sm">
                {product.specimen || 'Archival Specimen'}
              </span>
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {allImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImg(imgUrl)}
                    className={`w-16 h-20 sm:w-18 sm:h-22 shrink-0 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      currentImage === imgUrl
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 scale-105 shadow-md'
                        : 'border-[var(--color-line)] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Right: Product Details & Actions */}
        <Reveal delay={0.1}>
          <div className="space-y-5 sm:space-y-6">
            <div>
              <span className="eyebrow block mb-1.5 text-[var(--color-primary)]">Preserved Botanical Artwork</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-[var(--font-display)] text-[var(--color-ink)] leading-tight">
                {product.title}
              </h1>
              <p className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] font-serif mt-2">
                {formatPrice(product.price)}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal">
              {product.description || 'Artfully preserved botanicals meticulously handcrafted in our atelier. Every creation is archival quality, capturing timeless organic beauty for years to come.'}
            </p>

            {/* Purchase Action Controls */}
            <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-3 pt-2">
              <div className="flex items-center border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-11 flex items-center justify-center hover:bg-black/5 rounded-l-xl cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <span className="w-10 text-center text-sm font-bold font-mono">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-11 flex items-center justify-center hover:bg-black/5 rounded-r-xl cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => { addItem(product, qty); openCart() }}
                className="btn-primary flex-1 py-3 text-xs uppercase font-bold tracking-widest text-center flex items-center justify-center gap-2 shadow-md"
              >
                <ShoppingBag size={14} />
                <span>Add to Bag • {formatPrice(product.price * qty)}</span>
              </button>

              <button
                type="button"
                aria-label="Add to wishlist"
                className="w-11 h-11 border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-xl flex items-center justify-center shrink-0 hover:bg-[var(--color-primary)] hover:text-white transition-colors cursor-pointer"
              >
                <Heart size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Details Accordion / Tabs */}
            <div className="pt-6 border-t border-[var(--color-line)] space-y-3 text-xs sm:text-sm">
              <div className="flex border-b border-[var(--color-line)] gap-6">
                <button
                  type="button"
                  onClick={() => setTab('description')}
                  className={`pb-2.5 uppercase font-bold text-xs tracking-wider border-b-2 transition-colors cursor-pointer ${
                    tab === 'description' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setTab('care')}
                  className={`pb-2.5 uppercase font-bold text-xs tracking-wider border-b-2 transition-colors cursor-pointer ${
                    tab === 'care' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'
                  }`}
                >
                  Care Guide
                </button>
                <button
                  type="button"
                  onClick={() => setTab('reviews')}
                  className={`pb-2.5 uppercase font-bold text-xs tracking-wider border-b-2 transition-colors cursor-pointer ${
                    tab === 'reviews' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'
                  }`}
                >
                  Reviews ({productReviews.length})
                </button>
              </div>

              {tab === 'description' && (
                <div className="space-y-2 text-[var(--color-ink-soft)] pt-2 leading-relaxed font-normal">
                  <p>• Handcrafted individually using archival preservation techniques.</p>
                  <p>• Retains rich organic colors and velvet textures indefinitely without water.</p>
                  <p>• Dimensions: approx. 30cm × 22cm (custom sizing available on request).</p>
                </div>
              )}

              {tab === 'care' && (
                <div className="space-y-2 text-[var(--color-ink-soft)] pt-2 leading-relaxed font-normal">
                  <p>• Keep away from direct harsh sunlight to prevent UV color shifting.</p>
                  <p>• Display in a dry indoor area; do not expose to heavy moisture or water.</p>
                  <p>• Lightly dust with a soft feather brush every few months.</p>
                </div>
              )}

              {tab === 'reviews' && (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-xs uppercase tracking-wider">Verified Buyer Reviews</p>
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(true)}
                      className="text-xs text-[var(--color-primary)] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={12} /> Write Review
                    </button>
                  </div>

                  {productReviews.length === 0 ? (
                    <p className="text-xs text-[var(--color-ink-soft)]">No reviews yet for this piece. Be the first to share your experience!</p>
                  ) : (
                    <div className="space-y-3">
                      {productReviews.map((r, i) => (
                        <div key={r._id || i} className="card-luxury p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{r.name}</span>
                            <div className="flex text-[var(--color-gold)]">
                              {Array.from({ length: r.rating || 5 }).map((_, idx) => (
                                <Star key={idx} size={11} fill="currentColor" />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--color-ink-soft)] italic">&ldquo;{r.comment || r.quote}&rdquo;</p>
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
          <Reveal className="mb-8">
            <p className="eyebrow mb-1">You May Also Like</p>
            <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)]">Related Creations</h2>
          </Reveal>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
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
