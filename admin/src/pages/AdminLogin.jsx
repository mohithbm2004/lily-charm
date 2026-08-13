import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { ShieldCheck, Lock, Mail, Sparkles, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function AdminLogin() {
  const { login, error, setError } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/admin/dashboard'
  const successNotice = location.state?.successMsg || ''

  const [email, setEmail] = useState('keerthanabm@lilycharm.in')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!email?.trim()) errs.email = 'Admin email is required.'
    if (!password) errs.password = 'Admin password is required.'

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
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
            Admin Sign In
          </h1>
          <p className="text-xs text-[var(--color-ink-soft,#666)]">
            Secure single-administrator authentication for Keerthana Bapu.
          </p>
        </div>

        {/* Success Notice from Password Reset / Setup */}
        {successNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-700" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
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
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold uppercase tracking-wider">
                Admin Password <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <Link
                to="/admin/forgot-password"
                className="text-[0.68rem] text-[var(--color-primary,#2D402B)] font-bold hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft,#666)]" />
              <input
                type="password"
                required
                aria-required="true"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                }}
                placeholder="••••••••••••••••"
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[var(--color-primary,#2D402B)] text-white rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <>
                <Sparkles size={14} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Sign In to Admin Dashboard <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badges */}
        <div className="pt-4 border-t border-[var(--color-line,#E5DFD5)] text-center text-[0.65rem] text-[var(--color-ink-soft,#666)] space-y-1">
          <p className="font-mono">🔒 HttpOnly Session Cookies • 30-Min Inactivity Timeout</p>
          <p>© 2026 Lily Charm Studio. Authorized Single Admin Access Only.</p>
        </div>
      </div>
    </div>
  )
}
