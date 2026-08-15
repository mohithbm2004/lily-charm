import { Router } from 'express'
import {
  listCustomRequests,
  listMyCustomRequests,
  getPublicQuoteSummary,
  createCustomRequest,
  quotePrice,
  createQuoteRazorpayOrder,
  acceptQuoteAndCreateOrder,
  declineQuote,
  updateCustomRequestStatus,
  deleteCustomRequest,
} from '../controllers/customRequestController.js'
import { uploadAnyImages } from '../middleware/upload.js'
import { protect, authenticateUserOrAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/mine', protect, listMyCustomRequests)
router.get('/', authenticateUserOrAdmin, listCustomRequests)
router.get('/:id/public-summary', getPublicQuoteSummary)
router.post('/', protect, uploadAnyImages, createCustomRequest)
router.patch('/:id/quote', quotePrice)
router.post('/:id/create-razorpay-order', createQuoteRazorpayOrder)
router.post('/:id/accept', acceptQuoteAndCreateOrder)
router.patch('/:id/decline', authenticateUserOrAdmin, declineQuote)
router.patch('/:id/status', updateCustomRequestStatus)
router.delete('/:id', deleteCustomRequest)

export default router
