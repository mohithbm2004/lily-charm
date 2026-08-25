import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { connectDB } from './config/db.js'
import { ENV } from './config/env.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import collectionRoutes from './routes/collectionRoutes.js'
import customRequestRoutes from './routes/customRequestRoutes.js'
import settingRoutes from './routes/settingRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import cartRoutes from './routes/cartRoutes.js'
import healthRouter from './routes/healthRouter.js'
import { createRazorpayOrder, verifyPayment } from './controllers/orderController.js'
import { handleRazorpayWebhook } from './controllers/paymentController.js'
import { protect, authenticateUserOrAdmin } from './middleware/auth.js'
import { startAutomaticDbCleanup } from './utils/dbCleanup.js'
import { backfillExistingCarts } from './utils/backfillCarts.js'
import { startReconciliationWorker } from './utils/paymentReconciliation.js'
import { seedDefaultCoupons } from './utils/seedCoupons.js'
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

// Cookie Parser Middleware for HttpOnly Admin Session Cookies
app.use(cookieParser())

// Allowed Origins for CORS
const allowedOrigins = ENV.getCorsOrigins()

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.railway.app') ||
        origin.endsWith('lilycharm.in') ||
        !ENV.IS_PRODUCTION
      ) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-MFA-Code', 'X-Admin-Session-Id'],
  })
)

// Razorpay signs the exact request bytes, so this route must run before the JSON parser.
app.post('/api/payment/webhook', express.raw({ type: 'application/json', limit: '50mb' }), handleRazorpayWebhook)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bloom Atelier API is running',
  })
})

// Health Check Endpoints (Exempt from rate limiting)
app.use('/health', healthRouter)
app.use('/api/health', healthRouter)

// Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: ENV.IS_PRODUCTION ? 1000 : 10000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', apiLimiter)

app.post('/api/create-order', authenticateUserOrAdmin, createRazorpayOrder)
app.post('/api/verify-payment', authenticateUserOrAdmin, verifyPayment)

import webhookRoutes from './routes/webhookRoutes.js'

// Primary Routes
app.use('/api/webhooks', webhookRoutes)
app.use('/api/admin', adminRoutes)
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
app.use('/api/contact', contactRoutes)
app.use('/api/cart', cartRoutes)

import http from 'http'
import { initSocket } from './socket.js'

app.use(notFound)
app.use(errorHandler)

const PORT = ENV.PORT

const server = http.createServer(app)
initSocket(server)

connectDB().then(() => {
  startAutomaticDbCleanup()
  backfillExistingCarts()
  startReconciliationWorker()
  seedDefaultCoupons()
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bloom Atelier API & Real-Time WebSockets running on port ${PORT}`)
    console.log(`EMAIL TEST MODE: ${ENV.EMAIL_TEST_MODE ? 'ENABLED' : 'DISABLED'}`)
  })
})
