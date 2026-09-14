import { supabase } from './supabase'
import type { Category, MediaType, Project, Settings, Visibility } from './types'

// -----------------------------------------------------------------------
// SETTINGS
// -----------------------------------------------------------------------
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data as Settings
}

export async function updateSettings(patch: Partial<Settings>) {
  const { error } = await supabase
    .from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}

export async function setClientAccess(enabled: boolean) {
  return updateSettings({ client_access_enabled: enabled })
}

// -----------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order')
  if (error) throw error
  return data as Category[]
}

export async function createCategory(name: string) {
  const slug = slugify(name)
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug, sort_order: 999 })
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function renameCategory(id: string, name: string) {
  const { error } = await supabase.from('categories').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function reorderCategories(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) => supabase.from('categories').update({ sort_order: i }).eq('id', id))
  )
}

export async function setCategoryHidden(id: string, hidden: boolean) {
  const { error } = await supabase.from('categories').update({ hidden }).eq('id', id)
  if (error) throw error
}

// -----------------------------------------------------------------------
// PROJECTS
// -----------------------------------------------------------------------

/** Public grid: only published projects, featured first, then by sort order. */
export async function listPublishedProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, category:categories(*)')
    .eq('visibility', 'published')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as unknown as Project[]
}

export async function getPublishedProjectBySlug(slug: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, category:categories(*)')
    .eq('slug', slug)
    .eq('visibility', 'published')
    .maybeSingle()
  if (error) throw error
  return data as unknown as Project | null
}

/** Private project: only reachable with the exact slug + token pair (see get_private_project SQL fn). */
export async function getPrivateProject(slug: string, token: string): Promise<Project | null> {
  const { data, error } = await supabase.rpc('get_private_project', { p_slug: slug, p_token: token })
  if (error) throw error
  const row = (data as Project[])?.[0] ?? null
  return row
}

/** Admin: every project regardless of visibility. */
export async function listAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*, category:categories(*)')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as unknown as Project[]
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single()
  if (error) throw error
  return data as Project
}

export interface CreateProjectInput {
  title: string
  client: string
  category_id: string | null
  year: number
  description: string
  visibility: Visibility
  featured: boolean
  media_type: MediaType
  thumbnail_file_id: string | null
  video_file_id: string | null
  original_file_id: string | null
  gallery_file_ids: string[]
  media_width: number | null
  media_height: number | null
  gallery_widths: number[]
  gallery_heights: number[]
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const slug = await uniqueSlug(`${input.client}-${input.title}`)
  const isPrivate = input.visibility === 'private'
  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...input,
      slug,
      sort_order: 999,
      private_token: isPrivate ? cryptoRandomToken() : null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, patch: Partial<Project>) {
  const { error } = await supabase
    .from('projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function setVisibility(id: string, visibility: Visibility) {
  const patch: Partial<Project> = { visibility }
  if (visibility === 'private') {
    // ensure a token exists the first time a project becomes private
    const project = await getProject(id)
    if (!project.private_token) patch.private_token = cryptoRandomToken()
  }
  await updateProject(id, patch)
}

export async function setFeatured(id: string, featured: boolean) {
  await updateProject(id, { featured })
}

export async function reorderProjects(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, i) => supabase.from('projects').update({ sort_order: i }).eq('id', id))
  )
}

export type DeleteDriveAction = 'remove' | 'archive' | 'keep'

/**
 * Deletes the portfolio record. What happens to the underlying Drive files
 * is controlled separately by the caller (see netlify/functions/drive-delete.ts) —
 * this function only ever touches the database row, so a DB-only failure
 * can never orphan-delete a video from Drive and vice versa.
 */
export async function deleteProjectRecord(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function searchProjects(query: string): Promise<Project[]> {
  const q = `%${query}%`
  const { data, error } = await supabase
    .from('projects')
    .select('*, category:categories(*)')
    .or(`title.ilike.${q},client.ilike.${q}`)
    .order('sort_order')
  if (error) throw error
  return data as unknown as Project[]
}

// -----------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function uniqueSlug(base: string) {
  const root = slugify(base) || 'project'
  let slug = root
  let n = 1
  // small, bounded loop — good enough for a single-studio catalogue
  while (n < 50) {
    const { data } = await supabase.from('projects').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    n += 1
    slug = `${root}-${n}`
  }
  return `${root}-${Date.now()}`
}

function cryptoRandomToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
