import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    rating: { type: Number, min: 1, max: 5, required: true, default: 5 },
    title: { type: String, default: '', trim: true },
    comment: { type: String, required: true, trim: true },
    productTitle: { type: String, default: 'Lily Charm Floral Creation', trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDisplayed: { type: Boolean, default: false }, // Moderation: only displayed when true
    isVerifiedBuyer: { type: Boolean, default: true },
    adminReply: { type: String, default: '', trim: true },
  },
  { timestamps: true }
)

export default mongoose.model('Review', reviewSchema)
