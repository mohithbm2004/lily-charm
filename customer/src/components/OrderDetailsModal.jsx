import { useState } from 'react'
import { X, Download, Truck, Package, AlertCircle, RefreshCw } from 'lucide-react'
import { formatPrice } from '../lib/format'
import OrderTimeline from './OrderTimeline'
import { API_URL } from '../config/api'

export default function OrderDetailsModal({ order, isOpen, onClose, onRefresh }) {
  const [cancelReason, setCancelReason] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [showCancelInput, setShowCancelInput] = useState(false)
  const [showRefundInput, setShowRefundInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!isOpen || !order) return null

  const handleDownloadInvoice = () => {
    window.open(`${API_URL}/orders/${order._id}/invoice`, '_blank')
  }

  const handleCancelOrder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/orders/${order._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'Cancelled by customer' }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('✨ Order cancelled successfully.')
        if (onRefresh) onRefresh()
      } else {
        setMessage(`⚠️ ${data.message || 'Failed to cancel order'}`)
      }
    } catch {
      setMessage('⚠️ Error cancelling order')
    } finally {
      setLoading(false)
    }
  }

  const handleRefundRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/orders/${order._id}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason, amount: order.grandTotal || order.total }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('✨ Refund request submitted to studio admin.')
        if (onRefresh) onRefresh()
      } else {
        setMessage(`⚠️ ${data.message || 'Failed to submit refund request'}`)
      }
    } catch {
      setMessage('⚠️ Error requesting refund')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--color-bg)] border border-[var(--color-line)] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 md:p-8 shadow-2xl relative space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3 sm:pb-4">
          <div className="min-w-0">
            <span className="eyebrow text-[var(--color-primary)] font-bold text-[0.62rem] sm:text-[0.68rem]">Order Details & Timeline</span>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-[var(--font-display)] uppercase truncate">
              {order.orderNumber || order._id}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close details modal" className="p-1.5 hover:bg-black/5 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 rounded">
            {message}
          </div>
        )}

        {/* Timeline */}
        <div className="bg-[var(--color-card-bg)] p-4 border border-[var(--color-line)]">
          <OrderTimeline status={order.status} history={order.statusHistory} notes={order.notes} refundId={order.razorpayRefundId} cancellationFee={order.cancellationFee} refundAmount={order.refundAmount} />
        </div>

        {/* Tracking Carrier Card */}
        {order.trackingNumber && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1 rounded">
            <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Truck size={16} /> Live Shipment Tracking Number
            </div>
            <p>Carrier: <strong>{order.carrier || 'BlueDart / Delhivery'}</strong></p>
            <p>Tracking Code: <strong className="font-mono text-sm">{order.trackingNumber}</strong></p>
          </div>
        )}

        {/* Products Table */}
        <div className="space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">Order Items ({order.items?.length || 0})</h3>
          <div className="divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-[var(--color-card-bg)]">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="p-3 flex items-center gap-4">
                <img
                  src={item.image || '/images/products/flower-1-1.jpg'}
                  alt={item.title}
                  className="w-14 h-14 object-cover border border-[var(--color-line)] bg-[var(--color-bg)]"
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)]">Qty: {item.qty} × {formatPrice(item.price)}</p>
                </div>
                <div className="font-mono font-bold text-sm">
                  {formatPrice((item.price || 0) * (item.qty || 1))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping & Payment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Shipping Address */}
          <div className="bg-[var(--color-card-bg)] p-4 border border-[var(--color-line)] space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-[var(--color-primary)]">Shipping Address</h4>
            <p className="font-bold">{order.shippingAddress?.name}</p>
            <p>{order.shippingAddress?.line1 || order.shippingAddress?.address}</p>
            <p>{order.shippingAddress?.city}, {order.shippingAddress?.pincode}</p>
            <p>Phone: {order.shippingAddress?.phone}</p>
            <p>Email: {order.shippingAddress?.email}</p>
          </div>

          {/* Summary Breakdown */}
          <div className="bg-[var(--color-card-bg)] p-4 border border-[var(--color-line)] space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-[var(--color-primary)]">Payment Summary</h4>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{formatPrice(order.subtotal || order.grandTotal || 0)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon Discount ({order.couponCode}):</span>
                <span className="font-mono">- {formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span className="font-mono">{order.shippingCharge > 0 ? formatPrice(order.shippingCharge) : 'FREE'}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t border-[var(--color-line)] pt-2 text-[var(--color-primary)]">
              <span>Grand Total:</span>
              <span className="font-mono">{formatPrice(order.grandTotal || order.total || 0)}</span>
            </div>
            <p className="text-[0.68rem] text-[var(--color-ink-soft)] pt-1">
              Method: <strong>{order.paymentMethod || 'Razorpay Prepaid'}</strong> ({order.paymentStatus || 'Paid'})
            </p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="pt-4 border-t border-[var(--color-line)] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleDownloadInvoice}
            className="btn-primary py-2.5 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Download size={14} /> Download PDF Invoice
          </button>

          <div className="flex items-center gap-3">
            {['Pending Payment', 'Paid', 'Confirmed', 'Processing'].includes(order.status) && (
              <button
                onClick={() => setShowCancelInput((v) => !v)}
                className="text-xs font-bold text-rose-700 hover:underline uppercase"
              >
                Cancel Order
              </button>
            )}

            {order.status === 'Delivered' && order.refundStatus === 'None' && (
              <button
                onClick={() => setShowRefundInput((v) => !v)}
                className="text-xs font-bold text-amber-800 hover:underline uppercase"
              >
                Request Refund
              </button>
            )}
          </div>
        </div>

        {/* Cancel Order Input Panel */}
        {showCancelInput && (
          <form onSubmit={handleCancelOrder} className="p-4 bg-rose-50 border border-rose-200 space-y-3">
            <h4 className="font-bold text-xs text-rose-900 uppercase">Confirm Order Cancellation</h4>
            <input
              type="text"
              required
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full border border-rose-300 p-2 text-xs bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-rose-700 text-white text-xs font-bold uppercase px-4 py-2"
            >
              {loading ? 'Processing...' : 'Submit Cancellation'}
            </button>
          </form>
        )}

        {/* Refund Request Input Panel */}
        {showRefundInput && (
          <form onSubmit={handleRefundRequest} className="p-4 bg-amber-50 border border-amber-200 space-y-3">
            <h4 className="font-bold text-xs text-amber-900 uppercase">Submit Refund Request</h4>
            <textarea
              required
              rows={2}
              placeholder="Describe reason for refund..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full border border-amber-300 p-2 text-xs bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-800 text-white text-xs font-bold uppercase px-4 py-2"
            >
              {loading ? 'Submitting...' : 'Send Refund Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
