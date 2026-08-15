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

const router = Router()

router.post('/', protect, createOrder)
router.post('/create-order', protect, createRazorpayOrder)
router.post('/create-razorpay-order', protect, createRazorpayOrder)
router.post('/verify', verifyPayment)
router.post('/verify-payment', verifyPayment)
router.get('/mine', protect, getMyOrders)
router.get('/my-orders', protect, getMyOrders)
router.get('/admin/all', listAllOrders)
router.get('/', listAllOrders)
router.get('/:id', authenticateUserOrAdmin, getOrderById)
router.get('/:id/invoice', authenticateUserOrAdmin, downloadInvoice)
router.patch('/:id/cancel', authenticateUserOrAdmin, cancelOrder)
router.post('/:id/refund-request', authenticateUserOrAdmin, requestRefund)
router.post('/:id/process-refund', processRefund)
router.patch('/:id/status', updateOrderStatus)
router.delete('/', deleteAllOrders)
router.delete('/:id', deleteOrder)

export default router
