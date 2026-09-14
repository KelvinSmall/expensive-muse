import type { Handler } from '@netlify/functions'
import { requireAdmin, serviceClient, getValidGoogleAccessToken, jsonResponse, errorResponse } from './_shared/adminAuth'

type DriveFolderKind = 'videos' | 'thumbnails' | 'originals' | 'archive'

const FOLDER_COLUMN: Record<DriveFolderKind, string> = {
  videos: 'drive_videos_folder_id',
  thumbnails: 'drive_thumbnails_folder_id',
  originals: 'drive_originals_folder_id',
  archive: 'drive_archive_folder_id',
}

const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'])
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Opens a Google Drive *resumable upload session* and hands the session URL
 * straight back to the browser. Our server never sees the video bytes —
 * this keeps large portfolio videos well outside Netlify Functions' request
 * size / execution time limits, at zero extra hosting cost.
 */
export const handler: Handler = async (event) => {
  try {
    await requireAdmin(event)
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

    const body = JSON.parse(event.body || '{}') as {
      fileName?: string
      mimeType?: string
      folder?: DriveFolderKind
    }
    const { fileName, mimeType, folder } = body

    if (!fileName || !mimeType || !folder || !FOLDER_COLUMN[folder]) {
      return jsonResponse(400, { error: 'fileName, mimeType and a valid folder are required' })
    }

    const isVideo = folder === 'videos' || folder === 'originals'
    const allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES
    if (!allowed.has(mimeType)) {
      return jsonResponse(400, { error: `File type ${mimeType} is not allowed for ${folder}` })
    }
    // basic filename sanitisation — no path traversal, no control characters
    const safeName = fileName.replace(/[/\\]/g, '-').replace(/[\x00-\x1f]/g, '').slice(0, 200)

    const accessToken = await getValidGoogleAccessToken()
    const admin = serviceClient()
    const { data: settings } = await admin.from('settings').select('*').eq('id', 1).single()
    const folderId = settings?.[FOLDER_COLUMN[folder]]
    if (!folderId) {
      return jsonResponse(409, { error: 'Google Drive folders are not set up yet — reconnect Drive in Admin settings.' })
    }

    // Google only enables CORS on the resulting upload session for the exact
    // Origin present on THIS request. Since this call happens server-side
    // (not from the browser), we must forward the site's real origin
    // ourselves — otherwise the browser's later PUT to the session URL gets
    // silently blocked by CORS even though the upload technically succeeds.
    const siteOrigin =
      event.headers.origin ||
      process.env.SITE_URL ||
      (event.headers.host ? `https://${event.headers.host}` : undefined)

    const sessionRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType,
          ...(siteOrigin ? { Origin: siteOrigin } : {}),
        },
        body: JSON.stringify({ name: safeName, parents: [folderId] }),
      }
    )

    if (!sessionRes.ok) {
      const text = await sessionRes.text().catch(() => '')
      console.error('Drive session init failed', sessionRes.status, text)
      return jsonResponse(502, { error: 'Google Drive rejected the upload request' })
    }

    const uploadUrl = sessionRes.headers.get('location')
    if (!uploadUrl) return jsonResponse(502, { error: 'Google Drive did not return an upload session' })

    return jsonResponse(200, { uploadUrl })
  } catch (err) {
    return errorResponse(err)
  }
}
