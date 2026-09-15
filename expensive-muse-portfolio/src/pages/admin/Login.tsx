import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export default function Login() {
  const { session, loading, signIn, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'forgot'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    await requestPasswordReset(email)
    setSubmitting(false)
    // Always show the same neutral confirmation, whether or not that email
    // is actually a registered admin — this stops the reset form itself
    // from being usable to check who has an account.
    setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <img src="/brand/logo-black.png" alt="Expensive Muse" className="h-10 w-auto object-contain mx-auto mb-1" />
        <p className="text-ink-dim text-[12px] tracking-wide text-center mb-10">ADMIN</p>

        {mode === 'sign-in' ? (
          <>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] text-ink-dim" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot')
                      setError(null)
                      setResetSent(false)
                    }}
                    className="text-[12px] text-brass hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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
          </>
        ) : (
          <>
            {resetSent ? (
              <div className="text-center">
                <p className="text-ink text-[14px] mb-2">Check your email</p>
                <p className="text-ink-dim text-[13px] leading-relaxed mb-6">
                  If {email} has an admin account, a password reset link is on its way. It can take a minute or two
                  to arrive — check spam if you don't see it.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in')
                    setResetSent(false)
                  }}
                  className="text-[13px] text-brass hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-ink-dim text-[13px] mb-2">
                  Enter your admin email and we'll send a link to set a new password.
                </p>
                <div>
                  <label className="block text-[12px] text-ink-dim mb-1.5" htmlFor="reset-email">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none transition-colors"
                  />
                </div>

                {error && <p className="text-danger text-[13px]">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink text-bg text-sm py-2.5 mt-2 hover:bg-brass transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('sign-in')}
                  className="w-full text-[13px] text-ink-dim hover:text-ink transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
