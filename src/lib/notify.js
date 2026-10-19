'use strict';
// Campus Wall — Notification Helper
// Call this from any API route to fire a notification to a user.
// Silently ignores errors (notifications are best-effort, never block the main action).

const { supabaseAdmin } = require('./supabase-admin');

/**
 * Create a notification for a user.
 * @param {string} userId   - Recipient's profile UUID
 * @param {object} options
 * @param {string} options.type     - 'comment'|'dm'|'vote'|'mention'|'admin'|'notice'|'lost_found'
 * @param {string} options.title    - Short heading (max ~120 chars)
 * @param {string} [options.body]   - Detail text (max ~200 chars, optional)
 * @param {string} [options.refId]  - UUID of the triggering content
 * @param {string} [options.refType]- 'post'|'anon_post'|'conversation'|'notice'|null
 * @param {string} [options.prefKey]- 'dm'|'comments'|'anon_replies'|'dept_notices'|'lost_found'|'resources'
 */
async function notify(userId, { type, title, body = null, refId = null, refType = null, prefKey = null }) {
  if (!userId || !type || !title) return null;
  try {
    // If a prefKey is provided, check if recipient has opted out (or not opted into) this category
    if (prefKey) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('notification_preferences')
          .eq('id', userId)
          .maybeSingle();

        const OPT_IN_ONLY = ['lost_found', 'resources'];
        const userPrefs = profile?.notification_preferences || {};

        if (OPT_IN_ONLY.includes(prefKey)) {
          // Off by default — only deliver if user explicitly enabled it
          if (userPrefs[prefKey] !== true) {
            return null;
          }
        } else {
          // On by default — deliver unless user explicitly disabled it
          if (userPrefs[prefKey] === false) {
            return null;
          }
        }
      } catch (prefErr) {
        // If column doesn't exist yet or read fails, proceed safely
      }
    }

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
