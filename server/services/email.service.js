import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getZeptoMailAgent, SENDER_ADDRESSES } from '../config/zeptomail.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export { SENDER_ADDRESSES, getZeptoMailAgent }

export function getSenderByPurpose(type = '') {
  return getZeptoMailAgent(type).from.full
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
 * Parses email strings like "Lily Charm <no-reply@lilycharm.in>" into { name, address }
 */
export function parseEmailAddress(input, defaultName = 'Lily Charm') {
  if (!input) return { address: 'no-reply@lilycharm.in', name: defaultName }
  if (typeof input === 'object' && input.address) {
    return { address: input.address.trim().toLowerCase(), name: input.name || defaultName }
  }

  const str = String(input).trim()
  const match = str.match(/^(?:"?([^"]*)"?\s)?(?:<(.+)>)$/)
  if (match) {
    return {
      name: (match[1] || defaultName).trim(),
      address: match[2].trim().toLowerCase(),
    }
  }

  return {
    name: defaultName,
    address: str.toLowerCase(),
  }
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
 * Centralized Email Dispatcher using ZeptoMail HTTP REST API (Port 443 HTTPS)
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
  // 1. Recipient Validation
  if (!validateEmail(to)) {
    const errorMsg = `Invalid recipient email address: "${to}"`
    console.error(`[ZEPTOMAIL API VALIDATION ERROR]: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  const cleanTo = to.trim().toLowerCase()

  // 2. Resolve Agent and Sender details for this purpose
  const agent = getZeptoMailAgent(type)
  const parsedFrom = from ? parseEmailAddress(from) : { address: agent.from.address, name: agent.from.name }

  // 3. Configuration Check
  if (!agent.configured) {
    const notice = `ZeptoMail API token is not configured for ${agent.agent}. Please set ${getEnvVarNameForAgent(agent.purpose)} in Render environment variables.`
    console.warn(`[ZEPTOMAIL API CONFIG NOTICE] [${agent.agent}]: ${notice}`)
    return {
      success: false,
      message: 'ZeptoMail API token is not configured.',
      configured: false,
      agent: agent.agent,
      purpose: agent.purpose,
      to: cleanTo,
    }
  }

  // 4. Build ZeptoMail HTTP REST API Payload
  const formattedAttachments = attachments.map((att) => ({
    name: att.filename || 'attachment',
    content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
    mime_type: att.contentType || 'application/octet-stream',
  }))

  const payload = {
    from: {
      address: parsedFrom.address,
      name: parsedFrom.name,
    },
    to: [
      {
        email_address: {
          address: cleanTo,
          name: toName || parsedFrom.name || 'Valued Customer',
        },
      },
    ],
    subject: subject || 'Notification from Lily Charm',
    htmlbody: html || `<p>${text || ''}</p>`,
    ...(text ? { textbody: text } : {}),
    ...(replyTo
      ? {
          reply_to: [
            typeof replyTo === 'string'
              ? { address: replyTo.trim().toLowerCase(), name: parsedFrom.name }
              : { address: replyTo.address, name: replyTo.name || parsedFrom.name },
          ],
        }
      : {}),
    ...(formattedAttachments.length > 0 ? { attachments: formattedAttachments } : {}),
  }

  // 5. Retry Loop for HTTP API with Exponential Backoff
  let attempt = 0
  let lastError = null

  while (attempt < retries) {
    attempt++
    try {
      const response = await fetch(agent.apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': agent.authHeader,
        },
        body: JSON.stringify(payload),
      })

      const rawResponseText = await response.text()
      let responseData = {}
      try {
        responseData = JSON.parse(rawResponseText)
      } catch (_jsonErr) {
        responseData = { raw: rawResponseText }
      }

      if (response.ok || response.status === 200 || response.status === 201) {
        const messageId =
          responseData?.data?.[0]?.message_id ||
          responseData?.data?.[0]?.additional_info?.[0]?.message_id ||
          `zepto-${Date.now()}`

        console.log(
          `[EMAIL SUCCESS] [ZeptoMail HTTP API] [${agent.agent}] [From: ${parsedFrom.address}] Sent to ${cleanTo} (ID: ${messageId})`
        )
        return {
          success: true,
          messageId,
          provider: 'zeptomail-http-api',
          agent: agent.agent,
          purpose: agent.purpose,
          attempts: attempt,
          data: responseData,
        }
      }

      // Handle HTTP API Error Statuses
      const errCode = responseData?.error?.code || response.status
      const errMsg =
        responseData?.error?.details?.[0]?.message ||
        responseData?.error?.message ||
        responseData?.message ||
        response.statusText

      if (response.status === 401 || response.status === 403) {
        console.error(
          `[ZEPTOMAIL API AUTH ERROR] [${agent.agent}] Status ${response.status}: ${errMsg}. Check ${getEnvVarNameForAgent(agent.purpose)} token.`
        )
      } else if (response.status === 400) {
        console.error(
          `[ZEPTOMAIL API VALIDATION ERROR] [${agent.agent}] Status 400: ${errMsg}. Sender address: ${parsedFrom.address}`
        )
      } else {
        console.warn(
          `[ZEPTOMAIL API REQUEST WARNING] [Attempt ${attempt}/${retries}] Status ${response.status}: ${errMsg}`
        )
      }

      lastError = new Error(`ZeptoMail HTTP API Error (${response.status}): ${errMsg}`)
    } catch (fetchErr) {
      console.warn(
        `[ZEPTOMAIL API NETWORK WARNING] [Attempt ${attempt}/${retries}] Network error: ${fetchErr.message}`
      )
      lastError = fetchErr
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  console.error(
    `[EMAIL DISPATCH FAILURE] Exhausted ${retries} attempts to ${cleanTo} via ZeptoMail HTTP API (${agent.agent}). Error: ${lastError?.message}`
  )
  throw new Error(`Email dispatch failed via ZeptoMail HTTP API: ${lastError?.message}`)
}

function getEnvVarNameForAgent(purpose = '') {
  const p = purpose.toLowerCase()
  if (p.includes('otp') || p.includes('verify') || p.includes('reset')) return 'ZEPTO_OTP_API_TOKEN'
  if (p.includes('order') || p.includes('invoice') || p.includes('refund')) return 'ZEPTO_ORDER_API_TOKEN'
  if (p.includes('support')) return 'ZEPTO_SUPPORT_API_TOKEN'
  return 'ZEPTO_CONTACT_API_TOKEN'
}

export default {
  SENDER_ADDRESSES,
  getZeptoMailAgent,
  validateEmail,
  compileTemplate,
  parseEmailAddress,
  sendEmail,
}
