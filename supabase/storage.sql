-- =============================================================
-- CAMPUS WALL — Supabase Storage Bucket Setup
-- Run this AFTER schema.sql in Supabase SQL Editor
-- =============================================================
-- NOTE: You must also create the buckets in the Supabase Dashboard:
--   Storage → New Bucket
--   Bucket 1: "post-images"   (Public: ON,  Max file size: 5MB,  MIME: image/*)
--   Bucket 2: "pyq-files"     (Public: OFF, Max file size: 10MB, MIME: application/pdf)
--   Bucket 3: "notes-files"   (Public: OFF, Max file size: 10MB, MIME: application/pdf)
--   Bucket 4: "avatars"       (Public: ON,  Max file size: 2MB,  MIME: image/*)
--
-- Then run the RLS policies below.
-- =============================================================

-- ── post-images (public bucket) ───────────────────────────────────────────────
-- Path pattern: post-images/{user_id}/{filename}

CREATE POLICY "post_images_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_user()
);

CREATE POLICY "post_images_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

CREATE POLICY "post_images_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
  )
);

-- ── avatars (public bucket) ───────────────────────────────────────────────────
-- Path pattern: avatars/{user_id}/{filename}

CREATE POLICY "avatars_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── pyq-files (private bucket — authenticated read) ───────────────────────────
-- Path pattern: pyq-files/{user_id}/{filename}

CREATE POLICY "pyq_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pyq-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_user()
);

CREATE POLICY "pyq_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pyq-files' AND public.is_active_user());

CREATE POLICY "pyq_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pyq-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
  )
);

-- ── notes-files (private bucket — authenticated read) ─────────────────────────
-- Path pattern: notes-files/{user_id}/{filename}

CREATE POLICY "notes_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notes-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_user()
);

CREATE POLICY "notes_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'notes-files' AND public.is_active_user());

CREATE POLICY "notes_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'notes-files'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin()
  )
);
