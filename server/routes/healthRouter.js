import { Router } from 'express'
import { checkHealth, checkSmtpHealth } from '../controllers/healthController.js'

const healthRouter = Router()

healthRouter.get('/', checkHealth)
healthRouter.get('/check', checkHealth)
healthRouter.get('/smtp-test', checkSmtpHealth)
healthRouter.get('/test-smtp', checkSmtpHealth)

export default healthRouter
