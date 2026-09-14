import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listAllProjects,
  searchProjects,
  setVisibility,
  setFeatured,
  reorderProjects,
  deleteProjectRecord,
  type DeleteDriveAction,
} from '../../lib/api'
import { handleDriveOnDelete } from '../../lib/drive'
import type { Project, Visibility } from '../../lib/types'
import EmptyState from '../../components/EmptyState'

export default function ManageProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const dragIndex = useRef<number | null>(null)

  async function refresh() {
    const data = query.trim() ? await searchProjects(query.trim()) : await listAllProjects()
    setProjects(data)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function toggleVisibility(p: Project, next: Visibility) {
    await setVisibility(p.id, next)
    refresh()
  }

  async function toggleFeatured(p: Project) {
    await setFeatured(p.id, !p.featured)
    refresh()
  }

  function onDrop(targetIndex: number) {
    if (!projects || dragIndex.current === null) return
    const next = [...projects]
    const [moved] = next.splice(dragIndex.current, 1)
    next.splice(targetIndex, 0, moved)
    dragIndex.current = null
    setProjects(next)
    reorderProjects(next.map((p) => p.id))
  }

  async function confirmDelete(action: DeleteDriveAction) {
    if (!pendingDelete) return
    const fileIds = [pendingDelete.thumbnail_file_id, pendingDelete.video_file_id, pendingDelete.original_file_id].filter(
      (id): id is string => Boolean(id)
    )
    await deleteProjectRecord(pendingDelete.id)
    await handleDriveOnDelete(fileIds, action).catch(() => {
      // record is already gone; surface nothing destructive if Drive cleanup fails
    })
    setPendingDelete(null)
    refresh()
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-10">
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <h1 className="font-display text-2xl text-ink">Manage Projects</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search client, title, category, year…"
          className="bg-surface border border-border px-3 py-2 text-sm text-ink focus:border-brass outline-none w-64 max-w-full"
        />
      </div>

      {projects === null ? null : projects.length === 0 ? (
        <EmptyState title="No projects" subtitle="Add your first reel to get started." />
      ) : (
        <div className="max-w-3xl divide-y divide-border border-t border-b border-border">
          {projects.map((p, i) => (
            <div
              key={p.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3.5"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="text-ink-faint cursor-grab select-none shrink-0 mt-0.5" title="Drag to reorder">
                  ☰
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/projects/${p.id}`} className="text-ink text-[14px] hover:text-brass transition-colors">
                    {p.client} — {p.title}
                  </Link>
                  <p className="text-ink-dim text-[12px] mt-0.5">
                    {p.media_type === 'gallery' ? '🖼 ' : '🎬 '}
                    {p.category?.name ?? 'Uncategorised'} · {p.year} ·{' '}
                    <span
                      className={
                        p.visibility === 'published' ? 'text-ok' : p.visibility === 'private' ? 'text-brass' : 'text-ink-faint'
                      }
                    >
                      {p.visibility}
                    </span>
                    {p.featured && <span className="text-brass"> · Featured</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] pl-7 md:pl-0 md:shrink-0">
                <Link to={`/admin/projects/${p.id}`} className="text-ink-dim hover:text-ink transition-colors">
                  Edit
                </Link>
                {p.visibility === 'published' ? (
                  <button onClick={() => toggleVisibility(p, 'hidden')} className="text-ink-dim hover:text-ink transition-colors">
                    Hide
                  </button>
                ) : (
                  <button onClick={() => toggleVisibility(p, 'published')} className="text-ink-dim hover:text-ink transition-colors">
                    Show
                  </button>
                )}
                <button onClick={() => toggleVisibility(p, 'private')} className="text-ink-dim hover:text-ink transition-colors">
                  Private
                </button>
                <button onClick={() => toggleFeatured(p)} className="text-ink-dim hover:text-ink transition-colors">
                  {p.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button onClick={() => setPendingDelete(p)} className="text-danger hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-6 z-50">
          <div className="bg-surface border border-border max-w-sm w-full p-6">
            <h2 className="font-display text-xl text-ink mb-2">Delete project?</h2>
            <p className="text-ink-dim text-[13px] mb-5">
              This removes “{pendingDelete.title}” from the portfolio. What should happen to the Google Drive files?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => confirmDelete('keep')}
                className="w-full text-left px-3 py-2.5 border border-border text-[13px] text-ink hover:border-brass transition-colors"
              >
                Keep Google Drive files <span className="text-ink-faint">(safest, default)</span>
              </button>
              <button
                onClick={() => confirmDelete('archive')}
                className="w-full text-left px-3 py-2.5 border border-border text-[13px] text-ink hover:border-brass transition-colors"
              >
                Archive portfolio video
              </button>
              <button
                onClick={() => confirmDelete('remove')}
                className="w-full text-left px-3 py-2.5 border border-danger text-[13px] text-danger hover:bg-danger hover:text-bg transition-colors"
              >
                Remove Google Drive files permanently
              </button>
            </div>
            <button
              onClick={() => setPendingDelete(null)}
              className="mt-4 text-[12px] text-ink-dim hover:text-ink transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
