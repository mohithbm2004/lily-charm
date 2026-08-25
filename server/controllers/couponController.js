import mongoose from 'mongoose'
import Coupon from '../models/Coupon.js'
import { validateAndCalculateCoupon } from '../utils/couponValidator.js'
import { emitCouponCreated, emitCouponUpdated, emitCouponDeleted } from '../socket.js'

// @desc    Validate a promo code for cart items (Customer API)
// @route   POST /api/coupons/validate
export const validateCouponApi = async (req, res) => {
  try {
    const { code, items = [] } = req.body
    const userId = req.user?._id || null

    const result = await validateAndCalculateCoupon({
      couponCode: code,
      items,
      userId,
    })

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        message: result.message,
        cartSubtotal: result.cartSubtotal,
        shippingCharge: result.shippingCharge,
        grandTotal: result.grandTotal,
      })
    }

    return res.status(200).json({
      success: true,
      code: result.code,
      coupon: result.coupon,
      cartSubtotal: result.cartSubtotal,
      eligibleSubtotal: result.eligibleSubtotal,
      discountAmount: result.discountAmount,
      shippingCharge: result.shippingCharge,
      grandTotal: result.grandTotal,
      tax: 0,
      message: result.message,
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return res.status(500).json({ success: false, message: 'Server error validating coupon.' })
  }
}

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 })
    res.json(coupons)
  } catch (error) {
    console.error('Error fetching coupons:', error)
    res.status(500).json({ success: false, message: 'Server error fetching coupons' })
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
    res.status(500).json({ success: false, message: 'Server error fetching active coupons' })
  }
}

// @desc    Create a new coupon (Admin)
// @route   POST /api/coupons
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountCap,
      targetSegment,
      maxUsageLimit,
      perUserLimit,
      startDate,
      expiryDate,
      isActive,
    } = req.body

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' })
    }

    const val = Number(discountValue)
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ success: false, message: 'Discount value must be greater than zero' })
    }

    if (discountType === 'percentage' && val > 100) {
      return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' })
    }

    const cleanCode = code.toUpperCase().trim()
    const existing = await Coupon.findOne({ code: cleanCode })
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon code "${cleanCode}" already exists` })
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      title: title || `${val}${discountType === 'percentage' ? '%' : '₹'} OFF Offer`,
      discountType: discountType || 'percentage',
      discountValue: val,
      minOrderAmount: Math.max(0, Number(minOrderAmount || 0)),
      maxDiscountCap: Math.max(0, Number(maxDiscountCap || 0)),
      targetSegment: targetSegment || 'All Products',
      maxUsageLimit: Math.max(0, Number(maxUsageLimit || 0)),
      perUserLimit: Math.max(0, Number(perUserLimit || 0)),
      startDate: startDate ? new Date(startDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      isActive: isActive !== false,
    })

    emitCouponCreated(coupon)
    res.status(201).json(coupon)
  } catch (error) {
    console.error('Error creating coupon:', error)
    res.status(500).json({ success: false, message: 'Server error creating coupon' })
  }
}

// @desc    Update coupon details (Admin)
// @route   PUT /api/coupons/:id
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params
    let coupon = null

    if (mongoose.Types.ObjectId.isValid(id)) {
      coupon = await Coupon.findById(id)
    }
    if (!coupon) {
      coupon = await Coupon.findOne({ code: id.toUpperCase().trim() })
    }

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' })
    }

    const {
      code,
      title,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountCap,
      targetSegment,
      maxUsageLimit,
      perUserLimit,
      startDate,
      expiryDate,
      isActive,
    } = req.body

    if (code) coupon.code = code.toUpperCase().trim()
    if (title !== undefined) coupon.title = title
    if (discountType) coupon.discountType = discountType

    if (discountValue !== undefined) {
      const val = Number(discountValue)
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be greater than zero' })
      }
      if ((discountType || coupon.discountType) === 'percentage' && val > 100) {
        return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' })
      }
      coupon.discountValue = val
    }

    if (minOrderAmount !== undefined) coupon.minOrderAmount = Math.max(0, Number(minOrderAmount))
    if (maxDiscountCap !== undefined) coupon.maxDiscountCap = Math.max(0, Number(maxDiscountCap))
    if (maxUsageLimit !== undefined) coupon.maxUsageLimit = Math.max(0, Number(maxUsageLimit))
    if (perUserLimit !== undefined) coupon.perUserLimit = Math.max(0, Number(perUserLimit))
    if (startDate !== undefined) coupon.startDate = startDate ? new Date(startDate) : null
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate ? new Date(expiryDate) : null
    if (targetSegment) coupon.targetSegment = targetSegment
    if (isActive !== undefined) coupon.isActive = Boolean(isActive)

    await coupon.save()
    emitCouponUpdated(coupon)
    res.json(coupon)
  } catch (error) {
    console.error('Error updating coupon:', error)
    res.status(500).json({ success: false, message: 'Server error updating coupon' })
  }
}

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params
    let deleted = null

    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Coupon.findByIdAndDelete(id)
    }
    if (!deleted) {
      deleted = await Coupon.findOneAndDelete({ code: id.toUpperCase().trim() })
    }

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Coupon not found or already deleted' })
    }

    emitCouponDeleted(deleted._id || id)
    res.json({ success: true, message: 'Coupon deleted successfully' })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    res.status(500).json({ success: false, message: 'Server error deleting coupon' })
  }
}
