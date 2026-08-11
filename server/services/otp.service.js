import crypto from 'crypto'
import { sendEmail, compileTemplate } from './email.service.js'

export function generate6DigitOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function isOtpExpired(otpExpire) {
  if (!otpExpire) return true
  return new Date() > new Date(otpExpire)
}

export function canResendOtp(lastOtpSentAt, cooldownSeconds = 60) {
  if (!lastOtpSentAt) return true
  const secondsSince = (Date.now() - new Date(lastOtpSentAt).getTime()) / 1000
  return secondsSince >= cooldownSeconds
}

/**
 * Brevo Provider: Send OTP Email for Registration or Password Reset
 */
export async function sendOtpEmail(email, name, otp, isReset = false) {
  const storeName = 'Lily Charm Studio'
  const heading = isReset ? 'Reset Your Password' : 'Verify Your Email Address'
  const message = isReset
    ? 'You requested to reset your password. Use the verification OTP code below to continue:'
    : 'Thank you for registering at Lily Charm. Please verify your email address using the OTP code below:'

  const html = compileTemplate('otp.html', {
    title: `${heading} - ${storeName}`,
    heading,
    name: name || 'Valued Customer',
    message,
    otp,
  })

  return await sendEmail({
    provider: 'smtp',
    type: isReset ? 'reset-password' : 'otp',
    to: email,
    subject: isReset ? `🔑 ${otp} is your Lily Charm Password Reset Code` : `🔐 ${otp} is your Lily Charm Verification Code`,
    text: `${heading}: ${otp}. Valid for 5 minutes.`,
    html,
  })
}

/**
 * Send Password Reset Link Email via Direct Zoho SMTP
 */
export async function sendPasswordResetEmail(email, name, resetUrl) {
  const storeName = 'Lily Charm Studio'
  const html = compileTemplate('otp.html', {
    title: `Password Reset - ${storeName}`,
    heading: 'Reset Password Request',
    name: name || 'Valued Customer',
    message: `Click the link below or use your secure password reset URL: <br/><a href="${resetUrl}">${resetUrl}</a>`,
    otp: 'RESET-LINK',
  })

  return await sendEmail({
    provider: 'smtp',
    type: 'reset-password',
    to: email,
    subject: `🔑 Reset Your Lily Charm Password`,
    text: `Reset your Lily Charm password by visiting: ${resetUrl}`,
    html,
  })
}

/**
 * Send Welcome Email to Verified User via Direct Zoho SMTP
 */
export async function sendWelcomeEmail(email, name) {
  const storeUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const html = compileTemplate('welcome.html', {
    name: name || 'Valued Customer',
    storeUrl,
  })

  return await sendEmail({
    provider: 'smtp',
    type: 'welcome',
    to: email,
    subject: `🌸 Welcome to Lily Charm Velvet Floral Studio!`,
    text: `Welcome to Lily Charm, ${name}! Your account is active.`,
    html,
  })
}

export default {
  generate6DigitOtp,
  hashToken,
  isOtpExpired,
  canResendOtp,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
}
