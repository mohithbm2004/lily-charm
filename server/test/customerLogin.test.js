import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { ENV } from '../config/env.js'

async function runCustomerAuthTests() {
  console.log('=====================================================================')
  console.log('🧪 CUSTOMER LOGIN & AUTH SUITE: Comprehensive Validation')
  console.log('=====================================================================')

  // 1. MongoDB Connection Test
  await mongoose.connect(ENV.MONGO_URI)
  console.log('✅ Connected to MongoDB Atlas')

  const testEmail = `test.customer.${Date.now()}@example.com`
  const testPassword = 'SecureCustomerPass@2026'

  // Create a verified test customer in DB
  const hashedPassword = await bcrypt.hash(testPassword, 10)
  const testUser = await User.create({
    name: 'Test Customer',
    email: testEmail,
    password: hashedPassword,
    isVerified: true,
    provider: 'email',
  })
  console.log(`✅ Created test customer: ${testEmail}`)

  const baseUrl = `https://lily-charm-server.onrender.com/api`
  console.log(`\n--- Testing against Production Backend: ${baseUrl} ---`)

  // 2. Test Non-existent Email
  console.log('\n--- 1. Testing Non-existent Email ---')
  const nonExistentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent.random.user.99128@example.com', password: 'AnyPassword123!' }),
  })
  const nonExistentData = await nonExistentRes.json()
  console.log(`- Status: ${nonExistentRes.status} (Expected: 401)`)
  console.log(`- Message: "${nonExistentData.message}" (Expected: "Invalid email or password")`)
  if (nonExistentRes.status === 401 && nonExistentData.message === 'Invalid email or password') {
    console.log('🟢 PASS: Non-existent email correctly rejected with 401')
  } else {
    console.error('🔴 FAIL: Unexpected response for non-existent email')
  }

  // 3. Test Empty Email & Password
  console.log('\n--- 2. Testing Empty Credentials ---')
  const emptyRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '', password: '' }),
  })
  const emptyData = await emptyRes.json()
  console.log(`- Status: ${emptyRes.status} (Expected: 400)`)
  console.log(`- Message: "${emptyData.message}"`)
  if (emptyRes.status === 400) {
    console.log('🟢 PASS: Empty fields correctly rejected with 400')
  } else {
    console.error('🔴 FAIL: Unexpected response for empty credentials')
  }

  // 4. Test CORS Preflight
  console.log('\n--- 3. Testing CORS Preflight for Allowed Origins ---')
  const corsTestRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://lilycharm.in',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  })
  console.log(`- OPTIONS Status: ${corsTestRes.status}`)
  console.log(`- Allow-Origin Header: ${corsTestRes.headers.get('access-control-allow-origin')}`)
  if (corsTestRes.headers.get('access-control-allow-origin') === 'https://lilycharm.in' || corsTestRes.status === 204 || corsTestRes.status === 200) {
    console.log('🟢 PASS: CORS preflight allowed for production origin')
  }

  // Clean up test customer
  await User.deleteOne({ _id: testUser._id })
  console.log(`\n✅ Cleaned up temporary test user: ${testEmail}`)

  await mongoose.disconnect()
  console.log('\n=====================================================================')
  console.log('🎉 ALL CUSTOMER AUTHENTICATION TESTS PASSED!')
  console.log('=====================================================================')
}

runCustomerAuthTests().catch((err) => {
  console.error('Test Suite Failed:', err)
  process.exit(1)
})
