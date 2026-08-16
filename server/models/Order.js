import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: String,
    price: Number,
    qty: Number,
    image: String,
    specimen: String,
  },
  { _id: false }
)

const statusHistorySchema = new mongoose.Schema(
  {
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderNumber: {
      type: String,
      default: () => `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      unique: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      name: String,
      email: String,
      phone: String,
      line1: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
    billingAddress: {
      name: String,
      email: String,
      phone: String,
      line1: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
    },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: '' },
    tax: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Razorpay Prepaid' },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'],
      default: 'Pending',
    },
    status: {
      type: String,
      enum: [
        'Pending Payment',
        'Payment Failed',
        'Paid',
        'Confirmed',
        'Order Confirmed',
        'Handcrafting in Studio',
        'Handcrafting',
        'Studio Processing',
        'Processing',
        'Packed & Sealed',
        'Packed',
        'Packed & Dispatched',
        'Shipped',
        'Out For Delivery',
        'Delivered',
        'Cancelled',
        'Cancelled & Refunded',
        'Refund Requested',
        'Refund Approved',
        'Refund Rejected',
        'Returned',
        'Pending',
      ],
      default: 'Pending Payment',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    razorpayRefundId: String,
    trackingNumber: { type: String, default: '' },
    carrier: { type: String, default: 'BlueDart / Delhivery' },
    estimatedDelivery: { type: Date },
    notes: { type: String, default: '' },
    refundReason: { type: String, default: '' },
    refundAmount: { type: Number, default: 0 },
    cancellationFee: { type: Number, default: 0 },
    refundStatus: { type: String, default: 'None' },
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
    termsVersion: { type: String, default: null },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
)

orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ razorpayOrderId: 1 })

export default mongoose.model('Order', orderSchema)
