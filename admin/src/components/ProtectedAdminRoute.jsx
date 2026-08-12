import { Navigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { Sparkles } from 'lucide-react'

export default function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, loading } = useAdminAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg,#FAF7F2)] flex flex-col items-center justify-center p-6 text-[var(--color-ink,#212B1C)]">
        <div className="flex items-center gap-3 bg-[var(--color-card-bg,#FFF)] border border-[var(--color-line,#E5DFD5)] px-6 py-4 rounded-3xl shadow-xl animate-pulse">
          <Sparkles size={20} className="text-[var(--color-primary,#2D402B)] animate-spin" />
          <span className="font-[var(--font-display,'Outfit')] font-bold text-sm uppercase tracking-widest">
            Verifying Admin Session Security...
          </span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children
}
