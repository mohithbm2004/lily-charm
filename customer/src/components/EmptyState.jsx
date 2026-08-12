import { Link } from 'react-router-dom'
import { Flower2 } from 'lucide-react'
import Reveal from './Reveal'

export default function EmptyState({
  icon: Icon = Flower2,
  eyebrow = 'Archival Notice',
  title = 'Your collection is waiting',
  message = 'Explore our handcrafted botanical creations preserved to outlast every season.',
  actionText = 'Explore Catalog',
  actionLink = '/shop',
  onAction = null,
  className = '',
}) {
  return (
    <Reveal className={`card-luxury p-8 sm:p-12 text-center max-w-lg mx-auto my-8 ${className}`}>
      <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-5 rounded-full border border-[var(--color-line)] bg-[var(--color-bg)] flex items-center justify-center text-[var(--color-primary)]">
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-bold mb-3">{title}</h3>
      <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] max-w-sm mx-auto mb-6 leading-relaxed">
        {message}
      </p>
      {onAction ? (
        <button type="button" onClick={onAction} className="btn-primary">
          {actionText}
        </button>
      ) : (
        <Link to={actionLink} className="btn-primary">
          {actionText}
        </Link>
      )}
    </Reveal>
  )
}
