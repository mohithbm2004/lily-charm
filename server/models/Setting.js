import mongoose from 'mongoose'

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main_studio_settings' },
    marqueeText: {
      type: String,
      default: 'EVERY PIECE HANDMADE TO ORDER • FREE SHIPPING ON ALL ORDERS ABOVE ₹2500 • CUSTOM BESPOKE ORDERS OPEN',
    },
    shippingFeeEnabled: { type: Boolean, default: true },
    standardShippingFee: { type: Number, default: 100 },
    freeShippingThreshold: { type: Number, default: 2500 },
  },
  { timestamps: true }
)

export default mongoose.model('Setting', settingSchema)
