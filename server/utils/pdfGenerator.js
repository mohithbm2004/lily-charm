import PDFDocument from 'pdfkit'

export function generateInvoicePDF(order, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderNumber || order._id}.pdf`)

  doc.pipe(res)

  // Colors
  const darkGreen = '#212B1C'
  const gold = '#D4AF37'
  const textDark = '#2B2B2B'

  // Header Box
  doc.rect(40, 40, 515, 75).fill(darkGreen)

  doc
    .fillColor('#FFFFFF')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text('LILY CHARM', 55, 55, { characterSpacing: 3 })
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#E8DCC4')
    .text('Handcrafted Botanical Art & Velvet Sculptures', 55, 82)

  doc
    .fillColor('#FFFFFF')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text('TAX INVOICE', 380, 55, { align: 'right' })
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#E8DCC4')
    .text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}`, 380, 78, { align: 'right' })

  doc.moveDown(3)

  // Order Details Bar
  const startY = 130
  doc
    .fillColor(textDark)
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(`Order Number: ${order.orderNumber || order._id}`, 40, startY)
  doc
    .font('Helvetica')
    .text(`Payment Status: ${(order.paymentStatus || 'Paid').toUpperCase()}`, 380, startY, { align: 'right' })
  doc
    .font('Helvetica')
    .text(`Order Status: ${(order.status || 'Confirmed').toUpperCase()}`, 380, startY + 14, { align: 'right' })

  // Line Divider
  doc.moveTo(40, startY + 35).lineTo(555, startY + 35).strokeColor('#E0E0E0').stroke()

  // Addresses Section
  const addrY = startY + 45
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(darkGreen)
    .text('SHIPPED TO:', 40, addrY)
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(textDark)
    .text(order.shippingAddress?.name || 'Customer Name', 40, addrY + 15)
    .text(order.shippingAddress?.line1 || order.shippingAddress?.address || '', 40, addrY + 28)
    .text(`${order.shippingAddress?.city || ''}, ${order.shippingAddress?.pincode || ''}`, 40, addrY + 41)
    .text(`Phone: ${order.shippingAddress?.phone || 'N/A'}`, 40, addrY + 54)
    .text(`Email: ${order.shippingAddress?.email || 'N/A'}`, 40, addrY + 67)

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(darkGreen)
    .text('PAYMENT METRICS:', 320, addrY)
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(textDark)
    .text(`Method: ${order.paymentMethod || 'Razorpay Prepaid'}`, 320, addrY + 15)
    .text(`Razorpay Payment ID: ${order.razorpayPaymentId || 'N/A'}`, 320, addrY + 28)
    .text(`Razorpay Order ID: ${order.razorpayOrderId || 'N/A'}`, 320, addrY + 41)

  // Items Table Header
  const tableY = addrY + 95
  doc.rect(40, tableY, 515, 22).fill('#F4F1EA')

  doc
    .fillColor(darkGreen)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('PRODUCT SPECIMEN', 50, tableY + 6)
    .text('QTY', 300, tableY + 6, { width: 50, align: 'center' })
    .text('UNIT PRICE', 360, tableY + 6, { width: 80, align: 'right' })
    .text('TOTAL PRICE', 450, tableY + 6, { width: 95, align: 'right' })

  let currentY = tableY + 28

  if (Array.isArray(order.items)) {
    order.items.forEach((item) => {
      const itemTotal = (item.price || 0) * (item.qty || 1)

      doc
        .fillColor(textDark)
        .fontSize(9)
        .font('Helvetica')
        .text(item.title || 'Botanical Artwork', 50, currentY, { width: 240 })
        .text(String(item.qty || 1), 300, currentY, { width: 50, align: 'center' })
        .text(`INR ${Number(item.price || 0).toLocaleString('en-IN')}`, 360, currentY, { width: 80, align: 'right' })
        .text(`INR ${itemTotal.toLocaleString('en-IN')}`, 450, currentY, { width: 95, align: 'right' })

      currentY += 22
    })
  }

  doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor('#E0E0E0').stroke()

  // Summary Totals
  const sumY = currentY + 15
  doc
    .fontSize(9)
    .font('Helvetica')
    .text('Subtotal:', 350, sumY, { width: 100, align: 'right' })
    .text(`INR ${Number(order.subtotal || order.grandTotal || 0).toLocaleString('en-IN')}`, 450, sumY, { width: 95, align: 'right' })

  doc
    .text('Discount:', 350, sumY + 14, { width: 100, align: 'right' })
    .text(`- INR ${Number(order.discountAmount || 0).toLocaleString('en-IN')}`, 450, sumY + 14, { width: 95, align: 'right' })

  doc
    .text('Shipping Charge:', 350, sumY + 28, { width: 100, align: 'right' })
    .text(order.shippingCharge > 0 ? `INR ${order.shippingCharge}` : 'FREE', 450, sumY + 28, { width: 95, align: 'right' })

  doc.rect(340, sumY + 45, 215, 25).fill(darkGreen)

  doc
    .fillColor('#FFFFFF')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('GRAND TOTAL:', 350, sumY + 52, { width: 100, align: 'right' })
    .text(`INR ${Number(order.grandTotal || order.total || 0).toLocaleString('en-IN')}`, 450, sumY + 52, { width: 95, align: 'right' })

  // Footer Note
  doc
    .fillColor('#666666')
    .fontSize(8)
    .font('Helvetica-Oblique')
    .text('Thank you for choosing Lily Charm. Every creation is handcrafted with love and care.', 40, 750, { align: 'center' })

  doc.end()
}
