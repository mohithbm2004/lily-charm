import { sendEmail, compileTemplate } from './email.service.js'
import { sendWelcomeEmail } from './otp.service.js'
import User from '../models/User.js'

function formatPrice(val) {
  return Number(val || 0).toLocaleString('en-IN')
}

/**
 * Centralized Recipient Selector for Customer Transactional Emails:
 * Ensures all transactional emails (order confirmation, status updates, invoices, refunds, quotes)
 * are ALWAYS dispatched to the customer's REGISTERED ACCOUNT EMAIL ADDRESS when an account exists.
 *
 * Hierarchy:
 * 1. If explicit user object/doc provided with email -> user.email
 * 2. If order/request has a linked user ID -> fetch User from DB -> user.email
 * 3. If order/request has email or shippingAddress.email matching a registered account -> user.email
 * 4. Guest checkout only (no registered account in DB) -> order.email || order.shippingAddress.email
 */
export async function getCustomerTransactionalEmail(orderOrRequest, explicitUser = null) {
  if (!orderOrRequest && !explicitUser) return null

  // 1. Explicit User object or document passed
  if (explicitUser && explicitUser.email) {
    return explicitUser.email.toLowerCase().trim()
  }

  // 2. Populated or referenced user on the order/request
  const candidateUserId = orderOrRequest?.user?._id || orderOrRequest?.user || orderOrRequest?.userId
  if (candidateUserId) {
    if (typeof candidateUserId === 'object' && candidateUserId.email) {
      return candidateUserId.email.toLowerCase().trim()
    }
    try {
      const dbUser = await User.findById(candidateUserId).select('email')
      if (dbUser && dbUser.email) {
        return dbUser.email.toLowerCase().trim()
      }
    } catch (e) {
      console.warn('[GET TRANSACTIONAL EMAIL] Error looking up userId:', e.message)
    }
  }

  // 3. Fallback database lookup: Check if any contact/shipping email matches a registered user in DB
  const rawCandidateEmails = [
    orderOrRequest?.email,
    orderOrRequest?.shippingAddress?.email,
    orderOrRequest?.billingAddress?.email,
  ]
    .filter(Boolean)
    .map((e) => e.toLowerCase().trim())

  if (rawCandidateEmails.length > 0) {
    try {
      const matchedUser = await User.findOne({
        $or: [
          { email: { $in: rawCandidateEmails } },
          { alternateEmails: { $in: rawCandidateEmails } },
        ],
      }).select('email')

      if (matchedUser && matchedUser.email) {
        return matchedUser.email.toLowerCase().trim()
      }
    } catch (e) {
      console.warn('[GET TRANSACTIONAL EMAIL] Error looking up candidate emails:', e.message)
    }
  }

  // 4. Guest checkout ONLY: When no authenticated/registered account exists in the database
  const guestEmail =
    orderOrRequest?.email ||
    orderOrRequest?.shippingAddress?.email ||
    orderOrRequest?.billingAddress?.email
  return guestEmail ? guestEmail.toLowerCase().trim() : null
}

function buildItemsHtml(items = []) {
  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'
  return items
    .map((item) => {
      let imgSrc = item.image || (Array.isArray(item.images) ? item.images[0] : '') || ''
      if (imgSrc && imgSrc.startsWith('/')) {
        imgSrc = `${clientUrl}${imgSrc}`
      }
      const title = item.title || item.name || 'Handcrafted Botanical Artwork'
      const qty = item.qty || 1
      const price = formatPrice((item.price || 0) * qty)
      const specimen =
        item.specimen && item.specimen !== 'Specimen' && item.specimen !== 'CUSTOM-DESIGN'
          ? `<div style="font-size: 11px; color: #7A6652; margin-top: 2px;">${item.specimen}</div>`
          : ''

      const imageTd = imgSrc
        ? `<td style="padding: 12px 10px 12px 14px; border-bottom: 1px solid #EFEAE1; width: 62px; vertical-align: middle;">
             <img src="${imgSrc}" alt="${title}" width="52" height="52" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover; border: 1px solid #EAE3D5; background: #FAF7F2; display: block;" />
           </td>`
        : `<td style="padding: 12px 10px 12px 14px; border-bottom: 1px solid #EFEAE1; width: 62px; vertical-align: middle;">
             <div style="width: 52px; height: 52px; border-radius: 8px; background-color: #F6F2EA; border: 1px solid #EAE3D5; text-align: center; line-height: 52px; font-size: 22px;">🌸</div>
           </td>`

      return `
        <tr>
          ${imageTd}
          <td style="padding: 12px 10px; border-bottom: 1px solid #EFEAE1; vertical-align: middle;">
            <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 14px; font-weight: 600; color: #2D3926; line-height: 1.35;">${title}</div>
            ${specimen}
          </td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #EFEAE1; text-align: center; font-size: 14px; color: #2D3926; font-weight: 600; vertical-align: middle;">
            ${qty}
          </td>
          <td style="padding: 12px 16px 12px 10px; border-bottom: 1px solid #EFEAE1; text-align: right; font-weight: bold; font-size: 14px; color: #2D3926; vertical-align: middle;">
            ₹${price}
          </td>
        </tr>
      `
    })
    .join('')
}

/**
 * ZeptoMail: Send Order Confirmation Email (From: orders@lilycharm.in)
 */
