import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { ShieldCheck, Lock, Sparkles, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function AdminResetPassword() {
  const { resetPassword, error, setError } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const resetToken = location.state?.resetToken || searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!resetToken) {
      setError('Missing password reset token. Please request a new password reset OTP.')
    }
  }, [resetToken, setError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resetToken) {
      setError('Password reset token is missing. Please start over from Forgot Password.')
      return
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters long.')
      return
    }

    setSubmitting(true)
    try {
      const data = await resetPassword(resetToken, newPassword, confirmPassword)
      navigate('/admin/login', {
        replace: true,
        state: { successMsg: data.message || 'Password reset successfully! All existing sessions have been terminated. Please log in with your new password.' },
      })
    } catch (err) {
      // Error handled in context
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg,#FAF7F2)] flex items-center justify-center p-4 sm:p-6 text-[var(--color-ink,#212B1C)]">
      <div className="max-w-md w-full border border-[var(--color-line,#E5DFD5)] bg-[var(--color-card-bg,#FFF)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[var(--color-primary,#2D402B)] text-[#F5E8D0] rounded-full flex items-center justify-center mx-auto border-2 border-[var(--color-primary,#2D402B)] shadow-md">
            <ShieldCheck size={28} />
          </div>
          <span className="eyebrow flex items-center justify-center gap-1.5 text-[var(--color-primary,#2D402B)] font-bold text-xs uppercase tracking-[0.24em] pt-1">
            <Sparkles size={13} /> Lily Charm Studio Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display,'Outfit')] uppercase tracking-tight">
            Reset Admin Password
          </h1>
          <p className="text-xs text-[var(--color-ink-soft,#666)]">
            Create a strong new password for your SUPER_ADMIN account.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider mb-1">
              New Admin Password <span className="text-red-500 font-bold ml-0.5">*</span> (Min 12 Chars)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft,#666)]" />
              <input
                type="password"
                required
                aria-required="true"
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 12 chars (Upper, Lower, Number, Special)"
                className="w-full border border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] rounded-xl pl-10 pr-4 py-3 font-mono text-xs focus:outline-none focus:border-[var(--color-primary,#2D402B)]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider mb-1">
              Confirm New Password <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft,#666)]" />
              <input
                type="password"
                required
                aria-required="true"
                minLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full border border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] rounded-xl pl-10 pr-4 py-3 font-mono text-xs focus:outline-none focus:border-[var(--color-primary,#2D402B)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !resetToken}
            className="w-full py-3.5 bg-[var(--color-primary,#2D402B)] text-white rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <>
                <Sparkles size={14} className="animate-spin" /> Resetting Password...
              </>
            ) : (
              <>
                Confirm & Set New Password <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/admin/login" className="text-xs text-[var(--color-primary,#2D402B)] font-bold hover:underline">
            Back to Admin Login
          </Link>
        </div>

        {/* Footer Security Badges */}
        <div className="pt-4 border-t border-[var(--color-line,#E5DFD5)] text-center text-[0.65rem] text-[var(--color-ink-soft,#666)] space-y-1">
          <p className="font-mono">🔒 Session Invalidation • Bcrypt 12 Rounds</p>
          <p>© 2026 Lily Charm Studio. Authorized Single Admin Access Only.</p>
        </div>
      </div>
    </div>
  )
}
