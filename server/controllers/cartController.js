import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import { emitCartUpdated } from '../socket.js'

const MAX_QTY_PER_PRODUCT = 4

/**
 * Sanitize cart items against authoritative Product records in database
 */
async function sanitizeCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) return []

  const productIds = items
    .map((i) => i.productId || i.id || i.product)
    .filter(Boolean)

  const dbProducts = await Product.find({
    $or: [{ _id: { $in: productIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(String(id))) } }, { slug: { $in: productIds } }, { specimen: { $in: productIds } }],
  }).lean()

  const productMap = new Map()
  dbProducts.forEach((p) => {
    productMap.set(String(p._id), p)
    if (p.slug) productMap.set(p.slug, p)
    if (p.specimen) productMap.set(p.specimen, p)
  })

  const sanitized = []
  for (const item of items) {
    const rawId = String(item.productId || item.id || item.product || '')
    const dbProduct = productMap.get(rawId)

    const price = dbProduct ? Number(dbProduct.price) : Number(item.price) || 0
    const title = dbProduct ? dbProduct.title : item.title || 'Handcrafted Botanical'
    const image = dbProduct
      ? dbProduct.image || (Array.isArray(dbProduct.images) ? dbProduct.images[0] : '')
      : item.image || ''
    const specimen = dbProduct ? dbProduct.specimen : item.specimen || 'Flower'
    const qty = Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, Number(item.qty) || 1))

    sanitized.push({
      product: dbProduct ? dbProduct._id : undefined,
      id: rawId || String(dbProduct?._id || `item-${Date.now()}`),
      title,
      price,
      qty,
      image,
      specimen,
    })
  }

  return sanitized
}

// GET /api/cart — Get user's persisted cart
export async function getCart(req, res, next) {
  try {
    const userId = req.user._id
    let cart = await Cart.findOne({ user: userId })

    if (!cart) {
      return res.status(200).json({ items: [], coupon: null })
    }

    const sanitizedItems = await sanitizeCartItems(cart.items)
    if (JSON.stringify(sanitizedItems) !== JSON.stringify(cart.items)) {
      cart.items = sanitizedItems
      await cart.save()
    }

    res.status(200).json({
      items: cart.items,
      coupon: cart.coupon,
      updatedAt: cart.updatedAt,
    })
  } catch (err) {
    next(err)
  }
}

// PUT /api/cart — Save/replace user's cart
export async function saveCart(req, res, next) {
  try {
    const userId = req.user._id
    const { items = [], coupon = null } = req.body

    const sanitizedItems = await sanitizeCartItems(items)

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items: sanitizedItems, coupon: coupon || null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    emitCartUpdated(userId, { items: cart.items, coupon: cart.coupon })

    res.status(200).json({
      items: cart.items,
      coupon: cart.coupon,
      updatedAt: cart.updatedAt,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/cart/merge — Merge guest cart with authenticated user cart upon login
export async function mergeCart(req, res, next) {
  try {
    const userId = req.user._id
    const { guestItems = [], coupon: guestCoupon = null } = req.body

    const existingCart = await Cart.findOne({ user: userId })
    const existingItems = existingCart ? existingCart.items : []

    const itemMap = new Map()

    // 1. Add existing DB items
    for (const item of existingItems) {
      const key = String(item.id || item.product)
      itemMap.set(key, { ...item.toObject ? item.toObject() : item })
    }

    // 2. Merge guest items
    for (const gItem of guestItems) {
      const key = String(gItem.id || gItem.productId || gItem.product)
      if (itemMap.has(key)) {
        const current = itemMap.get(key)
        current.qty = Math.min(MAX_QTY_PER_PRODUCT, Math.max(current.qty, Number(gItem.qty) || 1))
        itemMap.set(key, current)
      } else {
        itemMap.set(key, {
          id: key,
          title: gItem.title,
          price: Number(gItem.price) || 0,
          qty: Math.min(MAX_QTY_PER_PRODUCT, Math.max(1, Number(gItem.qty) || 1)),
          image: gItem.image || '',
          specimen: gItem.specimen || 'Flower',
        })
      }
    }

    const mergedList = Array.from(itemMap.values())
    const sanitizedItems = await sanitizeCartItems(mergedList)
    const finalCoupon = guestCoupon || (existingCart ? existingCart.coupon : null)

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items: sanitizedItems, coupon: finalCoupon },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    emitCartUpdated(userId, { items: cart.items, coupon: cart.coupon })

    res.status(200).json({
      items: cart.items,
      coupon: cart.coupon,
      updatedAt: cart.updatedAt,
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/cart — Clear user's cart (e.g. on order placement)
export async function clearCart(req, res, next) {
  try {
    const userId = req.user._id
    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items: [], coupon: null },
      { upsert: true, new: true }
    )

    emitCartUpdated(userId, { items: [], coupon: null })

    res.status(200).json({ success: true, items: [], coupon: null })
  } catch (err) {
    next(err)
  }
}
