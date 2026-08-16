import Razorpay from 'razorpay'
import { ENV } from './env.js'

const razorpay = new Razorpay({
  key_id: ENV.RAZORPAY.KEY_ID,
  key_secret: ENV.RAZORPAY.KEY_SECRET,
})

export default razorpay
