import mongoose from 'mongoose'

const adminUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isInitialized: {
      type: Boolean,
      default: true,
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
    resetOtpHash: {
      type: String,
      default: null,
    },
    resetOtpExpires: {
      type: Date,
      default: null,
    },
    resetOtpAttempts: {
      type: Number,
      default: 0,
    },
    lastOtpSentAt: {
      type: Date,
      default: null,
    },
    resetTokenHash: {
      type: String,
      default: null,
    },
    resetTokenExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

export default mongoose.model('AdminUser', adminUserSchema)
