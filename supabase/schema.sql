-- ============================================================
--  CAMPUS WALL â€” Supabase SQL Schema
--  Run in Supabase SQL Editor in the order written below.
--
--  Supabase: Postgres 15+, auth.users managed by Supabase Auth.
--  All tables live in the public schema.
--  Backend: SUPABASE_SERVICE_ROLE_KEY â†’ bypasses RLS.
--  Frontend: ANON KEY â†’ subject to RLS.
--
--  Steps:
--   1. Section 1 â€” Extensions
--   2. Section 2 â€” Tables
--   3. Section 3 â€” Indexes
--   4. Section 4 â€” Triggers
--   5. Section 5 â€” RLS
--   6. Section 6 â€” Realtime  (SQL)
--   7. Section 7 â€” Storage   (Dashboard)
--   8. Section 8 â€” Seed      (optional)
-- ============================================================


-- ============================================================
--  SECTION 1: Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================
--  SECTION 2: Tables
-- ============================================================

-- updated_at auto-stamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  university_name      TEXT        NOT NULL DEFAULT 'Chaudhary Ranbir Singh University',
  full_name            TEXT        NOT NULL,
  roll_number          TEXT        UNIQUE,
  department           TEXT        NOT NULL,
  phone_number         TEXT        UNIQUE,
  email                TEXT,
  bio                  TEXT        CHECK (char_length(bio) <= 200),
  avatar_url           TEXT,
  auth_provider        TEXT        NOT NULL DEFAULT 'email'
                                   CHECK (auth_provider IN ('email','google')),
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','active','suspended','banned','rejected')),
  role                 TEXT        NOT NULL DEFAULT 'student'
                                   CHECK (role IN ('student','moderator','super_admin')),
  karma                INTEGER     NOT NULL DEFAULT 0,
  posts_count          INTEGER     NOT NULL DEFAULT 0,
  notes_uploaded       INTEGER     NOT NULL DEFAULT 0,
  must_change_password BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- â”€â”€ posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Named feed posts. 5/day limit enforced in API.
CREATE TABLE IF NOT EXISTS public.posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  image_url      TEXT,
  upvotes        INTEGER     NOT NULL DEFAULT 0,
  downvotes      INTEGER     NOT NULL DEFAULT 0,
  comments_count INTEGER     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'published'
                             CHECK (status IN ('published','deleted','hidden')),
  edited_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- â”€â”€ anon_posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- user_id stored but NEVER exposed to clients via RLS.
