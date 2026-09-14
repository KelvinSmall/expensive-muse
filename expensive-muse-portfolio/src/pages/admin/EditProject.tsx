import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProject, updateProject } from '../../lib/api'
import { initDriveUpload, uploadToDriveSession, publishDriveFiles, driveThumbUrl } from '../../lib/drive'
import { useCategories } from '../../lib/useCategories'
import ShareBlock from '../../components/ShareBlock'
import type { Project, Visibility } from '../../lib/types'

export default function EditProject() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { categories } = useCategories()
  const [project, setProject] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [replacingThumb, setReplacingThumb] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getProject(id).then(setProject)
  }, [id])

  if (!project) return <div className="px-6 md:px-10 py-8" />

  async function handleThumbnailReplace(file: File) {
    if (!project) return
    setReplacingThumb(true)
    try {
      const { uploadUrl } = await initDriveUpload({ fileName: file.name, mimeType: file.type, folder: 'thumbnails' })
      const { fileId } = await uploadToDriveSession(uploadUrl, file, () => {})
      await publishDriveFiles([fileId])
      await updateProject(project.id, { thumbnail_file_id: fileId })
      setProject({ ...project, thumbnail_file_id: fileId })
    } catch {
      setError('Failed to replace thumbnail.')
    } finally {
      setReplacingThumb(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!project) return
    setSaving(true)
    setError(null)
    try {
      await updateProject(project.id, {
        client: project.client,
        title: project.title,
        category_id: project.category_id,
        year: project.year,
        description: project.description,
        visibility: project.visibility,
        featured: project.featured,
      })
      navigate('/admin/projects')
    } catch {
      setError('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-2xl">
      <h1 className="font-display text-2xl text-ink mb-1">Edit Project</h1>
      <p className="text-ink-faint text-[12px] mb-8">
        {project.media_type === 'gallery' ? 'Photo / Design gallery' : 'Video reel'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-[12px] text-ink-dim mb-1.5">{project.media_type === 'gallery' ? 'Cover thumbnail' : 'Thumbnail'}</p>
          <div className="flex items-center gap-4">
            {project.thumbnail_file_id && (
              <img
                src={`https://lh3.googleusercontent.com/d/${project.thumbnail_file_id}=w200`}
                alt=""
                className="w-28 aspect-video object-cover bg-surface"
              />
            )}
            <label className="text-[12px] text-brass hover:underline cursor-pointer">
              {replacingThumb ? 'Uploading…' : 'Replace thumbnail'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={replacingThumb}
                onChange={(e) => e.target.files?.[0] && handleThumbnailReplace(e.target.files[0])}
              />
            </label>
          </div>

          {project.media_type === 'gallery' && project.gallery_file_ids.length > 0 && (
            <div className="mt-3">
              <p className="text-ink-faint text-[11px] mb-1.5">
                All {project.gallery_file_ids.length} images in this gallery (edit the set by re-uploading via Add
                Photos / Design as a new project — bulk gallery editing isn't available here yet)
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {project.gallery_file_ids.map((id) => (
                  <img key={id} src={driveThumbUrl(id, 200)} alt="" className="aspect-square object-cover bg-surface" />
                ))}
              </div>
            </div>
          )}
        </div>

        <TextField label="Client" value={project.client} onChange={(v) => setProject({ ...project, client: v })} />
        <TextField label="Project Title" value={project.title} onChange={(v) => setProject({ ...project, title: v })} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-ink-dim mb-1.5">Category</p>
            <select
              value={project.category_id ?? ''}
              onChange={(e) => setProject({ ...project, category_id: e.target.value || null })}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            >
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Year"
            type="number"
            value={String(project.year)}
            onChange={(v) => setProject({ ...project, year: Number(v) || project.year })}
          />
        </div>

        <div>
          <p className="text-[12px] text-ink-dim mb-1.5">Description</p>
          <textarea
            value={project.description}
            onChange={(e) => setProject({ ...project, description: e.target.value })}
            rows={4}
            className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-ink-dim mb-1.5">Visibility</p>
            <select
              value={project.visibility}
              onChange={(e) => setProject({ ...project, visibility: e.target.value as Visibility })}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            >
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="private">Private</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6 text-[13px] text-ink-dim">
            <input
              type="checkbox"
              checked={project.featured}
              onChange={(e) => setProject({ ...project, featured: e.target.checked })}
            />
            Featured
          </label>
        </div>

        {(project.visibility === 'published' || project.visibility === 'private') && (
          <ShareBlock
            label={project.visibility === 'private' ? 'Private share link' : 'Public link'}
            url={
              project.visibility === 'private' && project.private_token
                ? `${window.location.origin}/private/${project.slug}?key=${project.private_token}`
                : `${window.location.origin}/project/${project.slug}`
            }
            message={`${project.client} — ${project.title}`}
          />
        )}

        {error && <p className="text-danger text-[13px]">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-ink text-bg text-sm py-3 hover:bg-brass transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <p className="text-[12px] text-ink-dim mb-1.5">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
      />
    </div>
  )
}
