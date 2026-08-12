import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, Minus, Plus, Star, Edit3, CheckCircle2 } from 'lucide-react'
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

  const currentImage = activeImg || product.image || allImages[0] || ''

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 pt-32 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
        <Reveal>
          <div className="space-y-4">
            <div className={`${isLandscape ? 'aspect-[16/11]' : 'aspect-[4/5]'} overflow-hidden bg-[var(--color-beige)]/40 border border-[var(--color-line)] relative`}>
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
                className="w-full h-full object-cover hover:scale-105"
              />
            </div>

            {/* Thumbnail Gallery selector */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {allImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImg(imgUrl)}
                    className={`w-16 h-20 shrink-0 border overflow-hidden transition-all ${
                      currentImage === imgUrl
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 scale-105'
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
        <Reveal delay={0.1}>
          <p className="specimen-tag mb-3">{product.specimen}</p>
          <h1 className="text-3xl md:text-4xl">{product.title}</h1>
          <p className="text-xl text-[var(--color-primary)] mt-3">{formatPrice(product.price)}</p>

          <div className="flex items-center gap-4 mt-8">
            <div className="flex items-center border border-[var(--color-line)]">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center"><Minus size={13} /></button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-9 h-9 flex items-center justify-center"><Plus size={13} /></button>
            </div>
            <button
              onClick={() => { addItem(product, qty); openCart() }}
              className="btn-primary flex-1"
            >
              Add to Cart
            </button>
            <button aria-label="Add to wishlist" className="w-11 h-11 border border-[var(--color-line)] flex items-center justify-center shrink-0">
              <Heart size={16} strokeWidth={1.4} />
            </button>
          </div>

          <div className="mt-10 border-t border-[var(--color-line)]">
            <div className="flex gap-6 mt-6">
              {['description', 'materials', 'reviews'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-xs tracking-[0.14em] uppercase font-[var(--font-button)] pb-2 border-b ${tab === t ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-ink-soft)]'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="pt-5 text-sm text-[var(--color-ink-soft)] leading-relaxed">
              {tab === 'description' && (
                <p>Every piece is one of a kind — natural variation in petal colour and shape is part of the work, not a flaw in it. Ships in a padded archival box with a certificate of care.</p>
              )}
              {tab === 'materials' && (
                <ul className="space-y-1.5">
                  <li>Materials: {product.materials}</li>
                  <li>Dimensions: {product.dimensions}</li>
                  <li>Care: keep out of direct sunlight, avoid humidity</li>
                </ul>
              )}
              {tab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                    <p className="font-bold text-xs uppercase tracking-wider text-[var(--color-ink)]">
                      Customer Reviews & Feedback ({productReviews.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(true)}
                      className="btn-primary py-1.5 px-3 text-[0.65rem] flex items-center gap-1.5"
                    >
                      <Edit3 size={12} /> Write a Review
                    </button>
                  </div>

                  {productReviews.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <p className="text-xs text-[var(--color-ink-soft)] italic">
                        No customer reviews yet for this piece. Be the first to share your thoughts!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {productReviews.map((r, i) => (
                        <div key={r._id || r.id || i} className="p-3.5 bg-[var(--color-card-bg)] border border-[var(--color-line)] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-[var(--color-ink)]">{r.name}</span>
                              {r.isVerifiedBuyer !== false && (
                                <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 size={10} /> Verified
                                </span>
                              )}
                            </div>
                            <div className="flex gap-0.5 text-amber-500">
                              {Array.from({ length: r.rating || 5 }).map((_, si) => (
                                <Star key={si} size={13} fill="currentColor" strokeWidth={0} />
                              ))}
                            </div>
                          </div>
                          {r.title && <p className="font-bold text-xs text-[var(--color-ink)]">"{r.title}"</p>}
                          <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed italic">
                            "{r.comment || r.quote}"
                          </p>
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

      {related.length > 0 && (
        <div className="mt-28">
          <Reveal>
            <p className="eyebrow mb-3">You May Also Like</p>
            <h2 className="text-2xl md:text-3xl mb-10">More from this collection</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
            {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        defaultProductTitle={product.title}
        onSuccess={() => {
          fetchProductReviews()
        }}
      />
    </div>
  )
}
