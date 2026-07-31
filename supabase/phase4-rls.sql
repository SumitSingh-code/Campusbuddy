-- =============================================================
-- CAMPUS WALL — Phase 4 Additional RLS Policies
-- Required for Supabase Realtime (postgres_changes) client subscriptions.
-- Clients subscribe using their JWT (anon key + user session), so they
-- need SELECT access through RLS on dm_messages and notifications.
-- Run in Supabase SQL Editor AFTER schema.sql.
--
-- NOTE: Table names use the dm_ prefix to match schema.sql:
--   public.dm_conversations  (NOT public.conversations)
--   public.dm_messages       (NOT public.messages)
-- =============================================================

-- ── dm_conversations ──────────────────────────────────────────
-- SELECT: participants can see their own conversations
DROP POLICY IF EXISTS "conversations_select"      ON public.dm_conversations;
DROP POLICY IF EXISTS "conversations_update_self" ON public.dm_conversations;

CREATE POLICY "dm_conversations_select" ON public.dm_conversations FOR SELECT TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- INSERT: only via API (service_role) — no client-direct inserts
-- (We rely on supabaseAdmin for conversation creation to enforce dedup logic)

-- UPDATE: service_role (via API) updates last_message_id, unread_counts.
-- Participants CAN mark-read (zero out their own unread count):
CREATE POLICY "dm_conversations_update_self" ON public.dm_conversations FOR UPDATE TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- ── dm_messages ───────────────────────────────────────────────
-- SELECT: participants can read messages in their conversations
DROP POLICY IF EXISTS "messages_select" ON public.dm_messages;
DROP POLICY IF EXISTS "messages_insert" ON public.dm_messages;
DROP POLICY IF EXISTS "messages_update" ON public.dm_messages;
DROP POLICY IF EXISTS "messages_delete" ON public.dm_messages;

CREATE POLICY "dm_messages_select" ON public.dm_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- INSERT: authenticated participant can send a message
-- (Additional business logic enforced in Express — blocks, rate limits, etc.)
CREATE POLICY "dm_messages_insert" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- UPDATE: mark own messages as read, or recipient marks conversation messages as read
CREATE POLICY "dm_messages_update" ON public.dm_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dm_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- DELETE: sender can delete own messages
CREATE POLICY "dm_messages_delete" ON public.dm_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────
-- SELECT: users see only their own notifications (critical for Realtime)
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: user can mark own notifications as read
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: user can delete own notifications
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── blocks ────────────────────────────────────────────────────
-- (blocks table is not yet in schema.sql — these policies are ready for when it is added)
-- DROP POLICY IF EXISTS "blocks_select" ON public.blocks;
-- DROP POLICY IF EXISTS "blocks_insert" ON public.blocks;
-- DROP POLICY IF EXISTS "blocks_delete" ON public.blocks;

-- CREATE POLICY "blocks_select" ON public.blocks FOR SELECT TO authenticated
--   USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- CREATE POLICY "blocks_insert" ON public.blocks FOR INSERT TO authenticated
--   WITH CHECK (blocker_id = auth.uid() AND public.is_active_user());

-- CREATE POLICY "blocks_delete" ON public.blocks FOR DELETE TO authenticated
--   USING (blocker_id = auth.uid());
