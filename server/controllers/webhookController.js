import SuppressedEmail from '../models/SuppressedEmail.js'
import EmailBounceLog from '../models/EmailBounceLog.js'
import emailCircuitBreaker from '../utils/emailCircuitBreaker.js'
import SecurityLog from '../models/SecurityLog.js'
import ENV from '../config/env.js'

/**
 * Handle Incoming Bounce & Delivery Webhooks from ZeptoMail
 * Endpoint: POST /api/webhooks/zeptomail
 */
export async function handleZeptoMailWebhook(req, res, next) {
  try {
    const webhookSecret = ENV.ZEPTO.WEBHOOK_SECRET || process.env.ZEPTOMAIL_WEBHOOK_SECRET || ''

    // 1. Authenticate Webhook Request if secret is configured
    if (webhookSecret) {
      const incomingToken =
        req.headers['x-zeptomail-token'] ||
        req.headers['x-webhook-secret'] ||
        req.query.token ||
        req.headers.authorization ||
        ''

      const cleanIncoming = String(incomingToken).replace(/^Bearer\s+/i, '').trim()
      if (cleanIncoming !== webhookSecret) {
        console.warn('⚠️ [WEBHOOK UNAUTHORIZED]: Invalid ZeptoMail webhook token attempt.')
        return res.status(401).json({ success: false, message: 'Unauthorized webhook payload signature.' })
      }
    }

    const payload = req.body || {}
    const events = Array.isArray(payload) ? payload : [payload]

    let processedCount = 0

    for (const evt of events) {
      // Resolve recipient email from various ZeptoMail payload structures
      const email = (
        evt.email ||
        evt.recipient ||
        evt.to ||
        evt.data?.recipient ||
        evt.event_data?.recipient ||
        evt.data?.email_address?.address ||
        ''
      )
        .trim()
        .toLowerCase()

      if (!email) continue

      const eventType = (
        evt.event_type ||
        evt.type ||
        evt.event ||
        evt.status ||
        'bounce'
      ).toLowerCase()

      const bounceCode = String(evt.bounce_code || evt.code || evt.status_code || '550')
      const reason = evt.reason || evt.description || evt.message || `ZeptoMail Webhook Event: ${eventType}`

      console.log(`[ZEPTOMAIL WEBHOOK EVENT]: ${eventType} for ${email} (Code: ${bounceCode}, Reason: ${reason})`)

      const isHardBounce =
        eventType.includes('hard') ||
        eventType.includes('bounce') ||
        eventType.includes('suppress') ||
        eventType.includes('invalid') ||
        eventType.includes('reject') ||
        bounceCode.startsWith('5')

      if (isHardBounce) {
        // Record in SuppressedEmail
        await SuppressedEmail.suppressEmail({
          email,
          reason,
          bounceType: 'hard',
          bounceCode,
          source: 'zeptomail-webhook',
          metadata: evt,
        }).catch(console.error)

        // Record in Bounce Log
        await EmailBounceLog.create({
          email,
          bounceType: 'hard',
          bounceCode,
          reason,
          channel: 'WEBHOOK',
          rawEvent: evt,
          ip: req.ip || '',
        }).catch(console.error)

        // Inform Circuit Breaker
        emailCircuitBreaker.recordHardBounce(email, reason)

        // Log Security Audit Event
        SecurityLog.create({
          eventType: 'ZEPTOMAIL_WEBHOOK_HARD_BOUNCE',
          email,
          details: `Hard bounce reported via webhook: ${reason}`,
          severity: 'warning',
          metadata: { bounceCode, eventType },
        }).catch(console.error)
      } else {
        // Log Soft Bounce
        await EmailBounceLog.create({
          email,
          bounceType: 'soft',
          bounceCode,
          reason,
          channel: 'WEBHOOK',
          rawEvent: evt,
          ip: req.ip || '',
        }).catch(console.error)
      }

      processedCount++
    }

    res.status(200).json({
      success: true,
      message: 'ZeptoMail webhook processed successfully.',
      processedCount,
    })
  } catch (err) {
    console.error('[ZEPTOMAIL WEBHOOK ERROR]:', err)
    next(err)
  }
}
