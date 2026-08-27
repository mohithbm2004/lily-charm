import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useScrollLock } from '../lib/useScrollLock'

const AlertContext = createContext()

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    isConfirm: false,
    title: '',
    message: '',
    disclaimer: '',
    details: null, // { label, value, color }[]
    type: 'success', // 'success' | 'error' | 'info' | 'warning'
    confirmText: 'Understood',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
  })

  useScrollLock(alertConfig.isOpen)

  const showAlert = useCallback((options) => {
    if (typeof options === 'string') {
      const isSuccess = options.toLowerCase().includes('success') || options.toLowerCase().includes('confirmed')
      const isError = options.toLowerCase().includes('failed') || options.toLowerCase().includes('error') || options.toLowerCase().includes('invalid')
      setAlertConfig({
        isOpen: true,
        isConfirm: false,
        title: isSuccess ? 'Notification' : isError ? 'Attention' : 'Lily Charm Notice',
        message: options,
        disclaimer: '',
        details: null,
        type: isSuccess ? 'success' : isError ? 'error' : 'info',
        confirmText: 'Understood',
        cancelText: 'Cancel',
        onConfirm: null,
        onCancel: null,
      })
    } else {
      setAlertConfig({
        isOpen: true,
        isConfirm: false,
        title: options.title || (options.type === 'error' ? 'Attention' : 'Lily Charm Notice'),
        message: options.message || '',
        disclaimer: options.disclaimer || '',
        details: options.details || null,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Understood',
        cancelText: 'Cancel',
        onConfirm: options.onConfirm || null,
        onCancel: null,
      })
    }
  }, [])

  const showConfirm = useCallback(({
    title = 'Please Confirm',
    message = '',
    disclaimer = '',
    details = null,
    type = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Keep Order',
    onConfirm = null,
    onCancel = null,
  }) => {
    setAlertConfig({
      isOpen: true,
      isConfirm: true,
      title,
      message,
      disclaimer,
      details,
      type,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    })
  }, [])

  const handleConfirm = () => {
    if (alertConfig.onConfirm) {
      try {
        alertConfig.onConfirm()
      } catch (e) {
        console.error(e)
      }
    }
    setAlertConfig((prev) => ({ ...prev, isOpen: false }))
  }

  const handleCancel = useCallback(() => {
    if (alertConfig.onCancel) {
      try {
        alertConfig.onCancel()
      } catch (e) {
        console.error(e)
      }
    }
    setAlertConfig((prev) => ({ ...prev, isOpen: false }))
  }, [alertConfig.onCancel])

  // Intercept native window.alert to automatically render the custom alert modal
  useEffect(() => {
    const originalAlert = window.alert
    window.alert = (msg) => {
      showAlert(msg)
    }
    return () => {
      window.alert = originalAlert
    }
  }, [showAlert])

  const [toast, setToast] = useState(null)

  const showToast = useCallback((options) => {
    const toastData = typeof options === 'string'
      ? { title: 'Added to Cart', message: options }
      : {
          title: options.title || 'Added to Cart',
          message: options.message || '',
          image: options.image || null,
        }
    setToast(toastData)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const alertContextValue = useMemo(() => ({
    showAlert,
    showConfirm,
    showToast,
    closeAlert: handleCancel,
  }), [showAlert, showConfirm, showToast, handleCancel])

  return (
    <AlertContext.Provider value={alertContextValue}>
      {children}

      {/* Luxury Custom Lily Charm Alert / Confirmation Modal */}
      <AnimatePresence>
        {alertConfig.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/65 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--color-bg)] border-2 border-[var(--color-line)] p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-5 text-[var(--color-ink)] my-auto"
            >
              {/* Close X */}
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] transition-colors p-1"
              >
                <X size={18} />
              </button>

              {/* Header Icon + Title */}
              <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    alertConfig.type === 'success'
                      ? 'bg-[#212B1C]/10 text-[#212B1C] border-[#212B1C]/20'
                      : alertConfig.type === 'error'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : alertConfig.type === 'warning'
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-[#212B1C]/10 text-[#212B1C] border-[var(--color-line)]'
                  }`}
                >
                  {alertConfig.type === 'success' && <Sparkles size={20} />}
                  {alertConfig.type === 'error' && <AlertCircle size={20} />}
                  {alertConfig.type === 'warning' && <AlertTriangle size={20} />}
                  {alertConfig.type === 'info' && <Info size={20} />}
                </div>

                <div>
                  <div className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-[var(--color-ink-soft)] font-mono">
                    Lily Charm Atelier
                  </div>
                  <h3 className="font-bold text-base font-[var(--font-display)] uppercase">
                    {alertConfig.title}
                  </h3>
                </div>
              </div>

              {/* Main Message Body */}
              <div className="text-xs md:text-sm leading-relaxed text-[var(--color-ink)] font-medium">
                {alertConfig.message}
              </div>

              {/* Optional Structured Breakdown Details Card */}
              {alertConfig.details && Array.isArray(alertConfig.details) && (
                <div className="bg-[var(--color-card-bg)] border border-[var(--color-line)] p-4 space-y-2 text-xs">
                  {alertConfig.details.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between items-center ${
                        item.isTotal ? 'border-t border-[var(--color-line)] pt-2 font-bold text-sm' : ''
                      }`}
                    >
                      <span className={item.isTotal ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-soft)]'}>
                        {item.label}:
                      </span>
                      <span className={`font-mono ${item.color || 'text-[var(--color-ink)] font-bold'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Refund & Cancellation Policy Disclaimer */}
              {alertConfig.disclaimer && (
                <div className="p-3 bg-amber-50/90 border border-amber-300 rounded text-amber-950 text-[0.7rem] leading-relaxed">
                  <p>{alertConfig.disclaimer}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                {alertConfig.isConfirm && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-outline px-5 py-2.5 font-bold uppercase tracking-widest text-[0.68rem] transition-colors"
                  >
                    {alertConfig.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-6 py-2.5 bg-[var(--color-primary)] text-[var(--color-bg)] font-bold uppercase tracking-widest text-[0.72rem] rounded-xl hover:opacity-90 transition-opacity"
                >
                  {alertConfig.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <div className="fixed bottom-6 inset-x-0 z-[9999] pointer-events-none flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto bg-[#212B1C]/95 text-[#FAF7F2] backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-white/15 flex items-center gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md w-auto"
            >
              {toast.image ? (
                <img src={toast.image} alt={toast.message || 'Product'} className="w-7 h-7 object-cover rounded-full shrink-0 shadow-2xs" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check size={13} strokeWidth={2.5} />
                </div>
              )}
              <span className="text-xs font-medium tracking-wide text-[#FAF7F2] truncate min-w-0">
                Added to cart
                {toast.message && (
                  <span className="text-[#D5C29D] font-medium ml-1.5 opacity-90 truncate inline-block max-w-[140px] sm:max-w-[220px] align-bottom">
                    • {toast.message}
                  </span>
                )}
              </span>
              <button
                onClick={() => setToast(null)}
                className="text-[#FAF7F2]/70 hover:text-white ml-1 p-0.5 rounded-full transition-colors cursor-pointer shrink-0"
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  return useContext(AlertContext)
}
