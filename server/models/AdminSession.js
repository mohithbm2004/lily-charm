import mongoose from 'mongoose'

const adminSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  adminEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  isPreMfa: { type: Boolean, default: false },
})

export default mongoose.model('AdminSession', adminSessionSchema)
