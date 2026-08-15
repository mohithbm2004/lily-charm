import Review from '../models/Review.js'
import Order from '../models/Order.js'
import AdminSession from '../models/AdminSession.js'
import jwt from 'jsonwebtoken'
import { emitReviewCreated, emitReviewUpdated, emitReviewDeleted } from '../socket.js'

const DEFAULT_REVIEWS = [
  {
    name: 'Ananya R.',
    email: 'ananya.r@example.com',
    rating: 5,
    title: 'Breathtaking Craftsmanship!',
    comment: 'The velvet lily bouquet arrived in perfect shape — every pearl and petal is crafted with incredible precision!',
    productTitle: 'Velvet Lilies & Wildflowers Bouquet',
    isDisplayed: true,
    isVerifiedBuyer: true,
  },
  {
    name: 'Devika M.',
    email: 'devika.m@example.com',
    rating: 5,
    title: 'Timeless Keepsake',
    comment: 'The creations from Lily Charm are true works of art. The golden sunflower will last forever and looks majestic in our living room.',
    productTitle: 'Golden Sunflower Velvet Keepsake',
    isDisplayed: true,
    isVerifiedBuyer: true,
  },
  {
    name: 'Priyanka Sharma',
    email: 'priyanka.s@example.com',
    rating: 5,
    title: 'Perfect Anniversary Gift',
    comment: 'Ordered a custom preserved floral frame for our 5th anniversary. Keerthana did an amazing job with color blending and ribbon styling!',
    productTitle: 'Custom Bridal Keepsake Frame',
    isDisplayed: true,
    isVerifiedBuyer: true,
  },
]

// GET /api/reviews — List reviews (public: only isDisplayed=true, admin: all)
export async function listReviews(req, res, next) {
  try {
    // Check if caller is authenticated admin
    let isAdmin = Boolean(req.admin || req.user?.role === 'admin')
    if (!isAdmin) {
      const sessionId = req.cookies?.lily_admin_session || req.headers['x-admin-session-id']
      if (sessionId) {
        try {
          const session = await AdminSession.findOne({ sessionId })
          if (session && Date.now() <= new Date(session.expiresAt).getTime()) {
            isAdmin = true
          }
        } catch {}
      }
    }

    const showAll = isAdmin && (req.query.all === 'true' || req.query.admin === 'true')
    const filter = showAll ? {} : { isDisplayed: true }

    if (req.query.productId) {
      filter.product = req.query.productId
    }

    let reviews = await Review.find(filter).sort({ createdAt: -1 })

    // Auto-seed default reviews if collection is empty
    if (reviews.length === 0) {
      const count = await Review.countDocuments({})
      if (count === 0) {
        await Review.insertMany(DEFAULT_REVIEWS)
        reviews = await Review.find(filter).sort({ createdAt: -1 })
      }
    }

    res.json(reviews)
  } catch (err) {
    next(err)
  }
}

// POST /api/reviews — Customer submits new review / feedback
export async function createReview(req, res, next) {
  try {
    const { name, email, rating, title, comment, productTitle, product } = req.body

    if (!name || !comment) {
      return res.status(400).json({ message: 'Name and feedback comment are required.' })
    }

    const numRating = Math.max(1, Math.min(5, Number(rating) || 5))

    // Resolve authenticated customer to determine verified buyer status
    let reviewerUserId = req.user?._id
    if (!reviewerUserId && req.headers.authorization?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET)
        reviewerUserId = decoded.id
      } catch {}
    }

    let isVerifiedBuyer = false
    if (reviewerUserId) {
      const queryCriteria = []
      if (product) queryCriteria.push({ 'items.product': product })
      if (productTitle) queryCriteria.push({ 'items.title': productTitle.trim() })

      if (queryCriteria.length > 0) {
        const qualifyingOrder = await Order.findOne({
          user: reviewerUserId,
          paymentStatus: 'Paid',
          $or: queryCriteria,
        })
        isVerifiedBuyer = Boolean(qualifyingOrder)
      }
    }

    const newReview = await Review.create({
      name: name.trim(),
      email: (email || '').trim(),
      rating: numRating,
      title: (title || '').trim(),
      comment: comment.trim(),
      productTitle: productTitle || 'Lily Charm Floral Creation',
      product: product || undefined,
      user: reviewerUserId || undefined,
      isDisplayed: false, // Must be moderated and approved by admin
      isVerifiedBuyer,
    })

    emitReviewCreated(newReview)
    res.status(201).json(newReview)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/reviews/:id/display — Toggle review storefront display (isDisplayed: true / false)
export async function toggleReviewDisplay(req, res, next) {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' })
    }

    if (typeof req.body.isDisplayed === 'boolean') {
      review.isDisplayed = req.body.isDisplayed
    } else {
      review.isDisplayed = !review.isDisplayed
    }

    await review.save()
    emitReviewUpdated(review)
    res.json(review)
  } catch (err) {
    next(err)
  }
}

// PUT /api/reviews/:id — Admin update review / add reply
export async function updateReview(req, res, next) {
  try {
    const updated = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) {
      return res.status(404).json({ message: 'Review not found.' })
    }
    emitReviewUpdated(updated)
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/reviews/:id — Admin delete review
export async function deleteReview(req, res, next) {
  try {
    const deleted = await Review.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Review not found.' })
    }
    emitReviewDeleted(req.params.id)
    res.json({ message: 'Review successfully removed.', id: req.params.id })
  } catch (err) {
    next(err)
  }
}
