import crypto from 'crypto'
import Payment from '../models/Payment.js'
import Order from '../models/Order.js'
import CustomRequest from '../models/CustomRequest.js'
import { processCustomQuotePaymentSuccess } from './customRequestController.js'
import { processOrderPaymentSuccess } from '../utils/paymentProcessor.js'
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from '../utils/emailService.js'
import { emitOrderUpdated } from '../socket.js'
import { ENV } from '../config/env.js'

// GET /api/payment/admin/ledger — Payment Revenue & Analytics Dashboard for Admin
export async function getPaymentLedger(req, res, next) {
  try {
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to view the payment ledger.' })
    }

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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || ENV.RAZORPAY.WEBHOOK_SECRET

    if (!webhookSecret || !signature) {
      console.error('[RAZORPAY WEBHOOK ERROR] Missing signature or secret configuration.')
      return res.status(400).json({ success: false, message: 'Missing Razorpay webhook signature configuration.' })
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
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
    } catch (sigErr) {
      isMatch = false
    }

    if (!isMatch) {
      console.error('[RAZORPAY WEBHOOK ERROR] Invalid webhook signature verification.')
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' })
    }

    const event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body
    
    // Extract parameters for production-safe logging
    const webhookEvent = event.event || 'unknown'
    const paymentEntity = event.payload?.payment?.entity || event.payload?.refund?.entity || {}
    const paymentId = paymentEntity.id || ''
    const razorpayOrderId = paymentEntity.order_id || ''

    console.log(`[RAZORPAY WEBHOOK RECEIVED] event=${webhookEvent} paymentId=${paymentId} razorpayOrderId=${razorpayOrderId}`)

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity
      if (!paymentEntity) {
        console.warn(`[RAZORPAY WEBHOOK ERROR] No payment entity in payload for event ${event.event}`)
        return res.status(200).json({ status: 'ok', note: 'No payment entity' })
      }

      const razorpayOrderId = paymentEntity.order_id
      const razorpayPaymentId = paymentEntity.id
      const notes = paymentEntity.notes || {}

      // Validate currency
      if (paymentEntity.currency && paymentEntity.currency !== 'INR') {
        console.warn(`[WEBHOOK WARNING]: Unexpected currency ${paymentEntity.currency}`)
      }

      console.log(`[RAZORPAY WEBHOOK PROCESSING] event=${event.event} razorpayOrderId=${razorpayOrderId}`)

      // Check if this payment belongs to a Custom Quote
      const isCustomQuote =
        notes.type === 'custom_quote' ||
        Boolean(notes.customRequestId) ||
        (paymentEntity.description && paymentEntity.description.toLowerCase().includes('custom'))

      if (isCustomQuote || notes.customRequestId) {
        const customRequestId = notes.customRequestId
        let customRequest = null

        if (customRequestId) {
          customRequest = await CustomRequest.findOne({ _id: customRequestId, razorpayOrderId })
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
            razorpaySignature: signature,
          })

          console.log(`[RAZORPAY WEBHOOK RESULT] success=true type=custom_quote customRequestId=${customRequest._id}`)
          return res.status(200).json({
            status: 'ok',
            type: 'custom_quote',
            orderId: result?.order?._id,
            alreadyProcessed: result?.alreadyProcessed,
          })
        }
      }

      // Check if this payment belongs to a Standard Order
      const result = await processOrderPaymentSuccess({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: signature,
        amountInRupees: (paymentEntity.amount || 0) / 100,
        source: 'Razorpay Webhook',
      })

      console.log(`[RAZORPAY WEBHOOK RESULT] success=${result.success} reason=${result.reason || 'none'} alreadyProcessed=${result.alreadyProcessed || false} orderId=${result.order?._id || ''}`)

      if (result.success) {
        return res.status(200).json({
          status: 'ok',
          alreadyProcessed: result.alreadyProcessed,
          orderId: result.order?._id,
        })
      }

      // If order wasn't found by razorpayOrderId, record as orphan payment in ledger
      if (result.reason === 'ORDER_NOT_FOUND') {
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
        return res.status(200).json({
          status: 'ok',
          message: 'Order not found. Recorded as orphan/reconciliation payment.',
        })
      }

      if (result.reason === 'AMOUNT_MISMATCH') {
        return res.status(200).json({
          status: 'error',
          reason: 'AMOUNT_MISMATCH',
          message: 'Authoritative database amount did not match captured payment amount.',
        })
      }

      // Return a non-2xx response so Razorpay retries if processing failed due to database or concurrency errors
      console.error(`[RAZORPAY WEBHOOK FAILURE] processing failed: ${result.reason}`)
      return res.status(500).json({
        success: false,
        message: `Webhook processing failed: ${result.reason}`,
      })

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
          console.log(`[RAZORPAY WEBHOOK RESULT] success=true event=payment.failed razorpayOrderId=${razorpayOrderId}`)
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
          console.log(`[RAZORPAY WEBHOOK RESULT] success=true event=${event.event} orderId=${order._id}`)
        }
      }
    }

    res.status(200).json({ status: 'ok' })
  } catch (err) {
    console.error('[WEBHOOK PROCESSING ERROR]:', err.message)
    res.status(500).json({ message: 'Webhook processing error' })
  }
}

