import {
  getCustomerTransactionalEmail,
  sendOrderConfirmation,
  sendOrderInvoice,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundNotice,
} from '../services/orderEmail.service.js'
import { sendEmail } from '../services/email.service.js'

export { getCustomerTransactionalEmail }

export async function sendOrderConfirmationEmail(order) {
  try {
    return await sendOrderConfirmation(order)
  } catch (err) {
    console.warn('[ORDER CONFIRMATION EMAIL WARNING]:', err.message || err)
    return { success: false, error: err.message }
  }
}

export async function sendOrderStatusEmail(order, newStatus, note = '') {
  try {
    const statusLower = (newStatus || '').toLowerCase().trim()

    // 1. Shipped / Dispatched (Picked Up by Courier) / In Transit
    if (
      statusLower === 'shipped' ||
      statusLower === 'dispatched' ||
      statusLower === 'packed & dispatched' ||
      statusLower.includes('shipped') ||
      statusLower.includes('dispatched') ||
      statusLower.includes('pickup') ||
      statusLower.includes('picked up') ||
      statusLower.includes('transit')
    ) {
      return await sendOrderShipped(order)
    }

    // 2. Packed & Sealed (Prepared in studio before courier pickup)
    if (statusLower === 'packed' || (statusLower.includes('packed') && !statusLower.includes('dispatched'))) {
      return await sendOrderPacked(order)
    }

    // 3. Out For Delivery
    if (statusLower.includes('out for delivery')) {
      return await sendOrderOutForDelivery(order)
    }

    // 4. Delivered / Completed
    if (statusLower.includes('delivered') || statusLower.includes('completed')) {
      return await sendOrderDelivered(order)
    }

    // 5. Refund / Cancelled
    if (statusLower.includes('refund') || statusLower.includes('cancelled')) {
      return await sendRefundNotice(order, true, order.refundAmount, note)
    }

    // 6. Internal / Studio steps (Processing, Handcrafting, Confirmed, Paid, Pending Payment) -> Do NOT send dispatch email
    return { success: true, skipped: true, reason: `No customer email needed for status: ${newStatus}` }
  } catch (err) {
    console.warn('[ORDER STATUS EMAIL WARNING]:', err.message || err)
    return { success: false, error: err.message }
  }
}

export async function sendAdminNewOrderNotification(order) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'keerthanabm@lilycharm.in'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px;">
        <h2 style="color: #212B1C;">🚨 New Paid Order Received: ${order.orderNumber}</h2>
        <p><strong>Customer:</strong> ${order.shippingAddress?.name} (${order.shippingAddress?.phone || order.shippingAddress?.email})</p>
        <p><strong>Total Amount:</strong> ₹${(order.grandTotal || order.total || 0).toLocaleString('en-IN')}</p>
        <p><strong>Payment ID:</strong> ${order.razorpayPaymentId || 'PAID-ONLINE'}</p>
        <p>Log in to the Studio Admin Dashboard to process this order.</p>
      </div>
    `

    return await sendEmail({
      type: 'admin-notification',
      to: adminEmail,
      subject: `🔔 NEW ORDER: ${order.orderNumber} (₹${order.grandTotal || order.total})`,
      html,
    })
  } catch (err) {
    console.warn('[ADMIN NOTIFICATION EMAIL WARNING]:', err.message || err)
    return { success: false, error: err.message }
  }
}

export default {
  getCustomerTransactionalEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendAdminNewOrderNotification,
}
