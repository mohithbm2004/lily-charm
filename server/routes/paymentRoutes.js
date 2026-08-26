import { Router } from 'express'
import { createRazorpayOrder, verifyPayment } from '../controllers/orderController.js'
import { getPaymentLedger, getPaymentTracking, reconcilePaymentManual, clearAllPaymentLogs } from '../controllers/paymentController.js'
import { protect } from '../middleware/auth.js'
import { protectAdmin } from '../middleware/adminAuth.js'

const router = Router()

router.post('/create-order', protect, createRazorpayOrder)
router.post('/verify', protect, verifyPayment)
router.get('/admin/ledger', protectAdmin, getPaymentLedger)
router.get('/admin/tracking', protectAdmin, getPaymentTracking)
router.post('/admin/reconcile', protectAdmin, reconcilePaymentManual)
router.delete('/admin/logs/clear', protectAdmin, clearAllPaymentLogs)

export default router
