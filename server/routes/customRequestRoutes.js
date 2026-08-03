import { Router } from 'express'
import {
  listCustomRequests,
  createCustomRequest,
  quotePrice,
  acceptQuoteAndCreateOrder,
  declineQuote,
  updateCustomRequestStatus,
  deleteCustomRequest,
} from '../controllers/customRequestController.js'
import { uploadAnyImages } from '../middleware/upload.js'

const router = Router()

router.get('/', listCustomRequests)
router.post('/', uploadAnyImages, createCustomRequest)
router.patch('/:id/quote', quotePrice)
router.post('/:id/accept', acceptQuoteAndCreateOrder)
router.patch('/:id/decline', declineQuote)
router.patch('/:id/status', updateCustomRequestStatus)
router.delete('/:id', deleteCustomRequest)

export default router
