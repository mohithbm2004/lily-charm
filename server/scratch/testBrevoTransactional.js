import 'dotenv/config';
import { sendEmail } from '../services/email.service.js';

async function testBrevoEmail() {
  console.log('Sending live Brevo email to mohithbmanjunatha@gmail.com...');
  
  const result = await sendEmail({
    to: 'mohithbmanjunatha@gmail.com',
    subject: '🌸 Lily Charm - Live Transactional Email Test',
    type: 'welcome',
    provider: 'brevo',
    data: {
      customerName: 'Mohith',
      loginUrl: 'https://lily-charm-fjyn4xltm-mohith-bm.vercel.app'
    }
  });

  console.log('Result:', result);
}

testBrevoEmail().catch(console.error);
