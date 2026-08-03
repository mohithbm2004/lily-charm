import Collection from '../models/Collection.js'
import mongoose from 'mongoose'
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js'

// GET /api/collections — List all collection categories from MongoDB
export async function listCollections(req, res, next) {
  try {
    const collections = await Collection.find({}).sort({ createdAt: 1 })
    res.json(collections)
  } catch (err) {
    next(err)
  }
}

async function processCollectionImages(req, folder = 'lily-charm/collections') {
  const rawList = []
  
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (const f of req.files) rawList.push(f.buffer)
  } else if (req.file) {
    rawList.push(req.file.buffer)
  }

  if (req.body.images) {
    let bImages = req.body.images
    if (typeof bImages === 'string') {
      try { bImages = JSON.parse(bImages) } catch { bImages = [bImages] }
    }
    if (Array.isArray(bImages)) rawList.push(...bImages)
    else rawList.push(bImages)
  }

  if (rawList.length === 0 && req.body.image) {
    rawList.push(req.body.image)
  }

  const finalUrls = []
  for (const item of rawList) {
    if (!item) continue
    if (typeof item === 'string' && item.startsWith('http') && item.includes('cloudinary.com')) {
      if (!finalUrls.includes(item)) finalUrls.push(item)
    } else {
      const res = await uploadToCloudinary(item, folder)
      if (res && res.secure_url && !finalUrls.includes(res.secure_url)) {
        finalUrls.push(res.secure_url)
      }
    }
  }

  return finalUrls
}

// POST /api/collections — Create new collection category with multiple Cloudinary images
export async function createCollection(req, res, next) {
  try {
    const body = { ...req.body }

    if (!body.slug && body.title) {
      body.slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `collection-${Date.now()}`
    }

    const uploadedUrls = await processCollectionImages(req, 'lily-charm/collections')
    if (uploadedUrls.length > 0) {
      body.images = uploadedUrls
      body.image = uploadedUrls[0]
    }

    const collection = await Collection.create(body)
    res.status(201).json(collection)
  } catch (err) {
    next(err)
  }
}

// PUT /api/collections/:id — Update collection & multiple Cloudinary images
export async function updateCollection(req, res, next) {
  try {
    const id = req.params.id
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ slug: id }, { title: id }] }

    const existingCol = await Collection.findOne(filter)
    if (!existingCol) return res.status(404).json({ message: 'Collection not found' })

    const body = { ...req.body }
    const uploadedUrls = await processCollectionImages(req, 'lily-charm/collections')

    if (uploadedUrls.length > 0) {
      body.images = uploadedUrls
      body.image = uploadedUrls[0]
    }

    const collection = await Collection.findOneAndUpdate(filter, body, {
      new: true,
      runValidators: false,
    })

    res.json(collection)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/collections/:id — Delete collection and all its associated Cloudinary images
export async function deleteCollection(req, res, next) {
  try {
    const id = req.params.id
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ slug: id }, { title: id }] }

    const collection = await Collection.findOneAndDelete(filter)
    if (!collection) return res.status(404).json({ message: 'Collection not found' })

    const imagesToDelete = Array.isArray(collection.images) && collection.images.length > 0 ? collection.images : [collection.image]
    for (const imgUrl of imagesToDelete) {
      if (imgUrl) await deleteFromCloudinary(imgUrl)
    }

    res.json({ message: 'Collection deleted successfully', deleted: collection })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/collections — Delete all collections
export async function deleteAllCollections(req, res, next) {
  try {
    const collections = await Collection.find({})
    for (const c of collections) {
      const imagesToDelete = Array.isArray(c.images) && c.images.length > 0 ? c.images : [c.image]
      for (const imgUrl of imagesToDelete) {
        if (imgUrl) await deleteFromCloudinary(imgUrl)
      }
    }
    await Collection.deleteMany({})
    res.json({ message: 'All collections deleted successfully' })
  } catch (err) {
    next(err)
  }
}
