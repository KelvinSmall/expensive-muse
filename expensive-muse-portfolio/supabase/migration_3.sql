-- EXPENSIVE MUSE — migration 3
-- Run in the Supabase SQL editor after migration_2.sql.

-- ---------------------------------------------------------------------
-- Real dimensions of the uploaded media, captured client-side at upload
-- time. Used to size each display box to the exact original aspect
-- ratio, so nothing is ever auto-cropped — a portrait reel stays tall,
-- a landscape one stays wide, a square photo stays square.
-- ---------------------------------------------------------------------
alter table projects add column if not exists media_width int;
alter table projects add column if not exists media_height int;

-- Parallel arrays to gallery_file_ids (same order, same length) so each
-- image in a photo/design gallery keeps its own natural ratio too.
alter table projects add column if not exists gallery_widths int[] not null default '{}';
alter table projects add column if not exists gallery_heights int[] not null default '{}';
