import dns from 'dns/promises'
import net from 'net'
import nodemailer from 'nodemailer'

/**
 * Categorizes SMTP and network errors into clear, actionable buckets
 * without ever exposing passwords or tokens.
 */
export function categorizeSmtpError(err, host = 'smtp.zeptomail.in', port = 587) {
  if (!err) return { category: 'UNKNOWN', message: 'Unknown error' }

  const msg = err.message || ''
  const code = err.code || ''
  const responseCode = err.responseCode || err.status

  // 1. DNS Failure
  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    msg.toLowerCase().includes('getaddrinfo') ||
    msg.toLowerCase().includes('dns')
  ) {
    return {
      category: 'DNS_FAILURE',
      message: `DNS lookup failed for host "${host}". The server cannot resolve the SMTP hostname.`,
      raw: msg,
    }
  }

  // 2. TCP Connection Timeout
  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    code === 'ECONNRESET' ||
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('etimedout')
  ) {
    return {
      category: 'TCP_CONNECTION_TIMEOUT',
      message: `TCP connection to "${host}:${port}" timed out before establishing a connection. Port ${port} may be blocked or throttled by the cloud network or host egress firewall.`,
      raw: msg,
    }
  }

  // 3. TCP Connection Refused
  if (code === 'ECONNREFUSED' || msg.toLowerCase().includes('connection refused')) {
    return {
      category: 'TCP_CONNECTION_REFUSED',
      message: `TCP connection to "${host}:${port}" was refused. Port ${port} is not accepting connections.`,
      raw: msg,
    }
  }

  // 4. TLS Failure
  if (
    msg.includes('TLS') ||
    msg.includes('SSL') ||
    msg.includes('certificate') ||
    code.startsWith('CERT_') ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
  ) {
    return {
      category: 'TLS_FAILURE',
      message: `TLS/SSL handshake negotiation failed on "${host}:${port}": ${msg}`,
      raw: msg,
    }
  }

  // 5. SMTP Authentication Failure
  if (
    responseCode === 535 ||
    code === 'EAUTH' ||
    msg.includes('535') ||
    msg.toLowerCase().includes('authentication failed') ||
    msg.toLowerCase().includes('invalid login')
  ) {
    return {
      category: 'SMTP_AUTH_FAILURE',
      message: `SMTP authentication failed (535). Please verify that the ZeptoMail Send Mail Token / Password configured in environment variables matches this agent.`,
      raw: '535 Authentication Failed (Credentials rejected by ZeptoMail)',
    }
  }

  // 6. Sender or Domain Rejection
  if (
    (responseCode >= 550 && responseCode <= 554) ||
    msg.toLowerCase().includes('relay') ||
    msg.toLowerCase().includes('mailbox') ||
    msg.toLowerCase().includes('sender')
  ) {
    return {
      category: 'SENDER_DOMAIN_REJECTION',
      message: `Sender or domain rejected (${responseCode || '550-554'}). Ensure sender address matches your verified ZeptoMail Mail Agent domain: ${msg}`,
      raw: msg,
    }
  }

  // 7. General / Other
  return {
    category: 'GENERAL_ERROR',
    message: msg || 'An unexpected SMTP error occurred.',
    raw: msg,
  }
}

/**
 * Creates a resilient Nodemailer transporter based on environment configuration.
 */
