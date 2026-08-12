import { sendEmail, compileTemplate } from './email.service.js'
import { sendWelcomeEmail } from './otp.service.js'

function formatPrice(val) {
  return Number(val || 0).toLocaleString('en-IN')
}

function buildItemsHtml(items = []) {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E6DDD0;">${item.title || item.name || 'Botanical Creation'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E6DDD0; text-align: center;">${item.qty || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E6DDD0; text-align: right; font-weight: bold;">₹${formatPrice((item.price || 0) * (item.qty || 1))}</td>
    </tr>
  `
    )
    .join('')
}

/**
 * ZeptoMail: Send Order Confirmation Email (From: orders@lilycharm.in)
 */
export async function sendOrderConfirmation(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const itemsHtml = buildItemsHtml(order.items)
  const shippingAddressStr = `${order.shippingAddress?.line1 || order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''} - ${order.shippingAddress?.pincode || ''} (Phone: ${order.shippingAddress?.phone || 'N/A'})`

  const html = compileTemplate('orderConfirmation.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    itemsHtml,
    subtotal: formatPrice(order.subtotal || order.total),
    discount: formatPrice(order.discountAmount || 0),
    shipping: formatPrice(order.shippingCharge || 0),
    grandTotal: formatPrice(order.grandTotal || order.total),
    shippingAddress: shippingAddressStr,
  })

  return await sendEmail({
    type: 'order-confirmation',
    to: recipientEmail,
    subject: `✨ Order Confirmed: ${order.orderNumber} - Lily Charm`,
    text: `Thank you for your order ${order.orderNumber}. Grand Total: ₹${order.grandTotal || order.total}.`,
    html,
  })
}

/**
 * ZeptoMail: Send Tax Invoice (From: orders@lilycharm.in with optional PDF attachment)
 */
export async function sendOrderInvoice(order, pdfBuffer = null) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const itemsHtml = buildItemsHtml(order.items)
  const attachments = []

  if (pdfBuffer) {
    attachments.push({
      filename: `Invoice_${order.orderNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    })
  }

  const html = compileTemplate('invoice.html', {
    orderNumber: order.orderNumber,
    invoiceDate: new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN'),
    customerName: order.shippingAddress?.name || 'Valued Customer',
    customerEmail: recipientEmail,
    paymentMethod: order.paymentMethod || 'Razorpay Prepaid',
    paymentId: order.razorpayPaymentId || 'PAID-ONLINE',
    itemsHtml,
    subtotal: formatPrice(order.subtotal || order.total),
    discount: formatPrice(order.discountAmount || 0),
    shipping: formatPrice(order.shippingCharge || 0),
    grandTotal: formatPrice(order.grandTotal || order.total),
  })

  return await sendEmail({
    type: 'invoice',
    to: recipientEmail,
    subject: `📄 Tax Invoice for Order ${order.orderNumber} - Lily Charm`,
    text: `Your tax invoice for order ${order.orderNumber} is attached.`,
    html,
    attachments,
  })
}

/**
 * ZeptoMail: Send Payment Success Email (From: orders@lilycharm.in)
 */
export async function sendPaymentSuccess(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const html = compileTemplate('paymentSuccess.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    paymentId: order.razorpayPaymentId || 'PAID-ONLINE',
    amountPaid: formatPrice(order.grandTotal || order.total),
    paymentMethod: order.paymentMethod || 'Razorpay Online Payment',
  })

  return await sendEmail({
    type: 'payment-success',
    to: recipientEmail,
    subject: `💳 Payment Received: Order ${order.orderNumber} - Lily Charm`,
    text: `Payment of ₹${order.grandTotal || order.total} received successfully for order ${order.orderNumber}.`,
    html,
  })
}

/**
 * ZeptoMail: Send Order Packed Email (From: orders@lilycharm.in)
 */
export async function sendOrderPacked(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const html = compileTemplate('packed.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
  })

  return await sendEmail({
    type: 'order-packed',
    to: recipientEmail,
    subject: `📦 Order Packed: ${order.orderNumber} - Lily Charm`,
    text: `Your order ${order.orderNumber} has been packed with care.`,
    html,
  })
}

/**
 * ZeptoMail: Send Order Shipped Email (From: orders@lilycharm.in)
 */
