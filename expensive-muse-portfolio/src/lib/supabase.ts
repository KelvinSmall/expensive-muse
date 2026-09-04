import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Fails loudly in dev rather than silently rendering a broken app.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.'
  )
}

// This is the browser (anon) client. It can only ever do what the RLS
// policies in supabase/schema.sql allow — it never sees the service-role
// key, which lives only in Netlify Functions' environment variables.
export const supabase = createClient(url, anonKey)
