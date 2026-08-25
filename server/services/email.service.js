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

  // 5. Retry Loop for SMTP Dispatch
  let attempt = 0
  let lastError = null

  while (attempt < retries) {
    attempt++
    try {
      const mailOptions = {
        from: from || transporterWrapper.sender.full,
        to: cleanTo,
        subject: subject || 'Notification from Lily Charm',
        html: html || `<p>${text || ''}</p>`,
        text: text || '',
        attachments,
        ...(replyTo ? { replyTo } : {}),
      }

      const info = await transporterWrapper.sendMail(mailOptions)
      console.log(`[EMAIL SUCCESS] [ZeptoMail SMTP] [Channel: ${transporterWrapper.channel}] Sent to ${cleanTo} (ID: ${info.messageId})`)

      // Record success in Circuit Breaker
      emailCircuitBreaker.recordSuccess()

      return {
        success: true,
        messageId: info.messageId,
        provider: 'zeptomail-smtp',
        channel: transporterWrapper.channel,
        attempts: attempt,
      }
    } catch (err) {
      lastError = err
      const errMsg = (err.message || '').toLowerCase()

      // Detect Hard Bounce SMTP response codes (550, 551, 552, 553, 554, invalid recipient, user unknown)
      const isHardBounce =
        errMsg.includes('550') ||
        errMsg.includes('551') ||
        errMsg.includes('552') ||
        errMsg.includes('553') ||
        errMsg.includes('554') ||
        errMsg.includes('recipient rejected') ||
        errMsg.includes('invalid recipient') ||
        errMsg.includes('user unknown') ||
        errMsg.includes('mailbox not found') ||
        errMsg.includes('address rejected')

      if (isHardBounce) {
        console.error(`🚨 [ZEPTOMAIL HARD BOUNCE DETECTED] [To: ${cleanTo}]: ${err.message}`)

        // Instantly add to SuppressedEmail database
        await SuppressedEmail.suppressEmail({
          email: cleanTo,
          reason: err.message,
          bounceType: 'hard',
          bounceCode: '550',
          source: 'zeptomail-smtp',
        }).catch(console.error)

        // Record in Bounce Log
        await EmailBounceLog.create({
          email: cleanTo,
          bounceType: 'hard',
          bounceCode: '550',
          reason: err.message,
          channel: transporterWrapper.channel,
        }).catch(console.error)

        // Inform Circuit Breaker of Hard Bounce
        emailCircuitBreaker.recordHardBounce(cleanTo, err.message)

        const hardBounceErr = new Error('This email address was reported as undeliverable. Please check or enter a different email address.')
        hardBounceErr.isHardBounce = true
        throw hardBounceErr
      } else {
        // Soft Bounce / Temporary Transport Failure
        console.warn(`[ZEPTOMAIL SOFT BOUNCE / RETRY] [Attempt ${attempt}/${retries}] Failed to send to ${cleanTo}: ${err.message}`)
        await EmailBounceLog.create({
          email: cleanTo,
          bounceType: 'soft',
          reason: err.message,
          channel: transporterWrapper.channel,
        }).catch(console.error)

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
  }

  // Record transport failure in Circuit Breaker if all retries failed
  emailCircuitBreaker.recordTransportFailure(cleanTo, lastError?.message)

  console.error(`[EMAIL DISPATCH FAILURE] Exhausted ${retries} attempts to ${cleanTo} via ZeptoMail SMTP. Error: ${lastError?.message}`)
  throw new Error(`Email dispatch failed via ZeptoMail SMTP: ${lastError?.message}`)
}

export default {
  SENDER_ADDRESSES,
  getZeptoTransporter,
  validateEmail,
  compileTemplate,
  sendEmail,
}
