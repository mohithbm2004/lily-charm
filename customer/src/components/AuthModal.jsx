import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Mail, User, Phone, Sparkles, LogIn, UserPlus, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck, RefreshCw, Clock } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config/api'

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { updateUserProfile, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState(initialMode) // 'login' | 'register' | 'forgot' | 'otp'
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    newPassword: '',
  })

  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(300)
  const [resendCooldown, setResendCooldown] = useState(60)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ]

  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    setErrorMessage('')
    setSuccessMessage('')
    setFieldErrors({})
    setMode(initialMode)
    setOtpDigits(['', '', '', '', '', ''])
  }, [isOpen, initialMode])

  useEffect(() => {
    if (mode !== 'otp') return
    setTimeLeft(300)
    setResendCooldown(60)

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    const resendTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    setTimeout(() => inputRefs[0]?.current?.focus(), 100)

    return () => {
      clearInterval(timer)
      clearInterval(resendTimer)
    }
  }, [mode])

  const handleModeSwitch = (newMode) => {
    setMode(newMode)
    setErrorMessage('')
    setSuccessMessage('')
    setShowPassword(false)
  }

  const handleDigitChange = (index, value) => {
    if (/[^0-9]/.test(value)) return

    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)
    setErrorMessage('')

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus()
    }

    if (newDigits.every((d) => d !== '')) {
      handleOtpVerify(newDigits.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^[0-9]{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setOtpDigits(digits)
      handleOtpVerify(pastedData)
    }
  }

  const handleOtpVerify = async (codeToVerify) => {
    const code = codeToVerify || otpDigits.join('')
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: code }),
      })

      const data = await res.json()
      if (res.ok) {
        updateUserProfile(data.user)
        if (data.token) localStorage.setItem('lilycharm_token', data.token)
        setSuccessMessage('🎉 Verified! Welcome to Lily Charm.')
        setTimeout(() => {
          onClose()
          navigate('/dashboard')
        }, 800)
      } else {
        setErrorMessage(data.message || 'Invalid verification code. Please try again.')
      }
    } catch (err) {
      console.error('OTP Verify error:', err)
      setErrorMessage('Could not connect. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccessMessage('✉️ A new 6-digit verification code has been sent!')
        setTimeLeft(300)
        setResendCooldown(60)
        setOtpDigits(['', '', '', '', '', ''])
        setTimeout(() => inputRefs[0]?.current?.focus(), 100)
      } else {
        setErrorMessage(data.message || 'Failed to resend verification code.')
      }
    } catch (err) {
      console.error('Resend OTP error:', err)
      setErrorMessage('Could not connect. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleCredentialSuccess = async (credentialResponse) => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const tokenOrCredential = credentialResponse.credential || credentialResponse.access_token
      const result = await loginWithGoogle(tokenOrCredential)
      if (result.ok) {
        updateUserProfile(result.user)
        setSuccessMessage('🎉 Signed in successfully!')
        setTimeout(() => {
          onClose()
          navigate('/dashboard')
        }, 800)
      } else {
        setErrorMessage(result.error || 'Could not sign in with Google. Please try again.')
      }
    } catch (err) {
      console.error('[GOOGLE CREDENTIAL ERROR]:', err)
      setErrorMessage('Could not connect. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true)
      setErrorMessage('')
      try {
        const tokenOrCode = tokenResponse.access_token || tokenResponse.credential
        const result = await loginWithGoogle(tokenOrCode)
        if (result.ok) {
          updateUserProfile(result.user)
          setSuccessMessage('🎉 Signed in successfully!')
          setTimeout(() => {
            onClose()
            navigate('/dashboard')
          }, 800)
        } else {
          setErrorMessage(result.error || 'Could not sign in with Google. Please try again.')
        }
      } catch (err) {
        console.error('[GOOGLE SIGNIN ERROR]:', err)
        setErrorMessage('Could not connect. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    onError: (errorResponse) => {
      console.error('[GOOGLE POPUP CLOSED / CANCELLED]:', errorResponse)
      setErrorMessage('Sign in was cancelled.')
      setIsLoading(false)
    },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const errors = {}
    if (mode === 'login') {
      if (!formData.email?.trim()) errors.email = 'Email address is required.'
      if (!formData.password) errors.password = 'Password is required.'
    } else if (mode === 'register') {
      if (!formData.name?.trim()) errors.name = 'Full name is required.'
      if (!formData.email?.trim()) errors.email = 'Email address is required.'
      if (!formData.password) errors.password = 'Password is required.'
      else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters.'
    } else if (mode === 'forgot') {
      if (!formData.email?.trim()) errors.email = 'Email address is required.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      if (mode === 'login') {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })

        const data = await res.json()
        if (res.ok) {
          updateUserProfile(data.user)
          if (data.token) localStorage.setItem('lilycharm_token', data.token)
          setSuccessMessage('🎉 Welcome back! Signed in successfully.')
          setTimeout(() => {
            onClose()
            navigate('/dashboard')
          }, 800)
        } else if (res.status === 403 && data.requiresOtp) {
          setMode('otp')
        } else {
          setErrorMessage(data.message || 'Invalid email or password.')
        }
      } else if (mode === 'register') {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
          }),
        })

        const data = await res.json()
        if (res.ok && data.requiresOtp) {
          setMode('otp')
        } else if (res.ok) {
          updateUserProfile(data.user)
          if (data.token) localStorage.setItem('lilycharm_token', data.token)
          setSuccessMessage('✨ Account created successfully!')
          setTimeout(() => {
            onClose()
            navigate('/dashboard')
          }, 800)
        } else {
          setErrorMessage(data.message || 'Registration failed.')
        }
      } else if (mode === 'forgot') {
        const res = await fetch(`${API_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        })

        const data = await res.json()
        if (res.ok) {
          setSuccessMessage('🔑 Password reset link sent to your email address!')
        } else {
          setErrorMessage(data.message || 'Failed to send reset link.')
        }
      }
    } catch (err) {
      console.error('Auth submit error:', err)
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatMinutes = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 z-[1200] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="border border-[var(--color-line)] bg-[var(--color-bg)] rounded-3xl p-4 sm:p-6 md:p-8 max-w-md w-full space-y-4 sm:space-y-6 shadow-2xl relative text-[var(--color-ink)] max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors p-1.5 z-10 rounded-full hover:bg-black/5"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>

          {/* Header & Tabs */}
          <div className="space-y-3 sm:space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 text-[var(--color-primary)] text-[0.65rem] sm:text-xs font-bold uppercase tracking-widest">
              <Sparkles size={13} /> Lily Charm Customer Account
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-[var(--font-display)] uppercase">
              {mode === 'login'
                ? 'Customer Sign In'
                : mode === 'register'
                ? 'Create Account'
                : mode === 'forgot'
                ? 'Forgot Password'
                : 'Verify Your Email'}
            </h2>

            {mode !== 'otp' && (
              <div className="flex border-b border-[var(--color-line)]">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className={`flex-1 pb-2 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    mode === 'login'
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className={`flex-1 pb-2 sm:pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    mode === 'register'
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded">
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 rounded">
              <CheckCircle2 size={16} /> {successMessage}
            </div>
          )}

          {/* MODE: OTP VERIFICATION */}
          {mode === 'otp' ? (
            <div className="space-y-4 sm:space-y-5 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center mx-auto border border-amber-300">
                <ShieldCheck size={26} />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-[var(--color-ink-soft)]">
                  We sent a 6-digit verification code to your email:
                </p>
                <p className="text-xs font-mono font-bold text-[var(--color-primary)] break-all">{formData.email}</p>
              </div>

              {/* 6 Digit Inputs — Fully Fluid for 320px screens */}
              <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 py-1 sm:py-2" onPaste={handlePaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-9 h-11 xs:w-10 xs:h-12 sm:w-11 sm:h-13 md:w-12 md:h-14 border-2 border-[var(--color-line)] focus:border-[var(--color-primary)] text-center text-lg sm:text-xl font-mono font-bold bg-[var(--color-card-bg)] focus:outline-none rounded transition-colors"
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-soft)] px-1 font-mono gap-2">
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Expires: <strong className={timeLeft < 60 ? 'text-rose-600' : 'text-amber-800'}>{formatMinutes(timeLeft)}</strong>
                </span>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-[var(--color-primary)] font-bold hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOtpVerify()}
                disabled={isLoading || otpDigits.some((d) => !d)}
                className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-[0.7rem] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <Sparkles size={14} className="animate-spin" /> Verifying Code...
                  </>
                ) : (
                  'Verify & Activate Account'
                )}
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('register')}
                className="text-[0.68rem] text-[var(--color-primary)] font-bold hover:underline block mx-auto pt-2"
              >
                ← Back to Registration Details
              </button>
            </div>
          ) : (
            /* MODE: LOGIN / REGISTER / FORGOT */
            <>
              {/* Google OAuth Quick Button */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 border border-[var(--color-line)] bg-white hover:bg-[#FAF8F5] transition-colors text-[0.72rem] font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-sm cursor-pointer text-[#3c4043] rounded"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>

              <div className="flex items-center gap-3 my-2 text-[0.65rem] text-[var(--color-ink-soft)] uppercase font-mono">
                <div className="flex-1 h-px bg-[var(--color-line)]" />
                <span>Or Continue With Email</span>
                <div className="flex-1 h-px bg-[var(--color-line)]" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {mode === 'register' && (
                  <div>
                    <label className="block font-bold uppercase mb-1">
                      Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3.5 text-[var(--color-ink-soft)]" />
                      <input
                        type="text"
                        required
                        aria-required="true"
                        placeholder="e.g. Eleanor Vance"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value })
                          if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                        }}
                        className={`w-full border bg-[var(--color-card-bg)] pl-10 pr-3 py-3 font-semibold transition-colors ${
                          fieldErrors.name
                            ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                            : 'border-[var(--color-line)] focus:border-[var(--color-primary)]'
                        }`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                        ⚠️ {fieldErrors.name}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-bold uppercase mb-1">
                    Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3.5 text-[var(--color-ink-soft)]" />
                    <input
                      type="email"
                      required
                      aria-required="true"
                      placeholder="e.g. customer@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value })
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }))
                      }}
                      className={`w-full border bg-[var(--color-card-bg)] pl-10 pr-3 py-3 font-semibold transition-colors ${
                        fieldErrors.email
                          ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                          : 'border-[var(--color-line)] focus:border-[var(--color-primary)]'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                      ⚠️ {fieldErrors.email}
                    </p>
                  )}
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block font-bold uppercase mb-1">Phone Number (Optional)</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-3.5 text-[var(--color-ink-soft)]" />
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full border border-[var(--color-line)] focus:border-[var(--color-primary)] bg-[var(--color-card-bg)] pl-10 pr-3 py-3 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Password input with Eye toggle */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold uppercase">
                        Password <span className="text-red-500 font-bold ml-0.5">*</span>
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => handleModeSwitch('forgot')}
                          className="text-[0.68rem] text-[var(--color-primary)] font-semibold hover:underline"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-3.5 text-[var(--color-ink-soft)]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        aria-required="true"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value })
                          if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }))
                        }}
                        className={`w-full border bg-[var(--color-card-bg)] pl-10 pr-10 py-3 font-mono transition-colors ${
                          fieldErrors.password
                            ? 'border-red-500 focus:border-red-500 bg-red-50/20'
                            : 'border-[var(--color-line)] focus:border-[var(--color-primary)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-3 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] p-0.5 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-red-600 text-[0.68rem] mt-1 font-medium flex items-center gap-1">
                        ⚠️ {fieldErrors.password}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full py-3 font-bold uppercase tracking-widest text-[0.7rem] flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  {isLoading ? (
                    <>
                      <Sparkles size={14} className="animate-spin" /> Processing...
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <LogIn size={15} /> Sign In to Studio Profile
                    </>
                  ) : mode === 'register' ? (
                    <>
                      <UserPlus size={15} /> Send Verification Code
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} /> Send Password Reset Link
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  {mode === 'forgot' ? (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('login')}
                      className="text-[0.68rem] text-[var(--color-primary)] font-bold hover:underline"
                    >
                      ← Remember your password? Back to Sign In
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleModeSwitch(mode === 'login' ? 'register' : 'login')}
                      className="text-[0.68rem] text-[var(--color-primary)] font-bold hover:underline"
                    >
                      {mode === 'login'
                        ? "Don't have an account yet? Create one here →"
                        : 'Already registered? Sign in here →'}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
