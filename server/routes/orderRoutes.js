import { Router } from 'express'
import {
  createOrder,
  createRazorpayOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  downloadInvoice,
  cancelOrder,
  requestRefund,
  processRefund,
  listAllOrders,
  updateOrderStatus,
  deleteOrder,
  deleteAllOrders,
} from '../controllers/orderController.js'

import { protect, authenticateUserOrAdmin } from '../middleware/auth.js'
import { protectAdmin } from '../middleware/adminAuth.js'

const router = Router()

router.post('/', protect, createOrder)
router.post('/create-order', protect, createRazorpayOrder)
router.post('/create-razorpay-order', protect, createRazorpayOrder)
router.post('/verify', protect, verifyPayment)
router.post('/verify-payment', protect, verifyPayment)
router.get('/mine', protect, getMyOrders)
router.get('/my-orders', protect, getMyOrders)
router.get('/admin/all', protectAdmin, listAllOrders)
router.get('/', protectAdmin, listAllOrders)
router.get('/:id', authenticateUserOrAdmin, getOrderById)
router.get('/:id/invoice', authenticateUserOrAdmin, downloadInvoice)
router.patch('/:id/cancel', authenticateUserOrAdmin, cancelOrder)
router.post('/:id/refund-request', authenticateUserOrAdmin, requestRefund)
router.post('/:id/process-refund', protectAdmin, processRefund)
router.patch('/:id/status', protectAdmin, updateOrderStatus)
router.delete('/', protectAdmin, deleteAllOrders)
router.delete('/:id', protectAdmin, deleteOrder)

export default router
