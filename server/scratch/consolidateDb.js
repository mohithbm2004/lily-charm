import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

async function consolidate() {
  console.log('Connecting to MongoDB Atlas...')
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected!')

  const usersCollection = mongoose.connection.db.collection('users')
  const ordersCollection = mongoose.connection.db.collection('orders')

  const users = await usersCollection.find({}).toArray()

  for (const u of users) {
    const userEmail = (u.email || '').toLowerCase().trim()
    const userPhone = (u.phone || '').replace(/\D/g, '')

    console.log(`Processing registered user: ${u.name} (${userEmail})`)

    // Find all matching orders by email, alternateEmails, or phone number
    const matchingOrders = await ordersCollection.find({
      $or: [
        { 'shippingAddress.email': userEmail },
        { 'billingAddress.email': userEmail },
        { email: userEmail },
        ...(userPhone && userPhone.length >= 10 ? [{ 'shippingAddress.phone': { $regex: userPhone.slice(-10) } }] : []),
      ],
    }).toArray()

    const alternateEmailsSet = new Set((u.alternateEmails || []).map(e => e.toLowerCase().trim()))

    for (const ord of matchingOrders) {
      const ordEmail = (ord.shippingAddress?.email || ord.email || '').toLowerCase().trim()
      if (ordEmail && ordEmail !== userEmail) {
        alternateEmailsSet.add(ordEmail)
      }

      // Link order directly to this user's _id
      await ordersCollection.updateOne(
        { _id: ord._id },
        { $set: { user: u._id } }
      )
      console.log(` -> Linked order ${ord.orderNumber || ord._id} (email: ${ordEmail}) to user ${u.name}`)
    }

    const updatedAlternateEmails = Array.from(alternateEmailsSet)
    await usersCollection.updateOne(
      { _id: u._id },
      {
        $set: {
          alternateEmails: updatedAlternateEmails,
          ...(u.phone ? {} : (matchingOrders[0]?.shippingAddress?.phone ? { phone: matchingOrders[0].shippingAddress.phone } : {})),
        },
      }
    )
    console.log(` -> Updated ${userEmail} alternateEmails:`, updatedAlternateEmails)
  }

  console.log('SUCCESS: Database consolidation complete!')
  await mongoose.disconnect()
  process.exit(0)
}

consolidate()
