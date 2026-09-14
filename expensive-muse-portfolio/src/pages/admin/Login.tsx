import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) return <Navigate to="/admin" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <img src="/brand/logo-black.png" alt="Expensive Muse" className="h-10 w-auto object-contain mx-auto mb-1" />
        <p className="text-ink-dim text-[12px] tracking-wide text-center mb-10">ADMIN</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] text-ink-dim mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] text-ink-dim mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none transition-colors"
            />
          </div>

          {error && <p className="text-danger text-[13px]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-bg text-sm py-2.5 mt-2 hover:bg-brass transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-ink-faint text-[12px] text-center mt-8">
          Admin accounts are created in Supabase Authentication, not from this page.
        </p>
      </div>
    </div>
  )
}
