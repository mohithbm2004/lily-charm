import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.zoho.in'
const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465)
const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'keerthanabm@lilycharm.in'
const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || 'rQDjXsUaHWv9'

let smtpTransport = null

if (user && pass) {
  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000, // 8s timeout for cloud container stability
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  })
} else {
  console.warn('[DIRECT SMTP NOTICE]: Direct mailbox SMTP credentials not configured yet.')
}

export async function verifySmtpConnection() {
  if (!smtpTransport) return false
  try {
    await smtpTransport.verify()
    console.log('[DIRECT SMTP SUCCESS]: Connected to Zoho / Direct Mailbox SMTP server successfully.')
    return true
  } catch (err) {
    console.error('[DIRECT SMTP ERROR]: Failed to verify SMTP connection:', err.message)
    return false
  }
}

export default smtpTransport
