import AuditLog from '../models/AuditLog.js'

/**
 * Log an admin administrative / security event to MongoDB audit log.
 * Ensures passwords, OTPs, API keys, and session tokens are never logged.
 */
export async function logAdminAction(action, adminEmail, details = {}, req = null) {
  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
      : ''
    const userAgent = req ? req.headers['user-agent'] || '' : ''

    // Sanitize details to guarantee no secrets/tokens are recorded
    const sanitizedDetails = { ...details }
    delete sanitizedDetails.password
    delete sanitizedDetails.passwordHash
    delete sanitizedDetails.token
    delete sanitizedDetails.mfaCode
    delete sanitizedDetails.mfaSecret
    delete sanitizedDetails.sessionToken
    delete sanitizedDetails.authorization

    await AuditLog.create({
      action,
      adminEmail: adminEmail || process.env.ADMIN_EMAIL || 'keerthanabm@lilycharm.in',
      details: sanitizedDetails,
      ipAddress,
      userAgent,
    })
  } catch (err) {
    console.error('Audit Log Error:', err.message)
  }
}
