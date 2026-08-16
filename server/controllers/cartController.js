import Cart from '../models/Cart.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { emitCartUpdated } from '../socket.js'

const MAX_QTY_PER_PRODUCT = 4

/**
 * Helper to resolve user name and contact info for MongoDB Cart document
 */
async function resolveOwnerDetails(userId, reqUser) {
  let name = reqUser?.name || ''
  let email = reqUser?.email || ''
  let phone = reqUser?.phone || ''

  if (!name || !email) {
    try {
      const u = await User.findById(userId).lean()
      if (u) {
        name = u.name || name
        email = u.email || email
        phone = u.phone || phone
      }
    } catch {}
  }

  return { ownerName: name, ownerEmail: email, ownerPhone: phone }
}

/**
 * Helper to compute total cart monetary value and item counts
 */
function calculateCartTotals(items = []) {
  const cartValue = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0)
  const totalItems = items.reduce((sum, i) => sum + (Number(i.qty) || 1), 0)
  const itemCount = items.length
  return { cartValue, totalItems, itemCount }
}

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
      return res.status(200).json({ items: [], coupon: null, cartValue: 0, ownerName: req.user?.name || '' })
    }

    const sanitizedItems = await sanitizeCartItems(cart.items)
    const totals = calculateCartTotals(sanitizedItems)
    const owner = await resolveOwnerDetails(userId, req.user)

    let needSave = false
    if (JSON.stringify(sanitizedItems) !== JSON.stringify(cart.items)) {
      cart.items = sanitizedItems
      needSave = true
    }

    if (
      !cart.ownerName ||
      !cart.ownerEmail ||
      cart.cartValue !== totals.cartValue ||
      cart.totalItems !== totals.totalItems
    ) {
      cart.ownerName = owner.ownerName
      cart.ownerEmail = owner.ownerEmail
      cart.ownerPhone = owner.ownerPhone
      cart.cartValue = totals.cartValue
      cart.totalItems = totals.totalItems
      cart.itemCount = totals.itemCount
      needSave = true
    }

    if (needSave) {
      await cart.save()
    }

    res.status(200).json({
      items: cart.items,
      coupon: cart.coupon,
      ownerName: cart.ownerName,
      ownerEmail: cart.ownerEmail,
      cartValue: cart.cartValue,
      totalItems: cart.totalItems,
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
    const totals = calculateCartTotals(sanitizedItems)
    const owner = await resolveOwnerDetails(userId, req.user)

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      {
        items: sanitizedItems,
        coupon: coupon || null,
        ownerName: owner.ownerName,
        ownerEmail: owner.ownerEmail,
        ownerPhone: owner.ownerPhone,
        cartValue: totals.cartValue,
        totalItems: totals.totalItems,
        itemCount: totals.itemCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    emitCartUpdated(userId, {
      items: cart.items,
      coupon: cart.coupon,
      ownerName: cart.ownerName,
      cartValue: cart.cartValue,
    })

    res.status(200).json({
      items: cart.items,
      coupon: cart.coupon,
      ownerName: cart.ownerName,
      ownerEmail: cart.ownerEmail,
      cartValue: cart.cartValue,
      totalItems: cart.totalItems,
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
    const totals = calculateCartTotals(sanitizedItems)
    const owner = await resolveOwnerDetails(userId, req.user)
    const finalCoupon = guestCoupon || (existingCart ? existingCart.coupon : null)

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      {
        items: sanitizedItems,
        coupon: finalCoupon,
        ownerName: owner.ownerName,
        ownerEmail: owner.ownerEmail,
        ownerPhone: owner.ownerPhone,
        cartValue: totals.cartValue,
        totalItems: totals.totalItems,
        itemCount: totals.itemCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    emitCartUpdated(userId, {
      items: cart.items,
      coupon: cart.coupon,
      ownerName: cart.ownerName,
      cartValue: cart.cartValue,
    })

    res.status(200).json({
      items: cart.items,
      coupon: cart.coupon,
      ownerName: cart.ownerName,
      ownerEmail: cart.ownerEmail,
      cartValue: cart.cartValue,
      totalItems: cart.totalItems,
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
    const owner = await resolveOwnerDetails(userId, req.user)

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      {
        items: [],
        coupon: null,
        ownerName: owner.ownerName,
        ownerEmail: owner.ownerEmail,
        ownerPhone: owner.ownerPhone,
        cartValue: 0,
        totalItems: 0,
        itemCount: 0,
      },
      { upsert: true, new: true }
    )

    emitCartUpdated(userId, { items: [], coupon: null, cartValue: 0, ownerName: owner.ownerName })

    res.status(200).json({ success: true, items: [], coupon: null, cartValue: 0 })
  } catch (err) {
    next(err)
  }
}
