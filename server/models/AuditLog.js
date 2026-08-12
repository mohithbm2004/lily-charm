import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true, index: true },
  adminEmail: { type: String, required: true, index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
})

export default mongoose.model('AuditLog', auditLogSchema)
