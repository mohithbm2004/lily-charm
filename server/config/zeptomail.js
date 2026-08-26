import ENV from './env.js'

function getOverriddenMailOptions(options) {
  if (ENV.EMAIL_TEST_MODE) {
    const originalTo = options.to || ''
    const testRecipients = ENV.TEST_EMAIL_RECIPIENTS.join(', ')
    console.log(`[EMAIL TEST MODE ACTIVE]: Overriding recipient "${originalTo}" with test list: "${testRecipients}"`)
    
    const subjectPrefix = `[TEST TO: ${originalTo}] `
    const overriddenSubject = options.subject ? (options.subject.startsWith('[TEST TO:') ? options.subject : `${subjectPrefix}${options.subject}`) : ''

    return {
      ...options,
      to: testRecipients,
      ...(overriddenSubject ? { subject: overriddenSubject } : {}),
    }
  }
  return options
}

export const DEFAULT_API_URL = process.env.ZEPTO_API_URL || 'https://api.zeptomail.in/v1.1/email'

export function getZeptoMailAgent(purpose = 'otp') {
  const transporter = getZeptoTransporter(purpose)
  return {
    agent: `${transporter.channel} Agent`,
    purpose: transporter.channel.toLowerCase(),
    from: transporter.sender,
    configured: transporter.configured,
    apiUrl: DEFAULT_API_URL,
  }
}

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

// Transporter Cache (API Config Wrappers)
const transporterCache = {}

/**
 * Creates or retrieves a cached stateless API Config Wrapper for the designated channel
 */
export function getZeptoTransporter(purpose = 'otp') {
  const p = (purpose || '').toLowerCase()
  let channel = 'OTP'

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
    channel = 'ORDER'
  } else if (p.includes('support') || p.includes('help') || p.includes('ticket')) {
    channel = 'SUPPORT'
  } else if (
    p.includes('contact') ||
    p.includes('inquiry') ||
    p.includes('newsletter') ||
    p.includes('generic')
  ) {
    channel = 'CONTACT'
  }

  if (transporterCache[channel]) {
    return transporterCache[channel]
  }

  const config = ENV.ZEPTO[channel] || ENV.ZEPTO.OTP
  const pass = config.PASS || ''

  const sender =
    channel === 'ORDER'
      ? SENDER_ADDRESSES.ORDERS
      : channel === 'SUPPORT'
      ? SENDER_ADDRESSES.SUPPORT
      : channel === 'CONTACT'
      ? SENDER_ADDRESSES.CONTACT
      : SENDER_ADDRESSES.NOREPLY

  if (!pass) {
    console.warn(
      `[ZEPTOMAIL NOTICE]: ZeptoMail API credentials are not configured for [${channel}] channel. Email service will run in simulated mode for ${channel}.`
    )
    const mockTransporter = {
      channel,
      configured: false,
      sender,
      sendMail: async (options) => {
        const finalOptions = getOverriddenMailOptions(options)
        console.log(`\n=================== [SIMULATED ZEPTOMAIL DISPATCH] ===================`)
        console.log(`[CHANNEL]: ZeptoMail ${channel} HTTP API`)
        console.log(`[FROM]: ${finalOptions.from || sender.full}`)
        console.log(`[TO]: ${finalOptions.to}`)
        console.log(`[SUBJECT]: ${finalOptions.subject}`)
        console.log(`[STATUS]: SIMULATED (ZeptoMail credentials are not configured)`)
        console.log(`======================================================================\n`)
        return { success: true, messageId: `mock-zepto-http-${channel.toLowerCase()}-${Date.now()}`, simulated: true }
      },
    }
    transporterCache[channel] = mockTransporter
    return mockTransporter
  }

  const wrapper = {
    channel,
    configured: true,
    sender,
    apiKey: pass,
    getOverriddenMailOptions,
  }

  transporterCache[channel] = wrapper
  return wrapper
}

/**
 * Verifies active ZeptoMail API configuration status
 */
export async function verifyZeptoMailConnections() {
  const channels = ['OTP', 'ORDER', 'SUPPORT', 'CONTACT']
  const results = {}

  for (const ch of channels) {
    const transporter = getZeptoTransporter(ch.toLowerCase())
    if (transporter && transporter.configured) {
      results[ch] = true
    } else {
      results[ch] = false
    }
  }
  return results
}

export default {
  SENDER_ADDRESSES,
  getZeptoTransporter,
  verifyZeptoMailConnections,
}
