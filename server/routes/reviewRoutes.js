import express from 'express'
import {
  listReviews,
  createReview,
  toggleReviewDisplay,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js'

import { protectAdmin } from '../middleware/adminAuth.js'

const router = express.Router()

router.get('/', listReviews)
router.post('/', createReview)
router.patch('/:id/display', protectAdmin, toggleReviewDisplay)
router.put('/:id', protectAdmin, updateReview)
router.delete('/:id', protectAdmin, deleteReview)

export default router
