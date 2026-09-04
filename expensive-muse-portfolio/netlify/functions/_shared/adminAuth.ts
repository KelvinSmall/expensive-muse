import { createClient } from '@supabase/supabase-js'
import type { HandlerEvent } from '@netlify/functions'

/**
 * A service-role Supabase client. This key bypasses row-level security and
 * must NEVER be sent to the browser — it only ever lives in Netlify's
 * function environment variables (SUPABASE_SERVICE_ROLE_KEY).
 */
export function serviceClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

/**
 * Every privileged function calls this first. It verifies the bearer token
 * the browser sent is a real, currently-valid Supabase session for a user
 * in this project — i.e. an authenticated admin. Throws (caller returns 401)
 * if not.
 */
export async function requireAdmin(event: HandlerEvent) {
  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw Object.assign(new Error('Missing Authorization header'), { statusCode: 401 })
  }
  const admin = serviceClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    throw Object.assign(new Error('Invalid or expired session'), { statusCode: 401 })
  }
  return data.user
}

/**
 * Returns a currently-valid Google Drive access token for the studio's
 * connected account, refreshing it first if it has expired. The refresh
 * token itself never leaves this function.
 */
export async function getValidGoogleAccessToken(): Promise<string> {
  const admin = serviceClient()
  const { data: row, error } = await admin.from('google_tokens').select('*').eq('id', 1).maybeSingle()
  if (error || !row || !row.refresh_token) {
    throw Object.assign(new Error('Google Drive is not connected'), { statusCode: 409 })
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0
  const stillValid = row.access_token && expiresAt - Date.now() > 60_000
  if (stillValid) return row.access_token as string

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: row.refresh_token as string,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) {
    throw Object.assign(new Error('Failed to refresh Google Drive access — please reconnect Drive in Admin settings.'), {
      statusCode: 401,
    })
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString()

  await admin
    .from('google_tokens')
    .update({ access_token: json.access_token, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
    .eq('id', 1)

  return json.access_token as string
}

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function errorResponse(err: unknown) {
  const statusCode = (err as { statusCode?: number })?.statusCode ?? 500
  const message = err instanceof Error ? err.message : 'Unexpected error'
  return jsonResponse(statusCode, { error: message })
}
