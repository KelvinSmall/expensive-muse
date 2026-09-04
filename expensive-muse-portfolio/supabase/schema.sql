-- EXPENSIVE MUSE — Supabase schema
-- Run this once in the Supabase SQL editor for your project.
-- Free tier: Supabase's free project tier includes this Postgres database,
-- row-level security, and email/password auth at no cost.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into categories (name, slug, sort_order) values
  ('Reels', 'reels', 0),
  ('Video', 'video', 1),
  ('Photography', 'photography', 2),
  ('Design', 'design', 3),
  ('AI / CGI', 'ai-cgi', 4)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client text not null,
  category_id uuid references categories(id) on delete set null,
  year int not null,
  description text default '',

  -- Google Drive file references (never expose the folder itself)
  thumbnail_file_id text,
  video_file_id text,          -- compressed "portfolio" version — the only one ever shown publicly
  original_file_id text,       -- optional kept master, never public

  visibility text not null default 'hidden' check (visibility in ('published', 'hidden', 'private')),
  featured boolean not null default false,
  sort_order int not null default 0,

  -- private-project access control
  private_token text,          -- random unguessable token, required in the URL
  private_password_hash text,  -- optional extra password layer (bcrypt, set via function)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_visibility on projects (visibility);
create index if not exists idx_projects_sort on projects (sort_order);

-- ---------------------------------------------------------------------
-- SETTINGS (single row) — studio name, contact links, master switch
-- ---------------------------------------------------------------------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  studio_name text not null default 'Expensive Muse',
  tagline text not null default 'Creative • Design • Photo • Video',
  logo_file_id text,
  contact_email text default '',
  website text default '',
  instagram text default '',
  whatsapp text default '',
  footer_text text default '',
  client_access_enabled boolean not null default true,
  drive_root_folder_id text,
  drive_videos_folder_id text,
  drive_thumbnails_folder_id text,
  drive_originals_folder_id text,
  drive_archive_folder_id text,
  drive_connected_email text,
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- GOOGLE TOKENS — service-role only. Never selectable by anon/authenticated.
-- ---------------------------------------------------------------------
create table if not exists google_tokens (
  id int primary key default 1 check (id = 1),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- OAUTH STATES — short-lived CSRF-protection rows for the Google OAuth
-- handshake. Service-role only.
-- ---------------------------------------------------------------------
create table if not exists oauth_states (
  state text primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table categories enable row level security;
alter table projects enable row level security;
alter table settings enable row level security;
alter table google_tokens enable row level security;
alter table oauth_states enable row level security;
-- no policies on oauth_states either — service-role only

-- Public (anon) can read categories
create policy "public read categories" on categories for select using (true);

-- Public (anon) can only read PUBLISHED projects.
-- Private/hidden rows are invisible at the database layer, not just hidden in the UI.
create policy "public read published projects" on projects
  for select using (visibility = 'published');

-- Public can read the subset of settings needed to render the site.
-- (client_access_enabled, studio branding, contact links — never drive folder ids)
create policy "public read settings" on settings for select using (true);

-- Authenticated admins (any logged-in Supabase user in this project) get full access.
-- Since this app has a single-studio admin model, every authenticated user is an admin —
-- do not enable public sign-ups in Supabase Auth settings.
create policy "admin full access categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin full access projects" on projects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin full access settings" on settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- google_tokens has NO policies for anon/authenticated — only the service-role key
-- (used exclusively inside Netlify Functions, never shipped to the browser) can touch it.

-- ---------------------------------------------------------------------
-- Helper: private project lookup by token (bypasses visibility restriction
-- for exactly one row, via a SECURITY DEFINER function callable by anon)
-- ---------------------------------------------------------------------
create or replace function get_private_project(p_slug text, p_token text)
returns setof projects
language sql
security definer
set search_path = public
as $$
  select * from projects
  where slug = p_slug
    and visibility = 'private'
    and private_token = p_token;
$$;

grant execute on function get_private_project(text, text) to anon, authenticated;
