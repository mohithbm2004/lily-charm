import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import Product from './models/Product.js'

const baseDir = 'c:/Users/mohit/Desktop/bloom-atelier/flowers'
const targetDirs = [
  'c:/Users/mohit/Desktop/bloom-atelier/customer/public/images/products',
  'c:/Users/mohit/Desktop/bloom-atelier/admin/public/images/products',
  'c:/Users/mohit/Desktop/bloom-atelier/public/images/products',
]

targetDirs.forEach((d) => fs.mkdirSync(d, { recursive: true }))

const folders = fs
  .readdirSync(baseDir)
  .filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory())

folders.sort((a, b) => {
  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0
  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0
  return numA - numB
})

const flowerImagesMap = {}

folders.forEach((folder, idx) => {
  const flowerNum = idx + 1
  const folderPath = path.join(baseDir, folder)
  const files = fs
    .readdirSync(folderPath)
    .filter((file) => /\.(jpeg|jpg|png|webp)$/i.test(file))

  flowerImagesMap[flowerNum] = []

  files.forEach((file, imgIdx) => {
    const newName = `flower-${flowerNum}-${imgIdx + 1}.jpg`
    const srcPath = path.join(folderPath, file)

    targetDirs.forEach((tdir) => {
      fs.copyFileSync(srcPath, path.join(tdir, newName))
    })

    flowerImagesMap[flowerNum].push(`/images/products/${newName}`)
  })
})

console.log('Successfully copied all flower photos into public directories!')