export async function sendOrderShipped(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const html = compileTemplate('shipped.html', {
    statusTitle: 'Order Dispatched & In Transit',
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    carrier: order.carrier || 'BlueDart / Delhivery',
    trackingNumber: order.trackingNumber || 'TRACK-LIVE',
    note: 'Your package is on its way to your delivery address.',
    trackingUrl: `${clientUrl}/account`,
  })

  return await sendEmail({
    type: 'order-shipped',
    to: recipientEmail,
    subject: `🚚 Order Shipped: ${order.orderNumber} - Lily Charm`,
    text: `Your order ${order.orderNumber} is in transit via ${order.carrier || 'BlueDart'}. Tracking #: ${order.trackingNumber || 'N/A'}`,
    html,
  })
}

/**
 * ZeptoMail: Send Out For Delivery Email (From: orders@lilycharm.in)
 */
export async function sendOrderOutForDelivery(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const shippingAddressStr = `${order.shippingAddress?.line1 || order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''} - ${order.shippingAddress?.pincode || ''}`
  const html = compileTemplate('outForDelivery.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    shippingAddress: shippingAddressStr,
  })

  return await sendEmail({
    type: 'out-for-delivery',
    to: recipientEmail,
    subject: `🚚 Out for Delivery Today: ${order.orderNumber} - Lily Charm`,
    text: `Your order ${order.orderNumber} is out for delivery today!`,
    html,
  })
}

/**
 * ZeptoMail: Send Order Delivered Email (From: orders@lilycharm.in)
 */
export async function sendOrderDelivered(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const html = compileTemplate('delivered.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    reviewUrl: `${clientUrl}/account`,
  })

  return await sendEmail({
    type: 'order-delivered',
    to: recipientEmail,
    subject: `🎉 Delivered: Order ${order.orderNumber} - Lily Charm`,
    text: `Your order ${order.orderNumber} has been delivered. Enjoy your botanical art!`,
    html,
  })
}

/**
 * ZeptoMail: Send Refund Approved Email (From: orders@lilycharm.in)
 */
export async function sendRefundApproved(order) {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const refundAmount = order.refundAmount || order.grandTotal || order.total
  const html = compileTemplate('refundApproved.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    refundAmount: formatPrice(refundAmount),
    refundId: order.refundId || 'REFUND-PROCESSED',
  })

  return await sendEmail({
    type: 'refund-approved',
    to: recipientEmail,
    subject: `💰 Refund Approved: Order ${order.orderNumber} - Lily Charm`,
    text: `Your refund of ₹${refundAmount} for order ${order.orderNumber} has been approved.`,
    html,
  })
}

/**
 * ZeptoMail: Send Refund Rejected Email (From: orders@lilycharm.in)
 */
export async function sendRefundRejected(order, reason = '') {
  const recipientEmail = order.shippingAddress?.email || order.email
  if (!recipientEmail) return null

  const html = compileTemplate('refundRejected.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    rejectionReason: reason || order.refundReason || 'Does not meet return window conditions.',
  })

  return await sendEmail({
    type: 'refund-rejected',
    to: recipientEmail,
    subject: `⚠️ Refund Notice: Order ${order.orderNumber} - Lily Charm`,
    text: `Your refund request for order ${order.orderNumber} could not be approved.`,
    html,
  })
}

/**
 * ZeptoMail: Send Refund Notice Wrapper
 */
export async function sendRefundNotice(order, isApproved = true, amount = 0, reason = '') {
  if (isApproved) {
    order.refundAmount = amount || order.refundAmount
    return await sendRefundApproved(order)
  } else {
    return await sendRefundRejected(order, reason)
  }
}

/**
 * ZeptoMail: Send Newsletter Broadcast Email (From: contact@lilycharm.in)
 */
export async function sendNewsletterEmail(recipients = [], subject, content) {
  const results = []
  const emailList = Array.isArray(recipients) ? recipients : [recipients]
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  for (const email of emailList) {
    try {
      const html = compileTemplate('newsletter.html', {
        subject: subject || 'Lily Charm Botanical Newsletter',
        heading: subject || 'Exclusive Botanical Updates',
        customerName: 'Valued Collector',
        messageBody: content || 'Discover our latest handcrafted velvet botanical collections.',
        ctaUrl: `${clientUrl}/collections`,
        ctaText: 'Explore Collection',
      })

      const res = await sendEmail({
        type: 'newsletter',
        to: email,
        subject: subject || '🌸 Lily Charm Newsletter',
        html,
      })
      results.push(res)
    } catch (e) {
      console.error(`Failed to send newsletter to ${email}:`, e.message)
    }
  }
  return results
}

export default {
  sendOrderConfirmation,
  sendOrderInvoice,
  sendPaymentSuccess,
  sendOrderPacked,
  sendOrderShipped,
  sendOrderOutForDelivery,
  sendOrderDelivered,
  sendRefundApproved,
  sendRefundRejected,
  sendRefundNotice,
  sendNewsletterEmail,
}
