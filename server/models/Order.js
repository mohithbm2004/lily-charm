import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: String,
    price: Number,
    qty: Number,
    image: String,
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    orderNumber: { type: String, default: () => `LC-${Date.now().toString().slice(-6)}` },
    items: [orderItemSchema],
    shippingAddress: {
      name: String,
      email: String,
      phone: String,
      line1: String,
      address: String,
      city: String,
      pincode: String,
    },
    subtotal: Number,
    shipping: Number,
    total: Number,
    paymentMethod: { type: String, default: 'Razorpay Prepaid' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'Handcrafting', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'paid',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
  },
  { timestamps: true }
)

export default mongoose.model('Order', orderSchema)
