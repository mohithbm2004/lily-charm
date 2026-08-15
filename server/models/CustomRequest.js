import mongoose from 'mongoose'

const customRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, required: true },
    city: { type: String, required: true },
    pincode: { type: String, required: true },
    stylePreference: { type: String, default: 'Custom Floral Arrangement' },
    notes: { type: String, default: '' },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    quotedPrice: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    convertedOrderId: { type: String, default: '' },
    status: {
      type: String,
      default: 'Quote Pending',
      enum: [
        'Quote Pending',
        'In Review',
        'Quoted',
        'Accepted & Order Created',
        'Paid & Order Placed',
        'Paid & Confirmed',
        'Quote Declined',
        'Declined',
        'Completed',
        'Rejected',
      ],
    },
  },
  { timestamps: true }
)

customRequestSchema.index({ user: 1, createdAt: -1 })
customRequestSchema.index({ razorpayOrderId: 1 })

export default mongoose.model('CustomRequest', customRequestSchema)
