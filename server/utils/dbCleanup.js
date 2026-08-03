import User from '../models/User.js'

export function startAutomaticDbCleanup() {
  const cleanupJob = async () => {
    try {
      const now = new Date()
      
      // 1. Purge expired OTPs and reset tokens from user records
      const tokenResult = await User.updateMany(
        {
          $or: [
            { otpExpire: { $lt: now } },
            { resetPasswordExpire: { $lt: now } },
          ],
        },
        {
          $set: {
            otp: '',
            otpExpire: null,
            otpAttempts: 0,
            resetPasswordToken: '',
            resetPasswordExpire: null,
          },
        }
      )

      // 2. Delete unverified ghost signup accounts older than 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const ghostResult = await User.deleteMany({
        isVerified: false,
        provider: 'email',
        createdAt: { $lt: twentyFourHoursAgo },
      })

      if (tokenResult.modifiedCount > 0 || ghostResult.deletedCount > 0) {
        console.log(`[DB AUTOMATIC CLEANUP]: Cleared ${tokenResult.modifiedCount} expired tokens, purged ${ghostResult.deletedCount} ghost unverified accounts.`)
      }
    } catch (err) {
      console.error('[DB AUTOMATIC CLEANUP ERROR]:', err.message)
    }
  }

  // Run cleanup immediately on server startup
  cleanupJob()

  // Repeat cleanup every 1 hour (3600000 ms)
  setInterval(cleanupJob, 60 * 60 * 1000)
}
