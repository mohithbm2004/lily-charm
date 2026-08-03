import mongoose from 'mongoose'

const customRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    stylePreference: { type: String, default: 'Custom Floral Arrangement' },
    notes: { type: String, default: '' },
    image: { type: String, default: '' },
    images: { type: [String], default: [] },
    quotedPrice: { type: Number, default: 0 },
    adminNotes: { type: String, default: '' },
    convertedOrderId: { type: String, default: '' },
    status: {
      type: String,
      default: 'Quote Pending',
      enum: ['Quote Pending', 'Quoted', 'Accepted & Order Created', 'Quote Declined', 'Completed', 'Rejected'],
    },
  },
  { timestamps: true }
)

export default mongoose.model('CustomRequest', customRequestSchema)
