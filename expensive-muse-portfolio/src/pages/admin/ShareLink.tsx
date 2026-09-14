import { useState } from 'react'
import { useCategories } from '../../lib/useCategories'

/**
 * Lets the admin pick exactly which categories a client should see, then
 * generates one link that shows only that slice of the portfolio — the
 * rest of the site (and every other category) is simply absent for anyone
 * opening that link, not just hidden behind a tab. The main site keeps
 * working normally for everyone else at the same time.
 */
export default function ShareLink() {
  const { categories } = useCategories()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [studioName, setStudioName] = useState('your portfolio')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const selectedSlugs = categories.filter((c) => selected.has(c.id)).map((c) => c.slug)
  const link = selectedSlugs.length > 0 ? `${baseUrl}/?only=${selectedSlugs.join(',')}` : baseUrl

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const shareText = `Here's the ${studioName} portfolio: ${link}`

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-2xl">
      <h1 className="font-display text-2xl text-ink mb-2">Share Link</h1>
      <p className="text-ink-dim text-[13px] mb-8">
        Pick which categories to include, then send the link below. Leave everything unchecked to share the full
        portfolio. This never changes what's visible on your main site for other visitors — it's a separate,
        shareable view.
      </p>

      <div className="border border-border p-5 mb-6">
        <p className="text-[12px] text-ink-dim mb-3">Include categories</p>
        {categories.length === 0 ? (
          <p className="text-ink-faint text-[13px]">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                {c.name}
                {c.hidden && <span className="text-ink-faint text-[11px]">(hidden sitewide)</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="border border-border p-5 mb-6">
        <p className="text-[12px] text-ink-dim mb-1.5">Studio / project name for the message</p>
        <input
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none mb-4"
        />

        <p className="text-[12px] text-ink-dim mb-1.5">Link</p>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={link}
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 bg-surface-2 border border-border px-3 py-2.5 text-ink text-[13px] outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 px-4 bg-ink text-bg text-[13px] hover:bg-brass transition-colors"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        {selectedSlugs.length > 0 && (
          <p className="text-ink-faint text-[11px] mt-2">
            Shows only: {categories.filter((c) => selected.has(c.id)).map((c) => c.name).join(', ')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 border border-border text-[13px] text-ink hover:border-brass transition-colors"
        >
          Share via WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(`${studioName} — portfolio`)}&body=${encodeURIComponent(shareText)}`}
          className="px-4 py-2.5 border border-border text-[13px] text-ink hover:border-brass transition-colors"
        >
          Share via Email
        </a>
      </div>
    </div>
  )
}
