import SuppressedEmail from '../models/SuppressedEmail.js'
import EmailBounceLog from '../models/EmailBounceLog.js'
import SecurityLog from '../models/SecurityLog.js'
import emailCircuitBreaker from '../utils/emailCircuitBreaker.js'
import { maskEmailForDisplay } from '../utils/emailValidator.js'

// GET /api/admin/email-security/stats
export async function getEmailSecurityStats(req, res, next) {
  try {
    const cbStatus = emailCircuitBreaker.getStatus()
    const totalSuppressed = await SuppressedEmail.countDocuments({})

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const hardBounces24h = await EmailBounceLog.countDocuments({
      bounceType: 'hard',
      createdAt: { $gte: last24h },
    })
    const softBounces24h = await EmailBounceLog.countDocuments({
      bounceType: 'soft',
      createdAt: { $gte: last24h },
    })
    const securityIncidents24h = await SecurityLog.countDocuments({
      createdAt: { $gte: last24h },
    })

    res.json({
      success: true,
      circuitBreaker: cbStatus,
      stats: {
        totalSuppressed,
        hardBounces24h,
        softBounces24h,
        securityIncidents24h,
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/email-security/suppressed
export async function getSuppressedEmails(req, res, next) {
  try {
    const { search, page = 1, limit = 20 } = req.query
    const query = {}

    if (search && search.trim()) {
      query.email = { $regex: search.trim().toLowerCase(), $options: 'i' }
    }

    const skip = (Number(page) - 1) * Number(limit)
    const total = await SuppressedEmail.countDocuments(query)

    const list = await SuppressedEmail.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const maskedList = list.map((doc) => {
      const obj = doc.toObject()
      obj.maskedEmail = maskEmailForDisplay(obj.email)
      return obj
    })

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      suppressedEmails: maskedList,
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/email-security/suppressed/:email
export async function removeSuppressedEmail(req, res, next) {
  try {
    const { email } = req.params
    if (!email) return res.status(400).json({ message: 'Email address is required.' })

    const cleanEmail = email.trim().toLowerCase()
    const deleted = await SuppressedEmail.findOneAndDelete({ email: cleanEmail })

    if (!deleted) {
      return res.status(404).json({ message: 'Email address not found in suppression list.' })
    }

    SecurityLog.create({
      eventType: 'SUPPRESSED_EMAIL_REMOVED',
      email: cleanEmail,
      details: `Admin ${req.admin?.email || 'studio-admin'} un-suppressed email address`,
      severity: 'info',
    }).catch(console.error)

    res.json({
      success: true,
      message: `Email address ${cleanEmail} has been removed from suppression list.`,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/email-security/bounces
export async function getBounceLogs(req, res, next) {
  try {
    const { page = 1, limit = 30 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const total = await EmailBounceLog.countDocuments({})
    const logs = await EmailBounceLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      bounceLogs: logs,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/email-security/circuit-breaker/reset
export async function resetCircuitBreaker(req, res, next) {
  try {
    emailCircuitBreaker.reset()

    SecurityLog.create({
      eventType: 'CIRCUIT_BREAKER_RESET_MANUAL',
      details: `Admin ${req.admin?.email || 'studio-admin'} manually reset the email circuit breaker`,
      severity: 'info',
    }).catch(console.error)

    res.json({
      success: true,
      message: 'Email circuit breaker has been reset to CLOSED.',
      status: emailCircuitBreaker.getStatus(),
    })
  } catch (err) {
    next(err)
  }
}
