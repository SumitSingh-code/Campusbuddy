/**
 * Compress an image File to target size (~250KB).
 * Returns a new Blob.
 */
export async function compressImage(
  file: File,
  maxWidthPx = 1200,
  targetKB = 250
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width)
          width = maxWidthPx
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        // Try quality 0.85 first, reduce if still too large
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return }
            if (blob.size > targetKB * 1024) {
              canvas.toBlob(
                (blob2) => {
                  if (blob2) resolve(blob2)
                  else resolve(blob)
                },
                'image/jpeg',
                0.7
              )
            } else {
              resolve(blob)
            }
          },
          'image/jpeg',
          0.85
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
