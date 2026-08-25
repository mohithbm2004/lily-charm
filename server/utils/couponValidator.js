import Coupon from '../models/Coupon.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'
import Setting from '../models/Setting.js'

/**
 * Server-Authoritative Coupon Validation & Discount Calculation Engine
 * 
 * STRICT PRICING FORMULA (NO TAX):
 * PRODUCT SUBTOTAL - COUPON DISCOUNT + SHIPPING = FINAL GRAND TOTAL
 */
export async function validateAndCalculateCoupon({ couponCode = '', items = [], userId = null }) {
  const cleanCode = (couponCode || '').trim().toUpperCase()

  // 1. Validate Product Cart Items against MongoDB
  let cartSubtotal = 0
  const validatedItems = []
  const productIds = (items || []).map((i) => i.productId || i.id || i.product).filter(Boolean)

  const dbProducts = await Product.find({
    $or: [
      { _id: { $in: productIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(String(id))) } },
      { slug: { $in: productIds } },
      { specimen: { $in: productIds } },
    ],
  }).lean()

  const productMap = new Map()
  dbProducts.forEach((p) => {
    productMap.set(String(p._id), p)
    if (p.slug) productMap.set(p.slug, p)
    if (p.specimen) productMap.set(p.specimen, p)
  })

  for (const item of items || []) {
    const rawId = String(item.productId || item.id || item.product || '')
    const dbProduct = productMap.get(rawId)

    const unitPrice = dbProduct ? Number(dbProduct.price) : Number(item.price) || 0
    const qty = Math.min(4, Math.max(1, Number(item.qty) || 1))
    const itemTotal = unitPrice * qty

    cartSubtotal += itemTotal

    validatedItems.push({
      product: dbProduct ? dbProduct._id : null,
      title: dbProduct ? dbProduct.title : item.title || 'Artwork',
      category: dbProduct ? dbProduct.category || dbProduct.specimen : item.category || '',
      price: unitPrice,
      qty,
      itemTotal,
      rawProduct: dbProduct,
    })
  }

  // 2. Compute Authoritative Studio Shipping Charge
  let shippingCharge = 0
  try {
    const studioSettings = await Setting.findOne({ key: 'main_studio_settings' })
    const rawEnabled = studioSettings?.shippingFeeEnabled
    const isShippingEnabled = rawEnabled === true || rawEnabled === 'true' || rawEnabled === undefined || rawEnabled === null
    const standardFee = Number(studioSettings?.standardShippingFee) || 100
    const threshold = Number(studioSettings?.freeShippingThreshold) || 2000

    if (isShippingEnabled) {
      shippingCharge = cartSubtotal >= threshold ? 0 : standardFee
    }
  } catch {
    shippingCharge = 0
  }

  // If no coupon code is provided, return standard calculation without discount
  if (!cleanCode) {
    const grandTotal = Math.max(0, cartSubtotal + shippingCharge)
    return {
      isValid: true,
      code: '',
      coupon: null,
      cartSubtotal,
      eligibleSubtotal: cartSubtotal,
      discountAmount: 0,
      shippingCharge,
      grandTotal,
      tax: 0, // Explicit 0 tax
      message: null,
    }
  }

  // 3. Lookup Coupon in Database
  const coupon = await Coupon.findOne({ code: cleanCode })
  if (!coupon || coupon.isActive === false) {
    return {
      isValid: false,
      code: cleanCode,
      coupon: null,
      cartSubtotal,
      eligibleSubtotal: 0,
      discountAmount: 0,
      shippingCharge,
      grandTotal: cartSubtotal + shippingCharge,
      tax: 0,
      message: `Invalid promo code "${cleanCode}".`,
    }
  }

  const now = new Date()

  // 4. Check Date Validity
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    return {
      isValid: false,
      code: cleanCode,
      coupon: null,
      cartSubtotal,
      eligibleSubtotal: 0,
      discountAmount: 0,
      shippingCharge,
      grandTotal: cartSubtotal + shippingCharge,
      tax: 0,
      message: `Promo code "${cleanCode}" is not active yet.`,
    }
  }

  if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
    return {
      isValid: false,
      code: cleanCode,
      coupon: null,
      cartSubtotal,
      eligibleSubtotal: 0,
      discountAmount: 0,
      shippingCharge,
      grandTotal: cartSubtotal + shippingCharge,
      tax: 0,
      message: `Promo code "${cleanCode}" has expired.`,
    }
  }

  // 5. Check Global Usage Limit
  if (coupon.maxUsageLimit > 0 && coupon.usageCount >= coupon.maxUsageLimit) {
    return {
      isValid: false,
      code: cleanCode,
      coupon: null,
      cartSubtotal,
      eligibleSubtotal: 0,
      discountAmount: 0,
      shippingCharge,
      grandTotal: cartSubtotal + shippingCharge,
      tax: 0,
      message: `Promo code "${cleanCode}" usage limit has been reached.`,
    }
  }

  // 6. Check Per-User Limit
  if (coupon.perUserLimit > 0 && userId) {
    try {
      const userUsageCount = await Order.countDocuments({
        user: userId,
        couponCode: cleanCode,
        paymentStatus: 'Paid',
      })
      if (userUsageCount >= coupon.perUserLimit) {
        return {
          isValid: false,
          code: cleanCode,
          coupon: null,
          cartSubtotal,
          eligibleSubtotal: 0,
          discountAmount: 0,
          shippingCharge,
          grandTotal: cartSubtotal + shippingCharge,
          tax: 0,
          message: `You have already used promo code "${cleanCode}".`,
        }
      }
    } catch (e) {
      console.warn('[PER USER COUPON CHECK NOTICE]:', e.message)
    }
  }

  // 7. Calculate Eligible Subtotal by Target Segment
  let eligibleSubtotal = 0
  const targetSeg = (coupon.targetSegment || 'All Products').toLowerCase().trim()

  if (targetSeg === 'all products' || targetSeg === 'all') {
    eligibleSubtotal = cartSubtotal
  } else {
    for (const item of validatedItems) {
      const cat = (item.category || '').toLowerCase()
      const title = (item.title || '').toLowerCase()
      if (cat.includes(targetSeg) || title.includes(targetSeg)) {
        eligibleSubtotal += item.itemTotal
      }
    }
  }

  if (eligibleSubtotal <= 0) {
    return {
      isValid: false,
      code: cleanCode,
      coupon: null,
      cartSubtotal,
      eligibleSubtotal: 0,
      discountAmount: 0,
      shippingCharge,
      grandTotal: cartSubtotal + shippingCharge,
      tax: 0,
      message: `Promo code "${cleanCode}" is not valid for the items in your cart.`,
    }
  }

  // 8. Check Minimum Order Amount
  if (coupon.minOrderAmount > 0 && eligibleSubtotal < coupon.minOrderAmount) {
    const diff = coupon.minOrderAmount - eligibleSubtotal
    return {
      isValid: false,
      code: cleanCode,
      coupon: null,
      cartSubtotal,
      eligibleSubtotal,
      discountAmount: 0,
      shippingCharge,
      grandTotal: cartSubtotal + shippingCharge,
      tax: 0,
      message: `Promo code "${cleanCode}" requires a minimum order spend of ₹${coupon.minOrderAmount.toLocaleString('en-IN')}. Add ₹${diff.toLocaleString('en-IN')} more eligible items to unlock!`,
    }
  }

  // 9. Calculate Discount Amount
  let discountAmount = 0
  if (coupon.discountType === 'percentage') {
    const rawDiscount = Math.round((eligibleSubtotal * coupon.discountValue) / 100)
    discountAmount = coupon.maxDiscountCap > 0
      ? Math.min(rawDiscount, coupon.maxDiscountCap)
      : rawDiscount
  } else if (coupon.discountType === 'flat') {
    discountAmount = Math.min(eligibleSubtotal, coupon.discountValue)
  }

  discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal))

  // 10. Compute Final Payable Amount (NO TAX)
  const grandTotal = Math.max(1, cartSubtotal - discountAmount + shippingCharge)

  let capNotice = ''
  if (coupon.maxDiscountCap > 0 && discountAmount >= coupon.maxDiscountCap) {
    capNotice = ` (Capped at max ₹${coupon.maxDiscountCap.toLocaleString('en-IN')} OFF)`
  }

  return {
    isValid: true,
    code: cleanCode,
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountCap: coupon.maxDiscountCap,
      targetSegment: coupon.targetSegment,
    },
    cartSubtotal,
    eligibleSubtotal,
    discountAmount,
    shippingCharge,
    grandTotal,
    tax: 0,
    message: `✨ Promo code "${cleanCode}" applied successfully!${capNotice}`,
  }
}

export default {
  validateAndCalculateCoupon,
}
