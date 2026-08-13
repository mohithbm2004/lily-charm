import { CheckCircle2, Clock, Package, Truck, Home, AlertTriangle, RefreshCw } from 'lucide-react'

const STAGES = [
  { key: 'Pending Payment', label: 'Order Placed', icon: Clock },
  { key: 'Confirmed', label: 'Payment Confirmed', icon: CheckCircle2 },
  { key: 'Processing', label: 'Studio Processing', icon: Package },
  { key: 'Packed', label: 'Packed & Sealed', icon: Package },
  { key: 'Shipped', label: 'Shipped', icon: Truck },
  { key: 'Out For Delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'Delivered', label: 'Delivered', icon: Home },
]

export default function OrderTimeline({ status = 'Confirmed', history = [], notes = '', refundId = '', cancellationFee = 0, refundAmount = 0 }) {
  if (['Cancelled', 'Cancelled & Refunded', 'Refund Requested', 'Refund Approved', 'Refund Rejected', 'Returned', 'Payment Failed'].includes(status)) {
    const cancelEntry = (history || []).slice().reverse().find(h => h.status?.includes('Cancel') || h.note)
    const rawReason = cancelEntry?.note || notes || ''
    const cleanReason = rawReason
      ? rawReason.replace(/^Cancellation Reason:\s*/i, '').replace(/\|\s*Razorpay Refund ID:.*$/i, '').trim()
      : (status.includes('Refund') ? 'Refund request is being processed by our studio.' : 'Order was cancelled.')

    return (
      <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded flex items-start gap-3 text-xs text-rose-900 font-medium">
        <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-1 w-full min-w-0">
          <span className="font-bold uppercase tracking-wider block text-rose-950">Order Status: {status}</span>
          <span className="text-[0.7rem] sm:text-[0.72rem] text-rose-900 font-semibold block break-words">
            Reason: <span className="font-mono text-rose-950 font-bold">{cleanReason}</span>
          </span>

          {/* Refund & Fee Financial Breakdown */}
          {cancellationFee > 0 && (
            <div className="pt-1.5 border-t border-rose-200 text-[0.65rem] sm:text-[0.68rem] font-mono space-y-0.5">
              <p className="text-rose-900">• Customer Cancellation Fee (3%): <strong>-₹{cancellationFee}</strong></p>
              <p className="text-emerald-900 font-bold">• Net Refund to Payment Method (97%): <strong>₹{refundAmount}</strong></p>
            </div>
          )}

          {cancellationFee === 0 && refundAmount > 0 && (
            <div className="pt-1 border-t border-rose-200 text-[0.65rem] sm:text-[0.68rem] text-emerald-900 font-mono font-bold">
              • Studio Cancellation (100% Full Refund: ₹{refundAmount})
            </div>
          )}

          {refundId && (
            <span className="text-[0.62rem] sm:text-[0.65rem] text-emerald-800 font-mono font-bold block pt-0.5 break-all">
              ✨ Refund Reference: {refundId}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Calculate current stage index
  const getStageIndex = (st) => {
    switch (st) {
      case 'Pending Payment':
        return 0
      case 'Paid':
      case 'Confirmed':
        return 1
      case 'Processing':
        return 2
      case 'Packed':
        return 3
      case 'Shipped':
        return 4
      case 'Out For Delivery':
        return 5
      case 'Delivered':
        return 6
      default:
        return 1
    }
  }

  const currentIndex = getStageIndex(status)

  return (
    <div className="py-2 px-1 w-full max-w-full overflow-hidden">
      {/* Controlled Horizontal Scroller for Small Viewports */}
      <div className="overflow-x-auto pb-3 pt-2 scrollbar-thin w-full">
        <div className="min-w-[480px] sm:min-w-0 flex items-center justify-between relative px-2">
          {/* Background Connecting Line */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-4 h-0.5 bg-[var(--color-primary)] -translate-y-1/2 z-0 transition-all duration-700"
            style={{ width: `${(currentIndex / (STAGES.length - 1)) * 92}%` }}
          />

          {STAGES.map((stage, idx) => {
            const isPassed = idx <= currentIndex
            const isCurrent = idx === currentIndex
            const Icon = stage.icon

            return (
              <div key={stage.key} className="relative z-10 flex flex-col items-center group">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    isPassed
                      ? 'bg-[var(--color-primary)] text-white shadow-md'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-[var(--color-primary)]/20 scale-110' : ''}`}
                >
                  <Icon size={13} />
                </div>

                <span
                  className={`text-[0.58rem] sm:text-[0.65rem] tracking-wider uppercase font-bold mt-1.5 text-center max-w-[65px] sm:max-w-[70px] leading-tight ${
                    isPassed ? 'text-[var(--color-ink)]' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
