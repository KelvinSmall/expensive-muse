import type { Handler } from '@netlify/functions'
import { requireAdmin, serviceClient, jsonResponse, errorResponse } from './_shared/adminAuth'

/**
 * Disconnects Google Drive. This only forgets the stored tokens on our side —
 * it does not touch anything in the studio's Drive account. Existing
 * published projects keep their file references and will work again the
 * moment Drive is reconnected; nothing is deleted.
 */
export const handler: Handler = async (event) => {
  try {
    await requireAdmin(event)
    const admin = serviceClient()

    const { data: tokenRow } = await admin.from('google_tokens').select('access_token').eq('id', 1).maybeSingle()
    if (tokenRow?.access_token) {
      // Best-effort revoke with Google too, so the studio's Google Account
      // "Third-party access" page also shows it as disconnected.
      await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.access_token}`, { method: 'POST' }).catch(
        () => {}
      )
    }

    await admin.from('google_tokens').delete().eq('id', 1)
    await admin
      .from('settings')
      .update({
        drive_connected_email: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
    return jsonResponse(200, { disconnected: true })
  } catch (err) {
    return errorResponse(err)
  }
}
