import 'dotenv/config';
import { sendEmail } from '../services/email.service.js';

async function testSesSmtpVerified() {
  console.log('Sending live email via Amazon SES SMTP to lilycharm.store.in@gmail.com...');
  
  const res = await sendEmail({
    provider: 'ses',
    type: 'order-confirmation',
    to: 'lilycharm.store.in@gmail.com',
    subject: '🌸 Lily Charm - Amazon SES SMTP Authentication Working!',
    text: 'Your Amazon SES SMTP credentials (AKIASFJM2TTT6P6PRNFW) are connected and sending emails via SES SMTP!',
    html: '<div style="font-family: sans-serif; padding: 24px; background: #faf7f2; border: 1px solid #e0d8cc; border-radius: 8px;"><h2 style="color: #212b1c;">🌸 Lily Charm — Amazon SES SMTP Live!</h2><p>Your Amazon SES SMTP credentials (<strong>AKIASFJM2TTT6P6PRNFW</strong>) are verified and actively dispatching through <strong>email-smtp.ap-south-1.amazonaws.com</strong>!</p></div>'
  });

  console.log('Amazon SES SMTP Dispatch Result:', res);
}

testSesSmtpVerified().catch(console.error);
