import mongoose from 'mongoose'

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main_studio_settings' },
    offerCode: { type: String, default: 'LILY10' },
    discountPercent: { type: Number, default: 10 },
    offerTitle: { type: String, default: '10% OFF Studio Discount' },
    isOfferActive: { type: Boolean, default: true },
    marqueeText: {
      type: String,
      default: 'EVERY PIECE HANDMADE TO ORDER • FREE SHIPPING ON ALL ORDERS • CUSTOM BESPOKE ORDERS OPEN',
    },
  },
  { timestamps: true }
)

export default mongoose.model('Setting', settingSchema)
