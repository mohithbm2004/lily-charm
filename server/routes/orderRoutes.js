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

const router = Router()

router.post('/', createOrder)
router.post('/create-order', createRazorpayOrder)
router.post('/create-razorpay-order', createRazorpayOrder)
router.post('/verify', verifyPayment)
router.post('/verify-payment', verifyPayment)
router.get('/mine', getMyOrders)
router.get('/my-orders', getMyOrders)
router.get('/admin/all', listAllOrders)
router.get('/', listAllOrders)
router.get('/:id', getOrderById)
router.get('/:id/invoice', downloadInvoice)
router.patch('/:id/cancel', cancelOrder)
router.post('/:id/refund-request', requestRefund)
router.post('/:id/process-refund', processRefund)
router.patch('/:id/status', updateOrderStatus)
router.delete('/', deleteAllOrders)
router.delete('/:id', deleteOrder)

export default router
