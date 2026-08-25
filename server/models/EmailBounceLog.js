import mongoose from 'mongoose'

const emailBounceLogSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    bounceType: {
      type: String,
      enum: ['hard', 'soft', 'deferral', 'spam_complaint', 'unknown'],
      default: 'hard',
      index: true,
    },
    bounceCode: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
    },
    channel: {
      type: String,
      default: 'OTP',
    },
    rawEvent: {
      type: Object,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

const EmailBounceLog = mongoose.model('EmailBounceLog', emailBounceLogSchema)

export default EmailBounceLog