-- 3/day limit enforced in API.
CREATE TABLE IF NOT EXISTS public.anon_posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  upvotes        INTEGER     NOT NULL DEFAULT 0,
  downvotes      INTEGER     NOT NULL DEFAULT 0,
  comments_count INTEGER     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'published'
                             CHECK (status IN ('published','deleted','hidden')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_anon_posts_updated_at ON public.anon_posts;
CREATE TRIGGER trg_anon_posts_updated_at
  BEFORE UPDATE ON public.anon_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- â”€â”€ comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  status     TEXT        NOT NULL DEFAULT 'published'
                         CHECK (status IN ('published','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ anon_comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- user_id hidden from clients (same policy as anon_posts).
CREATE TABLE IF NOT EXISTS public.anon_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.anon_posts(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  status     TEXT        NOT NULL DEFAULT 'published'
                         CHECK (status IN ('published','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ user_votes (feed post votes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.user_votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES public.posts(id)    ON DELETE CASCADE,
  vote_type  TEXT        NOT NULL CHECK (vote_type IN ('up','down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);


-- â”€â”€ anon_votes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.anon_votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
  post_id    UUID        NOT NULL REFERENCES public.anon_posts(id)  ON DELETE CASCADE,
  vote_type  TEXT        NOT NULL CHECK (vote_type IN ('up','down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);


-- â”€â”€ bookmarks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ref_type   TEXT        NOT NULL CHECK (ref_type IN ('post','anon_post')),
  ref_id     UUID        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ref_type, ref_id)
);


-- â”€â”€ dm_conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- participant_a < participant_b (canonical UUID sort) enforced in API.
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_b   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_a, participant_b),
  CHECK (participant_a <> participant_b)
);


-- â”€â”€ dm_messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  read_at         TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  ref_type   TEXT,
  ref_id     UUID,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT        NOT NULL CHECK (content_type IN ('post','anon_post','comment','anon_comment','dm')),
  content_id   UUID        NOT NULL,
  reason       TEXT        NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status       TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open','dismissed','actioned')),
  resolved_by  UUID        REFERENCES public.profiles(id),
  resolved_at  TIMESTAMPTZ,
  action_taken TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ password_reset_requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number  TEXT        NOT NULL,
  phone_number TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','resolved','rejected')),
  resolved_by  UUID        REFERENCES public.profiles(id),
  resolved_at  TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ pyq_files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.pyq_files (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  subject         TEXT        NOT NULL,
  year            SMALLINT    NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  exam_type       TEXT        NOT NULL CHECK (exam_type IN ('mid','end','backlog','other')),
  department      TEXT        NOT NULL,
  file_url        TEXT        NOT NULL,
  file_size_bytes INTEGER,
  uploader_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'published'
                              CHECK (status IN ('published','deleted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- â”€â”€ notices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.notices (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  body         TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general'
                           CHECK (category IN ('academic','exam','event','administrative','general')),
  is_important BOOLEAN     NOT NULL DEFAULT FALSE,
  pinned       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_notices_updated_at ON public.notices;
CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- â”€â”€ lost_found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.lost_found (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT        NOT NULL CHECK (type IN ('lost','found')),
  title        TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description  TEXT        NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  location     TEXT,
  image_url    TEXT,
  contact_info TEXT,
  poster_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open','closed','deleted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_lost_found_updated_at ON public.lost_found;
CREATE TRIGGER trg_lost_found_updated_at
  BEFORE UPDATE ON public.lost_found
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- â”€â”€ notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.notes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  subject         TEXT        NOT NULL,
  department      TEXT        NOT NULL,
  semester        SMALLINT    CHECK (semester BETWEEN 1 AND 8),
  description     TEXT,
  file_url        TEXT        NOT NULL,
  file_size_bytes INTEGER,
  uploader_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  downloads       INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'published'
                              CHECK (status IN ('published','deleted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- â”€â”€ timetables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- is_master=TRUE  â†’ admin-uploaded dept timetable (fallback for students)
-- is_master=FALSE â†’ personal timetable (one per user)
-- slots: JSONB array [ { day, period, subject, room? }, ... ]
CREATE TABLE IF NOT EXISTS public.timetables (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT        NOT NULL,
  semester   SMALLINT    CHECK (semester BETWEEN 1 AND 8),
  label      TEXT,
  slots      JSONB       NOT NULL DEFAULT '[]'::JSONB,
  is_master  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_timetables_updated_at ON public.timetables;
CREATE TRIGGER trg_timetables_updated_at
  BEFORE UPDATE ON public.timetables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
--  SECTION 3: Indexes
-- ============================================================

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_roll        ON public.profiles (roll_number);
CREATE INDEX IF NOT EXISTS idx_profiles_phone       ON public.profiles (phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_status      ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm   ON public.profiles USING GIN (full_name gin_trgm_ops);

-- posts
CREATE INDEX IF NOT EXISTS idx_posts_user           ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_time    ON public.posts (status, created_at DESC);

-- anon_posts
CREATE INDEX IF NOT EXISTS idx_anon_status_time     ON public.anon_posts (status, created_at DESC);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_post        ON public.comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_anon_comments_post   ON public.anon_comments (post_id, created_at ASC);

-- votes
CREATE INDEX IF NOT EXISTS idx_user_votes_post      ON public.user_votes (post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_anon_votes_post      ON public.anon_votes (post_id, user_id);

-- bookmarks
CREATE INDEX IF NOT EXISTS idx_bookmarks_user       ON public.bookmarks (user_id, created_at DESC);

-- DMs
CREATE INDEX IF NOT EXISTS idx_dm_conv_a            ON public.dm_conversations (participant_a);
CREATE INDEX IF NOT EXISTS idx_dm_conv_b            ON public.dm_conversations (participant_b);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conv     ON public.dm_messages (conversation_id, created_at ASC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifs_user          ON public.notifications (user_id, is_read, created_at DESC);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_status       ON public.reports (status, created_at DESC);

-- pyq / notes
CREATE INDEX IF NOT EXISTS idx_pyq_dept_year        ON public.pyq_files (department, year DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_pyq_subject_trgm     ON public.pyq_files USING GIN (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notes_dept_sem       ON public.notes (department, semester) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_notes_subject_trgm   ON public.notes USING GIN (subject gin_trgm_ops);

-- notices
CREATE INDEX IF NOT EXISTS idx_notices_active       ON public.notices (status, pinned DESC, is_important DESC, created_at DESC);

-- lost_found
CREATE INDEX IF NOT EXISTS idx_lf_status_time       ON public.lost_found (status, type, created_at DESC);

-- timetables
CREATE INDEX IF NOT EXISTS idx_tt_owner             ON public.timetables (owner_id, is_master);
CREATE INDEX IF NOT EXISTS idx_tt_master_dept       ON public.timetables (department, is_master) WHERE is_master = TRUE;


-- ============================================================
--  SECTION 4: Trigger Functions
-- ============================================================

-- Auto-increment posts_count on profiles
CREATE OR REPLACE FUNCTION public.inc_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'published' AND OLD.status <> 'published' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> 'published' AND OLD.status = 'published' THEN
    UPDATE public.profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_count_inc ON public.posts;
CREATE TRIGGER trg_post_count_inc
  AFTER INSERT OR UPDATE OF status ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.inc_posts_count();


-- Auto-increment notes_uploaded on profiles
CREATE OR REPLACE FUNCTION public.inc_notes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    UPDATE public.profiles SET notes_uploaded = notes_uploaded + 1 WHERE id = NEW.uploader_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> 'published' AND OLD.status = 'published' THEN
    UPDATE public.profiles SET notes_uploaded = GREATEST(0, notes_uploaded - 1) WHERE id = NEW.uploader_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notes_count_inc ON public.notes;
CREATE TRIGGER trg_notes_count_inc
  AFTER INSERT OR UPDATE OF status ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.inc_notes_count();


-- Auto-sync comments_count
CREATE OR REPLACE FUNCTION public.sync_comments_count()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.post_id, OLD.post_id);
  IF TG_TABLE_NAME = 'comments' THEN
    UPDATE public.posts
      SET comments_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = target_id AND status = 'published')
    WHERE id = target_id;
  ELSE
    UPDATE public.anon_posts
      SET comments_count = (SELECT COUNT(*) FROM public.anon_comments WHERE post_id = target_id AND status = 'published')
    WHERE id = target_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_comments_count ON public.comments;
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comments_count();

DROP TRIGGER IF EXISTS trg_anon_comments_count ON public.anon_comments;
CREATE TRIGGER trg_anon_comments_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.anon_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_comments_count();


-- Auto-sync upvotes/downvotes on posts
CREATE OR REPLACE FUNCTION public.sync_post_votes()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.posts
    SET upvotes   = (SELECT COUNT(*) FROM public.user_votes WHERE post_id = target_id AND vote_type = 'up'),
        downvotes = (SELECT COUNT(*) FROM public.user_votes WHERE post_id = target_id AND vote_type = 'down')
  WHERE id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_votes_sync ON public.user_votes;
CREATE TRIGGER trg_post_votes_sync
  AFTER INSERT OR DELETE ON public.user_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_votes();


-- Auto-sync upvotes/downvotes on anon_posts
CREATE OR REPLACE FUNCTION public.sync_anon_post_votes()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE public.anon_posts
    SET upvotes   = (SELECT COUNT(*) FROM public.anon_votes WHERE post_id = target_id AND vote_type = 'up'),
        downvotes = (SELECT COUNT(*) FROM public.anon_votes WHERE post_id = target_id AND vote_type = 'down')
  WHERE id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_anon_post_votes_sync ON public.anon_votes;
CREATE TRIGGER trg_anon_post_votes_sync
  AFTER INSERT OR DELETE ON public.anon_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_anon_post_votes();


-- Touch dm_conversations.last_message_at on new message
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dm_conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_touch_conversation ON public.dm_messages;
CREATE TRIGGER trg_touch_conversation
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();


-- â”€â”€ FIX #1: Lock privilege columns on profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Prevents self-privilege-escalation via anon key.
-- Any UPDATE that goes through RLS (anon/authenticated role) has
-- role, status, karma, posts_count, notes_uploaded silently reset
-- to their OLD values â€” the student's new values for those columns
-- are simply ignored. Service role (backend) bypasses RLS entirely
-- so it is unaffected: admin approve/ban/promote routes still work.
--
-- Why trigger instead of WITH CHECK subqueries?
--   â€¢ No 5Ã— extra SELECT per UPDATE
--   â€¢ Silent reset is safer than raising errors (no info leakage)
--   â€¢ Backend service role bypasses RLS â†’ trigger not an issue
--
-- auth.role() returns 'service_role' when called via the service-role
-- key (as supabaseAdmin does). For anon-key callers it is
-- 'authenticated' or 'anon'.
CREATE OR REPLACE FUNCTION public.lock_profile_immutable_cols()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role (backend) may change any column freely
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- For every other caller: silently reset privilege-sensitive columns
  -- to their current DB values. The rest of the row (bio, phone,
  -- avatar_url, etc.) is still updated normally.
  NEW.role           := OLD.role;
  NEW.status         := OLD.status;
  NEW.karma          := OLD.karma;
  NEW.posts_count    := OLD.posts_count;
  NEW.notes_uploaded := OLD.notes_uploaded;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_profile_cols ON public.profiles;
CREATE TRIGGER trg_lock_profile_cols
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_immutable_cols();


-- ============================================================
--  SECTION 5: Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_votes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_votes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_files               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_found              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables              ENABLE ROW LEVEL SECURITY;


-- Helper: is the requesting user an active student/moderator/super_admin?
CREATE OR REPLACE FUNCTION public.is_active()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- â”€â”€ profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "profiles: own read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: active read others"
  ON public.profiles FOR SELECT
  USING (public.is_active() AND status = 'active');

-- FIX #1 (continued): WITH CHECK is intentionally minimal here.
-- The real protection against privilege escalation is the
-- trg_lock_profile_cols trigger above, which resets locked columns
-- to OLD values for any non-service-role caller. The trigger fires
-- BEFORE the row is written, so even a syntactically valid UPDATE
-- that tries to change role/status cannot persist the new values.
CREATE POLICY "profiles: own update"
  ON public.profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- â”€â”€ posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "posts: read published"
  ON public.posts FOR SELECT
  USING (public.is_active() AND status = 'published');

CREATE POLICY "posts: own insert"
  ON public.posts FOR INSERT
  WITH CHECK (public.is_active() AND auth.uid() = user_id);

-- FIX #2: Explicit WITH CHECK so the policy is correct regardless
-- of call path. In practice ALL post edit/delete goes through the
-- Express backend (service role â†’ bypasses RLS), so this does not
-- block anything today. The explicit WITH CHECK future-proofs the
-- schema in case a client ever calls Supabase directly:
--   â€¢ USING  checks the BEFORE state  (row must be mine & published)
--   â€¢ WITH CHECK checks the AFTER state (only published/deleted/hidden allowed)
CREATE POLICY "posts: own update"
  ON public.posts FOR UPDATE
  USING     (public.is_active() AND auth.uid() = user_id AND status = 'published')
  WITH CHECK (public.is_active() AND auth.uid() = user_id AND status IN ('published','deleted','hidden'));


-- â”€â”€ anon_posts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DENY ALL to regular clients intentionally.
-- Service role (backend) bypasses RLS and handles stripping user_id.


-- â”€â”€ comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "comments: read"
  ON public.comments FOR SELECT
  USING (public.is_active() AND status = 'published');

CREATE POLICY "comments: own insert"
  ON public.comments FOR INSERT
  WITH CHECK (public.is_active() AND auth.uid() = user_id);

CREATE POLICY "comments: own update"
  ON public.comments FOR UPDATE
  USING (public.is_active() AND auth.uid() = user_id);


-- â”€â”€ anon_comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- DENY ALL intentionally (same as anon_posts).


-- â”€â”€ user_votes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "votes: own"
  ON public.user_votes FOR ALL
  USING (public.is_active() AND auth.uid() = user_id)
  WITH CHECK (public.is_active() AND auth.uid() = user_id);


-- â”€â”€ anon_votes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "anon_votes: own"
  ON public.anon_votes FOR ALL
  USING (public.is_active() AND auth.uid() = user_id)
  WITH CHECK (public.is_active() AND auth.uid() = user_id);


-- â”€â”€ bookmarks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "bookmarks: own"
  ON public.bookmarks FOR ALL
  USING (public.is_active() AND auth.uid() = user_id)
  WITH CHECK (public.is_active() AND auth.uid() = user_id);


-- â”€â”€ dm_conversations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "dm_conv: participants read"
  ON public.dm_conversations FOR SELECT
  USING (public.is_active() AND (auth.uid() = participant_a OR auth.uid() = participant_b));


-- â”€â”€ dm_messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "dm_messages: participants read"
  ON public.dm_messages FOR SELECT
  USING (
    public.is_active() AND EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE id = conversation_id
        AND (participant_a = auth.uid() OR participant_b = auth.uid())
    )
  );

CREATE POLICY "dm_messages: own insert"
  ON public.dm_messages FOR INSERT
  WITH CHECK (
    public.is_active() AND auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE id = conversation_id
        AND (participant_a = auth.uid() OR participant_b = auth.uid())
    )
  );


-- â”€â”€ notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "notifications: own"
  ON public.notifications FOR ALL
  USING (public.is_active() AND auth.uid() = user_id)
  WITH CHECK (public.is_active() AND auth.uid() = user_id);


-- â”€â”€ reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "reports: insert"
  ON public.reports FOR INSERT
  WITH CHECK (public.is_active() AND auth.uid() = reporter_id);


-- â”€â”€ password_reset_requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "reset_requests: public insert"
  ON public.password_reset_requests FOR INSERT
  WITH CHECK (TRUE);


-- â”€â”€ pyq_files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "pyq: read"
  ON public.pyq_files FOR SELECT
  USING (public.is_active() AND status = 'published');

CREATE POLICY "pyq: insert"
  ON public.pyq_files FOR INSERT
  WITH CHECK (public.is_active() AND auth.uid() = uploader_id);


-- â”€â”€ notices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "notices: read active"
  ON public.notices FOR SELECT
  USING (public.is_active() AND status = 'active');


-- â”€â”€ lost_found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "lf: read open"
  ON public.lost_found FOR SELECT
  USING (public.is_active() AND status = 'open');

CREATE POLICY "lf: insert"
  ON public.lost_found FOR INSERT
  WITH CHECK (public.is_active() AND auth.uid() = poster_id);


-- â”€â”€ notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "notes: read"
  ON public.notes FOR SELECT
  USING (public.is_active() AND status = 'published');

CREATE POLICY "notes: insert"
  ON public.notes FOR INSERT
  WITH CHECK (public.is_active() AND auth.uid() = uploader_id);


-- â”€â”€ timetables â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "tt: read"
  ON public.timetables FOR SELECT
  USING (public.is_active() AND (auth.uid() = owner_id OR is_master = TRUE));

CREATE POLICY "tt: personal write"
  ON public.timetables FOR ALL
  USING (public.is_active() AND auth.uid() = owner_id AND is_master = FALSE)
  WITH CHECK (public.is_active() AND auth.uid() = owner_id AND is_master = FALSE);


-- ============================================================
--  SECTION 6: Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- NOTE: Realtime respects RLS. Clients only receive events
-- for rows that pass their SELECT policy.


-- ============================================================
--  SECTION 7: Storage Buckets
--  Cannot be done via SQL; use Supabase Dashboard or CLI.
-- ============================================================
--
--  Bucket Name       | Public | Max Size | Allowed MIME Types
--  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--  avatars           | YES    | 3 MB     | image/jpeg, image/png, image/webp
--  feed-images       | YES    | 5 MB     | image/jpeg, image/png, image/gif, image/webp
--  anon-images       | YES    | 5 MB     | image/jpeg, image/png, image/gif, image/webp
--  pyq-files         | YES    | 10 MB    | application/pdf
--  notes-files       | YES    | 10 MB    | application/pdf
--  lostfound-images  | YES    | 5 MB     | image/jpeg, image/png, image/webp
--
--  Storage RLS template (run once per bucket â€” replace 'pyq-files'):
--
--    CREATE POLICY "read" ON storage.objects
--      FOR SELECT USING (bucket_id = 'pyq-files');
--
--    CREATE POLICY "upload" ON storage.objects
--      FOR INSERT WITH CHECK (
--        bucket_id = 'pyq-files'
--        AND (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'active'
--      );
--
--    CREATE POLICY "delete own or admin" ON storage.objects
--      FOR DELETE USING (
--        bucket_id = 'pyq-files'
--        AND (
--          auth.uid()::text = (storage.foldername(name))[1]
--          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('moderator','super_admin')
--        )
--      );


-- ============================================================
--  SECTION 8: Seed Data (run after first super_admin signs up)
-- ============================================================

-- Step 1: Sign up normally through the app, then get your user UUID:
--   SELECT id FROM public.profiles WHERE roll_number = 'YOUR_ROLL';
--
-- Step 2: Promote to super_admin and activate:
--   UPDATE public.profiles
--     SET role = 'super_admin', status = 'active'
--   WHERE roll_number = 'YOUR_ROLL_NUMBER';
--
-- Step 3: Optional welcome notice:
--   INSERT INTO public.notices (title, body, category, is_important, pinned, created_by)
--   SELECT
--     'Welcome to Campus Wall!',
--     'Campus Wall is now live for CRSU, Jind. Share on the Feed, find lost items, upload notes, and stay updated with notices.',
--     'general', TRUE, TRUE, id
--   FROM public.profiles WHERE role = 'super_admin' LIMIT 1;

