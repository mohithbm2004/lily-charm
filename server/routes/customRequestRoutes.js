import { Router } from 'express'
import {
  listCustomRequests,
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

const router = Router()

router.get('/', listCustomRequests)
router.get('/:id/public-summary', getPublicQuoteSummary)
router.post('/', uploadAnyImages, createCustomRequest)
router.patch('/:id/quote', quotePrice)
router.post('/:id/create-razorpay-order', createQuoteRazorpayOrder)
router.post('/:id/accept', acceptQuoteAndCreateOrder)
router.patch('/:id/decline', declineQuote)
router.patch('/:id/status', updateCustomRequestStatus)
router.delete('/:id', deleteCustomRequest)

export default router
