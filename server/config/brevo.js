import nodemailer from 'nodemailer'

const host = process.env.BREVO_HOST || process.env.EMAIL_HOST || 'smtp-relay.brevo.com'
const port = Number(process.env.BREVO_PORT || process.env.EMAIL_PORT || 587)
const user = process.env.BREVO_USER || process.env.EMAIL_USER
const pass = process.env.BREVO_PASS || process.env.EMAIL_PASS

let brevoTransport = null

if (user && pass) {
  brevoTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
} else {
  console.warn('[BREVO SMTP CONFIG WARNING]: Brevo credentials missing in environment variables. Email service will run in simulated fallback mode.')
}

export async function verifyBrevoConnection() {
  if (!brevoTransport) return false
  try {
    await brevoTransport.verify()
    console.log('[BREVO SMTP SUCCESS]: Connected to Brevo SMTP server successfully.')
    return true
  } catch (err) {
    console.error('[BREVO SMTP ERROR]: Failed to verify Brevo connection:', err.message)
    return false
  }
}

export default brevoTransport
