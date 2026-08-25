import Order from '../models/Order.js'
import CustomRequest from '../models/CustomRequest.js'
import razorpay from '../config/razorpay.js'
import { processOrderPaymentSuccess } from './paymentProcessor.js'
import { processCustomQuotePaymentSuccess } from '../controllers/customRequestController.js'

/**
 * Automated Payment Reconciliation Service for Lily Charm
 * 
 * Periodically scans for orders in 'Pending Payment' state where:
 * 1. The customer closed their browser tab after payment capture.
 * 2. The Razorpay Webhook was dropped, delayed, or failed to deliver.
 * 3. The frontend payment callback was interrupted by network drops.
 * 
 * Queries Razorpay REST API directly to verify actual capture status and
 * processes payments idempotently.
 */
export async function reconcilePendingPayments() {
  if (!razorpay || !razorpay.orders) {
    return { reconciledCount: 0, message: 'Razorpay SDK not configured.' }
  }

  let reconciledCount = 0

  // 1. Reconcile Standard Orders created in last 24h that are still 'Pending'
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000) // Allow 3 mins for live callback/webhook

    const pendingOrders = await Order.find({
      paymentStatus: 'Pending',
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $gte: twentyFourHoursAgo, $lte: threeMinutesAgo },
    }).limit(50)

    for (const order of pendingOrders) {
      try {
        const rzpOrder = await razorpay.orders.fetch(order.razorpayOrderId)
        if (rzpOrder && rzpOrder.status === 'paid') {
          // Fetch payment details for this Razorpay Order
          const payments = await razorpay.orders.fetchPayments(order.razorpayOrderId)
          const capturedPayment = (payments?.items || []).find((p) => p.status === 'captured') || payments?.items?.[0]

          if (capturedPayment) {
            console.log(
              `[RECONCILIATION]: Found captured payment (${capturedPayment.id}) for Pending Order ${order.orderNumber}. Reconciling...`
            )
            const result = await processOrderPaymentSuccess({
              razorpayOrderId: order.razorpayOrderId,
              razorpayPaymentId: capturedPayment.id,
              amountInRupees: (capturedPayment.amount || 0) / 100,
              source: 'Automated Reconciliation Worker',
            })
            if (result.success && !result.alreadyProcessed) {
              reconciledCount++
            }
          }
        }
      } catch (err) {
        console.warn(`[RECONCILIATION NOTICE]: Error checking Razorpay order ${order.razorpayOrderId}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[RECONCILIATION ERROR]: Error scanning pending orders:', err.message)
  }

  // 2. Reconcile Custom Quote Requests in 'Quoted' state
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000)

    const pendingQuotes = await CustomRequest.find({
      status: 'Quoted',
      razorpayOrderId: { $exists: true, $ne: '' },
      createdAt: { $gte: twentyFourHoursAgo, $lte: threeMinutesAgo },
    }).limit(20)

    for (const quote of pendingQuotes) {
      try {
        const rzpOrder = await razorpay.orders.fetch(quote.razorpayOrderId)
        if (rzpOrder && rzpOrder.status === 'paid') {
          const payments = await razorpay.orders.fetchPayments(quote.razorpayOrderId)
          const capturedPayment = (payments?.items || []).find((p) => p.status === 'captured') || payments?.items?.[0]

          if (capturedPayment) {
            console.log(
              `[RECONCILIATION]: Found captured payment (${capturedPayment.id}) for Custom Quote ${quote._id}. Reconciling...`
            )
            await processCustomQuotePaymentSuccess({
              customRequestId: quote._id,
              razorpayOrderId: quote.razorpayOrderId,
              razorpayPaymentId: capturedPayment.id,
            })
            reconciledCount++
          }
        }
      } catch (err) {
        console.warn(`[RECONCILIATION NOTICE]: Error checking custom quote ${quote._id}:`, err.message)
      }
    }
  } catch (err) {
    console.error('[RECONCILIATION ERROR]: Error scanning custom quotes:', err.message)
  }

  return { reconciledCount }
}

/**
 * Initializes background interval timer for automated reconciliation
 */
export function startReconciliationWorker(intervalMs = 10 * 60 * 1000) {
  console.log('🔄 Lily Charm Payment Reconciliation Worker initialized (Interval: 10 mins)')
  
  // Run once on server startup after 30 seconds
  setTimeout(() => {
    reconcilePendingPayments().catch((e) =>
      console.warn('[RECONCILIATION STARTUP NOTICE]:', e.message)
    )
  }, 30000)

  // Recurring interval
  setInterval(() => {
    reconcilePendingPayments().catch((e) =>
      console.warn('[RECONCILIATION INTERVAL NOTICE]:', e.message)
    )
  }, intervalMs)
}

export default {
  reconcilePendingPayments,
  startReconciliationWorker,
}
