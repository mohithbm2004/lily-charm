import { getZeptoMailAgent, DEFAULT_API_URL } from '../config/zeptomail.js'
import { recordPing } from '../utils/uptimeTracker.js'

export const checkHealth = (req, res) => {
  recordPing(req.headers['user-agent'])
  res.status(200).json({
    success: true,
    message: 'Bloom Atelier API is healthy',
    timestamp: new Date().toISOString(),
  })
}

export const checkEmailApiHealth = async (_req, res) => {
  const agents = ['otp', 'order', 'support', 'contact']
  const statusReport = {
    provider: 'ZeptoMail HTTP REST API (Port 443 HTTPS)',
    apiUrl: DEFAULT_API_URL,
    timestamp: new Date().toISOString(),
    agents: {},
  }

  for (const purpose of agents) {
    const agent = getZeptoMailAgent(purpose)
    statusReport.agents[purpose] = {
      agentName: agent.agent,
      sender: agent.from.full,
      configured: agent.configured,
      envKey:
        purpose === 'otp'
          ? 'ZEPTO_OTP_API_TOKEN'
          : purpose === 'order'
          ? 'ZEPTO_ORDER_API_TOKEN'
          : purpose === 'support'
          ? 'ZEPTO_SUPPORT_API_TOKEN'
          : 'ZEPTO_CONTACT_API_TOKEN',
    }
  }

  // Quick connectivity ping to ZeptoMail API (Port 443)
  try {
    const pingStart = Date.now()
    const pingRes = await fetch('https://api.zeptomail.in', { method: 'HEAD' })
    statusReport.networkPing = {
      status: 'REACHABLE',
      httpStatus: pingRes.status,
      latencyMs: Date.now() - pingStart,
    }
  } catch (err) {
    statusReport.networkPing = {
      status: 'UNREACHABLE',
      error: err.message,
    }
  }

  res.status(200).json({
    success: true,
    ...statusReport,
  })
}