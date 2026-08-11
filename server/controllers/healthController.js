export const checkHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bloom Atelier API is healthy',
    timestamp: new Date().toISOString(),
  })
}