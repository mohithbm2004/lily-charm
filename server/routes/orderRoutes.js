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

router.post('/', authenticateUserOrAdmin, createOrder)
router.post('/create-order', authenticateUserOrAdmin, createRazorpayOrder)
router.post('/create-razorpay-order', authenticateUserOrAdmin, createRazorpayOrder)
router.post('/verify', authenticateUserOrAdmin, verifyPayment)
router.post('/verify-payment', authenticateUserOrAdmin, verifyPayment)
router.get('/mine', authenticateUserOrAdmin, getMyOrders)
router.get('/my-orders', authenticateUserOrAdmin, getMyOrders)
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
