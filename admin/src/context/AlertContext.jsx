import { createContext, useContext, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const AlertContext = createContext()

export function AlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
    confirmText: 'Understood',
    onConfirm: null,
  })

  const showAlert = (options) => {
    if (typeof options === 'string') {
      const isSuccess = options.includes('✨') || options.includes('🎉') || options.toLowerCase().includes('success') || options.toLowerCase().includes('created') || options.toLowerCase().includes('updated')
      const isError = options.toLowerCase().includes('failed') || options.toLowerCase().includes('error') || options.toLowerCase().includes('invalid') || options.includes('⚠️')
      setAlertConfig({
        isOpen: true,
        title: isSuccess ? 'Studio Notification' : isError ? 'Studio Alert' : 'Studio Notice',
        message: options,
        type: isSuccess ? 'success' : isError ? 'error' : 'info',
        confirmText: 'Understood',
        onConfirm: null,
      })
    } else {
      setAlertConfig({
        isOpen: true,
        title: options.title || 'Studio Notice',
        message: options.message || '',
        type: options.type || 'info',
        confirmText: options.confirmText || 'Understood',
        onConfirm: options.onConfirm || null,
      })
    }
  }

  const closeAlert = () => {
    if (alertConfig.onConfirm) {
      try {
        alertConfig.onConfirm()
      } catch (e) {
        console.error(e)
      }
    }
    setAlertConfig((prev) => ({ ...prev, isOpen: false }))
  }

  // Intercept native alert
  useEffect(() => {
    const originalAlert = window.alert
    window.alert = (msg) => {
      showAlert(msg)
    }
    return () => {
      window.alert = originalAlert
    }
  }, [])

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert }}>
      {children}

      {/* Admin Custom Alert Modal */}
      <AnimatePresence>
        {alertConfig.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--color-bg)] border-2 border-[var(--color-line)] p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-5 text-[var(--color-ink)]"
            >
              <button
                onClick={closeAlert}
                className="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] transition-colors p-1"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 border-b border-[var(--color-line)] pb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                    alertConfig.type === 'success'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : alertConfig.type === 'error'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : alertConfig.type === 'warning'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-[#2D3926]/10 text-[var(--color-primary)] border-[var(--color-line)]'
                  }`}
                >
                  {alertConfig.type === 'success' && <Sparkles size={20} />}
                  {alertConfig.type === 'error' && <AlertCircle size={20} />}
                  {alertConfig.type === 'warning' && <AlertTriangle size={20} />}
                  {alertConfig.type === 'info' && <Info size={20} />}
                </div>

                <div>
                  <div className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-[var(--color-ink-soft)] font-mono">
                    Lily Charm Admin Manager
                  </div>
                  <h3 className="font-bold text-base font-[var(--font-display)] uppercase">
                    {alertConfig.title}
                  </h3>
                </div>
              </div>

              <div className="text-xs md:text-sm leading-relaxed text-[var(--color-ink)] font-medium">
                {alertConfig.message}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={closeAlert}
                  autoFocus
                  className="btn-primary w-full sm:w-auto text-center px-6 py-2.5 font-bold uppercase tracking-widest text-[0.72rem] shadow-sm hover:shadow transition-all"
                >
                  {alertConfig.confirmText}
                </button>
              </div>
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
