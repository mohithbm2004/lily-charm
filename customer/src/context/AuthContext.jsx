import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../config/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lilycharm_user')
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem('lilycharm_token') || ''
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('lilycharm_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('lilycharm_user')
    }
  }, [user])

  useEffect(() => {
    if (token) {
      localStorage.setItem('lilycharm_token', token)
    } else {
      localStorage.removeItem('lilycharm_token')
    }
  }, [token])

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
        setUser(data.user)
        setToken(data.token)
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
        if (data.user) setUser(data.user)
        if (data.token) setToken(data.token)
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
        setUser(data.user)
        setToken(data.token)
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
    setUser(null)
    setToken('')
    localStorage.removeItem('lilycharm_user')
    localStorage.removeItem('lilycharm_token')
    localStorage.removeItem('lilycharm_user_profile')
  }

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('lilycharm_user', JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithGoogle, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
