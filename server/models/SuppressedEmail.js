import mongoose from 'mongoose'

const suppressedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      default: 'Hard bounce / undeliverable address',
    },
    bounceType: {
      type: String,
      enum: ['hard', 'soft', 'admin', 'webhook', 'manual'],
      default: 'hard',
    },
    bounceCode: {
      type: String,
      default: '550',
    },
    source: {
      type: String,
      default: 'zeptomail-smtp',
    },
    status: {
      type: String,
      default: 'undeliverable',
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

/**
 * Check whether an email address is currently suppressed as undeliverable
 */
suppressedEmailSchema.statics.isSuppressed = async function (email) {
  if (!email || typeof email !== 'string') return false
  const cleanEmail = email.trim().toLowerCase()
  const record = await this.findOne({ email: cleanEmail })
  return Boolean(record)
}

/**
 * Add or update an email address in the suppression list
 */
suppressedEmailSchema.statics.suppressEmail = async function ({
  email,
  reason = 'Hard bounce / undeliverable address',
  bounceType = 'hard',
  bounceCode = '550',
  source = 'zeptomail-smtp',
  metadata = {},
}) {
  if (!email || typeof email !== 'string') return null
  const cleanEmail = email.trim().toLowerCase()

  return await this.findOneAndUpdate(
    { email: cleanEmail },
    {
      $set: {
        reason,
        bounceType,
        bounceCode,
        source,
        status: 'undeliverable',
        metadata,
      },
    },
    { upsert: true, new: true }
  )
}

const SuppressedEmail = mongoose.model('SuppressedEmail', suppressedEmailSchema)

export default SuppressedEmail
