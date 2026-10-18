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
               : path.startsWith('lost-found') || path.startsWith('lostfound') ? 'lost-found'
               : 'posts'

  let mime = file instanceof File ? file.type : 'image/jpeg'
  const fileName = file instanceof File ? file.name : ''
  if (!mime && fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') mime = 'application/pdf'
    else if (['jpg', 'jpeg'].includes(ext || '')) mime = 'image/jpeg'
    else if (ext === 'png') mime = 'image/png'
    else if (ext === 'webp') mime = 'image/webp'
    else if (ext === 'gif') mime = 'image/gif'
  }

  const b64 = await fileToBase64(file)

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
    body: JSON.stringify({ data: b64, mime, folder, fileName }),
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
