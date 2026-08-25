import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    internalPaymentId: {
      type: String,
      default: () => `PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      unique: true,
    },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    customRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomRequest', required: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    orderNumber: { type: String, required: true },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: { type: String, default: '', index: true },
    razorpaySignature: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, default: 'Razorpay Prepaid' },
    status: {
      type: String,
      enum: ['pending', 'captured', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    errorDescription: { type: String, default: '' },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date },
  },
  { timestamps: true }
)

paymentSchema.index({ razorpayOrderId: 1, status: 1 })

export default mongoose.model('Payment', paymentSchema)
