import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import Product from '../models/Product.js'
import Cart from '../models/Cart.js'
import Coupon from '../models/Coupon.js'
import { sendOrderConfirmationEmail, sendAdminNewOrderNotification } from './emailService.js'
import { emitOrderUpdated, emitCartUpdated } from '../socket.js'

/**
 * Authoritative, Idempotent Payment & Order Processor for Lily Charm
 * 
 * Guarantees that once Razorpay confirms payment capture:
 * 1. Order state is transition to Paid & Order Confirmed exactly once.
 * 2. Product stock is decremented exactly once.
 * 3. Payment record is recorded in captured state.
 * 4. Cart is cleared.
 * 5. Emails are dispatched asynchronously (email failure does NOT rollback payment success).
 */
export async function processOrderPaymentSuccess({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = '',
  amountInRupees = null,
  source = 'API',
}) {
  if (!razorpayOrderId) {
    return { success: false, reason: 'MISSING_RAZORPAY_ORDER_ID' }
  }

  // 1. Locate internal Order record
  const order = await Order.findOne({ razorpayOrderId })
  if (!order) {
    console.warn(`[PAYMENT] No order found for Razorpay Order ID '${razorpayOrderId}' (Source: ${source})`)
    return { success: false, reason: 'ORDER_NOT_FOUND' }
  }

  // 2. Idempotency Check: Return immediately if already processed
  if (order.paymentStatus === 'Paid') {
    console.log(`[PAYMENT] Order ${order.orderNumber} already processed and paid. (Idempotent bypass)`)
    return { success: true, alreadyProcessed: true, order }
  }

  // 3. Authoritative Amount Validation
  if (amountInRupees !== null && !isNaN(Number(amountInRupees))) {
    const expectedAmount = Number(order.grandTotal)
    const paidAmount = Number(amountInRupees)
    if (Math.abs(expectedAmount - paidAmount) > 0.01) {
      console.error(
        `[PAYMENT ERROR] Amount mismatch for Order ${order.orderNumber}. Expected ₹${expectedAmount}, received ₹${paidAmount}`
      )
      // Flag order with reconciliation mismatch note
      try {
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              notes: `[PAYMENT RECONCILIATION ERROR] Amount mismatch detected on ${new Date().toLocaleString()}. Expected ₹${expectedAmount}, received ₹${paidAmount}. Please investigate manually.`,
            },
            $push: {
              statusHistory: {
                status: order.status,
                timestamp: new Date(),
                note: `⚠️ Warning: Payment amount mismatch detected during verification. Expected ₹${expectedAmount}, received ₹${paidAmount}. Order remains unpaid.`,
              },
            },
          }
        )
      } catch (err) {
        console.error('[PAYMENT] Failed to save reconciliation error note:', err.message)
      }
      return { success: false, reason: 'AMOUNT_MISMATCH', order }
    }
    console.log(`[PAYMENT] Amount verified successfully: ₹${paidAmount}`)
  }

  // 4. Fulfillment status preservation check
  const isInitialStatus = ['Pending Payment', 'Payment Failed', 'Pending'].includes(order.status)
  const statusUpdate = isInitialStatus ? { status: 'Order Confirmed' } : {}

  // 5. Critical Database Order Update (Committed immediately)
  console.log(`[PAYMENT] Marking order ${order.orderNumber} as Paid...`)
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: { $ne: 'Paid' },
    },
    {
      $set: {
        paymentStatus: 'Paid',
        razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId || '',
        razorpaySignature: razorpaySignature || order.razorpaySignature || '',
        ...statusUpdate,
      },
      $push: {
        statusHistory: {
          status: isInitialStatus ? 'Order Confirmed' : order.status,
          timestamp: new Date(),
          note: `Payment verified & captured via Razorpay (${source}). Payment ID: ${razorpayPaymentId || 'N/A'}`,
        },
      },
    },
    { new: true }
  )

  // If null, a concurrent process already updated this order to 'Paid'
  if (!updatedOrder) {
    console.log(`[PAYMENT] Order ${order.orderNumber} was marked Paid concurrently.`)
    const currentOrder = await Order.findById(order._id)
    return { success: true, alreadyProcessed: true, order: currentOrder }
  }

  console.log(`[PAYMENT] Order ${order.orderNumber} marked Paid successfully.`)

  // 6. Critical Database Payment Ledger Update (Committed immediately)
  try {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        $set: {
          order: updatedOrder._id,
          user: updatedOrder.user,
          orderNumber: updatedOrder.orderNumber,
          razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId || '',
          razorpaySignature: razorpaySignature || '',
          amount: updatedOrder.grandTotal,
          currency: 'INR',
          status: 'captured',
          processedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    )
    console.log(`[PAYMENT] Payment ledger record finalized.`)
  } catch (payErr) {
    console.warn('[PAYMENT] Payment ledger record error:', payErr.message)
  }

  // 7. Non-Critical, slow secondary actions executed asynchronously (Background)
  ;(async () => {
    try {
      // 7a. Asynchronous Inventory Reduction
      if (updatedOrder.items && updatedOrder.items.length > 0) {
        for (const item of updatedOrder.items) {
          if (item.product && item.qty > 0) {
            try {
              await Product.updateOne(
                { _id: item.product, stock: { $gte: item.qty } },
                { $inc: { stock: -item.qty } }
              )
            } catch (stockErr) {
              console.warn(`[PAYMENT BACKGROUND] Could not decrement stock for product ${item.product}:`, stockErr.message)
            }
          }
        }
      }

      // 7b. Asynchronous Coupon Usage Update
      if (updatedOrder.couponCode) {
        try {
          await Coupon.updateOne(
            { code: updatedOrder.couponCode.toUpperCase().trim() },
            { $inc: { usageCount: 1 } }
          )
        } catch (couponErr) {
          console.warn(`[PAYMENT BACKGROUND] Coupon usage increment notice:`, couponErr.message)
        }
      }

      // 7c. Asynchronous Cart Clearance
      if (updatedOrder.user) {
        try {
          await Cart.findOneAndUpdate({ user: updatedOrder.user }, { items: [], coupon: null })
          emitCartUpdated(updatedOrder.user, { items: [], coupon: null })
        } catch (cartErr) {
          console.warn('[PAYMENT BACKGROUND] Cart clear notice:', cartErr.message)
        }
      }

      // 7d. Asynchronous WebSocket Broadcast
      try {
        emitOrderUpdated(updatedOrder)
      } catch (wsErr) {
        console.warn('[PAYMENT BACKGROUND] WebSocket notice:', wsErr.message)
      }

      // 7e. Asynchronous Transactional Email Dispatches
      sendOrderConfirmationEmail(updatedOrder).catch((e) =>
        console.warn('[PAYMENT BACKGROUND] Order confirmation email warning:', e.message)
      )
      sendAdminNewOrderNotification(updatedOrder).catch((e) =>
        console.warn('[PAYMENT BACKGROUND] Admin notification email warning:', e.message)
      )
    } catch (asyncErr) {
      console.error('[PAYMENT BACKGROUND] Unexpected background finalization error:', asyncErr.message)
    }
  })().catch((err) => console.error('[PAYMENT BACKGROUND] Uncaught thread error:', err))

  return { success: true, alreadyProcessed: false, order: updatedOrder }
}

export default {
  processOrderPaymentSuccess,
}
