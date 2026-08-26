import { useState } from 'react'
import { CheckCircle2, Clock, Package, Truck, Home, AlertTriangle, RefreshCw } from 'lucide-react'

const STAGES = [
  { key: 'Pending Payment', label: 'Order Placed', icon: Clock },
  { key: 'Order Confirmed', label: 'Payment Confirmed', icon: CheckCircle2 },
  { key: 'Handcrafting in Studio', label: 'Handcrafting', icon: Package },
  { key: 'Studio Processing', label: 'Processing', icon: Package },
  { key: 'Packed & Sealed', label: 'Packed & Sealed', icon: Package },
  { key: 'Packed & Dispatched', label: 'Dispatched', icon: Truck },
  { key: 'Shipped', label: 'Shipped', icon: Truck },
  { key: 'Out For Delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'Delivered', label: 'Delivered', icon: Home },
]

export default function OrderTimeline({ status = 'Order Confirmed', history = [], notes = '', refundId = '', cancellationFee = 0, refundAmount = 0 }) {
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
      case 'Pending':
        return 0
      case 'Paid':
      case 'Confirmed':
      case 'Order Confirmed':
        return 1
      case 'Handcrafting':
      case 'Handcrafting in Studio':
        return 2
      case 'Processing':
      case 'Studio Processing':
        return 3
      case 'Packed':
      case 'Packed & Sealed':
        return 4
      case 'Packed & Dispatched':
        return 5
      case 'Shipped':
        return 6
      case 'Out For Delivery':
        return 7
      case 'Delivered':
        return 8
      default:
        return 1
    }
  }

  const currentIndex = getStageIndex(status)
  const [expanded, setExpanded] = useState(false)

  const currentStage = STAGES[currentIndex] || STAGES[1]
  const CurrentIcon = currentStage.icon
  const currentStageLabel = currentStage.label

  if (!expanded) {
    return (
      <div className="w-full">
        <div
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between gap-3 p-3 bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-100/80 rounded-2xl cursor-pointer transition-colors shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
              <CurrentIcon size={14} />
            </div>
            <div>
              <span className="text-[0.62rem] text-[var(--color-ink-soft)] uppercase font-mono font-bold tracking-wider block">
                Current Status
              </span>
              <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wide">
                {currentStageLabel}
              </span>
            </div>
          </div>
          <div className="text-[var(--color-primary)] font-bold text-[0.65rem] uppercase tracking-wider flex items-center gap-1 hover:underline">
            Track Order ➔
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div
        onClick={() => setExpanded(false)}
        className="flex items-center justify-between gap-3 p-3 bg-stone-50 border border-stone-200/60 rounded-2xl cursor-pointer hover:bg-stone-100 transition-colors shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
            <CurrentIcon size={14} />
          </div>
          <div>
            <span className="text-[0.62rem] text-[var(--color-ink-soft)] uppercase font-mono font-bold tracking-wider block">
              Fulfillment Timeline
            </span>
            <span className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wide">
              {currentStageLabel}
            </span>
          </div>
        </div>
        <div className="text-[var(--color-ink-soft)] font-bold text-[0.65rem] uppercase tracking-wider flex items-center gap-1">
          Collapse ▲
        </div>
      </div>

      <div className="bg-stone-50/50 p-4 border border-[var(--color-line)]/50 rounded-2xl">
        <div className="flex flex-col gap-4 pl-2 pt-1">
          {STAGES.map((stage, idx) => {
            const isPassed = idx <= currentIndex
            const isCurrent = idx === currentIndex
            const Icon = stage.icon
            
            // Find if this stage has an entry in history
            const histEntry = (history || []).find(h => h.status === stage.key)
            const timestamp = histEntry && histEntry.timestamp
              ? new Date(histEntry.timestamp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })
              : null

            return (
              <div key={stage.key} className="flex gap-4 items-start relative">
                {/* Vertical Connector Line */}
                {idx < STAGES.length - 1 && (
                  <div
                    className={`absolute left-3.5 top-7 bottom-0 w-0.5 -translate-x-1/2 z-0 ${
                      idx < currentIndex ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                    }`}
                    style={{ height: 'calc(100% + 16px)' }}
                  />
                )}

                {/* Circle/Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-all ${
                    isPassed
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'bg-white border border-gray-300 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-[var(--color-primary)]/20 scale-105' : ''}`}
                >
                  <Icon size={12} />
                </div>

                {/* Text Label & Timestamp */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[0.68rem] sm:text-xs uppercase font-bold tracking-wider ${isPassed ? 'text-[var(--color-ink)]' : 'text-gray-400'}`}>
                    {stage.label}
                  </p>
                  {timestamp && (
                    <p className="text-[0.62rem] sm:text-[0.65rem] text-[var(--color-ink-soft)] font-mono mt-0.5">
                      🕒 {timestamp}
                    </p>
                  )}
                  {!timestamp && isPassed && (
                    <p className="text-[0.62rem] sm:text-[0.65rem] text-emerald-800 font-bold font-mono mt-0.5">
                      ✓ Completed
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
