import nodemailer from 'nodemailer'

/**
 * Creates a Nodemailer transporter instance for a given ZeptoMail Mail Agent configuration.
 */
function createAgentTransport({ host, port, user, pass, label }) {
  if (!pass) {
    return null
  }

  return nodemailer.createTransport({
    host: host || 'smtp.zeptomail.in',
    port: Number(port || 587),
    secure: false, // TLS on port 587
    requireTLS: true,
    auth: {
      user: user || 'emailapikey',
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  })
}

/**
 * Standard Verified ZeptoMail Senders for Lily Charm
 */
export const SENDER_ADDRESSES = {
  NOREPLY: process.env.EMAIL_FROM_NOREPLY || 'Lily Charm <no-reply@lilycharm.in>',
  ORDERS: process.env.EMAIL_FROM_ORDERS || 'Lily Charm Orders <orders@lilycharm.in>',
  SUPPORT: process.env.EMAIL_FROM_SUPPORT || 'Lily Charm Support <support@lilycharm.in>',
  CONTACT: process.env.EMAIL_FROM_CONTACT || 'Lily Charm Studio <contact@lilycharm.in>',
}

/**
 * Resolves the designated ZeptoMail transporter and verified sender address
 * based on email purpose (OTP, Order, Support, Contact).
 */
export function getZeptoMailAgent(purpose = 'contact') {
  const p = (purpose || '').toLowerCase()

  // 1. OTP / Verification / Reset Password / Auth
  if (
    p.includes('otp') ||
    p.includes('verify') ||
    p.includes('verification') ||
    p.includes('reset') ||
    p.includes('auth') ||
    p.includes('welcome')
  ) {
    const pass = process.env.ZEPTO_OTP_PASSWORD || process.env.ZEPTOMAIL_PASSWORD
    const transport = createAgentTransport({
      host: process.env.ZEPTO_OTP_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      port: process.env.ZEPTO_OTP_PORT || process.env.ZEPTOMAIL_PORT || 587,
      user: process.env.ZEPTO_OTP_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      pass,
      label: 'OTP / Verification',
    })

    return {
      purpose: 'otp',
      from: SENDER_ADDRESSES.NOREPLY,
      transport,
      configured: Boolean(pass),
    }
  }

  // 2. Orders / Invoices / Shipping / Delivery / Refunds
  if (
    p.includes('order') ||
    p.includes('invoice') ||
    p.includes('payment') ||
    p.includes('packed') ||
    p.includes('shipped') ||
    p.includes('delivery') ||
    p.includes('refund') ||
    p.includes('receipt')
  ) {
    const pass = process.env.ZEPTO_ORDER_PASSWORD || process.env.ZEPTOMAIL_PASSWORD
    const transport = createAgentTransport({
      host: process.env.ZEPTO_ORDER_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      port: process.env.ZEPTO_ORDER_PORT || process.env.ZEPTOMAIL_PORT || 587,
      user: process.env.ZEPTO_ORDER_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      pass,
      label: 'Orders',
    })

    return {
      purpose: 'order',
      from: SENDER_ADDRESSES.ORDERS,
      transport,
      configured: Boolean(pass),
    }
  }

  // 3. Customer Support
  if (p.includes('support') || p.includes('help') || p.includes('ticket')) {
    const pass = process.env.ZEPTO_SUPPORT_PASSWORD || process.env.ZEPTOMAIL_PASSWORD
    const transport = createAgentTransport({
      host: process.env.ZEPTO_SUPPORT_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      port: process.env.ZEPTO_SUPPORT_PORT || process.env.ZEPTOMAIL_PORT || 587,
      user: process.env.ZEPTO_SUPPORT_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      pass,
      label: 'Support',
    })

    return {
      purpose: 'support',
      from: SENDER_ADDRESSES.SUPPORT,
      transport,
      configured: Boolean(pass),
    }
  }

  // 4. Contact / Inquiries / General
  const pass = process.env.ZEPTO_CONTACT_PASSWORD || process.env.ZEPTOMAIL_PASSWORD
  const transport = createAgentTransport({
    host: process.env.ZEPTO_CONTACT_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
    port: process.env.ZEPTO_CONTACT_PORT || process.env.ZEPTOMAIL_PORT || 587,
    user: process.env.ZEPTO_CONTACT_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
    pass,
    label: 'Contact',
  })

  return {
    purpose: 'contact',
    from: SENDER_ADDRESSES.CONTACT,
    transport,
    configured: Boolean(pass),
  }
}

export default {
  SENDER_ADDRESSES,
  getZeptoMailAgent,
}
