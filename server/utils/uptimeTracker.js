let lastUptimeRobotPing = null

export const recordPing = (userAgent) => {
  const ua = userAgent || ''
  const isUptimeRobot = ua.toLowerCase().includes('uptimerobot')
  
  const timestamp = new Date()
  if (isUptimeRobot) {
    lastUptimeRobotPing = timestamp
    console.log(`🤖 Uptime Robot Ping Received: Health Check verified successfully at ${timestamp.toISOString()}`)
  } else {
    console.log(`🏥 Health Check verified successfully at ${timestamp.toISOString()}`)
  }
}

export const getLastPing = () => {
  return lastUptimeRobotPing
}
