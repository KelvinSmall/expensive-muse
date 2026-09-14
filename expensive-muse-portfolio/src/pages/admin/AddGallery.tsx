import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { initDriveUpload, uploadToDriveSession, publishDriveFiles } from '../../lib/drive'
import { createProject, getSettings } from '../../lib/api'
import { getImageDimensions } from '../../lib/mediaDimensions'
import type { Visibility } from '../../lib/types'
import { useCategories } from '../../lib/useCategories'

type Step = 'idle' | 'uploading' | 'saving' | 'publishing' | 'done' | 'error'

const STEP_LABEL: Record<Step, string> = {
  idle: '',
  uploading: 'Uploading images to Google Drive',
  saving: 'Saving portfolio information',
  publishing: 'Publishing',
  done: 'Complete',
  error: 'Something went wrong',
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Adds a photography / design / AI-CGI project as a set of still images
 * rather than a video. The first image becomes the grid thumbnail; the
 * public project page renders the rest as a gallery.
 */
export default function AddGallery() {
  const navigate = useNavigate()
  const { categories } = useCategories()
  const [maxImageMb, setMaxImageMb] = useState<number | null>(null)

  useEffect(() => {
    getSettings()
      .then((s) => setMaxImageMb(s.max_image_size_mb))
      .catch(() => {})
  }, [])

  const [images, setImages] = useState<File[]>([])
  const [client, setClient] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('published')
  const [featured, setFeatured] = useState(false)

  const [step, setStep] = useState<Step>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const busy = step !== 'idle' && step !== 'done' && step !== 'error'
  const oversizedFiles = maxImageMb ? images.filter((f) => f.size > maxImageMb * 1024 * 1024) : []

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return
    setImages((prev) => [...prev, ...Array.from(fileList)])
  }

  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (images.length === 0) return setError('Add at least one image.')
    if (!client.trim() || !title.trim()) return setError('Client and project title are required.')
    if (!categoryId) return setError('Choose a category.')
    if (oversizedFiles.length > 0) {
      return setError(
        `${oversizedFiles.length} image(s) exceed the ${maxImageMb} MB limit set in Portfolio Settings. Remove or resize them first.`
      )
    }

    setError(null)
    try {
      setStep('uploading')
      const uploadedIds: string[] = []
      const dimensions: { width: number; height: number }[] = []
      for (let i = 0; i < images.length; i++) {
        const file = images[i]
        // Real dimensions, read before upload — each image keeps its own
        // natural ratio in the gallery, nothing gets cropped to fit a grid.
        const dims = await getImageDimensions(file).catch(() => ({ width: 0, height: 0 }))
        dimensions.push(dims)
        const { uploadUrl } = await initDriveUpload({ fileName: file.name, mimeType: file.type, folder: 'thumbnails' })
        const { fileId } = await uploadToDriveSession(uploadUrl, file, (p) =>
          setProgress((i + p) / images.length)
        )
        uploadedIds.push(fileId)
      }

      setStep('saving')
      const project = await createProject({
        title: title.trim(),
        client: client.trim(),
        category_id: categoryId,
        year: Number(year) || new Date().getFullYear(),
        description: description.trim(),
        visibility,
        featured,
        media_type: 'gallery',
        thumbnail_file_id: uploadedIds[0],
        video_file_id: null,
        original_file_id: null,
        gallery_file_ids: uploadedIds,
        media_width: dimensions[0]?.width || null,
        media_height: dimensions[0]?.height || null,
        gallery_widths: dimensions.map((d) => d.width),
        gallery_heights: dimensions.map((d) => d.height),
      })

      setStep('publishing')
      await publishDriveFiles(uploadedIds)

      setStep('done')
      setTimeout(() => navigate(`/admin/projects/${project.id}`), 900)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStep('error')
    }
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-2xl">
      <h1 className="font-display text-2xl text-ink mb-2">Add Photos / Design</h1>
      <p className="text-ink-dim text-[13px] mb-8">
        For photography, graphic design, or AI/CGI stills — upload a set of images instead of a video. The first
        image is used as the grid thumbnail; all of them appear together on the project's page.
      </p>

      <form onSubmit={handleSubmit} className="space-y-7">
        <div>
          <p className="text-[12px] text-ink-dim mb-1.5">Images</p>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              handleFilesSelected(e.target.files)
              e.target.value = ''
            }}
            className="w-full text-sm text-ink-dim file:mr-3 file:py-2 file:px-3 file:border file:border-border file:bg-surface file:text-ink file:text-[13px]"
          />
          {maxImageMb && <p className="text-ink-faint text-[11px] mt-1">Limit: {maxImageMb} MB per image (set in Portfolio Settings)</p>}

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {images.map((f, i) => {
                const oversized = maxImageMb ? f.size > maxImageMb * 1024 * 1024 : false
                return (
                  <div key={i} className={`relative border p-2 ${oversized ? 'border-danger' : 'border-border'}`}>
                    <p className="text-[11px] text-ink truncate">{f.name}</p>
                    <p className={`text-[10px] ${oversized ? 'text-danger' : 'text-ink-faint'}`}>
                      {fmtSize(f.size)}
                      {oversized && ' — too large'}
                    </p>
                    {!busy && (
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 text-ink-faint hover:text-danger text-[11px]"
                      >
                        ✕
                      </button>
                    )}
                    {i === 0 && <span className="text-[10px] text-brass">Cover thumbnail</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Field label="Client">
          <TextInput value={client} onChange={setClient} disabled={busy} placeholder="e.g. Bayan Cafe" />
        </Field>

        <Field label="Project Title">
          <TextInput value={title} onChange={setTitle} disabled={busy} placeholder="e.g. Brand Photography Set" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={categoryId}
              disabled={busy}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <TextInput value={year} onChange={setYear} disabled={busy} type="number" />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            disabled={busy}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none resize-none"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Visibility">
            <select
              value={visibility}
              disabled={busy}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            >
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="private">Private</option>
            </select>
          </Field>
          <Field label="Featured">
            <label className="flex items-center gap-2 h-full text-[13px] text-ink-dim mt-2.5">
              <input type="checkbox" checked={featured} disabled={busy} onChange={(e) => setFeatured(e.target.checked)} />
              Show at top of portfolio
            </label>
          </Field>
        </div>

        {step !== 'idle' && (
          <div className="border border-border px-4 py-4">
            <p className="text-ink text-[13px] mb-2">{STEP_LABEL[step]}</p>
            {step === 'uploading' && (
              <div className="h-1 bg-surface-2">
                <div className="h-full bg-brass transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="border border-danger px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-danger text-[13px]">{error}</p>
            <button
              type="button"
              onClick={() => {
                setStep('idle')
                setError(null)
              }}
              className="text-[12px] text-ink-dim hover:text-ink shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-ink text-bg text-sm py-3 hover:bg-brass transition-colors disabled:opacity-50"
        >
          {step === 'done' ? 'Published ✓' : busy ? 'Working…' : 'Upload & Publish'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] text-ink-dim mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  disabled,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none transition-colors"
    />
  )
}
