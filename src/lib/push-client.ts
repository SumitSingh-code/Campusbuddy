'use client'

import { api } from './api'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function getVapidPublicKey(): Promise<string | null> {
  let vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    try {
      const res = await api.get<{ publicKey: string }>('/push/public-key')
      vapidKey = res.publicKey
    } catch (e) {
      console.warn('[push-client] Could not fetch public key from server:', e)
    }
  }
  return vapidKey || null
}

export interface SyncResult {
  success: boolean
  error?: string
  reason?: 'unsupported' | 'permission_denied' | 'permission_default' | 'no_key' | 'failed'
  subscription?: PushSubscriptionJSON
}

/**
 * Silently syncs the browser's push subscription with the backend database.
 * Call this automatically when a logged-in user has granted notification permissions.
 */
export async function syncPushSubscription(): Promise<SyncResult> {
  if (!isPushSupported()) {
    return { success: false, reason: 'unsupported' }
  }

  const perm = Notification.permission
  if (perm !== 'granted') {
    return { success: false, reason: perm === 'denied' ? 'permission_denied' : 'permission_default' }
  }

  try {
    // 1. Ensure Service Worker is registered & ready
    let reg: ServiceWorkerRegistration
    try {
      reg = await navigator.serviceWorker.ready
    } catch {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      reg = await navigator.serviceWorker.ready
    }

    if (!reg) {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      reg = await navigator.serviceWorker.ready
    }

    // 2. Fetch VAPID Public Key
    const vapidKey = await getVapidPublicKey()
    if (!vapidKey) {
      return { success: false, reason: 'no_key', error: 'VAPID public key not found' }
    }

    const currentKeyBytes = urlBase64ToUint8Array(vapidKey)

    // 3. Check existing subscription and verify key matching
    let sub = await reg.pushManager.getSubscription()
    if (sub) {
      const existingKey = sub.options?.applicationServerKey
      if (existingKey) {
        const existingArr = new Uint8Array(existingKey)
        const matches =
          existingArr.byteLength === currentKeyBytes.byteLength &&
          existingArr.every((val, idx) => val === currentKeyBytes[idx])

        if (!matches) {
          console.log('[push-client] VAPID key updated, refreshing push subscription...')
          try {
            await sub.unsubscribe()
          } catch {}
          sub = null
        }
      }
      // If browser doesn't expose applicationServerKey on existing sub, keep existing sub!
    }

    // 4. Create fresh subscription if needed
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: currentKeyBytes,
      })
    }

    // 5. Send subscription to backend to register in Supabase push_subscriptions
    await api.post('/push/subscribe', {
      subscription: sub.toJSON(),
      user_agent: navigator.userAgent,
    })

    console.log('[push-client] Device successfully registered for push notifications.')
    return { success: true, subscription: sub.toJSON() }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Push registration failed'
    console.error('[push-client] syncPushSubscription error:', err)
    return { success: false, reason: 'failed', error: msg }
  }
}

/**
 * Explicit user interaction to request permission, sync device subscription, and return status.
 */
export async function enablePushNotifications(): Promise<{
  granted: boolean
  permission: NotificationPermission
  error?: string
}> {
  if (!isPushSupported()) {
    return { granted: false, permission: 'denied', error: 'Push notifications are not supported on this browser' }
  }

  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      return {
        granted: false,
        permission: perm,
        error: perm === 'denied'
          ? 'Notifications are blocked in your browser site settings. Tap the lock icon in the address bar to allow.'
          : 'Notification permission was dismissed.',
      }
    }

    const syncRes = await syncPushSubscription()
    if (!syncRes.success) {
      return {
        granted: true,
        permission: 'granted',
        error: syncRes.error || 'Permission granted, but failed to sync device with server.',
      }
    }

    return { granted: true, permission: 'granted' }
  } catch (err: unknown) {
    return {
      granted: false,
      permission: Notification.permission,
      error: err instanceof Error ? err.message : 'Unknown error enabling push',
    }
  }
}

/**
 * Triggers an instant test notification to this user's registered devices.
 */
export async function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  // Always sync device first so current device is guaranteed to be in Supabase
  const sync = await syncPushSubscription()
  if (!sync.success) {
    throw new Error(sync.error || 'Please enable notifications before testing.')
  }

  const res = await api.post<{ success: boolean; message: string; delivered: number }>('/push/test', {})
  return {
    success: res.success,
    message: res.message || 'Test alert dispatched! Check your notification bar now 📲',
  }
}
