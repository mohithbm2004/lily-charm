import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, RefreshCw, Sparkles, CheckCircle2, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function OtpModal({ isOpen, onClose, email, onVerified }) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // 5-minute expiry timer (300 seconds)
  const [timeLeft, setTimeLeft] = useState(300)
  // 60-second resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(60)

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ]

  useEffect(() => {
    if (!isOpen) return
    setTimeLeft(300)
    setResendCooldown(60)

    if (devOtp && String(devOtp).length === 6) {
      setOtpDigits(String(devOtp).split(''))
    } else {
      setOtpDigits(['', '', '', '', '', ''])
    }

    setErrorMessage('')
    setSuccessMessage('')

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    const resendTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      clearInterval(timer)
      clearInterval(resendTimer)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRefs[0].current) {
      setTimeout(() => inputRefs[0].current?.focus(), 100)
    }
  }, [isOpen])

  const handleDigitChange = (index, value) => {
    if (/[^0-9]/.test(value)) return

    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)
    setErrorMessage('')

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus()
    }

    // Auto submit when 6 digits are entered
    if (newDigits.every((d) => d !== '')) {
      handleVerify(newDigits.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^[0-9]{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setOtpDigits(digits)
      handleVerify(pastedData)
    }
  }

  const handleVerify = async (fullOtpCode) => {
    const code = fullOtpCode || otpDigits.join('')
    if (code.length !== 6) {
      setErrorMessage('Please enter complete 6-digit OTP code.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMessage('🎉 Account verified successfully!')
        setTimeout(() => {
          onVerified(data.user, data.token)
          onClose()
        }, 1000)
      } else {
        setErrorMessage(data.message || 'Verification failed. Invalid OTP.')
      }
    } catch (err) {
      console.error('OTP Verify error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setIsResending(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMessage('✉️ A new 6-digit OTP code has been sent!')
        setTimeLeft(300)
        setResendCooldown(60)
        setOtpDigits(['', '', '', '', '', ''])
        setTimeout(() => inputRefs[0].current?.focus(), 100)
      } else {
        setErrorMessage(data.message || 'Failed to resend OTP.')
      }
    } catch (err) {
      console.error('Resend OTP error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const formatMinutes = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="border border-[var(--color-line)] bg-[var(--color-bg)] p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl relative text-[var(--color-ink)] text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors p-1"
          >
            <X size={20} />
          </button>

          <div className="w-14 h-14 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center mx-auto border border-amber-300">
            <ShieldCheck size={30} />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-[var(--font-display)] uppercase">Email OTP Verification</h2>
            <p className="text-xs text-[var(--color-ink-soft)]">
              We sent a 6-digit security verification code to:
            </p>
            <p className="text-xs font-mono font-bold text-[var(--color-primary)]">{email}</p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded">
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 rounded">
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}

          {/* 6 Digit Inputs */}
          <div className="flex justify-center gap-2 md:gap-3 py-2" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 md:w-12 md:h-14 border-2 border-[var(--color-line)] focus:border-[var(--color-primary)] text-center text-xl font-mono font-bold bg-[var(--color-card-bg)] focus:outline-none rounded transition-colors"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--color-ink-soft)] px-2 font-mono">
            <span className="flex items-center gap-1">
              <Clock size={13} /> Code Expires: <strong className={timeLeft < 60 ? 'text-rose-600' : 'text-amber-800'}>{formatMinutes(timeLeft)}</strong>
            </span>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-[var(--color-primary)] font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={isVerifying || otpDigits.some((d) => !d)}
            className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-[0.7rem] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Sparkles size={14} className="animate-spin" /> Verifying Code...
              </>
            ) : (
              'Verify & Activate Account'
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
