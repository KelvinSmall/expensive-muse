import type { Handler } from '@netlify/functions'
import { requireAdmin, serviceClient, jsonResponse, errorResponse } from './_shared/adminAuth'

export const handler: Handler = async (event) => {
  try {
    await requireAdmin(event)
    const admin = serviceClient()
    const { data: tokenRow } = await admin.from('google_tokens').select('refresh_token').eq('id', 1).maybeSingle()
    const { data: settings } = await admin
      .from('settings')
      .select('drive_connected_email, drive_root_folder_id')
      .eq('id', 1)
      .maybeSingle()

    const connected = Boolean(tokenRow?.refresh_token && settings?.drive_root_folder_id)
    return jsonResponse(200, { connected, email: settings?.drive_connected_email ?? null })
  } catch (err) {
    return errorResponse(err)
  }
}
