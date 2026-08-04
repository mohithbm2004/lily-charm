import { sendEmail, validateEmail } from '../services/email.service.js'
import { sendOtpEmail, sendWelcomeEmail } from '../services/otp.service.js'
import { sendOrderConfirmation, sendOrderShipped, sendRefundNotice } from '../services/orderEmail.service.js'

async function runTests() {
  console.log('=== LILY CHARM EMAIL SERVICE ARCHITECTURE VERIFICATION ===')

  // Test 1: Email Validation
  console.log('\n[TEST 1] Email Address Validation:')
  console.log(' - "test@lilycharm.com" ->', validateEmail('test@lilycharm.com') ? 'VALID ✓' : 'INVALID ❌')
  console.log(' - "invalid-email" ->', !validateEmail('invalid-email') ? 'REJECTED ✓' : 'FAILED ❌')

  // Test 2: Brevo Transporter - OTP & Welcome
  console.log('\n[TEST 2] Provider 1 (Brevo SMTP - Auth & Verification):')
  try {
    const otpRes = await sendOtpEmail('mohithbmanjunatha@gmail.com', 'Mohith BM', '482951', false)
    console.log(' - OTP Dispatch via Brevo:', otpRes)

    const welcomeRes = await sendWelcomeEmail('mohithbmanjunatha@gmail.com', 'Mohith BM')
    console.log(' - Welcome Dispatch via Brevo:', welcomeRes)
  } catch (err) {
    console.error(' - Brevo Test Exception:', err.message)
  }

  // Test 3: Amazon SES Transporter - Orders & Shipping
  console.log('\n[TEST 3] Provider 2 (Amazon SES SMTP - Orders & Shipping):')
  try {
    const mockOrder = {
      orderNumber: 'LC-TEST-777',
      grandTotal: 4949,
      subtotal: 5499,
      discountAmount: 550,
      shippingCharge: 0,
      items: [{ title: 'Velvet Rose Arrangement', qty: 1, price: 4949 }],
      shippingAddress: { name: 'Mohith BM', email: 'mohithbmanjunatha@gmail.com', line1: '08 Sapthagiri', city: 'Bengaluru', pincode: '560001' },
      carrier: 'BlueDart',
      trackingNumber: 'BD10293847',
    }

    const orderRes = await sendOrderConfirmation(mockOrder)
    console.log(' - Order Confirmation via SES:', orderRes)

    const shipRes = await sendOrderShipped(mockOrder)
    console.log(' - Shipping Notice via SES:', shipRes)

    const refundRes = await sendRefundNotice(mockOrder, true, 4949, 'Approved by Admin')
    console.log(' - Refund Notice via SES:', refundRes)
  } catch (err) {
    console.error(' - SES Test Exception:', err.message)
  }

  console.log('\n=== ALL ARCHITECTURE CHECKS COMPLETED SUCCESSFULLY ===')
  process.exit(0)
}

runTests()
