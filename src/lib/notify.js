'use strict';
// Campus Wall — Notification Helper
// Call this from any API route to fire a notification to a user.
// 1. Checks user's granular preferences (DMs, comments, anon replies, notices, etc.)
// 2. Inserts in-app record to 'notifications' table
// 3. Dispatches Web Push notification to recipient's phone / device lockscreen
// Silently ignores errors (notifications are best-effort, never block the main action).

const { supabaseAdmin } = require('./supabase-admin');
const { sendWebPush }   = require('./webpush');

/**
 * Create a notification for a user (In-app + Phone Web Push).
 * @param {string} userId   - Recipient's profile UUID
 * @param {object} options
 * @param {string} options.type     - 'comment'|'dm'|'vote'|'mention'|'admin'|'notice'|'lost_found'|'resource'
 * @param {string} options.title    - Short heading (max ~120 chars)
 * @param {string} [options.body]   - Detail text (max ~200 chars, optional)
 * @param {string} [options.refId]  - UUID of the triggering content
 * @param {string} [options.refType]- 'post'|'anon_post'|'conversation'|'notice'|'lost_found'|'pyq'|'notes'|null
 * @param {string} [options.prefKey]- 'dm'|'comments'|'anon_replies'|'dept_notices'|'lost_found'|'resources'
 * @param {string} [options.url]    - Deep-link URL for push notification click (optional)
 */
async function notify(userId, { type, title, body = null, refId = null, refType = null, prefKey = null, url = null }) {
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

    // 1. Insert in-app notification record
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

    if (error) console.warn('[notify] In-app insert failed:', error.message);

    // 2. Determine target deep-link URL for phone push
    let targetUrl = url;
    if (!targetUrl) {
      if (refType === 'conversation' && refId) {
        targetUrl = `/dm/${refId}`;
      } else if (refType === 'post') {
        targetUrl = '/feed';
      } else if (refType === 'anon_post') {
        targetUrl = '/anon';
      } else if (refType === 'notice') {
        targetUrl = '/notices';
      } else if (refType === 'lost_found') {
        targetUrl = '/lost-found';
      } else if (refType === 'pyq') {
        targetUrl = '/pyq';
      } else if (refType === 'notes') {
        targetUrl = '/notes';
      } else {
        targetUrl = '/notifications';
      }
    }

    // 3. Dispatch Web Push notification to user's registered devices in background
    (async () => {
      try {
        const { data: subs, error: subErr } = await supabaseAdmin
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', userId);

        if (subErr || !subs || subs.length === 0) return;

        const payload = {
          title: title.substring(0, 120),
          body:  body ? body.substring(0, 200) : '',
          url:   targetUrl,
          tag:   `unigram-${type}-${refId || Date.now()}`,
        };

        const expiredIds = [];
        for (const sub of subs) {
          const pushRes = await sendWebPush(sub, payload);
          if (pushRes.expired) {
            expiredIds.push(sub.id);
          }
        }

        // Clean up uninstalled / expired push endpoints
        if (expiredIds.length > 0) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .in('id', expiredIds);
        }
      } catch (pushErr) {
        console.warn('[notify] Web push background dispatch warning:', pushErr.message);
      }
    })();

    return data?.id || null;
  } catch (err) {
    console.warn('[notify] Unexpected error:', err.message);
    return null;
  }
}

module.exports = { notify };
