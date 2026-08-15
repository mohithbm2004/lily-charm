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
import { protect } from '../middleware/auth.js'
import { protectAdmin } from '../middleware/adminAuth.js'

const router = Router()

router.get('/mine', protect, listMyCustomRequests)
router.get('/', protectAdmin, listCustomRequests)
router.get('/:id/public-summary', protect, getPublicQuoteSummary)
router.post('/', protect, uploadAnyImages, createCustomRequest)
router.patch('/:id/quote', protectAdmin, quotePrice)
router.post('/:id/create-razorpay-order', protect, createQuoteRazorpayOrder)
router.post('/:id/accept', protect, acceptQuoteAndCreateOrder)
router.patch('/:id/decline', protect, declineQuote)
router.patch('/:id/status', protectAdmin, updateCustomRequestStatus)
router.delete('/:id', protectAdmin, deleteCustomRequest)

export default router
