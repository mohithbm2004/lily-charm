import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    id: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, default: 1, min: 1, max: 4 },
    image: { type: String, default: '' },
    specimen: { type: String, default: '' },
  },
  { _id: false }
)

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    coupon: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

export default mongoose.model('Cart', cartSchema)
