'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  channelName: string
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  schema?: string
  onPayload: (payload: Record<string, unknown>) => void
  enabled?: boolean
}

/**
 * Subscribe to Supabase Realtime postgres_changes.
 * Handles subscribe/unsubscribe lifecycle and visibility change.
 */
export function useRealtime({
  channelName,
  table,
  event = 'INSERT',
  filter,
  schema = 'public',
  onPayload,
  enabled = true,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onPayload)
  callbackRef.current = onPayload

  useEffect(() => {
    if (!enabled) return

    function subscribe() {
      if (channelRef.current) return

      const channelConfig: Record<string, string> = {
        event,
        schema,
        table,
      }
      if (filter) channelConfig.filter = filter

      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes' as 'system',
          channelConfig,
          (payload: Record<string, unknown>) => {
            callbackRef.current(payload)
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn(`[Realtime] ${channelName} channel error`)
            channelRef.current = null
          }
        })
    }

    function unsubscribe() {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        unsubscribe()
      } else {
        subscribe()
      }
    }

    subscribe()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [channelName, table, event, filter, schema, enabled])
}
