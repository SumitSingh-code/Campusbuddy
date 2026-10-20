'use strict';

const webpush = require('web-push');

const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject    = process.env.VAPID_SUBJECT || 'mailto:unigramjind@gmail.com';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('[webpush] VAPID details configured successfully');
  } catch (err) {
    console.error('[webpush] Failed to configure VAPID details:', err.message);
  }
} else {
  console.warn('[webpush] VAPID keys missing in environment variables');
}

/**
 * Send push notification to a stored subscription.
 * @param {object} sub - Stored row from push_subscriptions or standard PushSubscription object
 * @param {object} payload - { title, body, url, icon, badge, tag }
 * @returns {Promise<{ success: boolean, expired?: boolean }>}
 */
async function sendWebPush(sub, payload) {
  if (!sub || !sub.endpoint) return { success: false, error: 'Missing endpoint' };

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh || sub.keys?.p256dh,
      auth:   sub.auth   || sub.keys?.auth,
    }
  };

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify({
    title: payload.title || 'UniGram',
    body:  payload.body  || '',
    url:   payload.url   || '/feed',
    icon:  payload.icon  || '/icons/icon-192.png',
    badge: payload.badge || '/icons/favicon-32x32.png',
    tag:   payload.tag   || 'unigram-alert',
  });

  try {
    await webpush.sendNotification(pushSubscription, payloadString, {
      TTL: 60 * 60 * 24, // 24 hours
    });
    return { success: true };
  } catch (err) {
    // 410 Gone or 404 Not Found means the user unsubscribed or uninstalled PWA
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, expired: true, endpoint: sub.endpoint };
    }
    console.warn('[webpush] sendNotification failed:', err.statusCode, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  webpush,
  sendWebPush,
};
