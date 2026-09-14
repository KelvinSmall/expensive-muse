-- EXPENSIVE MUSE — migration 2
-- Run this in the Supabase SQL editor AFTER schema.sql. Safe to run once;
-- re-running is harmless (every statement guards against re-creation).

-- ---------------------------------------------------------------------
-- Category show/hide — lets the admin temporarily curate which categories
-- (and everything under them) the public can see, e.g. when preparing a
-- portfolio for a specific client.
-- ---------------------------------------------------------------------
alter table categories add column if not exists hidden boolean not null default false;

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (hidden = false);
-- admins still see everything via the existing "admin full access categories" policy

-- Projects under a hidden category become invisible to the public too —
-- enforced here at the database layer, not just hidden in the UI.
drop policy if exists "public read published projects" on projects;
create policy "public read published projects" on projects
  for select using (
    visibility = 'published'
    and (
      category_id is null
      or exists (select 1 from categories c where c.id = projects.category_id and c.hidden = false)
    )
  );

-- ---------------------------------------------------------------------
-- Photo / design galleries — a project can now be a set of images instead
-- of a single video. video_file_id stays null for gallery projects;
-- thumbnail_file_id is simply the first gallery image.
-- ---------------------------------------------------------------------
alter table projects add column if not exists media_type text not null default 'video'
  check (media_type in ('video', 'gallery'));
alter table projects add column if not exists gallery_file_ids text[] not null default '{}';

-- ---------------------------------------------------------------------
-- Configurable upload size limits — enforced for real in the browser
-- before any upload begins (see src/lib/api.ts / AddReel / AddGallery).
-- ---------------------------------------------------------------------
alter table settings add column if not exists max_video_size_mb int not null default 2048;
alter table settings add column if not exists max_image_size_mb int not null default 25;
