import { useState } from 'react'
import Reveal from '../components/Reveal'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!email) return
    setSent(true)
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-14 sm:py-20 md:py-28 text-center w-full max-w-full">
      <Reveal>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[var(--font-display)] mb-3 sm:mb-4">Stay close to the studio</h2>
        <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] mb-6 sm:mb-8 max-w-md mx-auto">New pieces, restocks, and the occasional field note — no more than twice a month.</p>
        {sent ? (
          <p className="text-xs sm:text-sm font-bold text-[var(--color-primary)]">You're on the list — thank you.</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-md mx-auto w-full">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 border border-[var(--color-line)] bg-transparent px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[var(--color-primary)] min-w-0"
            />
            <button type="submit" className="btn-primary py-2.5 sm:py-3 text-xs">Subscribe</button>
          </form>
        )}
      </Reveal>
    </section>
  )
}
