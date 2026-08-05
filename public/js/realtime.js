// Campus Wall — Realtime Subscriptions (Frontend)
// Supabase Realtime subscriptions for DMs and notifications.
// Channels are torn down when the tab is hidden (visibilitychange)
// and restored on visible — to stay within the 200-connection free-tier cap.
import supabase from './supabase.js';

let dmChannel = null;
let notifChannel = null;
let currentUserId = null;
let onMessageCb = null;
let onNotifCb  = null;

/** Initialize realtime for a given user. Call after login. */
export function initRealtime(userId, { onMessage, onNotification } = {}) {
  currentUserId = userId;
  onMessageCb   = onMessage   || null;
  onNotifCb     = onNotification || null;

  _subscribe();

  // Tear down when tab hidden, restore on visible
  document.addEventListener('visibilitychange', _handleVisibilityChange);
}

/** Tear down all channels. Call on logout. */
export function destroyRealtime() {
  _unsubscribe();
  document.removeEventListener('visibilitychange', _handleVisibilityChange);
  currentUserId = null;
  onMessageCb   = null;
  onNotifCb     = null;
}

/** Update the active conversation ID filter (call when entering a DM thread). */
export function setActiveConversation(conversationId) {
  // Re-subscribe with updated filter if needed
  // For simplicity, we subscribe to all messages for the user's conversations
  // and filter client-side.
  // This is fine for MVP scale.
}

function _handleVisibilityChange() {
  if (document.hidden) {
    _unsubscribe();
  } else {
    if (currentUserId) _subscribe();
  }
}

function _subscribe() {
  if (!currentUserId) return;

  // ── Notifications channel ──────────────────────────────────────────────────
  if (!notifChannel) {
    notifChannel = supabase
      .channel(`notif-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          if (onNotifCb) onNotifCb(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Notification channel error — will retry on next visibility');
          notifChannel = null;
        }
      });
  }

  // ── Messages channel ───────────────────────────────────────────────────────
  // We subscribe to all new messages where the conversation involves this user.
  // RLS on messages ensures they only receive their own.
  if (!dmChannel) {
    dmChannel = supabase
      .channel(`dm-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'dm_messages',
        },
        (payload) => {
          if (onMessageCb) onMessageCb(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] DM channel error — will retry on next visibility');
          dmChannel = null;
        }
      });
  }
}

function _unsubscribe() {
  if (notifChannel) {
    supabase.removeChannel(notifChannel);
    notifChannel = null;
  }
  if (dmChannel) {
    supabase.removeChannel(dmChannel);
    dmChannel = null;
  }
}
