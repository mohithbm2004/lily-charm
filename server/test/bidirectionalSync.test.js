import 'dotenv/config'
import mongoose from 'mongoose'
import http from 'http'
import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { io as ClientIO } from 'socket.io-client'

// Models
import Product from '../models/Product.js'
import Collection from '../models/Collection.js'
import Coupon from '../models/Coupon.js'
import Setting from '../models/Setting.js'
import Order from '../models/Order.js'
import CustomRequest from '../models/CustomRequest.js'
import Review from '../models/Review.js'
import User from '../models/User.js'
import AdminUser from '../models/AdminUser.js'
import AdminSession from '../models/AdminSession.js'

// Routes & Socket
import productRoutes from '../routes/productRoutes.js'
import collectionRoutes from '../routes/collectionRoutes.js'
import couponRoutes from '../routes/couponRoutes.js'
import settingRoutes from '../routes/settingRoutes.js'
import orderRoutes from '../routes/orderRoutes.js'
import customRequestRoutes from '../routes/customRequestRoutes.js'
import reviewRoutes from '../routes/reviewRoutes.js'
import authRoutes from '../routes/authRoutes.js'
import adminRoutes from '../routes/adminRoutes.js'
import { initSocket } from '../socket.js'
import { ENV } from '../config/env.js'

