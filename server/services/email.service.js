import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import brevoTransport from '../config/brevo.js'
import sesTransport from '../config/ses.js'
import smtpTransport from '../config/smtp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Validates email address format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim())
}

/**
 * Reads and compiles HTML template by replacing {{variable}} placeholders
 */
export function compileTemplate(templateName, data = {}) {
  try {
    const filePath = path.join(__dirname, `../templates/${templateName}`)
    if (!fs.existsSync(filePath)) {
      console.warn(`[EMAIL TEMPLATE WARNING]: Template ${templateName} not found at ${filePath}. Falling back to blank template.`)
      return `<p>${data.message || data.text || ''}</p>`
    }

    let templateContent = fs.readFileSync(filePath, 'utf-8')
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      templateContent = templateContent.replace(regex, data[key] !== undefined && data[key] !== null ? data[key] : '')
    })

    return templateContent
  } catch (err) {
    console.error(`[EMAIL TEMPLATE ERROR]: Failed to compile ${templateName}:`, err.message)
    return `<p>${data.message || data.text || ''}</p>`
  }
}

/**
 * Direct Brevo HTTPS REST API Dispatch (Uses Port 443 HTTPS - 100% immune to cloud port blocks on Render/Vercel)
 */
async function dispatchViaBrevoRestApi({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured.')

  const verifiedSender = process.env.BREVO_VERIFIED_SENDER || 'keerthanabm@lilycharm.in'
  const senderName = 'Lily Charm Studio'

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: verifiedSender },
      to: [{ email: to }],
      subject,
      htmlContent: html || text || 'Lily Charm Notification',
      textContent: text || '',
      ...(replyTo ? { replyTo: typeof replyTo === 'string' ? { email: replyTo } : replyTo } : {}),
    }),
  })

  const apiRes = await res.json()
  if (!res.ok || !apiRes.messageId) {
    throw new Error(apiRes.message || `Brevo REST API responded with status ${res.status}`)
  }

  return apiRes.messageId
}

/**
 * Unified Core Email Dispatcher Service with 3-Tier Multi-Provider Cloud Routing:
 * Tier 1: Direct Zoho Mailbox SMTP (keerthanabm@lilycharm.in)
 * Tier 2: Amazon SES SMTP (email-smtp.ap-south-1.amazonaws.com)
 * Tier 3: Brevo HTTPS REST API (Port 443 HTTPS - Guaranteed Cloud Delivery on Render/Vercel)
 */
export async function sendEmail({
  provider = 'smtp',
  type = 'generic',
  to,
  subject,
  html,
  text,
  attachments = [],
  replyTo,
  data = {},
  retries = 2,
}) {
  // 1. Email Validation
  if (!validateEmail(to)) {
    const errorMsg = `Invalid recipient email address: "${to}"`
    console.error(`[EMAIL SERVICE VALIDATION ERROR]: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const cleanTo = to.trim().toLowerCase()
  const fromAddress = process.env.EMAIL_FROM || '"Lily Charm" <keerthanabm@lilycharm.in>'

  // Build transporter candidate list in priority order
  const candidateTransporters = []

  if (smtpTransport) {
    candidateTransporters.push({ name: 'smtp', transport: smtpTransport })
  }
  if (sesTransport) {
    candidateTransporters.push({ name: 'ses', transport: sesTransport })
  }
  if (brevoTransport) {
    candidateTransporters.push({ name: 'brevo-smtp', transport: brevoTransport })
  }

  // 2. Try Standard Transporters with Retry Loop
  let lastError = null

  for (const { name: provName, transport } of candidateTransporters) {
    let attempt = 0
    while (attempt < retries) {
      attempt++
      try {
        const mailOptions = {
          from: fromAddress,
          to: cleanTo,
          subject,
          text: text || '',
          html: html || '',
          attachments,
          ...(replyTo ? { replyTo } : {}),
        }

        const info = await transport.sendMail(mailOptions)
        console.log(`[EMAIL SUCCESS] [Provider: ${provName.toUpperCase()}] [Type: ${type}] Sent to ${cleanTo} (ID: ${info.messageId})`)
        return { success: true, messageId: info.messageId, provider: provName, attempts: attempt }
      } catch (err) {
        lastError = err
        console.warn(`[EMAIL NOTICE] [Provider: ${provName.toUpperCase()}] Attempt ${attempt}/${retries} failed for ${cleanTo}: ${err.message}`)
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 800))
        }
      }
    }
  }

  // 3. Guaranteed Cloud Fallback: Pure HTTPS REST API (Port 443 HTTPS)
  // This bypasses any cloud host (Render/Vercel/Railway) SMTP port 465/587 egress blocks
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`[CLOUD HTTPS DISPATCH] Attempting pure HTTPS Port 443 REST API for ${type} to ${cleanTo}...`)
      const restMessageId = await dispatchViaBrevoRestApi({
        to: cleanTo,
        subject,
        html,
        text,
        replyTo,
      })
      console.log(`[EMAIL SUCCESS via CLOUD HTTPS REST API] Sent to ${cleanTo} (ID: ${restMessageId})`)
      return { success: true, messageId: restMessageId, provider: 'cloud-https-rest', attempts: 1 }
    } catch (restErr) {
      console.warn(`[CLOUD HTTPS REST API ERROR]: ${restErr.message}`)
      lastError = restErr
    }
  }

  // 4. Simulated Fallback if completely unconfigured
  if (candidateTransporters.length === 0 && !process.env.BREVO_API_KEY) {
    console.log(`\n=================== [SIMULATED EMAIL DISPATCH] ===================`)
    console.log(`[TYPE]: ${type}`)
    console.log(`[TO]: ${cleanTo}`)
    console.log(`[SUBJECT]: ${subject}`)
    console.log(`=================================================================\n`)
    return { success: true, messageId: `mock-${Date.now()}`, simulated: true }
  }

  console.error(`[EMAIL DISPATCH FAILURE] Exhausted all providers to ${cleanTo}. Last Error: ${lastError?.message}`)
  throw new Error(`Email dispatch failed to ${cleanTo}: ${lastError?.message}`)
}

export default {
  validateEmail,
  compileTemplate,
  sendEmail,
}
