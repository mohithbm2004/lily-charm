import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    specimen: String,
    slug: { type: String },
    category: {
      type: String,
      default: 'velvet-lilies',
    },
    price: { type: Number, required: true },
    description: String,
    materials: String,
    dimensions: String,
    image: String,
    images: { type: [String], default: [] },
    stock: { type: Number, default: 10 },
    isBestSeller: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 5 },
    ratingCount: { type: Number, default: 1 },
    imageOrientation: { type: String, default: 'portrait', enum: ['landscape', 'portrait'] },
    imageX: { type: Number, default: 50 },    // focal point x  0–100
    imageY: { type: Number, default: 50 },    // focal point y  0–100
    imageScale: { type: Number, default: 1 }, // zoom factor   1–3
    imageRatio: { type: Number, default: null }, // naturalWidth/naturalHeight
  },
  { timestamps: true }
)

productSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `flower-${Date.now()}`
  }
  next()
})

productSchema.index({ title: 'text', description: 'text' })

export default mongoose.model('Product', productSchema)
