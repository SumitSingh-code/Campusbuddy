/**
 * storage.ts — Image upload via server-side /api/upload endpoint.
 *
 * Uploads are sent to our Express API which uses the Supabase service-role key,
 * bypassing client-side RLS / bucket-policy issues entirely.
 *
 * The file is base64-encoded client-side before sending (avoids multipart
 * complexity in Vercel serverless functions).
 */

import { api } from './api'

async function fileToBase64(file: File | Blob): Promise<string> {
  // Try arrayBuffer first for maximum mobile performance and reliability
  if (typeof (file as Blob).arrayBuffer === 'function') {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      const len = bytes.byteLength
      const chunkSize = 8192
      for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
      }
      return btoa(binary)
    } catch (e) {
      console.warn('[storage] arrayBuffer conversion failed, falling back to FileReader:', e)
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => {
      const res = reader.result as string
      if (!res) {
        reject(new Error('File reader returned empty result'))
        return
      }
      const parts = res.split(',')
      resolve(parts[1] || parts[0])
    }
    reader.onerror = () => reject(new Error('Could not read file from storage'))
    reader.readAsDataURL(file)
  })
}

/**
 * Upload a file via the server-side /api/upload endpoint.
 * @param file   File or Blob to upload
 * @param path   Used only to determine folder prefix (e.g. 'posts/...', 'avatars/...')
 * @returns Public URL of the uploaded file
 */
export async function uploadToStorage(
  file: File | Blob,
  path: string
): Promise<string> {
  // Derive folder from path prefix
  const folder = path.startsWith('avatar')    ? 'avatars'
               : path.startsWith('notes')     ? 'notes'
               : path.startsWith('pyq')       ? 'pyq'
               : path.startsWith('timetable') ? 'timetable'
               : path.startsWith('lost-found') || path.startsWith('lostfound') ? 'lost-found'
               : 'posts'

  let mime = file instanceof File ? file.type : 'image/jpeg'
  const fileName = file instanceof File ? file.name : ''
  if (!mime || mime === 'application/octet-stream') {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf' || folder === 'pyq' || path.startsWith('pyq')) mime = 'application/pdf'
    else if (['jpg', 'jpeg'].includes(ext || '')) mime = 'image/jpeg'
    else if (ext === 'png') mime = 'image/png'
    else if (ext === 'webp') mime = 'image/webp'
    else if (ext === 'gif') mime = 'image/gif'
    else if (folder === 'pyq') mime = 'application/pdf'
  }

  const b64 = await fileToBase64(file)

  // Use authenticated api client:
  // 1. Automatically verifies token validity & refreshes expired tokens
  // 2. Automatically retries on 401 Unauthorized
  // 3. Eliminates stale session / mobile PWA token expiry failures
  const json = await api.post<{ url: string }>('/upload', {
    data: b64,
    mime,
    folder,
    fileName,
  })

  if (!json?.url) throw new Error('Upload succeeded on server but no public URL was returned')
  return json.url
}

/**
 * Delete a file from Supabase Storage by its full public URL.
 * Delegates to the backend (best-effort, non-blocking for the caller).
 */
export async function deleteFromStorage(publicUrl: string): Promise<void> {
  try {
    const { supabase } = await import('./supabase')
    const match = publicUrl.match(/\/object\/public\/([^/]+)\/(.+)$/)
    if (!match) return
    const bucket = match[1]
    const path = decodeURIComponent(match[2])
    await supabase.storage.from(bucket).remove([path])
  } catch {
    // Non-critical — backend also handles cleanup on delete
  }
}
