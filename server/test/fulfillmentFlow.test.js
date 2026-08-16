import 'dotenv/config'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import User from '../models/User.js'
import { ENV } from '../config/env.js'
import { updateOrderStatus, cancelOrder } from '../controllers/orderController.js'

async function runFulfillmentLifecycleTests() {
  console.log('=====================================================================')
  console.log('🧪 ORDER FULFILLMENT LIFECYCLE & TRANSITION VALIDATION TEST')
  console.log('=====================================================================')

  await mongoose.connect(ENV.MONGO_URI)
  console.log('✅ Connected to MongoDB Atlas')

  const testUser = await User.create({
    name: 'Fulfillment Tester',
    email: `tester.${Date.now()}@example.com`,
    password: 'MockHashedPassword',
  })

  // Helper mock request and response
  const mockReq = (admin = true, params = {}, body = {}) => ({
    admin: admin ? { id: 'admin_test' } : null,
    user: { role: admin ? 'admin' : 'customer', _id: testUser._id },
    params,
    body,
  })

  const mockRes = () => {
    const res = {}
    res.statusCode = 200
    res.status = (code) => {
      res.statusCode = code
      return res
    }
    res.json = (data) => {
      res.data = data
      return res
    }
    return res
  }

  // TEST 1: PENDING PAYMENT REJECTS FULFILLMENT MODIFICATIONS
  console.log('\n--- 1. Testing Pending Payment Order (Fulfillment Guard) ---')
  const pendingOrder = await Order.create({
    user: testUser._id,
    orderNumber: `TEST-PENDING-${Date.now()}`,
    items: [{ title: 'Rose Velvet', price: 500, qty: 1 }],
    subtotal: 500,
    grandTotal: 500,
    paymentStatus: 'Pending',
    status: 'Pending Payment',
    statusHistory: [{ status: 'Pending Payment', note: 'Awaiting payment' }],
  })

  const req1 = mockReq(true, { id: pendingOrder._id.toString() }, { status: 'Delivered' })
  const res1 = mockRes()
  await updateOrderStatus(req1, res1, (err) => { throw err })

  console.log(`- Response Code: ${res1.statusCode} (Expected: 400)`)
  console.log(`- Message: "${res1.data?.message}"`)
  if (res1.statusCode === 400 && res1.data.message.includes('Pending Payment')) {
    console.log('🟢 PASS: Pending payment order blocked from fulfillment modification.')
  } else {
    throw new Error('FAIL: Pending payment order was not blocked!')
  }

  // TEST 2: CANCELLING PENDING PAYMENT ORDER (NO REFUND)
  console.log('\n--- 2. Testing Cancellation of Pending Payment Order ---')
  const req2 = mockReq(true, { id: pendingOrder._id.toString() }, { reason: 'User abandoned cart', isAdmin: true })
  const res2 = mockRes()
  await cancelOrder(req2, res2, (err) => { throw err })

  const updatedPending = await Order.findById(pendingOrder._id)
  console.log(`- Status: "${updatedPending.status}" (Expected: "Cancelled")`)
  console.log(`- Refund Status: "${updatedPending.refundStatus}" (Expected: "None")`)
  console.log(`- Refund Amount: ₹${updatedPending.refundAmount} (Expected: 0)`)
  if (updatedPending.status === 'Cancelled' && updatedPending.refundStatus === 'None' && updatedPending.refundAmount === 0) {
    console.log('🟢 PASS: Pending payment order cancelled without creating refund record.')
  } else {
    throw new Error('FAIL: Pending payment cancellation created invalid refund state!')
  }

  // TEST 3: CONTROLLED TRANSITIONS ON CONFIRMED ORDER
  console.log('\n--- 3. Testing Controlled Fulfillment Transitions on Confirmed Order ---')
  const confirmedOrder = await Order.create({
    user: testUser._id,
    orderNumber: `TEST-CONFIRMED-${Date.now()}`,
    items: [{ title: 'Crimson Rose', price: 1000, qty: 1 }],
    subtotal: 1000,
    grandTotal: 1000,
    paymentStatus: 'Paid',
    status: 'Order Confirmed',
    razorpayPaymentId: 'pay_MockTestId123',
    statusHistory: [{ status: 'Order Confirmed', note: 'Payment verified' }],
  })

  // 3a. Invalid jump: Order Confirmed -> Delivered (Should be rejected with 400)
  const reqJump = mockReq(true, { id: confirmedOrder._id.toString() }, { status: 'Delivered' })
  const resJump = mockRes()
  await updateOrderStatus(reqJump, resJump, (err) => { throw err })
  console.log(`- Invalid jump response: ${resJump.statusCode} (Expected: 400)`)
  if (resJump.statusCode === 400) {
    console.log('🟢 PASS: Invalid jump (Order Confirmed -> Delivered) rejected.')
  } else {
    throw new Error('FAIL: Arbitrary jump was not rejected!')
  }

  // 3b. Step-by-step valid transitions
  const steps = [
    'Handcrafting in Studio',
    'Studio Processing',
    'Packed & Sealed',
    'Packed & Dispatched',
    'Shipped',
    'Out For Delivery',
    'Delivered',
  ]

  for (const step of steps) {
    const reqStep = mockReq(true, { id: confirmedOrder._id.toString() }, { status: step })
    const resStep = mockRes()
    await updateOrderStatus(reqStep, resStep, (err) => { throw err })
    if (resStep.statusCode === 200 && resStep.data.status === step) {
      console.log(`🟢 PASS: Transitioned to -> "${step}"`)
    } else {
      throw new Error(`FAIL: Valid transition to ${step} failed with ${resStep.statusCode}`)
    }
  }

  // 3c. Transition after Delivered (Should be rejected with 400)
  const reqPostDelivered = mockReq(true, { id: confirmedOrder._id.toString() }, { status: 'Handcrafting in Studio' })
  const resPostDelivered = mockRes()
  await updateOrderStatus(reqPostDelivered, resPostDelivered, (err) => { throw err })
  console.log(`- Post-Delivered transition response: ${resPostDelivered.statusCode} (Expected: 400)`)
  if (resPostDelivered.statusCode === 400) {
    console.log('🟢 PASS: Transition after delivery blocked.')
  } else {
    throw new Error('FAIL: Transition after Delivered was allowed!')
  }

  // 3d. Check Status History count
  const finalOrder = await Order.findById(confirmedOrder._id)
  console.log(`- Total Status History Entries: ${finalOrder.statusHistory.length} (Expected: 8)`)
  if (finalOrder.statusHistory.length === 8) {
    console.log('🟢 PASS: Exactly 8 status history entries recorded without duplicates.')
  } else {
    throw new Error(`FAIL: Expected 8 history entries but found ${finalOrder.statusHistory.length}`)
  }

  // Clean up
  await Order.deleteMany({ user: testUser._id })
  await User.deleteOne({ _id: testUser._id })
  await mongoose.disconnect()

  console.log('\n=====================================================================')
  console.log('🎉 ALL ORDER FULFILLMENT LIFECYCLE TESTS PASSED!')
  console.log('=====================================================================')
}

runFulfillmentLifecycleTests().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
