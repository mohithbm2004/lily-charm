import mongoose from 'mongoose'

const collectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    blurb: { type: String, required: true },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: true },
    imageOrientation: { type: String, default: 'landscape', enum: ['landscape', 'portrait'] },
    imageX: { type: Number, default: 50 },    // focal point x  0–100
    imageY: { type: Number, default: 50 },    // focal point y  0–100
    imageScale: { type: Number, default: 1 }, // zoom factor   1–3
    imageRatio: { type: Number, default: null }, // naturalWidth/naturalHeight, e.g. 0.75 for 3:4 portrait
  },
  { timestamps: true }
)

export default mongoose.model('Collection', collectionSchema)
