import { useState } from 'react'
import Reveal from '../components/Reveal'

export default function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 pt-32 pb-24">
      <Reveal>
        <p className="eyebrow mb-3">Contact</p>
        <h1 className="text-4xl mb-8">Say Hello</h1>
        {sent ? (
          <p className="text-[var(--color-primary)]">Thank you — the studio will reply within two working days.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-4">
            <input required placeholder="Name" className="w-full border border-[var(--color-line)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
            <input required type="email" placeholder="Email" className="w-full border border-[var(--color-line)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
            <textarea required rows={5} placeholder="Message" className="w-full border border-[var(--color-line)] bg-transparent px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)]" />
            <button type="submit" className="btn-primary">Send Message</button>
          </form>
        )}
      </Reveal>
    </div>
  )
}
