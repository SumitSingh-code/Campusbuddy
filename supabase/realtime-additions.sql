-- ============================================================
-- Campus Wall — Realtime Additions Migration
-- Run this ONCE in your Supabase SQL Editor.
-- It is fully idempotent (safe to re-run).
-- ============================================================

-- 1. Add posts + anon_posts to the Supabase Realtime publication
--    so the frontend can subscribe to INSERT events on both tables.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.anon_posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. RLS SELECT policy for anon_posts (required for Realtime to deliver
--    events — Supabase Realtime respects RLS and won't send rows the user
--    cannot SELECT).
--    Policy: any active user can read published anonymous posts.
DO $$ BEGIN
  CREATE POLICY "anon_posts: read published"
    ON public.anon_posts
    FOR SELECT
    USING (
      status = 'published'
      AND public.is_active()
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Confirm
SELECT
  schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'anon_posts' AND policyname = 'anon_posts: read published';
