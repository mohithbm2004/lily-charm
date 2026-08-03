import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock1234567890',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_razorpay_secret_key',
})

export default razorpay
