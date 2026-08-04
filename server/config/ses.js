import nodemailer from 'nodemailer'

const host = process.env.AWS_SES_HOST || process.env.EMAIL_HOST || 'email-smtp.us-east-1.amazonaws.com'
const port = Number(process.env.AWS_SES_PORT || process.env.EMAIL_PORT || 587)
const user = process.env.AWS_SES_USER || process.env.EMAIL_USER
const pass = process.env.AWS_SES_PASS || process.env.EMAIL_PASS

let sesTransport = null

if (user && pass) {
  sesTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
} else {
  console.warn('[AWS SES SMTP CONFIG WARNING]: Amazon SES credentials missing in environment variables. Email service will run in simulated fallback mode.')
}

export async function verifySesConnection() {
  if (!sesTransport) return false
  try {
    await sesTransport.verify()
    console.log('[AWS SES SMTP SUCCESS]: Connected to Amazon SES SMTP server successfully.')
    return true
  } catch (err) {
    console.error('[AWS SES SMTP ERROR]: Failed to verify Amazon SES connection:', err.message)
    return false
  }
}

export default sesTransport
