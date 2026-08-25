import { Router } from 'express'
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  googleAuth,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  testEmail,
  createOrUpdateProfile,
  getProfileByEmail,
  getMe,
  listUsers,
} from '../controllers/authController.js'
import { protect, adminOnly } from '../middleware/auth.js'
import { protectAdmin } from '../middleware/adminAuth.js'
import { protectOtpRequests } from '../middleware/otpAbuseProtection.js'

const router = Router()

router.get('/test-email', protectAdmin, testEmail)
router.post('/register', protectOtpRequests, register)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', protectOtpRequests, resendOtp)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/forgot-password', protectOtpRequests, forgotPassword)
router.get('/verify-reset-token', verifyResetToken)
router.post('/reset-password', resetPassword)

router.post('/profile', protect, createOrUpdateProfile)
router.get('/profile', protect, getProfileByEmail)
router.get('/me', protect, getMe)
router.get('/users', protectAdmin, listUsers)

export default router
