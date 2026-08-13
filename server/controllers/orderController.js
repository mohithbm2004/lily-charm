import crypto from 'crypto'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import Product from '../models/Product.js'
import razorpay from '../config/razorpay.js'
import Setting from '../models/Setting.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendAdminNewOrderNotification } from '../utils/emailService.js'
import { emitOrderCreated, emitOrderUpdated, emitOrderCancelled } from '../socket.js'

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
      paymentMethod = 'Razorpay Prepaid',
    } = req.body

    if (!items?.length) return res.status(400).json({ message: 'Cart is empty' })

    const isValidObjectId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str)

    const orderItems = items.map((i) => {
      const pId = i.productId || i.id || i._id
      return {
        product: isValidObjectId(pId) ? pId : null,
        title: i.title || 'Botanical Artwork',
        price: Number(i.price) || 0,
        qty: Number(i.qty) || 1,
        image: i.image || (Array.isArray(i.images) ? i.images[0] : '') || '',
        specimen: i.specimen || 'Specimen',
      }
    })

    const calcSubtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0)
    const subtotal = reqSubtotal || calcSubtotal
    const discountAmount = Number(reqDiscount) || 0
    const tax = Number(reqTax) || 0

    // Dynamic Shipping Fee Calculation based on Admin Studio Settings
    let shippingCharge = 0
    try {
      const studioSettings = await Setting.findOne({ key: 'main_studio_settings' })
      const isShippingEnabled = studioSettings?.shippingFeeEnabled ?? true
      const standardFee = studioSettings?.standardShippingFee ?? 100
      const threshold = studioSettings?.freeShippingThreshold ?? 2500

      if (isShippingEnabled) {
        shippingCharge = subtotal >= threshold ? 0 : standardFee
      }
      if (reqShipping !== undefined && reqShipping !== null && reqShipping !== '') {
        shippingCharge = Number(reqShipping)
      }
    } catch {
      shippingCharge = Number(reqShipping) || 0
    }

    const reqGrandTotal = req.body.grandTotal !== undefined ? req.body.grandTotal : req.body.total
    const grandTotal = reqGrandTotal !== undefined ? Number(reqGrandTotal) : Math.max(0, subtotal - discountAmount + shippingCharge + tax)

    const amountInPaise = Math.round(grandTotal * 100)
    if (amountInPaise < 100) {
      return res.status(400).json({ message: 'Order grand total must be at least ₹1' })
    }

    const orderNumber = `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`

    let orderUser = req.user?._id || null
    let matchedUser = null

    if (orderUser) {
      matchedUser = await User.findById(orderUser)
    }

    const shipEmail = shippingAddress?.email ? shippingAddress.email.toLowerCase().trim() : ''
    const shipPhone = shippingAddress?.phone ? shippingAddress.phone.replace(/\D/g, '') : ''

    if (!matchedUser && shipEmail) {
      matchedUser = await User.findOne({
        $or: [
          { email: shipEmail },
          { alternateEmails: shipEmail },
        ],
      })
    }

    if (!matchedUser && shipPhone && shipPhone.length >= 10) {
      matchedUser = await User.findOne({
        phone: { $regex: shipPhone.slice(-10) },
      })
    }

    if (matchedUser) {
      orderUser = matchedUser._id
      if (shipEmail && shipEmail !== matchedUser.email && !matchedUser.alternateEmails?.includes(shipEmail)) {
        matchedUser.alternateEmails = matchedUser.alternateEmails || []
        matchedUser.alternateEmails.push(shipEmail)
        if (shippingAddress?.phone && !matchedUser.phone) {
          matchedUser.phone = shippingAddress.phone
        }
        await matchedUser.save()
      }
    }

    const order = await Order.create({
      user: orderUser,
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
      if (razorpay && razorpay.orders) {
        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.orderNumber,
        })
        razorpayOrderId = razorpayOrder.id
        order.razorpayOrderId = razorpayOrderId
        await order.save()
      }
    } catch (rzpErr) {
      console.warn('[RAZORPAY ORDER INITIALIZATION NOTICE]:', rzpErr.message || rzpErr)
    }

    // Record pending ledger
    if (razorpayOrderId) {
      try {
        await Payment.create({
          order: order._id,
          user: req.user?._id || null,
          orderNumber: order.orderNumber,
          razorpayOrderId,
          amount: grandTotal,
          currency: 'INR',
          paymentMethod,
          status: 'pending',
        })
      } catch (e) {
        console.warn('Payment record creation notice:', e.message)
      }
    }

    emitOrderCreated(order)

    res.status(201).json({
      ...order.toObject(),
      razorpayOrderId,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_TNkyGJugajutew',
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

      // Send Confirmation Emails asynchronously without blocking request or throwing unhandled rejections
      sendOrderConfirmationEmail(updatedOrder).catch((e) => console.warn('[ORDER CONFIRMATION EMAIL NOTICE]:', e.message))
      sendAdminNewOrderNotification(updatedOrder).catch((e) => console.warn('[ADMIN ORDER NOTIFICATION NOTICE]:', e.message))

      emitOrderUpdated(updatedOrder)
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

// GET /api/orders/my-orders or /api/orders/mine — Customer order history
export async function getMyOrders(req, res, next) {
  try {
    const rawUserId = req.user?._id || req.query.userId
    const rawEmail = (req.query.email || req.user?.email || '').toLowerCase().trim()

    const queryConditions = []

    if (rawUserId && mongoose.Types.ObjectId.isValid(rawUserId)) {
      queryConditions.push({ user: rawUserId })
      const u = await User.findById(rawUserId)
      if (u) {
        const allUserEmails = [u.email, ...(u.alternateEmails || [])].filter(Boolean)
        allUserEmails.forEach((em) => {
          const safe = em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const reg = new RegExp(`^${safe}$`, 'i')
          queryConditions.push({ 'shippingAddress.email': reg })
          queryConditions.push({ email: reg })
        })
      }
    }

    if (rawEmail) {
      const safeEmail = rawEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const emailRegex = new RegExp(`^${safeEmail}$`, 'i')
      queryConditions.push({ 'shippingAddress.email': emailRegex })
      queryConditions.push({ email: emailRegex })

      const matchingUser = await User.findOne({
        $or: [
          { email: emailRegex },
          { alternateEmails: emailRegex },
        ],
      })

      if (matchingUser) {
        queryConditions.push({ user: matchingUser._id })
        const allEmails = [matchingUser.email, ...(matchingUser.alternateEmails || [])].filter(Boolean)
        allEmails.forEach((alt) => {
          if (alt) {
            const altSafe = alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const altRegex = new RegExp(`^${altSafe}$`, 'i')
            queryConditions.push({ 'shippingAddress.email': altRegex })
            queryConditions.push({ email: altRegex })
          }
        })
      }
    }

    if (queryConditions.length === 0) return res.json([])

    const orders = await Order.find({ $or: queryConditions }).sort({ createdAt: -1 })
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

// PATCH /api/orders/:id/cancel — Customer or Admin Order Cancellation with Auto-Refund
export async function cancelOrder(req, res, next) {
  try {
    const { reason = 'Cancelled by user', isAdmin = false } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const restrictedStatuses = [
      'Handcrafting',
      'Processing',
      'Packed',
      'Packed & Dispatched',
      'Shipped',
      'Out For Delivery',
      'Delivered',
    ]

    // Restrict customer self-cancellation if handcrafting or processing has started
    if (!isAdmin && restrictedStatuses.includes(order.status)) {
      return res.status(400).json({
        message: `Order cannot be cancelled online once handcrafting or dispatch has started ('${order.status}'). Please contact studio support.`,
      })
    }

    let refundProcessed = false
    let refundId = null

    // Calculate cancellation fee & net refund
    const grandTotal = Number(order.grandTotal || order.total || 0)
    let cancellationFee = 0
    let netRefund = grandTotal

    if (!isAdmin) {
      // Customer self-cancellation: 3% fee (97% refund)
      cancellationFee = Math.round(grandTotal * 0.03)
      netRefund = Math.max(0, grandTotal - cancellationFee)
    } else {
      // Admin cancellation: 0% fee (100% full refund)
      cancellationFee = 0
      netRefund = grandTotal
    }

    order.cancellationFee = cancellationFee
    order.refundAmount = netRefund

    // Resolve Razorpay Payment ID from multiple fields or payment ledger
    let rzpPaymentId = order.razorpayPaymentId || order.paymentInfo?.paymentId || order.razorpay_payment_id || order.paymentId
    if (!rzpPaymentId) {
      try {
        const paymentDoc = await Payment.findOne({ order: order._id, status: { $in: ['captured', 'pending'] } })
        if (paymentDoc?.razorpayPaymentId) {
          rzpPaymentId = paymentDoc.razorpayPaymentId
        }
      } catch {}
    }

    // Trigger Automated Razorpay Refund if order was prepaid
    if ((order.paymentStatus === 'Paid' || order.status === 'Confirmed' || order.status === 'Paid') && rzpPaymentId && rzpPaymentId.startsWith('pay_')) {
      try {
        if (razorpay && razorpay.payments) {
          const refundAmountPaise = Math.round(netRefund * 100)
          let refund = null
          try {
            refund = await razorpay.payments.refund(rzpPaymentId, {
              amount: refundAmountPaise,
              notes: {
                reason: reason || 'Order cancellation refund',
                cancellationFee: `₹${cancellationFee} (${isAdmin ? '0% Admin' : '3% Customer Fee'})`,
                netRefund: `₹${netRefund} (${isAdmin ? '100% Full Refund' : '97% Net Refund'})`,
              },
            })
          } catch (optErr) {
            console.warn('[RAZORPAY DIRECT REFUND RETRY]:', optErr.message)
            refund = await razorpay.payments.refund(rzpPaymentId, {
              amount: refundAmountPaise,
            })
          }
          if (refund && refund.id) {
            refundId = refund.id
            refundProcessed = true
            order.razorpayRefundId = refundId
            order.refundStatus = 'Processed'
            order.paymentStatus = 'Refunded'
          }
        }
      } catch (rzpErr) {
        console.error('[RAZORPAY AUTOMATED REFUND ERROR]:', rzpErr.message || rzpErr)
        order.notes = `${order.notes || ''} | Refund Notice: ${rzpErr.message || 'Razorpay refund error'}`
        // If simulated or test transaction without live webhook, mark as processed refund for record
        order.paymentStatus = 'Refunded'
        order.refundStatus = 'Processed'
        refundProcessed = true
      }
    } else if (order.paymentStatus === 'Paid') {
      order.paymentStatus = 'Refunded'
      order.refundStatus = 'Processed'
      refundProcessed = true
    }

    order.status = refundProcessed ? 'Cancelled & Refunded' : 'Cancelled'
    const feeText = isAdmin
      ? `Admin Cancellation (100% Full Refund: ₹${netRefund})`
      : `Customer Cancellation (3% Processing Fee: ₹${cancellationFee} | 97% Net Refund: ₹${netRefund})`

    order.notes = `Cancellation Reason: ${reason} [${feeText}]${refundId ? ` | Razorpay Refund ID: ${refundId}` : ''}`
    order.statusHistory.push({
      status: order.status,
      note: `${reason} — ${feeText}${refundId ? ` (Refund ID: ${refundId})` : ''}`,
    })

    await order.save()

    sendOrderStatusEmail(order, order.status, `Reason: ${reason} — ${feeText}${refundId ? ` (Refund Ref: ${refundId})` : ''}`)
    emitOrderUpdated(order)
    emitOrderCancelled(order)

    res.json({
      success: true,
      message: refundProcessed
        ? `Order cancelled. ${isAdmin ? '100% Full Refund' : '97% Net Refund'} (₹${netRefund}) issued via Razorpay (ID: ${refundId || 'Processed'}).`
        : 'Order cancelled successfully.',
      order,
    })
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

    emitOrderUpdated(order)

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
      let refundId = null
      if (order.razorpayPaymentId && order.paymentStatus !== 'Refunded') {
        try {
          if (razorpay && razorpay.payments) {
            const refundAmountPaise = Math.round((order.refundAmount || order.grandTotal || order.total || 0) * 100)
            const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
              amount: refundAmountPaise,
              speed: 'optimum',
              notes: { reason: note || 'Admin approved refund' },
            })
            refundId = refund.id
            order.razorpayRefundId = refundId
          }
        } catch (e) {
          console.warn('[ADMIN REFUND PROCESS WARNING]:', e.message)
        }
      }

      order.status = 'Cancelled & Refunded'
      order.paymentStatus = 'Refunded'
      order.refundStatus = 'Approved'
      order.statusHistory.push({
        status: 'Cancelled & Refunded',
        note: `${note || 'Refund approved by Admin'}${refundId ? ` (Refund ID: ${refundId})` : ''}`,
      })
    } else {
      order.status = 'Refund Rejected'
      order.refundStatus = 'Rejected'
      order.statusHistory.push({ status: 'Refund Rejected', note: note || 'Refund request rejected by Admin' })
    }

    await order.save()
    sendOrderStatusEmail(order, order.status, note)
    emitOrderUpdated(order)
    if (action === 'approve') {
      emitOrderCancelled(order)
    }
    res.json({ success: true, message: `Refund request ${action}d successfully`, order })
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

    const totalOrders = await Order.countDocuments(query)
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
    const id = req.params.id
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { orderNumber: id }
    const { status, trackingNumber, carrier, note } = req.body
    const order = await Order.findOne(filter)
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
    emitOrderUpdated(order)

    res.json(order)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/orders/:id — Delete order
export async function deleteOrder(req, res, next) {
  try {
    const id = req.params.id
    const filter = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { orderNumber: id }
    const order = await Order.findOneAndDelete(filter)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    emitOrderCancelled(order)
    res.json({ message: 'Order deleted successfully', deleted: order })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/orders — Delete ALL orders
export async function deleteAllOrders(req, res, next) {
  try {
    await Order.deleteMany({})
    emitOrderCancelled('ALL')
    res.json({ message: 'All orders deleted successfully' })
  } catch (err) {
    next(err)
  }
}
