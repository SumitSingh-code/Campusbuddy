'use strict';

const express = require('express');
const router  = express.Router();
const { authGuard }     = require('../middleware/authGuard');
const { supabaseAdmin } = require('../lib/supabase-admin');
const { sendWebPush }   = require('../lib/webpush');

// ─── GET /public-key — Provide VAPID Public Key to frontend client ───────────
router.get('/public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID public key not configured on server' });
  }
  res.json({ publicKey });
});

// All following routes require authentication
router.use(authGuard);

// ─── POST /subscribe — Register / Upsert a device push subscription ───────────
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, user_agent } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    const endpoint = subscription.endpoint;
    const p256dh   = subscription.keys?.p256dh;
    const auth     = subscription.keys?.auth;

    if (!p256dh || !auth) {
      return res.status(400).json({ error: 'Subscription missing p256dh or auth keys' });
    }

    const userId = req.profile.id;

    // Upsert subscription into push_subscriptions table
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id:    userId,
        endpoint:   endpoint,
        p256dh:     p256dh,
        auth:       auth,
        user_agent: user_agent || req.headers['user-agent'] || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })
      .select('id, endpoint, created_at')
      .single();

    if (error) {
      console.error('[push /subscribe] DB error:', error.message);
      return res.status(500).json({ error: 'Failed to save push subscription' });
    }

    console.log(`[push /subscribe] Device registered successfully for user ${userId}`);
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[push /subscribe] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /unsubscribe — Remove a device push subscription ───────────────────
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', req.profile.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push /unsubscribe] DB error:', error.message);
      return res.status(500).json({ error: 'Failed to delete subscription' });
    }

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('[push /unsubscribe] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /test — Send an instant test push to the user's active device ──────
router.post('/test', async (req, res) => {
  try {
    const userId = req.profile.id;

    // Fetch all active subscriptions for this user
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch device subscriptions' });
    }

    if (!subs || subs.length === 0) {
      return res.status(404).json({
        error: 'No active device subscription found. Please tap "Enable" in notification settings first.'
      });
    }

    const payload = {
      title: 'UniGram Test Alert! 🔔',
      body: 'Awesome! Real-time notifications are active on your lock screen and notification bar.',
      url: '/settings',
      tag: 'test-alert-' + Date.now(),
    };

    let deliveredCount = 0;
    const expiredIds   = [];

    for (const sub of subs) {
      const result = await sendWebPush(sub, payload);
      if (result.success) {
        deliveredCount++;
      } else if (result.expired) {
        expiredIds.push(sub.id);
      }
    }

    // Clean up any dead/expired subscriptions
    if (expiredIds.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', expiredIds);
    }

    res.json({
      success: true,
      delivered: deliveredCount,
      total_devices: subs.length,
      message: `Test notification sent to ${deliveredCount} device(s)!`
    });
  } catch (err) {
    console.error('[push /test] Error:', err);
    res.status(500).json({ error: 'Failed to send test push' });
  }
});

module.exports = router;
