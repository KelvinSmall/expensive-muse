import { Link } from 'react-router-dom'
import type { Project } from '../lib/types'
import { driveThumbUrl } from '../lib/drive'

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/project/${project.slug}`} className="group block">
      <div className="relative aspect-video overflow-hidden bg-surface">
        {project.thumbnail_file_id ? (
          <img
            src={driveThumbUrl(project.thumbnail_file_id)}
            alt={`${project.client} — ${project.title}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs">No thumbnail</div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <span className="w-12 h-12 rounded-full border border-ink/70 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 1.5L12 7L2 12.5V1.5Z" fill="currentColor" className="text-ink" />
            </svg>
          </span>
        </div>

        {project.featured && (
          <span className="absolute top-3 left-3 text-[10px] tracking-[0.14em] text-bg bg-brass px-2 py-1">
            FEATURED
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-ink text-[13px] tracking-wide">{project.client}</p>
          <p className="font-display text-lg text-ink leading-snug mt-0.5">{project.title}</p>
        </div>
      </div>
      <p className="mt-1 text-ink-dim text-[12px] tracking-wide">
        {(project.category?.name ?? 'Uncategorised').toUpperCase()} · {project.year}
      </p>
    </Link>
  )
}
