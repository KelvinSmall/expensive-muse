import type { Handler } from '@netlify/functions'
import { serviceClient } from './_shared/adminAuth'
import { findOrCreateFolder } from './_shared/driveFolders'

const SITE_URL = process.env.SITE_URL || ''

export const handler: Handler = async (event) => {
  const { code, state, error: oauthError } = event.queryStringParameters || {}
  const admin = serviceClient()

  function redirect(path: string) {
    return { statusCode: 302, headers: { Location: `${SITE_URL}${path}` } }
  }

  if (oauthError) return redirect(`/admin/drive?error=${encodeURIComponent(oauthError)}`)
  if (!code || !state) return redirect('/admin/drive?error=missing_code')

  // Validate + consume the state row (one-time use, short-lived)
  const { data: stateRow } = await admin.from('oauth_states').select('*').eq('state', state).maybeSingle()
  if (!stateRow) return redirect('/admin/drive?error=invalid_state')
  await admin.from('oauth_states').delete().eq('state', state)
  const ageMs = Date.now() - new Date(stateRow.created_at).getTime()
  if (ageMs > 10 * 60 * 1000) return redirect('/admin/drive?error=expired_state')

  try {
    // Exchange the authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) throw new Error('Token exchange failed')
    const tokens = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    // Who did we just connect to? (for display in Admin > Google Drive)
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = profileRes.ok
      ? ((await profileRes.json()) as { email: string | null })
      : { email: null }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await admin.from('google_tokens').upsert({
      id: 1,
      access_token: tokens.access_token,
      // Google only returns a refresh_token the FIRST time a user consents
      // (or when prompt=consent forces re-consent, which google-oauth-start sets).
      // Fall back to keeping the existing one if this response omits it.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })

    // Idempotently ensure the EXPENSIVE MUSE PORTFOLIO folder structure exists.
    const rootId = await findOrCreateFolder(tokens.access_token, 'EXPENSIVE MUSE PORTFOLIO', null)
    const videosId = await findOrCreateFolder(tokens.access_token, 'VIDEOS', rootId)
    const thumbsId = await findOrCreateFolder(tokens.access_token, 'THUMBNAILS', rootId)
    const originalsId = await findOrCreateFolder(tokens.access_token, 'ORIGINALS', rootId)
    const archiveId = await findOrCreateFolder(tokens.access_token, 'ARCHIVE', rootId)

    await admin
      .from('settings')
      .update({
        drive_root_folder_id: rootId,
        drive_videos_folder_id: videosId,
        drive_thumbnails_folder_id: thumbsId,
        drive_originals_folder_id: originalsId,
        drive_archive_folder_id: archiveId,
        drive_connected_email: profile.email ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    return redirect('/admin/drive?connected=1')
  } catch (err) {
    console.error(err)
    return redirect('/admin/drive?error=connection_failed')
  }
}
