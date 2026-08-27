import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import AdminUser from '../models/AdminUser.js'
import AdminSession from '../models/AdminSession.js'
import { getAdminEmail, getOrCreateAdminUser, validatePasswordStrength } from '../utils/adminUserHelper.js'
import { generate6DigitOtp, hashToken, sendOtpEmail } from '../services/otp.service.js'
import { ENV } from '../config/env.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: ENV.IS_PRODUCTION ? 'none' : 'lax',
  secure: ENV.IS_PRODUCTION,
  maxAge: 12 * 60 * 60 * 1000, // 12 hours max
}

/**
 * Check if Admin account is initialized
 */
export async function getSetupStatus(req, res) {
  try {
    const admin = await getOrCreateAdminUser()
    return res.status(200).json({
      success: true,
      isInitialized: admin ? admin.isInitialized : false,
      email: admin ? admin.email : getAdminEmail(),
    })
  } catch (err) {
    console.error('getSetupStatus Error:', err)
    return res.status(500).json({ success: false, message: 'Server error checking setup status.' })
  }
}

/**
 * Initial Admin Password Setup (Disabled once initialized)
 */
export async function adminSetup(req, res) {
  try {
    const { email, password, confirmPassword, setupKey } = req.body
    const expectedEmail = getAdminEmail()

    const admin = await getOrCreateAdminUser()

    // Rule 15: Never allow setup to reset password after already initialized unless authorized
    if (admin.isInitialized) {
      return res.status(400).json({
        success: false,
        message: 'Admin setup has already been completed. Use Forgot Password to reset credentials.',
      })
    }

    // Optional setupKey check if configured in env
    if (process.env.SETUP_SECRET && setupKey !== process.env.SETUP_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized setup request.' })
    }

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Email, password, and confirm password are required.' })
    }

    if (String(email).toLowerCase().trim() !== expectedEmail) {
      return res.status(400).json({ success: false, message: `Setup is restricted to designated admin email (${expectedEmail}).` })
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' })
    }

    const validation = validatePasswordStrength(password)
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    admin.passwordHash = passwordHash
    admin.isInitialized = true
    admin.lastPasswordChange = new Date()
    await admin.save()

    return res.status(200).json({
      success: true,
      message: 'Admin account password setup completed successfully. Please sign in.',
    })
  } catch (err) {
    console.error('adminSetup Error:', err)
    return res.status(500).json({ success: false, message: 'Server error during admin setup.' })
  }
}

/**
 * Single Admin Login with Email & Password
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body
    const expectedEmail = getAdminEmail()
    const admin = await getOrCreateAdminUser()

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' })
    }

    const trimmedEmail = String(email).toLowerCase().trim()

    if (trimmedEmail !== expectedEmail) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' })
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' })
    }

    // Create Full Admin Session
    const sessionId = crypto.randomBytes(32).toString('hex')
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim()
    const userAgent = req.headers['user-agent'] || ''

    await AdminSession.create({
      sessionId,
      adminEmail: expectedEmail,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      ipAddress,
      userAgent,
      isPreMfa: false,
    })

    res.cookie('lily_admin_session', sessionId, COOKIE_OPTIONS)

    return res.status(200).json({
      success: true,
      message: 'Admin authenticated successfully.',
      sessionId,
      admin: { email: expectedEmail, lastPasswordChange: admin.lastPasswordChange },
    })
  } catch (err) {
    console.error('adminLogin Error:', err)
    return res.status(500).json({ success: false, message: 'Server error during login.' })
  }
}

/**
 * Forgot Password - Send ZeptoMail OTP
 */