// GET /api/payment/admin/tracking — Admin Payment Tracking list with metrics & filters
export async function getPaymentTracking(req, res, next) {
  try {
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to view the payment tracking.' })
    }

    const { page = 1, limit = 50, status = 'all', search = '', from = '', to = '' } = req.query

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 50
    const skipNum = (pageNum - 1) * limitNum

    // 1. Base counts & metrics
    const totalPayments = await Payment.countDocuments()
    const capturedPayments = await Payment.countDocuments({ status: 'captured' })
    const pendingPayments = await Payment.countDocuments({ status: 'pending' })
    const failedPayments = await Payment.countDocuments({ status: 'failed' })
    const refundedPayments = await Payment.countDocuments({ status: 'refunded' })

    const totalRevenueAgg = await Payment.aggregate([
      { $match: { status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const totalRevenue = totalRevenueAgg[0]?.total || 0

    // Fetch dynamic reconciliation counts using lookup aggregation
    const reconciliationMetrics = await Payment.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc'
        }
      },
      {
        $unwind: {
          path: '$orderDoc',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          reconciliationStatus: {
            $cond: {
              if: { $ne: ["$status", "captured"] },
              then: "$status",
              else: {
                $cond: {
                  if: { $eq: [{ $ifNull: ["$orderDoc", null] }, null] },
                  then: "attention_required",
                  else: {
                    $cond: {
                      if: { $ne: ["$orderDoc.paymentStatus", "Paid"] },
                      then: "attention_required",
                      else: {
                        $cond: {
                          if: {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: { $ifNull: ["$orderDoc.statusHistory", []] },
                                    as: "history",
                                    cond: {
                                      $or: [
                                        { $regexMatch: { input: { $ifNull: ["$$history.note", ""] }, regex: "Automated Reconciliation Worker", options: "i" } },
                                        { $regexMatch: { input: { $ifNull: ["$$history.note", ""] }, regex: "Webhook", options: "i" } },
                                        { $regexMatch: { input: { $ifNull: ["$$history.note", ""] }, regex: "Reconciliation", options: "i" } }
                                      ]
                                    }
                                  }
                                }
                              },
                              0
                            ]
                          },
                          then: "reconciled",
                          else: "normal"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$reconciliationStatus',
          count: { $sum: 1 }
        }
      }
    ])

    let reconciledPayments = 0
    let attentionRequiredPayments = 0

    reconciliationMetrics.forEach(m => {
      if (m._id === 'reconciled') reconciledPayments = m.count
      if (m._id === 'attention_required') attentionRequiredPayments = m.count
    })

    // 2. Query Pipeline
    const pipeline = []

    // Date range filter
    if (from || to) {
      const dateFilter = {}
      if (from) dateFilter.$gte = new Date(from)
      if (to) dateFilter.$lte = new Date(to)
      pipeline.push({ $match: { createdAt: dateFilter } })
    }

    // Lookups
    pipeline.push(
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderDoc'
        }
      },
      {
        $unwind: {
          path: '$orderDoc',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc'
        }
      },
      {
        $unwind: {
          path: '$userDoc',
          preserveNullAndEmptyArrays: true
        }
      }
    )

    // Add reconciliationStatus
    pipeline.push({
      $addFields: {
        reconciliationStatus: {
          $cond: {
            if: { $ne: ["$status", "captured"] },
            then: "$status",
            else: {
              $cond: {
                if: { $eq: [{ $ifNull: ["$orderDoc", null] }, null] },
                then: "attention_required",
                else: {
                  $cond: {
                    if: { $ne: ["$orderDoc.paymentStatus", "Paid"] },
                    then: "attention_required",
                    else: {
                      $cond: {
                        if: {
                          $gt: [
                            {
                              $size: {
                                $filter: {
                                  input: { $ifNull: ["$orderDoc.statusHistory", []] },
                                  as: "history",
                                  cond: {
                                    $or: [
                                      { $regexMatch: { input: { $ifNull: ["$$history.note", ""] }, regex: "Automated Reconciliation Worker", options: "i" } },
                                      { $regexMatch: { input: { $ifNull: ["$$history.note", ""] }, regex: "Webhook", options: "i" } },
                                      { $regexMatch: { input: { $ifNull: ["$$history.note", ""] }, regex: "Reconciliation", options: "i" } }
                                    ]
                                  }
                                }
                              }
                            },
                              0
                            ]
                          },
                          then: "reconciled",
                          else: "normal"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })

    // Search query
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      pipeline.push({
        $match: {
          $or: [
            { orderNumber: searchRegex },
            { razorpayPaymentId: searchRegex },
            { razorpayOrderId: searchRegex },
            { 'userDoc.email': searchRegex },
            { 'userDoc.name': searchRegex }
          ]
        }
      })
    }

    // Status filter matching
    if (status && status !== 'all') {
      if (status === 'reconciled') {
        pipeline.push({ $match: { reconciliationStatus: 'reconciled' } })
      } else if (status === 'attention_required') {
        pipeline.push({ $match: { reconciliationStatus: 'attention_required' } })
      } else if (status === 'captured') {
        pipeline.push({ $match: { status: 'captured' } })
      } else {
        pipeline.push({ $match: { status } })
      }
    }

    // Count match total
    const countPipeline = [...pipeline, { $count: 'total' }]
    const countResult = await Payment.aggregate(countPipeline)
    const totalCount = countResult[0]?.total || 0

    // Paginate results
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skipNum },
      { $limit: limitNum }
    )

    const payments = await Payment.aggregate(pipeline)

    res.json({
      payments,
      metrics: {
        totalRevenue,
        totalPayments,
        capturedPayments,
        pendingPayments,
        failedPayments,
        refundedPayments,
        reconciledPayments,
        attentionRequiredPayments,
      },
      pagination: {
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      }
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/payment/admin/reconcile — Admin Manual Reconcile Action trigger
export async function reconcilePaymentManual(req, res, next) {
  try {
    if (!req.admin && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required to manually reconcile payments.' })
    }

    const { razorpayOrderId, razorpayPaymentId, amountInRupees } = req.body

    if (!razorpayOrderId) {
      return res.status(400).json({ success: false, message: 'Missing razorpayOrderId.' })
    }

    // Try Custom Quote first
    const customRequest = await CustomRequest.findOne({ razorpayOrderId })
    if (customRequest) {
      const result = await processCustomQuotePaymentSuccess({
        customRequestId: customRequest._id,
        razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId || `manual-rec-${Date.now()}`,
      })

      return res.json({
        success: true,
        message: 'Custom Quote payment reconciled successfully.',
        alreadyProcessed: result?.alreadyProcessed,
      })
    }

    // Reconcile Standard Order
    const result = await processOrderPaymentSuccess({
      razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId || `manual-rec-${Date.now()}`,
      amountInRupees: amountInRupees || null,
      source: 'Admin Portal Manual Reconciliation',
    })

    if (result.success) {
      return res.json({
        success: true,
        message: 'Order payment reconciled successfully.',
        alreadyProcessed: result.alreadyProcessed,
        order: result.order,
      })
    }

    return res.status(400).json({
      success: false,
      message: `Failed to reconcile payment: ${result.reason}`,
    })
  } catch (err) {
    next(err)
  }
}
