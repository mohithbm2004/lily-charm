import crypto from 'crypto'
import User from '../models/User.js'
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

    if (user && user.isVerified) {
      return res.status(400).json({ message: 'Email address is already registered and verified. Please sign in.' })
    }

    const rawOtp = generate6DigitOtp()
    const hashedOtp = hashToken(rawOtp)
    const otpExpire = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    if (user && !user.isVerified) {
      user.name = name
      user.password = password
      user.phone = phone || user.phone
      user.otp = hashedOtp
      user.otpExpire = otpExpire
      user.otpAttempts = 0
      user.lastOtpSentAt = new Date()
      await user.save()
    } else {
      user = await User.create({
        name,
        email: cleanEmail,
        password,
        phone: phone || '',
        provider: 'email',
        isVerified: false,
        otp: hashedOtp,
        otpExpire,
        otpAttempts: 0,
        lastOtpSentAt: new Date(),
      })
    }

    // Send OTP email asynchronously in background so HTTP response is instant
    sendOtpEmail(cleanEmail, user.name, rawOtp).catch(console.error)

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
    const user = await User.findOne({ email: cleanEmail })

    if (!user) {
      return res.status(404).json({ message: 'User account not found.' })
    }

    if (user.isVerified) {
      const token = generateToken(user._id)
      return res.json({ message: 'Account already verified.', user, token })
    }

    if (isOtpExpired(user.otpExpire)) {
      return res.status(400).json({ message: 'OTP expired. Please request a new verification code.' })
    }

    if (user.otpAttempts >= 5) {
      return res.status(400).json({ message: 'Maximum OTP attempts exceeded. Please click Resend OTP.' })
    }

    const inputHashedOtp = hashToken(otp)
    if (user.otp !== inputHashedOtp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1
      await user.save()
      const remaining = 5 - user.otpAttempts
      return res.status(400).json({ message: `Invalid OTP code. ${remaining} attempts remaining.` })
    }

    // OTP Verified successfully!
    user.isVerified = true
    user.otp = ''
    user.otpExpire = null
    user.otpAttempts = 0
    user.lastLogin = new Date()
    await user.save()

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

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' })
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified. Please sign in.' })
    }

    if (!canResendOtp(user.lastOtpSentAt, 60)) {
      return res.status(429).json({ message: 'Please wait 60 seconds before requesting another OTP.' })
    }

    const rawOtp = generate6DigitOtp()
    const hashedOtp = hashToken(rawOtp)

    user.otp = hashedOtp
    user.otpExpire = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    user.otpAttempts = 0
    user.lastOtpSentAt = new Date()
    await user.save()

    // Send OTP email asynchronously in background
    sendOtpEmail(cleanEmail, user.name, rawOtp).catch(console.error)

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
    if (!email) return res.status(400).json({ message: 'Email address is required!' })

    const cleanEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: cleanEmail })

    if (!user) {
      return res.status(404).json({ message: 'No registered user account found with this email address.' })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedResetToken = hashToken(resetToken)

    user.resetPasswordToken = hashedResetToken
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    await user.save()

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`

    // Send password reset email asynchronously in background
    sendPasswordResetEmail(cleanEmail, user.name, resetUrl).catch(console.error)

    res.json({ message: 'Password reset link has been sent to your email address.' })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/reset-password — Update Password using Secure Reset Token
export async function resetPassword(req, res, next) {
  try {
    const { token, email, newPassword } = req.body

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required!' })
    }

    let user = null

    if (token) {
      const hashedToken = hashToken(token)
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      })
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() })
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' })
    }

    user.password = newPassword
    user.resetPasswordToken = ''
    user.resetPasswordExpire = null
    await user.save()

    res.json({ message: 'Password reset successfully! You can now sign in with your new password.' })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/profile — Create or update user profile
export async function createOrUpdateProfile(req, res, next) {
  try {
    const { name, email, phone, address, city, pincode, image } = req.body

    if (!email || !name) {
      return res.status(400).json({ message: 'Name and email address are required!' })
    }

    const cleanEmail = email.toLowerCase().trim()
    let profileImageUrl = ''

    if (image && !image.startsWith('http')) {
      const cloudRes = await uploadToCloudinary(image, 'lily-charm/profiles')
      if (cloudRes && cloudRes.secure_url) profileImageUrl = cloudRes.secure_url
    } else if (image) {
      profileImageUrl = image
    }

    let user = await User.findOne({ email: cleanEmail })

    if (user) {
      user.name = name
      user.phone = phone || user.phone
      user.address = address || user.address
      user.city = city || user.city
      user.pincode = pincode || user.pincode
      if (profileImageUrl) {
        user.profileImage = profileImageUrl
        user.avatar = profileImageUrl
      }
      await user.save()
    } else {
      user = await User.create({
        name,
        email: cleanEmail,
        phone,
        address,
        city,
        pincode,
        profileImage: profileImageUrl,
        avatar: profileImageUrl,
        isVerified: true,
      })
    }

    res.status(200).json({
      message: 'User profile saved successfully in MongoDB Atlas!',
      user,
      token: generateToken(user._id),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/profile — Fetch user profile by email query
export async function getProfileByEmail(req, res, next) {
  try {
    const email = req.query.email || req.params.email
    if (!email) return res.status(400).json({ message: 'Email query param required' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) return res.status(404).json({ message: 'User profile not found' })

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

// GET /api/auth/users — List all registered user profiles for Admin
export async function listUsers(req, res, next) {
  try {
    const users = await User.find({}).sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    next(err)
  }
}
