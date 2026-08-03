import 'dotenv/config'
import mongoose from 'mongoose'
import Product from './models/Product.js'
import User from './models/User.js'

const products = []

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB. Wiping product collection...')

  await Product.deleteMany({})

  const adminExists = await User.findOne({ email: 'admin@lilycharm.com' })
  if (!adminExists) {
    await User.create({
      name: 'Keerthana Bapu',
      email: 'admin@lilycharm.com',
      password: 'admin1234',
      role: 'admin',
    })
  }

  console.log('Wiped products collection in MongoDB. Ready for fresh uploads!')
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seeding error:', err)
  process.exit(1)
})
