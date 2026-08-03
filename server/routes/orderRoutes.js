import { Router } from 'express'
import {
  createOrder,
  verifyPayment,
  myOrders,
  listAllOrders,
  updateOrderStatus,
  deleteOrder,
  deleteAllOrders,
} from '../controllers/orderController.js'

const router = Router()

router.post('/', createOrder)
router.post('/verify', verifyPayment)
router.get('/mine', myOrders)
router.get('/', listAllOrders)
router.patch('/:id/status', updateOrderStatus)
router.delete('/', deleteAllOrders)
router.delete('/:id', deleteOrder)

export default router
