import SecurityLog from '../models/SecurityLog.js'
import ENV from '../config/env.js'

class EmailCircuitBreaker {
  constructor() {
    this.state = 'CLOSED' // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.windowMs = 10 * 60 * 1000 // 10 minutes window
    this.openDurationMs = 15 * 60 * 1000 // 15 minutes pause
    this.maxHardBouncesInWindow = 5
    this.maxTransportFailuresInWindow = 8

    this.events = [] // [{ type: 'hard_bounce' | 'transport_failure' | 'success', timestamp: number, email: string }]
    this.lastTrippedAt = null
    this.openUntil = null
  }

  cleanWindow() {
    const cutoff = Date.now() - this.windowMs
    this.events = this.events.filter((ev) => ev.timestamp >= cutoff)
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.openUntil) {
        console.log('[CIRCUIT BREAKER]: Transitioning from OPEN to HALF_OPEN for testing.')
        this.state = 'HALF_OPEN'
        return false
      }
      return true
    }
    return false
  }

  recordHardBounce(email = '', reason = '') {
    this.cleanWindow()
    const now = Date.now()
    this.events.push({ type: 'hard_bounce', timestamp: now, email, reason })

    const hardBounces = this.events.filter((ev) => ev.type === 'hard_bounce').length

    if (hardBounces >= this.maxHardBouncesInWindow && this.state !== 'OPEN') {
      this.trip('HARD_BOUNCE_SPIKE', `${hardBounces} hard bounces detected within 10 minutes.`)
    }
  }

  recordTransportFailure(email = '', errorMsg = '') {
    this.cleanWindow()
    const now = Date.now()
    this.events.push({ type: 'transport_failure', timestamp: now, email, errorMsg })

    const transportFailures = this.events.filter((ev) => ev.type === 'transport_failure').length

    if (transportFailures >= this.maxTransportFailuresInWindow && this.state !== 'OPEN') {
      this.trip('TRANSPORT_FAILURE_SPIKE', `${transportFailures} SMTP connection failures detected within 10 minutes.`)
    }
  }

  recordSuccess() {
    this.cleanWindow()
    this.events.push({ type: 'success', timestamp: Date.now() })
    if (this.state === 'HALF_OPEN') {
      console.log('[CIRCUIT BREAKER]: Successful send in HALF_OPEN state. Resetting to CLOSED.')
      this.state = 'CLOSED'
      this.openUntil = null
    }
  }

  trip(reasonType, message) {
    this.state = 'OPEN'
    this.lastTrippedAt = new Date()
    this.openUntil = Date.now() + this.openDurationMs

    console.error(`🚨 [CIRCUIT BREAKER TRIPPED]: ${reasonType} - ${message}. Pausing OTP sending for 15 minutes.`)

    // Log security incident asynchronously
    SecurityLog.create({
      eventType: 'CIRCUIT_BREAKER_TRIPPED',
      details: `${reasonType}: ${message}`,
      severity: 'critical',
      metadata: {
        openUntil: new Date(this.openUntil),
        eventsCount: this.events.length,
      },
    }).catch(console.error)

    // Notify admin
    this.notifyAdminOfTrip(reasonType, message).catch(console.error)
  }

  async notifyAdminOfTrip(reasonType, message) {
    try {
      const adminEmail = ENV.ADMIN_EMAIL || 'keerthanabm@lilycharm.in'
      console.warn(`[ADMIN CIRCUIT BREAKER ALERT]: Sending alert notification to ${adminEmail}`)
    } catch (err) {
      console.error('[CIRCUIT BREAKER ALERT ERROR]:', err.message)
    }
  }

  reset() {
    this.state = 'CLOSED'
    this.events = []
    this.lastTrippedAt = null
    this.openUntil = null
    console.log('[CIRCUIT BREAKER]: Manually reset to CLOSED state by admin.')
  }

  getStatus() {
    this.cleanWindow()
    const hardBounces = this.events.filter((ev) => ev.type === 'hard_bounce').length
    const transportFailures = this.events.filter((ev) => ev.type === 'transport_failure').length

    return {
      state: this.state,
      isOpen: this.isOpen(),
      lastTrippedAt: this.lastTrippedAt,
      openUntil: this.openUntil ? new Date(this.openUntil) : null,
      metrics: {
        windowMinutes: 10,
        hardBouncesInWindow: hardBounces,
        transportFailuresInWindow: transportFailures,
        totalEventsInWindow: this.events.length,
        hardBounceThreshold: this.maxHardBouncesInWindow,
        transportFailureThreshold: this.maxTransportFailuresInWindow,
      },
    }
  }
}

export const emailCircuitBreaker = new EmailCircuitBreaker()

export default emailCircuitBreaker
