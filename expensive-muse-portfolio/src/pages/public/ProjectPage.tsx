import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VideoPlayer from '../../components/VideoPlayer'
import ImageGallery from '../../components/ImageGallery'
import { getPublishedProjectBySlug } from '../../lib/api'
import { usePublicShell } from '../../lib/usePublicData'
import type { Project } from '../../lib/types'
import NotFound from './NotFound'

export default function ProjectPage() {
  const { slug } = useParams()
  const { settings } = usePublicShell()
  const [project, setProject] = useState<Project | null | undefined>(undefined)

  useEffect(() => {
    if (!slug) return
    getPublishedProjectBySlug(slug)
      .then(setProject)
      .catch(() => setProject(null))
  }, [slug])

  if (project === undefined) return <div className="min-h-screen bg-bg" />
  if (project === null) return <NotFound />

  return (
    <div className="min-h-screen bg-bg">
      <header className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center h-7">
          <img src="/brand/logo-black.png" alt={settings?.studio_name ?? 'Expensive Muse'} className="h-full w-auto object-contain" />
        </Link>
        <Link to="/" className="text-ink-dim text-[13px] hover:text-ink transition-colors">
          Close
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-0 md:px-10">
        {project.media_type === 'gallery' && project.gallery_file_ids.length > 0 ? (
          <ImageGallery
            fileIds={project.gallery_file_ids}
            title={project.title}
            widths={project.gallery_widths}
            heights={project.gallery_heights}
          />
        ) : project.video_file_id ? (
          <VideoPlayer fileId={project.video_file_id} title={project.title} width={project.media_width} height={project.media_height} />
        ) : (
          <div className="aspect-video bg-surface flex items-center justify-center text-ink-faint text-sm">
            Media unavailable
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        <p className="text-ink-dim text-[13px] tracking-wide">{project.client}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-1">{project.title}</h1>
        <p className="text-ink-dim text-[12px] tracking-wide mt-3">
          {(project.category?.name ?? 'Uncategorised').toUpperCase()} · {project.year}
        </p>
        {project.description && (
          <p className="text-ink text-[15px] leading-relaxed mt-6 max-w-2xl">{project.description}</p>
        )}
      </div>
    </div>
  )
}
