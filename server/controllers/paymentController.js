import Payment from '../models/Payment.js'
import Order from '../models/Order.js'

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

// POST /api/payment/webhook — Razorpay Webhook Handler
export async function handleRazorpayWebhook(req, res, next) {
  try {
    const event = req.body
    console.log('[RAZORPAY WEBHOOK EVENT]:', event.event)

    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity
      const razorpayOrderId = paymentEntity.order_id

      await Order.findOneAndUpdate(
        { razorpayOrderId },
        {
          status: 'Confirmed',
          paymentStatus: 'Paid',
          razorpayPaymentId: paymentEntity.id,
        }
      )

      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          razorpayPaymentId: paymentEntity.id,
          status: 'captured',
          rawResponse: paymentEntity,
        }
      )
    } else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload.payment.entity
      const razorpayOrderId = paymentEntity.order_id

      await Order.findOneAndUpdate(
        { razorpayOrderId },
        {
          status: 'Payment Failed',
          paymentStatus: 'Failed',
        }
      )

      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          status: 'failed',
          errorDescription: paymentEntity.error_description || 'Payment Failed',
          rawResponse: paymentEntity,
        }
      )
    }

    res.json({ status: 'ok' })
  } catch (err) {
    console.error('[WEBHOOK ERROR]:', err.message)
    res.status(500).json({ message: 'Webhook processing error' })
  }
}
