import express from 'express'
import {
  listReviews,
  createReview,
  toggleReviewDisplay,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js'

const router = express.Router()

router.get('/', listReviews)
router.post('/', createReview)
router.patch('/:id/display', toggleReviewDisplay)
router.put('/:id', updateReview)
router.delete('/:id', deleteReview)

export default router
