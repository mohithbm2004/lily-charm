import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from './otp.service.js'
import {
  getCustomerTransactionalEmail,
  sendOrderConfirmation,
  sendOrderInvoice,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundNotice,
  sendNewsletterEmail,
} from './orderEmail.service.js'
import {
  sendEmail,
  validateEmail,
  compileTemplate,
  SENDER_ADDRESSES,
  getSenderByPurpose,
} from './email.service.js'

export {
  getCustomerTransactionalEmail,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderInvoice,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundNotice,
  sendNewsletterEmail,
  sendEmail,
  validateEmail,
  compileTemplate,
  SENDER_ADDRESSES,
  getSenderByPurpose,
}

export async function sendOrderConfirmationEmail(order) {
  return await sendOrderConfirmation(order)
}

export async function sendOrderStatusEmail(order, newStatus, note = '') {
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
}

export default {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmation,
  sendOrderInvoice,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundNotice,
  sendNewsletterEmail,
  sendEmail,
  validateEmail,
  compileTemplate,
  SENDER_ADDRESSES,
  getSenderByPurpose,
}
