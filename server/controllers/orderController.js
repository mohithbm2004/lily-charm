import crypto from 'crypto'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import razorpay from '../config/razorpay.js'

// POST /api/orders — Create an order and save to MongoDB
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
    const shipping = reqShipping != null ? reqShipping : (subtotal > 8000 ? 0 : 250)
    const total = reqTotal || (subtotal + shipping)

    const order = await Order.create({
      user: req.user?._id || null,
      items: orderItems,
      shippingAddress,
      subtotal,
      shipping,
      total,
      paymentMethod: paymentMethod || 'Razorpay Prepaid',
      status: 'paid',
    })

    // Try generating Razorpay order if keys are set
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(total * 100),
          currency: 'INR',
          receipt: order._id.toString(),
        })
        order.razorpayOrderId = razorpayOrder.id
        await order.save()
      }
    } catch (e) {
      console.warn('Razorpay order creation skipped/errored:', e.message)
    }

    res.status(201).json(order)
  } catch (err) {
    next(err)
  }
}

// POST /api/orders/verify — Verify payment signature
export async function verifyPayment(req, res, next) {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (process.env.RAZORPAY_KEY_SECRET) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expected !== razorpay_signature) {
        return res.status(400).json({ message: 'Payment verification failed' })
      }
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
      { new: true }
    )
    res.json(order)
  } catch (err) {
    next(err)
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
