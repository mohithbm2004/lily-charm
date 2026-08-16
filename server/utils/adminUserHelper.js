import bcrypt from 'bcryptjs'
import AdminUser from '../models/AdminUser.js'
import { ENV } from '../config/env.js'

export const getAdminEmail = () => {
  return ENV.ADMIN_EMAIL
}

/**
 * Ensures the single SUPER_ADMIN user record exists in the database.
 * Seeds with process.env.ADMIN_PASSWORD_HASH or default hash if not present.
 */
export async function getOrCreateAdminUser() {
  const email = getAdminEmail()
  let admin = await AdminUser.findOne({ email })

  if (!admin) {
    let hash = process.env.ADMIN_PASSWORD_HASH
    let isInitialized = true

    if (!hash) {
      hash = await bcrypt.hash(ENV.ADMIN_PASSWORD, 12)
    }

    admin = await AdminUser.create({
      email,
      passwordHash: hash,
      isInitialized,
      lastPasswordChange: new Date(),
    })
    console.log(`[ADMIN SEED]: Created single SUPER_ADMIN account for ${email}`)
  }

  return admin
}

/**
 * Validates password strength according to security rules:
 * - Minimum 12 characters
 * - Uppercase, lowercase, number, special character required
 * - Rejects weak/common passwords
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' }
  }

  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters long.' }
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    }
  }

  const weakPasswords = [
    'password1234',
    'password12345',
    'admin12345678',
    'lilycharm1234',
    'keerthana1234',
    '123456789012',
    'qwertyuiop12',
  ]

  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'Password is too common or easily guessable. Please choose a stronger password.' }
  }

  return { valid: true }
}
