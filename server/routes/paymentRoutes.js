import { Router } from 'express'
import { createRazorpayOrder, verifyPayment } from '../controllers/orderController.js'
import { getPaymentLedger, handleRazorpayWebhook } from '../controllers/paymentController.js'

const router = Router()

router.post('/create-order', createRazorpayOrder)
router.post('/verify', verifyPayment)
router.post('/webhook', handleRazorpayWebhook)
router.get('/admin/ledger', getPaymentLedger)

export default router
