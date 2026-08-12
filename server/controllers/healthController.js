import { testZeptoMailNetwork } from '../config/zeptomail.js'

export const checkHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bloom Atelier API is healthy',
    timestamp: new Date().toISOString(),
  })
}

export const checkSmtpHealth = async (_req, res) => {
  try {
    const networkDiagnostics = await testZeptoMailNetwork()
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics: networkDiagnostics,
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
}