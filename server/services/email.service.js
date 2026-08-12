import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  getZeptoMailAgent,
  SENDER_ADDRESSES,
  createAgentTransport,
  categorizeSmtpError,
} from '../config/zeptomail.js'

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
 * Centralized Email Dispatcher using ONLY ZeptoMail SMTP with Multi-Port Failover & Categorized Logging
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

  // 3. Configuration Check
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

  // 4. Dispatch Email Options
  const mailOptions = {
    from: fromAddress,
    to: cleanTo,
    subject,
    text: text || '',
    html: html || '',
    attachments,
    ...(replyTo ? { replyTo } : {}),
  }

  let attempt = 0
  let lastCategorized = null

  while (attempt < retries) {
    attempt++

    // Try Primary Transporter (Controlled by ZEPTOMAIL_PORT / 587)
    try {
      const info = await agent.transport.sendMail(mailOptions)
      console.log(`[EMAIL SUCCESS] [ZeptoMail SMTP] [Purpose: ${agent.purpose.toUpperCase()}] [Port: ${agent.port}] [From: ${fromAddress}] Sent to ${cleanTo} (ID: ${info.messageId})`)
      return {
        success: true,
        messageId: info.messageId,
        provider: 'zeptomail',
        purpose: agent.purpose,
        port: agent.port,
        attempts: attempt,
      }
    } catch (err) {
      lastCategorized = categorizeSmtpError(err, agent.host, agent.port)
      console.warn(`[EMAIL ATTEMPT ${attempt}/${retries} FAILED] [Category: ${lastCategorized.category}] ${lastCategorized.message}`)

      // If connection timed out on Port 587 and fallback is viable, attempt Port 465 (SSL)
      if (agent.pass && agent.port !== 465 && (lastCategorized.category === 'TCP_CONNECTION_TIMEOUT' || lastCategorized.category === 'TLS_FAILURE')) {
        console.log(`[ZEPTOMAIL RESILIENT FALLBACK] Attempting instantaneous fallback via Port 465 (SSL TLSv1.2)...`)
        try {
          const fallbackTransport = createAgentTransport({
            host: agent.host,
            port: 465,
            pass: agent.pass,
            secure: true,
            requireTLS: false,
            tlsMinVersion: 'TLSv1.2',
            label: 'Fallback-SSL',
          })
          const fallbackInfo = await fallbackTransport.sendMail(mailOptions)
          console.log(`[EMAIL SUCCESS via ZeptoMail Port 465 SSL] Sent to ${cleanTo} (ID: ${fallbackInfo.messageId})`)
          return {
            success: true,
            messageId: fallbackInfo.messageId,
            provider: 'zeptomail-ssl-fallback',
            purpose: agent.purpose,
            port: 465,
            attempts: attempt,
          }
        } catch (fallbackErr) {
          const fbCat = categorizeSmtpError(fallbackErr, agent.host, 465)
          console.error(`[ZEPTOMAIL FALLBACK PORT 465 FAILED] [Category: ${fbCat.category}] ${fbCat.message}`)
        }
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  console.error(`[EMAIL DISPATCH FAILURE] Exhausted ${retries} attempts to ${cleanTo} via ZeptoMail SMTP (${agent.purpose.toUpperCase()}). Last Error [${lastCategorized?.category}]: ${lastCategorized?.message}`)
  throw new Error(`Email dispatch failed via ZeptoMail SMTP [${lastCategorized?.category}]: ${lastCategorized?.message}`)
}

export default {
  SENDER_ADDRESSES,
  getZeptoMailAgent,
  validateEmail,
  compileTemplate,
  sendEmail,
}
