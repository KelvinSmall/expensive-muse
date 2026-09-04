import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import VideoPlayer from '../../components/VideoPlayer'
import { getPrivateProject } from '../../lib/api'
import { usePublicShell } from '../../lib/usePublicData'
import type { Project } from '../../lib/types'
import NotFound from './NotFound'

/**
 * Reached only via /private/:slug?key=TOKEN — a link the admin sends
 * directly to one client. The token is a 24-byte random value checked
 * against the database inside a SECURITY DEFINER function (see
 * supabase/schema.sql: get_private_project), so knowing the project's slug
 * alone — e.g. guessing /private/rinnai-reel — reveals nothing without the
 * matching key.
 */
export default function PrivateProject() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const token = params.get('key') ?? ''
  const { settings } = usePublicShell()
  const [project, setProject] = useState<Project | null | undefined>(undefined)

  useEffect(() => {
    if (!slug || !token) {
      setProject(null)
      return
    }
    getPrivateProject(slug, token)
      .then(setProject)
      .catch(() => setProject(null))
  }, [slug, token])

  if (project === undefined) return <div className="min-h-screen bg-bg" />
  if (!project) return <NotFound />

  return (
    <div className="min-h-screen bg-bg">
      <header className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="font-display text-lg tracking-wide text-ink">
          {settings?.studio_name ?? 'Expensive Muse'}
        </Link>
        <span className="text-[11px] tracking-[0.14em] text-brass">PRIVATE SHARE</span>
      </header>

      <div className="max-w-6xl mx-auto px-0 md:px-10">
        {project.video_file_id ? (
          <VideoPlayer fileId={project.video_file_id} title={project.title} />
        ) : (
          <div className="aspect-video bg-surface flex items-center justify-center text-ink-faint text-sm">
            Video unavailable
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p className="text-ink-dim text-[13px] tracking-wide">{project.client}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-1">{project.title}</h1>
        {project.description && (
          <p className="text-ink text-[15px] leading-relaxed mt-6 max-w-2xl">{project.description}</p>
        )}
      </div>
    </div>
  )
}
