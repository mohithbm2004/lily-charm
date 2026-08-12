import mongoose from 'mongoose'
import Coupon from '../models/Coupon.js'
import { emitCouponCreated, emitCouponUpdated, emitCouponDeleted } from '../socket.js'

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

// @desc    Create a new coupon
// @route   POST /api/coupons
export const createCoupon = async (req, res) => {
  try {
    const { code, title, discountType, discountValue, minOrderAmount, maxDiscountCap, targetSegment, isActive } = req.body

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' })
    }

    const cleanCode = code.toUpperCase().trim()
    const existing = await Coupon.findOne({ code: cleanCode })
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon code "${cleanCode}" already exists` })
    }

    const coupon = await Coupon.create({
      code: cleanCode,
      title: title || `${discountValue}${discountType === 'percentage' ? '%' : '₹'} OFF Offer`,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue || 10),
      minOrderAmount: Number(minOrderAmount || 0),
      maxDiscountCap: Number(maxDiscountCap || 0),
      targetSegment: targetSegment || 'All Products',
      isActive: isActive !== false,
    })

    emitCouponCreated(coupon)
    res.status(201).json(coupon)
  } catch (error) {
    console.error('Error creating coupon:', error)
    res.status(500).json({ success: false, message: 'Server error creating coupon' })
  }
}

// @desc    Update coupon details
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

    const { code, title, discountType, discountValue, minOrderAmount, maxDiscountCap, targetSegment, isActive } = req.body

    if (code) coupon.code = code.toUpperCase().trim()
    if (title !== undefined) coupon.title = title
    if (discountType) coupon.discountType = discountType
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue)
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount)
    if (maxDiscountCap !== undefined) coupon.maxDiscountCap = Number(maxDiscountCap)
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

// @desc    Delete coupon
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
