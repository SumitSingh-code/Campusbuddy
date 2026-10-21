'use strict';
// Campus Wall — Notification Helper
// 1. Checks user's granular preferences (DMs, comments, anon replies, notices, etc.)
// 2. Inserts in-app record to 'notifications' table
// 3. Dispatches Web Push notification to recipient's phone / device lockscreen
// 4. Fully awaited with timeout protection so serverless containers never freeze before dispatching.

const { supabaseAdmin } = require('./supabase-admin');
const { sendWebPush }   = require('./webpush');

/**
 * Helper to determine target URL based on refType and refId
 */
function resolveTargetUrl(refType, refId, explicitUrl) {
  if (explicitUrl) return explicitUrl;
  if (refType === 'conversation' && refId) return `/dm/${refId}`;
  if (refType === 'post') return '/feed';
  if (refType === 'anon_post') return '/anon';
  if (refType === 'notice') return '/notices';
  if (refType === 'lost_found') return '/lost-found';
  if (refType === 'pyq') return '/pyq';
  if (refType === 'notes') return '/notes';
  return '/notifications';
}

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

    if (error) console.warn('[notify] In-app insert warning:', error.message);

    // 2. Determine target deep-link URL for phone push
    const targetUrl = resolveTargetUrl(refType, refId, url);

    // 3. Dispatch Web Push notification to user's registered devices (AWAITED to prevent serverless freeze)
    try {
      const { data: subs, error: subErr } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId);

      if (!subErr && subs && subs.length > 0) {
        const payload = {
          title: title.substring(0, 120),
          body:  body ? body.substring(0, 200) : '',
          url:   targetUrl,
          tag:   `unigram-${type}-${refId || Date.now()}`,
        };

        const expiredIds = [];
        const pushPromises = subs.map(async (sub) => {
          const pushRes = await sendWebPush(sub, payload);
          if (pushRes.expired) {
            expiredIds.push(sub.id);
          }
          return pushRes;
        });

        // Concurrently await all pushes to the user's devices
        await Promise.allSettled(pushPromises);

        // Prune expired or uninstalled endpoints asynchronously
        if (expiredIds.length > 0) {
          supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .in('id', expiredIds)
            .then(() => {})
            .catch(() => {});
        }
      }
    } catch (pushErr) {
      console.warn('[notify] Web push dispatch warning:', pushErr.message);
    }

    return data?.id || null;
  } catch (err) {
    console.warn('[notify] Unexpected error:', err.message);
    return null;
  }
}

/**
 * Efficiently send a broadcast notification to multiple users.
 * 1. Filters users based on notification_preferences
 * 2. Bulk inserts in-app notification records in a single query
 * 3. Bulk fetches all push_subscriptions for recipient users in a single query
 * 4. Dispatches web push notifications concurrently in parallel
 */
async function notifyBatch(userIds, { type, title, body = null, refId = null, refType = null, prefKey = null, url = null }) {
  if (!Array.isArray(userIds) || userIds.length === 0 || !type || !title) return { delivered: 0 };

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return { delivered: 0 };

  try {
    let eligibleUserIds = uniqueUserIds;

    // Check preferences in bulk if prefKey is provided
    if (prefKey) {
      try {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, notification_preferences')
          .in('id', uniqueUserIds);

        const OPT_IN_ONLY = ['lost_found', 'resources'];
        const isOptIn = OPT_IN_ONLY.includes(prefKey);

        eligibleUserIds = (profiles || [])
          .filter(p => {
            const prefs = p.notification_preferences || {};
            if (isOptIn) {
              return prefs[prefKey] === true;
            } else {
              return prefs[prefKey] !== false;
            }
          })
          .map(p => p.id);
      } catch (prefErr) {
        console.warn('[notifyBatch] Preference check error, continuing with all:', prefErr.message);
      }
    }

    if (eligibleUserIds.length === 0) return { delivered: 0 };

    // 1. Bulk insert in-app notification records (single query)
    const inAppRows = eligibleUserIds.map(uid => ({
      user_id:  uid,
      type,
      title:    title.substring(0, 120),
      body:     body ? body.substring(0, 200) : null,
      ref_id:   refId   || null,
      ref_type: refType || null,
    }));

    const { error: insertErr } = await supabaseAdmin
      .from('notifications')
      .insert(inAppRows);

    if (insertErr) console.warn('[notifyBatch] In-app bulk insert warning:', insertErr.message);

    // 2. Determine target deep-link URL
    const targetUrl = resolveTargetUrl(refType, refId, url);

    // 3. Bulk fetch push subscriptions for all eligible users (single query)
    const { data: subs, error: subErr } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', eligibleUserIds);

    if (subErr || !subs || subs.length === 0) {
      return { delivered: 0, in_app_count: eligibleUserIds.length };
    }

    const payload = {
      title: title.substring(0, 120),
      body:  body ? body.substring(0, 200) : '',
      url:   targetUrl,
      tag:   `unigram-${type}-${refId || Date.now()}`,
    };

    // 4. Concurrently dispatch push to all subscriptions in parallel
    const expiredIds = [];
    const pushPromises = subs.map(async (sub) => {
      const res = await sendWebPush(sub, payload);
      if (res.expired) expiredIds.push(sub.id);
      return res;
    });

    const results = await Promise.allSettled(pushPromises);
    const deliveredCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;

    // Prune expired endpoints asynchronously
    if (expiredIds.length > 0) {
      supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', expiredIds)
        .then(() => {})
        .catch(() => {});
    }

    return { delivered: deliveredCount, in_app_count: eligibleUserIds.length };
  } catch (err) {
    console.error('[notifyBatch] Error:', err);
    return { delivered: 0, error: err.message };
  }
}

module.exports = {
  notify,
  notifyBatch,
};
