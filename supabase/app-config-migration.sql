-- ============================================================
-- APP CONFIG TABLE — Profile Cover Photo
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Seed default cover (blank/gradient — admin will upload real one)
INSERT INTO public.app_config (key, value)
VALUES ('profile_cover_url', '')
ON CONFLICT (key) DO NOTHING;

-- 3. RLS: anyone can READ, only service role (backend) can WRITE
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config: public read" ON public.app_config;
CREATE POLICY "app_config: public read"
  ON public.app_config FOR SELECT
  USING (true);

-- No INSERT/UPDATE policy for authenticated users — only service role
-- (backend with SERVICE_ROLE_KEY) can modify this table.

-- 4. Auto-stamp updated_at
DROP TRIGGER IF EXISTS trg_app_config_updated_at ON public.app_config;
CREATE TRIGGER trg_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Confirm
SELECT * FROM public.app_config;
