import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

/**
 * Reached only via the link inside Supabase's password-reset email.
 * Supabase's client library reads the recovery token out of the URL
 * automatically and turns it into a short-lived session — this page just
 * waits for that to happen, then lets the person set a new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // PASSWORD_RECOVERY fires once Supabase has parsed the token from the
    // URL and established the temporary session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // If the link is old, already used, or someone just landed here
    // directly, no recovery session will ever arrive — stop waiting after
    // a few seconds and show a clear message instead of a silent spinner.
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) setInvalid(true)
      })
    }, 4000)
    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError("Passwords don't match.")

    setSubmitting(true)
    setError(null)
    const { error } = await updatePassword(password)
    setSubmitting(false)
    if (error) return setError(error)
    setDone(true)
    setTimeout(() => navigate('/admin'), 1500)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src="/brand/logo-black.png" alt="Expensive Muse" className="h-10 w-auto object-contain mx-auto mb-1" />
        <p className="text-ink-dim text-[12px] tracking-wide mb-10">RESET PASSWORD</p>

        {done ? (
          <p className="text-ink text-[14px]">Password updated — signing you in…</p>
        ) : invalid ? (
          <>
            <p className="text-ink text-[14px] mb-2">This link has expired or was already used.</p>
            <p className="text-ink-dim text-[13px] mb-6">
              Password reset links only work once and expire after a while. Request a fresh one from the login page.
            </p>
            <button onClick={() => navigate('/admin/login')} className="text-[13px] text-brass hover:underline">
              Back to sign in
            </button>
          </>
        ) : !ready ? (
          <p className="text-ink-dim text-[13px]">Verifying your reset link…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[12px] text-ink-dim mb-1.5" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ink-dim mb-1.5" htmlFor="confirm-password">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none transition-colors"
              />
            </div>

            {error && <p className="text-danger text-[13px]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-ink text-bg text-sm py-2.5 mt-2 hover:bg-brass transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
