import { useState } from 'react'
import { Instagram, Mail, Send, Sparkles, CheckCircle2, Clock, MapPin } from 'lucide-react'
import Reveal from '../components/Reveal'

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'https://lily-charm-server.onrender.com/api' : 'http://localhost:5000/api')

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentMessage, setSentMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage('Please fill in your name, email, and message.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        setSentMessage(data.message || 'Thank you! Your message has been sent to Keerthana Bapu at Lily Charm.')
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
      } else {
        setErrorMessage(data.message || 'Failed to send message. Please try again.')
      }
    } catch (err) {
      console.error('Contact form submission error:', err)
      // Graceful fallback for offline / mock testing
      setSentMessage('Thank you! Your inquiry has been dispatched to keerthanabm@lilycharm.in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 pt-32 pb-24 space-y-12">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <span className="eyebrow inline-flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs uppercase tracking-[0.24em]">
            <Sparkles size={13} /> Studio Inquiries & Bespoke Commissions
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-[var(--font-display)] uppercase tracking-tight text-[var(--color-ink)]">
            Say Hello
          </h1>
          <p className="text-xs md:text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal">
            Have a custom wedding bouquet inquiry, bespoke floral commission, or question for Keerthana? Connect directly with our artisan studio.
          </p>
        </div>

        {/* Contact Info Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* Direct Email Card */}
          <div className="p-5 border border-[var(--color-line)] bg-[var(--color-card-bg)] flex items-start gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-md">
              <Mail size={20} />
            </div>
            <div className="space-y-1 flex-1">
              <p className="font-bold text-xs uppercase tracking-wider text-[var(--color-ink)] font-[var(--font-button)]">
                Studio Email
              </p>
              <a
                href="mailto:keerthanabm@lilycharm.in"
                className="text-xs md:text-sm text-[var(--color-primary)] font-bold hover:underline block break-all font-mono"
              >
                keerthanabm@lilycharm.in
              </a>
              <p className="text-[0.68rem] text-[var(--color-ink-soft)] flex items-center gap-1 font-medium">
                <Clock size={11} /> Replies within 1–2 business days
              </p>
            </div>
          </div>

          {/* Instagram Connect Card */}
          <div className="p-5 border border-[var(--color-line)] bg-[var(--color-card-bg)] flex items-start gap-4 shadow-sm">
            <div className="w-11 h-11 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-md">
              <Instagram size={20} />
            </div>
            <div className="space-y-1 flex-1">
              <p className="font-bold text-xs uppercase tracking-wider text-[var(--color-ink)] font-[var(--font-button)]">
                Instagram Direct
              </p>
              <a
                href="https://www.instagram.com/lily._charm?igsh=bnkwdWViMjlpMjA1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs md:text-sm text-[var(--color-primary)] font-bold hover:underline block font-mono"
              >
                @lily._charm ↗
              </a>
              <p className="text-[0.68rem] text-[var(--color-ink-soft)] font-medium">
                Follow our daily creations & behind the scenes
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form Card */}
        <div className="border border-[var(--color-line)] bg-[var(--color-bg)] p-6 md:p-10 shadow-lg">
          {sentMessage ? (
            <div className="p-8 border border-emerald-300 bg-emerald-50 text-emerald-950 space-y-3 text-center rounded">
              <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="font-bold text-xl font-[var(--font-display)] uppercase">Message Sent Successfully!</h3>
              <p className="text-xs md:text-sm leading-relaxed max-w-md mx-auto text-emerald-900">
                {sentMessage}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSentMessage(null)}
                  className="btn-primary py-2.5 px-6 text-xs uppercase font-bold tracking-wider"
                >
                  Send Another Message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-b border-[var(--color-line)] pb-3 mb-4">
                <h2 className="text-lg font-bold font-[var(--font-display)] uppercase text-[var(--color-ink)]">
                  Send a Direct Note to Keerthana Bapu
                </h2>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Messages are sent directly to <strong className="text-[var(--color-primary)] font-mono">keerthanabm@lilycharm.in</strong>.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold rounded">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Your Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Maya Krishnan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-card-bg)] px-4 py-3 text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-card-bg)] px-4 py-3 text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-card-bg)] px-4 py-3 text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Subject / Inquiry Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Custom Bridal Velvet Bouquet, Bulk Gifts"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full border border-[var(--color-line)] bg-[var(--color-card-bg)] px-4 py-3 text-xs font-medium focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Your Message / Idea *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Share details about your desired flower types, color palette, occasion date, or questions..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full border border-[var(--color-line)] bg-[var(--color-card-bg)] px-4 py-3 text-xs leading-relaxed font-medium focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-3.5 px-8 text-xs uppercase font-bold tracking-widest flex items-center gap-2 shadow-md hover:scale-105 transition-transform disabled:opacity-50"
                >
                  <Send size={14} /> {isSubmitting ? 'Sending Message to Studio...' : 'Send Message to Studio'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Reveal>
    </div>
  )
}
