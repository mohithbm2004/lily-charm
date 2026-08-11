import { sendEmail } from '../services/email.service.js'

// POST /api/contact — Submit Contact Us message
export async function submitContactMessage(req, res, next) {
  try {
    const { name, email, message, phone, subject } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' })
    }

    const cleanName = name.trim()
    const cleanEmail = email.trim().toLowerCase()
    const cleanMessage = message.trim()
    const cleanPhone = (phone || '').trim()
    const cleanSubject = (subject || '').trim() || 'Studio Inquiry / Custom Creation'

    const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'keerthanabm@lilycharm.in'
    const senderFrom = process.env.EMAIL_FROM || 'Lily Charm <keerthanabm@lilycharm.in>'

    // 1. Send Notification Email to Studio Owner (keerthanabm@lilycharm.in)
    const adminHtml = `
      <div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FAF7F2; border: 1px solid #2B3925; padding: 30px; color: #1C1B18;">
        <div style="text-align: center; border-bottom: 2px solid #2B3925; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #2B3925; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Lily Charm Studio</h1>
          <p style="color: #7A6652; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 5px 0 0;">New Customer Inquiry</p>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #EAE6DE; padding: 20px; margin-bottom: 20px; font-family: 'Inter', Arial, sans-serif;">
          <h2 style="font-size: 16px; color: #2B3925; margin-top: 0; text-transform: uppercase; letter-spacing: 1px;">Inquiry Details</h2>
          <p style="font-size: 14px; margin: 8px 0;"><strong>Sender Name:</strong> ${cleanName}</p>
          <p style="font-size: 14px; margin: 8px 0;"><strong>Customer Email:</strong> <a href="mailto:${cleanEmail}" style="color: #2B3925; font-weight: bold;">${cleanEmail}</a></p>
          ${cleanPhone ? `<p style="font-size: 14px; margin: 8px 0;"><strong>Phone Number:</strong> ${cleanPhone}</p>` : ''}
          <p style="font-size: 14px; margin: 8px 0;"><strong>Subject:</strong> ${cleanSubject}</p>
          <p style="font-size: 12px; color: #7A6652; margin: 8px 0;"><strong>Received:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <div style="background-color: #F4F1EA; border-left: 4px solid #2B3925; padding: 18px; font-family: 'Inter', Arial, sans-serif;">
          <p style="font-size: 11px; text-transform: uppercase; color: #7A6652; font-weight: bold; margin: 0 0 8px; letter-spacing: 1px;">Customer Message:</p>
          <p style="font-size: 14px; line-height: 1.6; color: #1C1B18; margin: 0; white-space: pre-wrap;">${cleanMessage}</p>
        </div>

        <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #DCD6C9;">
          <a href="mailto:${cleanEmail}?subject=Re: ${encodeURIComponent(cleanSubject)} - Lily Charm Studio" style="display: inline-block; background-color: #2B3925; color: #FAF7F2; padding: 10px 22px; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
            Reply to ${cleanName}
          </a>
        </div>
      </div>
    `

    // Attempt to send email to studio receiver via Direct Zoho Mailbox SMTP
    try {
      await sendEmail({
        provider: 'smtp',
        type: 'contact-inquiry',
        to: receiverEmail,
        replyTo: cleanEmail,
        subject: `🌸 New Studio Inquiry from ${cleanName}: ${cleanSubject}`,
        html: adminHtml,
        text: `New message from ${cleanName} (${cleanEmail}):\n\n${cleanMessage}`,
      })
    } catch (err) {
      console.warn('[CONTACT EMAIL RECEIVER NOTICE]:', err.message || err)
    }

    // 2. Send Automated Acknowledgment Email to Customer via Direct Zoho Mailbox SMTP
    const customerAckHtml = `
      <div style="font-family: 'Playfair Display', Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FAF7F2; border: 1px solid #2B3925; padding: 30px; color: #1C1B18;">
        <div style="text-align: center; border-bottom: 2px solid #2B3925; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #2B3925; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Lily Charm</h1>
          <p style="color: #7A6652; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 5px 0 0;">Floral Creations by Keerthana Bapu</p>
        </div>

        <div style="padding: 10px 0; font-family: 'Inter', Arial, sans-serif;">
          <p style="font-size: 15px; color: #1C1B18; line-height: 1.6;">Dear <strong>${cleanName}</strong>,</p>
          <p style="font-size: 14px; color: #52504A; line-height: 1.6;">
            Thank you for reaching out to <strong>Lily Charm</strong>. We have safely received your note regarding <em>"${cleanSubject}"</em>.
          </p>
          <div style="background-color: #F4F1EA; border-left: 3px solid #2B3925; padding: 14px; margin: 15px 0; font-size: 13px; color: #52504A; line-height: 1.5; font-style: italic;">
            "${cleanMessage}"
          </div>
          <p style="font-size: 14px; color: #52504A; line-height: 1.6;">
            Our lead artisan, <strong>Keerthana Bapu</strong>, personally reviews every note and will get back to you within 1–2 business days.
          </p>
          <p style="font-size: 14px; color: #52504A; line-height: 1.6;">
            For urgent custom bespoke commissions or wedding orders, you can also connect with us on Instagram <a href="https://www.instagram.com/lily._charm?igsh=bnkwdWViMjlpMjA1" style="color: #2B3925; font-weight: bold;">@lily._charm</a>.
          </p>
        </div>

        <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 1px solid #DCD6C9; font-size: 11px; color: #7A6652;">
          <p style="margin: 0;">Warm regards,</p>
          <p style="margin: 4px 0 0; font-weight: bold; color: #2B3925; font-family: 'Playfair Display', Georgia, serif; font-size: 14px;">Lily Charm Studio</p>
          <p style="margin: 2px 0 0;"><a href="mailto:keerthanabm@lilycharm.in" style="color: #7A6652; text-decoration: none;">keerthanabm@lilycharm.in</a> • <a href="https://lilycharm.in" style="color: #7A6652; text-decoration: none;">lilycharm.in</a></p>
        </div>
      </div>
    `

    try {
      await sendEmail({
        provider: 'smtp',
        type: 'contact-ack',
        to: cleanEmail,
        subject: `Thank you for contacting Lily Charm Studio — We've received your note! 🌸`,
        html: customerAckHtml,
        text: `Dear ${cleanName},\n\nThank you for reaching out to Lily Charm. We have received your note and Keerthana Bapu will respond within 1-2 business days.\n\nWarm regards,\nLily Charm Studio\nkeerthanabm@lilycharm.in`,
      })
    } catch (err) {
      console.warn('[CONTACT ACK EMAIL NOTICE]:', err.message || err)
    }

    res.status(200).json({
      success: true,
      message: 'Thank you! Your message has been sent to Keerthana Bapu at Lily Charm (keerthanabm@lilycharm.in). We will reply promptly.',
    })
  } catch (err) {
    next(err)
  }
}
