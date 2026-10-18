/**
 * storage.ts — Image upload via server-side /api/upload endpoint.
 *
 * Uploads are sent to our Express API which uses the Supabase service-role key,
 * bypassing client-side RLS / bucket-policy issues entirely.
 *
 * The file is base64-encoded client-side before sending (avoids multipart
 * complexity in Vercel serverless functions).
 */

async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
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
               : 'posts'

  const mime   = file instanceof File ? file.type : 'image/jpeg'
  const b64    = await fileToBase64(file)

  // Get auth token
  const { supabase } = await import('./supabase')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ''

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ data: b64, mime, folder }),
  })

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`
    try { const j = await res.json(); msg = j.error || msg } catch { /* ignore */ }
    throw new Error(msg)
  }

  const json = await res.json()
  if (!json.url) throw new Error('Upload succeeded but no URL returned')
  return json.url
}

/**
 * Delete a file from Supabase Storage by its full public URL.
 * Delegates to the backend (best-effort, non-blocking for the caller).
 */
export async function deleteFromStorage(publicUrl: string): Promise<void> {
  // Extraction is now done server-side on delete; client just ignores failures.
  try {
    const { supabase } = await import('./supabase')
    const BUCKET = 'unigram'
    const marker = `/object/public/${BUCKET}/`
    const idx = publicUrl.indexOf(marker)
    if (idx === -1) return
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length))
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // Non-critical — backend also handles cleanup on delete
  }
}
