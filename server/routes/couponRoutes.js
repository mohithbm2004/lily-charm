import express from 'express'
import {
  getCoupons,
  getActiveCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js'

import { protectAdmin } from '../middleware/adminAuth.js'

const router = express.Router()

router.get('/', protectAdmin, getCoupons)
router.get('/active', getActiveCoupons)
router.post('/', protectAdmin, createCoupon)
router.put('/:id', protectAdmin, updateCoupon)
router.delete('/:id', protectAdmin, deleteCoupon)

export default router
