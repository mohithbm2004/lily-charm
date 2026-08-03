import express from 'express'
import {
  getCoupons,
  getActiveCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController.js'

const router = express.Router()

router.get('/', getCoupons)
router.get('/active', getActiveCoupons)
router.post('/', createCoupon)
router.put('/:id', updateCoupon)
router.delete('/:id', deleteCoupon)

export default router
