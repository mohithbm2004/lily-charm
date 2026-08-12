import AdminSession from '../models/AdminSession.js'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const ABSOLUTE_LIFETIME_MS = 12 * 60 * 60 * 1000 // 12 hours

export async function protectAdmin(req, res, next) {
  try {
    const sessionId = req.cookies?.lily_admin_session || req.headers['x-admin-session-id']

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required. No session cookie found.',
      })
    }

    const session = await AdminSession.findOne({ sessionId })

    if (!session) {
      res.clearCookie('lily_admin_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      return res.status(401).json({
        success: false,
        message: 'Invalid or terminated admin session.',
      })
    }

    const now = Date.now()

    // 1. Check absolute session lifetime (12 hours max)
    if (now > new Date(session.expiresAt).getTime()) {
      await AdminSession.deleteOne({ _id: session._id })
      res.clearCookie('lily_admin_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      return res.status(401).json({
        success: false,
        message: 'Admin session expired. Please sign in again.',
      })
    }

    // 2. Check inactivity timeout (30 minutes)
    const timeSinceLastActive = now - new Date(session.lastActiveAt).getTime()
    if (timeSinceLastActive > INACTIVITY_TIMEOUT_MS) {
      await AdminSession.deleteOne({ _id: session._id })
      res.clearCookie('lily_admin_session', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      return res.status(401).json({
        success: false,
        message: 'Admin session expired due to 30 minutes of inactivity.',
      })
    }

    // Update lastActiveAt timestamp
    session.lastActiveAt = new Date()
    await session.save()

    req.admin = { email: session.adminEmail, sessionId: session.sessionId }
    next()
  } catch (err) {
    console.error('protectAdmin Middleware Error:', err)
    return res.status(500).json({ success: false, message: 'Server error verifying admin session.' })
  }
}
