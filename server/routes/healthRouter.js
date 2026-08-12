import { Router } from 'express'
import { checkHealth, checkEmailApiHealth } from '../controllers/healthController.js'

const healthRouter = Router()

healthRouter.get('/', checkHealth)
healthRouter.get('/check', checkHealth)
healthRouter.get('/email-api-test', checkEmailApiHealth)
healthRouter.get('/test-email', checkEmailApiHealth)

export default healthRouter
