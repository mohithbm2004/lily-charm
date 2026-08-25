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

  // Email Test Mode Override
  EMAIL_TEST_MODE: process.env.EMAIL_TEST_MODE === 'true',
  TEST_EMAIL_RECIPIENTS: (process.env.TEST_EMAIL_RECIPIENTS || 'mohithbmanjunatha@gmail.com,mohithb47@gmail.com,bmmohith48@gmail.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

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

  // ZeptoMail Multi-Channel Configuration
  ZEPTO: {
    WEBHOOK_SECRET: (process.env.ZEPTOMAIL_WEBHOOK_SECRET || '').trim(),
    OTP: {
      HOST: process.env.ZEPTO_OTP_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      PORT: Number(process.env.ZEPTO_OTP_PORT || process.env.ZEPTOMAIL_PORT || 587),
      USER: process.env.ZEPTO_OTP_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      PASS: process.env.ZEPTO_OTP_PASSWORD || process.env.ZEPTOMAIL_PASSWORD || '',
    },
    ORDER: {
      HOST: process.env.ZEPTO_ORDER_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      PORT: Number(process.env.ZEPTO_ORDER_PORT || process.env.ZEPTOMAIL_PORT || 587),
      USER: process.env.ZEPTO_ORDER_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      PASS: process.env.ZEPTO_ORDER_PASSWORD || process.env.ZEPTOMAIL_PASSWORD || '',
    },
    SUPPORT: {
      HOST: process.env.ZEPTO_SUPPORT_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      PORT: Number(process.env.ZEPTO_SUPPORT_PORT || process.env.ZEPTOMAIL_PORT || 587),
      USER: process.env.ZEPTO_SUPPORT_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      PASS: process.env.ZEPTO_SUPPORT_PASSWORD || process.env.ZEPTOMAIL_PASSWORD || '',
    },
    CONTACT: {
      HOST: process.env.ZEPTO_CONTACT_HOST || process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in',
      PORT: Number(process.env.ZEPTO_CONTACT_PORT || process.env.ZEPTOMAIL_PORT || 587),
      USER: process.env.ZEPTO_CONTACT_USER || process.env.ZEPTOMAIL_USER || 'emailapikey',
      PASS: process.env.ZEPTO_CONTACT_PASSWORD || process.env.ZEPTOMAIL_PASSWORD || '',
    },
  },

  // Allowed CORS origins generator
  getCorsOrigins() {
    const rawUrls = [
      this.CLIENT_URL,
      this.ADMIN_CLIENT_URL,
      process.env.ALLOWED_ORIGINS,
      process.env.CORS_ORIGIN,
      'https://lilycharm.in',
      'https://www.lilycharm.in',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:4173',
    ]
    const origins = []
    rawUrls.forEach((u) => {
      if (!u) return
      String(u)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((entry) => {
          origins.push(entry)
          if (entry.startsWith('https://') && !entry.startsWith('https://www.')) {
            origins.push(entry.replace('https://', 'https://www.'))
          }
        })
    })
    return [...new Set(origins)]
  },
}

export default ENV
