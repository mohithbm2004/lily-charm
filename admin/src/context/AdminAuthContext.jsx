import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config/api'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true)
      const storedSessionId = localStorage.getItem('lilycharm_admin_session_id')
      const headers = { 'Content-Type': 'application/json' }
      if (storedSessionId) headers['x-admin-session-id'] = storedSessionId

      const res = await fetch(`${API_URL}/admin/auth/me`, {
        method: 'GET',
        headers,
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success && data.authenticated) {
          setIsAuthenticated(true)
          setAdmin(data.admin)
          setError(null)
        } else {
          setIsAuthenticated(false)
          setAdmin(null)
        }
      } else {
        setIsAuthenticated(false)
        setAdmin(null)
      }
    } catch (err) {
      console.error('checkAuth Error:', err)
      setIsAuthenticated(false)
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email, password) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please check credentials.')
      }

      if (data.sessionId) {
        localStorage.setItem('lilycharm_admin_session_id', data.sessionId)
      }

      setIsAuthenticated(true)
      setAdmin(data.admin)
      return { success: true, admin: data.admin }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const requestForgotPassword = async (email) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to request password reset OTP.')
      }

      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const verifyForgotPasswordOtp = async (email, otp) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'OTP code verification failed.')
      }

      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const resetPassword = async (resetToken, newPassword, confirmPassword) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password.')
      }

      setIsAuthenticated(false)
      setAdmin(null)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/admin/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to change password.')
      }

      setIsAuthenticated(false)
      setAdmin(null)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const logoutAllSessions = async () => {
    try {
      const storedSessionId = localStorage.getItem('lilycharm_admin_session_id')
      const headers = { 'Content-Type': 'application/json' }
      if (storedSessionId) headers['x-admin-session-id'] = storedSessionId

      await fetch(`${API_URL}/admin/auth/logout-all`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })
    } catch (err) {
      console.error('logoutAllSessions error:', err)
    } finally {
      localStorage.removeItem('lilycharm_admin_session_id')
      setIsAuthenticated(false)
      setAdmin(null)
    }
  }

  const logout = async () => {
    try {
      const storedSessionId = localStorage.getItem('lilycharm_admin_session_id')
      const headers = { 'Content-Type': 'application/json' }
      if (storedSessionId) headers['x-admin-session-id'] = storedSessionId

      await fetch(`${API_URL}/admin/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include',
      })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('lilycharm_admin_session_id')
      setIsAuthenticated(false)
      setAdmin(null)
    }
  }

  const getSessions = async () => {
    try {
      const storedSessionId = localStorage.getItem('lilycharm_admin_session_id')
      const headers = { 'Content-Type': 'application/json' }
      if (storedSessionId) headers['x-admin-session-id'] = storedSessionId

      const res = await fetch(`${API_URL}/admin/auth/sessions`, {
        method: 'GET',
        headers,
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        return data.sessions || []
      }
      return []
    } catch (err) {
      console.error('getSessions Error:', err)
      return []
    }
  }

  const revokeSession = async (sessionId) => {
    try {
      const storedSessionId = localStorage.getItem('lilycharm_admin_session_id')
      const headers = { 'Content-Type': 'application/json' }
      if (storedSessionId) headers['x-admin-session-id'] = storedSessionId

      const res = await fetch(`${API_URL}/admin/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      })
      const data = await res.json()
      return data
    } catch (err) {
      console.error('revokeSession Error:', err)
      return { success: false, message: err.message }
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated,
        loading,
        error,
        setError,
        login,
        requestForgotPassword,
        verifyForgotPasswordOtp,
        resetPassword,
        changePassword,
        logoutAllSessions,
        logout,
        checkAuth,
        getSessions,
        revokeSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  return context
}
