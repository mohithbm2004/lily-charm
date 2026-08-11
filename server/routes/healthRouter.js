import { Router } from 'express'
import { checkHealth } from '../controllers/healthController.js'

const healthRouter = Router()

healthRouter.get('/', checkHealth)
healthRouter.get('/check', checkHealth)

export default healthRouter
