let lastUptimeRobotPing = null
const pingHistory = []
const MAX_HISTORY = 20

export const recordPing = (userAgent) => {
  const ua = userAgent || ''
  const isUptimeRobot = ua.toLowerCase().includes('uptimerobot')
  
  const timestamp = new Date()
  if (isUptimeRobot) {
    lastUptimeRobotPing = timestamp
  }

  const logEntry = {
    timestamp,
    userAgent: ua,
    isUptimeRobot,
  }

  pingHistory.unshift(logEntry)
  if (pingHistory.length > MAX_HISTORY) {
    pingHistory.pop()
  }
  
  if (isUptimeRobot) {
    console.log(`🤖 Uptime Robot Ping Received: Health Check verified successfully at ${timestamp.toISOString()}`)
  } else {
    console.log(`🏥 Health Check verified successfully at ${timestamp.toISOString()}`)
  }
}

export const getLastPing = () => {
  return lastUptimeRobotPing
}

export const getPingHistory = () => {
  return pingHistory
}
