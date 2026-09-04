# Expensive Muse — Client Portfolio System

A two-sided portfolio app for a creative studio:

- **Public portfolio** (`/`) — a cinematic, dark, minimal grid of published work. Category filters, individual project URLs, private client-only links, and a master online/offline switch.
- **Admin dashboard** (`/admin`) — add a reel, choose a compression preset, upload a thumbnail, and publish. The video is compressed *in the browser*, uploaded straight to your own Google Drive, and the project appears on the public site — without ever opening Google Drive yourself.

Everything runs on free tiers: **Netlify** (hosting + serverless functions), **Supabase** (database + admin login, free project tier), and **your existing Google Drive** (storage). No monthly subscription for the app itself.

---

## How it works

| Piece | Technology | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | Fast, static, deploys free on Netlify |
| Database | Supabase Postgres (free tier) | Project/category/settings metadata only — never video files |
| Admin login | Supabase Auth (free tier) | No passwords in frontend code; real sessions |
| Video storage | Your Google Drive | You already have it; no extra storage cost |
| Video compression | ffmpeg.wasm (in-browser) | Real WebAssembly transcoding, no paid video server |
| Serverless logic | Netlify Functions | OAuth handshake, Drive session brokering, permission changes |

**Upload flow, step by step:** the browser compresses the video with ffmpeg.wasm → asks a Netlify Function to open a Google Drive *resumable upload session* (the function holds your Drive access token, so this is the only step that ever needs it) → the browser then uploads the compressed file **directly to Google**, not through Netlify, which is what keeps large videos working within Netlify Functions' small payload limits at zero extra cost → the project record is saved to Supabase → the function flips the Drive file's sharing permission to "anyone with the link, no download" and publishes it.

## Honest limitations

- **Video playback uses Google Drive's own embedded player** (`drive.google.com/file/d/…/preview`). There's no paid video-hosting budget here, so this is the best free option. It means the play/pause/volume/fullscreen controls are Google's UI inside an iframe, not custom-built ones — and, as with any web video, nothing (ours or anyone else's) can stop screen recording. What this app does do: keeps your Drive folder itself private, turns off the one-click "download" affordance on published files, and never exposes a raw Drive folder link.
- **ffmpeg.wasm compression happens in the visitor's — i.e. your — browser**, so it uses your computer's CPU and takes real time for large files (a few minutes for a typical reel). There's no way around this without a paid transcoding server.
- **Netlify's free tier** has monthly limits on function invocations and bandwidth, generous for a single-studio portfolio but worth knowing about if traffic grows a lot.
- **Supabase's free tier** pauses a project after a week of no API activity; the first request after a pause takes a few extra seconds to wake it back up.

---

## Deploying it

### 1. Supabase (database + admin login)
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run everything in `supabase/schema.sql`.
3. Go to **Authentication > Users** and manually add yourself (email + password) — this becomes your admin login. Turn off public sign-ups under Authentication settings, since this app treats every authenticated user as an admin.
4. Copy your Project URL, anon public key, and service role key from **Project Settings > API**.

### 2. Google Cloud (Drive access)
1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. **APIs & Services > Library** → enable the **Google Drive API**.
3. **APIs & Services > OAuth consent screen** → set it up (External is fine; add your own Google account as a test user while in testing mode).
4. **APIs & Services > Credentials > Create Credentials > OAuth client ID** → Web application.
5. Add an **Authorized redirect URI**: `https://YOUR-SITE.netlify.app/.netlify/functions/google-oauth-callback` (you'll know your Netlify URL after step 3, then come back and add this).
6. Copy the Client ID and Client Secret.

### 3. Netlify
1. Push this project to a GitHub repo, then **Add new site > Import an existing project** in Netlify and connect it. (Netlify auto-detects `netlify.toml`.)
2. Add environment variables under **Site configuration > Environment variables** — use `.env.example` as the checklist.
3. Deploy. Once you have your `https://….netlify.app` URL, go back to Google Cloud and finish the redirect URI from step 2.5, then set `SITE_URL` and `GOOGLE_REDIRECT_URI` in Netlify to match exactly and redeploy.

### 4. First run
1. Visit `/admin/login` and sign in with the Supabase user you created.
2. Go to **Google Drive** in the sidebar and click **Connect Google Drive** — this creates the `EXPENSIVE MUSE PORTFOLIO` folder structure in your Drive automatically.
3. Click **Add New Reel**, choose a video, pick a compression preset, add a thumbnail and details, and **Upload & Publish**.
4. Visit `/` — your reel is live.

Custom domain, if you want one: **Domain management** in Netlify, point your DNS, done — no code changes.

---

## Project structure

```
src/
  pages/public/     Home, ProjectPage, PrivateProject, NotFound
  pages/admin/       Login, Dashboard, AddReel, EditProject, ManageProjects,
                      Categories, Settings, GoogleDrivePage, AdminLayout
  components/        Nav, ProjectCard, VideoPlayer, EmptyState
  lib/               supabase client, api.ts (DB calls), drive.ts (Drive calls),
                      compression.ts (ffmpeg.wasm), auth.tsx, types.ts
netlify/functions/
  google-oauth-start.ts / google-oauth-callback.ts   OAuth handshake
  drive-upload-init.ts                                opens a resumable upload session
  drive-publish-files.ts                               sets sharing + download restrictions
  drive-delete.ts                                      remove/archive on project deletion
  drive-status.ts / drive-disconnect.ts
  _shared/adminAuth.ts     verifies the caller is a logged-in admin; refreshes Drive tokens
  _shared/driveFolders.ts  idempotent "find or create folder" helper
supabase/schema.sql   tables, row-level security policies, private-link lookup function
```

## Extending it later

The data model (`src/lib/types.ts`) already has room for what's next: more categories, additional admin users (Supabase Auth supports multiple), analytics, contact forms, before/after comparisons, multiple videos or an image gallery per project — each is an additive schema change plus a new field on the existing upload form, not a rebuild.
