import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getZeptoTransporter, SENDER_ADDRESSES } from '../config/zeptomail.js'
import SuppressedEmail from '../models/SuppressedEmail.js'
import EmailBounceLog from '../models/EmailBounceLog.js'
import emailCircuitBreaker from '../utils/emailCircuitBreaker.js'
import { validateAndNormalizeEmail } from '../utils/emailValidator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export { SENDER_ADDRESSES, getZeptoTransporter }

export function getSenderByPurpose(type = '') {
  const transporter = getZeptoTransporter(type)
  return transporter && transporter.sender ? transporter.sender.full : SENDER_ADDRESSES.NOREPLY.full
}

/**
 * Validates recipient email address format
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
      console.warn(`[EMAIL TEMPLATE WARNING]: Template ${templateName} not found at ${filePath}. Falling back to default layout.`)
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
 * Centralized Email Dispatcher using ZeptoMail SMTP Multi-Channel Transporters
 */
export async function sendEmail({
  type = 'generic',
  to,
  toName,
  from,
  subject,
  html,
  text,
  attachments = [],
  replyTo,
  data = {},
  retries = 2,
}) {
  // 1. Recipient Validation & Normalization
  const validation = validateAndNormalizeEmail(to)
  if (!validation.isValid) {
    const errorMsg = `Invalid recipient email address: "${to}"`
    console.error(`[ZEPTOMAIL VALIDATION ERROR]: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const cleanTo = validation.normalized

  // 2. Hard-Bounce Suppression Check
  const suppressed = await SuppressedEmail.isSuppressed(cleanTo)
  if (suppressed) {
    const suppErr = new Error('This email address was previously flagged as undeliverable. Please check or enter a different email address.')
    suppErr.isSuppressed = true
    console.warn(`[ZEPTOMAIL SUPPRESSION BLOCK]: Aborting email send to ${cleanTo} because it is in the hard bounce suppression list.`)
    throw suppErr
  }

  // 3. Email Circuit Breaker Check
  if (emailCircuitBreaker.isOpen()) {
    const cbErr = new Error('Email verification is temporarily paused due to security protection. Please try again later or contact support.')
    cbErr.circuitBreakerOpen = true
    console.warn(`[ZEPTOMAIL CIRCUIT BREAKER BLOCK]: Aborting email send to ${cleanTo} because the email circuit breaker is OPEN.`)
    throw cbErr
  }

  // 4. Resolve Transporter for Purpose/Channel
  const transporterWrapper = getZeptoTransporter(type)

  if (!transporterWrapper || !transporterWrapper.configured) {
    console.warn(`[ZEPTOMAIL CONFIG NOTICE]: ZeptoMail credentials are not configured for [${type}]. Email will run in simulated mode.`)
    emailCircuitBreaker.recordSuccess()
    return await transporterWrapper.sendMail({
      to: cleanTo,
      subject: subject || 'Notification from Lily Charm',
      html: html || `<p>${text || ''}</p>`,
      text: text || '',
      attachments,
      ...(replyTo ? { replyTo } : {}),
    })
  }

  // 5. Retry Loop for HTTP API Dispatch
  let attempt = 0
  let lastError = null

  while (attempt < retries) {
    attempt++
    try {
      console.log(`[EMAIL API] Sending email`)
      console.log(`[EMAIL API] Provider: ZeptoMail API`)
      console.log(`[EMAIL API] Recipient: ${cleanTo}`)

      const finalToName = toName || cleanTo.split('@')[0]
      const finalSubject = subject || 'Notification from Lily Charm'
      const finalHtml = html || `<p>${text || ''}</p>`

      // Handle override in test mode if active
      let targetRecipient = cleanTo
      let targetSubject = finalSubject
      if (transporterWrapper.getOverriddenMailOptions) {
        const overridden = transporterWrapper.getOverriddenMailOptions({ to: cleanTo, subject: finalSubject })
        targetRecipient = overridden.to
        targetSubject = overridden.subject
      }

      const payload = {
        from: {
          address: transporterWrapper.sender.address,
          name: transporterWrapper.sender.name,
        },
        to: [
          {
            email_address: {
              address: targetRecipient,
              name: finalToName,
            },
          },
        ],
        subject: targetSubject,
        htmlbody: finalHtml,
      }

      if (text) {
        payload.textbody = text
      }

      if (replyTo) {
        payload.reply_to = [
          {
            address: replyTo,
            name: '',
          },
        ]
      }

      const apiUrl = process.env.ZEPTO_API_URL || 'https://api.zeptomail.in/v1.1/email'
      
      const authHeader = transporterWrapper.apiKey.trim().toLowerCase().startsWith('zoho-enczapikey')
        ? transporterWrapper.apiKey.trim()
        : `Zoho-enczapikey ${transporterWrapper.apiKey.trim()}`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify(payload),
      })

      console.log(`[EMAIL API] Request sent`)
      console.log(`[EMAIL API] Response status: ${response.status}`)

      const responseData = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMsg = responseData.error?.message || `HTTP error status ${response.status}`
        console.error(`[EMAIL API ERROR] Status: ${response.status}`)
        console.error(`[EMAIL API ERROR] Message: ${errorMsg}`)
        
        const isHardBounce = 
          response.status === 400 ||
          response.status === 422 ||
          errorMsg.toLowerCase().includes('invalid recipient') ||
          errorMsg.toLowerCase().includes('suppressed') ||
          errorMsg.toLowerCase().includes('bounce') ||
          errorMsg.toLowerCase().includes('not verified')

        if (isHardBounce) {
          console.error(`🚨 [ZEPTOMAIL HARD BOUNCE DETECTED] [To: ${cleanTo}]: ${errorMsg}`)
          
          await SuppressedEmail.suppressEmail({
            email: cleanTo,
            reason: errorMsg,
            bounceType: 'hard',
            bounceCode: String(response.status),
            source: 'zeptomail-api',
          }).catch(console.error)

          await EmailBounceLog.create({
            email: cleanTo,
            bounceType: 'hard',
            bounceCode: String(response.status),
            reason: errorMsg,
            channel: transporterWrapper.channel,
          }).catch(console.error)

          emailCircuitBreaker.recordHardBounce(cleanTo, errorMsg)
          
          const hardBounceErr = new Error('This email address was reported as undeliverable. Please check or enter a different email address.')
          hardBounceErr.isHardBounce = true
          throw hardBounceErr
        } else {
          throw new Error(errorMsg)
        }
      }

      console.log(`[EMAIL API] Email accepted`)
      
      const messageId = responseData.data?.[0]?.request_id || `zepto-http-${Date.now()}`

      emailCircuitBreaker.recordSuccess()

      return {
        success: true,
        messageId,
        provider: 'zeptomail-api',
        channel: transporterWrapper.channel,
        attempts: attempt,
      }
    } catch (err) {
      lastError = err
      
      // Do not log retry messages if we already threw hard bounces
      if (!err.isHardBounce) {
        await EmailBounceLog.create({
          email: cleanTo,
          bounceType: 'soft',
          reason: err.message,
          channel: transporterWrapper.channel,
        }).catch(console.error)

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
      } else {
        throw err
      }
    }
  }

  // Record transport failure in Circuit Breaker if all retries failed
  emailCircuitBreaker.recordTransportFailure(cleanTo, lastError?.message)

  console.error(`[EMAIL DISPATCH FAILURE] Exhausted ${retries} attempts to ${cleanTo} via ZeptoMail API. Error: ${lastError?.message}`)
  throw new Error(`Email dispatch failed via ZeptoMail API: ${lastError?.message}`)
}

export default {
  SENDER_ADDRESSES,
  getZeptoTransporter,
  validateEmail,
  compileTemplate,
  sendEmail,
}
