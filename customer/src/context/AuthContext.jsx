import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://lily-charm-server.onrender.com/api' : 'http://localhost:5000/api')

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
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        setToken(data.token)
        return { ok: true, user: data.user }
      } else {
        return { ok: false, error: data.message || 'Login failed' }
      }
    } catch (err) {
      console.error('Login error:', err)
      return { ok: false, error: 'Connection error. Please try again.' }
    }
  }

  const register = async (name, email, password, phone) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      })

      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        setToken(data.token)
        return { ok: true, user: data.user }
      } else {
        return { ok: false, error: data.message || 'Registration failed' }
      }
    } catch (err) {
      console.error('Register error:', err)
      return { ok: false, error: 'Connection error. Please try again.' }
    }
  }

  const logout = () => {
    setUser(null)
    setToken('')
    localStorage.removeItem('lilycharm_user')
    localStorage.removeItem('lilycharm_token')
  }

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('lilycharm_user', JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
