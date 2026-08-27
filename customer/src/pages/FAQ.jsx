import Reveal from '../components/Reveal'
import FAQSection from '../sections/FAQSection'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FAQ() {
  return (
    <div className="pt-4 sm:pt-5 md:pt-6 pb-12 sm:pb-16 w-full max-w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 mb-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-primary)] font-medium transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Studio Home
        </Link>
      </div>

      <FAQSection isStandalonePage={true} />
    </div>
  )
}
