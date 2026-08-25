import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminSetup = lazy(() => import('./pages/AdminSetup'))
const AdminForgotPassword = lazy(() => import('./pages/AdminForgotPassword'))
const AdminResetPassword = lazy(() => import('./pages/AdminResetPassword'))
const EmailSecurity = lazy(() => import('./pages/EmailSecurity'))

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1B18] text-white">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<AdminFallback />}>
      <Routes>
        <Route path="/admin/setup" element={<AdminSetup />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin/reset-password" element={<AdminResetPassword />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Dashboard" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Orders" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Products" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Customers" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/custom-designs"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Custom Requests" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Reviews" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Payments" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/refunds"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Refunds" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Coupons" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Settings" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/settings/security"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard activeTabName="Settings" />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/email-security"
          element={
            <ProtectedAdminRoute>
              <EmailSecurity />
            </ProtectedAdminRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
