import crypto from 'crypto'
import Payment from '../models/Payment.js'
import Order from '../models/Order.js'
import CustomRequest from '../models/CustomRequest.js'
import { processCustomQuotePaymentSuccess } from './customRequestController.js'
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from '../utils/emailService.js'
import { emitOrderUpdated } from '../socket.js'

// GET /api/payment/admin/ledger — Payment Revenue & Analytics Dashboard for Admin
export async function getPaymentLedger(req, res, next) {
  try {
    const totalPayments = await Payment.countDocuments()
    const successfulPayments = await Payment.countDocuments({ status: 'captured' })
    const failedPayments = await Payment.countDocuments({ status: 'failed' })
    const refundedPayments = await Payment.countDocuments({ status: 'refunded' })

    const totalRevenueAgg = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])

    const totalRevenue = totalRevenueAgg[0]?.total || 0

    // Recent Payments
    const recentPayments = await Payment.find({})
      .populate('order', 'orderNumber status shippingAddress')
      .populate('customRequest', 'name email stylePreference')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({
      metrics: {
        totalRevenue,
        totalPayments,
        successfulPayments,
        failedPayments,
        refundedPayments,
      },
      recentPayments,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/payment/webhook — Secure & Idempotent Razorpay Webhook Handler
export async function handleRazorpayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature']
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET

    // 1. Verify Webhook Signature if configured
    if (webhookSecret && signature) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')

      let isMatch = false
      try {
        isMatch = crypto.timingSafeEqual(
          Buffer.from(signature, 'utf-8'),
          Buffer.from(expectedSignature, 'utf-8')
        )
      } catch {
        isMatch = false
      }

      if (!isMatch) {
        console.error('[RAZORPAY WEBHOOK ERROR]: Invalid webhook signature.')
        return res.status(400).json({ success: false, message: 'Invalid webhook signature.' })
      }
    }

    const event = req.body
    if (process.env.NODE_ENV !== 'production') {
      console.log('[RAZORPAY WEBHOOK EVENT]:', event.event)
    }

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity
      if (!paymentEntity) {
        return res.status(200).json({ status: 'ok', note: 'No payment entity' })
      }

      const razorpayOrderId = paymentEntity.order_id
      const razorpayPaymentId = paymentEntity.id
      const notes = paymentEntity.notes || {}

      // Validate currency
      if (paymentEntity.currency && paymentEntity.currency !== 'INR') {
        console.warn(`[WEBHOOK WARNING]: Unexpected currency ${paymentEntity.currency}`)
      }

      // Check if this payment belongs to a Custom Quote
      const isCustomQuote =
        notes.type === 'custom_quote' ||
        Boolean(notes.customRequestId) ||
        (paymentEntity.description && paymentEntity.description.toLowerCase().includes('custom'))

      if (isCustomQuote || notes.customRequestId) {
        const customRequestId = notes.customRequestId
        let customRequest = null

        if (customRequestId) {
          customRequest = await CustomRequest.findById(customRequestId)
        }
        if (!customRequest && razorpayOrderId) {
          customRequest = await CustomRequest.findOne({ razorpayOrderId })
        }

        if (customRequest) {
          console.log(`[WEBHOOK] Processing Custom Quote Payment: ${customRequest._id} (Payment: ${razorpayPaymentId})`)
          const result = await processCustomQuotePaymentSuccess({
            customRequestId: customRequest._id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature: signature || '',
            userEmail: customRequest.email,
          })

          return res.status(200).json({
            status: 'ok',
            type: 'custom_quote',
            orderId: result?.order?._id,
            alreadyProcessed: result?.alreadyProcessed,
          })
        }
      }

      // Check if this payment belongs to a Standard Order
      let order = await Order.findOne({ razorpayOrderId })
      if (!order && notes.orderNumber) {
        order = await Order.findOne({ orderNumber: notes.orderNumber })
      }

      if (order) {
        // Idempotency check: if order is already Paid/Confirmed, skip duplicate email/status updates
        if (order.paymentStatus === 'Paid' && order.status === 'Confirmed') {
          return res.status(200).json({ status: 'ok', note: 'Order already processed' })
        }

        order.status = 'Confirmed'
        order.paymentStatus = 'Paid'
        order.razorpayPaymentId = razorpayPaymentId
        order.statusHistory.push({
          status: 'Confirmed',
          note: `Payment verified via Razorpay webhook (${razorpayPaymentId}).`,
        })
        await order.save()

        await Payment.findOneAndUpdate(
          { razorpayOrderId },
          {
            order: order._id,
            razorpayPaymentId,
            status: 'captured',
            rawResponse: paymentEntity,
          },
          { upsert: true }
        )

        // Dispatch transactional emails safely to registered account
        sendOrderConfirmationEmail(order).catch((e) =>
          console.warn('[WEBHOOK ORDER CONFIRMATION EMAIL WARNING]:', e.message)
        )
        sendAdminNewOrderNotification(order).catch((e) =>
          console.warn('[WEBHOOK ADMIN ORDER NOTIFICATION WARNING]:', e.message)
        )

        emitOrderUpdated(order)
      } else {
        // Record orphan payment in ledger for admin audit
        await Payment.findOneAndUpdate(
          { razorpayOrderId },
          {
            razorpayOrderId,
            razorpayPaymentId,
            amount: (paymentEntity.amount || 0) / 100,
            currency: paymentEntity.currency || 'INR',
            status: 'captured',
            rawResponse: paymentEntity,
          },
          { upsert: true }
        )
      }
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity
      if (paymentEntity) {
        const razorpayOrderId = paymentEntity.order_id
        if (razorpayOrderId) {
          await Order.findOneAndUpdate(
            { razorpayOrderId, paymentStatus: { $ne: 'Paid' } },
            {
              status: 'Payment Failed',
              paymentStatus: 'Failed',
            }
          )

          await Payment.findOneAndUpdate(
            { razorpayOrderId },
            {
              razorpayPaymentId: paymentEntity.id,
              status: 'failed',
              errorDescription: paymentEntity.error_description || 'Payment Failed',
              rawResponse: paymentEntity,
            },
            { upsert: true }
          )
        }
      }
    } else if (event.event === 'refund.created' || event.event === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity
      if (refundEntity) {
        const paymentId = refundEntity.payment_id
        const refundId = refundEntity.id
        const amount = (refundEntity.amount || 0) / 100

        const order = await Order.findOne({
          $or: [{ razorpayPaymentId: paymentId }, { razorpayRefundId: refundId }],
        })

        if (order) {
          order.status = 'Cancelled & Refunded'
          order.paymentStatus = 'Refunded'
          order.refundStatus = 'Processed'
          order.razorpayRefundId = refundId
          if (!order.refundAmount) order.refundAmount = amount
          order.statusHistory.push({
            status: 'Cancelled & Refunded',
            note: `Refund confirmed via Razorpay webhook (${refundId}).`,
          })
          await order.save()

          await Payment.findOneAndUpdate(
            { $or: [{ razorpayPaymentId: paymentId }, { order: order._id }] },
            { status: 'refunded', refundId, refundAmount: amount }
          )

          emitOrderUpdated(order)
        }
      }
    }

    res.status(200).json({ status: 'ok' })
  } catch (err) {
    console.error('[WEBHOOK PROCESSING ERROR]:', err.message)
    res.status(500).json({ message: 'Webhook processing error' })
  }
}
