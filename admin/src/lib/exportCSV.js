import { formatPrice, formatDateTime } from './format'

/**
 * Universal CSV Exporter with BOM for perfect Excel / Google Sheets compatibility
 */
export function downloadCSV(filename, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.')
    return
  }

  const keys = Object.keys(rows[0])
  const separator = ','

  // Add UTF-8 BOM so Excel opens accented & Hindi / special characters perfectly
  const csvContent =
    '\uFEFF' +
    keys.map((k) => `"${String(k).replace(/"/g, '""')}"`).join(separator) +
    '\n' +
    rows
      .map((row) =>
        keys
          .map((k) => {
            const val = row[k] === null || row[k] === undefined ? '' : String(row[k])
            return `"${val.replace(/"/g, '""')}"`
          })
          .join(separator)
      )
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export All Orders to CSV
 */
export function exportOrdersToCSV(orders = []) {
  if (!orders || orders.length === 0) {
    alert('No orders available to export.')
    return
  }

  const rows = orders.map((o) => {
    const itemsSummary = (o.items || [])
      .map((it) => `${it.title} (Qty: ${it.qty || 1} @ ${formatPrice(it.price)})`)
      .join('; ')

    const ship = o.shippingAddress || {}

    return {
      'Order Number': o.orderNumber || o.id || o._id,
      'Order Timestamp': formatDateTime(o.createdAt || o.date),
      'Customer Name': o.customerName || ship.name || 'Customer',
      'Customer Email': o.email || ship.email || '',
      'Customer Phone': o.phone || ship.phone || '',
      'Street Address': o.address || ship.address || ship.line1 || '',
      'City': o.city || ship.city || '',
      'PIN Code': o.pincode || ship.pincode || '',
      'Total Items Count': (o.items || []).reduce((sum, it) => sum + (it.qty || 1), 0),
      'Items Detail': itemsSummary,
      'Subtotal (INR)': o.subtotal || 0,
      'Discount (INR)': o.discountAmount || 0,
      'Coupon Code': o.couponCode || 'None',
      'Shipping Charge (INR)': o.shippingCharge || 0,
      'Grand Total (INR)': o.grandTotal || o.total || 0,
      'Payment Method': o.paymentMethod || 'Razorpay Prepaid',
      'Payment Status': o.paymentStatus || 'Paid',
      'Razorpay Order ID': o.razorpayOrderId || '',
      'Razorpay Payment ID': o.razorpayPaymentId || '',
      'Fulfillment Status': o.status || 'Confirmed',
      'Courier Carrier': o.carrier || 'BlueDart',
      'Tracking Number': o.trackingNumber || 'Pending',
      'Razorpay Refund ID': o.razorpayRefundId || 'None',
      'Refund Amount (INR)': o.refundAmount || 0,
      'Cancellation Fee (INR)': o.cancellationFee || 0,
      'Handmade Terms Accepted': o.termsAccepted ? 'Yes' : 'No / Legacy',
      'Terms Version': o.termsVersion || (o.termsAccepted ? '1.0' : 'N/A'),
      'Terms Accepted At': o.termsAcceptedAt ? formatDateTime(o.termsAcceptedAt) : 'N/A',
      'Order Notes & History': o.notes || (o.statusHistory || []).map((h) => `${h.status}: ${h.note || ''}`).join(' | '),
    }
  })

  downloadCSV('LilyCharm_All_Orders', rows)
}

/**
 * Export All Registered Users & Customer Profiles to CSV
 */
export function exportUsersToCSV(users = [], orders = [], customRequests = []) {
  if (!users || users.length === 0) {
    alert('No registered users available to export.')
    return
  }

  const rows = users.map((u) => {
    const uIdStr = u._id ? u._id.toString() : ''

    const userOrdersList = (orders || []).filter((o) => {
      const oUserId = (o.user?._id || o.user)?.toString()
      return Boolean(uIdStr && oUserId && oUserId === uIdStr)
    })

    const totalSpent = userOrdersList.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0)

    const userRequestsList = (customRequests || []).filter((r) => {
      const rUserId = (r.user?._id || r.user)?.toString()
      return Boolean(uIdStr && rUserId && rUserId === uIdStr)
    })

    return {
      'User ID': u._id || '',
      'Customer Name': u.name || 'Valued Customer',
      'Email Address': u.email || '',
      'Phone Number': u.phone || '',
      'Authentication Provider': u.provider === 'google' || u.googleId ? 'Google OAuth' : 'Email OTP',
      'Verification Status': u.isVerified || u.provider === 'google' ? 'Verified' : 'Pending OTP',
      'Saved Street Address': u.address || '',
      'City': u.city || '',
      'PIN Code': u.pincode || '',
      'Total Orders Placed': userOrdersList.length,
      'Total Lifetime Spent (INR)': totalSpent,
      'Total Custom Quotes Submitted': userRequestsList.length,
      'Registered Timestamp': formatDateTime(u.createdAt),
    }
  })

  downloadCSV('LilyCharm_All_Users', rows)
}

/**
 * Export All Custom Design Requests to CSV
 */
export function exportCustomRequestsToCSV(customRequests = []) {
  if (!customRequests || customRequests.length === 0) {
    alert('No custom design requests available to export.')
    return
  }

  const rows = customRequests.map((r) => {
    const reqImages = Array.isArray(r.images) && r.images.length > 0
      ? r.images.join(' ; ')
      : (r.image || '')

    return {
      'Request ID': r._id || '',
      'Submitted Timestamp': formatDateTime(r.createdAt),
      'Customer Name': r.name || '',
      'Customer Email': r.email || '',
      'Customer Phone': r.phone || '',
      'Street Address': r.address || '',
      'City': r.city || '',
      'PIN Code': r.pincode || '',
      'Preferred Style': r.stylePreference || 'Custom Arrangement',
      'Customer Requirements & Notes': r.notes || '',
      'Reference Images URLs': reqImages || 'None attached',
      'Admin Quoted Price (INR)': r.quotedPrice || 0,
      'Admin Notes': r.adminNotes || '',
      'Request Status': r.status || 'Pending',
      'Converted Order ID': r.convertedOrderId || 'Not converted',
    }
  })

  downloadCSV('LilyCharm_Custom_Design_Requests', rows)
}

/**
 * Export All Customer Reviews & Feedback to CSV
 */
export function exportReviewsToCSV(reviews = []) {
  if (!reviews || reviews.length === 0) {
    alert('No reviews available to export.')
    return
  }

  const rows = reviews.map((r) => ({
    'Review ID': r._id || '',
    'Submitted Timestamp': formatDateTime(r.createdAt),
    'Customer Name': r.name || '',
    'Customer Email': r.email || '',
    'Rating (Stars)': r.rating || 5,
    'Review Title': r.title || '',
    'Feedback Comment': r.comment || '',
    'Creation Title': r.productTitle || '',
    'Display on Storefront': r.isDisplayed ? 'YES (Live)' : 'NO (Hidden)',
    'Verified Buyer': r.isVerifiedBuyer ? 'Verified' : 'Unverified',
  }))

  downloadCSV('LilyCharm_Customer_Reviews', rows)
}

