import Coupon from '../models/Coupon.js'

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 })
    res.json(coupons)
  } catch (error) {
    console.error('Error fetching coupons:', error)
    res.status(500).json({ message: 'Server error fetching coupons' })
  }
}

// @desc    Get active public coupons (Customer)
// @route   GET /api/coupons/active
export const getActiveCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 })
    res.json(coupons)
  } catch (error) {
    console.error('Error fetching active coupons:', error)
    res.status(500).json({ message: 'Server error fetching active coupons' })
  }
}

// @desc    Create a new coupon
// @route   POST /api/coupons
export const createCoupon = async (req, res) => {
  try {
    const { code, title, discountType, discountValue, minOrderAmount, maxDiscountCap, targetSegment, isActive } = req.body

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() })
    if (existing) {
      return res.status(400).json({ message: `Coupon code "${code}" already exists` })
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      title: title || `${discountValue}${discountType === 'percentage' ? '%' : '₹'} OFF Offer`,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount || 0),
      maxDiscountCap: Number(maxDiscountCap || 0),
      targetSegment: targetSegment || 'All Products',
      isActive: isActive !== false,
    })

    res.status(201).json(coupon)
  } catch (error) {
    console.error('Error creating coupon:', error)
    res.status(500).json({ message: 'Server error creating coupon' })
  }
}

// @desc    Update coupon details
// @route   PUT /api/coupons/:id
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params
    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' })
    }

    const { code, title, discountType, discountValue, minOrderAmount, maxDiscountCap, targetSegment, isActive } = req.body

    if (code) coupon.code = code.toUpperCase().trim()
    if (title) coupon.title = title
    if (discountType) coupon.discountType = discountType
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue)
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount)
    if (maxDiscountCap !== undefined) coupon.maxDiscountCap = Number(maxDiscountCap)
    if (targetSegment) coupon.targetSegment = targetSegment
    if (isActive !== undefined) coupon.isActive = Boolean(isActive)

    await coupon.save()
    res.json(coupon)
  } catch (error) {
    console.error('Error updating coupon:', error)
    res.status(500).json({ message: 'Server error updating coupon' })
  }
}

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params
    await Coupon.findByIdAndDelete(id)
    res.json({ message: 'Coupon deleted successfully' })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    res.status(500).json({ message: 'Server error deleting coupon' })
  }
}
