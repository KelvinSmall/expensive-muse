import type { Handler } from '@netlify/functions'
import { requireAdmin, getValidGoogleAccessToken, jsonResponse, errorResponse } from './_shared/adminAuth'

/**
 * Makes the given Drive file IDs viewable via link (anyone with the link,
 * via our own embedded player only — we never post the raw Drive link
 * anywhere).
 *
 * Disclosed limitation, now confirmed in practice: Google Drive's
 * `viewersCanCopyContent: false` / `copyRequiresWriterPermission: true`
 * download-restriction settings break the public `/preview` embed for
 * anonymous "anyone with the link" viewers — Drive forces them through a
 * sign-in wall instead of showing the file, which looks like the video is
 * broken. Since a working portfolio matters more than a soft download
 * deterrent (and neither setting stops real copying like screen recording
 * anyway), this function only sets sharing to "anyone with the link, view
 * only" and leaves Drive's copy/download UI at its default. The real
 * protection that remains: the studio's Drive folder itself is never
 * exposed, and the public site never prints a raw drive.google.com link.
 */
export const handler: Handler = async (event) => {
  try {
    await requireAdmin(event)
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

    const { fileIds } = JSON.parse(event.body || '{}') as { fileIds?: string[] }
    if (!fileIds?.length) return jsonResponse(400, { error: 'fileIds required' })

    const accessToken = await getValidGoogleAccessToken()
    const results: Record<string, boolean> = {}

    for (const fileId of fileIds) {
      // Anyone-with-link, read-only. This is the only permission change
      // applied — see the note above for why the copy/download restriction
      // that used to run here was removed.
      const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      })
      results[fileId] = permRes.ok
    }

    return jsonResponse(200, { results })
  } catch (err) {
    return errorResponse(err)
  }
}
