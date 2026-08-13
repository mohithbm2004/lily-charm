import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Lock, Mail, KeyRound, Sparkles, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { API_URL } from '../config/api'

export default function AdminSetup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('keerthanabm@lilycharm.in')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupKey, setSetupKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`${API_URL}/admin/auth/setup-status`)
        const data = await res.json()
        if (res.ok && data.success) {
          setIsInitialized(data.isInitialized)
          if (data.email) setEmail(data.email)
        }
      } catch (err) {
        console.error('Setup status check failed:', err)
      } finally {
        setCheckingStatus(false)
      }
    }
    checkStatus()
  }, [])

  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    const errs = {}
    if (!email?.trim()) errs.email = 'Admin email is required.'
    if (!password) {
      errs.password = 'New password is required.'
    } else if (password.length < 12) {
      errs.password = 'Password must be at least 12 characters long.'
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.'
    } else if (password && password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/admin/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword, setupKey }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Setup failed.')
      }

      setSuccessMsg(data.message || 'Admin account password setup completed successfully!')
      setTimeout(() => {
        navigate('/admin/login', { replace: true, state: { successMsg: 'Initial setup completed! Please sign in with your new admin password.' } })
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-[var(--color-bg,#FAF7F2)] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-[var(--color-card-bg,#FFF)] border border-[var(--color-line,#E5DFD5)] px-6 py-4 rounded-3xl shadow-lg animate-pulse text-xs font-bold uppercase">
          <Sparkles className="animate-spin text-[var(--color-primary,#2D402B)]" size={18} />
          Checking Admin Account Status...
        </div>
      </div>
    )
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
            Initial Admin Setup
          </h1>
          <p className="text-xs text-[var(--color-ink-soft,#666)]">
            Configure initial credentials for your Lily Charm studio administrator.
          </p>
        </div>

        {/* Rule 15: Already Initialized Alert */}
        {isInitialized ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs space-y-2">
              <AlertTriangle size={24} className="mx-auto text-amber-700" />
              <p className="font-bold text-sm uppercase">Admin Setup Already Completed</p>
              <p className="text-[0.72rem]">
                The administrator account for <strong>{email}</strong> has already been initialized. For security reasons, initial setup cannot be run again.
              </p>
            </div>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[var(--color-primary,#2D402B)] text-white rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md"
            >
              Go to Admin Login <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          /* Setup Form */
          <>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-700" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-2xl flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-700" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1">
                  Admin Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft,#666)]" />
                  <input
                    type="email"
                    required
                    aria-required="true"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                    }}
                    placeholder="keerthanabm@lilycharm.in"
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 font-semibold focus:outline-none transition-colors ${
                      fieldErrors.email
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] focus:border-[var(--color-primary,#2D402B)]'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                    ⚠️ {fieldErrors.email}
                  </p>
                )}
              </div>

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
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    placeholder="At least 12 chars (Upper, Lower, Number, Special)"
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 font-mono text-xs focus:outline-none transition-colors ${
                      fieldErrors.password
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] focus:border-[var(--color-primary,#2D402B)]'
                    }`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                    ⚠️ {fieldErrors.password}
                  </p>
                )}
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
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                    }}
                    placeholder="Repeat new admin password"
                    className={`w-full border rounded-xl pl-10 pr-4 py-3 font-mono text-xs focus:outline-none transition-colors ${
                      fieldErrors.confirmPassword
                        ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                        : 'border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] focus:border-[var(--color-primary,#2D402B)]'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                    ⚠️ {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider mb-1">Setup Key (Optional)</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft,#666)]" />
                  <input
                    type="password"
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    placeholder="Optional authorization key if configured"
                    className="w-full border border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] rounded-xl pl-10 pr-4 py-3 font-mono text-xs focus:outline-none focus:border-[var(--color-primary,#2D402B)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[var(--color-primary,#2D402B)] text-white rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <Sparkles size={14} className="animate-spin" /> Saving Password...
                  </>
                ) : (
                  <>
                    Initialize Admin Account <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <Link to="/admin/login" className="text-xs text-[var(--color-primary,#2D402B)] font-bold hover:underline">
                Already initialized? Back to Admin Login
              </Link>
            </div>
          </>
        )}

        {/* Footer Security Badges */}
        <div className="pt-4 border-t border-[var(--color-line,#E5DFD5)] text-center text-[0.65rem] text-[var(--color-ink-soft,#666)] space-y-1">
          <p className="font-mono">🔒 Protected Studio Security • Admin Access</p>
          <p>© 2026 Lily Charm Studio. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  )
}
