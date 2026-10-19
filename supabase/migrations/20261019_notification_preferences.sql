-- Migration: Add notification_preferences to profiles table
-- Date: 2026-10-19

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "dm": true,
  "comments": true,
  "anon_replies": true,
  "dept_notices": true,
  "lost_found": false,
  "resources": false
}'::jsonb;

-- Push subscriptions table for native device push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
ON push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
