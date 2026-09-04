import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllProjects, getSettings, setClientAccess } from '../../lib/api'
import type { Project, Settings } from '../../lib/types'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [toggling, setToggling] = useState(false)

  async function refresh() {
    const [p, s] = await Promise.all([listAllProjects(), getSettings()])
    setProjects(p)
    setSettings(s)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function toggleAccess() {
    if (!settings) return
    setToggling(true)
    await setClientAccess(!settings.client_access_enabled)
    await refresh()
    setToggling(false)
  }

  const stats = projects
    ? {
        total: projects.length,
        published: projects.filter((p) => p.visibility === 'published').length,
        hidden: projects.filter((p) => p.visibility === 'hidden').length,
        private: projects.filter((p) => p.visibility === 'private').length,
        featured: projects.filter((p) => p.featured).length,
      }
    : null

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-5xl">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-2 h-2 rounded-full ${
              settings?.client_access_enabled ? 'bg-ok' : 'bg-danger'
            }`}
          />
          <p className="text-ink text-sm">
            Client Portfolio — {settings?.client_access_enabled ? 'Online' : 'Offline'}
          </p>
        </div>
        {settings && (
          <button
            onClick={toggleAccess}
            disabled={toggling}
            className={`text-[13px] px-4 py-2 border transition-colors disabled:opacity-50 ${
              settings.client_access_enabled
                ? 'border-danger text-danger hover:bg-danger hover:text-bg'
                : 'border-ok text-ok hover:bg-ok hover:text-bg'
            }`}
          >
            {settings.client_access_enabled ? 'Disable Client Access' : 'Enable Client Access'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        <Stat label="Total Projects" value={stats?.total} />
        <Stat label="Published" value={stats?.published} />
        <Stat label="Hidden" value={stats?.hidden} />
        <Stat label="Private" value={stats?.private} />
        <Stat label="Featured" value={stats?.featured} />
      </div>

      <Link
        to="/admin/new"
        className="inline-block bg-ink text-bg text-sm px-5 py-3 hover:bg-brass transition-colors"
      >
        + Add New Reel
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="border border-border px-4 py-4">
      <p className="font-display text-3xl text-ink">{value ?? '—'}</p>
      <p className="text-ink-dim text-[12px] tracking-wide mt-1">{label}</p>
    </div>
  )
}
