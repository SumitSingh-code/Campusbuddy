'use strict';

// Campus Wall — DM (Direct Messages) Route
//
// Schema facts (schema.sql — source of truth):
//   dm_conversations: id, participant_a, participant_b, last_message_at, created_at
//     • participant_a < participant_b (UUID string sort, enforced in API)
//     • NO unread_count columns — computed live from dm_messages
//     • NO last_message_id FK    — fetched live from dm_messages
//   dm_messages: id, conversation_id, sender_id, content, read_at, deleted_at, created_at
//     • read_at IS NULL     = unread
//     • read_at IS NOT NULL = read (is_read computed field returned to client)
//     • deleted_at IS NOT NULL = soft-deleted (excluded from all queries)

const express = require('express');
const router  = express.Router();
const { authGuard }         = require('../middleware/authGuard');
const { supabaseAdmin }     = require('../lib/supabase');
const { containsProfanity } = require('../lib/profanity');
const { notify }            = require('../lib/notify');

router.use(authGuard);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if either user has blocked the other.
 * NOTE: 'blocks' table is not yet in schema.sql — returns false (fail-open)
 * until the table is created; will auto-enforce once it exists.
 */
async function isBlocked(uid1, uid2) {
  try {
    const { data, error } = await supabaseAdmin
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${uid1},blocked_id.eq.${uid2}),and(blocker_id.eq.${uid2},blocked_id.eq.${uid1})`)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

/** The other participant's UUID in a conversation */
function otherParticipant(conv, userId) {
  return conv.participant_a === userId ? conv.participant_b : conv.participant_a;
}

/** True if userId is either participant in the conversation */
function isParticipant(conv, userId) {
  return conv.participant_a === userId || conv.participant_b === userId;
}

function validateMessage(content) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return 'Message cannot be empty';
  }
  if (content.trim().length > 1000) return 'Message must be 1000 characters or less';
  if (containsProfanity(content.trim())) return 'Message contains language that violates our guidelines.';
  return null;
}

// ─── GET /search — Find users to start a DM ───────────────────────────────────

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ data: [] });

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, roll_number, department, avatar_url')
      .eq('status', 'active')
      .or(`full_name.ilike.%${q}%,roll_number.ilike.%${q}%`)
      .neq('id', req.profile.id)
      .limit(10);

    if (error) return res.status(500).json({ error: 'Database error' });
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[dm GET /search]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /conversations — List all conversations (newest first) ───────────────

router.get('/conversations', async (req, res) => {
  try {
    const uid = req.profile.id;

    const { data: convos, error } = await supabaseAdmin
      .from('dm_conversations')
      .select('id, participant_a, participant_b, last_message_at')
      .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
      .order('last_message_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[dm GET /conversations]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!convos || convos.length === 0) return res.json({ data: [] });

    const convIds  = convos.map(c => c.id);
    const otherIds = [...new Set(convos.map(c => otherParticipant(c, uid)))];

    // Parallel: fetch other users' profiles, last messages, unread counts
    const [profilesRes, allMsgsRes, unreadRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, department, avatar_url, status')
        .in('id', otherIds),

      // All non-deleted messages in these conversations (to pick the last per conv)
      supabaseAdmin
        .from('dm_messages')
        .select('conversation_id, content, sender_id, created_at')
        .in('conversation_id', convIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),

      // Unread = sent by other person, read_at IS NULL
      supabaseAdmin
        .from('dm_messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .neq('sender_id', uid)
        .is('read_at', null)
        .is('deleted_at', null),
    ]);

    const profileMap = {};
    (profilesRes.data || []).forEach(p => { profileMap[p.id] = p; });

    // Pick the latest message per conversation (results are ordered DESC)
    const lastMsgMap = {};
    (allMsgsRes.data || []).forEach(m => {
      if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
    });

    // Count unread messages per conversation
    const unreadMap = {};
    (unreadRes.data || []).forEach(m => {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    });

    const data = convos.map(c => {
      const otherId = otherParticipant(c, uid);
      const lastMsg = lastMsgMap[c.id];
      return {
        id:              c.id,
        other_user:      profileMap[otherId] || { id: otherId, full_name: 'Unknown User' },
        last_message:    lastMsg ? lastMsg.content.substring(0, 80) : null,
        last_message_at: c.last_message_at,
        unread_count:    unreadMap[c.id] || 0,
        is_last_mine:    lastMsg ? lastMsg.sender_id === uid : false,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error('[dm GET /conversations]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /conversations — Start (or return existing) conversation ─────────────

router.post('/conversations', async (req, res) => {
  try {
    const { recipient_id, message } = req.body;
    const uid = req.profile.id;

    if (!recipient_id) return res.status(400).json({ error: 'recipient_id is required' });
    if (recipient_id === uid) return res.status(400).json({ error: 'Cannot message yourself' });

    const msgErr = validateMessage(message);
    if (msgErr) return res.status(400).json({ error: msgErr });

    // Verify recipient exists and is active
    const { data: recipient } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, status')
      .eq('id', recipient_id)
      .single();

    if (!recipient || recipient.status !== 'active') {
      return res.status(404).json({ error: 'User not found or not active' });
    }

    if (await isBlocked(uid, recipient_id)) {
      return res.status(403).json({ error: 'Cannot send a message to this user', code: 'BLOCKED' });
    }

    // Canonical sort: participant_a < participant_b (UUID string comparison)
    const [p_a, p_b] = [uid, recipient_id].sort();

    // Find or create conversation
    let { data: existing } = await supabaseAdmin
      .from('dm_conversations')
      .select('id')
      .eq('participant_a', p_a)
      .eq('participant_b', p_b)
      .maybeSingle();

    let convId;
    if (existing) {
      convId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('dm_conversations')
        .insert({ participant_a: p_a, participant_b: p_b })
        .select('id')
        .single();
      if (createErr) {
        console.error('[dm POST /conversations] create:', createErr);
        return res.status(500).json({ error: 'Database error' });
      }
      convId = created.id;
    }

    // Insert first message
    const trimmed = message.trim();
    const { data: msg, error: msgErr2 } = await supabaseAdmin
      .from('dm_messages')
      .insert({ conversation_id: convId, sender_id: uid, content: trimmed })
      .select('id, content, sender_id, read_at, created_at')
      .single();

    if (msgErr2) {
      console.error('[dm POST /conversations] msg insert:', msgErr2);
      return res.status(500).json({ error: 'Database error' });
    }

    // Notify recipient
    await notify(recipient_id, {
      type:    'dm',
      title:   `New message from ${req.profile.full_name}`,
      body:    trimmed.substring(0, 120),
      refId:   convId,
      refType: 'conversation',
    });

    res.status(201).json({
      data: {
        conversation_id: convId,
        message: { ...msg, is_mine: true, is_read: false },
      },
    });
  } catch (err) {
    console.error('[dm POST /conversations]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /conversations/:id — Messages thread (cursor paginated) ──────────────
// Newest messages fetched first (DESC) then reversed to ascending for chat display.
// Client passes ?before=<timestamp> to load older messages on scroll-up.

router.get('/conversations/:id', async (req, res) => {
  try {
    const uid    = req.profile.id;
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const before = req.query.before || new Date().toISOString();

    // Verify participant
    const { data: conv } = await supabaseAdmin
      .from('dm_conversations')
      .select('id, participant_a, participant_b')
      .eq('id', req.params.id)
      .single();

    if (!conv || !isParticipant(conv, uid)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Fetch messages newest-first, excluding soft-deleted
    const { data: messages, error } = await supabaseAdmin
      .from('dm_messages')
      .select('id, sender_id, content, read_at, created_at')
      .eq('conversation_id', req.params.id)
      .is('deleted_at', null)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (error) {
      console.error('[dm GET /conversations/:id]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const has_more    = messages.length > limit;
    const slice       = has_more ? messages.slice(0, limit) : messages;
    const next_cursor = has_more ? slice[slice.length - 1].created_at : null;

    // Reverse to ascending order for chat display
    const data = slice.reverse().map(m => ({
      id:         m.id,
      sender_id:  m.sender_id,
      content:    m.content,
      read_at:    m.read_at,
      is_read:    m.read_at !== null,
      created_at: m.created_at,
      is_mine:    m.sender_id === uid,
    }));

    // Mark unread messages from the other user as read (async, don't block response)
    supabaseAdmin
      .from('dm_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', uid)
      .is('read_at', null)
      .is('deleted_at', null)
      .then(() => {});

    // Fetch other user's profile for thread header
    const otherId = otherParticipant(conv, uid);
    const { data: otherProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, department, avatar_url, status')
      .eq('id', otherId)
      .single();

    res.json({ data, next_cursor, has_more, other_user: otherProfile || null });
  } catch (err) {
    console.error('[dm GET /conversations/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /conversations/:id/messages — Send message in thread ────────────────

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const uid = req.profile.id;
    const { content } = req.body;

    const msgErr = validateMessage(content);
    if (msgErr) return res.status(400).json({ error: msgErr });

    // Verify participant
    const { data: conv } = await supabaseAdmin
      .from('dm_conversations')
      .select('id, participant_a, participant_b')
      .eq('id', req.params.id)
      .single();

    if (!conv || !isParticipant(conv, uid)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const recipientId = otherParticipant(conv, uid);

    if (await isBlocked(uid, recipientId)) {
      return res.status(403).json({ error: 'Cannot send a message to this user', code: 'BLOCKED' });
    }

    const trimmed = content.trim();
    const { data: msg, error: insertErr } = await supabaseAdmin
      .from('dm_messages')
      .insert({ conversation_id: req.params.id, sender_id: uid, content: trimmed })
      .select('id, sender_id, content, read_at, created_at')
      .single();

    if (insertErr) {
      console.error('[dm POST /conversations/:id/messages]', insertErr);
      return res.status(500).json({ error: 'Database error' });
    }

    // Notify recipient (best-effort)
    notify(recipientId, {
      type:    'dm',
      title:   `New message from ${req.profile.full_name}`,
      body:    trimmed.substring(0, 120),
      refId:   req.params.id,
      refType: 'conversation',
    });

    res.status(201).json({
      data: { ...msg, is_mine: true, is_read: false },
    });
  } catch (err) {
    console.error('[dm POST /conversations/:id/messages]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /conversations/:id/read — Mark conversation as read ────────────────

router.patch('/conversations/:id/read', async (req, res) => {
  try {
    const uid = req.profile.id;

    const { data: conv } = await supabaseAdmin
      .from('dm_conversations')
      .select('id, participant_a, participant_b')
      .eq('id', req.params.id)
      .single();

    if (!conv || !isParticipant(conv, uid)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await supabaseAdmin
      .from('dm_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', uid)
      .is('read_at', null)
      .is('deleted_at', null);

    res.json({ success: true });
  } catch (err) {
    console.error('[dm PATCH /conversations/:id/read]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /conversations/:id/messages/:mid — Soft-delete own message ─────────

router.delete('/conversations/:id/messages/:mid', async (req, res) => {
  try {
    const uid = req.profile.id;

    const { data: msg } = await supabaseAdmin
      .from('dm_messages')
      .select('id, sender_id, conversation_id')
      .eq('id', req.params.mid)
      .eq('conversation_id', req.params.id)
      .is('deleted_at', null)
      .single();

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== uid) return res.status(403).json({ error: 'Can only delete your own messages' });

    await supabaseAdmin
      .from('dm_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', req.params.mid);

    res.json({ success: true });
  } catch (err) {
    console.error('[dm DELETE message]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
