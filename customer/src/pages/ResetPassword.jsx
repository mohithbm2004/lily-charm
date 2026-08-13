import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2, Sparkles, KeyRound } from 'lucide-react'
import Reveal from '../components/Reveal'
import { API_URL } from '../config/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid password reset link. Token missing.')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

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
        setSuccessMessage('🎉 Password reset successfully! Redirecting to studio...')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      } else {
        setErrorMessage(data.message || 'Password reset failed.')
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setErrorMessage('Connection error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 pt-24 sm:pt-36 pb-16 sm:pb-24 text-[var(--color-ink)] w-full max-w-full">
      <Reveal>
        <div className="border border-[var(--color-line)] bg-[var(--color-card-bg)] rounded-3xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center mx-auto">
              <KeyRound size={24} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] uppercase">Set New Password</h1>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Enter your new strong password to update your customer account.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-2xl">
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 rounded-2xl">
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                  ⚠️ {fieldErrors.newPassword}
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
                  ⚠️ {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-[0.7rem] flex items-center justify-center gap-2 disabled:opacity-50 mt-4 rounded-full"
            >
              {isSubmitting ? (
                <>
                  <Sparkles size={14} className="animate-spin" /> Resetting Password...
                </>
              ) : (
                'Update & Reset Password'
              )}
            </button>
          </form>
        </div>
      </Reveal>
    </div>
  )
}
