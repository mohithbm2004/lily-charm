import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getZeptoMailAgent, SENDER_ADDRESSES } from '../config/zeptomail.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export { SENDER_ADDRESSES, getZeptoMailAgent }

export function getSenderByPurpose(type = '') {
  return getZeptoMailAgent(type).from
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
 * Centralized Email Dispatcher using ONLY ZeptoMail SMTP (smtp.zeptomail.in:587)
 */
export async function sendEmail({
  type = 'generic',
  to,
  from,
  subject,
  html,
  text,
  attachments = [],
  replyTo,
  data = {},
  retries = 2,
}) {
  // 1. Recipient Validation
  if (!validateEmail(to)) {
    const errorMsg = `Invalid recipient email address: "${to}"`
    console.error(`[ZEPTOMAIL VALIDATION ERROR]: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const cleanTo = to.trim().toLowerCase()

  // 2. Resolve Agent Transporter and Verified Sender for this Email Purpose
  const agent = getZeptoMailAgent(type)
  const fromAddress = from || agent.from

  // 3. Clear Configuration Check
  if (!agent.configured || !agent.transport) {
    const notice = `ZeptoMail credentials are not configured.`
    console.warn(`[ZEPTOMAIL CONFIG NOTICE] [Purpose: ${agent.purpose.toUpperCase()}]: ${notice}`)
    return {
      success: false,
      message: notice,
      configured: false,
      purpose: agent.purpose,
      from: fromAddress,
      to: cleanTo,
    }
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

      const info = await agent.transport.sendMail(mailOptions)
      console.log(`[EMAIL SUCCESS] [ZeptoMail SMTP] [Purpose: ${agent.purpose.toUpperCase()}] [From: ${fromAddress}] Sent to ${cleanTo} (ID: ${info.messageId})`)
      return { success: true, messageId: info.messageId, provider: 'zeptomail', purpose: agent.purpose, attempts: attempt }
    } catch (err) {
      lastError = err
      console.warn(`[EMAIL RETRY WARNING] [Attempt ${attempt}/${retries}] [ZeptoMail SMTP] [Purpose: ${agent.purpose.toUpperCase()}] Failed to send to ${cleanTo}: ${err.message}`)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  console.error(`[EMAIL DISPATCH FAILURE] Exhausted ${retries} attempts to ${cleanTo} via ZeptoMail SMTP (${agent.purpose.toUpperCase()}). Error: ${lastError?.message}`)
  throw new Error(`Email dispatch failed via ZeptoMail SMTP: ${lastError?.message}`)
}

export default {
  SENDER_ADDRESSES,
  validateEmail,
  compileTemplate,
  sendEmail,
}
