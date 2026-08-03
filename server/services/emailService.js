import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com'
  const port = Number(process.env.EMAIL_PORT) || 587
  const user = process.env.EMAIL_USER || ''
  const pass = process.env.EMAIL_PASS || ''

  if (!user || !pass) {
    // Development fallback mock logger if credentials are not configured
    return {
      sendMail: async (options) => {
        console.log(`[MOCK EMAIL SERVICE] To: ${options.to} | Subject: ${options.subject}`)
        console.log(`[EMAIL BODY PREVIEW]: ${options.text || 'HTML Content Sent'}`)
        return { messageId: 'mock-email-id' }
      },
    }
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendOtpEmail(email, name, otp) {
  const transporter = createTransporter()
  const appName = 'Lily Charm Floral Studio'

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; color: #2B2625; border: 1px solid #E6DDD0;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #E6DDD0;">
        <h1 style="font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0; color: #8C2D38;">${appName}</h1>
        <p style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #736B65; margin-top: 4px;">Account Verification Service</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; margin-top: 0;">Hello, ${name || 'Valued Customer'} 👋</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #524B46;">
          Thank you for joining Lily Charm. Please verify your email address to activate your account and explore our handcrafted velvet floral collections.
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <span style="font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #736B65; display: block; margin-bottom: 8px;">Your 6-Digit OTP Code</span>
          <div style="display: inline-block; font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 8px; color: #8C2D38; background-color: #FFFFFF; border: 2px dashed #8C2D38; padding: 12px 28px; border-radius: 6px;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #C0392B; margin-top: 10px; font-weight: bold;">
            ⏱️ This OTP expires in 5 minutes. Do not share this code with anyone.
          </p>
        </div>

        <p style="font-size: 13px; color: #736B65; line-height: 1.5;">
          If you did not request this verification email, please ignore this message.
        </p>
      </div>

      <div style="border-top: 1px solid #E6DDD0; padding-top: 16px; text-align: center; font-size: 11px; color: #8C847D;">
        <p>© 2026 ${appName}. Handcrafted Velvet Florals by Keerthana Bapu.</p>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"${appName}" <${process.env.EMAIL_USER || 'noreply@lilycharm.com'}>`,
      to: email,
      subject: `🔐 ${otp} is your Lily Charm Verification Code`,
      text: `Your Lily Charm Verification OTP is ${otp}. It expires in 5 minutes.`,
      html,
    })
  } catch (err) {
    console.error(`[SMTP ERROR - ${err.code || 'SEND_FAIL'}]: ${err.message}`)
    console.log(`[FALLBACK OTP CODE FOR ${email}]: ${otp}`)
  }
}

export async function sendPasswordResetEmail(email, name, resetUrl) {
  const transporter = createTransporter()
  const appName = 'Lily Charm Floral Studio'

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; color: #2B2625; border: 1px solid #E6DDD0;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #E6DDD0;">
        <h1 style="font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0; color: #8C2D38;">${appName}</h1>
        <p style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #736B65; margin-top: 4px;">Password Reset Request</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; margin-top: 0;">Hello, ${name || 'Customer'}</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #524B46;">
          We received a request to reset your password for your Lily Charm customer account. Click the button below to choose a new password.
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetUrl}" target="_blank" style="font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #FFFFFF; background-color: #8C2D38; padding: 14px 28px; text-decoration: none; display: inline-block; border-radius: 4px;">
            🔒 Reset My Password
          </a>
          <p style="font-size: 12px; color: #C0392B; margin-top: 12px; font-weight: bold;">
            ⏱️ Link expires in 15 minutes.
          </p>
        </div>

        <p style="font-size: 12px; color: #736B65; word-break: break-all;">
          Or copy and paste this link in your browser:<br />
          <a href="${resetUrl}" style="color: #8C2D38;">${resetUrl}</a>
        </p>
      </div>

      <div style="border-top: 1px solid #E6DDD0; padding-top: 16px; text-align: center; font-size: 11px; color: #8C847D;">
        <p>© 2026 ${appName}. All rights reserved.</p>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"${appName}" <${process.env.EMAIL_USER || 'noreply@lilycharm.com'}>`,
      to: email,
      subject: `🔑 Reset Your Password — ${appName}`,
      text: `Reset your password by visiting: ${resetUrl}`,
      html,
    })
  } catch (err) {
    console.error(`[SMTP ERROR - ${err.code || 'SEND_FAIL'}]: ${err.message}`)
    console.log(`[FALLBACK RESET URL FOR ${email}]: ${resetUrl}`)
  }
}

export async function sendWelcomeEmail(email, name) {
  const transporter = createTransporter()
  const appName = 'Lily Charm Floral Studio'

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; color: #2B2625; border: 1px solid #E6DDD0;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #E6DDD0;">
        <h1 style="font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0; color: #8C2D38;">${appName}</h1>
        <p style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #736B65; margin-top: 4px;">Welcome to the Studio</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 20px; margin-top: 0;">Welcome, ${name}! ✨</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #524B46;">
          Your account has been successfully verified. You can now save your addresses, track bespoke orders, and request custom handcrafted velvet floral arrangements directly from our artisan studio.
        </p>
      </div>
    </div>
  `

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"${appName}" <${process.env.EMAIL_USER || 'noreply@lilycharm.com'}>`,
      to: email,
      subject: `✨ Welcome to ${appName}!`,
      text: `Welcome ${name}! Your account is now active.`,
      html,
    })
  } catch (err) {
    console.error(`[SMTP ERROR - ${err.code || 'SEND_FAIL'}]: ${err.message}`)
  }
}
