import crypto from 'crypto'
import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import Product from '../models/Product.js'
import razorpay from '../config/razorpay.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendAdminNewOrderNotification } from '../utils/emailService.js'

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
    const {
      items,
      shippingAddress,
      billingAddress,
      subtotal: reqSubtotal,
      discountAmount: reqDiscount = 0,
      couponCode = '',
      shippingCharge: reqShipping = 0,
      tax: reqTax = 0,
      grandTotal: reqGrandTotal,
      paymentMethod = 'Razorpay Prepaid',
    } = req.body

    if (!items?.length) return res.status(400).json({ message: 'Cart is empty' })

    const orderItems = items.map((i) => ({
      product: i.productId || i.id || i._id || null,
      title: i.title || 'Botanical Artwork',
      price: Number(i.price) || 0,
      qty: Number(i.qty) || 1,
      image: i.image || (Array.isArray(i.images) ? i.images[0] : '') || '',
      specimen: i.specimen || 'Specimen',
    }))

    const calcSubtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const subtotal = reqSubtotal || calcSubtotal
    const discountAmount = Number(reqDiscount) || 0
    const shippingCharge = Number(reqShipping) || 0
    const tax = Number(reqTax) || 0
    const grandTotal = reqGrandTotal || Math.max(0, subtotal - discountAmount + shippingCharge + tax)

    const amountInPaise = Math.round(grandTotal * 100)
    if (amountInPaise < 100) {
      return res.status(400).json({ message: 'Order grand total must be at least ₹1' })
    }

    const orderNumber = `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`

    const order = await Order.create({
      user: req.user?._id || null,
      orderNumber,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      discountAmount,
      couponCode,
      tax,
      shippingCharge,
      grandTotal,
      paymentMethod,
      paymentStatus: 'Pending',
      status: 'Pending Payment',
      statusHistory: [{ status: 'Pending Payment', note: 'Order created, awaiting Razorpay payment verification.' }],
    })

    let razorpayOrderId = null
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
      })
      razorpayOrderId = razorpayOrder.id
      order.razorpayOrderId = razorpayOrder.id
      await order.save()

      // Record pending ledger
      await Payment.create({
        order: order._id,
        user: req.user?._id || null,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: grandTotal,
        currency: 'INR',
        paymentMethod,
        status: 'pending',
      })
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

// POST /api/payment/verify or /api/orders/verify
export async function verifyPayment(req, res, next) {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment verification credentials.',
      })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay secret key is missing in environment.',
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
      console.error('[RAZORPAY MISMATCH]:', { generatedSignature, razorpay_signature })
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, {
          status: 'Payment Failed',
          paymentStatus: 'Failed',
        })
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature.',
      })
    }

    let updatedOrder = null
    const updateData = {
      status: 'Confirmed',
      paymentStatus: 'Paid',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      $push: { statusHistory: { status: 'Confirmed', note: 'Payment verified successfully via Razorpay.' } },
    }

    if (orderId) {
      updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true })
    } else {
      updatedOrder = await Order.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, updateData, { new: true })
    }

    // Update Payment Audit Record
    if (updatedOrder) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: 'captured',
        }
      )

      // Send Confirmation Emails asynchronously
      sendOrderConfirmationEmail(updatedOrder)
      sendAdminNewOrderNotification(updatedOrder)
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed.',
      order: updatedOrder,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/my-orders — Customer order history
export async function getMyOrders(req, res, next) {
  try {
    const userId = req.user?._id
    if (!userId) {
      // If customer is unauthenticated, allow searching by email query or return empty
      const email = req.query.email
      if (email) {
        const orders = await Order.find({ 'shippingAddress.email': email.toLowerCase().trim() }).sort({ createdAt: -1 })
        return res.json(orders)
      }
      return res.json([])
    }
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/:id — Single order details
export async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/:id/invoice — Download PDF Invoice
export async function downloadInvoice(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    generateInvoicePDF(order, res)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/orders/:id/cancel — Customer or Admin Order Cancellation
export async function cancelOrder(req, res, next) {
  try {
    const { reason = 'Cancelled by customer' } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (['Shipped', 'Out For Delivery', 'Delivered'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order in '${order.status}' status.` })
    }

    order.status = 'Cancelled'
    order.notes = `Cancellation Reason: ${reason}`
    order.statusHistory.push({ status: 'Cancelled', note: reason })
    await order.save()

    sendOrderStatusEmail(order, 'Cancelled', reason)
    res.json({ success: true, message: 'Order cancelled successfully', order })
  } catch (err) {
    next(err)
  }
}

// POST /api/orders/:id/refund-request — Customer Refund Request
export async function requestRefund(req, res, next) {
  try {
    const { reason, amount } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    order.status = 'Refund Requested'
    order.refundReason = reason || 'Customer requested refund'
    order.refundAmount = Number(amount) || order.grandTotal || order.total
    order.refundStatus = 'Pending Approval'
    order.statusHistory.push({ status: 'Refund Requested', note: reason })
    await order.save()

    res.json({ success: true, message: 'Refund request submitted to studio admin', order })
  } catch (err) {
    next(err)
  }
}

// POST /api/orders/:id/process-refund — Admin Refund Process
export async function processRefund(req, res, next) {
  try {
    const { action, note = '' } = req.body // action: 'approve' | 'reject'
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (action === 'approve') {
      order.status = 'Refund Approved'
      order.paymentStatus = 'Refunded'
      order.refundStatus = 'Approved'
      order.statusHistory.push({ status: 'Refund Approved', note: note || 'Refund approved by Admin' })
    } else {
      order.status = 'Refund Rejected'
      order.refundStatus = 'Rejected'
      order.statusHistory.push({ status: 'Refund Rejected', note: note || 'Refund request rejected by Admin' })
    }

    await order.save()
    sendOrderStatusEmail(order, order.status, note)
    res.json({ success: true, message: `Refund request ${action}d`, order })
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/admin/all — Admin List All Orders with search, filters & pagination
export async function listAllOrders(req, res, next) {
  try {
    const { status, search, page = 1, limit = 50 } = req.query
    const query = {}

    if (status && status !== 'All') {
      query.status = status
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      query.$or = [
        { orderNumber: searchRegex },
        { 'shippingAddress.name': searchRegex },
        { 'shippingAddress.email': searchRegex },
        { 'shippingAddress.phone': searchRegex },
        { razorpayPaymentId: searchRegex },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    if (req.query.paginated === 'true') {
      return res.json({
        orders,
        totalOrders,
        page: Number(page),
        pages: Math.ceil(totalOrders / Number(limit)),
      })
    }

    res.json(orders)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/orders/:id/status — Admin Update Status
export async function updateOrderStatus(req, res, next) {
  try {
    const { status, trackingNumber, carrier, note } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (status) order.status = status
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber
    if (carrier !== undefined) order.carrier = carrier
    if (note !== undefined) order.notes = note

    order.statusHistory.push({
      status: status || order.status,
      note: note || `Order status updated to ${status || order.status}`,
    })

    await order.save()

    // Send status update email notification
    sendOrderStatusEmail(order, status || order.status, note)

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
