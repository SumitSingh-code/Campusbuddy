'use strict';
// Campus Wall — Notification Helper
// Call this from any API route to fire a notification to a user.
// Silently ignores errors (notifications are best-effort, never block the main action).

const { supabaseAdmin } = require('./supabase');

/**
 * Create a notification for a user.
 * @param {string} userId   - Recipient's profile UUID
 * @param {object} options
 * @param {string} options.type     - 'comment'|'dm'|'vote'|'mention'|'admin'
 * @param {string} options.title    - Short heading (max ~60 chars)
 * @param {string} [options.body]   - Detail text (max ~160 chars, optional)
 * @param {string} [options.refId]  - UUID of the triggering content
 * @param {string} [options.refType]- 'post'|'anon_post'|'conversation'|null
 */
async function notify(userId, { type, title, body = null, refId = null, refType = null }) {
  if (!userId || !type || !title) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id:  userId,
        type,
        title:    title.substring(0, 120),
        body:     body ? body.substring(0, 200) : null,
        ref_id:   refId   || null,
        ref_type: refType || null,
      })
      .select('id')
      .single();
    if (error) console.warn('[notify] Insert failed:', error.message);
    return data?.id || null;
  } catch (err) {
    console.warn('[notify] Unexpected error:', err.message);
    return null;
  }
}

module.exports = { notify };
