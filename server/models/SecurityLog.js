import mongoose from 'mongoose'

const securityLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      default: '',
      index: true,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    details: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'high', 'critical'],
      default: 'warning',
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

const SecurityLog = mongoose.model('SecurityLog', securityLogSchema)

export default SecurityLog
