'use strict';

// Campus Wall — DM (Direct Messages) Route
// Conversations: deduplicated by sorting participant UUIDs (p1 < p2 lexicographically).
// Privacy: messages are only visible to the two participants.
// Blocks: checked before creating conversation or sending message.

const express = require('express');
const router  = express.Router();
const { authGuard }      = require('../middleware/authGuard');
const { supabaseAdmin }  = require('../lib/supabase');
const { containsProfanity } = require('../lib/profanity');
const { notify }         = require('../lib/notify');

router.use(authGuard);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if either user has blocked the other */
async function isBlocked(uid1, uid2) {
  const { data } = await supabaseAdmin
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${uid1},blocked_id.eq.${uid2}),and(blocker_id.eq.${uid2},blocked_id.eq.${uid1})`
    )
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Determine participant slot (1 or 2) for userId in a conversation */
function slot(conv, userId) {
  if (conv.participant_1 === userId) return 1;
  if (conv.participant_2 === userId) return 2;
  return null;
}

function otherUserId(conv, userId) {
  return conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;
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

// ─── GET /conversations — List all conversations for current user ──────────────

router.get('/conversations', async (req, res) => {
  try {
    const uid = req.profile.id;

    const { data: convos, error } = await supabaseAdmin
      .from('conversations')
      .select('id, participant_1, participant_2, last_message_id, last_message_at, unread_count_1, unread_count_2')
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) {
      console.error('[dm GET /conversations]', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!convos || convos.length === 0) return res.json({ data: [] });

    // Batch fetch other users' profiles
    const otherIds = [...new Set(convos.map(c => otherUserId(c, uid)))];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, department, avatar_url, status')
      .in('id', otherIds);
    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    // Batch fetch last messages
    const msgIds = convos.filter(c => c.last_message_id).map(c => c.last_message_id);
    let msgMap = {};
    if (msgIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from('messages')
        .select('id, content, sender_id')
        .in('id', msgIds);
      (msgs || []).forEach(m => { msgMap[m.id] = m; });
    }

    const data = convos.map(c => {
      const mySlot      = slot(c, uid);
      const lastMsg     = c.last_message_id ? msgMap[c.last_message_id] : null;
      const otherId     = otherUserId(c, uid);
      const unreadCount = mySlot === 1 ? c.unread_count_1 : c.unread_count_2;
      return {
        id:              c.id,
        other_user:      profileMap[otherId] || { id: otherId, full_name: 'Unknown User' },
        last_message:    lastMsg ? lastMsg.content.substring(0, 80) : null,
        last_message_at: c.last_message_at,
        unread_count:    unreadCount || 0,
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

    // Check blocks
    if (await isBlocked(uid, recipient_id)) {
      return res.status(403).json({ error: 'Cannot send a message to this user', code: 'BLOCKED' });
    }

    // Deduplicate: sort participants so p1 < p2
    const [p1, p2] = [uid, recipient_id].sort();

    // Find or create conversation
    let { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('participant_1', p1)
      .eq('participant_2', p2)
      .maybeSingle();

    let convId;
    if (existing) {
      convId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('conversations')
        .insert({ participant_1: p1, participant_2: p2 })
        .select('id')
        .single();
      if (createErr) {
        console.error('[dm POST /conversations] create:', createErr);
        return res.status(500).json({ error: 'Database error' });
      }
      convId = created.id;
    }

    // Insert message
    const trimmed = message.trim();
    const { data: msg, error: msgInsertErr } = await supabaseAdmin
      .from('messages')
      .insert({ conversation_id: convId, sender_id: uid, content: trimmed })
      .select('id, content, sender_id, is_read, created_at')
      .single();

    if (msgInsertErr) {
      console.error('[dm POST /conversations] msg insert:', msgInsertErr);
      return res.status(500).json({ error: 'Database error' });
    }

    // Update conversation: last message + increment recipient unread count
    const recipientIsP1 = recipient_id === p1;
    const unreadField   = recipientIsP1 ? 'unread_count_1' : 'unread_count_2';

    // Fetch current unread count to increment
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select(`id, ${unreadField}`)
      .eq('id', convId)
      .single();

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_id:   msg.id,
        last_message_at:   msg.created_at,
        [unreadField]:     (conv?.[unreadField] || 0) + 1,
      })
      .eq('id', convId);

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
        message: { ...msg, is_mine: true },
      },
    });
  } catch (err) {
    console.error('[dm POST /conversations]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /conversations/:id — Messages in thread (cursor paginated) ────────────
// Newest messages first internally (DESC), reversed to ascending for chat display.
// Client passes ?before=<timestamp> to load older messages (scroll-up pagination).

router.get('/conversations/:id', async (req, res) => {
  try {
    const uid   = req.profile.id;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));
    const before = req.query.before || new Date().toISOString();

    // Verify participant
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id, participant_1, participant_2, unread_count_1, unread_count_2')
      .eq('id', req.params.id)
      .single();

    if (!conv || !slot(conv, uid)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Fetch messages (newest first for pagination, reversed before sending)
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, content, is_read, read_at, created_at')
      .eq('conversation_id', req.params.id)
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

    // Reverse to ascending order for chat display (oldest first in batch)
    const data = slice.reverse().map(m => ({
      ...m,
      is_mine: m.sender_id === uid,
    }));

    // Mark conversation as read for current user (async, don't await)
    const mySlot      = slot(conv, uid);
    const unreadField = `unread_count_${mySlot}`;
    if ((conv[unreadField] || 0) > 0) {
      supabaseAdmin
        .from('conversations')
        .update({ [unreadField]: 0 })
        .eq('id', req.params.id)
        .then(() => {
          // Also mark unread messages from other user as read
          supabaseAdmin
            .from('messages')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('conversation_id', req.params.id)
            .neq('sender_id', uid)
            .eq('is_read', false)
            .then(() => {});
        });
    }

    // Fetch other user's profile for thread header
    const otherId = otherUserId(conv, uid);
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

// ─── POST /conversations/:id/messages — Send message ─────────────────────────

router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const uid = req.profile.id;
    const { content } = req.body;

    const msgErr = validateMessage(content);
    if (msgErr) return res.status(400).json({ error: msgErr });

    // Verify participant
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id, participant_1, participant_2, unread_count_1, unread_count_2')
      .eq('id', req.params.id)
      .single();

    if (!conv || !slot(conv, uid)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const recipientId = otherUserId(conv, uid);

    // Check blocks
    if (await isBlocked(uid, recipientId)) {
      return res.status(403).json({ error: 'Cannot send a message to this user', code: 'BLOCKED' });
    }

    const trimmed = content.trim();
    const { data: msg, error: insertErr } = await supabaseAdmin
      .from('messages')
      .insert({ conversation_id: req.params.id, sender_id: uid, content: trimmed })
      .select('id, sender_id, content, is_read, created_at')
      .single();

    if (insertErr) {
      console.error('[dm POST /conversations/:id/messages]', insertErr);
      return res.status(500).json({ error: 'Database error' });
    }

    // Update conversation
    const recipientIsP1 = recipientId === conv.participant_1;
    const unreadField   = recipientIsP1 ? 'unread_count_1' : 'unread_count_2';
    const prevUnread    = recipientIsP1 ? conv.unread_count_1 : conv.unread_count_2;

    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_id: msg.id,
        last_message_at: msg.created_at,
        [unreadField]:   (prevUnread || 0) + 1,
      })
      .eq('id', req.params.id);

    // Notify recipient (best-effort, async)
    notify(recipientId, {
      type:    'dm',
      title:   `New message from ${req.profile.full_name}`,
      body:    trimmed.substring(0, 120),
      refId:   req.params.id,
      refType: 'conversation',
    });

    res.status(201).json({ data: { ...msg, is_mine: true } });
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
      .from('conversations')
      .select('id, participant_1, participant_2')
      .eq('id', req.params.id)
      .single();

    if (!conv || !slot(conv, uid)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const mySlot = slot(conv, uid);
    await supabaseAdmin
      .from('conversations')
      .update({ [`unread_count_${mySlot}`]: 0 })
      .eq('id', req.params.id);

    await supabaseAdmin
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', req.params.id)
      .neq('sender_id', uid)
      .eq('is_read', false);

    res.json({ success: true });
  } catch (err) {
    console.error('[dm PATCH /conversations/:id/read]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /conversations/:id/messages/:mid — Delete own message ─────────────

router.delete('/conversations/:id/messages/:mid', async (req, res) => {
  try {
    const uid = req.profile.id;
    const { data: msg } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, conversation_id')
      .eq('id', req.params.mid)
      .eq('conversation_id', req.params.id)
      .single();

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.sender_id !== uid) return res.status(403).json({ error: 'Can only delete your own messages' });

    await supabaseAdmin.from('messages').delete().eq('id', req.params.mid);

    res.json({ success: true });
  } catch (err) {
    console.error('[dm DELETE message]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
