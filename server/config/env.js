import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: isProduction,
  PORT: Number(process.env.PORT) || 5000,

  // Database
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lilycharm',

  // Authentication & Security
  JWT_SECRET: process.env.JWT_SECRET || 'lily_charm_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || 'admin@bloomatelier.com').toLowerCase().trim(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'LilyAdmin@2026Secure!',

  // Frontend Client URLs
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_CLIENT_URL: process.env.ADMIN_CLIENT_URL || 'http://localhost:5174',

  // Cloudinary
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  },

  // Razorpay
  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock1234567890',
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'mock_razorpay_secret_key',
    WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // ZeptoMail
  ZEPTO: {
    API_URL: process.env.ZEPTO_API_URL || 'https://api.zeptomail.in/v1.1/email',
    OTP_TOKEN: (process.env.ZEPTO_OTP_API_TOKEN || process.env.ZEPTOMAIL_API_TOKEN || '').trim(),
    ORDER_TOKEN: (process.env.ZEPTO_ORDER_API_TOKEN || process.env.ZEPTOMAIL_API_TOKEN || '').trim(),
    SUPPORT_TOKEN: (process.env.ZEPTO_SUPPORT_API_TOKEN || process.env.ZEPTOMAIL_API_TOKEN || '').trim(),
    CONTACT_TOKEN: (process.env.ZEPTO_CONTACT_API_TOKEN || process.env.ZEPTOMAIL_API_TOKEN || '').trim(),
  },

  // Allowed CORS origins generator
  getCorsOrigins() {
    const list = [
      this.CLIENT_URL,
      this.ADMIN_CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ]
    return list.filter(Boolean)
  },
}

export default ENV
