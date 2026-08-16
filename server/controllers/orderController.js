import crypto from 'crypto'
import mongoose from 'mongoose'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Payment from '../models/Payment.js'
import Product from '../models/Product.js'
import Cart from '../models/Cart.js'
import Coupon from '../models/Coupon.js'
import razorpay from '../config/razorpay.js'
import Setting from '../models/Setting.js'
import { generateInvoicePDF } from '../utils/pdfGenerator.js'
import { sendOrderConfirmationEmail, sendOrderStatusEmail, sendAdminNewOrderNotification } from '../utils/emailService.js'
import { emitOrderCreated, emitOrderUpdated, emitOrderCancelled, emitCartUpdated } from '../socket.js'
import { ENV } from '../config/env.js'

// POST /api/create-order or /api/orders/create-razorpay-order
export async function createRazorpayOrder(req, res, next) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Please log in to complete your order.' })
    }

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

export const HANDMADE_TERMS_VERSION = '1.0'

// POST /api/orders — Create full MongoDB Order & Razorpay Order with Authoritative Server-Side Calculation
export async function createOrder(req, res, next) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Please log in to complete your order.' })
    }

    const {
      items,
      shippingAddress,
      billingAddress,
      couponCode = '',
      paymentMethod = 'Razorpay Prepaid',
      termsAccepted,
    } = req.body

    if (termsAccepted !== true) {
      return res.status(400).json({
        message: 'Please accept the handmade product terms before placing your order.',
      })
    }

    if (!items?.length) return res.status(400).json({ message: 'Cart is empty.' })

    if (
      !shippingAddress?.name?.trim() ||
      !shippingAddress?.address?.trim() ||
      !shippingAddress?.city?.trim() ||
      !shippingAddress?.pincode?.trim()
    ) {
      return res.status(400).json({ message: 'Complete delivery address is required.' })
    }

    const isValidObjectId = (str) => typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str)

    // 1. Authoritative Product Validation & Subtotal Calculation from MongoDB
    const orderItems = []
    let calcSubtotal = 0

    for (const item of items) {
      const pId = item.productId || item.product || item.id || item._id
      const requestedQty = Math.min(4, Math.max(1, Number(item.qty) || 1))

      let matchedProduct = null
      if (isValidObjectId(pId)) {
        matchedProduct = await Product.findById(pId)
      }
      if (!matchedProduct && item.title) {
        matchedProduct = await Product.findOne({ title: item.title.trim() })
      }

      if (!matchedProduct) {
        return res.status(400).json({ message: `Product '${item.title || pId}' is no longer available.` })
      }

      if (matchedProduct.isArchived || matchedProduct.archived) {
        return res.status(400).json({ message: `Artwork '${matchedProduct.title}' is archived and unavailable.` })
      }

      if (matchedProduct.stock !== undefined && matchedProduct.stock < requestedQty) {
        return res.status(400).json({
          message: `Insufficient stock for '${matchedProduct.title}'. Only ${matchedProduct.stock} available.`,
        })
      }

      const unitPrice = Number(matchedProduct.price) || 0
      const itemSubtotal = unitPrice * requestedQty
      calcSubtotal += itemSubtotal

      orderItems.push({
        product: matchedProduct._id,
        title: matchedProduct.title,
        price: unitPrice,
        qty: requestedQty,
        image: matchedProduct.image || matchedProduct.images?.[0] || item.image || '',
        specimen: matchedProduct.specimen || 'Specimen',
      })
    }

    const subtotal = calcSubtotal

    // 2. Authoritative Coupon Validation & Discount Calculation
    let cleanCouponCode = ''
    let discountAmount = 0

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const formattedCode = couponCode.trim().toUpperCase()
      const coupon = await Coupon.findOne({ code: formattedCode, isActive: true })
      if (coupon) {
        if (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount) {
          cleanCouponCode = coupon.code
          if (coupon.discountType === 'percentage') {
            const calculatedPercentDiscount = Math.round((subtotal * coupon.discountValue) / 100)
            discountAmount = coupon.maxDiscountCap > 0
              ? Math.min(calculatedPercentDiscount, coupon.maxDiscountCap)
              : calculatedPercentDiscount
          } else if (coupon.discountType === 'flat') {
            discountAmount = Math.min(subtotal, coupon.discountValue)
          }
        }
      }
    }

    // 3. Authoritative Studio Shipping Calculation
    let shippingCharge = 0
    try {
      const studioSettings = await Setting.findOne({ key: 'main_studio_settings' })
      const isShippingEnabled = studioSettings?.shippingFeeEnabled ?? true
      const standardFee = studioSettings?.standardShippingFee ?? 100
      const threshold = studioSettings?.freeShippingThreshold ?? 2500

      if (isShippingEnabled) {
        shippingCharge = subtotal >= threshold ? 0 : standardFee
      }
    } catch {
      shippingCharge = 0
    }

    // 4. Authoritative Grand Total
    const grandTotal = Math.max(1, subtotal - discountAmount + shippingCharge)
    const amountInPaise = Math.round(grandTotal * 100)

    const orderNumber = `LC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`
    const orderUser = req.user._id

    // 5. Initialize Razorpay Order first, handle errors cleanly
    let razorpayOrderId = null
    try {
      if (razorpay && razorpay.orders) {
        const customerEmail = req.user?.email || ''
        const customerName = req.user?.name || 'Valued Collector'

        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderNumber,
          notes: {
            orderNumber,
            userId: req.user._id.toString(),
            customerEmail: customerEmail.toLowerCase().trim(),
            customerName,
          },
        })
        razorpayOrderId = razorpayOrder.id
      }
    } catch (rzpErr) {
      console.warn('[RAZORPAY INITIALIZATION NOTICE]:', rzpErr.message || rzpErr)
      if (process.env.NODE_ENV === 'production' && !process.env.CI) {
        return res.status(500).json({
          message: 'Unable to initialize secure payment gateway. Please try again.',
        })
      }
      razorpayOrderId = `order_test_${Date.now()}`
    }

    // 6. Create MongoDB Order with authoritative calculated financial values
    const order = await Order.create({
      user: orderUser,
      orderNumber,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      discountAmount,
      couponCode: cleanCouponCode,
      tax: 0,
      shippingCharge,
      grandTotal,
      paymentMethod,
      paymentStatus: 'Pending',
      status: 'Pending Payment',
      razorpayOrderId,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: HANDMADE_TERMS_VERSION,
      statusHistory: [{ status: 'Pending Payment', note: 'Order created, awaiting Razorpay payment verification.' }],
    })

    if (razorpayOrderId) {
      try {
        await Payment.create({
          order: order._id,
          user: req.user._id,
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
      key_id: ENV.RAZORPAY.KEY_ID,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/payment/verify or /api/orders/verify
export async function verifyPayment(req, res, next) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' })
    }

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
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature.',
      })
    }

    const ownershipFilter = {
      user: req.user._id,
      razorpayOrderId: razorpay_order_id,
    }
    if (orderId) ownershipFilter._id = orderId

    const ownedOrder = await Order.findOne(ownershipFilter)
    if (!ownedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or payment does not belong to this account.',
      })
    }

    // Idempotency: if already Confirmed / Paid, return cleanly without duplicate state transitions
    if (ownedOrder.status === 'Confirmed' && ownedOrder.paymentStatus === 'Paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already processed and order confirmed.',
        order: ownedOrder,
      })
    }

    ownedOrder.status = 'Confirmed'
    ownedOrder.paymentStatus = 'Paid'
    ownedOrder.razorpayPaymentId = razorpay_payment_id
    ownedOrder.razorpaySignature = razorpay_signature
    ownedOrder.statusHistory.push({ status: 'Confirmed', note: 'Payment verified successfully via Razorpay.' })
    await ownedOrder.save()

    // Update Payment Record
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        order: ownedOrder._id,
        user: req.user._id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'captured',
      },
      { upsert: true }
    )

    sendOrderConfirmationEmail(ownedOrder).catch((e) => console.warn('[ORDER CONFIRMATION EMAIL NOTICE]:', e.message))
    sendAdminNewOrderNotification(ownedOrder).catch((e) => console.warn('[ADMIN ORDER NOTIFICATION NOTICE]:', e.message))

    if (ownedOrder.user) {
      try {
        await Cart.findOneAndUpdate({ user: ownedOrder.user }, { items: [], coupon: null })
        emitCartUpdated(ownedOrder.user, { items: [], coupon: null })
      } catch (cErr) {
        console.warn('[CART CLEAR NOTICE]:', cErr.message)
      }
    }

    emitOrderUpdated(ownedOrder)

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed.',
      order: ownedOrder,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/my-orders or /api/orders/mine — Customer order history (Strictly by Authenticated User ID)
