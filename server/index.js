import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { connectDB } from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import collectionRoutes from './routes/collectionRoutes.js'
import customRequestRoutes from './routes/customRequestRoutes.js'
import settingRoutes from './routes/settingRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import { createRazorpayOrder, verifyPayment } from './controllers/orderController.js'
import { startAutomaticDbCleanup } from './utils/dbCleanup.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

// Trust Render / Cloudflare reverse proxy headers
app.set('trust proxy', 1)

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
)

app.use(cors())

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health Check Endpoint (Exempt from rate limiting)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Generous limit for production and dev
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', apiLimiter)

app.post('/api/create-order', createRazorpayOrder)
app.post('/api/verify-payment', verifyPayment)

import paymentRoutes from './routes/paymentRoutes.js'

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/collections', collectionRoutes)
app.use('/api/custom-requests', customRequestRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/reviews', reviewRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

connectDB().then(() => {
  startAutomaticDbCleanup()
  app.listen(PORT, () => console.log(`Lily Charm API running on port ${PORT}`))
})
