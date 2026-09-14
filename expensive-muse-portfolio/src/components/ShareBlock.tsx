import { useState } from 'react'

/**
 * A copy-to-clipboard link field plus one-tap WhatsApp/Email share buttons.
 * Used anywhere a specific, ready-to-send URL needs to reach a client —
 * a single project's public or private link, a category link, etc.
 */
export default function ShareBlock({ label, url, message }: { label: string; url: string; message: string }) {
  const [copied, setCopied] = useState(false)
  const shareText = `${message}: ${url}`

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="border border-border px-4 py-4">
      <p className="text-[12px] text-ink-dim mb-1.5">{label}</p>
      <div className="flex items-stretch gap-2 mb-3">
        <input
          readOnly
          value={url}
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
      <div className="flex flex-wrap gap-3">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-2 border border-border text-[12px] text-ink-dim hover:text-ink hover:border-brass transition-colors"
        >
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(message)}&body=${encodeURIComponent(shareText)}`}
          className="px-3 py-2 border border-border text-[12px] text-ink-dim hover:text-ink hover:border-brass transition-colors"
        >
          Email
        </a>
      </div>
    </div>
  )
}