export function createAgentTransport({ host, port, user, pass, label, secure, requireTLS, tlsMinVersion }) {
  if (!pass) {
    return null
  }

  const finalHost = host || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in'
  const finalPort = Number(port || process.env.ZEPTOMAIL_PORT || 587)

  // Determine secure and requireTLS flags from env or port defaults
  let isSecure = false
  if (secure !== undefined) {
    isSecure = secure
  } else if (process.env.ZEPTOMAIL_SECURE !== undefined) {
    isSecure = process.env.ZEPTOMAIL_SECURE === 'true'
  } else {
    isSecure = finalPort === 465
  }

  let mustRequireTLS = false
  if (requireTLS !== undefined) {
    mustRequireTLS = requireTLS
  } else if (process.env.ZEPTOMAIL_REQUIRE_TLS !== undefined) {
    mustRequireTLS = process.env.ZEPTOMAIL_REQUIRE_TLS === 'true'
  } else {
    mustRequireTLS = !isSecure
  }

  const minVersion = tlsMinVersion || process.env.ZEPTOMAIL_TLS_MIN_VERSION || 'TLSv1.2'

  return nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10,
    host: finalHost,
    port: finalPort,
    secure: isSecure,
    requireTLS: mustRequireTLS,
    auth: {
      user: user || process.env.ZEPTOMAIL_USER || 'emailapikey',
      pass,
    },
    connectionTimeout: 30000, // 30s connection timeout for reliable cloud network egress
    greetingTimeout: 25000,   // 25s greeting timeout
    socketTimeout: 35000,     // 35s socket timeout
    tls: {
      minVersion,
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
      host: process.env.ZEPTO_OTP_HOST,
      port: process.env.ZEPTO_OTP_PORT,
      user: process.env.ZEPTO_OTP_USER,
      pass,
      label: 'OTP / Verification',
    })

    return {
      purpose: 'otp',
      from: SENDER_ADDRESSES.NOREPLY,
      transport,
      configured: Boolean(pass),
      pass,
      host: process.env.ZEPTO_OTP_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      port: Number(process.env.ZEPTO_OTP_PORT || process.env.ZEPTOMAIL_PORT || 587),
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
      host: process.env.ZEPTO_ORDER_HOST,
      port: process.env.ZEPTO_ORDER_PORT,
      user: process.env.ZEPTO_ORDER_USER,
      pass,
      label: 'Orders',
    })

    return {
      purpose: 'order',
      from: SENDER_ADDRESSES.ORDERS,
      transport,
      configured: Boolean(pass),
      pass,
      host: process.env.ZEPTO_ORDER_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      port: Number(process.env.ZEPTO_ORDER_PORT || process.env.ZEPTOMAIL_PORT || 587),
    }
  }

  // 3. Customer Support
  if (p.includes('support') || p.includes('help') || p.includes('ticket')) {
    const pass = process.env.ZEPTO_SUPPORT_PASSWORD || process.env.ZEPTOMAIL_PASSWORD
    const transport = createAgentTransport({
      host: process.env.ZEPTO_SUPPORT_HOST,
      port: process.env.ZEPTO_SUPPORT_PORT,
      user: process.env.ZEPTO_SUPPORT_USER,
      pass,
      label: 'Support',
    })

    return {
      purpose: 'support',
      from: SENDER_ADDRESSES.SUPPORT,
      transport,
      configured: Boolean(pass),
      pass,
      host: process.env.ZEPTO_SUPPORT_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      port: Number(process.env.ZEPTO_SUPPORT_PORT || process.env.ZEPTOMAIL_PORT || 587),
    }
  }

  // 4. Contact / Inquiries / General
  const pass = process.env.ZEPTO_CONTACT_PASSWORD || process.env.ZEPTOMAIL_PASSWORD
  const transport = createAgentTransport({
    host: process.env.ZEPTO_CONTACT_HOST,
    port: process.env.ZEPTO_CONTACT_PORT,
    user: process.env.ZEPTO_CONTACT_USER,
    pass,
    label: 'Contact',
  })

  return {
    purpose: 'contact',
    from: SENDER_ADDRESSES.CONTACT,
    transport,
    configured: Boolean(pass),
    pass,
    host: process.env.ZEPTO_CONTACT_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
    port: Number(process.env.ZEPTO_CONTACT_PORT || process.env.ZEPTOMAIL_PORT || 587),
  }
}

/**
 * Diagnostic network inspection utility to test DNS, TCP 587, TCP 465, and active SMTP verification
 */
export async function testZeptoMailNetwork() {
  const host = process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in'
  const results = {
    host,
    dns: { status: 'PENDING' },
    tcp587: { status: 'PENDING' },
    tcp465: { status: 'PENDING' },
    smtpVerification: { status: 'PENDING' },
  }

  // 1. DNS Resolution
  try {
    const dnsStart = Date.now()
    const addresses = await dns.lookup(host, { all: true })
    results.dns = {
      status: 'RESOLVED',
      latencyMs: Date.now() - dnsStart,
      addresses: addresses.map((a) => a.address),
    }
  } catch (err) {
    results.dns = {
      status: 'FAILED',
      error: err.message,
    }
  }

  // Helper for TCP socket test
  const testTcpPort = (targetPort) => {
    return new Promise((resolve) => {
      const start = Date.now()
      const socket = net.createConnection({ host, port: targetPort, timeout: 10000 }, () => {
        const latency = Date.now() - start
        socket.end()
        resolve({ status: 'CONNECTED', latencyMs: latency, port: targetPort })
      })
      socket.on('error', (err) => {
        resolve({ status: 'ERROR', port: targetPort, error: err.message })
      })
      socket.on('timeout', () => {
        socket.destroy()
        resolve({ status: 'TIMEOUT', port: targetPort, error: 'Connection timed out (>10s)' })
      })
    })
  }

  // 2. TCP Port 587
  results.tcp587 = await testTcpPort(587)

  // 3. TCP Port 465
  results.tcp465 = await testTcpPort(465)

  // 4. SMTP Active Verification
  const agent = getZeptoMailAgent('otp')
  if (agent.configured && agent.transport) {
    try {
      const verifyStart = Date.now()
      await agent.transport.verify()
      results.smtpVerification = {
        status: 'AUTHENTICATED',
        latencyMs: Date.now() - verifyStart,
        configuredPort: agent.port,
      }
    } catch (err) {
      const categorized = categorizeSmtpError(err, agent.host, agent.port)
      results.smtpVerification = {
        status: 'FAILED',
        category: categorized.category,
        message: categorized.message,
      }
    }
  } else {
    results.smtpVerification = {
      status: 'SKIPPED',
      message: 'ZeptoMail password is not configured in environment.',
    }
  }

  return results
}

export default {
  SENDER_ADDRESSES,
  getZeptoMailAgent,
  createAgentTransport,
  categorizeSmtpError,
  testZeptoMailNetwork,
}
