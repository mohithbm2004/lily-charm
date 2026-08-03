import { Router } from 'express'
import {
  register,
  verifyOtp,
  resendOtp,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  testEmail,
  createOrUpdateProfile,
  getProfileByEmail,
  getMe,
  listUsers,
} from '../controllers/authController.js'
import { protect, adminOnly } from '../middleware/auth.js'

const router = Router()

router.get('/test-email', testEmail)
router.post('/register', register)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/login', login)
router.post('/google', googleAuth)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

router.post('/profile', createOrUpdateProfile)
router.get('/profile', getProfileByEmail)
router.get('/me', protect, getMe)
router.get('/users', protect, adminOnly, listUsers)

export default router
