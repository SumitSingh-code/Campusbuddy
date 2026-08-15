-- ============================================================
-- KARMA SYSTEM — Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
--
-- Karma scoring rules:
--   Feed post upvote received   → author +2
--   Feed post downvote received → author -1
--   Anon post upvote received   → author +1  (less than feed, anon posts)
--   Anon post downvote received → author -1
--   Vote removed / changed      → reverse the delta
--
-- Minimum karma is capped at 0 (GREATEST(0, ...)) — never goes negative.
-- Karma column is protected by RLS (profiles lock trigger) so only
-- SECURITY DEFINER functions (service role) can update it.
-- ============================================================


-- ============================================================
-- PART 1: FEED POST KARMA (user_votes table)
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_karma_feed_votes()
RETURNS TRIGGER AS $$
DECLARE
  author_id UUID;
  delta     INTEGER := 0;
BEGIN
  -- Get the post author
  SELECT user_id INTO author_id
  FROM public.posts
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);

  IF author_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Don't give karma for voting on your own post (shouldn't happen due to API check,
  -- but guard here too)
  IF author_id = COALESCE(NEW.user_id, OLD.user_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate karma delta
  IF TG_OP = 'INSERT' THEN
    -- New vote added
    delta := CASE NEW.vote_type WHEN 'up' THEN 2 ELSE -1 END;

  ELSIF TG_OP = 'DELETE' THEN
    -- Vote removed — reverse the original delta
    delta := CASE OLD.vote_type WHEN 'up' THEN -2 ELSE 1 END;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Vote type changed (e.g. up → down)
    -- Reverse old, apply new
    delta := CASE NEW.vote_type WHEN 'up' THEN 2 ELSE -1 END
           - CASE OLD.vote_type WHEN 'up' THEN 2 ELSE -1 END;
  END IF;

  -- Apply karma (minimum 0)
  IF delta <> 0 THEN
    UPDATE public.profiles
    SET karma = GREATEST(0, karma + delta)
    WHERE id = author_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP TRIGGER IF EXISTS trg_karma_feed_votes ON public.user_votes;
CREATE TRIGGER trg_karma_feed_votes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_karma_feed_votes();


-- ============================================================
-- PART 2: ANON POST KARMA (anon_votes table)
-- ============================================================
-- Anon posts give slightly less karma (upvote = +1 not +2)
-- because the author is hidden — still rewards good content.

CREATE OR REPLACE FUNCTION public.sync_karma_anon_votes()
RETURNS TRIGGER AS $$
DECLARE
  author_id UUID;
  delta     INTEGER := 0;
BEGIN
  -- Get the anon post author
  SELECT user_id INTO author_id
  FROM public.anon_posts
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);

  IF author_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Self-vote guard
  IF author_id = COALESCE(NEW.user_id, OLD.user_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    delta := CASE NEW.vote_type WHEN 'up' THEN 1 ELSE -1 END;

  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE OLD.vote_type WHEN 'up' THEN -1 ELSE 1 END;

  ELSIF TG_OP = 'UPDATE' THEN
    delta := CASE NEW.vote_type WHEN 'up' THEN 1 ELSE -1 END
           - CASE OLD.vote_type WHEN 'up' THEN 1 ELSE -1 END;
  END IF;

  IF delta <> 0 THEN
    UPDATE public.profiles
    SET karma = GREATEST(0, karma + delta)
    WHERE id = author_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP TRIGGER IF EXISTS trg_karma_anon_votes ON public.anon_votes;
CREATE TRIGGER trg_karma_anon_votes
  AFTER INSERT OR UPDATE OR DELETE ON public.anon_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_karma_anon_votes();


-- ============================================================
-- PART 3: NOTES UPLOAD KARMA BONUS
-- ============================================================
-- Uploading a note = +5 karma (community contribution)
-- Note deleted/rejected = -5 karma

CREATE OR REPLACE FUNCTION public.sync_karma_notes()
RETURNS TRIGGER AS $$
DECLARE
  delta INTEGER := 0;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    delta := 5;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'published' AND OLD.status <> 'published' THEN
      -- Note approved/published
      delta := 5;
    ELSIF NEW.status <> 'published' AND OLD.status = 'published' THEN
      -- Note removed/rejected
      delta := -5;
    END IF;
  END IF;

  IF delta <> 0 THEN
    UPDATE public.profiles
    SET karma = GREATEST(0, karma + delta)
    WHERE id = COALESCE(NEW.uploader_id, OLD.uploader_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


DROP TRIGGER IF EXISTS trg_karma_notes ON public.notes;
CREATE TRIGGER trg_karma_notes
  AFTER INSERT OR UPDATE OF status ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.sync_karma_notes();


-- ============================================================
-- PART 4: RECALCULATE EXISTING KARMA (one-time backfill)
-- ============================================================
-- Runs once to set correct karma for all existing users
-- based on their current votes received and notes published.
-- Safe to run multiple times (it recalculates from scratch).

UPDATE public.profiles p
SET karma = GREATEST(0,
  -- Feed post votes received
  COALESCE((
    SELECT SUM(CASE v.vote_type WHEN 'up' THEN 2 ELSE -1 END)
    FROM public.user_votes v
    JOIN public.posts po ON po.id = v.post_id
    WHERE po.user_id = p.id
      AND v.user_id <> p.id  -- exclude self-votes
  ), 0)
  +
  -- Anon post votes received
  COALESCE((
    SELECT SUM(CASE v.vote_type WHEN 'up' THEN 1 ELSE -1 END)
    FROM public.anon_votes v
    JOIN public.anon_posts ap ON ap.id = v.post_id
    WHERE ap.user_id = p.id
      AND v.user_id <> p.id
  ), 0)
  +
  -- Notes upload bonus
  COALESCE((
    SELECT COUNT(*) * 5
    FROM public.notes n
    WHERE n.uploader_id = p.id
      AND n.status = 'published'
  ), 0)
);

-- Confirm the update
SELECT id, full_name, karma
FROM public.profiles
ORDER BY karma DESC
LIMIT 20;
