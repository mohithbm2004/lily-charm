import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2, Sparkles, KeyRound, AlertTriangle, ArrowRight, Clock, ShieldCheck, RefreshCw } from 'lucide-react'
import Reveal from '../components/Reveal'
import AuthModal from '../components/AuthModal'
import { API_URL } from '../config/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  // Status states: 'verifying' | 'valid' | 'expired' | 'used' | 'invalid' | 'success'
  const [status, setStatus] = useState('verifying')
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // 1. Validate Token with Backend on Mount
  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setErrorMessage('This password reset link is invalid. Please request a new one.')
      return
    }

    let isMounted = true

    async function verifyToken() {
      setStatus('verifying')
      setErrorMessage('')

      try {
        const res = await fetch(`${API_URL}/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (!isMounted) return

        if (res.ok && data.valid) {
          setStatus('valid')
          setRemainingSeconds(data.remainingSeconds || 300)
        } else {
          if (data.reason === 'used') {
            setStatus('used')
            setErrorMessage(data.message || 'This password reset link has already been used.')
          } else if (data.reason === 'expired') {
            setStatus('expired')
            setErrorMessage(data.message || 'This password reset link has expired. Please request a new one.')
          } else {
            setStatus('invalid')
            setErrorMessage(data.message || 'This password reset link is invalid. Please request a new one.')
          }
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Token verification error:', err)
        setStatus('invalid')
        setErrorMessage('This password reset link is invalid. Please request a new one.')
      }
    }

    verifyToken()

    return () => {
      isMounted = false
    }
  }, [token])

  // 2. Visual 5-Minute Countdown Timer (UX Only; Backend remains authoritative)
  useEffect(() => {
    if (status !== 'valid' || remainingSeconds <= 0) return

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setStatus('expired')
          setErrorMessage('This password reset link has expired. Please request a new one.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status, remainingSeconds])

  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // 3. Handle Password Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const errs = {}
    if (!newPassword) {
      errs.newPassword = 'New password is required.'
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Password must be at least 6 characters long.'
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.'
    } else if (newPassword && newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match!'
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        // Invalidate state locally
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const msg = data.message || 'Unable to reset password. Please request a new link.'
        setErrorMessage(msg)

        if (msg.includes('already been used')) {
          setStatus('used')
        } else if (msg.includes('expired')) {
          setStatus('expired')
        } else if (msg.includes('invalid')) {
          setStatus('invalid')
        }
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setErrorMessage('Something went wrong connecting to the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 pt-24 sm:pt-36 pb-16 sm:pb-24 text-[var(--color-ink)] w-full">
      <Reveal>
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          {/* Top Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <KeyRound size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] uppercase">
              {status === 'success' ? 'Password Reset Complete' : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-[var(--color-ink-soft)]">
              {status === 'success'
                ? 'Your password has been updated securely.'
                : 'Choose a new password for your Lily Charm customer account.'}
            </p>
          </div>

          {/* STATE 1: VERIFYING TOKEN */}
          {status === 'verifying' && (
            <div className="py-10 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin mx-auto text-[var(--color-primary)]" />
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Verifying secure password reset link...
              </p>
            </div>
          )}

          {/* STATE 2: EXPIRED / USED / INVALID TOKEN */}
          {(status === 'expired' || status === 'used' || status === 'invalid') && (
            <div className="space-y-5">
              <div className="p-4 bg-rose-50/80 border border-rose-300 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wide">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                  {status === 'used' ? 'Link Already Used' : status === 'expired' ? 'Link Expired' : 'Invalid Reset Link'}
                </div>
                <p className="text-xs text-rose-800 leading-relaxed font-medium">
                  {errorMessage || (
                    status === 'used'
                      ? 'This password reset link has already been used.'
                      : status === 'expired'
                      ? 'This password reset link has expired. Please request a new one.'
                      : 'This password reset link is invalid. Please request a new one.'
                  )}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-primary w-full py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-full shadow-md hover:shadow-lg transition-all"
                >
                  <KeyRound size={15} /> Request New Reset Link
                </button>

                <Link
                  to="/"
                  className="block text-center text-xs font-bold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:underline uppercase tracking-wider py-1"
                >
                  Return to Storefront
                </Link>
              </div>
            </div>
          )}

          {/* STATE 3: VALID TOKEN — FORM READY */}
          {status === 'valid' && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 5-Minute UX Countdown Badge */}
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950 font-medium">
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock size={14} className="text-amber-700" /> Time Remaining:
                </span>
                <span className="font-mono font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded border border-amber-300">
                  {formatCountdown(remainingSeconds)}
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 font-bold rounded-2xl flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block font-bold uppercase mb-1">
                  New Password <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3.5 text-[var(--color-ink-soft)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    aria-required="true"
                    placeholder="At least 6 characters..."
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: '' }))
                    }}
                    className={`w-full border rounded-xl pl-10 pr-10 py-3 font-mono text-xs transition-colors ${
                      fieldErrors.newPassword
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line)] bg-[var(--color-bg)] focus:border-[var(--color-primary)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-3 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-0.5 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                    {fieldErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase mb-1">
                  Confirm New Password <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3.5 text-[var(--color-ink-soft)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    aria-required="true"
                    placeholder="Re-enter new password..."
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }}
                    className={`w-full border rounded-xl pl-10 pr-10 py-3 font-mono text-xs transition-colors ${
                      fieldErrors.confirmPassword
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line)] bg-[var(--color-bg)] focus:border-[var(--color-primary)]'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3.5 font-bold uppercase tracking-widest text-[0.7rem] flex items-center justify-center gap-2 disabled:opacity-50 mt-4 rounded-full shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={14} className="animate-spin" /> Saving New Password...
                  </>
                ) : (
                  'Save & Reset Password'
                )}
              </button>
            </form>
          )}

          {/* STATE 4: SUCCESS */}
          {status === 'success' && (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-[var(--color-card-bg)] border border-[var(--color-line)] text-[var(--color-ink)] text-xs font-bold rounded-2xl space-y-1 shadow-2xs">
                <div className="flex items-center justify-center gap-1.5 text-sm">
                  <CheckCircle2 size={18} className="text-[var(--color-primary)]" />
                  Password Reset Successfully!
                </div>
                <p className="text-[0.72rem] text-[var(--color-ink-soft)] font-normal">
                  Your new password is now active. You can sign in immediately to access your Lily Charm customer account.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-primary w-full py-3.5 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded-full shadow-md"
                >
                  <ShieldCheck size={16} /> Sign In to Your Account <ArrowRight size={14} />
                </button>

                <Link
                  to="/"
                  className="block text-center text-xs font-bold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:underline uppercase tracking-wider py-1"
                >
                  Return to Storefront
                </Link>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Embedded Auth Modal for Requesting New Reset Link or Immediate Login */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={status === 'success' ? 'login' : 'forgot'}
        onSuccess={() => {
          setIsAuthModalOpen(false)
          navigate('/dashboard')
        }}
      />
    </div>
  )
}
