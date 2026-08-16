import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Package,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react'
import { formatPrice } from '../lib/format'
import Reveal from '../components/Reveal'
import { API_URL, RAZORPAY_KEY_ID } from '../config/api'
import { useAuth } from '../context/AuthContext'

export default function PayCustomQuote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const authToken = token || localStorage.getItem('lilycharm_token') || ''

  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  const fetchQuoteSummary = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/custom-requests/${id}/public-summary`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'We could not find this custom price quote.')
      }
      const data = await res.json()
      setQuote(data)
      if (data.status === 'Paid & Order Placed' || data.status === 'Paid & Confirmed') {
        setConfirmedOrder({ orderNumber: data.convertedOrderId || 'Confirmed' })
      }
    } catch (err) {
      console.error('Error loading custom quote:', err)
      setError(err.message || 'Unable to load custom quote. Please check your link.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuoteSummary()
  }, [id])

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePayQuote = async () => {
    if (!quote || processing) return
    setProcessing(true)

    try {
      const isLoaded = await loadRazorpayScript()
      if (!isLoaded) {
        alert('Unable to load secure payment screen. Please check your internet connection and try again.')
        setProcessing(false)
        return
      }

      // 1. Fetch Server-Side Razorpay Order for this specific Custom Quote
      const rzpRes = await fetch(`${API_URL}/custom-requests/${id}/create-razorpay-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })

      if (!rzpRes.ok) {
        const errData = await rzpRes.json().catch(() => ({}))
        alert(errData.message || 'Unable to start payment for this quote. Please try again.')
        setProcessing(false)
        return
      }

      const rzpData = await rzpRes.json()
      const razorpayOrderId = rzpData.id || rzpData.order_id
      const razorpayKey = rzpData.key_id || RAZORPAY_KEY_ID

      if (!razorpayOrderId) {
        alert('Unable to initialize payment session. Please try again.')
        setProcessing(false)
        return
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: razorpayKey,
        amount: rzpData.amount,
        currency: rzpData.currency || 'INR',
        name: 'Lily Charm Flower Studio',
        description: `Custom Artwork Quote #${quote.id.slice(-6)}`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || quote.name || '',
          email: user?.email || quote.email || '',
          contact: user?.phone || quote.phone || '',
        },
        theme: {
          color: '#2B3925',
        },
        handler: async function (response) {
          setProcessing(true)
          try {
            const verifyRes = await fetch(`${API_URL}/custom-requests/${id}/accept`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success !== false) {
              setConfirmedOrder(verifyData.order || { orderNumber: quote.id })
              setQuote((prev) => ({ ...prev, status: 'Paid & Order Placed' }))
            } else {
              alert(
                verifyData.message ||
                  'Payment was received, but order confirmation is taking a moment. Please check your email.'
              )
              fetchQuoteSummary()
            }
          } catch (verifyErr) {
            console.error('Custom quote verification error:', verifyErr)
            alert('Connection interrupted. Please refresh to verify your order confirmation.')
            fetchQuoteSummary()
          } finally {
            setProcessing(false)
          }
        },
        modal: {
          ondismiss: function () {
            setProcessing(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        console.error('Razorpay custom quote payment failed:', response.error)
        alert(
          response.error?.description ||
            response.error?.reason ||
            'Payment could not be completed. Please try again.'
        )
        setProcessing(false)
      })

      rzp.open()
    } catch (err) {
      console.error('Payment launch error:', err)
      alert('Something went wrong launching payment. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 space-y-4">
        <div className="w-12 h-12 border-3 border-[var(--color-line)] border-t-[var(--color-primary)] rounded-full animate-spin" />
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">
          Retrieving Custom Quote Details...
        </p>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center mx-auto border border-rose-300">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-bold font-[var(--font-display)] uppercase">Quote Not Found</h1>
        <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
          {error || 'This custom price quote link may have expired or is invalid.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={fetchQuoteSummary}
            className="btn-outline px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} /> Retry
          </button>
          <Link
            to="/shop"
            className="btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            Explore Ready Artwork
          </Link>
        </div>
      </div>
    )
  }

  const isAlreadyPaid =
    quote.status === 'Paid & Order Placed' ||
    quote.status === 'Paid & Confirmed' ||
    Boolean(confirmedOrder)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 md:pt-28 pb-16 space-y-6 sm:space-y-8">
      <Reveal>
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-[0.68rem] font-bold uppercase tracking-widest rounded-full">
            <Sparkles size={12} /> Custom Botanical Design Quote
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)] uppercase tracking-tight">
            {isAlreadyPaid ? 'Custom Order Confirmed' : 'Review & Pay Custom Quote'}
          </h1>
          <p className="text-xs text-[var(--color-ink-soft)] max-w-lg mx-auto">
            {isAlreadyPaid
              ? 'Your bespoke floral artwork quote has been accepted and paid. Our lead artisan is preparing your piece!'
              : `Handcrafted quote prepared by lead artisan Keerthana Bapu for ${quote.name}.`}
          </p>
        </div>
      </Reveal>

      {/* SUCCESS CARD IF ALREADY PAID */}
      {isAlreadyPaid ? (
        <Reveal>
          <div className="border border-emerald-300 bg-emerald-50/50 p-6 sm:p-8 rounded-2xl text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] text-emerald-950 uppercase">
                Payment Successful!
              </h2>
              <p className="text-xs text-emerald-900">
                Official Order Reference:{' '}
                <strong className="font-mono">{quote.convertedOrderId || confirmedOrder?.orderNumber || 'LC-CQ-CONFIRMED'}</strong>
              </p>
            </div>
            <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
              A confirmation receipt and tax invoice have been dispatched to{' '}
              <strong className="font-mono text-emerald-950">{quote.email}</strong>.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/dashboard"
                className="btn-primary px-6 py-3 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"
              >
                <Package size={15} /> View in My Orders & Dashboard
              </Link>
              <Link
                to="/shop"
                className="btn-outline px-6 py-3 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2"
              >
                Continue Browsing Artwork
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        /* QUOTE REVIEW & PAYMENT CARD */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Artwork Thumbnail & Concept Details */}
          <div className="md:col-span-1 border border-[var(--color-line)] bg-[var(--color-card-bg)] p-4 sm:p-5 rounded-2xl space-y-4 shadow-sm self-start">
            <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-primary)] uppercase flex items-center gap-1">
              <Sparkles size={12} /> Design Reference
            </span>
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-[var(--color-bg)] border border-[var(--color-line)] flex items-center justify-center">
              {quote.image || (quote.images && quote.images[0]) ? (
                <img
                  src={quote.image || quote.images[0]}
                  alt={quote.stylePreference}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4 text-xs text-[var(--color-ink-soft)]">
                  <div className="text-3xl mb-1">🌸</div>
                  <p className="font-bold">Bespoke Floral Concept</p>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm font-[var(--font-display)]">{quote.stylePreference}</h3>
              {quote.notes && (
                <p className="text-xs text-[var(--color-ink-soft)] italic mt-1 bg-[var(--color-bg)] p-2.5 rounded border border-[var(--color-line)]">
                  "{quote.notes}"
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Financial Breakdown, Artisan Note & Checkout */}
          <div className="md:col-span-2 border border-[var(--color-line)] bg-[var(--color-card-bg)] p-5 sm:p-7 rounded-2xl space-y-5 shadow-sm">
            <div className="border-b border-[var(--color-line)] pb-4 space-y-1">
              <span className="eyebrow text-[0.65rem] font-bold text-[var(--color-ink-soft)] uppercase">
                Artisan Price Quote
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[var(--color-primary)]">
                  {formatPrice(quote.totalAmount || quote.quotedPrice)}
                </span>
                <span className="text-[0.68rem] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  Ready for Payment
                </span>
              </div>
            </div>

            {/* Artisan Studio Note */}
            {quote.adminNotes && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <span className="text-[0.65rem] font-bold text-amber-900 uppercase flex items-center gap-1 font-mono">
                  ✨ Artisan Note from Keerthana Bapu:
                </span>
                <p className="text-xs text-amber-950 italic leading-relaxed">{quote.adminNotes}</p>
              </div>
            )}

            {/* Financial Breakdown Table */}
            <div className="space-y-2 text-xs font-mono border-b border-[var(--color-line)] pb-4">
              <div className="flex justify-between text-[var(--color-ink-soft)]">
                <span>Handcrafted Artwork Price:</span>
                <span className="font-bold text-[var(--color-ink)]">{formatPrice(quote.quotedPrice)}</span>
              </div>
              <div className="flex justify-between text-[var(--color-ink-soft)]">
                <span>Standard Studio Shipping:</span>
                <span className="font-bold text-[var(--color-ink)]">
                  {quote.shippingCharge > 0 ? (
                    formatPrice(quote.shippingCharge)
                  ) : (
                    <span className="text-emerald-800 font-bold">✨ FREE Shipping</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[var(--color-primary)] pt-2 border-t border-dashed border-[var(--color-line)]">
                <span>Total Amount Due:</span>
                <span>{formatPrice(quote.totalAmount || quote.quotedPrice)}</span>
              </div>
            </div>

            {/* Delivery Address Preview */}
            <div className="p-3.5 bg-[var(--color-bg)] border border-[var(--color-line)] rounded-xl space-y-1.5 text-xs">
              <span className="eyebrow text-[0.62rem] font-bold text-[var(--color-ink-soft)] uppercase flex items-center gap-1">
                <MapPin size={12} /> Delivery Address
              </span>
              <p className="font-bold">{quote.name}</p>
              <p className="text-[var(--color-ink-soft)]">
                {quote.address}, {quote.city} - {quote.pincode}
              </p>
              <p className="text-[var(--color-primary)] font-mono text-[0.68rem]">{quote.phone || quote.email}</p>
            </div>

            {/* Pay Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handlePayQuote}
                disabled={processing}
                className="btn-primary w-full py-3.5 text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>Pay {formatPrice(quote.totalAmount || quote.quotedPrice)} Securely via Razorpay</span>
                  </>
                )}
              </button>

              <p className="text-[0.65rem] text-center text-[var(--color-ink-soft)] font-mono flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-emerald-700" /> 256-Bit Encrypted Secure UPI / Cards / NetBanking
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