async function runBidirectionalVerification() {
  console.log('\n=====================================================================')
  console.log('🚀 BIDIRECTIONAL DATA-SYNC & REAL-TIME WEBSOCKET TEST')
  console.log('   Admin -> DB -> Customer AND Customer -> DB -> Admin')
  console.log('=====================================================================\n')

  await mongoose.connect(ENV.MONGO_URI)
  console.log('✅ Connected to MongoDB')

  const app = express()
  app.use(cookieParser())
  app.use(express.json())

  app.use('/api/admin', adminRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/collections', collectionRoutes)
  app.use('/api/coupons', couponRoutes)
  app.use('/api/settings', settingRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/custom-requests', customRequestRoutes)
  app.use('/api/reviews', reviewRoutes)

  const server = http.createServer(app)
  initSocket(server)

  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://localhost:${port}/api`
  const socketUrl = `http://localhost:${port}`

  let adminClientSocket = null
  let customerClientSocket = null

  try {
    // -------------------------------------------------------------------------
    // 0. AUTHENTICATE ADMIN & CUSTOMER
    // -------------------------------------------------------------------------
    const adminEmail = ENV.ADMIN_EMAIL
    const rawAdminPass = ENV.ADMIN_PASSWORD
    const passwordHash = await bcrypt.hash(rawAdminPass, 10)

    await AdminUser.findOneAndUpdate(
      { email: adminEmail },
      { email: adminEmail, passwordHash, isInitialized: true },
      { upsert: true, new: true }
    )

    // Admin Login via HTTP
    const adminLoginRes = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: rawAdminPass }),
    })
    const adminLoginData = await adminLoginRes.json()
    const adminSessionId = adminLoginData.sessionId
    const adminHeaders = {
      'Content-Type': 'application/json',
      'x-admin-session-id': adminSessionId,
    }
    console.log(`✅ Admin authenticated. Session ID: ${adminSessionId.slice(0, 10)}...`)

    // Customer Setup with verified account & JWT token
    const testCustomerEmail = `sync.collector.${Date.now()}@example.com`
    const testCustomer = await User.create({
      name: 'Lily Collector',
      email: testCustomerEmail,
      password: await bcrypt.hash('CollectorSecure@2026', 10),
      phone: '9876543210',
      isVerified: true,
      provider: 'email',
    })
    const customerUserId = testCustomer._id
    const customerToken = jwt.sign({ id: customerUserId }, ENV.JWT_SECRET, { expiresIn: '7d' })
    const customerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    }
    console.log(`✅ Customer authenticated: ${testCustomerEmail}`)

    // Connect WebSocket Clients
    adminClientSocket = ClientIO(socketUrl, {
      auth: { adminSessionId },
      transports: ['websocket'],
    })

    customerClientSocket = ClientIO(socketUrl, {
      auth: { token: customerToken },
      transports: ['websocket'],
    })

    await Promise.race([
      Promise.all([
        new Promise((res) => adminClientSocket.on('connect', res)),
        new Promise((res) => customerClientSocket.on('connect', res)),
      ]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('WebSocket connection timeout')), 5000)),
    ])
    console.log('✅ Both Admin & Customer WebSockets connected successfully.')

    // =========================================================================
    // TEST 1: ADMIN -> MONGODB -> CUSTOMER (PRODUCT UPDATE ₹1000 -> ₹1200)
    // =========================================================================
    console.log('\n--- 1. Testing Admin -> MongoDB -> Customer Product Update ---')
    const testProd = await Product.create({
      title: 'Silk Velvet Rose',
      specimen: `SPEC-${Date.now()}`,
      slug: `silk-rose-${Date.now()}`,
      price: 1000,
      stock: 10,
      isArchived: false,
    })

    // Setup customer socket listener for real-time broadcast
    const productUpdatePromise = new Promise((resolve) => {
      customerClientSocket.once('PRODUCT_UPDATED', (data) => {
        resolve(data)
      })
    })

    // Admin updates price to 1200 via API
    const updateProdRes = await fetch(`${baseUrl}/products/${testProd._id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ price: 1200, title: 'Crimson Silk Velvet Rose' }),
    })
    if (!updateProdRes.ok) throw new Error(`Admin update failed: ${updateProdRes.status}`)

    // 1. Check MongoDB
    const mongoProd = await Product.findById(testProd._id)
    if (mongoProd.price !== 1200 || mongoProd.title !== 'Crimson Silk Velvet Rose') {
      throw new Error(`MongoDB document price mismatch: ${mongoProd.price}`)
    }
    console.log(`- MongoDB Document updated: price = ₹${mongoProd.price}, title = "${mongoProd.title}"`)

    // 2. Check Customer GET API
    const customerGetRes = await fetch(`${baseUrl}/products/${testProd._id}`)
    const customerProdData = await customerGetRes.json()
    if (customerProdData.price !== 1200) {
      throw new Error(`Customer API price mismatch: ${customerProdData.price}`)
    }
    console.log(`- Customer GET /products/:id returned: price = ₹${customerProdData.price}`)

    // 3. Check Customer WebSocket Received Event
    const socketEventData = await Promise.race([
      productUpdatePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('PRODUCT_UPDATED socket timeout')), 3000)),
    ])
    if (socketEventData.price !== 1200) {
      throw new Error(`WebSocket payload mismatch: ${socketEventData.price}`)
    }
    console.log(`- Customer WebSocket received real-time event: price = ₹${socketEventData.price}`)
    console.log('🟢 PASS: Admin -> MongoDB -> Customer Product Update verified!')

    // =========================================================================
    // TEST 2: CUSTOMER -> MONGODB -> ADMIN (ORDER CREATION)
    // =========================================================================
    console.log('\n--- 2. Testing Customer -> MongoDB -> Admin Order Creation ---')

    const adminOrderCreatedPromise = new Promise((resolve) => {
      adminClientSocket.once('ORDER_CREATED', (data) => {
        resolve(data)
      })
    })

    const createOrderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        items: [{ productId: testProd._id, qty: 1 }],
        shippingAddress: {
          name: 'Lily Collector',
          email: testCustomerEmail,
          phone: '9876543210',
          address: '123 Botanical Lane',
          city: 'Bengaluru',
          pincode: '560001',
        },
        paymentMethod: 'Razorpay Prepaid',
        termsAccepted: true,
      }),
    })
    if (!createOrderRes.ok) {
      const err = await createOrderRes.text()
      throw new Error(`Customer order creation failed: ${err}`)
    }
    const orderData = await createOrderRes.json()
    console.log(`- Customer placed order: ${orderData.orderNumber}`)

    // 1. Check MongoDB
    const mongoOrder = await Order.findById(orderData._id)
    if (!mongoOrder || mongoOrder.orderNumber !== orderData.orderNumber) {
      throw new Error('Order not found in MongoDB!')
    }
    console.log(`- MongoDB Order verified: ${mongoOrder.orderNumber}, Total = ₹${mongoOrder.grandTotal}`)

    // 2. Check Admin GET /orders API
    const adminOrdersRes = await fetch(`${baseUrl}/orders`, { headers: adminHeaders })
    const adminOrdersData = await adminOrdersRes.json()
    const foundOrderInAdmin = adminOrdersData.find((o) => o._id === String(orderData._id))
    if (!foundOrderInAdmin) {
      throw new Error('Order not returned in Admin GET /orders API!')
    }
    console.log(`- Admin GET /orders API successfully retrieved customer order`)

    // 3. Check Admin WebSocket Received Event in 'admin' Room
    const adminSocketOrder = await Promise.race([
      adminOrderCreatedPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('ORDER_CREATED socket timeout')), 3000)),
    ])
    if (adminSocketOrder.orderNumber !== orderData.orderNumber) {
      throw new Error('Admin WebSocket orderNumber mismatch!')
    }
    console.log(`- Admin WebSocket in room 'admin' received real-time ORDER_CREATED event: ${adminSocketOrder.orderNumber}`)
    console.log('🟢 PASS: Customer -> MongoDB -> Admin Order Creation verified!')

    // =========================================================================
    // TEST 3: CUSTOMER -> MONGODB -> ADMIN (CUSTOM REQUEST)
    // =========================================================================
    console.log('\n--- 3. Testing Customer -> MongoDB -> Admin Custom Request ---')

    const adminCustomReqPromise = new Promise((resolve) => {
      adminClientSocket.once('CUSTOM_REQUEST_CREATED', (data) => {
        resolve(data)
      })
    })

    const customReqRes = await fetch(`${baseUrl}/custom-requests`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        name: 'Lily Collector',
        email: testCustomerEmail,
        phone: '9876543210',
        address: '123 Botanical Lane',
        city: 'Bengaluru',
        pincode: '560001',
        occasion: 'Anniversary',
        stylePreference: 'Velvet Pearl Lilies in Woven Basket',
        budget: '₹4000 - ₹5000',
        notes: 'Please add blush pink ribbons',
      }),
    })
    const customReqData = await customReqRes.json()

    // 1. Check MongoDB
    const mongoReq = await CustomRequest.findById(customReqData._id)
    if (!mongoReq) throw new Error('Custom Request not found in MongoDB!')
    console.log(`- MongoDB Custom Request saved: ${mongoReq._id}`)

    // 2. Check Admin GET /custom-requests API
    const adminReqsRes = await fetch(`${baseUrl}/custom-requests`, { headers: adminHeaders })
    const adminReqsData = await adminReqsRes.json()
    const foundReq = adminReqsData.find((r) => String(r._id) === String(customReqData._id))
    if (!foundReq) throw new Error('Custom Request not returned in Admin API!')
    console.log(`- Admin GET /custom-requests API retrieved customer request`)

    // 3. Check Admin WebSocket Received Event
    const adminSocketReq = await Promise.race([
      adminCustomReqPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('CUSTOM_REQUEST_CREATED socket timeout')), 3000)),
    ])
    console.log(`- Admin WebSocket received real-time CUSTOM_REQUEST_CREATED event: ${adminSocketReq._id}`)
    console.log('🟢 PASS: Customer -> MongoDB -> Admin Custom Request verified!')

    // =========================================================================
    // TEST 4: CUSTOMER -> MONGODB -> ADMIN (REVIEW SUBMISSION)
    // =========================================================================
    console.log('\n--- 4. Testing Customer -> MongoDB -> Admin Review Submission ---')

    const adminReviewPromise = new Promise((resolve) => {
      adminClientSocket.once('REVIEW_CREATED', (data) => {
        resolve(data)
      })
    })

    const reviewRes = await fetch(`${baseUrl}/reviews`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({
        name: 'Lily Collector',
        rating: 5,
        title: 'Masterpiece Florals',
        comment: 'The velvet textures and craftsmanship are breathtaking!',
      }),
    })
    const reviewData = await reviewRes.json()

    // 1. Check MongoDB
    const mongoReview = await Review.findById(reviewData._id)
    if (!mongoReview) throw new Error('Review not found in MongoDB!')
    console.log(`- MongoDB Review saved: "${mongoReview.title}"`)

    // 2. Check Admin GET /reviews?admin=true API
    const adminReviewsRes = await fetch(`${baseUrl}/reviews?admin=true`, { headers: adminHeaders })
    const adminReviewsData = await adminReviewsRes.json()
    const foundRev = adminReviewsData.find((r) => String(r._id) === String(reviewData._id))
    if (!foundRev) throw new Error('Review not returned in Admin Reviews API!')
    console.log(`- Admin GET /reviews API retrieved customer review`)

    // 3. Check Admin WebSocket Received Event
    const adminSocketRev = await Promise.race([
      adminReviewPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('REVIEW_CREATED socket timeout')), 3000)),
    ])
    console.log(`- Admin WebSocket received real-time REVIEW_CREATED event: "${adminSocketRev.title}"`)
    console.log('🟢 PASS: Customer -> MongoDB -> Admin Review Submission verified!')

    // Cleanup test records
    await Product.deleteOne({ _id: testProd._id })
    await Order.deleteOne({ _id: orderData._id })
    await CustomRequest.deleteOne({ _id: customReqData._id })
    await Review.deleteOne({ _id: reviewData._id })
    await User.deleteOne({ _id: customerUserId })

    console.log('\n=====================================================================')
    console.log('🎉 ALL BIDIRECTIONAL SYNC & WEBSOCKET BROADCAST TESTS PASSED!')
    console.log('=====================================================================\n')
  } finally {
    if (adminClientSocket) adminClientSocket.disconnect()
    if (customerClientSocket) customerClientSocket.disconnect()
    server.close()
    await mongoose.disconnect()
  }
}

runBidirectionalVerification().catch((err) => {
  console.error('\n❌ BIDIRECTIONAL TEST FAILED:', err)
  process.exit(1)
})
