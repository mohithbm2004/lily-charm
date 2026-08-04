import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI)
  const users = await mongoose.connection.db.collection('users').find({}).toArray()
  const orders = await mongoose.connection.db.collection('orders').find({}).toArray()

  console.log('=== USERS IN MONGODB ===')
  console.log(JSON.stringify(users, null, 2))

  console.log('\n=== ORDERS IN MONGODB ===')
  console.log(JSON.stringify(orders, null, 2))

  await mongoose.disconnect()
  process.exit(0)
}

inspect()
