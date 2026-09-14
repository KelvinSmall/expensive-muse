import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Nav from '../../components/Nav'
import ProjectCard from '../../components/ProjectCard'
import EmptyState from '../../components/EmptyState'
import { usePublicShell } from '../../lib/usePublicData'
import { listPublishedProjects } from '../../lib/api'
import type { Project } from '../../lib/types'

/**
 * A curated client link looks like /?only=reels,video — the admin picks
 * which categories to include when generating it (see admin "Share Link"
 * page). Visitors who open that link only ever see those categories; every
 * other tab and its projects are simply absent, not just visually hidden.
 * The plain root URL with no `only` param shows everything, as normal.
 */
export default function Home() {
  const { settings, categories, loading: shellLoading } = usePublicShell()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [params] = useSearchParams()
  const onlySlugs = useMemo(() => {
    const raw = params.get('only')
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : null
  }, [params])
  const [activeCategory, setActiveCategory] = useState<string | null>(
    onlySlugs && onlySlugs.length === 1 ? onlySlugs[0] : null
  )

  useEffect(() => {
    listPublishedProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [])

  const visibleCategories = useMemo(() => {
    if (!onlySlugs) return categories
    return categories.filter((c) => onlySlugs.includes(c.slug))
  }, [categories, onlySlugs])

  const filtered = useMemo(() => {
    if (!projects) return null
    let list = projects
    if (onlySlugs) list = list.filter((p) => p.category?.slug && onlySlugs.includes(p.category.slug))
    if (activeCategory) list = list.filter((p) => p.category?.slug === activeCategory)
    return list
  }, [projects, activeCategory, onlySlugs])

  if (shellLoading) return null

  if (settings && !settings.client_access_enabled) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-center px-6">
        <p className="font-display text-lg tracking-wide text-ink mb-8">{settings.studio_name}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-3">Portfolio temporarily unavailable</h1>
        <p className="text-ink-dim text-sm">Please check back soon.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <Nav
        studioName={settings?.studio_name ?? 'Expensive Muse'}
        categories={visibleCategories}
        active={activeCategory}
        onSelect={setActiveCategory}
      />

      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-10 md:pb-14">
        <p className="text-ink-dim text-[12px] tracking-[0.14em] mb-4">
          {(settings?.tagline ?? 'Creative • Design • Photo • Video').toUpperCase()}
        </p>
        <h1 className="font-display text-5xl md:text-7xl text-ink leading-[0.98]">Selected Work</h1>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-28">
        {filtered === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-video bg-surface animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={activeCategory ? 'No work in this category' : 'No selected work yet'}
            subtitle={activeCategory ? 'Try another category, or view all work.' : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 items-start">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      <Footer settings={settings} />
    </div>
  )
}

function Footer({ settings }: { settings: ReturnType<typeof usePublicShell>['settings'] }) {
  if (!settings) return null
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <p className="text-ink-dim text-[13px]">{settings.footer_text || `© ${new Date().getFullYear()} ${settings.studio_name}`}</p>
        <div className="flex items-center gap-5 text-[13px] text-ink-dim">
          {settings.contact_email && (
            <a href={`mailto:${settings.contact_email}`} className="hover:text-ink transition-colors">
              Email
            </a>
          )}
          {settings.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors"
            >
              WhatsApp
            </a>
          )}
          {settings.instagram && (
            <a href={settings.instagram} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Instagram
            </a>
          )}
          {settings.website && (
            <a href={settings.website} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">
              Website
            </a>
          )}
        </div>
      </div>
    </footer>
  )
}
