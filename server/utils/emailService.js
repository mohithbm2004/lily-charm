import {
  sendOrderConfirmation,
  sendOrderInvoice,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundNotice,
} from '../services/orderEmail.service.js'
import { sendEmail } from '../services/email.service.js'

export async function sendOrderConfirmationEmail(order) {
  return await sendOrderConfirmation(order)
}

export async function sendOrderStatusEmail(order, newStatus, note = '') {
  const statusLower = (newStatus || '').toLowerCase()
  if (statusLower.includes('packed')) {
    return await sendOrderPacked(order)
  }
  if (statusLower.includes('shipped') || statusLower.includes('dispatched') || statusLower.includes('transit')) {
    return await sendOrderShipped(order)
  }
  if (statusLower.includes('out for delivery')) {
    return await sendOrderOutForDelivery(order)
  }
  if (statusLower.includes('delivered') || statusLower.includes('completed')) {
    return await sendOrderDelivered(order)
  }
  if (statusLower.includes('refund')) {
    return await sendRefundNotice(order, true, order.refundAmount, note)
  }
  return await sendOrderShipped(order)
}

export async function sendAdminNewOrderNotification(order) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@lilycharm.com'
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
    provider: 'ses',
    type: 'admin-notification',
    to: adminEmail,
    subject: `🔔 NEW ORDER: ${order.orderNumber} (₹${order.grandTotal || order.total})`,
    html,
  })
}

export default {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendAdminNewOrderNotification,
}
