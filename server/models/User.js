import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    alternateEmails: [{ type: String, lowercase: true, trim: true }],
    password: { type: String, default: '', select: false },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    avatar: { type: String, default: '' },
    googleId: { type: String, default: '' },
    provider: { type: String, enum: ['email', 'google'], default: 'email' },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: '' },
    otpExpire: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date },
    resetPasswordToken: { type: String, default: '' },
    resetPasswordExpire: { type: Date },
    lastLogin: { type: Date },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return false
  return bcrypt.compare(candidate, this.password)
}

export default mongoose.model('User', userSchema)
