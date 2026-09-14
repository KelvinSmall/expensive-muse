import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { compressVideo, generateThumbnail } from '../../lib/compression'
import { initDriveUpload, uploadToDriveSession, publishDriveFiles } from '../../lib/drive'
import { createProject, getSettings } from '../../lib/api'
import { getVideoDimensions } from '../../lib/mediaDimensions'
import type { CompressionPreset, Visibility } from '../../lib/types'
import { COMPRESSION_PRESETS } from '../../lib/types'
import { useCategories } from '../../lib/useCategories'

type FileStatus =
  | 'queued'
  | 'compressing'
  | 'uploading'
  | 'thumbnail'
  | 'saving'
  | 'publishing'
  | 'done'
  | 'error'

interface QueueItem {
  id: string
  file: File
  title: string
  client: string
  status: FileStatus
  progress: number
  error?: string
}

const STATUS_LABEL: Record<FileStatus, string> = {
  queued: 'Queued',
  compressing: 'Compressing…',
  uploading: 'Uploading to Drive…',
  thumbnail: 'Generating thumbnail…',
  saving: 'Saving…',
  publishing: 'Publishing…',
  done: 'Done',
  error: 'Failed',
}

function titleFromFilename(name: string) {
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BulkUpload() {
  const navigate = useNavigate()
  const { categories } = useCategories()

  const [items, setItems] = useState<QueueItem[]>([])
  const [client, setClient] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [visibility, setVisibility] = useState<Visibility>('published')
  const [featured, setFeatured] = useState(false)
  const [preset, setPreset] = useState<CompressionPreset>('medium')

  const [running, setRunning] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [maxVideoMb, setMaxVideoMb] = useState<number | null>(null)

  useEffect(() => {
    getSettings()
      .then((s) => setMaxVideoMb(s.max_video_size_mb))
      .catch(() => {})
  }, [])

  const canStart = items.length > 0 && categoryId && client.trim() && !running

  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0
    const finished = items.filter((i) => i.status === 'done' || i.status === 'error').length
    return finished / items.length
  }, [items])

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList) return
    const newItems: QueueItem[] = Array.from(fileList).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      title: titleFromFilename(file.name),
      client,
      status: 'queued',
      progress: 0,
    }))
    setItems((prev) => [...prev, ...newItems])
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function processOne(item: QueueItem) {
    try {
      if (maxVideoMb && item.file.size > maxVideoMb * 1024 * 1024) {
        updateItem(item.id, {
          status: 'error',
          error: `${fmtSize(item.file.size)} exceeds the ${maxVideoMb} MB limit set in Portfolio Settings.`,
        })
        return
      }
      // 1. Compress (sequentially — running ffmpeg.wasm concurrently for many
      // large files would exhaust browser memory, so the queue processes
      // one file fully before starting the next)
      let portfolioBlob: Blob = item.file
      let portfolioName = item.file.name
      if (preset !== 'original') {
        updateItem(item.id, { status: 'compressing', progress: 0 })
        const result = await compressVideo(item.file, preset, (p) => updateItem(item.id, { progress: p }))
        portfolioBlob = result.blob
        portfolioName = result.fileName
      }

      // 2. Upload video
      updateItem(item.id, { status: 'uploading', progress: 0 })
      const { uploadUrl } = await initDriveUpload({ fileName: portfolioName, mimeType: 'video/mp4', folder: 'videos' })
      const { fileId: videoFileId } = await uploadToDriveSession(uploadUrl, portfolioBlob, (p) =>
        updateItem(item.id, { progress: p })
      )

      // 3. Thumbnail — auto-generated from the video frame (bulk mode skips
      // manual thumbnail picking to keep this a genuinely fast batch flow)
      updateItem(item.id, { status: 'thumbnail' })
      const thumbBlob = await generateThumbnail(item.file)
      const thumbFile = new File([thumbBlob], 'thumbnail.jpg', { type: 'image/jpeg' })
      const { uploadUrl: thumbUrl } = await initDriveUpload({
        fileName: thumbFile.name,
        mimeType: thumbFile.type,
        folder: 'thumbnails',
      })
      const { fileId: thumbnailFileId } = await uploadToDriveSession(thumbUrl, thumbFile, () => {})

      // 4. Save record
      updateItem(item.id, { status: 'saving' })
      const dims = await getVideoDimensions(item.file).catch(() => null)
      await createProject({
        title: item.title.trim() || titleFromFilename(item.file.name),
        client: item.client.trim() || client.trim(),
        category_id: categoryId,
        year: Number(year) || new Date().getFullYear(),
        description: '',
        visibility,
        featured,
        media_type: 'video',
        thumbnail_file_id: thumbnailFileId,
        video_file_id: videoFileId,
        original_file_id: null,
        gallery_file_ids: [],
        media_width: dims?.width ?? null,
        media_height: dims?.height ?? null,
        gallery_widths: [],
        gallery_heights: [],
      })

      // 5. Publish
      updateItem(item.id, { status: 'publishing' })
      await publishDriveFiles([videoFileId, thumbnailFileId])

      updateItem(item.id, { status: 'done', progress: 1 })
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  async function handleStart() {
    setRunning(true)
    setDoneCount(0)
    for (const item of items) {
      if (item.status === 'done') continue // allow retrying a partially-completed batch
      await processOne(item)
      setDoneCount((c) => c + 1)
    }
    setRunning(false)
  }

  const allDone = items.length > 0 && items.every((i) => i.status === 'done')

  return (
    <div className="px-6 md:px-10 py-8 md:py-10 max-w-3xl">
      <h1 className="font-display text-2xl text-ink mb-2">Bulk Upload</h1>
      <p className="text-ink-dim text-[13px] mb-8">
        Select several videos at once. They share the settings below — client, category, year, visibility, and
        compression — and each gets an auto-generated thumbnail and an editable title. Files process one at a time.
      </p>

      <div className="border border-border p-5 mb-6 space-y-5">
        <div>
          <p className="text-[12px] text-ink-dim mb-1.5">Add video files</p>
          <input
            type="file"
            multiple
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
            disabled={running}
            onChange={(e) => {
              handleFilesSelected(e.target.files)
              e.target.value = ''
            }}
            className="w-full text-sm text-ink-dim file:mr-3 file:py-2 file:px-3 file:border file:border-border file:bg-surface file:text-ink file:text-[13px]"
          />
          {maxVideoMb && <p className="text-ink-faint text-[11px] mt-1">Limit: {maxVideoMb} MB per video (set in Portfolio Settings)</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-ink-dim mb-1.5">Client (default for all)</p>
            <input
              value={client}
              disabled={running}
              onChange={(e) => setClient(e.target.value)}
              placeholder="e.g. Rinnai Malaysia"
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            />
          </div>
          <div>
            <p className="text-[12px] text-ink-dim mb-1.5">Category</p>
            <select
              value={categoryId}
              disabled={running}
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[12px] text-ink-dim mb-1.5">Year</p>
            <input
              type="number"
              value={year}
              disabled={running}
              onChange={(e) => setYear(e.target.value)}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            />
          </div>
          <div>
            <p className="text-[12px] text-ink-dim mb-1.5">Visibility</p>
            <select
              value={visibility}
              disabled={running}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full bg-surface border border-border px-3 py-2.5 text-ink text-sm focus:border-brass outline-none"
            >
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="private">Private</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6 text-[13px] text-ink-dim">
            <input type="checkbox" checked={featured} disabled={running} onChange={(e) => setFeatured(e.target.checked)} />
            Featured
          </label>
        </div>

        <div>
          <p className="text-[12px] text-ink-dim mb-1.5">Compression (applies to every file)</p>
          <div className="grid grid-cols-2 gap-2">
            {(['original', 'high', 'medium', 'web'] as CompressionPreset[]).map((p) => (
              <button
                type="button"
                key={p}
                disabled={running}
                onClick={() => setPreset(p)}
                className={`text-left px-3 py-2.5 border text-[13px] transition-colors ${
                  preset === p ? 'border-brass text-ink bg-surface-2' : 'border-border text-ink-dim hover:text-ink'
                }`}
              >
                {p === 'original' ? 'Original' : COMPRESSION_PRESETS[p].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="border border-border divide-y divide-border mb-6">
          {items.map((item) => (
            <div key={item.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <input
                  value={item.title}
                  disabled={running || item.status !== 'queued'}
                  onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  className="w-full bg-transparent text-ink text-[14px] outline-none border-b border-transparent focus:border-brass mb-1"
                />
                <p className="text-ink-faint text-[11px]">
                  {item.file.name} · {fmtSize(item.file.size)}
                </p>
                {(item.status === 'compressing' || item.status === 'uploading') && (
                  <div className="h-1 bg-surface-2 mt-2 w-48">
                    <div
                      className="h-full bg-brass transition-all"
                      style={{ width: `${Math.round(item.progress * 100)}%` }}
                    />
                  </div>
                )}
                {item.status === 'error' && <p className="text-danger text-[12px] mt-1">{item.error}</p>}
              </div>
              <span
                className={`text-[12px] shrink-0 ${
                  item.status === 'done'
                    ? 'text-ok'
                    : item.status === 'error'
                      ? 'text-danger'
                      : item.status === 'queued'
                        ? 'text-ink-faint'
                        : 'text-brass'
                }`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              {!running && item.status !== 'done' && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-ink-faint hover:text-danger transition-colors text-[12px] shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[12px] text-ink-dim mb-1.5">
            <span>
              {doneCount} / {items.length} processed
            </span>
            <span>{Math.round(overallProgress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-surface-2">
            <div className="h-full bg-brass transition-all" style={{ width: `${Math.round(overallProgress * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="flex-1 bg-ink text-bg text-sm py-3 hover:bg-brass transition-colors disabled:opacity-50"
        >
          {running ? 'Uploading…' : `Upload ${items.length || ''} ${items.length === 1 ? 'File' : 'Files'}`}
        </button>
        {allDone && (
          <button
            onClick={() => navigate('/admin/projects')}
            className="px-5 border border-border text-ink text-sm hover:border-brass transition-colors"
          >
            View Projects
          </button>
        )}
      </div>

      {!categoryId && items.length > 0 && (
        <p className="text-ink-faint text-[12px] mt-3">Choose a category and client before starting the upload.</p>
      )}
    </div>
  )
}
