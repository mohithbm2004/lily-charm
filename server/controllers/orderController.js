import crypto from 'crypto'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import razorpay from '../config/razorpay.js'

// POST /api/create-order or /api/orders/create-razorpay-order
export async function createRazorpayOrder(req, res, next) {
  try {
    const { amount, currency = 'INR', receipt } = req.body

    const parsedAmount = Number(amount)
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        message: 'Invalid amount. Minimum amount must be at least 100 paise (₹1).',
      })
    }

    const options = {
      amount: Math.round(parsedAmount),
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    }

    const razorpayOrder = await razorpay.orders.create(options)

    res.status(200).json({
      id: razorpayOrder.id,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      status: razorpayOrder.status,
    })
  } catch (err) {
    console.error('[RAZORPAY CREATE ORDER ERROR]:', err)
    res.status(500).json({
      message: 'Failed to create Razorpay order',
      error: err.message || err,
    })
  }
}

// POST /api/orders — Create full MongoDB Order & Razorpay Order
export async function createOrder(req, res, next) {
  try {
    const { items, shippingAddress, subtotal: reqSubtotal, shipping: reqShipping, total: reqTotal, paymentMethod } = req.body
    if (!items?.length) return res.status(400).json({ message: 'Cart is empty' })

    const orderItems = items.map((i) => ({
      product: i.productId || i.id || i._id || null,
      title: i.title || 'Botanical Artwork',
      price: Number(i.price) || 0,
      qty: Number(i.qty) || 1,
      image: i.image || (Array.isArray(i.images) ? i.images[0] : '') || '',
    }))

    const calcSubtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const subtotal = reqSubtotal || calcSubtotal
    const shipping = reqShipping != null ? reqShipping : 0 // Free shipping for testing
    const total = reqTotal || (subtotal + shipping)

    const amountInPaise = Math.round(total * 100)
    if (amountInPaise < 100) {
      return res.status(400).json({ message: 'Order amount must be at least ₹1 (100 paise)' })
    }

    const order = await Order.create({
      user: req.user?._id || null,
      items: orderItems,
      shippingAddress,
      subtotal,
      shipping,
      total,
      paymentMethod: paymentMethod || 'Razorpay Prepaid',
      status: 'pending',
    })

    let razorpayOrderId = null
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order._id.toString(),
      })
      razorpayOrderId = razorpayOrder.id
      order.razorpayOrderId = razorpayOrder.id
      await order.save()
    } catch (e) {
      console.warn('Razorpay order creation error:', e.message)
    }

    res.status(201).json({
      ...order.toObject(),
      razorpayOrderId,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TLMD4P4BGZ6Qq8',
    })
  } catch (err) {
    next(err)
  }
}

// STEP 3: POST /api/verify-payment or /api/orders/verify
export async function verifyPayment(req, res, next) {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
      })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay secret key is not configured on server.',
      })
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    let isMatch = false
    try {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      )
    } catch {
      isMatch = false
    }

    if (!isMatch) {
      console.error('[RAZORPAY SIGNATURE MISMATCH]:', { generatedSignature, razorpay_signature })
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      })
    }

    let updatedOrder = null
    if (orderId) {
      updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          status: 'paid',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
        { new: true }
      )
    } else if (razorpay_order_id) {
      updatedOrder = await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          status: 'paid',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
        { new: true }
      )
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order: updatedOrder,
      razorpay_payment_id,
      razorpay_order_id,
    })
  } catch (err) {
    console.error('[RAZORPAY VERIFY PAYMENT ERROR]:', err)
    return res.status(500).json({
      success: false,
      message: 'Server error during payment verification.',
      error: err.message,
    })
  }
}

export async function myOrders(req, res, next) {
  try {
    const userId = req.user?._id
    if (!userId) return res.json([])
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

// GET /api/orders — List all orders for Admin
export async function listAllOrders(req, res, next) {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/orders/:id/status — Update order status
export async function updateOrderStatus(req, res, next) {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    )
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/orders/:id — Delete order
export async function deleteOrder(req, res, next) {
  try {
    const order = await Order.findByIdAndDelete(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ message: 'Order deleted successfully', deleted: order })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/orders — Delete ALL orders
export async function deleteAllOrders(req, res, next) {
  try {
    await Order.deleteMany({})
    res.json({ message: 'All orders deleted successfully' })
  } catch (err) {
    next(err)
  }
}
