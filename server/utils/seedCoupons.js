import Coupon from '../models/Coupon.js'

/**
 * Ensures default studio coupons exist in MongoDB
 */
export async function seedDefaultCoupons() {
  try {
    const defaultCoupons = [
      {
        code: 'LILY10',
        title: '10% OFF Studio Discount',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscountCap: 0,
        targetSegment: 'All Products',
        isActive: true,
      },
      {
        code: 'VELVET20',
        title: '20% OFF Velvet Special',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 0,
        maxDiscountCap: 0,
        targetSegment: 'All Products',
        isActive: true,
      },
    ]

    for (const c of defaultCoupons) {
      const existing = await Coupon.findOne({ code: c.code })
      if (!existing) {
        await Coupon.create(c)
        console.log(`🏷️ Default coupon seeded in MongoDB: ${c.code}`)
      }
    }
  } catch (err) {
    console.warn('[SEED COUPONS NOTICE]:', err.message)
  }
}

export default seedDefaultCoupons