export async function sendOrderConfirmation(order) {
  const recipientEmail = await getCustomerTransactionalEmail(order)
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'
  const itemsHtml = buildItemsHtml(order.items)
  const shipAddr = order.shippingAddress || {}
  const line1 = shipAddr.line1 || shipAddr.address || 'Studio Address'
  const city = shipAddr.city || ''
  const pincode = shipAddr.pincode || ''
  const phone = shipAddr.phone || 'N/A'
  const addressFormatted = `${line1}${city ? `, ${city}` : ''}${pincode ? ` - ${pincode}` : ''}`

  const shippingChargeVal = Number(order.shippingCharge || 0)
  const shippingFormatted = shippingChargeVal === 0 ? '₹0' : `₹${formatPrice(shippingChargeVal)}`

  const html = compileTemplate('orderConfirmation.html', {
    clientUrl,
    customerName: shipAddr.name || 'Valued Collector',
    orderNumber: order.orderNumber,
    itemsHtml,
    subtotal: formatPrice(order.subtotal || order.total),
    discount: formatPrice(order.discountAmount || 0),
    shipping: shippingFormatted,
    grandTotal: formatPrice(order.grandTotal || order.total),
    shippingAddress: addressFormatted,
    shippingPhone: phone,
    supportEmail: 'support@lilycharm.in',
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
  if (!recipientEmail) return null

  const html = compileTemplate('paymentSuccess.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    paymentId: order.razorpayPaymentId || 'PAID-ONLINE',
    amount: formatPrice(order.grandTotal || order.total),
    paymentMethod: order.paymentMethod || 'Razorpay Online Payment',
    orderUrl: `${process.env.CLIENT_URL || 'https://lilycharm.in'}/account`,
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'
  const html = compileTemplate('shipped.html', {
    statusTitle: 'Order Dispatched & In Transit',
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    carrier: order.carrier || 'BlueDart / Delhivery',
    trackingNumber: order.trackingNumber || 'TRACK-LIVE',
    note: order.notes || 'Your package is on its way to your delivery address.',
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
  if (!recipientEmail) return null

  const refundAmount = order.refundAmount || order.grandTotal || order.total
  const html = compileTemplate('refundApproved.html', {
    customerName: order.shippingAddress?.name || 'Valued Customer',
    orderNumber: order.orderNumber,
    refundAmount: formatPrice(refundAmount),
    refundId: order.refundId || order.razorpayRefundId || 'REFUND-PROCESSED',
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
  const recipientEmail = await getCustomerTransactionalEmail(order)
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
  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'

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

/**
 * ZeptoMail: Send Custom Design Quote Ready Email
 */
export async function sendCustomQuoteReadyEmail(customRequest) {
  const recipientEmail = await getCustomerTransactionalEmail(customRequest)
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'
  const actionUrl = `${clientUrl}/pay-quote/${customRequest._id || customRequest.id}`
  const dashboardUrl = `${clientUrl}/dashboard`

  const adminNotesHtml = customRequest.adminNotes
    ? `<div style="margin-top: 10px; font-size: 13px; color: #4A3E39; line-height: 1.5;"><strong>Artisan Note:</strong> <em>${customRequest.adminNotes}</em></div>`
    : ''

  const price = Number(customRequest.quotedPrice || 0)
  const shippingNote =
    price >= 2500
      ? '✨ <strong>Free Standard Studio Shipping</strong> applies to this custom artwork.'
      : '📦 Standard Studio Delivery applies at checkout.'

  const html = compileTemplate('customQuoteReady.html', {
    customerName: customRequest.name || 'Valued Collector',
    stylePreference: customRequest.stylePreference || 'Bespoke Botanical Artwork',
    quotedPrice: formatPrice(price),
    adminNotesHtml,
    shippingNote,
    actionUrl,
    dashboardUrl,
  })

  return await sendEmail({
    type: 'order',
    to: recipientEmail,
    subject: `✨ Custom Design Quote Ready: ₹${formatPrice(price)} — Lily Charm`,
    text: `Your custom botanical quote for "${customRequest.stylePreference}" is ready: ₹${formatPrice(price)}. Review and place order at ${actionUrl}`,
    html,
  })
}

/**
 * ZeptoMail: Send Custom Design Request Rejected Email with Reason
 */
export async function sendCustomRequestRejectedEmail(customRequest, rejectionReason = '') {
  const recipientEmail = await getCustomerTransactionalEmail(customRequest)
  if (!recipientEmail) return null

  const clientUrl = process.env.CLIENT_URL || 'https://lilycharm.in'
  const shopUrl = `${clientUrl}/shop`

  const finalReason =
    rejectionReason ||
    customRequest.adminNotes ||
    'Due to botanical availability and current atelier production capacity, we are unable to handcraft this specific bespoke design concept at this time.'

  const html = compileTemplate('customRequestRejected.html', {
    customerName: customRequest.name || 'Valued Collector',
    stylePreference: customRequest.stylePreference || 'Custom Botanical Concept',
    rejectionReason: finalReason,
    shopUrl,
  })

  return await sendEmail({
    type: 'support',
    to: recipientEmail,
    subject: `Update on Your Custom Design Request — Lily Charm`,
    text: `Update regarding your custom botanical design request for "${customRequest.stylePreference}": ${finalReason}. Explore ready-to-ship artwork at ${shopUrl}`,
    html,
  })
}

export default {
  getCustomerTransactionalEmail,
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
  sendCustomQuoteReadyEmail,
  sendCustomRequestRejectedEmail,
}
