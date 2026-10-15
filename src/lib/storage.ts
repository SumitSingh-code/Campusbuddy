import { supabase } from './supabase'

const BUCKET = 'unigram'

/**
 * Upload a file to Supabase Storage.
 * @param file  File or Blob to upload
 * @param path  Storage path within the bucket (e.g. 'avatars/user123/photo.jpg')
 * @returns Public URL of the uploaded file
 */
export async function uploadToStorage(
  file: File | Blob,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file instanceof File ? file.type : 'image/jpeg',
    })

  if (error) throw new Error(error.message || 'Upload failed')

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Could not get file URL after upload')

  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage by its full public URL.
 * Extracts the path from the URL automatically.
 */
export async function deleteFromStorage(publicUrl: string): Promise<void> {
  // Extract path from URL: everything after /object/public/unigram/
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) {
    console.warn('[storage] Could not parse path from URL:', publicUrl)
    return
  }
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length))
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('[storage] Delete failed:', error.message)
}
