import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { connectDB } from './config/db.js'
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

// Cookie Parser Middleware for HttpOnly Admin Session Cookies
app.use(cookieParser())

// Allowed Origins for CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true)
      }
      return callback(null, true)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-MFA-Code', 'X-Admin-Session-Id'],
  })
)

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
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', apiLimiter)

app.post('/api/create-order', createRazorpayOrder)
app.post('/api/verify-payment', verifyPayment)

// Primary Routes
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

const PORT = process.env.PORT || 5000

const server = http.createServer(app)
initSocket(server)

connectDB().then(() => {
  startAutomaticDbCleanup()
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bloom Atelier API & Real-Time WebSockets running on port ${PORT}`)
  })
})
