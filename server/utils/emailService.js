import nodemailer from 'nodemailer'

const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com'
  const port = Number(process.env.EMAIL_PORT || 587)
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS

  if (!user || !pass) {
    console.warn('[EMAIL WARNING]: EMAIL_USER or EMAIL_PASS missing in server env. Email sending will be logged to console.')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendOrderConfirmationEmail(order) {
  try {
    const transporter = createTransporter()
    const recipientEmail = order.shippingAddress?.email
    if (!recipientEmail) return

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; color: #2b2b2b;">
        <div style="background-color: #212B1C; padding: 20px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LILY CHARM</h1>
          <p style="margin: 5px 0 0; font-size: 12px; color: #E8DCC4;">Handcrafted Botanical Art & Velvet Sculptures</p>
        </div>
        
        <h2 style="color: #212B1C; margin-top: 20px;">Order Confirmation - ${order.orderNumber}</h2>
        <p>Hi ${order.shippingAddress?.name || 'Valued Customer'},</p>
        <p>Thank you for your order! We have received your order and payment. Our studio is preparing your handcrafted items with care.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #F4F1EA; text-align: left;">
              <th style="padding: 8px; border: 1px solid #dddddd;">Item</th>
              <th style="padding: 8px; border: 1px solid #dddddd;">Qty</th>
              <th style="padding: 8px; border: 1px solid #dddddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || [])
              .map(
                (item) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #dddddd;">${item.title}</td>
                <td style="padding: 8px; border: 1px solid #dddddd; text-align: center;">${item.qty}</td>
                <td style="padding: 8px; border: 1px solid #dddddd;">₹${(item.price * item.qty).toLocaleString('en-IN')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <p style="margin-top: 20px; font-size: 16px;"><strong>Total Paid: ₹${(order.grandTotal || order.total || 0).toLocaleString('en-IN')}</strong></p>
        <p style="font-size: 12px; color: #666666;">Delivery Address: ${order.shippingAddress?.line1 || order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''}</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="text-align: center; font-size: 12px; color: #888888;">Thank you for bringing handcrafted beauty into your space ✨</p>
      </div>
    `

    if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Lily Charm Studio" <no-reply@lilycharm.com>',
        to: recipientEmail,
        subject: `✨ Order Confirmed: ${order.orderNumber} - Lily Charm`,
        html,
      })
      console.log(`[EMAIL SUCCESS]: Order confirmation email sent to ${recipientEmail}`)
    } else {
      console.log(`[SIMULATED EMAIL]: Order confirmation for ${order.orderNumber} to ${recipientEmail}`)
    }
  } catch (err) {
    console.error('[EMAIL ERROR]: Failed to send order confirmation email:', err.message)
  }
}

export async function sendOrderStatusEmail(order, newStatus, note = '') {
  try {
    const transporter = createTransporter()
    const recipientEmail = order.shippingAddress?.email
    if (!recipientEmail) return

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px; color: #2b2b2b;">
        <div style="background-color: #212B1C; padding: 20px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">LILY CHARM</h1>
        </div>
        
        <h2 style="color: #212B1C; margin-top: 20px;">Order Status Update: ${newStatus}</h2>
        <p>Hi ${order.shippingAddress?.name || 'Valued Customer'},</p>
        <p>Your order <strong>${order.orderNumber}</strong> has been updated to: <strong style="color: #212B1C; text-transform: uppercase;">${newStatus}</strong></p>
        ${order.trackingNumber ? `<p style="background: #F4F1EA; padding: 10px; border-left: 4px solid #212B1C;"><strong>Carrier Tracking Number:</strong> ${order.trackingNumber} (${order.carrier || 'BlueDart'})</p>` : ''}
        ${note ? `<p style="font-style: italic; color: #555;">Note from Studio: ${note}</p>` : ''}
        
        <p style="margin-top: 20px;">You can track your order timeline live on your customer account dashboard.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="text-align: center; font-size: 12px; color: #888888;">Lily Charm Studio & Botanical Atelier</p>
      </div>
    `

    if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Lily Charm Studio" <no-reply@lilycharm.com>',
        to: recipientEmail,
        subject: `📦 Order ${order.orderNumber} Status: ${newStatus} - Lily Charm`,
        html,
      })
      console.log(`[EMAIL SUCCESS]: Status update email (${newStatus}) sent to ${recipientEmail}`)
    } else {
      console.log(`[SIMULATED EMAIL]: Status ${newStatus} for ${order.orderNumber} to ${recipientEmail}`)
    }
  } catch (err) {
    console.error('[EMAIL ERROR]: Failed to send status update email:', err.message)
  }
}

export async function sendAdminNewOrderNotification(order) {
  try {
    const transporter = createTransporter()
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@lilycharm.com'

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 20px;">
        <h2 style="color: #212B1C;">🚨 New Paid Order Received: ${order.orderNumber}</h2>
        <p><strong>Customer:</strong> ${order.shippingAddress?.name} (${order.shippingAddress?.phone})</p>
        <p><strong>Total Amount:</strong> ₹${(order.grandTotal || order.total || 0).toLocaleString('en-IN')}</p>
        <p><strong>Payment ID:</strong> ${order.razorpayPaymentId}</p>
        <p>Log in to the Studio Admin Dashboard to process this order.</p>
      </div>
    `

    if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Lily Charm System" <no-reply@lilycharm.com>',
        to: adminEmail,
        subject: `🔔 NEW ORDER: ${order.orderNumber} (₹${order.grandTotal || order.total})`,
        html,
      })
    }
  } catch (err) {
    console.error('[ADMIN EMAIL ERROR]:', err.message)
  }
}
