import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-display text-3xl text-ink mb-3">Not found</h1>
      <p className="text-ink-dim text-sm mb-8">This page doesn't exist, or the link has expired.</p>
      <Link to="/" className="text-[13px] tracking-wide text-brass hover:underline">
        Back to portfolio
      </Link>
    </div>
  )
}
