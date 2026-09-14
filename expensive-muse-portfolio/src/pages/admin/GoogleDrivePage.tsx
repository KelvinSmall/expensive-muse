import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getDriveStatus, connectGoogleDrive, disconnectGoogleDrive, type DriveStatus } from '../../lib/drive'

export default function GoogleDrivePage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<DriveStatus | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const s = await getDriveStatus().catch(() => ({ connected: false, email: null }))
    setStatus(s)
  }

  useEffect(() => {
    refresh()
  }, [])

  const connectError = params.get('error')
  const justConnected = params.get('connected') === '1'

  async function handleConnect() {
    setBusy(true)
    try {
      await connectGoogleDrive()
    } catch {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google Drive? Your videos stay in Drive untouched — you can reconnect any time.')) return
    setBusy(true)
    await disconnectGoogleDrive()
    await refresh()
    setBusy(false)
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-xl">
      <h1 className="font-display text-2xl text-ink mb-8">Google Drive</h1>

      {connectError && (
        <div className="border border-danger px-4 py-3 mb-6">
          <p className="text-danger text-[13px]">Could not connect Google Drive ({connectError}). Please try again.</p>
        </div>
      )}
      {justConnected && (
        <div className="border border-ok px-4 py-3 mb-6">
          <p className="text-ok text-[13px]">Google Drive connected — folders are set up and ready.</p>
        </div>
      )}

      {status === null ? null : status.connected ? (
        <div className="border border-border px-5 py-5">
          <p className="text-ink text-[13px] mb-1">
            Connection: <span className="text-ok">Connected</span>
          </p>
          <p className="text-ink-dim text-[13px] mb-5">Google account: {status.email ?? 'Unknown'}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refresh}
              className="text-[13px] px-4 py-2 border border-border text-ink-dim hover:text-ink transition-colors"
            >
              Test Connection
            </button>
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="text-[13px] px-4 py-2 border border-danger text-danger hover:bg-danger hover:text-bg transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-border px-5 py-5">
          <p className="text-ink text-[13px] mb-1">
            Connection: <span className="text-danger">Not connected</span>
          </p>
          <p className="text-ink-dim text-[13px] mb-5">
            Connect your Google account once — the app will create and manage the portfolio's Drive folders
            automatically.
          </p>
          <button
            onClick={handleConnect}
            disabled={busy}
            className="text-[13px] px-4 py-2 bg-ink text-bg hover:bg-brass transition-colors disabled:opacity-50"
          >
            Connect Google Drive
          </button>
        </div>
      )}
    </div>
  )
}
