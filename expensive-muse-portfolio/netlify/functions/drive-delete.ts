import type { Handler } from '@netlify/functions'
import { requireAdmin, serviceClient, getValidGoogleAccessToken, jsonResponse, errorResponse } from './_shared/adminAuth'
import { findOrCreateFolder } from './_shared/driveFolders'

type Action = 'remove' | 'archive' | 'keep'

/**
 * Called only after the project *record* has already been deleted from the
 * database (see src/lib/api.ts deleteProjectRecord). This function only ever
 * touches Google Drive, so a failure here can never partially-delete a
 * database row, and a DB failure can never orphan-delete a Drive file.
 */
export const handler: Handler = async (event) => {
  try {
    await requireAdmin(event)
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

    const { fileIds, action } = JSON.parse(event.body || '{}') as { fileIds?: string[]; action?: Action }
    if (!fileIds?.length || !action) return jsonResponse(400, { error: 'fileIds and action required' })
    if (action === 'keep') return jsonResponse(200, { ok: true })

    const accessToken = await getValidGoogleAccessToken()

    if (action === 'remove') {
      for (const fileId of fileIds) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch(() => {})
      }
      return jsonResponse(200, { ok: true })
    }

    // archive: move into the ARCHIVE folder rather than deleting outright
    const admin = serviceClient()
    const { data: settings } = await admin.from('settings').select('*').eq('id', 1).single()
    let archiveId = settings?.drive_archive_folder_id as string | undefined
    if (!archiveId && settings?.drive_root_folder_id) {
      archiveId = await findOrCreateFolder(accessToken, 'ARCHIVE', settings.drive_root_folder_id)
      await admin.from('settings').update({ drive_archive_folder_id: archiveId }).eq('id', 1)
    }
    if (!archiveId) return jsonResponse(409, { error: 'Google Drive is not connected' })

    for (const fileId of fileIds) {
      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const file = fileRes.ok ? ((await fileRes.json()) as { parents?: string[] }) : { parents: [] as string[] }
      const removeParents = (file.parents || []).join(',')
      const params = new URLSearchParams({ addParents: archiveId, removeParents, fields: 'id' })
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {})
    }
    return jsonResponse(200, { ok: true })
  } catch (err) {
    return errorResponse(err)
  }
}
