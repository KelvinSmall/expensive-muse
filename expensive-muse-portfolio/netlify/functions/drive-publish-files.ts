import type { Handler } from '@netlify/functions'
import { requireAdmin, getValidGoogleAccessToken, jsonResponse, errorResponse } from './_shared/adminAuth'

/**
 * Makes the given Drive file IDs viewable via link (anyone with the link,
 * via our own embedded player only — we never post the raw Drive link
 * anywhere) and, where Google's API allows it for the account type, turns
 * off the "download / print / copy" affordance in Drive's own viewer.
 *
 * Limitation (disclosed, not hidden): `copyRequiresWriterPermission` /
 * viewers-can-download restrictions are enforced by Google Drive's own
 * preview UI, not by us. A determined client can still screen-record
 * playback — nothing server-side can prevent that. This stops casual
 * right-click/download and keeps the studio's Drive folder itself private.
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
      // Anyone-with-link, read-only.
      const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      })
      // Restrict downloading/printing/copying by non-owners where supported.
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyRequiresWriterPermission: true, viewersCanCopyContent: false }),
      })
      results[fileId] = permRes.ok && metaRes.ok
    }

    return jsonResponse(200, { results })
  } catch (err) {
    return errorResponse(err)
  }
}
