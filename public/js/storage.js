// Campus Wall — Supabase Storage Upload Helper
// Called by PYQ, Notes, and Lost & Found pages to upload files directly from the browser.
// Returns the public URL of the uploaded file.

import supabase from './supabase.js';

/**
 * Upload a file to a Supabase Storage bucket.
 * @param {string} bucket  - Storage bucket name (must already exist in Supabase dashboard)
 * @param {string} path    - Storage path within the bucket (e.g. "pyq/2024-file.pdf")
 * @param {File}   file    - The File object to upload
 * @returns {Promise<string>} Public URL of the uploaded file
 * @throws If upload fails
 */
export async function uploadToStorage(bucket, path, file) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw new Error(error.message || 'Upload failed');

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not get file URL after upload');

  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 * @param {string} bucket
 * @param {string} path
 */
export async function deleteFromStorage(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn('[storage] Delete failed:', error.message);
}
