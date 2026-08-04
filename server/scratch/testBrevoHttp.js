import 'dotenv/config';

async function testBrevoHttp() {
  console.log('Sending live email via Brevo REST API...');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Lily Charm', email: 'lilycharm.store.in@gmail.com' },
      to: [{ email: 'mohithbmanjunatha@gmail.com' }],
      subject: '🌸 Lily Charm - Live Customer Transactional Email Test',
      htmlContent: '<div style="font-family: sans-serif; padding: 20px; background-color: #faf7f2; border: 1px solid #e0d8cc; border-radius: 8px;"><h2 style="color: #212b1c;">🌸 Lily Charm — Production Email Active!</h2><p>This is a live transactional email sent to any unverified customer email address (mohithbmanjunatha@gmail.com) via Brevo API!</p></div>'
    })
  });

  const data = await res.json();
  console.log('Brevo REST API Response:', data);
}

testBrevoHttp().catch(console.error);
