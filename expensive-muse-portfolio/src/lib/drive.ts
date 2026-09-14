import { supabase } from './supabase'
import type { DriveFolderKind } from './types'

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  return { Authorization: `Bearer ${token}` }
}

export interface DriveStatus {
  connected: boolean
  email: string | null
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const res = await fetch('/.netlify/functions/drive-status', { headers: await authHeader() })
  if (!res.ok) throw new Error('Failed to check Drive connection')
  return res.json()
}

/** Kicks off the Google OAuth consent flow by redirecting the browser. */
export async function connectGoogleDrive() {
  const headers = await authHeader()
  const res = await fetch('/.netlify/functions/google-oauth-start', { headers })
  if (!res.ok) throw new Error('Could not start Google connection')
  const { url } = await res.json()
  window.location.href = url
}

export async function disconnectGoogleDrive() {
  const res = await fetch('/.netlify/functions/drive-disconnect', {
    method: 'POST',
    headers: await authHeader(),
  })
  if (!res.ok) throw new Error('Failed to disconnect Google Drive')
}

/**
 * Step 1 of a large-file upload: ask the server (which holds the refresh token)
 * to open a Google Drive *resumable upload session* and hand back the session
 * URL. The actual bytes never pass through our server — this keeps big video
 * uploads working within Netlify Functions' small request/response limits and
 * avoids paying for bandwidth twice.
 */
export async function initDriveUpload(opts: {
  fileName: string
  mimeType: string
  folder: DriveFolderKind
}): Promise<{ uploadUrl: string }> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' }
  const res = await fetch('/.netlify/functions/drive-upload-init', {
    method: 'POST',
    headers,
    body: JSON.stringify(opts),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Failed to start upload')
  return res.json()
}

/**
 * Step 2: PUT the file (or chunks of it) directly to the Google-issued
 * resumable session URL from the browser. onProgress receives 0..1.
 */
export async function uploadToDriveSession(
  uploadUrl: string,
  blob: Blob,
  onProgress: (ratio: number) => void
): Promise<{ fileId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText)
          resolve({ fileId: body.id })
        } catch {
          reject(new Error('Unexpected response from Google Drive'))
        }
      } else {
        reject(new Error(`Google Drive upload failed (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error while uploading to Google Drive'))
    xhr.send(blob)
  })
}

/** After a project is published, mark its Drive files link-viewable but non-downloadable. */
export async function publishDriveFiles(fileIds: string[]) {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' }
  const res = await fetch('/.netlify/functions/drive-publish-files', {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileIds }),
  })
  if (!res.ok) throw new Error('Failed to publish files to the portfolio')
}

export type DriveDeleteAction = 'remove' | 'archive' | 'keep'

export async function handleDriveOnDelete(fileIds: string[], action: DriveDeleteAction) {
  if (action === 'keep' || fileIds.length === 0) return
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' }
  const res = await fetch('/.netlify/functions/drive-delete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileIds, action }),
  })
  if (!res.ok) throw new Error('Failed to update Google Drive files')
}

/** Embeddable, download-restricted preview URL for a published Drive video. */
export function driveEmbedUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/preview`
}

/** Direct (non-embed) thumbnail image URL for a published Drive image.
 *  Google serves a resized JPEG at this exact width — pass a smaller width
 *  for grid thumbnails so slow connections don't download a full-res image
 *  just to show a small card. */
export function driveThumbUrl(fileId: string, width = 800) {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`
}
