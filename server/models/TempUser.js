import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const tempUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    otp: { type: String, default: '' },
    otpExpire: { type: Date, required: true },
    otpAttempts: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Automatically delete unverified temp users after 15 minutes (900 seconds)
tempUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 })

tempUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

tempUserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

export default mongoose.model('TempUser', tempUserSchema)
