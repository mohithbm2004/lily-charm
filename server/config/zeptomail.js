/**
 * ZeptoMail HTTP REST API Configuration
 * Supports Zoho-enczapikey header format as shown in ZeptoMail API Console.
 */

export const DEFAULT_API_URL = process.env.ZEPTO_API_URL || 'https://api.zeptomail.in/v1.1/email'

/**
 * Standard Verified ZeptoMail Senders for Lily Charm
 */
export const SENDER_ADDRESSES = {
  NOREPLY: {
    address: process.env.EMAIL_NOREPLY_ADDRESS || 'no-reply@lilycharm.in',
    name: process.env.EMAIL_NOREPLY_NAME || 'Lily Charm',
    full: 'Lily Charm <no-reply@lilycharm.in>',
  },
  ORDERS: {
    address: process.env.EMAIL_ORDERS_ADDRESS || 'orders@lilycharm.in',
    name: process.env.EMAIL_ORDERS_NAME || 'Lily Charm Orders',
    full: 'Lily Charm Orders <orders@lilycharm.in>',
  },
  SUPPORT: {
    address: process.env.EMAIL_SUPPORT_ADDRESS || 'support@lilycharm.in',
    name: process.env.EMAIL_SUPPORT_NAME || 'Lily Charm Support',
    full: 'Lily Charm Support <support@lilycharm.in>',
  },
  CONTACT: {
    address: process.env.EMAIL_CONTACT_ADDRESS || 'contact@lilycharm.in',
    name: process.env.EMAIL_CONTACT_NAME || 'Lily Charm Studio',
    full: 'Lily Charm Studio <contact@lilycharm.in>',
  },
}

/**
 * Formats the Authorization header for ZeptoMail HTTP REST API
 * Handles 'Zoho-enczapikey <token>', 'Zoho-enczpt-01 <token>', or raw token keys.
 */
export function formatZeptoAuthHeader(rawToken = '') {
  const token = (rawToken || '').trim()
  if (!token) return ''
  if (
    token.startsWith('Zoho-enczapikey') ||
    token.startsWith('Zoho-enczpt-') ||
    token.startsWith('SendMail ') ||
    token.startsWith('Bearer ')
  ) {
    return token
  }
  return `Zoho-enczapikey ${token}`
}

/**
 * Resolves the designated ZeptoMail agent token, authorization header, and sender
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
    const token = (
      process.env.ZEPTO_OTP_API_TOKEN ||
      process.env.ZEPTOMAIL_API_TOKEN ||
      process.env.ZEPTO_API_TOKEN ||
      process.env.ZEPTO_OTP_PASSWORD ||
      ''
    ).trim()

    return {
      agent: 'OTP Agent',
      purpose: 'otp',
      from: SENDER_ADDRESSES.NOREPLY,
      token,
      authHeader: formatZeptoAuthHeader(token),
      configured: Boolean(token),
      apiUrl: DEFAULT_API_URL,
    }
  }

  // 2. Orders / Invoices / Shipping / Delivery / Refunds / Payments
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
    const token = (
      process.env.ZEPTO_ORDER_API_TOKEN ||
      process.env.ZEPTOMAIL_API_TOKEN ||
      process.env.ZEPTO_API_TOKEN ||
      process.env.ZEPTO_ORDER_PASSWORD ||
      ''
    ).trim()

    return {
      agent: 'Order Agent',
      purpose: 'order',
      from: SENDER_ADDRESSES.ORDERS,
      token,
      authHeader: formatZeptoAuthHeader(token),
      configured: Boolean(token),
      apiUrl: DEFAULT_API_URL,
    }
  }

  // 3. Customer Support
  if (p.includes('support') || p.includes('help') || p.includes('ticket')) {
    const token = (
      process.env.ZEPTO_SUPPORT_API_TOKEN ||
      process.env.ZEPTOMAIL_API_TOKEN ||
      process.env.ZEPTO_API_TOKEN ||
      process.env.ZEPTO_SUPPORT_PASSWORD ||
      ''
    ).trim()

    return {
      agent: 'Support Agent',
      purpose: 'support',
      from: SENDER_ADDRESSES.SUPPORT,
      token,
      authHeader: formatZeptoAuthHeader(token),
      configured: Boolean(token),
      apiUrl: DEFAULT_API_URL,
    }
  }

  // 4. Contact / General Inquiries / Newsletters
  const token = (
    process.env.ZEPTO_CONTACT_API_TOKEN ||
    process.env.ZEPTOMAIL_API_TOKEN ||
    process.env.ZEPTO_API_TOKEN ||
    process.env.ZEPTO_CONTACT_PASSWORD ||
    ''
  ).trim()

  return {
    agent: 'Contact Agent',
    purpose: 'contact',
    from: SENDER_ADDRESSES.CONTACT,
    token,
    authHeader: formatZeptoAuthHeader(token),
    configured: Boolean(token),
    apiUrl: DEFAULT_API_URL,
  }
}

export default {
  DEFAULT_API_URL,
  SENDER_ADDRESSES,
  formatZeptoAuthHeader,
  getZeptoMailAgent,
}
