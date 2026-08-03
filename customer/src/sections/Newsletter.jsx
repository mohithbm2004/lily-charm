import { useState } from 'react'
import Reveal from '../components/Reveal'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!email) return
    setSent(true)
    // In production: POST /api/newsletter
  }

  return (
    <section className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-28 text-center">
      <Reveal>
        <h2 className="text-3xl md:text-4xl mb-4">Stay close to the studio</h2>
        <p className="text-[var(--color-ink-soft)] mb-8">New pieces, restocks, and the occasional field note — no more than twice a month.</p>
        {sent ? (
          <p className="text-[var(--color-primary)]">You're on the list — thank you.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 border border-[var(--color-line)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
            <button type="submit" className="btn-primary">Subscribe</button>
          </form>
        )}
      </Reveal>
    </section>
  )
}
