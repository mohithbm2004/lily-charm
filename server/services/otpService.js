import crypto from 'crypto'

export function generate6DigitOtp() {
  return crypto.randomInt(100000, 999999).toString()
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

export function isOtpExpired(expireDate) {
  if (!expireDate) return true
  return new Date() > new Date(expireDate)
}

export function canResendOtp(lastSentAt, cooldownSeconds = 60) {
  if (!lastSentAt) return true
  const timeDiffMs = Date.now() - new Date(lastSentAt).getTime()
  return timeDiffMs >= cooldownSeconds * 1000
}
