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
    question: 'Can I request a specific design?',
    answer:
      'Yes! Customers can share a reference image or describe their preferred design, and we will do our best to create it.',
  },
  {
    id: 'faq-9',
    question: 'How should I take care of the flowers?',
    answer:
      'Keep the flowers away from water, excessive moisture, and direct sunlight. Store them in a clean, dry place to maintain their appearance.',
  },
  {
    id: 'faq-10',
    question: 'Do you offer delivery?',
    answer:
      "Delivery options depend on the customer's location. Customers can contact us with their location and order details to check availability.",
  },
  {
    id: 'faq-11',
    question: 'Do you accept bulk orders?',
    answer:
      'Yes, bulk and multiple orders are accepted. Customers are encouraged to contact us in advance for larger orders.',
  },
  {
    id: 'faq-12',
    question: 'How can I place an order?',
    answer:
      'Customers can place an order through the website or contact us through the available contact/social media options.',
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
          ? 'py-6'
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
                    className="w-full flex items-center justify-between gap-4 text-left group cursor-pointer"
                  >
                    <span className="font-bold text-xs sm:text-sm md:text-base text-[var(--color-ink)] group-hover:text-[var(--color-primary)] transition-colors pr-2">
                      {item.question}
                    </span>
                    <span className="shrink-0 text-base sm:text-lg font-bold text-[var(--color-ink)] transition-colors select-none">
                      {isOpen ? '—' : '+'}
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
                      <div className="pt-3 pb-1 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed font-normal">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
