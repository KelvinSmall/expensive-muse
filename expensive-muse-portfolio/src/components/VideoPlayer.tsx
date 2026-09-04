import { driveEmbedUrl } from '../lib/drive'

/**
 * Plays a published portfolio video via Google Drive's own embedded player.
 *
 * Honest limitation: Drive's /preview embed is the only free, no-server
 * streaming option here — there's no self-hosted video infrastructure to
 * pay for, but it means playback controls (scrub bar, fullscreen, volume)
 * are Google's own UI inside the iframe, not ours, and we cannot intercept
 * events *inside* that cross-origin frame. What this component does do:
 * hides the surrounding site chrome so the Drive folder is never reachable,
 * blocks right-click on the page around the player, and (server-side, at
 * publish time) turns off Drive's "download / copy" permission on the file
 * itself. None of this stops screen recording — nothing can — it only
 * removes the one-click download path.
 */
export default function VideoPlayer({ fileId, title }: { fileId: string; title: string }) {
  return (
    <div
      className="relative w-full aspect-video bg-black select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        key={fileId}
        src={driveEmbedUrl(fileId)}
        title={title}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    </div>
  )
}
