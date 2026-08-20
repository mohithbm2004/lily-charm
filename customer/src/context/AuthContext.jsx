import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { API_URL } from '../config/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lilycharm_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('lilycharm_token') || ''
    } catch {
      return ''
    }
  })

  const [loading, setLoading] = useState(true)

  // Verify and hydrate user session from localStorage and backend
  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem('lilycharm_token') || ''
        const storedUserStr = localStorage.getItem('lilycharm_user')
        let storedUser = null

        if (storedUserStr) {
          try {
            storedUser = JSON.parse(storedUserStr)
          } catch {}
        }

        if (storedToken) {
          if (isMounted) {
            setToken(storedToken)
            if (storedUser) setUser(storedUser)
          }

          // Verify token validity with backend
          try {
            const res = await fetch(`${API_URL}/auth/me`, {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            })

            if (res.ok) {
              const data = await res.json()
              const resolvedUser = data?.user || (data?._id || data?.id || data?.email ? data : null)
              if (resolvedUser && isMounted) {
                setUser(resolvedUser)
                localStorage.setItem('lilycharm_user', JSON.stringify(resolvedUser))
              }
            } else if (res.status === 401) {
              // Token has expired or is invalid
              if (isMounted) {
                setUser(null)
                setToken('')
                localStorage.removeItem('lilycharm_user')
                localStorage.removeItem('lilycharm_token')
                localStorage.removeItem('lilycharm_user_profile')
              }
            }
          } catch (netErr) {
            console.warn('[AUTH SESSION RESTORE NOTICE]: Offline or backend unreachable, keeping local session.', netErr)
          }
        }
      } catch (err) {
        console.error('[AUTH RESTORE ERROR]:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const setAuthSession = (newUser, newToken) => {
    setUser(newUser || null)
    setToken(newToken || '')
    if (newUser) {
      localStorage.setItem('lilycharm_user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('lilycharm_user')
    }
    if (newToken) {
      localStorage.setItem('lilycharm_token', newToken)
    } else {
      localStorage.removeItem('lilycharm_token')
    }
  }

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email?.trim(), password }),
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        setAuthSession(data.user, data.token)
        return { ok: true, user: data.user, token: data.token }
      } else if (res.status === 401) {
        return { ok: false, error: data.message || 'Invalid email or password.' }
      } else if (res.status === 429) {
        return { ok: false, error: data.message || 'Too many attempts. Please try again later.' }
      } else if (res.status === 403 && data.requiresOtp) {
        return { ok: false, error: data.message || 'Verification required.', requiresOtp: true, email }
      } else if (res.status === 403) {
        return { ok: false, error: data.message || 'Access denied. Please contact support.' }
      } else if (res.status >= 500) {
        return { ok: false, error: 'Something went wrong on the server. Please try again.' }
      } else {
        return { ok: false, error: data.message || 'Sign in failed. Please check your credentials.' }
      }
    } catch (err) {
      console.error('Login network error:', err)
      return { ok: false, error: 'Unable to connect to the server. Please try again.' }
    }
  }

  const register = async (name, email, password, phone) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name?.trim(), email: email?.trim(), password, phone: phone?.trim() }),
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        if (data.token) {
          setAuthSession(data.user, data.token)
        }
        return { ok: true, user: data.user, token: data.token, requiresOtp: data.requiresOtp }
      } else if (res.status === 400) {
        return { ok: false, error: data.message || 'Please check your registration details.' }
      } else if (res.status === 429) {
        return { ok: false, error: data.message || 'Too many attempts. Please try again later.' }
      } else if (res.status >= 500) {
        return { ok: false, error: 'Something went wrong on the server. Please try again.' }
      } else {
        return { ok: false, error: data.message || 'Could not create account. Please try again.' }
      }
    } catch (err) {
      console.error('Register network error:', err)
      return { ok: false, error: 'Unable to connect to the server. Please try again.' }
    }
  }

  const loginWithGoogle = async (googleTokenOrCredential) => {
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleToken: googleTokenOrCredential, credential: googleTokenOrCredential }),
      })

      let data = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok) {
        setAuthSession(data.user, data.token)
        return { ok: true, user: data.user, token: data.token }
      } else if (res.status === 400) {
        return { ok: false, error: data.message || 'Invalid Google authentication request.' }
      } else if (res.status === 429) {
        return { ok: false, error: data.message || 'Too many attempts. Please try again later.' }
      } else if (res.status >= 500) {
        return { ok: false, error: 'Something went wrong on the server. Please try again.' }
      } else {
        return { ok: false, error: data.message || 'Could not sign in with Google. Please try again.' }
      }
    } catch (err) {
      console.error('Google Auth network error:', err)
      return { ok: false, error: 'Unable to connect to the server. Please try again.' }
    }
  }

  const logout = () => {
    setAuthSession(null, '')
    localStorage.removeItem('lilycharm_user_profile')
  }

  const updateUserProfile = (updatedUser, updatedToken = null) => {
    setUser(updatedUser)
    if (updatedToken) {
      setToken(updatedToken)
      localStorage.setItem('lilycharm_token', updatedToken)
    }
    if (updatedUser) {
      localStorage.setItem('lilycharm_user', JSON.stringify(updatedUser))
    }
  }

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile,
    setAuthSession,
  }), [user, token, loading])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
