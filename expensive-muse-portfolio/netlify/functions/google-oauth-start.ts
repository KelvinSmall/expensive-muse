import type { Handler } from '@netlify/functions'
import { requireAdmin, serviceClient, jsonResponse, errorResponse } from './_shared/adminAuth'

const SCOPES = ['https://www.googleapis.com/auth/drive.file'].join(' ')

export const handler: Handler = async (event) => {
  try {
    const user = await requireAdmin(event)

    // A short-lived, single-use state value ties the callback back to this
    // specific admin session, so an attacker can't trick the callback into
    // attaching a different Google account without ever having a valid
    // admin session of their own.
    const state = crypto.randomUUID()
    const admin = serviceClient()
    await admin.from('oauth_states').insert({ state, user_id: user.id, created_at: new Date().toISOString() })

    const redirectUri = process.env.GOOGLE_REDIRECT_URI!
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    return jsonResponse(200, { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
  } catch (err) {
    return errorResponse(err)
  }
}
