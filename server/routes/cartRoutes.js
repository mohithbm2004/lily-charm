import express from 'express'
import { getCart, saveCart, mergeCart, clearCart } from '../controllers/cartController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

router.get('/', protect, getCart)
router.put('/', protect, saveCart)
router.post('/merge', protect, mergeCart)
router.delete('/', protect, clearCart)

export default router
