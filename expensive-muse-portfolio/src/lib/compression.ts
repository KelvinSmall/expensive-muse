import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { COMPRESSION_PRESETS, type CompressionPreset } from './types'

// Single-threaded core deliberately — the multi-threaded core (@ffmpeg/core-mt)
// spawns worker threads that can get stuck in a restart loop on some
// browser/network combinations, hanging forever with no error. The
// single-threaded core has a simpler load path (no separate worker file,
// no SharedArrayBuffer dependency) and is the reliable choice here; it's
// somewhat slower per file, but "finishes" beats "fast but sometimes never
// finishes" for a tool people depend on.
const FFMPEG_CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
const LOAD_TIMEOUT_MS = 30_000
const EXEC_TIMEOUT_MS = 6 * 60_000

let ffmpegSingleton: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/**
 * Loads ffmpeg.wasm once and reuses it for every upload in the session.
 * This is real WebAssembly ffmpeg, not a filename trick.
 *
 * The @ffmpeg/* packages are dynamically imported here rather than at the
 * top of the file. They're only ever used from admin upload pages — a
 * public site visitor should never pay for downloading a video transcoder
 * they can't use. Static imports would bundle it into every page's code.
 */
async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegSingleton) return ffmpegSingleton
  if (loadingPromise) return loadingPromise

  loadingPromise = withTimeout(
    (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import('@ffmpeg/ffmpeg'), import('@ffmpeg/util')])
      const ffmpeg = new FFmpeg()
      if (onLog) ffmpeg.on('log', ({ message }) => onLog(message))
      const coreURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript')
      const wasmURL = await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm')
      await ffmpeg.load({ coreURL, wasmURL })
      ffmpegSingleton = ffmpeg
      return ffmpeg
    })(),
    LOAD_TIMEOUT_MS,
    'The video engine took too long to load — check your connection and try again.'
  )

  // If loading fails or times out, forget the stuck promise so the next
  // attempt starts fresh instead of reusing a dead one forever.
  loadingPromise.catch(() => {
    loadingPromise = null
  })

  return loadingPromise
}

let fetchFileFn: ((file: File) => Promise<Uint8Array>) | null = null
async function getFetchFile() {
  if (!fetchFileFn) {
    const { fetchFile } = await import('@ffmpeg/util')
    fetchFileFn = fetchFile
  }
  return fetchFileFn
}

export interface CompressionResult {
  blob: Blob
  fileName: string
}

/**
 * Actually transcodes the file in-browser via WebAssembly ffmpeg according
 * to the chosen preset. Returns a real, smaller MP4 — never just a renamed copy.
 */
export async function compressVideo(
  file: File,
  preset: Exclude<CompressionPreset, 'original'>,
  onProgress: (ratio: number) => void
): Promise<CompressionResult> {
  const cfg = COMPRESSION_PRESETS[preset]
  const ffmpeg = await getFFmpeg()

  ffmpeg.on('progress', ({ progress }) => {
    // progress is 0..1 but occasionally spikes past 1 near the end
    onProgress(Math.min(Math.max(progress, 0), 1))
  })

  const inputName = 'input' + extOf(file.name)
  const outputName = 'output.mp4'

  await ffmpeg.writeFile(inputName, await (await getFetchFile())(file))

  await withTimeout(
    ffmpeg.exec([
      '-i', inputName,
      '-vf', `scale=-2:'min(${cfg.maxHeight},ih)'`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', String(cfg.crf),
      '-c:a', 'aac',
      '-b:a', cfg.audioBitrate,
      '-movflags', '+faststart',
      outputName,
    ]),
    EXEC_TIMEOUT_MS,
    'Compression is taking much longer than expected and was stopped. Try the "Web" preset for a lighter job, or "Original" to skip compression entirely.'
  )

  const data = await ffmpeg.readFile(outputName)
  const blob = new Blob([toArrayBuffer(data as Uint8Array)], { type: 'video/mp4' })

  // free wasm FS memory for this job
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)

  return { blob, fileName: renameToMp4(file.name, preset) }
}

/** Grabs a frame at ~1s in as a JPEG thumbnail, for "Generate thumbnail from video". */
export async function generateThumbnail(file: File): Promise<Blob> {
  const ffmpeg = await getFFmpeg()
  const inputName = 'thumb-src' + extOf(file.name)
  const outputName = 'thumb.jpg'
  await ffmpeg.writeFile(inputName, await (await getFetchFile())(file))
  await withTimeout(
    ffmpeg.exec(['-i', inputName, '-ss', '00:00:01', '-frames:v', '1', '-q:v', '3', outputName]),
    30_000,
    'Generating the thumbnail took too long. Please upload one manually instead.'
  )
  const data = await ffmpeg.readFile(outputName)
  await ffmpeg.deleteFile(inputName)
  await ffmpeg.deleteFile(outputName)
  return new Blob([toArrayBuffer(data as Uint8Array)], { type: 'image/jpeg' })
}

export function estimateCompressedSize(originalBytes: number, preset: CompressionPreset): { low: number; high: number } {
  // Rough, disclosed-as-approximate ranges based on typical CRF outcomes.
  // We deliberately never promise an exact number — actual result depends on source content.
  const ratios: Record<CompressionPreset, [number, number]> = {
    original: [1, 1],
    high: [0.45, 0.65],
    medium: [0.2, 0.35],
    web: [0.08, 0.18],
  }
  const [lo, hi] = ratios[preset]
  return { low: originalBytes * lo, high: originalBytes * hi }
}

// ffmpeg.wasm's multi-threaded core can back its buffers with a
// SharedArrayBuffer, which TS's Blob constructor type doesn't accept even
// though it works fine at runtime — copy into a plain ArrayBuffer-backed
// view so the types (and Safari, which is stricter here) are both happy.
function toArrayBuffer(u8: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(u8.byteLength))
  copy.set(u8)
  return copy
}

function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i) : '.mp4'
}

function renameToMp4(name: string, preset: string) {
  const base = name.replace(/\.[^.]+$/, '')
  return `${base}-${preset}.mp4`
}
