import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import AdminSession from '../models/AdminSession.js'

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' })
    }
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id)
    if (!req.user) return res.status(401).json({ message: 'User no longer exists' })
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid' })
  }
}

export async function adminOnly(req, res, next) {
  if (req.admin || req.user?.role === 'admin') {
    return next()
  }

  // Check Admin Session from cookie, header, or query
  const sessionId = req.cookies?.lily_admin_session || req.headers?.['x-admin-session-id'] || req.query?.adminSession
  if (sessionId) {
    try {
      const session = await AdminSession.findOne({ sessionId })
      if (session && Date.now() <= new Date(session.expiresAt).getTime()) {
        req.admin = { email: session.adminEmail, sessionId: session.sessionId }
        return next()
      }
    } catch {}
  }

  // Check Bearer Token if present for admin role
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id)
      if (user && user.role === 'admin') {
        req.user = user
        return next()
      }
    } catch {}
  }

  return res.status(403).json({ message: 'Admin access required' })
}

/**
 * Flexible Authenticator: Identifies either a customer (via Bearer JWT / query token) or an admin (via Session/Cookie/Header)
 */
export async function authenticateUserOrAdmin(req, res, next) {
  // 1. Check Customer Bearer Token from Header or Query parameter
  const header = req.headers.authorization
  const token = header && header.startsWith('Bearer ') ? header.split(' ')[1] : req.query.token
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.id)
    } catch {}
  }

  // 2. Check Admin Session (Cookie, Header, or Query)
  const sessionId = req.cookies?.lily_admin_session || req.headers['x-admin-session-id'] || req.query.adminSession
  if (sessionId) {
    try {
      const session = await AdminSession.findOne({ sessionId })
      if (session && Date.now() <= new Date(session.expiresAt).getTime()) {
        req.admin = { email: session.adminEmail, sessionId: session.sessionId }
      }
    } catch {}
  }

  if (!req.user && !req.admin) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  next()
}
