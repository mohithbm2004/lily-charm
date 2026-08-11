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
 * Unified Core Email Dispatcher Service with Multi-Provider Routing (Direct SMTP, SES, Brevo)
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
  retries = 3,
}) {
  // 1. Email Validation
  if (!validateEmail(to)) {
    const errorMsg = `Invalid recipient email address: "${to}"`
    console.error(`[EMAIL SERVICE VALIDATION ERROR]: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const cleanTo = to.trim().toLowerCase()

  // 2. Transporter Selection
  let transport = null
  let providerName = provider.toLowerCase()

  if (providerName === 'smtp' && smtpTransport) {
    transport = smtpTransport
  } else if (providerName === 'ses' && sesTransport) {
    transport = sesTransport
  } else if (providerName === 'brevo' && brevoTransport) {
    transport = brevoTransport
  } else {
    // Automatic best available transport fallback
    if (smtpTransport) {
      providerName = 'smtp'
      transport = smtpTransport
    } else if (sesTransport) {
      providerName = 'ses'
      transport = sesTransport
    } else if (brevoTransport) {
      providerName = 'brevo'
      transport = brevoTransport
    }
  }

  const fromAddress = process.env.EMAIL_FROM || '"Lily Charm" <keerthanabm@lilycharm.in>'

  // 3. Fallback / Mock mode if no credentials configured
  if (!transport) {
    console.log(`\n=================== [SIMULATED EMAIL DISPATCH] ===================`)
    console.log(`[PROVIDER]: ${providerName.toUpperCase()}`)
    console.log(`[TYPE]: ${type}`)
    console.log(`[TO]: ${cleanTo}`)
    console.log(`[SUBJECT]: ${subject}`)
    console.log(`[DATA KEYS]: ${Object.keys(data).join(', ')}`)
    console.log(`=================================================================\n`)
    return { success: true, messageId: `mock-${Date.now()}`, simulated: true }
  }

  // 4. Retry Loop with Exponential Backoff
  let attempt = 0
  let lastError = null

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
      console.log(`[EMAIL SUCCESS] [Provider: ${providerName.toUpperCase()}] [Type: ${type}] Sent to ${cleanTo} (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: providerName, attempts: attempt }
    } catch (err) {
      lastError = err
      console.warn(`[EMAIL RETRY WARNING] [Attempt ${attempt}/${retries}] [Provider: ${providerName.toUpperCase()}] Failed to send to ${cleanTo}: ${err.message}`)
      
      // Brevo REST API Fallback (ONLY for Brevo provider emails)
      if (providerName === 'brevo' && process.env.BREVO_API_KEY) {
        try {
          console.log(`[BREVO REST FALLBACK] Attempting direct Brevo HTTPS REST API dispatch for ${type} to ${cleanTo}...`)
          const verifiedSender = process.env.BREVO_VERIFIED_SENDER || 'lilycharm.store.in@gmail.com'
          const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': process.env.BREVO_API_KEY,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: { name: 'Lily Charm Studio', email: verifiedSender },
              to: [{ email: cleanTo }],
              subject,
              htmlContent: html || text || 'Lily Charm Order Notification',
              ...(replyTo ? { replyTo: typeof replyTo === 'string' ? { email: replyTo } : replyTo } : {}),
            })
          })
          const apiRes = await res.json()
          if (apiRes.messageId) {
            console.log(`[EMAIL SUCCESS via BREVO REST FALLBACK] Sent to ${cleanTo} (ID: ${apiRes.messageId})`)
            return { success: true, messageId: apiRes.messageId, provider: 'brevo-rest-fallback', attempts: attempt }
          }
        } catch (restErr) {
          console.warn(`[BREVO REST API ERROR]: ${restErr.message}`)
        }
      }

      if (attempt < retries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s...
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  console.error(`[EMAIL DISPATCH FAILURE] Exhausted ${retries} attempts to ${cleanTo} via ${providerName.toUpperCase()}. Error: ${lastError?.message}`)
  throw new Error(`Email dispatch failed via ${providerName.toUpperCase()}: ${lastError?.message}`)
}

export default {
  validateEmail,
  compileTemplate,
  sendEmail,
}
