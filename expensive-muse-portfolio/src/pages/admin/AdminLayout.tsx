import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/new', label: 'Add New Reel', end: true },
  { to: '/admin/projects', label: 'Manage Projects', end: true },
  { to: '/admin/categories', label: 'Categories', end: true },
  { to: '/admin/drive', label: 'Google Drive', end: true },
  { to: '/admin/settings', label: 'Portfolio Settings', end: true },
]

export default function AdminLayout() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row">
      <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border md:min-h-screen">
        <div className="px-6 py-6">
          <p className="font-display text-lg text-ink">Expensive Muse</p>
          <p className="text-ink-faint text-[11px] tracking-[0.14em] mt-0.5">ADMIN</p>
        </div>
        <nav className="px-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-3 md:pb-0">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `shrink-0 px-3 py-2 text-[13px] rounded-sm transition-colors ${
                  isActive ? 'bg-surface-2 text-ink' : 'text-ink-dim hover:text-ink hover:bg-surface'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 mt-2 md:mt-6 md:absolute md:bottom-6">
          <button
            onClick={() => signOut()}
            className="px-3 py-2 text-[13px] text-ink-dim hover:text-ink transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
