const checkHealth = (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running successfully",
        timestamp: new Date().toISOString
    })
}