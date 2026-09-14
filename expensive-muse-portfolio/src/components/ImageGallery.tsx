import { useState } from 'react'
import { driveThumbUrl } from '../lib/drive'

/**
 * A CSS-columns "masonry" layout — each image keeps its own natural width
 * and height (no forced square/16:9 crop). Falls back to a plain square
 * grid only for galleries uploaded before dimensions were captured.
 */
export default function ImageGallery({
  fileIds,
  title,
  widths = [],
  heights = [],
}: {
  fileIds: string[]
  title: string
  widths?: number[]
  heights?: number[]
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const hasDimensions = widths.length === fileIds.length && heights.length === fileIds.length

  return (
    <>
      {hasDimensions ? (
        <div className="columns-2 md:columns-3 gap-1 md:gap-2 [&>*]:mb-1 md:[&>*]:mb-2">
          {fileIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setOpenIndex(i)}
              className="block w-full bg-surface-2 overflow-hidden break-inside-avoid group"
              style={{ aspectRatio: widths[i] && heights[i] ? `${widths[i]} / ${heights[i]}` : undefined }}
            >
              <img
                src={driveThumbUrl(id, 500)}
                alt={`${title} — image ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
          {fileIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setOpenIndex(i)}
              className="aspect-square bg-surface-2 overflow-hidden group"
            >
              <img
                src={driveThumbUrl(id, 500)}
                alt={`${title} — image ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {openIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            onClick={() => setOpenIndex(null)}
            className="absolute top-5 right-6 text-white/70 hover:text-white text-2xl"
            aria-label="Close"
          >
            ✕
          </button>
          {openIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpenIndex((i) => (i !== null ? i - 1 : i))
              }}
              className="absolute left-4 text-white/70 hover:text-white text-3xl"
              aria-label="Previous image"
            >
              ‹
            </button>
          )}
          {openIndex < fileIds.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setOpenIndex((i) => (i !== null ? i + 1 : i))
              }}
              className="absolute right-4 text-white/70 hover:text-white text-3xl"
              aria-label="Next image"
            >
              ›
            </button>
          )}
          <img
            src={driveThumbUrl(fileIds[openIndex], 1600)}
            alt={`${title} — image ${openIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </>
  )
}
