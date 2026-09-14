/**
 * Reads a file's true pixel dimensions before it's ever uploaded, so the
 * portfolio can size each display box to the exact original aspect ratio
 * instead of force-cropping everything into a fixed 16:9 or square box.
 */
export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image dimensions'))
    }
    img.src = url
  })
}

export function getVideoDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight })
      URL.revokeObjectURL(url)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video dimensions'))
    }
    video.src = url
  })
}
