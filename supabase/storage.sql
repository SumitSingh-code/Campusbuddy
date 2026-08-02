-- =============================================================
-- CAMPUS WALL — Supabase Storage Bucket RLS Policies
-- Run AFTER schema.sql in Supabase SQL Editor.
-- Safe to re-run (DROP POLICY IF EXISTS guards on all policies).
-- =============================================================
-- Buckets (create in Supabase Dashboard → Storage → New Bucket):
--   post-images    Public ON   Max 5MB   image/*
--   avatars        Public ON   Max 2MB   image/*
--   lostfound-images Public ON Max 5MB  image/*
--   pyq-files      Public OFF  Max 10MB  application/pdf
--   notes-files    Public OFF  Max 10MB  application/pdf
-- =============================================================
--
-- FUNCTION NOTES:
--   public.is_active()  — defined in schema.sql. Returns TRUE if the
--                         calling user's profile has status = 'active'.
--   Admin check        — inlined as a subquery (no separate is_admin()
--                         function needed).
-- =============================================================


-- ── post-images (public bucket) ────────────────────────────────
-- Path: post-images/{user_id}/{filename}

DROP POLICY IF EXISTS "post_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "post_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "post_images_delete" ON storage.objects;

CREATE POLICY "post_images_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND public.is_active()
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
    OR (SELECT role FROM public.profiles WHERE id = auth.uid())
         IN ('moderator', 'super_admin')
  )
);


-- ── avatars (public bucket) ────────────────────────────────────
-- Path: avatars/{user_id}/{filename}

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

CREATE POLICY "avatars_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND public.is_active()
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


-- ── lostfound-images (public bucket) ──────────────────────────
-- Path: lostfound/{timestamp}-{filename}  (no uid prefix — public images)

DROP POLICY IF EXISTS "lostfound_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "lostfound_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "lostfound_images_delete" ON storage.objects;

CREATE POLICY "lostfound_images_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lostfound-images'
  AND public.is_active()
);

CREATE POLICY "lostfound_images_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lostfound-images');

CREATE POLICY "lostfound_images_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lostfound-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (SELECT role FROM public.profiles WHERE id = auth.uid())
         IN ('moderator', 'super_admin')
  )
);


-- ── pyq-files (private bucket — authenticated read) ────────────
-- Path: pyq/{timestamp}-{filename}
-- Note: path-based ownership NOT enforced here because the frontend
--       uses a flat 'pyq/' prefix (not uid-prefixed). Deletion is
--       authorised in the Express backend (owner or admin check).

DROP POLICY IF EXISTS "pyq_upload" ON storage.objects;
DROP POLICY IF EXISTS "pyq_read"   ON storage.objects;
DROP POLICY IF EXISTS "pyq_delete" ON storage.objects;

CREATE POLICY "pyq_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pyq-files'
  AND public.is_active()
);

CREATE POLICY "pyq_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pyq-files'
  AND public.is_active()
);

CREATE POLICY "pyq_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pyq-files'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('moderator', 'super_admin')
  )
);


-- ── notes-files (private bucket — authenticated read) ──────────
-- Path: notes/{timestamp}-{filename}
-- Same rationale as pyq-files above.

DROP POLICY IF EXISTS "notes_upload" ON storage.objects;
DROP POLICY IF EXISTS "notes_read"   ON storage.objects;
DROP POLICY IF EXISTS "notes_delete" ON storage.objects;

CREATE POLICY "notes_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notes-files'
  AND public.is_active()
);

CREATE POLICY "notes_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notes-files'
  AND public.is_active()
);

CREATE POLICY "notes_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'notes-files'
  AND (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
      IN ('moderator', 'super_admin')
  )
);
