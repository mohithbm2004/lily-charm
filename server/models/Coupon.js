import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    discountValue: { type: Number, required: true }, // e.g. 20 for 20% or 500 for ₹500
    minOrderAmount: { type: Number, default: 0 }, // Minimum subtotal required (e.g. ₹1000)
    maxDiscountCap: { type: Number, default: 0 }, // Maximum discount capping (0 = no cap, e.g. ₹500)
    targetSegment: {
      type: String,
      default: 'All Products',
      enum: ['All Products', 'Pressed Flower Frames', 'Resin Flower Art', 'Wedding Collection', 'Velvet Sculptures'],
    },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.model('Coupon', couponSchema)
