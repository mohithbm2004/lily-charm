import 'dotenv/config'
import mongoose from 'mongoose'
import http from 'http'
import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'

// Import models
import Product from '../models/Product.js'
import Collection from '../models/Collection.js'
import Coupon from '../models/Coupon.js'
import Setting from '../models/Setting.js'
import AdminUser from '../models/AdminUser.js'
import AdminSession from '../models/AdminSession.js'

// Import routes
import productRoutes from '../routes/productRoutes.js'
import collectionRoutes from '../routes/collectionRoutes.js'
import couponRoutes from '../routes/couponRoutes.js'
import settingRoutes from '../routes/settingRoutes.js'
import orderRoutes from '../routes/orderRoutes.js'
import customRequestRoutes from '../routes/customRequestRoutes.js'
import adminRoutes from '../routes/adminRoutes.js'

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI

async function runEndToEndVerification() {
  console.log('\n=====================================================================')
  console.log('🚀 TESTING ADMIN DASHBOARD CRUD PERSISTENCE & CUSTOMER STOREFRONT')
  console.log('=====================================================================\n')

  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')

  // Set up Express test server with identical middleware as production
  const app = express()
  app.use(cookieParser())
  app.use(express.json())

  app.use('/api/admin', adminRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/collections', collectionRoutes)
  app.use('/api/coupons', couponRoutes)
  app.use('/api/settings', settingRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/custom-requests', customRequestRoutes)

  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const baseUrl = `http://localhost:${port}/api`

  try {
    // 0. Create Admin and valid Admin Session
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bloomatelier.com').toLowerCase().trim()
    const rawAdminPass = process.env.ADMIN_PASSWORD || 'LilyAdmin@2026Secure!'
    const passwordHash = await bcrypt.hash(rawAdminPass, 10)

    await AdminUser.findOneAndUpdate(
      { email: adminEmail },
      { email: adminEmail, passwordHash, isInitialized: true },
      { upsert: true, new: true }
    )

    // Log in via Admin Login API
    const loginRes = await fetch(`${baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: rawAdminPass }),
    })
    const loginData = await loginRes.json()
    if (!loginData.success || !loginData.sessionId) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`)
    }
    const sessionId = loginData.sessionId
    const adminHeaders = {
      'Content-Type': 'application/json',
      'x-admin-session-id': sessionId,
    }
    console.log(`✅ Admin authenticated successfully. Session ID: ${sessionId.slice(0, 10)}...`)

    // =========================================================================
    // TEST 1: PRODUCT UPDATE (Before -> Admin Update -> Mongo Check -> Customer Check)
    // =========================================================================
    console.log('\n--- 1. Testing Product Edit & Price Update ---')
    const testProduct = await Product.create({
      title: 'Original Vintage Floral Frame',
      specimen: `SPEC-${Date.now()}`,
      slug: `orig-floral-${Date.now()}`,
      price: 1000,
      stock: 5,
      isArchived: false,
      category: 'frames',
    })
    console.log(`Initial Product in MongoDB: "${testProduct.title}" | Price: ₹${testProduct.price}`)

    // Admin updates product price from ₹1000 to ₹1200 and title to "Silk Crimson Rose Frame"
    const updateRes = await fetch(`${baseUrl}/products/${testProduct._id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Silk Crimson Rose Frame',
        price: 1200,
      }),
    })
    const updateData = await updateRes.json()
    console.log(`Admin PUT /products/:id Status: ${updateRes.status}`)

    // Verify directly from MongoDB
    const mongoProductAfter = await Product.findById(testProduct._id)
    console.log(`MongoDB document after update: Title="${mongoProductAfter.title}" | Price=₹${mongoProductAfter.price}`)
    if (mongoProductAfter.price !== 1200 || mongoProductAfter.title !== 'Silk Crimson Rose Frame') {
      throw new Error('FAIL: MongoDB did not persist updated product fields!')
    }

    // Verify Customer Public GET API
    const customerGetRes = await fetch(`${baseUrl}/products/${testProduct._id}`)
    const customerProduct = await customerGetRes.json()
    console.log(`Customer GET /products/:id: Title="${customerProduct.title}" | Price=₹${customerProduct.price}`)
    if (customerProduct.price !== 1200 || customerProduct.title !== 'Silk Crimson Rose Frame') {
      throw new Error('FAIL: Customer API did not return updated product price!')
    }
    console.log('🟢 PASS: Product update persisted to MongoDB and reflected on Customer API!')

    // =========================================================================
    // TEST 2: PRODUCT ARCHIVE
    // =========================================================================
    console.log('\n--- 2. Testing Product Archive ---')
    const archiveRes = await fetch(`${baseUrl}/products/${testProduct._id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        isArchived: true,
      }),
    })
    console.log(`Admin PUT /products/:id (Archive) Status: ${archiveRes.status}`)

    const mongoArchived = await Product.findById(testProduct._id)
    if (!mongoArchived.isArchived) {
      throw new Error('FAIL: MongoDB did not persist isArchived=true!')
    }

    // Customer GET single product should return 404
    const customerArchivedGetRes = await fetch(`${baseUrl}/products/${testProduct._id}`)
    console.log(`Customer GET /products/:id for Archived Product Status: ${customerArchivedGetRes.status}`)
    if (customerArchivedGetRes.status !== 404) {
      throw new Error(`FAIL: Customer should receive 404 for archived product, got ${customerArchivedGetRes.status}`)
    }

    // Admin GET /products?includeArchived=true should include it
    const adminProductsRes = await fetch(`${baseUrl}/products?includeArchived=true`, { headers: adminHeaders })
    const adminProducts = await adminProductsRes.json()
    const foundInAdmin = adminProducts.find((p) => String(p._id) === String(testProduct._id))
    if (!foundInAdmin) {
      throw new Error('FAIL: Admin catalog should include archived products!')
    }
    console.log('🟢 PASS: Product archive persisted to MongoDB and properly filtered on Customer Storefront!')

    // =========================================================================
    // TEST 3: COLLECTION UPDATE
    // =========================================================================
    console.log('\n--- 3. Testing Collection Create & Update ---')
    const testCol = await Collection.create({
      title: 'Spring Blooms',
      slug: `spring-${Date.now()}`,
      description: 'Fresh spring flowers',
      blurb: 'Fresh spring flowers',
    })

    const updateColRes = await fetch(`${baseUrl}/collections/${testCol._id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Velvet Luxe Botanicals',
        description: 'Handcrafted premium velvet collection',
        blurb: 'Handcrafted premium velvet collection',
      }),
    })
    console.log(`Admin PUT /collections/:id Status: ${updateColRes.status}`)

    const mongoColAfter = await Collection.findById(testCol._id)
    if (mongoColAfter.title !== 'Velvet Luxe Botanicals') {
      throw new Error('FAIL: MongoDB did not persist collection update!')
    }

    const customerColRes = await fetch(`${baseUrl}/collections`)
    const customerCols = await customerColRes.json()
    const foundCol = customerCols.find((c) => String(c._id) === String(testCol._id))
    if (!foundCol || foundCol.title !== 'Velvet Luxe Botanicals') {
      throw new Error('FAIL: Customer API did not return updated collection!')
    }
    console.log('🟢 PASS: Collection update persisted to MongoDB and reflected on Customer API!')

    // =========================================================================
    // TEST 4: COUPON CREATE & UPDATE
    // =========================================================================
    console.log('\n--- 4. Testing Coupon Management ---')
    const testCouponCode = `TEST${Date.now().toString().slice(-4)}`
    const createCouponRes = await fetch(`${baseUrl}/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: testCouponCode,
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 1000,
        maxDiscountCap: 500,
        isActive: true,
      }),
    })
    console.log(`Admin POST /coupons Status: ${createCouponRes.status}`)

    const mongoCoupon = await Coupon.findOne({ code: testCouponCode })
    if (!mongoCoupon || mongoCoupon.discountValue !== 20) {
      throw new Error('FAIL: MongoDB did not persist coupon creation!')
    }

    // Toggle coupon
    const toggleCouponRes = await fetch(`${baseUrl}/coupons/${mongoCoupon._id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ isActive: false }),
    })
    console.log(`Admin PUT /coupons/:id Status: ${toggleCouponRes.status}`)

    const mongoCouponAfter = await Coupon.findById(mongoCoupon._id)
    if (mongoCouponAfter.isActive !== false) {
      throw new Error('FAIL: MongoDB did not persist coupon isActive update!')
    }
    console.log('🟢 PASS: Coupon create and update persisted to MongoDB!')

    // =========================================================================
    // TEST 5: SETTINGS UPDATE (Marquee & Shipping)
    // =========================================================================
    console.log('\n--- 5. Testing Studio Settings Update ---')
    const updatedMarquee = `SPECIAL FESTIVE OFFER • 25% OFF • ${Date.now()}`
    const updateSettingsRes = await fetch(`${baseUrl}/settings`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        marqueeText: updatedMarquee,
        standardShippingFee: 150,
        freeShippingThreshold: 3000,
      }),
    })
    console.log(`Admin POST /settings Status: ${updateSettingsRes.status}`)

    const mongoSetting = await Setting.findOne({ key: 'main_studio_settings' })
    if (
      mongoSetting.marqueeText !== updatedMarquee ||
      mongoSetting.standardShippingFee !== 150 ||
      mongoSetting.freeShippingThreshold !== 3000
    ) {
      throw new Error('FAIL: MongoDB did not persist studio settings!')
    }

    const publicSettingsRes = await fetch(`${baseUrl}/settings`)
    const publicSettings = await publicSettingsRes.json()
    if (
      publicSettings.marqueeText !== updatedMarquee ||
      publicSettings.standardShippingFee !== 150 ||
      publicSettings.freeShippingThreshold !== 3000
    ) {
      throw new Error('FAIL: Public settings API did not return updated settings!')
    }
    console.log('🟢 PASS: Studio settings update persisted to MongoDB and reflected on Public API!')

    // Cleanup test documents
    await Product.deleteOne({ _id: testProduct._id })
    await Collection.deleteOne({ _id: testCol._id })
    await Coupon.deleteOne({ code: testCouponCode })

    console.log('\n=====================================================================')
    console.log('🎉 ALL 5 ADMIN CRUD PERSISTENCE & STOREFRONT INTEGRATION TESTS PASSED!')
    console.log('=====================================================================\n')
  } finally {
    server.close()
    await mongoose.disconnect()
  }
}

runEndToEndVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err)
  process.exit(1)
})
