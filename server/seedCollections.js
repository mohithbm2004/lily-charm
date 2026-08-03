import 'dotenv/config'
import mongoose from 'mongoose'
import Collection from './models/Collection.js'

const initialCollections = [
  {
    title: 'Velvet Lilies',
    slug: 'velvet-lilies',
    blurb: 'Hand-sculpted velvet lilies with delicate pearl accents and lush foliage.',
    image: '/images/products/flower-1-1.jpg',
    isFeatured: true,
  },
  {
    title: 'Velvet Tulips',
    slug: 'velvet-tulips',
    blurb: 'Vibrant yellow and soft blush pink tulip stems crafted with velvet texture.',
    image: '/images/products/flower-3-1.jpg',
    isFeatured: true,
  },
  {
    title: 'Golden Sunflowers',
    slug: 'sunflowers',
    blurb: 'Radiant golden sunflowers with dark seed centers and rich ribbon wraps.',
    image: '/images/products/flower-8-1.jpg',
    isFeatured: true,
  },
  {
    title: 'Heart Bouquets',
    slug: 'heart-bouquets',
    blurb: 'Romantic velvet heart stems wrapped in polka-dot tulle with gradient ribbons.',
    image: '/images/products/flower-6-1.jpg',
    isFeatured: true,
  },
  {
    title: 'Studio Baskets',
    slug: 'studio-baskets',
    blurb: 'Grand woven wicker basket arrangements displaying mixed signature blooms.',
    image: '/images/products/flower-10-1.jpg',
    isFeatured: true,
  },
]

async function seedCollections() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB Atlas!')

  await Collection.deleteMany({})
  console.log('Cleared existing collection records.')

  const inserted = await Collection.insertMany(initialCollections)
  console.log(`SUCCESSFULLY SEEDED ${inserted.length} COLLECTIONS INTO MONGODB ATLAS!`)

  await mongoose.disconnect()
  process.exit(0)
}

seedCollections().catch((err) => {
  console.error('Seeding collections error:', err)
  process.exit(1)
})
