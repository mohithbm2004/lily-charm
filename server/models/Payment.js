import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    orderNumber: { type: String, required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, default: 'Razorpay Prepaid' },
    status: {
      type: String,
      enum: ['captured', 'failed', 'refunded', 'pending'],
      default: 'pending',
    },
    errorDescription: { type: String, default: '' },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

export default mongoose.model('Payment', paymentSchema)
