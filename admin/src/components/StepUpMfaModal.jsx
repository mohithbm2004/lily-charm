import { useState } from 'react'
import { ShieldCheck, Lock, X, AlertTriangle, Sparkles } from 'lucide-react'

export default function StepUpMfaModal({ isOpen, onClose, onConfirm, title, actionMessage }) {
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mfaCode.trim().length !== 6) {
      setError('Please enter the 6-digit MFA code from your Authenticator app.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      await onConfirm(mfaCode.trim())
      setMfaCode('')
      onClose()
    } catch (err) {
      setError(err.message || 'MFA code verification failed. Action blocked.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-bg,#FAF7F2)] border border-[var(--color-line,#E5DFD5)] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5 text-[var(--color-ink,#212B1C)]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[var(--color-ink-soft,#666)] hover:text-black rounded-full hover:bg-black/5"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className="w-14 h-14 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center mx-auto border border-amber-300">
          <ShieldCheck size={28} />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold uppercase font-[var(--font-display,'Outfit')]">
            {title || 'Step-Up MFA Re-Authentication'}
          </h2>
          <p className="text-xs text-[var(--color-ink-soft,#666)] leading-relaxed">
            {actionMessage || 'This sensitive administrative action requires 6-digit TOTP MFA verification.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-rose-700" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-center">
              Enter 6-Digit Authenticator Code
            </label>
            <div className="relative max-w-xs mx-auto">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-[var(--color-ink-soft,#666)]" />
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full border border-[var(--color-line,#E5DFD5)] bg-[var(--color-card-bg,#FFF)] rounded-xl pl-10 pr-4 py-3 text-center text-lg font-mono font-bold tracking-[0.3em] focus:outline-none focus:border-[var(--color-primary,#2D402B)] shadow-inner"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-[var(--color-line,#E5DFD5)] bg-[var(--color-card-bg,#FFF)] rounded-full text-xs uppercase font-bold tracking-wider hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || mfaCode.length !== 6}
              className="flex-1 py-3 bg-[var(--color-primary,#2D402B)] text-white rounded-full text-xs uppercase font-bold tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
            >
              {submitting ? (
                <>
                  <Sparkles size={14} className="animate-spin" /> Verifying...
                </>
              ) : (
                'Confirm Action'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
