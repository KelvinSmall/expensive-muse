export type Visibility = 'published' | 'hidden' | 'private'
export type MediaType = 'video' | 'gallery'

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
  hidden: boolean
}

export interface Project {
  id: string
  slug: string
  title: string
  client: string
  category_id: string | null
  year: number
  description: string
  media_type: MediaType
  thumbnail_file_id: string | null
  video_file_id: string | null
  original_file_id: string | null
  gallery_file_ids: string[]
  media_width: number | null
  media_height: number | null
  gallery_widths: number[]
  gallery_heights: number[]
  visibility: Visibility
  featured: boolean
  sort_order: number
  private_token: string | null
  private_password_hash: string | null
  created_at: string
  updated_at: string
  // joined client-side, not a real column
  category?: Category | null
}

export interface Settings {
  id: 1
  studio_name: string
  tagline: string
  logo_file_id: string | null
  contact_email: string
  website: string
  instagram: string
  whatsapp: string
  footer_text: string
  client_access_enabled: boolean
  drive_root_folder_id: string | null
  drive_videos_folder_id: string | null
  drive_thumbnails_folder_id: string | null
  drive_originals_folder_id: string | null
  drive_archive_folder_id: string | null
  drive_connected_email: string | null
  max_video_size_mb: number
  max_image_size_mb: number
}

export type CompressionPreset = 'original' | 'high' | 'medium' | 'web'

export const COMPRESSION_PRESETS: Record<
  Exclude<CompressionPreset, 'original'>,
  { label: string; crf: number; maxHeight: number; audioBitrate: string; description: string }
> = {
  high: {
    label: 'High Quality',
    crf: 20,
    maxHeight: 1080,
    audioBitrate: '192k',
    description: 'High visual quality — suitable for premium portfolio viewing',
  },
  medium: {
    label: 'Medium — Recommended',
    crf: 26,
    maxHeight: 1080,
    audioBitrate: '128k',
    description: 'Best balance of quality and file size',
  },
  web: {
    label: 'Web',
    crf: 30,
    maxHeight: 720,
    audioBitrate: '96k',
    description: 'Smaller file, optimized for fast web/mobile viewing',
  },
}

/** Drive-side folder that a given kind of file belongs in. */
export type DriveFolderKind = 'videos' | 'thumbnails' | 'originals' | 'archive'
