import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { ShieldCheck, Mail, KeyRound, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function AdminForgotPassword() {
  const { requestForgotPassword, verifyForgotPasswordOtp, error, setError } = useAdminAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // Step 1: Request Email, Step 2: Enter OTP
  const [email, setEmail] = useState('keerthanabm@lilycharm.in')
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    let timer
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [cooldown])

  const handleStep1Submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfoMsg('')

    if (!email) {
      setError('Please enter admin email address.')
      return
    }

    setSubmitting(true)
    try {
      const data = await requestForgotPassword(email)
      setInfoMsg(data.message || 'If the account is eligible, a 6-digit verification code has been sent.')
      setStep(2)
      setCooldown(60)
    } catch (err) {
      // Error handled in context
    } finally {
      setSubmitting(false)
    }
  }

  const handleStep2Submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code sent to your email.')
      return
    }

    setSubmitting(true)
    try {
      const data = await verifyForgotPasswordOtp(email, otp.trim())
      if (data.success && data.resetToken) {
        navigate('/admin/reset-password', {
          replace: true,
          state: { resetToken: data.resetToken, email },
        })
      }
    } catch (err) {
      // Error handled in context
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    if (cooldown > 0) return
    setError('')
    setSubmitting(true)
    try {
      const data = await requestForgotPassword(email)
      setInfoMsg(data.message || 'A new 6-digit OTP code has been sent to your email.')
      setCooldown(60)
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
            {step === 1 ? 'Forgot Password' : 'Enter Verification Code'}
          </h1>
          <p className="text-xs text-[var(--color-ink-soft,#666)]">
            {step === 1
              ? 'Request a verification code to reset your admin password.'
              : `Enter the verification code sent to ${email}.`}
          </p>
        </div>

        {/* Informational Banner */}
        {infoMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-700" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4 text-xs">
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="keerthanabm@lilycharm.in"
                  className="w-full border border-[var(--color-line,#E5DFD5)] bg-[var(--color-bg,#FAF7F2)] rounded-xl pl-10 pr-4 py-3 font-semibold focus:outline-none focus:border-[var(--color-primary,#2D402B)]"
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
                  <Sparkles size={14} className="animate-spin" /> Sending Verification Code...
                </>
              ) : (
                <>
                  Send Verification Code <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Enter 6-Digit OTP */
          <form onSubmit={handleStep2Submit} className="space-y-5 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider mb-2 text-center text-xs">
                Enter 6-Digit Verification Code <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative max-w-xs mx-auto">
                <KeyRound size={18} className="absolute left-3.5 top-3.5 text-[var(--color-primary,#2D402B)]" />
                <input
                  type="text"
                  required
                  aria-required="true"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full border-2 border-[var(--color-primary,#2D402B)] bg-[var(--color-bg,#FAF7F2)] rounded-xl pl-10 pr-4 py-3 text-center text-xl font-mono font-bold tracking-[0.3em] focus:outline-none shadow-inner"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || otp.length !== 6}
              className="w-full py-3.5 bg-[var(--color-primary,#2D402B)] text-white rounded-full font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Sparkles size={14} className="animate-spin" /> Verifying Code...
                </>
              ) : (
                'Verify Code & Proceed to Password Reset'
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-[0.7rem]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[var(--color-ink-soft,#666)] hover:underline flex items-center gap-1 font-semibold"
              >
                <ArrowLeft size={13} /> Change Email
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldown > 0 || submitting}
                className="text-[var(--color-primary,#2D402B)] font-bold hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Verification Code'}
              </button>
            </div>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center pt-2">
          <Link to="/admin/login" className="text-xs text-[var(--color-primary,#2D402B)] font-bold hover:underline">
            Back to Admin Login
          </Link>
        </div>

        {/* Footer Security Badges */}
        <div className="pt-4 border-t border-[var(--color-line,#E5DFD5)] text-center text-[0.65rem] text-[var(--color-ink-soft,#666)] space-y-1">
          <p className="font-mono">🔒 Secure Verification • 10-Min Code Expiration</p>
          <p>© 2026 Lily Charm Studio. Authorized Single Admin Access Only.</p>
        </div>
      </div>
    </div>
  )
}