const flowerCreations = [
  {
    title: 'Pearl Velvet Pink Lily Bouquet',
    specimen: 'Flower 01',
    slug: 'pearl-velvet-pink-lily-bouquet',
    category: 'velvet-lilies',
    price: 3499,
    description: 'Hand-sculpted dusty pink velvet lilies accented with freshwater pearls and lush foliage.',
    materials: 'Hand-bent chenille velvet stems, artificial pearls, floral tape, satin bow',
    dimensions: '38 cm height x 22 cm width',
    isBestSeller: true,
    ratingAverage: 5.0,
    ratingCount: 14,
    images: flowerImagesMap[1] ? flowerImagesMap[1].map((url) => ({ url })) : [],
    image: flowerImagesMap[1]?.[0] || '',
  },
  {
    title: 'Golden Amber Velvet Lily Trio',
    specimen: 'Flower 02',
    slug: 'golden-amber-velvet-lily-trio',
    category: 'velvet-lilies',
    price: 3899,
    description: 'Warm golden amber and sunset orange velvet lily arrangement wrapped in natural craft paper.',
    materials: 'Golden velvet pipe cleaners, wire core, raffia ribbon, organza wrap',
    dimensions: '40 cm height x 25 cm width',
    isBestSeller: false,
    ratingAverage: 4.9,
    ratingCount: 9,
    images: flowerImagesMap[2] ? flowerImagesMap[2].map((url) => ({ url })) : [],
    image: flowerImagesMap[2]?.[0] || '',
  },
  {
    title: 'Blush & Rose Velvet Tulip Bundle',
    specimen: 'Flower 03',
    slug: 'blush-rose-velvet-tulip-bundle',
    category: 'velvet-tulips',
    price: 2999,
    description: 'Elegant arrangement of soft blush pink and deep rose velvet tulips with velvety emerald leaves.',
    materials: 'High-density velvet stems, flexible wire framing, satin ribbon',
    dimensions: '32 cm height x 20 cm width',
    isBestSeller: true,
    ratingAverage: 5.0,
    ratingCount: 22,
    images: flowerImagesMap[3] ? flowerImagesMap[3].map((url) => ({ url })) : [],
    image: flowerImagesMap[3]?.[0] || '',
  },
  {
    title: 'Single Stem Soft Pink Velvet Tulip',
    specimen: 'Flower 04',
    slug: 'single-stem-soft-pink-velvet-tulip',
    category: 'velvet-tulips',
    price: 1899,
    description: 'Minimalist single-stem velvet tulip in pastel pink, perfect for modern desk vases or subtle accents.',
    materials: 'Soft pink velvet pipe cleaner, wire core, green leaf wrap',
    dimensions: '30 cm height x 8 cm width',
    isBestSeller: false,
    ratingAverage: 4.8,
    ratingCount: 6,
    images: flowerImagesMap[4] ? flowerImagesMap[4].map((url) => ({ url })) : [],
    image: flowerImagesMap[4]?.[0] || '',
  },
  {
    title: 'Sunshine Yellow Velvet Tulip Bouquet',
    specimen: 'Flower 05',
    slug: 'sunshine-yellow-velvet-tulip-bouquet',
    category: 'velvet-tulips',
    price: 3199,
    description: 'Vibrant yellow velvet tulips bound with a contrasting royal blue ribbon wrap for bright energy.',
    materials: 'Yellow velvet stems, florist wire, royal blue satin ribbon',
    dimensions: '35 cm height x 22 cm width',
    isBestSeller: false,
    ratingAverage: 4.9,
    ratingCount: 11,
    images: flowerImagesMap[5] ? flowerImagesMap[5].map((url) => ({ url })) : [],
    image: flowerImagesMap[5]?.[0] || '',
  },
  {
    title: 'Crimson Velvet Passion Heart Bouquet',
    specimen: 'Flower 06',
    slug: 'crimson-velvet-passion-heart-bouquet',
    category: 'heart-bouquets',
    price: 3699,
    description: 'Romantic red velvet heart stems accented with polka-dot tulle and gradient ribbon embellishments.',
    materials: 'Red velvet pipe cleaners, polka-dot tulle, gradient ribbon, gift wrap',
    dimensions: '36 cm height x 24 cm width',
    isBestSeller: true,
    ratingAverage: 5.0,
    ratingCount: 18,
    images: flowerImagesMap[6] ? flowerImagesMap[6].map((url) => ({ url })) : [],
    image: flowerImagesMap[6]?.[0] || '',
  },
  {
    title: 'Pastel Pink Love Heart Stem Arrangement',
    specimen: 'Flower 07',
    slug: 'pastel-pink-love-heart-stem-arrangement',
    category: 'heart-bouquets',
    price: 3299,
    description: 'Soft pastel pink velvet heart stems hand-wrapped in delicate pink tissue and lace trim.',
    materials: 'Pink velvet stems, lace trim, pink wrapping paper, satin ribbon',
    dimensions: '34 cm height x 20 cm width',
    isBestSeller: false,
    ratingAverage: 4.9,
    ratingCount: 8,
    images: flowerImagesMap[7] ? flowerImagesMap[7].map((url) => ({ url })) : [],
    image: flowerImagesMap[7]?.[0] || '',
  },
  {
    title: 'Golden Velvet Sunflower Bouquet',
    specimen: 'Flower 08',
    slug: 'golden-velvet-sunflower-bouquet',
    category: 'sunflowers',
    price: 3999,
    description: 'Radiant golden sunflowers with dark brown seed centers and rich green leaves.',
    materials: 'Golden yellow velvet, dark brown velvet seed center, floral wire',
    dimensions: '42 cm height x 28 cm width',
    isBestSeller: true,
    ratingAverage: 5.0,
    ratingCount: 27,
    images: flowerImagesMap[8] ? flowerImagesMap[8].map((url) => ({ url })) : [],
    image: flowerImagesMap[8]?.[0] || '',
  },
  {
    title: 'Botanical Velvet Lily Basket',
    specimen: 'Flower 09',
    slug: 'botanical-velvet-lily-basket',
    category: 'studio-baskets',
    price: 4999,
    description: 'Grand wicker basket arrangement displaying mixed lily and tulip stems handcrafted from premium velvet.',
    materials: 'Woven wicker basket, mixed color velvet stems, foam base',
    dimensions: '45 cm height x 35 cm width',
    isBestSeller: false,
    ratingAverage: 5.0,
    ratingCount: 15,
    images: flowerImagesMap[9] ? flowerImagesMap[9].map((url) => ({ url })) : [],
    image: flowerImagesMap[9]?.[0] || '',
  },
  {
    title: 'Lily Charm Signature Velvet Collection',
    specimen: 'Flower 10',
    slug: 'lily-charm-signature-velvet-collection',
    category: 'studio-baskets',
    price: 5499,
    description: 'Keerthana Bapu’s master creation featuring an opulent arrangement of lilies, tulips, and sunflowers.',
    materials: 'Hand-sculpted velvet, pearl accents, luxury ribbon, gift packaging',
    dimensions: '50 cm height x 40 cm width',
    isBestSeller: true,
    ratingAverage: 5.0,
    ratingCount: 31,
    images: flowerImagesMap[10] ? flowerImagesMap[10].map((url) => ({ url })) : [],
    image: flowerImagesMap[10]?.[0] || '',
  },
]

async function seedDatabase() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB Atlas!')

  await Product.deleteMany({})
  console.log('Cleared existing product records.')

  const insertedDocs = await Product.insertMany(flowerCreations)
  console.log(`SUCCESSFULLY SEEDED ${insertedDocs.length} FLOWER CREATIONS INTO MONGODB ATLAS!`)

  await mongoose.disconnect()
  process.exit(0)
}

seedDatabase().catch((e) => {
  console.error('Seeding error:', e)
  process.exit(1)
})