export async function adminForgotPassword(req, res) {
  try {
    const { email } = req.body
    const expectedEmail = getAdminEmail()
    const genericResponse = {
      success: true,
      message: 'If the account is eligible, a 6-digit verification code has been sent to your email.',
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' })
    }

    const inputEmail = String(email).toLowerCase().trim()
    const admin = await getOrCreateAdminUser()

    // Generic response if email mismatch (prevents email enumeration)
    if (inputEmail !== expectedEmail) {
      return res.status(200).json(genericResponse)
    }

    // Cooldown check (60 seconds)
    if (admin.lastOtpSentAt) {
      const secondsSince = (Date.now() - new Date(admin.lastOtpSentAt).getTime()) / 1000
      if (secondsSince < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(60 - secondsSince)} seconds before requesting another code.`,
        })
      }
    }

    const otp = generate6DigitOtp()
    const otpHash = hashToken(otp)

    admin.resetOtpHash = otpHash
    admin.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    admin.resetOtpAttempts = 0
    admin.lastOtpSentAt = new Date()
    await admin.save()

    // Send OTP via ZeptoMail infrastructure
    await sendOtpEmail(expectedEmail, 'Studio Admin', otp, true)

    return res.status(200).json(genericResponse)
  } catch (err) {
    console.error('adminForgotPassword Error:', err)
    return res.status(500).json({ success: false, message: 'Server error requesting password reset.' })
  }
}

/**
 * Verify Forgot Password 6-Digit OTP
 */
export async function adminVerifyOtp(req, res) {
  try {
    const { email, otp } = req.body
    const expectedEmail = getAdminEmail()

    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ success: false, message: '6-digit OTP code is required.' })
    }

    const admin = await getOrCreateAdminUser()

    if (!admin.resetOtpHash || !admin.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'No active password reset request. Please request a new OTP.' })
    }

    // Expiration check
    if (new Date() > new Date(admin.resetOtpExpires)) {
      admin.resetOtpHash = null
      admin.resetOtpExpires = null
      await admin.save()
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' })
    }

    // Max attempts check (5 attempts)
    if (admin.resetOtpAttempts >= 5) {
      admin.resetOtpHash = null
      admin.resetOtpExpires = null
      await admin.save()
      return res.status(400).json({ success: false, message: 'Maximum OTP verification attempts exceeded. Please request a new code.' })
    }

    const inputHash = hashToken(String(otp).trim())
    if (inputHash !== admin.resetOtpHash) {
      admin.resetOtpAttempts += 1
      await admin.save()
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' })
    }

    // OTP Verified! Clear OTP fields and issue short-lived Reset Token (15 mins)
    admin.resetOtpHash = null
    admin.resetOtpExpires = null
    admin.resetOtpAttempts = 0

    const resetToken = crypto.randomBytes(32).toString('hex')
    admin.resetTokenHash = hashToken(resetToken)
    admin.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    await admin.save()

    return res.status(200).json({
      success: true,
      message: 'OTP code verified successfully.',
      resetToken,
    })
  } catch (err) {
    console.error('adminVerifyOtp Error:', err)
    return res.status(500).json({ success: false, message: 'Server error verifying OTP code.' })
  }
}

/**
 * Reset Password with Verified Reset Token
 */
export async function adminResetPassword(req, res) {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body
    const expectedEmail = getAdminEmail()

    if (!resetToken) {
      return res.status(400).json({ success: false, message: 'Password reset token is required.' })
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password are required.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' })
    }

    const admin = await getOrCreateAdminUser()
    const tokenHash = hashToken(resetToken)

    if (
      !admin.resetTokenHash ||
      !admin.resetTokenExpires ||
      admin.resetTokenHash !== tokenHash ||
      new Date() > new Date(admin.resetTokenExpires)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset session. Please start over.' })
    }

    const validation = validatePasswordStrength(newPassword)
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    admin.passwordHash = passwordHash
    admin.lastPasswordChange = new Date()
    admin.resetTokenHash = null
    admin.resetTokenExpires = null
    await admin.save()

    // Invalidate ALL existing admin sessions upon password reset
    await AdminSession.deleteMany({ adminEmail: expectedEmail })
    res.clearCookie('lily_admin_session', COOKIE_OPTIONS)

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! All existing sessions have been terminated. Please sign in with your new password.',
    })
  } catch (err) {
    console.error('adminResetPassword Error:', err)
    return res.status(500).json({ success: false, message: 'Server error resetting password.' })
  }
}

/**
 * Change Password (From Admin Security Settings)
 */
export async function adminChangePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body
    const expectedEmail = req.admin.email || getAdminEmail()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Current password, new password, and confirm password are required.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match.' })
    }

    const admin = await getOrCreateAdminUser()

    const isMatch = await bcrypt.compare(currentPassword, admin.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' })
    }

    const validation = validatePasswordStrength(newPassword)
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    admin.passwordHash = passwordHash
    admin.lastPasswordChange = new Date()
    await admin.save()

    // Terminate all sessions except current one (or all sessions)
    await AdminSession.deleteMany({ adminEmail: expectedEmail })
    res.clearCookie('lily_admin_session', COOKIE_OPTIONS)

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in with your new password.',
    })
  } catch (err) {
    console.error('adminChangePassword Error:', err)
    return res.status(500).json({ success: false, message: 'Server error changing password.' })
  }
}

/**
 * Terminate All Admin Sessions
 */
export async function adminLogoutAll(req, res) {
  try {
    const expectedEmail = req.admin.email || getAdminEmail()
    await AdminSession.deleteMany({ adminEmail: expectedEmail })
    res.clearCookie('lily_admin_session', COOKIE_OPTIONS)

    return res.status(200).json({ success: true, message: 'All active admin sessions have been logged out.' })
  } catch (err) {
    console.error('adminLogoutAll Error:', err)
    return res.status(500).json({ success: false, message: 'Server error logging out sessions.' })
  }
}

/**
 * Get Active Admin Profile
 */
export async function getAdminMe(req, res) {
  try {
    const admin = await getOrCreateAdminUser()
    return res.status(200).json({
      success: true,
      authenticated: true,
      admin: {
        email: admin.email,
        lastPasswordChange: admin.lastPasswordChange,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error fetching admin data.' })
  }
}

/**
 * Admin Logout
 */
export async function adminLogout(req, res) {
  try {
    const sessionId = req.cookies?.lily_admin_session || req.admin?.sessionId
    if (sessionId) {
      await AdminSession.deleteOne({ sessionId })
    }

    res.clearCookie('lily_admin_session', COOKIE_OPTIONS)

    return res.status(200).json({ success: true, message: 'Logged out successfully.' })
  } catch (err) {
    console.error('adminLogout Error:', err)
    return res.status(500).json({ success: false, message: 'Server error during logout.' })
  }
}

/**
 * Parse User Agent into Human Readable Device Name
 */
export function parseDeviceName(userAgent = '') {
  if (!userAgent) return 'Unknown Device'
  let os = 'Unknown OS'
  let browser = 'Unknown Browser'

  if (/windows nt 10/i.test(userAgent)) os = 'Windows 10/11'
  else if (/windows nt 6.3/i.test(userAgent)) os = 'Windows 8.1'
  else if (/windows nt 6.1/i.test(userAgent)) os = 'Windows 7'
  else if (/mac os x/i.test(userAgent)) os = 'macOS'
  else if (/android/i.test(userAgent)) os = 'Android Phone'
  else if (/iphone/i.test(userAgent)) os = 'iPhone'
  else if (/ipad/i.test(userAgent)) os = 'iPad'
  else if (/linux/i.test(userAgent)) os = 'Linux'

  if (/edg/i.test(userAgent)) browser = 'Microsoft Edge'
  else if (/chrome|crios/i.test(userAgent)) browser = 'Google Chrome'
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Mozilla Firefox'
  else if (/safari/i.test(userAgent)) browser = 'Apple Safari'
  else if (/opera|opr/i.test(userAgent)) browser = 'Opera'

  return `${browser} on ${os}`
}

/**
 * Get All Admin Login Sessions with IP, Time, and Device Info
 */
export async function getAdminSessions(req, res) {
  try {
    const currentSessionId = req.cookies?.lily_admin_session || req.admin?.sessionId
    const sessions = await AdminSession.find({}).sort({ createdAt: -1 }).lean()

    const formattedSessions = sessions.map((s) => ({
      sessionId: s.sessionId,
      adminEmail: s.adminEmail,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      ipAddress: s.ipAddress || '127.0.0.1',
      userAgent: s.userAgent || 'Unknown Agent',
      deviceName: parseDeviceName(s.userAgent),
      isCurrentSession: s.sessionId === currentSessionId,
    }))

    return res.status(200).json({
      success: true,
      count: formattedSessions.length,
      sessions: formattedSessions,
    })
  } catch (err) {
    console.error('getAdminSessions Error:', err)
    return res.status(500).json({ success: false, message: 'Failed to fetch admin login sessions.' })
  }
}

/**
 * Revoke Specific Admin Login Session
 */
export async function revokeAdminSession(req, res) {
  try {
    const { sessionId } = req.params
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' })
    }

    await AdminSession.deleteOne({ sessionId })
    return res.status(200).json({ success: true, message: 'Session revoked successfully.' })
  } catch (err) {
    console.error('revokeAdminSession Error:', err)
    return res.status(500).json({ success: false, message: 'Failed to revoke session.' })
  }
}
