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
import { logAdminAction } from '../utils/auditLogger.js'

// Import existing business controllers
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
import AuditLog from '../models/AuditLog.js'
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
// 3. AUDIT LOGS ENDPOINT
// ==========================================
router.get('/audit-logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500)
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit)
    res.status(200).json({ success: true, count: logs.length, logs })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' })
  }
})

// ==========================================
// 4. PRODUCTS MANAGEMENT
// ==========================================
router.get('/products', listProducts)
router.get('/products/:id', getProduct)

router.post('/products', uploadAnyImages, async (req, res, next) => {
  await logAdminAction('PRODUCT_CREATED', req.admin.email, { title: req.body?.title }, req)
  return createProduct(req, res, next)
})

router.put('/products/:id', uploadAnyImages, async (req, res, next) => {
  await logAdminAction('PRODUCT_UPDATED', req.admin.email, { productId: req.params.id, title: req.body?.title }, req)
  return updateProduct(req, res, next)
})

router.patch('/products/:id/archive', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    product.archived = !product.archived
    await product.save()
    await logAdminAction('PRODUCT_ARCHIVED_TOGGLED', req.admin.email, { productId: req.params.id, archived: product.archived }, req)
    res.status(200).json({ success: true, message: `Product ${product.archived ? 'archived' : 'unarchived'}`, product })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete('/products/:id', async (req, res, next) => {
  await logAdminAction('PRODUCT_DELETED_PERMANENT', req.admin.email, { productId: req.params.id }, req)
  return deleteProduct(req, res, next)
})

router.delete('/products', async (req, res, next) => {
  await logAdminAction('PRODUCTS_BULK_DELETED', req.admin.email, { scope: 'all' }, req)
  return deleteAllProducts(req, res, next)
})

// ==========================================
// 5. ORDERS MANAGEMENT & REFUNDS
// ==========================================
router.get('/orders', listAllOrders)
router.get('/orders/:id', getOrderById)

router.patch('/orders/:id/status', async (req, res, next) => {
  await logAdminAction('ORDER_STATUS_UPDATED', req.admin.email, { orderId: req.params.id, status: req.body?.status }, req)
  return updateOrderStatus(req, res, next)
})

router.post('/orders/:id/refund', async (req, res, next) => {
  await logAdminAction('REFUND_PROCESSED', req.admin.email, { orderId: req.params.id, amount: req.body?.amount }, req)
  return processRefund(req, res, next)
})

router.delete('/orders/:id', async (req, res, next) => {
  await logAdminAction('ORDER_DELETED', req.admin.email, { orderId: req.params.id }, req)
  return deleteOrder(req, res, next)
})

router.delete('/orders', async (req, res, next) => {
  await logAdminAction('ORDERS_BULK_DELETED', req.admin.email, { scope: 'all' }, req)
  return deleteAllOrders(req, res, next)
})

// ==========================================
// 6. CUSTOMERS MANAGEMENT
// ==========================================
router.get('/customers', listUsers)

// ==========================================
// 7. CUSTOM DESIGNS / REQUESTS MANAGEMENT
// ==========================================
router.get('/custom-requests', listCustomRequests)

router.patch('/custom-requests/:id/quote', async (req, res, next) => {
  await logAdminAction('CUSTOM_REQUEST_QUOTED', req.admin.email, { requestId: req.params.id, price: req.body?.quotedPrice }, req)
  return quotePrice(req, res, next)
})

router.patch('/custom-requests/:id/status', async (req, res, next) => {
  await logAdminAction('CUSTOM_REQUEST_STATUS_UPDATED', req.admin.email, { requestId: req.params.id, status: req.body?.status }, req)
  return updateCustomRequestStatus(req, res, next)
})

router.delete('/custom-requests/:id', async (req, res, next) => {
  await logAdminAction('CUSTOM_REQUEST_DELETED', req.admin.email, { requestId: req.params.id }, req)
  return deleteCustomRequest(req, res, next)
})

// ==========================================
// 8. REVIEWS MANAGEMENT
// ==========================================
router.get('/reviews', listReviews)

router.patch('/reviews/:id/display', async (req, res, next) => {
  await logAdminAction('REVIEW_DISPLAY_TOGGLED', req.admin.email, { reviewId: req.params.id }, req)
  return toggleReviewDisplay(req, res, next)
})

router.put('/reviews/:id', updateReview)
router.delete('/reviews/:id', deleteReview)

// ==========================================
// 9. COLLECTIONS MANAGEMENT
// ==========================================
router.get('/collections', listCollections)
router.post('/collections', uploadAnyImages, createCollection)
router.put('/collections/:id', uploadAnyImages, updateCollection)
router.delete('/collections/:id', deleteCollection)
router.delete('/collections', deleteAllCollections)

// ==========================================
// 10. COUPONS MANAGEMENT
// ==========================================
router.get('/coupons', getCoupons)
router.post('/coupons', async (req, res, next) => {
  await logAdminAction('COUPON_CREATED', req.admin.email, { code: req.body?.code }, req)
  return createCoupon(req, res, next)
})
router.put('/coupons/:id', updateCoupon)
router.delete('/coupons/:id', deleteCoupon)

// ==========================================
// 11. SETTINGS MANAGEMENT
// ==========================================
router.get('/settings', getSettings)
router.put('/settings', async (req, res, next) => {
  await logAdminAction('SETTINGS_UPDATED', req.admin.email, { type: 'general' }, req)
  return updateSettings(req, res, next)
})

export default router
