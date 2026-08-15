import crypto from 'crypto'
import CustomRequest from '../models/CustomRequest.js'
import Order from '../models/Order.js'
import Payment from '../models/Payment.js'
import Setting from '../models/Setting.js'
import User from '../models/User.js'
import razorpay from '../config/razorpay.js'
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js'
import {
  emitCustomRequestCreated,
  emitCustomRequestUpdated,
  emitCustomRequestDeleted,
  emitOrderCreated,
} from '../socket.js'
import {
  sendCustomQuoteReadyEmail,
  sendCustomRequestRejectedEmail,
} from '../services/orderEmail.service.js'
import {
  sendOrderConfirmationEmail,
  sendAdminNewOrderNotification,
} from '../utils/emailService.js'

async function processCustomImages(req, folder = 'lily-charm/custom-requests') {
  const rawList = []

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    for (const f of req.files) rawList.push(f.buffer)
  } else if (req.file) {
    rawList.push(req.file.buffer)
  }

  if (req.body.images) {
    let bImages = req.body.images
    if (typeof bImages === 'string') {
      try {
        bImages = JSON.parse(bImages)
      } catch {
        bImages = [bImages]
      }
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

// Helper: Calculate studio shipping fee based on live settings
async function calculateStudioShipping(price) {
  try {
    const studioSettings = await Setting.findOne({ key: 'main_studio_settings' })
    const isShippingEnabled = studioSettings?.shippingFeeEnabled ?? true
    const standardFee = studioSettings?.standardShippingFee ?? 100
    const threshold = studioSettings?.freeShippingThreshold ?? 2500

    if (isShippingEnabled) {
      return price >= threshold ? 0 : standardFee
    }
    return 0
  } catch {
    return price >= 2500 ? 0 : 100
  }
}

// GET /api/custom-requests — List all customer custom design requests (Admin / Studio)
export async function listCustomRequests(req, res, next) {
  try {
    const requests = await CustomRequest.find({}).sort({ createdAt: -1 })
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

// GET /api/custom-requests/:id/public-summary — Public Sanitized Summary for Direct Payment Page from Gmail
export async function getPublicQuoteSummary(req, res, next) {
  try {
    const customRequest = await CustomRequest.findById(req.params.id)
    if (!customRequest) {
      return res.status(404).json({ message: 'Custom design request not found.' })
    }

    const shippingCharge = await calculateStudioShipping(customRequest.quotedPrice || 0)
    const totalAmount = (customRequest.quotedPrice || 0) + shippingCharge

    res.json({
      id: customRequest._id,
      name: customRequest.name,
      email: customRequest.email,
      phone: customRequest.phone,
      address: customRequest.address,
      city: customRequest.city,
      pincode: customRequest.pincode,
      stylePreference: customRequest.stylePreference,
      notes: customRequest.notes,
      image: customRequest.image,
      images: customRequest.images,
      quotedPrice: customRequest.quotedPrice,
      shippingCharge,
      totalAmount,
      adminNotes: customRequest.adminNotes,
      status: customRequest.status,
      convertedOrderId: customRequest.convertedOrderId,
      razorpayOrderId: customRequest.razorpayOrderId,
      createdAt: customRequest.createdAt,
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/custom-requests — Create new custom design request from customer
export async function createCustomRequest(req, res, next) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Please log in to request a custom quote.' })
    }

    const body = { ...req.body }

    if (
      !body.name?.trim() ||
      !body.address?.trim() ||
      !body.city?.trim() ||
      !body.pincode?.trim()
    ) {
      return res.status(400).json({
        message: 'Customer name and full delivery address (address, city, pincode) are required!',
      })
    }

    // Strictly bind to authenticated user session
    body.user = req.user._id
    body.email = req.user.email // Always enforce authenticated user's registered email

    const uploadedUrls = await processCustomImages(req, 'lily-charm/custom-requests')
    if (uploadedUrls.length > 0) {
      body.images = uploadedUrls
      body.image = uploadedUrls[0]
    }

    body.status = 'Quote Pending'
    const customRequest = await CustomRequest.create(body)
    emitCustomRequestCreated(customRequest)
    res.status(201).json(customRequest)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/custom-requests/:id/quote — Admin quotes price for a custom request
export async function quotePrice(req, res, next) {
  try {
    const { quotedPrice, adminNotes } = req.body
    if (!quotedPrice || Number(quotedPrice) <= 0) {
      return res.status(400).json({ message: 'Quoted price must be greater than zero!' })
    }

    const price = Number(quotedPrice)
    const shipping = await calculateStudioShipping(price)
    const total = price + shipping

    const customRequest = await CustomRequest.findByIdAndUpdate(
      req.params.id,
      {
        quotedPrice: price,
        shippingCharge: shipping,
        totalAmount: total,
        adminNotes: adminNotes || '',
        status: 'Quoted',
      },
      { new: true }
    )

    if (!customRequest) return res.status(404).json({ message: 'Custom request not found' })
    emitCustomRequestUpdated(customRequest)

    // Trigger Quote Ready Email to customer registered account asynchronously
    try {
      await sendCustomQuoteReadyEmail(customRequest)
    } catch (mailErr) {
      console.warn('[CUSTOM QUOTE EMAIL WARNING]:', mailErr.message || mailErr)
    }

    res.json(customRequest)
  } catch (err) {
    next(err)
  }
}

// POST /api/custom-requests/:id/create-razorpay-order — Server-Side Razorpay Order Initialization for Custom Quotes
export async function createQuoteRazorpayOrder(req, res, next) {
  try {
    const customRequest = await CustomRequest.findById(req.params.id)
    if (!customRequest) return res.status(404).json({ message: 'Custom request not found' })

    if (customRequest.status !== 'Quoted' || !customRequest.quotedPrice) {
      return res.status(400).json({ message: 'This custom request is not in a quoted status.' })
    }

    const price = customRequest.quotedPrice
    const shipping = await calculateStudioShipping(price)
    const totalAmount = price + shipping
    const amountInPaise = Math.round(totalAmount * 100)

    let customerEmail = customRequest.email
    let customerName = customRequest.name
    if (customRequest.user) {
      const userDoc = await User.findById(customRequest.user).select('email name')
      if (userDoc?.email) {
        customerEmail = userDoc.email
        customerName = userDoc.name || customerName
      }
    }

    let razorpayOrderId = null
    try {
      if (razorpay && razorpay.orders) {
        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `CQ_${customRequest._id.toString().slice(-8)}`,
          notes: {
            customRequestId: customRequest._id.toString(),
            type: 'custom_quote',
            customerName,
            customerEmail: customerEmail.toLowerCase().trim(),
          },
        })
        razorpayOrderId = razorpayOrder.id
      }
    } catch (rzpErr) {
      console.warn('[RAZORPAY QUOTE ORDER CREATION WARNING]:', rzpErr.message || rzpErr)
    }

    if (!razorpayOrderId) {
      razorpayOrderId = `order_cq_${Date.now()}`
    }

    customRequest.razorpayOrderId = razorpayOrderId
    customRequest.shippingCharge = shipping
    customRequest.totalAmount = totalAmount
    await customRequest.save()

    // Record pending ledger entry
    try {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          customRequest: customRequest._id,
          orderNumber: `LC-CQ-${customRequest._id.toString().slice(-6)}`,
          razorpayOrderId,
          amount: totalAmount,
          currency: 'INR',
          paymentMethod: 'Razorpay Prepaid (Custom Quote)',
          status: 'pending',
        },
        { upsert: true, new: true }
      )
    } catch (e) {
      console.warn('[PAYMENT RECORD WARNING]:', e.message)
    }

    res.status(200).json({
      id: razorpayOrderId,
      order_id: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      quotedPrice: price,
      shippingCharge: shipping,
      totalAmount,
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_TNkyGJugajutew',
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Shared Idempotent Payment Processor for Custom Quotes (Used by both REST API and Razorpay Webhook)
 */
export async function processCustomQuotePaymentSuccess({
  customRequestId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = '',
  shippingAddressOverride = null,
  userId = null,
  userEmail = null,
}) {
  const customRequest = await CustomRequest.findById(customRequestId)
  if (!customRequest) return null

  // Idempotency: Check if already converted into official order
  if (
    (customRequest.status === 'Paid & Order Placed' || customRequest.status === 'Paid & Confirmed') &&
    customRequest.convertedOrderId
  ) {
    const existingOrder = await Order.findById(customRequest.convertedOrderId)
    return { order: existingOrder, customRequest, alreadyProcessed: true }
  }

  const price = customRequest.quotedPrice || 0
  const shipping = await calculateStudioShipping(price)
  const total = price + shipping
  const itemTitle = `Custom Artwork: ${customRequest.stylePreference || 'Bespoke Floral Frame'}`

  // Resolve customer User account
  let resolvedUser = null
  const candidateUserId = userId || customRequest.user
  if (candidateUserId) {
    resolvedUser = await User.findById(candidateUserId)
  }
  if (!resolvedUser) {
    const emailCandidates = [
      userEmail,
      shippingAddressOverride?.email,
      customRequest.email,
    ]
      .filter(Boolean)
      .map((e) => e.toLowerCase().trim())

    if (emailCandidates.length > 0) {
      resolvedUser = await User.findOne({
        $or: [
          { email: { $in: emailCandidates } },
          { alternateEmails: { $in: emailCandidates } },
        ],
      })
    }
  }

  // Unify email into user's alternateEmails if placed under another email
  const orderShippingEmail = (shippingAddressOverride?.email || customRequest.email || '').toLowerCase().trim()
  if (resolvedUser && orderShippingEmail && resolvedUser.email !== orderShippingEmail) {
    if (!Array.isArray(resolvedUser.alternateEmails)) resolvedUser.alternateEmails = []
    if (!resolvedUser.alternateEmails.includes(orderShippingEmail)) {
      resolvedUser.alternateEmails.push(orderShippingEmail)
      await resolvedUser.save()
    }
  }

  const shipAddr = shippingAddressOverride || {
    name: customRequest.name,
    email: customRequest.email,
    phone: customRequest.phone,
    line1: customRequest.address || 'Studio Collection Address',
    address: customRequest.address || 'Studio Collection Address',
    city: customRequest.city || 'Bengaluru',
    pincode: customRequest.pincode || '560001',
  }

  const newOrder = await Order.create({
    orderNumber: `LC-CQ-${Date.now().toString().slice(-6)}`,
    user: resolvedUser ? resolvedUser._id : customRequest.user || null,
    items: [
      {
        title: itemTitle,
        price: price,
        qty: 1,
        image: customRequest.image || customRequest.images?.[0] || '',
        specimen: customRequest.specimen || 'CUSTOM-DESIGN',
      },
    ],
    shippingAddress: shipAddr,
    billingAddress: shipAddr,
    subtotal: price,
    shippingCharge: shipping,
    grandTotal: total,
    total: total,
    paymentMethod: 'Razorpay Prepaid (Custom Quote)',
    paymentStatus: 'Paid',
    status: 'Confirmed',
    razorpayOrderId: razorpayOrderId || customRequest.razorpayOrderId || '',
    razorpayPaymentId: razorpayPaymentId || '',
    razorpaySignature: razorpaySignature || '',
    statusHistory: [{ status: 'Confirmed', note: 'Custom price quote accepted and paid online via Razorpay.' }],
  })

  if (resolvedUser && !customRequest.user) {
    customRequest.user = resolvedUser._id
  }
  customRequest.status = 'Paid & Order Placed'
  customRequest.convertedOrderId = newOrder._id.toString()
  customRequest.razorpayOrderId = razorpayOrderId || customRequest.razorpayOrderId
  customRequest.razorpayPaymentId = razorpayPaymentId
  customRequest.razorpaySignature = razorpaySignature
  customRequest.shippingCharge = shipping
  customRequest.totalAmount = total
  await customRequest.save()

  // Update Payment Audit Record
  try {
    await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpayOrderId || customRequest.razorpayOrderId },
      {
        order: newOrder._id,
        customRequest: customRequest._id,
        orderNumber: newOrder.orderNumber,
        razorpayPaymentId,
        razorpaySignature,
        status: 'captured',
      },
      { upsert: true }
    )
  } catch (e) {
    console.warn('[PAYMENT AUDIT RECORD WARNING]:', e.message)
  }

  // Send Confirmation Email to customer's registered account & Admin Notification
  sendOrderConfirmationEmail(newOrder).catch((e) =>
    console.warn('[CUSTOM ORDER CONFIRMATION EMAIL NOTICE]:', e.message)
  )
  sendAdminNewOrderNotification(newOrder).catch((e) =>
    console.warn('[ADMIN ORDER NOTIFICATION NOTICE]:', e.message)
  )

  emitOrderCreated(newOrder)
  emitCustomRequestUpdated(customRequest)

  return { order: newOrder, customRequest, alreadyProcessed: false }
}

// POST /api/custom-requests/:id/accept — Customer accepts price quote & verifies Razorpay payment server-side
export async function acceptQuoteAndCreateOrder(req, res, next) {
  try {
    const customRequest = await CustomRequest.findById(req.params.id)
    if (!customRequest) return res.status(404).json({ message: 'Custom request not found' })

    const {
      shippingAddress,
      userId,
      userEmail,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body

    // Check if already processed
    if (
      (customRequest.status === 'Paid & Order Placed' || customRequest.status === 'Paid & Confirmed') &&
      customRequest.convertedOrderId
    ) {
      const existingOrder = await Order.findById(customRequest.convertedOrderId)
      return res.json({
        success: true,
        message: 'This custom quote order has already been verified and confirmed.',
        order: existingOrder,
        customRequest,
      })
    }

    if (!razorpayPaymentId) {
      return res.status(400).json({ message: 'Missing Razorpay payment ID.' })
    }

    // Verify HMAC-SHA256 Signature if secret exists
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (keySecret && razorpayOrderId && razorpaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

      let isMatch = false
      try {
        isMatch = crypto.timingSafeEqual(
          Buffer.from(generatedSignature, 'utf-8'),
          Buffer.from(razorpaySignature, 'utf-8')
        )
      } catch {
        isMatch = false
      }

      if (!isMatch) {
        console.error('[CUSTOM QUOTE SIGNATURE MISMATCH]:', { generatedSignature, razorpaySignature })
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature verification.',
        })
      }
    }

    const result = await processCustomQuotePaymentSuccess({
      customRequestId: customRequest._id,
      razorpayOrderId: razorpayOrderId || customRequest.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      shippingAddressOverride: shippingAddress,
      userId,
      userEmail,
    })

    res.json({
      success: true,
      message: 'Quote accepted and payment verified! Custom design converted into official order.',
      order: result.order,
      customRequest: result.customRequest,
    })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/custom-requests/:id/decline — Customer declines price quote
export async function declineQuote(req, res, next) {
  try {
    const customRequest = await CustomRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'Quote Declined' },
      { new: true }
    )
    if (!customRequest) return res.status(404).json({ message: 'Custom request not found' })
    emitCustomRequestUpdated(customRequest)
    res.json(customRequest)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/custom-requests/:id/status — Update status of a custom request directly
export async function updateCustomRequestStatus(req, res, next) {
  try {
    const { status, reason, adminNotes } = req.body
    const updateData = { status }
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (reason && !adminNotes) updateData.adminNotes = reason

    const customRequest = await CustomRequest.findByIdAndUpdate(req.params.id, updateData, { new: true })
    if (!customRequest) return res.status(404).json({ message: 'Custom design request not found' })
    emitCustomRequestUpdated(customRequest)

    // Trigger rejection notification email if status is Rejected or Declined
    if (status === 'Rejected' || status === 'Declined') {
      try {
        await sendCustomRequestRejectedEmail(
          customRequest,
          reason || adminNotes || customRequest.adminNotes
        )
      } catch (mailErr) {
        console.warn('[CUSTOM REJECTED EMAIL WARNING]:', mailErr.message || mailErr)
      }
    }

    res.json(customRequest)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/custom-requests/:id — Delete a custom request and its Cloudinary images
export async function deleteCustomRequest(req, res, next) {
  try {
    const customRequest = await CustomRequest.findByIdAndDelete(req.params.id)
    if (!customRequest) return res.status(404).json({ message: 'Custom design request not found' })

    const imagesToDelete =
      Array.isArray(customRequest.images) && customRequest.images.length > 0
        ? customRequest.images
        : [customRequest.image]

    for (const imgUrl of imagesToDelete) {
      if (imgUrl) await deleteFromCloudinary(imgUrl)
    }

    emitCustomRequestDeleted(customRequest._id || req.params.id)
    res.json({ message: 'Custom design request deleted successfully', deleted: customRequest })
  } catch (err) {
    next(err)
  }
}
