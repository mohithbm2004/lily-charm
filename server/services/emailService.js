import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com'
  const port = Number(process.env.EMAIL_PORT) || 587
  const user = process.env.EMAIL_USER || ''
  const pass = process.env.EMAIL_PASS || ''

  if (!user || !pass) {
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

async function sendMailViaHttp({ to, subject, html, text }) {
  const resendKey = process.env.RESEND_API_KEY || (process.env.EMAIL_PASS?.startsWith('re_') ? process.env.EMAIL_PASS : null)
  const brevoKey = process.env.BREVO_API_KEY || (process.env.EMAIL_PASS?.startsWith('xkeysib-') ? process.env.EMAIL_PASS : null)

  // 1. Resend HTTPS REST API (Port 443)
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Lily Charm <onboarding@resend.dev>',
        to,
        subject,
        html,
        text,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[RESEND API ERROR]:', data)
      throw new Error(`[RESEND API ERROR]: ${data.message || JSON.stringify(data)}`)
    }
    console.log('[RESEND API SUCCESS]:', data)
    return data
  }

  // 2. Brevo HTTPS REST API (Port 443)
  if (brevoKey) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Lily Charm', email: process.env.EMAIL_USER || 'lilycharm.store.in@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[BREVO API ERROR]:', data)
      throw new Error(`[BREVO API ERROR]: ${data.message || JSON.stringify(data)}`)
    }
    console.log('[BREVO API SUCCESS]:', data)
    return data
  }

  // 3. Fallback to Nodemailer SMTP
  const transporter = createTransporter()
  return await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Lily Charm" <lilycharm.store.in@gmail.com>',
    to,
    subject,
    text,
    html,
  })
}

export async function sendOtpEmail(email, name, otp) {
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
    return await sendMailViaHttp({
      to: email,
      subject: `🔐 ${otp} is your Lily Charm Verification Code`,
      text: `Your Lily Charm Verification OTP is ${otp}. It expires in 5 minutes.`,
      html,
    })
  } catch (err) {
    console.error(`[EMAIL SEND FAIL]: ${err.message}`)
    console.log(`[FALLBACK OTP CODE FOR ${email}]: ${otp}`)
    throw err
  }
}

export async function sendPasswordResetEmail(email, name, resetUrl) {
  const appName = 'Lily Charm Floral Studio'

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; color: #2B2625; border: 1px solid #E6DDD0;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #E6DDD0;">
        <h1 style="font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0; color: #8C2D38;">${appName}</h1>
        <p style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #736B65; margin-top: 4px;">Security Account Service</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; margin-top: 0;">Hello, ${name || 'Valued Customer'} 👋</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #524B46;">
          We received a request to reset the password for your Lily Charm account. Click the button below to set a new password:
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; font-size: 14px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #FFFFFF; background-color: #8C2D38; padding: 14px 32px; border-radius: 4px; text-decoration: none;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 12px; color: #736B65; line-height: 1.5;">
          If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #8C2D38; word-break: break-all;">${resetUrl}</a>
        </p>

        <p style="font-size: 12px; color: #C0392B; font-weight: bold; margin-top: 16px;">
          ⏱️ This reset link is valid for 15 minutes only.
        </p>
      </div>

      <div style="border-top: 1px solid #E6DDD0; padding-top: 16px; text-align: center; font-size: 11px; color: #8C847D;">
        <p>© 2026 ${appName}. Handcrafted Velvet Florals by Keerthana Bapu.</p>
      </div>
    </div>
  `

  try {
    return await sendMailViaHttp({
      to: email,
      subject: `🔑 Reset Your Lily Charm Password`,
      text: `Reset your Lily Charm password by visiting: ${resetUrl}`,
      html,
    })
  } catch (err) {
    console.error(`[PASSWORD RESET EMAIL FAIL]: ${err.message}`)
    throw err
  }
}

export async function sendWelcomeEmail(email, name) {
  const appName = 'Lily Charm Floral Studio'

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #FAF7F2; color: #2B2625; border: 1px solid #E6DDD0;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #E6DDD0;">
        <h1 style="font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0; color: #8C2D38;">${appName}</h1>
        <p style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #736B65; margin-top: 4px;">Welcome to Lily Charm</p>
      </div>

      <div style="padding: 24px 0;">
        <h2 style="font-size: 18px; margin-top: 0;">Welcome, ${name || 'Valued Customer'} 🎉</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #524B46;">
          Your Lily Charm account has been verified successfully! Explore our handcrafted velvet floral arrangements, bespoke bridal collections, and custom orders.
        </p>
      </div>

      <div style="border-top: 1px solid #E6DDD0; padding-top: 16px; text-align: center; font-size: 11px; color: #8C847D;">
        <p>© 2026 ${appName}. Handcrafted Velvet Florals by Keerthana Bapu.</p>
      </div>
    </div>
  `

  try {
    return await sendMailViaHttp({
      to: email,
      subject: `🌸 Welcome to Lily Charm Velvet Floral Studio!`,
      text: `Welcome to Lily Charm, ${name}! Your account is active.`,
      html,
    })
  } catch (err) {
    console.error(`[WELCOME EMAIL FAIL]: ${err.message}`)
  }
}
