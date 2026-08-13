import CustomRequest from '../models/CustomRequest.js'
import Order from '../models/Order.js'
import Setting from '../models/Setting.js'
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryHelper.js'
import { emitCustomRequestCreated, emitCustomRequestUpdated, emitCustomRequestDeleted, emitOrderCreated } from '../socket.js'

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

// GET /api/custom-requests — List all customer custom design requests
export async function listCustomRequests(req, res, next) {
  try {
    const requests = await CustomRequest.find({}).sort({ createdAt: -1 })
    res.json(requests)
  } catch (err) {
    next(err)
  }
}

// POST /api/custom-requests — Create new custom design request from customer
export async function createCustomRequest(req, res, next) {
  try {
    const body = { ...req.body }

    if (!body.name?.trim() || !body.email?.trim() || !body.address?.trim() || !body.city?.trim() || !body.pincode?.trim()) {
      return res.status(400).json({ message: 'Customer name, email, and full delivery address (address, city, pincode) are required!' })
    }

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

    const customRequest = await CustomRequest.findByIdAndUpdate(
      req.params.id,
      {
        quotedPrice: Number(quotedPrice),
        adminNotes: adminNotes || '',
        status: 'Quoted',
      },
      { new: true }
    )

    if (!customRequest) return res.status(404).json({ message: 'Custom request not found' })
    emitCustomRequestUpdated(customRequest)
    res.json(customRequest)
  } catch (err) {
    next(err)
  }
}

// POST /api/custom-requests/:id/accept — Customer accepts price quote & pays online via Razorpay to create Order
export async function acceptQuoteAndCreateOrder(req, res, next) {
  try {
    const customRequest = await CustomRequest.findById(req.params.id)
    if (!customRequest) return res.status(404).json({ message: 'Custom request not found' })

    if (customRequest.status !== 'Quoted' || !customRequest.quotedPrice) {
      return res.status(400).json({ message: 'This custom request has not been quoted by admin yet.' })
    }

    const { shippingAddress, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

    const itemTitle = `Custom Artwork: ${customRequest.stylePreference || 'Bespoke Floral Frame'}`
    const price = customRequest.quotedPrice

    // Dynamic Shipping Fee Calculation matching normal orders
    let shipping = 0
    try {
      const studioSettings = await Setting.findOne({ key: 'main_studio_settings' })
      const isShippingEnabled = studioSettings?.shippingFeeEnabled ?? true
      const standardFee = studioSettings?.standardShippingFee ?? 100
      const threshold = studioSettings?.freeShippingThreshold ?? 2500

      if (isShippingEnabled) {
        shipping = price >= threshold ? 0 : standardFee
      } else {
        shipping = 0
      }
    } catch {
      shipping = 0
    }

    const total = price + shipping

    const newOrder = await Order.create({
      orderNumber: `LC-CQ-${Date.now().toString().slice(-6)}`,
      user: customRequest.user || req.user?._id,
      items: [
        {
          title: itemTitle,
          price: price,
          qty: 1,
          image: customRequest.image || customRequest.images?.[0] || '',
          specimen: customRequest.specimen || 'CUSTOM-DESIGN',
        },
      ],
      shippingAddress: shippingAddress || {
        name: customRequest.name,
        email: customRequest.email,
        phone: customRequest.phone,
        address: customRequest.address || 'Studio Collection Address',
        city: customRequest.city || 'Bengaluru',
        pincode: customRequest.pincode || '560001',
      },
      subtotal: price,
      shippingCharge: shipping,
      grandTotal: total,
      total: total,
      paymentMethod: 'Razorpay Prepaid (Custom Quote)',
      paymentStatus: 'Paid',
      status: 'Confirmed',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      razorpaySignature: razorpaySignature || '',
      statusHistory: [{ status: 'Confirmed', note: 'Custom price quote accepted and paid online via Razorpay.' }],
    })

    customRequest.status = 'Paid & Order Placed'
    customRequest.convertedOrderId = newOrder._id.toString()
    await customRequest.save()

    emitOrderCreated(newOrder)
    emitCustomRequestUpdated(customRequest)

    res.json({
      success: true,
      message: 'Quote accepted and payment received! Custom design converted into official order.',
      order: newOrder,
      customRequest,
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
    const { status } = req.body
    const customRequest = await CustomRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
    if (!customRequest) return res.status(404).json({ message: 'Custom design request not found' })
    emitCustomRequestUpdated(customRequest)
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

    const imagesToDelete = Array.isArray(customRequest.images) && customRequest.images.length > 0
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
