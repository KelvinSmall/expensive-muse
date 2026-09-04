import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { compressVideo, estimateCompressedSize, generateThumbnail } from '../../lib/compression'
import { initDriveUpload, uploadToDriveSession, publishDriveFiles } from '../../lib/drive'
import { createProject } from '../../lib/api'
import type { CompressionPreset, Visibility } from '../../lib/types'
import { COMPRESSION_PRESETS } from '../../lib/types'
import { useCategories } from '../../lib/useCategories'

type Step = 'idle' | 'preparing' | 'compressing' | 'uploading' | 'uploading-thumb' | 'saving' | 'publishing' | 'done' | 'error'

const STEP_LABEL: Record<Step, string> = {
  idle: '',
  preparing: 'Preparing video',
  compressing: 'Compressing video',
  uploading: 'Uploading to Google Drive',
  'uploading-thumb': 'Uploading thumbnail',
  saving: 'Saving portfolio information',
  publishing: 'Publishing',
  done: 'Complete',
  error: 'Something went wrong',
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AddReel() {
  const navigate = useNavigate()
  const { categories } = useCategories()

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [generatingThumb, setGeneratingThumb] = useState(false)

  const [client, setClient] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('published')
  const [featured, setFeatured] = useState(false)
  const [preset, setPreset] = useState<CompressionPreset>('medium')
  const [keepOriginal, setKeepOriginal] = useState(false)

  const [step, setStep] = useState<Step>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const sizeEstimate = useMemo(() => {
    if (!videoFile || preset === 'original') return null
    return estimateCompressedSize(videoFile.size, preset)
  }, [videoFile, preset])

  const busy = step !== 'idle' && step !== 'done' && step !== 'error'

  async function handleGenerateThumbnail() {
    if (!videoFile) return
    setGeneratingThumb(true)
    try {
      const blob = await generateThumbnail(videoFile)
      setThumbFile(new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }))
    } catch {
      setError('Could not generate a thumbnail from this video. Please upload one manually.')
    } finally {
      setGeneratingThumb(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!videoFile) return setError('Choose a video file first.')
    if (!thumbFile) return setError('A thumbnail is required.')
    if (!client.trim() || !title.trim()) return setError('Client and project title are required.')
    if (!categoryId) return setError('Choose a category.')

    setError(null)
    try {
      setStep('preparing')
      setProgress(0)

      // 1. Compress (or use original as-is)
      let portfolioBlob: Blob = videoFile
      let portfolioName = videoFile.name
      if (preset !== 'original') {
        setStep('compressing')
        const result = await compressVideo(videoFile, preset, setProgress)
        portfolioBlob = result.blob
        portfolioName = result.fileName
      }

      // 2. Upload portfolio video to Drive (VIDEOS/)
      setStep('uploading')
      setProgress(0)
      const { uploadUrl } = await initDriveUpload({
        fileName: portfolioName,
        mimeType: 'video/mp4',
        folder: 'videos',
      })
      const { fileId: videoFileId } = await uploadToDriveSession(uploadUrl, portfolioBlob, setProgress)

      // 2b. Optionally keep the original master (ORIGINALS/) — never public
      let originalFileId: string | null = null
      if (keepOriginal) {
        const { uploadUrl: origUrl } = await initDriveUpload({
          fileName: videoFile.name,
          mimeType: videoFile.type || 'video/mp4',
          folder: 'originals',
        })
        const { fileId } = await uploadToDriveSession(origUrl, videoFile, () => {})
        originalFileId = fileId
      }

      // 3. Upload thumbnail (THUMBNAILS/)
      setStep('uploading-thumb')
      const { uploadUrl: thumbUrl } = await initDriveUpload({
        fileName: thumbFile.name,
        mimeType: thumbFile.type,
        folder: 'thumbnails',
      })
      const { fileId: thumbnailFileId } = await uploadToDriveSession(thumbUrl, thumbFile, () => {})

      // 4. Save project record
      setStep('saving')
      const project = await createProject({
        title: title.trim(),
        client: client.trim(),
        category_id: categoryId,
        year: Number(year) || new Date().getFullYear(),
        description: description.trim(),
        visibility,
        featured,
        thumbnail_file_id: thumbnailFileId,
        video_file_id: videoFileId,
        original_file_id: originalFileId,
      })

      // 5. Publish — set Drive sharing/download restrictions
      setStep('publishing')
      await publishDriveFiles([videoFileId, thumbnailFileId])

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
      <h1 className="font-display text-2xl text-ink mb-8">Add New Reel</h1>

      <form onSubmit={handleSubmit} className="space-y-7">
        <Field label="Video File">
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
            disabled={busy}
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-ink-dim file:mr-3 file:py-2 file:px-3 file:border file:border-border file:bg-surface file:text-ink file:text-[13px]"
          />
          {videoFile && (
            <p className="text-ink-dim text-[12px] mt-2">
              {videoFile.name} · {fmtSize(videoFile.size)}
            </p>
          )}
        </Field>

        {videoFile && (
          <Field label="Compression">
            <div className="grid grid-cols-2 gap-2">
              {(['original', 'high', 'medium', 'web'] as CompressionPreset[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  disabled={busy}
                  onClick={() => setPreset(p)}
                  className={`text-left px-3 py-2.5 border text-[13px] transition-colors ${
                    preset === p ? 'border-brass text-ink bg-surface-2' : 'border-border text-ink-dim hover:text-ink'
                  }`}
                >
                  {p === 'original' ? 'Original' : COMPRESSION_PRESETS[p].label}
                </button>
              ))}
            </div>
            <div className="text-ink-dim text-[12px] mt-2">
              {preset === 'original' ? (
                <span>Original file, no compression.</span>
              ) : (
                <span>{COMPRESSION_PRESETS[preset].description}.</span>
              )}
              {sizeEstimate && (
                <span>
                  {' '}
                  Original: {fmtSize(videoFile.size)} → estimated {fmtSize(sizeEstimate.low)}–{fmtSize(sizeEstimate.high)}.
                </span>
              )}
            </div>
            <label className="flex items-center gap-2 mt-3 text-[13px] text-ink-dim">
              <input type="checkbox" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} disabled={busy} />
              Keep original master in Google Drive (private, never shown publicly)
            </label>
          </Field>
        )}

        <Field label="Thumbnail">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => setThumbFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-ink-dim file:mr-3 file:py-2 file:px-3 file:border file:border-border file:bg-surface file:text-ink file:text-[13px]"
          />
          <div className="flex items-center gap-3 mt-2">
            {videoFile && (
              <button
                type="button"
                onClick={handleGenerateThumbnail}
                disabled={busy || generatingThumb}
                className="text-[12px] text-brass hover:underline disabled:opacity-50"
              >
                {generatingThumb ? 'Generating…' : 'Generate thumbnail from video'}
              </button>
            )}
            {thumbFile && <span className="text-ink-dim text-[12px]">{thumbFile.name}</span>}
          </div>
        </Field>

        <Field label="Client">
          <TextInput value={client} onChange={setClient} disabled={busy} placeholder="e.g. Rinnai Malaysia" />
        </Field>

        <Field label="Project Title">
          <TextInput value={title} onChange={setTitle} disabled={busy} placeholder="e.g. Cooker Hob Reel" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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
            {(step === 'compressing' || step === 'uploading') && (
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
