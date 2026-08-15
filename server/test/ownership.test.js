import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import test from 'node:test'
import express from 'express'
import jwt from 'jsonwebtoken'

import orderRoutes from '../routes/orderRoutes.js'
import customRequestRoutes from '../routes/customRequestRoutes.js'
import { handleRazorpayWebhook } from '../controllers/paymentController.js'
import Order from '../models/Order.js'
import CustomRequest from '../models/CustomRequest.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import Cart from '../models/Cart.js'
import Setting from '../models/Setting.js'
import Product from '../models/Product.js'
import razorpay from '../config/razorpay.js'

const USER_A_ID = '64b000000000000000000001'
const USER_B_ID = '64b000000000000000000002'
const ORDER_ID = '64b000000000000000000101'
const CUSTOM_REQUEST_ID = '64b000000000000000000201'

function makeDocument(data) {
  return {
    ...data,
    statusHistory: data.statusHistory || [],
    async save() {
      return this
    },
    toObject() {
      const { save, toObject, ...plain } = this
      return plain
    },
  }
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, expected]) => String(document[key]) === String(expected))
}

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

async function startServer(app) {
  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  return {
    request(path, options = {}) {
      return fetch(`http://127.0.0.1:${port}${path}`, options)
    },
    async close() {
      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
    },
  }
}

