import { Router } from 'express'
import {
  createOrder,
  createRazorpayOrder,
  verifyPayment,
  myOrders,
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
router.get('/mine', myOrders)
router.get('/', listAllOrders)
router.patch('/:id/status', updateOrderStatus)
router.delete('/', deleteAllOrders)
router.delete('/:id', deleteOrder)

export default router
