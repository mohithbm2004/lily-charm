import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  getSetupStatus,
  adminSetup,
  adminLogin,
  adminForgotPassword,
  adminVerifyOtp,
  adminResetPassword,
  adminChangePassword,
  adminLogoutAll,
  getAdminMe,
  adminLogout,
} from '../controllers/adminAuthController.js'
import { protectAdmin } from '../middleware/adminAuth.js'

// Business controllers
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteAllProducts,
} from '../controllers/productController.js'

import {
  listAllOrders,
  getOrderById,
  updateOrderStatus,
  processRefund,
  deleteOrder,
  deleteAllOrders,
} from '../controllers/orderController.js'

import { listUsers } from '../controllers/authController.js'

import {
  listCustomRequests,
  quotePrice,
  updateCustomRequestStatus,
  deleteCustomRequest,
} from '../controllers/customRequestController.js'

import {
  listReviews,
  toggleReviewDisplay,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js'

import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  deleteAllCollections,
} from '../controllers/collectionController.js'

import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js'

import { getSettings, updateSettings } from '../controllers/settingController.js'
import { uploadAnyImages } from '../middleware/upload.js'
import Product from '../models/Product.js'

const router = Router()

// Dedicated Rate Limiters for Admin Authentication Security
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ==========================================
// 1. PUBLIC ADMIN AUTHENTICATION ENDPOINTS
// ==========================================
router.get('/auth/setup-status', getSetupStatus)
router.post('/auth/setup', adminAuthLimiter, adminSetup)
router.post('/auth/login', adminAuthLimiter, adminLogin)
router.post('/auth/forgot-password', otpLimiter, adminForgotPassword)
router.post('/auth/verify-otp', adminAuthLimiter, adminVerifyOtp)
router.post('/auth/reset-password', adminAuthLimiter, adminResetPassword)

// ==========================================
// 2. PROTECTED ADMIN AUTHENTICATION ENDPOINTS
// ==========================================
router.get('/auth/me', protectAdmin, getAdminMe)
router.post('/auth/change-password', protectAdmin, adminChangePassword)
router.post('/auth/logout-all', protectAdmin, adminLogoutAll)
router.post('/auth/logout', protectAdmin, adminLogout)

// ALL ROUTES BELOW REQUIRE VALID ADMIN SESSION COOKIE
router.use(protectAdmin)

// ==========================================
// 3. PRODUCTS MANAGEMENT
// ==========================================
router.get('/products', listProducts)
router.get('/products/:id', getProduct)
router.post('/products', uploadAnyImages, createProduct)
router.put('/products/:id', uploadAnyImages, updateProduct)

router.patch('/products/:id/archive', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    product.archived = !product.archived
    await product.save()
    res.status(200).json({ success: true, message: `Product ${product.archived ? 'archived' : 'unarchived'}`, product })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete('/products/:id', deleteProduct)
router.delete('/products', deleteAllProducts)

// ==========================================
// 4. ORDERS MANAGEMENT & REFUNDS
// ==========================================
router.get('/orders', listAllOrders)
router.get('/orders/:id', getOrderById)
router.patch('/orders/:id/status', updateOrderStatus)
router.post('/orders/:id/refund', processRefund)
router.delete('/orders/:id', deleteOrder)
router.delete('/orders', deleteAllOrders)

// ==========================================
// 5. CUSTOMERS MANAGEMENT
// ==========================================
router.get('/customers', listUsers)

// ==========================================
// 6. CUSTOM DESIGNS / REQUESTS MANAGEMENT
// ==========================================
router.get('/custom-requests', listCustomRequests)
router.patch('/custom-requests/:id/quote', quotePrice)
router.patch('/custom-requests/:id/status', updateCustomRequestStatus)
router.delete('/custom-requests/:id', deleteCustomRequest)

// ==========================================
// 7. REVIEWS MANAGEMENT
// ==========================================
router.get('/reviews', listReviews)
router.patch('/reviews/:id/display', toggleReviewDisplay)
router.put('/reviews/:id', updateReview)
router.delete('/reviews/:id', deleteReview)

// ==========================================
// 8. COLLECTIONS MANAGEMENT
// ==========================================
router.get('/collections', listCollections)
router.post('/collections', uploadAnyImages, createCollection)
router.put('/collections/:id', uploadAnyImages, updateCollection)
router.delete('/collections/:id', deleteCollection)
router.delete('/collections', deleteAllCollections)

// ==========================================
// 9. COUPONS MANAGEMENT
// ==========================================
router.get('/coupons', getCoupons)
router.post('/coupons', createCoupon)
router.put('/coupons/:id', updateCoupon)
router.delete('/coupons/:id', deleteCoupon)

// ==========================================
// 10. SETTINGS MANAGEMENT
// ==========================================
router.get('/settings', getSettings)
router.put('/settings', updateSettings)

export default router