test('ownership is always based on the authenticated user ID', async (t) => {
  const originalJwtSecret = process.env.JWT_SECRET
  const originalRazorpaySecret = process.env.RAZORPAY_KEY_SECRET
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  process.env.JWT_SECRET = 'ownership-test-jwt-secret'
  process.env.RAZORPAY_KEY_SECRET = 'ownership-test-razorpay-secret'
  process.env.RAZORPAY_WEBHOOK_SECRET = 'ownership-test-webhook-secret'

  const users = new Map([
    [USER_A_ID, { _id: USER_A_ID, name: 'User A', email: 'xyz@gmail.com', role: 'customer' }],
    [USER_B_ID, { _id: USER_B_ID, name: 'User B', email: 'abc@gmail.com', role: 'customer' }],
  ])
  const orders = []
  const customRequests = []
  const originals = {
    cartFindOneAndUpdate: Cart.findOneAndUpdate,
    customRequestCreate: CustomRequest.create,
    customRequestFind: CustomRequest.find,
    customRequestFindById: CustomRequest.findById,
    customRequestFindOne: CustomRequest.findOne,
    orderCreate: Order.create,
    orderFind: Order.find,
    orderFindById: Order.findById,
    orderFindOne: Order.findOne,
    orderFindOneAndUpdate: Order.findOneAndUpdate,
    paymentCreate: Payment.create,
    paymentFindOneAndUpdate: Payment.findOneAndUpdate,
    productFindById: Product.findById,
    productFindOne: Product.findOne,
    razorpayOrdersCreate: razorpay.orders.create,
    settingFindOne: Setting.findOne,
    userFindById: User.findById,
  }

  t.after(async () => {
    Object.assign(Cart, { findOneAndUpdate: originals.cartFindOneAndUpdate })
    Object.assign(CustomRequest, {
      create: originals.customRequestCreate,
      find: originals.customRequestFind,
      findById: originals.customRequestFindById,
      findOne: originals.customRequestFindOne,
    })
    Object.assign(Order, {
      create: originals.orderCreate,
      find: originals.orderFind,
      findById: originals.orderFindById,
      findOne: originals.orderFindOne,
      findOneAndUpdate: originals.orderFindOneAndUpdate,
    })
    Object.assign(Payment, {
      create: originals.paymentCreate,
      findOneAndUpdate: originals.paymentFindOneAndUpdate,
    })
    Object.assign(Product, {
      findById: originals.productFindById,
      findOne: originals.productFindOne,
    })
    Object.assign(Setting, { findOne: originals.settingFindOne })
    Object.assign(User, { findById: originals.userFindById })
    razorpay.orders.create = originals.razorpayOrdersCreate
    process.env.JWT_SECRET = originalJwtSecret
    process.env.RAZORPAY_KEY_SECRET = originalRazorpaySecret
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret
  })

  Product.findById = async (id) => ({
    _id: id,
    title: 'Pressed Flower Frame',
    price: 500,
    stock: 10,
  })
  Product.findOne = async () => ({
    _id: '64b000000000000000000301',
    title: 'Pressed Flower Frame',
    price: 500,
    stock: 10,
  })

  User.findById = (id) => {
    const user = users.get(String(id)) || null
    if (user) user.select = async () => user
    return user
  }
  Setting.findOne = async () => ({ shippingFeeEnabled: false, standardShippingFee: 0, freeShippingThreshold: 0 })
  Cart.findOneAndUpdate = async () => null
  Payment.create = async () => null
  Payment.findOneAndUpdate = async () => null

  Order.create = async (data) => {
    const order = makeDocument({ _id: orders.length ? '64b000000000000000000102' : ORDER_ID, ...data })
    orders.push(order)
    return order
  }
  Order.find = (filter) => ({
    sort: async () => orders.filter((order) => matches(order, filter)),
  })
  Order.findById = async (id) => orders.find((order) => String(order._id) === String(id)) || null
  Order.findOne = async (filter) => orders.find((order) => matches(order, filter)) || null
  Order.findOneAndUpdate = async (filter, update) => {
    const order = orders.find((candidate) => matches(candidate, filter))
    if (!order) return null
    Object.assign(order, Object.fromEntries(Object.entries(update).filter(([key]) => key !== '$push')))
    if (update.$push?.statusHistory) order.statusHistory.push(update.$push.statusHistory)
    return order
  }

  CustomRequest.create = async (data) => {
    const request = makeDocument({ _id: CUSTOM_REQUEST_ID, ...data })
    customRequests.push(request)
    return request
  }
  CustomRequest.find = (filter) => ({
    sort: async () => customRequests.filter((request) => matches(request, filter)),
  })
  CustomRequest.findById = async (id) => customRequests.find((request) => String(request._id) === String(id)) || null
  CustomRequest.findOne = async (filter) => customRequests.find((request) => matches(request, filter)) || null

  let razorpayOrderNumber = 0
  razorpay.orders.create = async () => ({
    id: razorpayOrderNumber++ === 0 ? 'order_standard_a' : 'order_custom_a',
    amount: 50000,
    currency: 'INR',
    receipt: 'test-receipt',
    status: 'created',
  })

  const app = express()
  app.use(express.json())
  app.use('/orders', orderRoutes)
  app.use('/custom-requests', customRequestRoutes)
  const server = await startServer(app)
  t.after(() => server.close())

  const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET)
  const asUser = (id, options = {}) => ({
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenFor(id)}`,
      ...(options.headers || {}),
    },
  })
  const paymentSignature = (razorpayOrderId, razorpayPaymentId) =>
    crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

  await t.test('1. User A owns an order even when shipping and billing email are User B', async () => {
    const createResponse = await server.request(
      '/orders',
      asUser(USER_A_ID, {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: '64b000000000000000000301', title: 'Pressed Flower Frame', price: 500, qty: 1 }],
          shippingAddress: { name: 'User A', email: 'abc@gmail.com', address: 'A Street', city: 'BLR', pincode: '560001' },
          billingAddress: { name: 'User A', email: 'abc@gmail.com', address: 'A Street', city: 'BLR', pincode: '560001' },
          termsAccepted: true,
        }),
      })
    )
    assert.equal(createResponse.status, 201)
    assert.equal(orders[0].user, USER_A_ID)
    assert.equal(orders[0].shippingAddress.email, 'abc@gmail.com')
    assert.equal(orders[0].billingAddress.email, 'abc@gmail.com')

    const aOrders = await server.request('/orders/mine', asUser(USER_A_ID))
    const bOrders = await server.request('/orders/mine', asUser(USER_B_ID))
    assert.equal((await aOrders.json()).length, 1)
    assert.equal((await bOrders.json()).length, 0)
  })

  await t.test('2. User B cannot fetch User A order by ID', async () => {
    const response = await server.request(`/orders/${ORDER_ID}`, asUser(USER_B_ID))
    assert.equal(response.status, 403)
  })

  await t.test('3. User B cannot cancel User A order', async () => {
    const response = await server.request(
      `/orders/${ORDER_ID}/cancel`,
      asUser(USER_B_ID, { method: 'PATCH', body: JSON.stringify({ reason: 'Not my order' }) })
    )
    assert.equal(response.status, 403)
  })

  await t.test('4. User B cannot request or process a refund for User A order', async () => {
    const requestResponse = await server.request(
      `/orders/${ORDER_ID}/refund-request`,
      asUser(USER_B_ID, { method: 'POST', body: JSON.stringify({ reason: 'Not my order' }) })
    )
    assert.equal(requestResponse.status, 403)

    const processResponse = await server.request(
      `/orders/${ORDER_ID}/process-refund`,
      asUser(USER_B_ID, { method: 'POST', body: JSON.stringify({ action: 'approve' }) })
    )
    assert.equal(processResponse.status, 401)
  })

  await t.test('5. User A custom request and conversion remain owned by User A', async () => {
    const createResponse = await server.request(
      '/custom-requests',
      asUser(USER_A_ID, {
        method: 'POST',
        body: JSON.stringify({
          name: 'User A',
          email: 'abc@gmail.com',
          address: 'A Street',
          city: 'Bengaluru',
          pincode: '560001',
        }),
      })
    )
    assert.equal(createResponse.status, 201)
    assert.equal(customRequests[0].user, USER_A_ID)
    assert.equal(customRequests[0].email, 'xyz@gmail.com')

    customRequests[0].status = 'Quoted'
    customRequests[0].quotedPrice = 500
    const quotePaymentResponse = await server.request(
      `/custom-requests/${CUSTOM_REQUEST_ID}/create-razorpay-order`,
      asUser(USER_A_ID, { method: 'POST' })
    )
    assert.equal(quotePaymentResponse.status, 200)
    const quotePayment = await quotePaymentResponse.json()
    assert.equal(customRequests[0].razorpayOrderId, quotePayment.id)

    const conversionResponse = await server.request(
      `/custom-requests/${CUSTOM_REQUEST_ID}/accept`,
      asUser(USER_A_ID, {
        method: 'POST',
        body: JSON.stringify({
          razorpayOrderId: quotePayment.id,
          razorpayPaymentId: 'pay_custom_a',
          razorpaySignature: paymentSignature(quotePayment.id, 'pay_custom_a'),
          shippingAddress: { name: 'User A', email: 'abc@gmail.com', address: 'A Street', city: 'Bengaluru' },
        }),
      })
    )
    assert.equal(conversionResponse.status, 200)
    assert.equal(orders[1].user, USER_A_ID)
    assert.equal(orders[1].shippingAddress.email, 'abc@gmail.com')

    const aRequests = await server.request('/custom-requests/mine', asUser(USER_A_ID))
    const bRequests = await server.request('/custom-requests/mine', asUser(USER_B_ID))
    assert.equal((await aRequests.json()).length, 1)
    assert.equal((await bRequests.json()).length, 0)
  })

  await t.test('6. User B cannot access or convert User A custom request', async () => {
    const detailResponse = await server.request(
      `/custom-requests/${CUSTOM_REQUEST_ID}/public-summary`,
      asUser(USER_B_ID)
    )
    assert.equal(detailResponse.status, 403)

    const paymentResponse = await server.request(
      `/custom-requests/${CUSTOM_REQUEST_ID}/create-razorpay-order`,
      asUser(USER_B_ID, { method: 'POST' })
    )
    assert.equal(paymentResponse.status, 403)

    const conversionResponse = await server.request(
      `/custom-requests/${CUSTOM_REQUEST_ID}/accept`,
      asUser(USER_B_ID, {
        method: 'POST',
        body: JSON.stringify({
          razorpayOrderId: customRequests[0].razorpayOrderId,
          razorpayPaymentId: 'pay_custom_b',
          razorpaySignature: paymentSignature(customRequests[0].razorpayOrderId, 'pay_custom_b'),
        }),
      })
    )
    assert.equal(conversionResponse.status, 403)
  })

  await t.test('payment verification and webhook lookup cannot select User A order for User B', async () => {
    const paymentResponse = await server.request(
      '/orders/verify',
      asUser(USER_B_ID, {
        method: 'POST',
        body: JSON.stringify({
          orderId: ORDER_ID,
          razorpay_order_id: orders[0].razorpayOrderId,
          razorpay_payment_id: 'pay_other_user',
          razorpay_signature: paymentSignature(orders[0].razorpayOrderId, 'pay_other_user'),
        }),
      })
    )
    assert.equal(paymentResponse.status, 404)
    assert.equal(orders[0].paymentStatus, 'Pending')

    const webhookEvent = {
      event: 'order.paid',
      payload: {
        payment: {
          entity: {
            id: 'pay_unrelated',
            order_id: 'order_unrelated',
            currency: 'INR',
            notes: { orderNumber: orders[0].orderNumber },
          },
        },
      },
    }
    const rawWebhook = Buffer.from(JSON.stringify(webhookEvent))
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawWebhook)
      .digest('hex')
    const response = makeResponse()
    await handleRazorpayWebhook(
      { headers: { 'x-razorpay-signature': signature }, body: rawWebhook },
      response,
      (err) => {
        throw err
      }
    )

    assert.equal(response.statusCode, 200)
    assert.equal(orders[0].paymentStatus, 'Pending')
  })
})
