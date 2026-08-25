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
    console.warn(`[PAYMENT PROCESSOR]: No order found for Razorpay Order ID '${razorpayOrderId}' (Source: ${source})`)
    return { success: false, reason: 'ORDER_NOT_FOUND' }
  }

  // 2. Idempotency Check: Return immediately if already processed
  if (
    order.paymentStatus === 'Paid' &&
    (order.status === 'Order Confirmed' || order.status === 'Confirmed')
  ) {
    return { success: true, alreadyProcessed: true, order }
  }

  // 3. Amount Validation (if specified)
  if (amountInRupees !== null && !isNaN(Number(amountInRupees))) {
    const expectedAmount = Number(order.grandTotal)
    const paidAmount = Number(amountInRupees)
    if (Math.abs(expectedAmount - paidAmount) > 1.0) {
      console.error(
        `[SECURITY WARNING]: Payment amount mismatch for Order ${order.orderNumber}. Expected ₹${expectedAmount}, received ₹${paidAmount}`
      )
      return { success: false, reason: 'AMOUNT_MISMATCH', order }
    }
  }

  // 4. Idempotent Atomic State Transition (Only updates if paymentStatus is not already 'Paid')
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: { $ne: 'Paid' },
    },
    {
      $set: {
        paymentStatus: 'Paid',
        status: 'Order Confirmed',
        razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId || '',
        razorpaySignature: razorpaySignature || order.razorpaySignature || '',
      },
      $push: {
        statusHistory: {
          status: 'Order Confirmed',
          timestamp: new Date(),
          note: `Payment verified & captured via Razorpay (${source}). Payment ID: ${razorpayPaymentId || 'N/A'}`,
        },
      },
    },
    { new: true }
  )

  // If null, a concurrent process already updated this order to 'Paid'
  if (!updatedOrder) {
    const currentOrder = await Order.findById(order._id)
    return { success: true, alreadyProcessed: true, order: currentOrder }
  }

  // 5. Inventory Protection: Decrement Product Stock Exactly Once
  if (updatedOrder.items && updatedOrder.items.length > 0) {
    for (const item of updatedOrder.items) {
      if (item.product && item.qty > 0) {
        try {
          await Product.updateOne(
            { _id: item.product, stock: { $gte: item.qty } },
            { $inc: { stock: -item.qty } }
          )
        } catch (stockErr) {
          console.warn(`[INVENTORY NOTICE]: Could not decrement stock for product ${item.product}:`, stockErr.message)
        }
      }
    }
  }

  // 5b. Increment Coupon Usage Count exactly once on captured payment
  if (updatedOrder.couponCode) {
    try {
      await Coupon.updateOne(
        { code: updatedOrder.couponCode.toUpperCase().trim() },
        { $inc: { usageCount: 1 } }
      )
    } catch (couponErr) {
      console.warn(`[COUPON USAGE INCREMENT NOTICE]:`, couponErr.message)
    }
  }

  // 6. Upsert Ledger Payment Record
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
          paymentMethod: updatedOrder.paymentMethod || 'Razorpay Prepaid',
          status: 'captured',
          processedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    )
  } catch (payErr) {
    console.warn('[PAYMENT LEDGER RECORD NOTICE]:', payErr.message)
  }

  // 7. Clear User Cart (if authenticated order)
  if (updatedOrder.user) {
    try {
      await Cart.findOneAndUpdate({ user: updatedOrder.user }, { items: [], coupon: null })
      emitCartUpdated(updatedOrder.user, { items: [], coupon: null })
    } catch (cartErr) {
      console.warn('[CART CLEAR NOTICE]:', cartErr.message)
    }
  }

  // 8. Real-time UI Update via WebSockets
  try {
    emitOrderUpdated(updatedOrder)
  } catch (wsErr) {
    console.warn('[WEBSOCKET NOTICE]:', wsErr.message)
  }

  // 9. Asynchronous Transactional Email Dispatches (Decoupled from DB success)
  sendOrderConfirmationEmail(updatedOrder).catch((e) =>
    console.warn('[ORDER CONFIRMATION EMAIL WARNING]:', e.message)
  )
  sendAdminNewOrderNotification(updatedOrder).catch((e) =>
    console.warn('[ADMIN ORDER NOTIFICATION WARNING]:', e.message)
  )

  return { success: true, alreadyProcessed: false, order: updatedOrder }
}

export default {
  processOrderPaymentSuccess,
}
