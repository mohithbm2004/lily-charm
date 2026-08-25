import crypto from 'crypto'
import User from '../models/User.js'
import TempUser from '../models/TempUser.js'
import { generateToken } from '../utils/generateToken.js'
import { uploadToCloudinary } from '../utils/cloudinaryHelper.js'
import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js'
import { generate6DigitOtp, hashToken, isOtpExpired, canResendOtp } from '../services/otpService.js'
import { verifyGoogleToken } from '../services/googleService.js'

// POST /api/auth/register — Email Signup with 6-digit OTP
export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required!' })
    }

    const cleanEmail = email.toLowerCase().trim()
    let user = await User.findOne({ email: cleanEmail })

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ message: 'Email address is already registered and verified. Please sign in.' })
      } else {
        // Clean up legacy unverified user to avoid duplicate entries in User collection
        await User.deleteOne({ _id: user._id })
      }
    }

    const rawOtp = generate6DigitOtp()
    const hashedOtp = hashToken(rawOtp)
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    let tempUser = await TempUser.findOne({ email: cleanEmail })

    if (tempUser) {
      tempUser.name = name
      tempUser.password = password
      tempUser.phone = phone || tempUser.phone
      tempUser.otp = hashedOtp
      tempUser.otpExpire = otpExpire
      tempUser.otpAttempts = 0
      tempUser.lastOtpSentAt = new Date()
      await tempUser.save()
    } else {
      tempUser = await TempUser.create({
        name,
        email: cleanEmail,
        password,
        phone: phone || '',
        otp: hashedOtp,
        otpExpire,
        otpAttempts: 0,
        lastOtpSentAt: new Date(),
      })
    }

    if (req.otpSecurity?.recordRequest) {
      req.otpSecurity.recordRequest()
    }

    try {
      await sendOtpEmail(cleanEmail, tempUser.name, rawOtp)
    } catch (sendErr) {
      console.warn(`[REGISTER OTP NOTICE] [${cleanEmail}]:`, sendErr.message)
      if (sendErr.isSuppressed || sendErr.isHardBounce) {
        return res.status(400).json({
          message: sendErr.message || 'This email address was previously flagged as undeliverable. Please check or enter a different email address.',
          isSuppressed: true,
        })
      }
      if (sendErr.circuitBreakerOpen) {
        return res.status(503).json({
          message: 'Email verification is temporarily paused due to security protection. Please try again later or contact support.',
          circuitBreakerOpen: true,
        })
      }
    }

    res.status(201).json({
      message: 'Verification OTP sent to your email address.',
      email: cleanEmail,
      requiresOtp: true,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/verify-otp — Verify 6-digit OTP Code
export async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required!' })
    }

    const cleanEmail = email.toLowerCase().trim()
    let user = await User.findOne({ email: cleanEmail })

    if (user && user.isVerified) {
      const token = generateToken(user._id)
      return res.json({ message: 'Account already verified.', user, token })
    }

    const tempUser = await TempUser.findOne({ email: cleanEmail })

    if (!tempUser) {
      return res.status(404).json({ message: 'No registration session found. Please register again.' })
    }

    if (isOtpExpired(tempUser.otpExpire)) {
      return res.status(400).json({ message: 'OTP expired. Please request a new verification code.' })
    }

    if (tempUser.otpAttempts >= 5) {
      return res.status(400).json({ message: 'Maximum OTP attempts exceeded. Please click Resend OTP.' })
    }

    const inputHashedOtp = hashToken(otp)
    if (tempUser.otp !== inputHashedOtp) {
      tempUser.otpAttempts = (tempUser.otpAttempts || 0) + 1
      await tempUser.save()
      const remaining = 5 - tempUser.otpAttempts
      return res.status(400).json({ message: `Invalid OTP code. ${remaining} attempts remaining.` })
    }

    // OTP Verified successfully! Now create the real verified user in User collection
    user = await User.create({
      name: tempUser.name,
      email: cleanEmail,
      password: tempUser.password, // This is already a bcrypt hash from tempUser
      phone: tempUser.phone || '',
      provider: 'email',
      isVerified: true,
      lastLogin: new Date(),
    })

    // Delete the TempUser document
    await TempUser.deleteOne({ _id: tempUser._id })

    // Send Welcome Email asynchronously
    sendWelcomeEmail(cleanEmail, user.name).catch(console.error)

    const token = generateToken(user._id)
    res.json({
      message: 'Account verified successfully! Welcome to Lily Charm.',
      user,
      token,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/resend-otp — Resend 6-digit OTP Code with Rate Limiting
export async function resendOtp(req, res, next) {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email address is required!' })

    const cleanEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: cleanEmail })

    if (user && user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified. Please sign in.' })
    }

    const tempUser = await TempUser.findOne({ email: cleanEmail })

    if (!tempUser) {
      return res.status(404).json({ message: 'No registration session found. Please register again.' })
    }

    if (!canResendOtp(tempUser.lastOtpSentAt, 60)) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting another OTP.' })
    }

    const rawOtp = generate6DigitOtp()
    const hashedOtp = hashToken(rawOtp)

    tempUser.otp = hashedOtp
    tempUser.otpExpire = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    tempUser.otpAttempts = 0
    tempUser.lastOtpSentAt = new Date()
    await tempUser.save()

    if (req.otpSecurity?.recordRequest) {
      req.otpSecurity.recordRequest()
    }

    try {
      await sendOtpEmail(cleanEmail, tempUser.name, rawOtp)
    } catch (sendErr) {
      console.warn(`[RESEND OTP NOTICE] [${cleanEmail}]:`, sendErr.message)
      if (sendErr.isSuppressed || sendErr.isHardBounce) {
        return res.status(400).json({
          message: sendErr.message || 'This email address was previously flagged as undeliverable. Please check or enter a different email address.',
          isSuppressed: true,
        })
      }
      if (sendErr.circuitBreakerOpen) {
        return res.status(503).json({
          message: 'Email verification is temporarily paused due to security protection. Please try again later or contact support.',
          circuitBreakerOpen: true,
        })
      }
    }

    res.json({
      message: 'A new 6-digit OTP code has been sent to your email.',
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login — Email + Password Login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email address and password are required!' })
    }

    const cleanEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: cleanEmail }).select('+password')

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isVerified) {
      const rawOtp = generate6DigitOtp()
      user.otp = hashToken(rawOtp)
      user.otpExpire = new Date(Date.now() + 5 * 60 * 1000)
      user.otpAttempts = 0
      user.lastOtpSentAt = new Date()
      await user.save()

      // Send OTP email asynchronously in background
      sendOtpEmail(cleanEmail, user.name, rawOtp).catch(console.error)

      return res.status(403).json({
        message: 'Account not verified. Verification OTP sent to your email.',
        email: cleanEmail,
        requiresOtp: true,
      })
    }

    user.lastLogin = new Date()
    await user.save()

    res.json({
      message: 'Signed in successfully!',
      user,
      token: generateToken(user._id),
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/google — Google OAuth Login / Signup & Account Linking
export async function googleAuth(req, res, next) {
  try {
    const tokenPayload = req.body.googleToken || req.body.credential || req.body.token || req.body.email
    if (!tokenPayload) {
      return res.status(400).json({ message: 'Google authentication credential is required!' })
    }

    const googleUser = await verifyGoogleToken(tokenPayload)
    const { googleId, email, name, avatar } = googleUser

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    })

    if (user) {
      // Connect / Link Google Login with existing email account
      user.googleId = user.googleId || googleId
      user.avatar = user.avatar || avatar
      user.profileImage = user.profileImage || avatar
      user.isVerified = true
      user.provider = user.provider || 'google'
      user.lastLogin = new Date()
      await user.save()
    } else {
      // Auto-create new user account
      user = await User.create({
        name,
        email,
        googleId,
        provider: 'google',
        avatar,
        profileImage: avatar,
        isVerified: true,
        lastLogin: new Date(),
      })
    }

    const token = generateToken(user._id)
    res.json({
      message: 'Google Authentication successful!',
      user,
      token,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/forgot-password — Request Password Reset Email Link
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }

    const cleanEmail = email.toLowerCase().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' })
    }

    const user = await User.findOne({ email: cleanEmail })

    // If email DOES NOT EXIST: do NOT create token, do NOT send email, return 404
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email address is not registered. Please check your email or create an account.',
      })
    }

    // Generate cryptographically secure 32-byte random token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedResetToken = hashToken(resetToken)

    // Store only the SHA-256 hash, 5-minute expiration, and reset single-use flags
    // Overwriting previous token immediately invalidates any prior reset requests
    user.resetPasswordToken = hashedResetToken
    user.resetPasswordExpire = new Date(Date.now() + 5 * 60 * 1000) // Exactly 5 minutes
    user.resetPasswordUsed = false
    user.resetPasswordConsumedAt = null
    user.resetPasswordCreatedAt = new Date()
    await user.save()

    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null)
    let clientUrl = (process.env.CLIENT_URL || '').trim().replace(/[\r\n]+/g, '')

    if (!clientUrl || clientUrl.includes('localhost')) {
      if (origin && !origin.includes('localhost')) {
        clientUrl = origin.trim().replace(/[\r\n]+/g, '')
      } else {
        clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/[\r\n]+/g, '')
      }
    }

    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`

    // Send password reset email asynchronously via ZeptoMail no-reply agent
    sendPasswordResetEmail(cleanEmail, user.name, resetUrl).catch(console.error)

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email.',
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/verify-reset-token — Validate Reset Token Status
export async function verifyResetToken(req, res, next) {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({
        valid: false,
        reason: 'invalid',
        message: 'This password reset link is invalid. Please request a new one.',
      })
    }

    const hashedToken = hashToken(token)
    const user = await User.findOne({
      $or: [
        { resetPasswordToken: hashedToken },
        { lastUsedResetTokenHash: hashedToken },
      ],
    })

    if (!user) {
      return res.status(400).json({
        valid: false,
        reason: 'invalid',
        message: 'This password reset link is invalid. Please request a new one.',
      })
    }

    if (user.lastUsedResetTokenHash === hashedToken || (user.resetPasswordUsed && user.resetPasswordToken === hashedToken)) {
      return res.status(400).json({
        valid: false,
        reason: 'used',
        message: 'This password reset link has already been used.',
      })
    }

    if (!user.resetPasswordExpire || new Date() > new Date(user.resetPasswordExpire)) {
      return res.status(400).json({
        valid: false,
        reason: 'expired',
        message: 'This password reset link has expired. Please request a new one.',
      })
    }

    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(user.resetPasswordExpire).getTime() - Date.now()) / 1000)
    )

    return res.json({
      valid: true,
      expiresAt: user.resetPasswordExpire,
      remainingSeconds,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/reset-password — Update Password using Secure Reset Token
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body

    if (!token) {
      return res.status(400).json({
        message: 'This password reset link is invalid. Please request a new one.',
      })
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long.',
      })
    }

    const hashedToken = hashToken(token)
    const user = await User.findOne({
      $or: [
        { resetPasswordToken: hashedToken },
        { lastUsedResetTokenHash: hashedToken },
      ],
    })

    if (!user) {
      return res.status(400).json({
        message: 'This password reset link is invalid. Please request a new one.',
      })
    }

    if (user.lastUsedResetTokenHash === hashedToken || (user.resetPasswordUsed && user.resetPasswordToken === hashedToken)) {
      return res.status(400).json({
        message: 'This password reset link has already been used.',
      })
    }

    if (!user.resetPasswordExpire || new Date() > new Date(user.resetPasswordExpire)) {
      return res.status(400).json({
        message: 'This password reset link has expired. Please request a new one.',
      })
    }

    // Update password (bcrypt pre-save hook will hash it securely)
    user.password = newPassword

    // Invalidate token immediately so it can NEVER be reused
    user.lastUsedResetTokenHash = hashedToken
    user.resetPasswordToken = null
    user.resetPasswordExpire = null
    user.resetPasswordUsed = true
    user.resetPasswordConsumedAt = new Date()
    await user.save()

    res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in with your new password.',
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/profile — Update currently authenticated user profile
export async function createOrUpdateProfile(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required to update profile.' })
    }

    const { name, phone, address, city, pincode, image } = req.body

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' })
    }

    if (name && name.trim()) {
      user.name = name.trim()
    }

    if (phone !== undefined) user.phone = phone
    if (address !== undefined) user.address = address
    if (city !== undefined) user.city = city
    if (pincode !== undefined) user.pincode = pincode

    let profileImageUrl = ''
    if (image && !image.startsWith('http')) {
      const cloudRes = await uploadToCloudinary(image, 'lily-charm/profiles')
      if (cloudRes && cloudRes.secure_url) profileImageUrl = cloudRes.secure_url
    } else if (image) {
      profileImageUrl = image
    }

    if (profileImageUrl) {
      user.profileImage = profileImageUrl
      user.avatar = profileImageUrl
    }

    await user.save()

    res.status(200).json({
      message: 'User profile updated successfully!',
      user,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/profile — Fetch currently authenticated user profile
export async function getProfileByEmail(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required to view profile.' })
    }

    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User profile not found.' })

    res.json(user)
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/me — Get currently authenticated user profile
export async function getMe(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' })
    res.json(req.user)
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/users — List registered user profiles for Admin (sanitized)
export async function listUsers(req, res, next) {
  try {
    const users = await User.find({})
      .select('-password -resetPasswordToken -resetOtpHash -lastUsedResetTokenHash -otp')
      .sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/test-email — Diagnostic endpoint (Admin only)
export async function testEmail(req, res) {
  try {
    const targetEmail = req.query.email || 'bmmohith48@gmail.com'
    const result = await sendOtpEmail(targetEmail, 'Test User', '998877')
    res.json({
      success: true,
      result,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      errorName: err.name,
      errorMessage: err.message,
    })
  }
}
