import { Link } from 'react-router-dom'
import type { Category } from '../lib/types'

export default function Nav({
  studioName,
  categories,
  active,
  onSelect,
}: {
  studioName: string
  categories: Category[]
  active: string | null
  onSelect?: (slug: string | null) => void
}) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/85 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between gap-6">
        <Link to="/" className="font-display text-lg md:text-xl tracking-wide text-ink shrink-0">
          {studioName}
        </Link>

        {onSelect && (
          <nav className="flex items-center gap-5 md:gap-7 overflow-x-auto scroll-thin text-[13px] tracking-wide">
            <button
              onClick={() => onSelect(null)}
              className={`shrink-0 pb-1 border-b transition-colors ${
                active === null ? 'text-ink border-brass' : 'text-ink-dim border-transparent hover:text-ink'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.slug)}
                className={`shrink-0 pb-1 border-b transition-colors ${
                  active === c.slug ? 'text-ink border-brass' : 'text-ink-dim border-transparent hover:text-ink'
                }`}
              >
                {c.name}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
