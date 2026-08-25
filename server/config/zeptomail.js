import nodemailer from 'nodemailer'
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

// Transporter Cache
const transporterCache = {}

/**
 * Creates or retrieves a cached Nodemailer SMTP Transporter for the designated channel
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
  const host = config.HOST || 'smtp.zeptomail.in'
  const port = Number(config.PORT || 587)
  const user = config.USER || 'emailapikey'
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
      `[ZEPTOMAIL NOTICE]: ZeptoMail credentials are not configured for [${channel}] channel (ZEPTO_${channel}_PASSWORD is empty). Email service will run in simulated mode for ${channel}.`
    )
    const mockTransporter = {
      channel,
      configured: false,
      sender,
      sendMail: async (options) => {
        const finalOptions = getOverriddenMailOptions(options)
        console.log(`\n=================== [SIMULATED ZEPTOMAIL DISPATCH] ===================`)
        console.log(`[CHANNEL]: ZeptoMail ${channel} SMTP (${host}:${port})`)
        console.log(`[FROM]: ${finalOptions.from || sender.full}`)
        console.log(`[TO]: ${finalOptions.to}`)
        console.log(`[SUBJECT]: ${finalOptions.subject}`)
        console.log(`[STATUS]: SIMULATED (ZeptoMail credentials are not configured)`)
        console.log(`======================================================================\n`)
        return { success: true, messageId: `mock-zepto-${channel.toLowerCase()}-${Date.now()}`, simulated: true }
      },
    }
    transporterCache[channel] = mockTransporter
    return mockTransporter
  }

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    })

    const wrapper = {
      channel,
      configured: true,
      sender,
      transport,
      sendMail: async (options) => {
        const finalOptions = getOverriddenMailOptions(options)
        return await transport.sendMail({
          from: sender.full,
          ...finalOptions,
        })
      },
      verify: async () => {
        return await transport.verify()
      },
    }

    transporterCache[channel] = wrapper
    return wrapper
  } catch (err) {
    console.error(`[ZEPTOMAIL ERROR]: Failed to initialize ${channel} SMTP transporter:`, err.message)
    return null
  }
}

/**
 * Verifies active ZeptoMail SMTP connections for configured channels
 */
export async function verifyZeptoMailConnections() {
  const channels = ['OTP', 'ORDER', 'SUPPORT', 'CONTACT']
  const results = {}

  for (const ch of channels) {
    const transporter = getZeptoTransporter(ch.toLowerCase())
    if (transporter && transporter.configured && transporter.verify) {
      try {
        await transporter.verify()
        console.log(`[ZEPTOMAIL SUCCESS]: Verified ${ch} SMTP connection.`)
        results[ch] = true
      } catch (err) {
        console.error(`[ZEPTOMAIL ERROR]: ${ch} SMTP connection failed:`, err.message)
        results[ch] = false
      }
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
