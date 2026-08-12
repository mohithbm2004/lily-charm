import Product from '../models/Product.js'
import mongoose from 'mongoose'
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js'
import { emitProductCreated, emitProductUpdated, emitProductDeleted } from '../socket.js'

// GET /api/products — List all products with optional filters
export async function listProducts(req, res, next) {
  try {
    const { category, maxPrice, sort, search } = req.query
    const filter = {}
    if (category && category !== 'all') filter.category = category
    if (maxPrice) filter.price = { $lte: Number(maxPrice) }
    if (search) filter.$text = { $search: search }

    let query = Product.find(filter)
    if (sort === 'price-asc') query = query.sort({ price: 1 })
    if (sort === 'price-desc') query = query.sort({ price: -1 })
    if (!sort) query = query.sort({ createdAt: -1 })

    const items = await query.exec()
    res.json(items)
  } catch (err) {
    next(err)
  }
}

// GET /api/products/:id — Get single product by ID or slug
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({
      $or: [{ slug: req.params.id }, { _id: req.params.id }],
    })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch (err) {
    next(err)
  }
}

async function processProductImages(req, folder = 'lily-charm/products') {
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

// POST /api/products — Create new product with multiple Cloudinary images
export async function createProduct(req, res, next) {
  try {
    const body = { ...req.body }

    // Generate slug if not provided
    if (!body.slug && body.title) {
      body.slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || `flower-${Date.now()}`
    }

    const uploadedUrls = await processProductImages(req, 'lily-charm/products')
    if (uploadedUrls.length > 0) {
      body.images = uploadedUrls
      body.image = uploadedUrls[0]
    }

    const product = await Product.create(body)
    emitProductCreated(product)
    res.status(201).json(product)
  } catch (err) {
    next(err)
  }
}

// PUT /api/products/:id — Update existing product & Cloudinary images
export async function updateProduct(req, res, next) {
  try {
    const id = req.params.id
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ slug: id }, { specimen: id }] }

    const existingProduct = await Product.findOne(filter)
    if (!existingProduct) return res.status(404).json({ message: 'Product not found' })

    const body = { ...req.body }
    const uploadedUrls = await processProductImages(req, 'lily-charm/products')

    if (uploadedUrls.length > 0) {
      body.images = uploadedUrls
      body.image = uploadedUrls[0]
    }

    const updatedProduct = await Product.findOneAndUpdate(filter, body, {
      new: true,
      runValidators: false,
    })

    emitProductUpdated(updatedProduct)
    res.json(updatedProduct)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/products/:id — Delete product and all its associated Cloudinary images
export async function deleteProduct(req, res, next) {
  try {
    const id = req.params.id
    const filter = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { $or: [{ slug: id }, { specimen: id }, { title: id }] }

    const product = await Product.findOneAndDelete(filter)
    if (!product) return res.status(404).json({ message: 'Product not found' })

    // Delete associated images from Cloudinary
    const imagesToDelete = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image]
    for (const imgUrl of imagesToDelete) {
      if (imgUrl) await deleteFromCloudinary(imgUrl)
    }

    emitProductDeleted(product._id || id)
    res.json({ message: 'Product deleted successfully', deleted: product })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/products — Delete all products
export async function deleteAllProducts(req, res, next) {
  try {
    const products = await Product.find({})
    for (const p of products) {
      const imagesToDelete = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image]
      for (const imgUrl of imagesToDelete) {
        if (imgUrl) await deleteFromCloudinary(imgUrl)
      }
    }
    await Product.deleteMany({})
    emitProductDeleted('ALL')
    res.json({ message: 'All products deleted successfully from database' })
  } catch (err) {
    next(err)
  }
}
