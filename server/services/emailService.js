import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from './otp.service.js'
import {
  sendOrderConfirmation,
  sendOrderInvoice,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundNotice,
  sendNewsletterEmail,
} from './orderEmail.service.js'
import { sendEmail, validateEmail, compileTemplate } from './email.service.js'

export {
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
}

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
}
