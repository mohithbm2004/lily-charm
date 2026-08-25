import { Router } from 'express'
import { handleZeptoMailWebhook } from '../controllers/webhookController.js'

const router = Router()

// ZeptoMail Webhook Receiver Routes
router.post('/zeptomail', handleZeptoMailWebhook)
router.post('/v1/zeptomail', handleZeptoMailWebhook)

export default router
