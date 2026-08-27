import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, HelpCircle, Sparkles } from 'lucide-react'
import Reveal from '../components/Reveal'

export const FAQ_DATA = [
  {
    id: 'faq-1',
    question: 'Are the flowers handmade?',
    answer:
      'Yes, every flower is carefully handmade using pipe cleaners, making each piece unique and special.',
  },
  {
    id: 'faq-2',
    question: 'Can I customize my bouquet?',
    answer:
      'Yes! Customers can choose flower types, colors, bouquet size, wrapping, and decorations according to their preferences.',
  },
  {
    id: 'faq-3',
    question: 'How long do the flowers last?',
    answer:
      'Unlike fresh flowers, pipe-cleaner flowers do not wilt or require water. With proper care, they can last for a very long time.',
  },
  {
    id: 'faq-4',
    question: 'How long does it take to make an order?',
    answer:
      'Since every bouquet is handmade, preparation time depends on the size and customization of the order. The estimated preparation time will be confirmed when the order is placed.',
  },
  {
    id: 'faq-5',
    question: 'Can I choose the flower colors?',
    answer:
      'Yes, customers can request their preferred colors or color combinations.',
  },
  {
    id: 'faq-6',
    question: 'Can I order a mini bouquet?',
    answer:
      'Yes, mini bouquets are available depending on the design and availability.',
  },
  {
    id: 'faq-7',
    question: 'Can I add a personalized note?',
    answer:
      'Yes, customers can add a personalized message with their bouquet.',
  },
  {
    id: 'faq-8',
    question: 'How do I place an order?',
    answer:
      'You can browse our creations and purchase directly online, or contact us via WhatsApp, Instagram, or our contact form for custom requests.',
  },
]

export default function FAQSection({ isStandalonePage = false }) {
  // Allow toggling items open/closed
  const [openIds, setOpenIds] = useState(['faq-1'])

  const toggleItem = (id) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Schema.org structured data for SEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <section
      className={`w-full max-w-full relative ${
        isStandalonePage
          ? 'pt-1 pb-6'
          : 'py-14 sm:py-20 md:py-24 bg-[var(--color-bg)]'
      }`}
      aria-label="Frequently Asked Questions"
    >
      {/* SEO FAQ Structured Data Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
        <Reveal>
          <div className="text-center space-y-2 mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-[var(--color-ink)] font-[var(--font-display)]">
              FREQUENTLY ASKED QUESTIONS
            </h2>
          </div>
        </Reveal>

        {/* Clean Linear Accordion Container matching editorial design */}
        <div className="border-t border-b border-[var(--color-line)] divide-y divide-[var(--color-line)]">
          {FAQ_DATA.map((item) => {
            const isOpen = openIds.includes(item.id)

            return (
              <div key={item.id} className="py-4 sm:py-5">
                <h3>
                  <button
                    type="button"
                    id={`faq-header-${item.id}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${item.id}`}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between text-left gap-4 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    <span className="font-semibold text-sm sm:text-base text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors">
                      {item.question}
                    </span>
                    <span
                      className="shrink-0 text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors"
                      aria-hidden="true"
                    >
                      {isOpen ? (
                        <Minus size={18} strokeWidth={2.2} />
                      ) : (
                        <Plus size={18} strokeWidth={2.2} />
                      )}
                    </span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-header-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {/* Reassurance Footer Badge */}
        {!isStandalonePage && (
          <div className="mt-12 text-center">
            <p className="text-xs text-[var(--color-ink-soft)]">
              Have a question not answered here?{' '}
              <a
                href="/contact"
                className="text-[var(--color-primary)] font-bold hover:underline"
              >
                Reach out to our studio →
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
