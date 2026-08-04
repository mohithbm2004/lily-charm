import 'dotenv/config';
import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/otp.service.js';
import { 
  sendOrderConfirmation, 
  sendPaymentSuccess, 
  sendOrderInvoice, 
  sendOrderPacked, 
  sendOrderShipped, 
  sendOrderOutForDelivery, 
  sendOrderDelivered, 
  sendRefundApproved, 
  sendRefundRejected, 
  sendNewsletterEmail 
} from '../services/orderEmail.service.js';

const dummyOrder = {
  orderNumber: 'LC-2026-TEST',
  email: 'mohithbmanjunatha@gmail.com',
  shippingAddress: {
    name: 'Mohith B M',
    email: 'mohithbmanjunatha@gmail.com',
    line1: '123 Botanical Avenue',
    city: 'Bengaluru',
    pincode: '560001',
    phone: '+91 9876543210'
  },
  items: [
    { title: 'Velvet Rose Arrangement', qty: 2, price: 2499 },
    { title: 'Preserved Lily Glass Dome', qty: 1, price: 4999 }
  ],
  subtotal: 9997,
  discountAmount: 497,
  shippingCharge: 0,
  grandTotal: 9500,
  razorpayPaymentId: 'pay_test_987654321',
  paymentMethod: 'Razorpay UPI',
  carrier: 'BlueDart Express',
  trackingNumber: 'BD-88990011',
  refundAmount: 9500,
  refundId: 'rfnd_test_123456'
};

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🌸 LILY CHARM DUAL EMAIL ARCHITECTURE TEST SUITE');
  console.log('===========================================================\n');

  console.log('--- PROVIDER 1: BREVO (Auth & OTPs) ---');
  await sendOtpEmail('mohithbmanjunatha@gmail.com', 'Mohith', '654321', false);
  await sendPasswordResetEmail('mohithbmanjunatha@gmail.com', 'Mohith', 'https://lilycharm.com/reset?token=123');

  console.log('\n--- PROVIDER 2: AMAZON SES (Transactional & Engagement) ---');
  await sendWelcomeEmail('mohithbmanjunatha@gmail.com', 'Mohith');
  await sendOrderConfirmation(dummyOrder);
  await sendPaymentSuccess(dummyOrder);
  await sendOrderInvoice(dummyOrder);
  await sendOrderPacked(dummyOrder);
  await sendOrderShipped(dummyOrder);
  await sendOrderOutForDelivery(dummyOrder);
  await sendOrderDelivered(dummyOrder);
  await sendRefundApproved(dummyOrder);
  await sendRefundRejected(dummyOrder, 'Item missing original luxury velvet box');
  await sendNewsletterEmail(['mohithbmanjunatha@gmail.com'], 'Spring Velvet Collection Announcement', 'Discover our limited edition spring botanical sculptures.');

  console.log('\n===========================================================');
  console.log('✅ ALL 12 EMAIL TYPES DISPATCHED SUCCESSFULLY!');
  console.log('===========================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test suite error:', err);
});
