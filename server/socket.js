import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import AdminSession from './models/AdminSession.js'

let io = null

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean)

/**
 * Initialize Socket.IO with existing HTTP Server
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
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
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Socket Connection Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth || {}
      const token = auth.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
      const adminSessionId = auth.adminSessionId || socket.handshake.headers?.['x-admin-session-id']

      // 1. Check if Admin Session
      if (adminSessionId) {
        const session = await AdminSession.findOne({ sessionId: adminSessionId })
        if (session && !session.isPreMfa && new Date() < new Date(session.expiresAt)) {
          socket.isAdmin = true
          socket.adminEmail = session.adminEmail
        }
      }

      // 2. Check Customer JWT Token
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          if (decoded && decoded.id) {
            socket.userId = String(decoded.id)
            socket.userEmail = decoded.email
          }
        } catch {
          // Token expired or invalid - socket can still connect as guest for public broadcasts
        }
      }

      next()
    } catch (err) {
      console.warn('[SOCKET AUTH WARNING]:', err.message || err)
      next() // Allow unauthenticated connection for public storefront broadcasts
    }
  })

  io.on('connection', (socket) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SOCKET] Client connected: ${socket.id} (Admin: ${Boolean(socket.isAdmin)}, User: ${socket.userId || 'guest'})`)
    }

    // Automatically join role-based rooms
    if (socket.isAdmin) {
      socket.join('admin')
      if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET] ${socket.id} joined room: admin`)
    }

    if (socket.userId) {
      socket.join(`user:${socket.userId}`)
      if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET] ${socket.id} joined room: user:${socket.userId}`)
    }

    // Explicit room join requests (with ownership verification)
    socket.on('join_user', ({ userId, token }) => {
      if (!userId) return
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          if (String(decoded.id) === String(userId)) {
            socket.userId = String(userId)
            socket.join(`user:${userId}`)
          }
        } catch {}
      } else if (socket.isAdmin || socket.userId === String(userId)) {
        socket.join(`user:${userId}`)
      }
    })

    socket.on('join_order', ({ orderId }) => {
      if (orderId) {
        socket.join(`order:${orderId}`)
      }
    })

    socket.on('join_admin', async ({ adminSessionId }) => {
      if (adminSessionId) {
        const session = await AdminSession.findOne({ sessionId: adminSessionId })
        if (session && !session.isPreMfa && new Date() < new Date(session.expiresAt)) {
          socket.isAdmin = true
          socket.join('admin')
        }
      }
    })

    socket.on('disconnect', (reason) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SOCKET] Client disconnected: ${socket.id} (${reason})`)
      }
    })
  })

  return io
}

export function getIO() {
  return io
}

// ==========================================
// REAL-TIME BROADCASTING & EMISSION HELPERS
// ==========================================

export function emitOrderCreated(order) {
  if (!io || !order) return
  const safeOrder = sanitizeOrder(order)
  if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET EMIT] ORDER_CREATED: ${order.orderNumber || order._id}`)

  // Emit to admin dashboard
  io.to('admin').emit('ORDER_CREATED', safeOrder)

  // Emit to customer room if user account exists
  if (order.user) {
    io.to(`user:${order.user._id || order.user}`).emit('ORDER_CREATED', safeOrder)
  }
}

export function emitOrderUpdated(order) {
  if (!io || !order) return
  const safeOrder = sanitizeOrder(order)
  const orderId = String(order._id || order.id)
  if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET EMIT] ORDER_UPDATED: ${orderId} (${order.status})`)

  io.to('admin').emit('ORDER_UPDATED', safeOrder)
  io.to('admin').emit('ORDER_STATUS_UPDATED', {
    orderId,
    status: order.status,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    updatedAt: order.updatedAt,
  })

  io.to(`order:${orderId}`).emit('ORDER_UPDATED', safeOrder)
  io.to(`order:${orderId}`).emit('ORDER_STATUS_UPDATED', {
    orderId,
    status: order.status,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    updatedAt: order.updatedAt,
  })

  if (order.user) {
    const userId = String(order.user._id || order.user)
    io.to(`user:${userId}`).emit('ORDER_UPDATED', safeOrder)
    io.to(`user:${userId}`).emit('ORDER_STATUS_UPDATED', {
      orderId,
      status: order.status,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      updatedAt: order.updatedAt,
    })
  }
}

export function emitOrderCancelled(order) {
  if (!io || !order) return
  const orderId = String(order._id || order.id || order)
  if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET EMIT] ORDER_CANCELLED: ${orderId}`)

  io.to('admin').emit('ORDER_CANCELLED', { orderId, refunded: Boolean(order.isRefunded) })
  io.to(`order:${orderId}`).emit('ORDER_CANCELLED', { orderId, refunded: Boolean(order.isRefunded) })

  if (order.user) {
    const userId = String(order.user._id || order.user)
    io.to(`user:${userId}`).emit('ORDER_CANCELLED', { orderId, refunded: Boolean(order.isRefunded) })
  }
}

export function emitProductCreated(product) {
  if (!io || !product) return
  if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET EMIT] PRODUCT_CREATED: ${product.title}`)
  io.emit('PRODUCT_CREATED', product)
}

export function emitProductUpdated(product) {
  if (!io || !product) return
  if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET EMIT] PRODUCT_UPDATED: ${product.title}`)
  io.emit('PRODUCT_UPDATED', product)
}

export function emitProductDeleted(productId) {
  if (!io || !productId) return
  if (process.env.NODE_ENV !== 'production') console.log(`[SOCKET EMIT] PRODUCT_DELETED: ${productId}`)
  io.emit('PRODUCT_DELETED', { productId: String(productId) })
}

export function emitCollectionCreated(collection) {
  if (!io || !collection) return
  io.emit('COLLECTION_CREATED', collection)
}

export function emitCollectionUpdated(collection) {
  if (!io || !collection) return
  io.emit('COLLECTION_UPDATED', collection)
}

export function emitCollectionDeleted(collectionId) {
  if (!io || !collectionId) return
  io.emit('COLLECTION_DELETED', { collectionId: String(collectionId) })
}

export function emitCouponCreated(coupon) {
  if (!io || !coupon) return
  io.emit('COUPON_CREATED', coupon)
}

export function emitCouponUpdated(coupon) {
  if (!io || !coupon) return
  io.emit('COUPON_UPDATED', coupon)
}

export function emitCouponDeleted(couponId) {
  if (!io || !couponId) return
  io.emit('COUPON_DELETED', { couponId: String(couponId) })
}

export function emitCustomRequestCreated(request) {
  if (!io || !request) return
  io.to('admin').emit('CUSTOM_REQUEST_CREATED', request)
  if (request.user) {
    io.to(`user:${request.user._id || request.user}`).emit('CUSTOM_REQUEST_CREATED', request)
  }
}

export function emitCustomRequestUpdated(request) {
  if (!io || !request) return
  io.to('admin').emit('CUSTOM_REQUEST_UPDATED', request)
  if (request.user) {
    io.to(`user:${request.user._id || request.user}`).emit('CUSTOM_REQUEST_UPDATED', request)
  }
}

export function emitCustomRequestDeleted(requestId) {
  if (!io || !requestId) return
  io.to('admin').emit('CUSTOM_REQUEST_DELETED', { requestId: String(requestId) })
  io.emit('CUSTOM_REQUEST_DELETED', { requestId: String(requestId) })
}

export function emitReviewCreated(review) {
  if (!io || !review) return
  io.to('admin').emit('REVIEW_CREATED', review)
  if (review.isDisplayed) {
    io.emit('REVIEW_CREATED', review)
  }
}

export function emitReviewUpdated(review) {
  if (!io || !review) return
  io.to('admin').emit('REVIEW_UPDATED', review)
  io.emit('REVIEW_UPDATED', review)
}

export function emitReviewDeleted(reviewId) {
  if (!io || !reviewId) return
  io.to('admin').emit('REVIEW_DELETED', { reviewId: String(reviewId) })
  io.emit('REVIEW_DELETED', { reviewId: String(reviewId) })
}

export function emitSettingsUpdated(settings) {
  if (!io || !settings) return
  io.emit('SETTINGS_UPDATED', settings)
}

export function emitCartUpdated(userId, cart) {
  if (!io || !userId) return
  io.to(`user:${String(userId)}`).emit('CART_UPDATED', cart)
}

function sanitizeOrder(order) {
  const doc = typeof order.toObject === 'function' ? order.toObject() : { ...order }
  delete doc.__v
  return doc
}
