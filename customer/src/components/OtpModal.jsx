import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, RefreshCw, Sparkles, CheckCircle2, Clock } from 'lucide-react'
import { API_URL } from '../config/api'
import { useScrollLock } from '../lib/useScrollLock'

export default function OtpModal({ isOpen, onClose, email, onVerified }) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useScrollLock(isOpen)

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
    setOtpDigits(['', '', '', '', '', ''])
    setErrorMessage('')
    setSuccessMessage('')

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    const resendTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    setTimeout(() => inputRefs[0]?.current?.focus(), 100)

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
      setErrorMessage('Please enter the complete 6-digit verification code.')
      return
    }

    setIsVerifying(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        setSuccessMessage('Email verified successfully!')
        if (onVerified) onVerified(data)
        setTimeout(() => {
          onClose()
        }, 800)
      } else if (res.status === 400) {
        setErrorMessage(data.message || 'Invalid verification code. Please try again.')
        setOtpDigits(['', '', '', '', '', ''])
        inputRefs[0].current?.focus()
      } else if (res.status === 429) {
        setErrorMessage(data.message || 'Too many attempts. Please try again later.')
      } else if (res.status >= 500) {
        setErrorMessage('Something went wrong on the server. Please try again.')
      } else {
        setErrorMessage(data.message || 'Invalid verification code. Please try again.')
        setOtpDigits(['', '', '', '', '', ''])
        inputRefs[0].current?.focus()
      }
    } catch (err) {
      console.error('OTP verify network error:', err)
      setErrorMessage('Unable to connect to the server. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return
    setIsResending(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        setSuccessMessage('A new 6-digit verification code has been sent to your email.')
        setResendCooldown(60)
        setTimeLeft(300)
        setOtpDigits(['', '', '', '', '', ''])
        inputRefs[0].current?.focus()
      } else if (res.status === 429) {
        setErrorMessage(data.message || 'Please wait before requesting another code.')
      } else if (res.status >= 500) {
        setErrorMessage('Something went wrong on the server. Please try again.')
      } else {
        setErrorMessage(data.message || 'Failed to resend verification code.')
      }
    } catch (err) {
      console.error('Resend OTP network error:', err)
      setErrorMessage('Unable to connect to the server. Please try again.')
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
      <div className="fixed inset-0 bg-black/80 z-[1200] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="border border-[var(--color-line)] bg-[var(--color-bg)] rounded-3xl p-4 sm:p-6 md:p-8 max-w-md w-full space-y-4 sm:space-y-6 shadow-2xl relative text-[var(--color-ink)] text-center max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors p-1.5 rounded-full hover:bg-black/5"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center mx-auto border border-amber-300">
            <ShieldCheck size={26} className="sm:w-7 sm:h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] uppercase">Email Verification</h2>
            <p className="text-xs text-[var(--color-ink-soft)]">
              We sent a 6-digit security verification code to:
            </p>
            <p className="text-xs font-mono font-bold text-[var(--color-primary)] break-all">{email}</p>
          </div>

          {errorMessage && (
            <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 sm:p-3 bg-[#212B1C]/10 border border-[#212B1C]/20 text-[#212B1C] text-xs font-bold flex items-center justify-center gap-2 rounded">
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}

          {/* 6 Digit Inputs — Fully Fluid for 320px screens */}
          <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 py-1 sm:py-2" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-9 h-11 xs:w-10 xs:h-12 sm:w-11 sm:h-13 md:w-12 md:h-14 border-2 border-[var(--color-line)] focus:border-[var(--color-primary)] text-center text-lg sm:text-xl font-mono font-bold bg-[var(--color-card-bg)] focus:outline-none rounded transition-colors"
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-soft)] px-1 font-mono gap-2">
            <span className="flex items-center gap-1">
              <Clock size={12} /> Code Expires: <strong className={timeLeft < 60 ? 'text-rose-600' : 'text-amber-800'}>{formatMinutes(timeLeft)}</strong>
            </span>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-[var(--color-primary)] font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              <RefreshCw size={11} className={isResending ? 'animate-spin' : ''} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
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