export async function getMyOrders(req, res, next) {
  try {
    const userId = req.user?._id || (req.user?.role === 'admin' ? req.query.userId : null)
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required to view order history.' })
    }

    // Source of Truth: query ONLY by authenticated user ID
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/:id — Single order details (Authenticated Owner or Admin only)
export async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const isOwner = req.user && order.user && String(order.user) === String(req.user._id)
    const isAdmin = Boolean(req.admin || req.user?.role === 'admin')

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You do not own this order.' })
    }

    res.json(order)
  } catch (err) {
    next(err)
  }
}

// GET /api/orders/:id/invoice — Download PDF Invoice (Authenticated Owner or Admin only)
export async function downloadInvoice(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const isOwner = req.user && order.user && String(order.user) === String(req.user._id)
    const isAdmin = Boolean(req.admin || req.user?.role === 'admin')

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You do not own this invoice.' })
    }

    generateInvoicePDF(order, res)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/orders/:id/cancel — Customer or Admin Order Cancellation with Strict Ownership & Payment State Verification
export async function cancelOrder(req, res, next) {
  try {
    const { reason = 'Cancelled by user', isAdmin: reqIsAdmin = false } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const isOwner = req.user && order.user && String(order.user) === String(req.user._id)
    const isAdmin = Boolean(req.admin || req.user?.role === 'admin' || (reqIsAdmin && req.admin))

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You cannot cancel an order you do not own.' })
    }

    // 1. Idempotency check: If already cancelled or refunded
    if (order.status === 'Cancelled' || order.status === 'Cancelled & Refunded') {
      return res.json({
        success: true,
        message: `Order ${order.orderNumber} is already ${order.status}.`,
        order,
      })
    }

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

    // 2. Resolve Razorpay Payment ID from order or payment ledger
    let rzpPaymentId =
      order.razorpayPaymentId ||
      order.paymentInfo?.paymentId ||
      order.razorpay_payment_id ||
      order.paymentId
    if (!rzpPaymentId) {
      try {
        const paymentDoc = await Payment.findOne({
          order: order._id,
          status: 'captured',
          razorpayPaymentId: { $exists: true, $ne: '' },
        })
        if (paymentDoc?.razorpayPaymentId) {
          rzpPaymentId = paymentDoc.razorpayPaymentId
        }
      } catch {}
    }

    // 3. Determine if payment was actually captured / paid
    const isPaid =
      (order.paymentStatus === 'Paid' || order.status === 'Confirmed' || order.status === 'Paid') &&
      Boolean(rzpPaymentId && rzpPaymentId.startsWith('pay_'))

    // =========================================================================
    // CASE A: UNPAID / PENDING PAYMENT / FAILED PAYMENT ORDER
    // =========================================================================
    if (!isPaid) {
      order.status = 'Cancelled'
      order.cancellationFee = 0
      order.refundAmount = 0
      order.refundStatus = 'None'
      order.paymentStatus = order.paymentStatus === 'Failed' ? 'Failed' : 'Pending'
      order.notes = `Cancellation Reason: ${reason} (Unpaid order - No payment captured, no refund required)`
      order.statusHistory.push({
        status: 'Cancelled',
        note: `${reason} — Unpaid order cancelled. No payment was charged.`,
      })

      await order.save()

      // Send simple Cancellation Email (not refund email)
      sendOrderStatusEmail(order, 'Cancelled', reason).catch((e) =>
        console.warn('[CANCELLATION EMAIL NOTICE]:', e.message)
      )

      emitOrderUpdated(order)
      emitOrderCancelled(order)

      return res.json({
        success: true,
        message: 'Order cancelled successfully. No payment was captured, so no refund was required.',
        order,
      })
    }

    // =========================================================================
    // CASE B: SUCCESSFULLY CAPTURED PREPAID ORDER
    // =========================================================================
    // Idempotency: If already refunded
    if (order.paymentStatus === 'Refunded' || order.razorpayRefundId || order.refundStatus === 'Processed') {
      return res.json({
        success: true,
        message: `Order ${order.orderNumber} has already been refunded (Refund ID: ${order.razorpayRefundId || 'Processed'}).`,
        order,
      })
    }

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

    let refundProcessed = false
    let refundId = null

    try {
      if (razorpay && razorpay.payments) {
        const refundAmountPaise = Math.round(netRefund * 100)
        let refund = null
        try {
          refund = await razorpay.payments.refund(rzpPaymentId, {
            amount: refundAmountPaise,
            speed: 'optimum',
            notes: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
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
      if (rzpErr.message && rzpErr.message.toLowerCase().includes('already refunded')) {
        refundProcessed = true
        refundId = order.razorpayRefundId || 'PREVIOUSLY-REFUNDED'
        order.razorpayRefundId = refundId
        order.refundStatus = 'Processed'
        order.paymentStatus = 'Refunded'
      } else {
        order.refundStatus = 'Failed'
        order.notes = `${order.notes || ''} | Refund Attempt Failed: ${rzpErr.message}`
      }
    }

    if (refundProcessed) {
      order.status = 'Cancelled & Refunded'
      const feeText = isAdmin
        ? `Admin Cancellation (100% Full Refund: ₹${netRefund})`
        : `Customer Cancellation (3% Processing Fee: ₹${cancellationFee} | 97% Net Refund: ₹${netRefund})`

      order.notes = `Cancellation Reason: ${reason} [${feeText}]${refundId ? ` | Razorpay Refund ID: ${refundId}` : ''}`
      order.statusHistory.push({
        status: order.status,
        note: `${reason} — ${feeText}${refundId ? ` (Refund ID: ${refundId})` : ''}`,
      })

      // Update Payment Ledger
      try {
        await Payment.findOneAndUpdate(
          { $or: [{ razorpayPaymentId: rzpPaymentId }, { order: order._id }] },
          { status: 'refunded', refundId, refundAmount: netRefund }
        )
      } catch (e) {
        console.warn('[PAYMENT LEDGER UPDATE NOTICE]:', e.message)
      }

      await order.save()

      // Send Refund Notice Email
      sendOrderStatusEmail(
        order,
        order.status,
        `Reason: ${reason} — ${feeText}${refundId ? ` (Refund Ref: ${refundId})` : ''}`
      ).catch((e) => console.warn('[REFUND EMAIL NOTICE]:', e.message))

      emitOrderUpdated(order)
      emitOrderCancelled(order)

      return res.json({
        success: true,
        message: `Order cancelled. ${isAdmin ? '100% Full Refund' : '97% Net Refund'} (₹${netRefund}) issued via Razorpay (ID: ${refundId || 'Processed'}).`,
        order,
      })
    } else {
      order.status = 'Cancelled'
      await order.save()
      emitOrderUpdated(order)
      emitOrderCancelled(order)

      return res.status(500).json({
        success: false,
        message: 'Order cancelled, but automated Razorpay refund failed. Studio admin has been notified for manual processing.',
        order,
      })
    }
  } catch (err) {
    next(err)
  }
}

// POST /api/orders/:id/refund-request — Customer Refund Request (Owner only)
export async function requestRefund(req, res, next) {
  try {
    const { reason, amount } = req.body
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const isOwner = req.user && order.user && String(order.user) === String(req.user._id)
    const isAdmin = Boolean(req.admin || req.user?.role === 'admin')

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied. You cannot request a refund for an order you do not own.' })
    }

    if (order.paymentStatus !== 'Paid' && !order.razorpayPaymentId) {
      return res.status(400).json({
        message: 'Cannot request a refund for an unpaid order.',
      })
    }

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
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to process refunds.' })
    }

    const { action, note = '' } = req.body // action: 'approve' | 'reject'
    const order = await Order.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })

    if (action === 'approve') {
      // 1. Safety check: Cannot refund an unpaid order
      if (order.paymentStatus !== 'Paid' && !order.razorpayPaymentId) {
        return res.status(400).json({
          message: 'Cannot process refund for an unpaid order. No payment was captured.',
        })
      }

      // 2. Idempotency check: If already refunded
      if (order.paymentStatus === 'Refunded' || order.razorpayRefundId || order.refundStatus === 'Approved') {
        return res.json({
          success: true,
          message: `Refund has already been processed for this order (Refund ID: ${order.razorpayRefundId || 'Approved'}).`,
          order,
        })
      }

      let refundId = null
      const refundAmount = Number(order.refundAmount || order.grandTotal || order.total || 0)
      const refundAmountPaise = Math.round(refundAmount * 100)

      if (order.razorpayPaymentId && order.razorpayPaymentId.startsWith('pay_')) {
        try {
          if (razorpay && razorpay.payments) {
            const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
              amount: refundAmountPaise,
              speed: 'optimum',
              notes: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                reason: note || 'Admin approved refund',
              },
            })
            refundId = refund?.id
          }
        } catch (e) {
          console.error('[ADMIN REFUND PROCESS ERROR]:', e.message)
          if (e.message && e.message.toLowerCase().includes('already refunded')) {
            refundId = order.razorpayRefundId || 'PREVIOUSLY-REFUNDED'
          } else {
            order.refundStatus = 'Failed'
            order.notes = `${order.notes || ''} | Admin Refund Error: ${e.message}`
            await order.save()
            return res.status(500).json({
              message: `Razorpay refund failed: ${e.message}`,
            })
          }
        }
      }

      order.status = 'Cancelled & Refunded'
      order.paymentStatus = 'Refunded'
      order.refundStatus = 'Approved'
      order.razorpayRefundId = refundId || order.razorpayRefundId
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
    sendOrderStatusEmail(order, order.status, note).catch((e) =>
      console.warn('[REFUND EMAIL NOTICE]:', e.message)
    )
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
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to list all orders.' })
    }

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
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to update order status.' })
    }

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
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to delete orders.' })
    }

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
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to delete orders.' })
    }

    await Order.deleteMany({})
    emitOrderCancelled('ALL')
    res.json({ message: 'All orders deleted successfully' })
  } catch (err) {
    next(err)
  }
}
