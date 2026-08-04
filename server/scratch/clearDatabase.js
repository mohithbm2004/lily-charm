import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const MONGO_URI = process.env.MONGO_URI

async function clearCollections() {
  try {
    console.log('Connecting to MongoDB Atlas...')
    await mongoose.connect(MONGO_URI)
    console.log('Connected!')

    const collections = ['users', 'orders', 'customrequests', 'payments']
    
    for (const name of collections) {
      if (mongoose.connection.collections[name]) {
        const res = await mongoose.connection.collections[name].deleteMany({})
        console.log(`Deleted ${res.deletedCount} documents from collection: ${name}`)
      }
    }

    console.log('SUCCESS: All test users, orders, custom requests, and payment ledgers have been cleared!')
    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error clearing collections:', err)
    process.exit(1)
  }
}

clearCollections()
