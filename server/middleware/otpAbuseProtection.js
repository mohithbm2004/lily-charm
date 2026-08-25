import SuppressedEmail from '../models/SuppressedEmail.js'
import SecurityLog from '../models/SecurityLog.js'
import emailCircuitBreaker from '../utils/emailCircuitBreaker.js'
import { validateAndNormalizeEmail } from '../utils/emailValidator.js'

// In-Memory Rate Limiting & Abuse Protection Tracker
const emailRequestTracker = new Map() // email -> [{ timestamp }]
const ipRequestTracker = new Map() // ip -> [{ timestamp, email }]
const captchaRequiredIps = new Set()

const WINDOW_15_MIN = 15 * 60 * 1000
const COOLDOWN_60_SEC = 60 * 1000

function cleanTracker(tracker, maxAgeMs) {
  const now = Date.now()
  for (const [key, records] of tracker.entries()) {
    const valid = records.filter((r) => now - r.timestamp < maxAgeMs)
    if (valid.length === 0) {
      tracker.delete(key)
    } else {
      tracker.set(key, valid)
    }
  }
}

setInterval(() => {
  cleanTracker(emailRequestTracker, WINDOW_15_MIN)
  cleanTracker(ipRequestTracker, 24 * 60 * 60 * 1000)
}, 5 * 60 * 1000)

/**
 * Middleware: Enforces ZeptoMail OTP Abuse Protection, Suppression Checks, Circuit Breaker, & Rate Limits
 */
export async function protectOtpRequests(req, res, next) {
  try {
    const email = req.body?.email || req.query?.email || ''
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'

    // 1. Email Normalization & Syntax Validation
    const validation = validateAndNormalizeEmail(email)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error || 'Please enter a valid email address.',
      })
    }

    const cleanEmail = validation.normalized

    // 2. Domain Typo Warning Check (Inline Warning, do not auto-change)
    if (validation.hasTypo && validation.typoInfo) {
      return res.status(400).json({
        success: false,
        hasTypo: true,
        suggestedEmail: validation.typoInfo.suggestedEmail,
        message: validation.typoInfo.suggestionMessage,
      })
    }

    // 3. Hard-Bounce Suppression Check
    const suppressed = await SuppressedEmail.isSuppressed(cleanEmail)
    if (suppressed) {
      // Log attempt to send to suppressed email
      SecurityLog.create({
        eventType: 'SUPPRESSED_EMAIL_ATTEMPT',
        ip,
        email: cleanEmail,
        details: 'Blocked OTP request to previously hard-bounced address',
        severity: 'warning',
      }).catch(console.error)

      return res.status(400).json({
        success: false,
        isSuppressed: true,
        message: 'This email address was previously flagged as undeliverable. Please check or enter a different email address.',
      })
    }

    // 4. Email Sending Circuit Breaker Check
    if (emailCircuitBreaker.isOpen()) {
      return res.status(503).json({
        success: false,
        circuitBreakerOpen: true,
        message: 'Email verification is temporarily paused due to security protection. Please try again later or contact support.',
      })
    }

    // 5. Per-Email Rate Limiting
    const now = Date.now()
    const emailHistory = emailRequestTracker.get(cleanEmail) || []
    const recentEmailRequests = emailHistory.filter((r) => now - r.timestamp < WINDOW_15_MIN)

    // 5a. Cooldown check (60s)
    if (recentEmailRequests.length > 0) {
      const lastSent = recentEmailRequests[recentEmailRequests.length - 1].timestamp
      if (now - lastSent < COOLDOWN_60_SEC) {
        const remainingSeconds = Math.ceil((COOLDOWN_60_SEC - (now - lastSent)) / 1000)
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting another verification code.`,
          retryAfterSeconds: remainingSeconds,
        })
      }
    }

    // 5b. Max 3 per 15 minutes limit per email
    if (recentEmailRequests.length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.',
        requireCaptcha: true,
      })
    }

    // 6. Per-IP Rate Limiting & Suspicious Burst Detection
    const ipHistory = ipRequestTracker.get(ip) || []
    const recentIpRequests = ipHistory.filter((r) => now - r.timestamp < WINDOW_15_MIN)

    // 6a. Max 5 OTP requests per IP per 15 minutes
    if (recentIpRequests.length >= 5) {
      captchaRequiredIps.add(ip)
      SecurityLog.create({
        eventType: 'RATE_LIMIT_EXCEEDED',
        ip,
        email: cleanEmail,
        details: 'Exceeded 5 OTP requests per 15 mins from single IP',
        severity: 'warning',
      }).catch(console.error)

      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.',
        requireCaptcha: true,
      })
    }

    // 6b. Suspicious Burst Detection: 1 IP attempting > 3 distinct emails within 10 minutes
    const distinctEmails = new Set(recentIpRequests.map((r) => r.email))
    distinctEmails.add(cleanEmail)

    if (distinctEmails.size >= 4) {
      captchaRequiredIps.add(ip)
      SecurityLog.create({
        eventType: 'SUSPICIOUS_IP_BURST',
        ip,
        email: cleanEmail,
        details: `IP attempted OTPs for ${distinctEmails.size} distinct email addresses in 10 mins`,
        severity: 'high',
      }).catch(console.error)

      return res.status(429).json({
        success: false,
        message: 'Too many verification attempts. Please try again later.',
        requireCaptcha: true,
      })
    }

    // 7. CAPTCHA verification check if IP is flagged
    if (captchaRequiredIps.has(ip)) {
      const captchaAnswer = req.body?.captchaAnswer || req.body?.captchaResponse
      const captchaExpected = req.body?.captchaExpected

      if (!captchaAnswer || (captchaExpected && String(captchaAnswer).trim() !== String(captchaExpected).trim())) {
        return res.status(400).json({
          success: false,
          requireCaptcha: true,
          message: 'Security verification required. Please complete the CAPTCHA challenge.',
        })
      }
      // Passed captcha! Remove from flagged set for this request
      captchaRequiredIps.delete(ip)
    }

    // Attach tracking recorders to response object for recording after successful endpoint completion
    req.otpSecurity = {
      recordRequest: () => {
        emailHistory.push({ timestamp: now })
        emailRequestTracker.set(cleanEmail, emailHistory)

        ipHistory.push({ timestamp: now, email: cleanEmail })
        ipRequestTracker.set(ip, ipHistory)
      },
    }

    req.cleanEmail = cleanEmail
    next()
  } catch (err) {
    console.error('[OTP ABUSE PROTECTION ERROR]:', err)
    next(err)
  }
}
