'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseInfiniteScrollOptions<T> {
  fetchFn: (cursor: string | null) => Promise<{
    items: T[]
    nextCursor: string | null
    hasMore: boolean
  }>
  enabled?: boolean
}

interface UseInfiniteScrollReturn<T> {
  items: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  sentinelRef: React.RefObject<HTMLDivElement | null>
  refresh: () => Promise<void>
  setItems: React.Dispatch<React.SetStateAction<T[]>>
}

export function useInfiniteScroll<T>({
  fetchFn,
  enabled = true,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async (isInitial: boolean) => {
    if (loadingRef.current || (!isInitial && !hasMore)) return
    loadingRef.current = true

    if (isInitial) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const currentCursor = isInitial ? null : cursor
      const result = await fetchFn(currentCursor)

      if (isInitial) {
        setItems(result.items)
      } else {
        setItems(prev => [...prev, ...result.items])
      }
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      loadingRef.current = false
    }
  }, [cursor, hasMore, fetchFn])

  // Initial load
  useEffect(() => {
    if (enabled) {
      loadMore(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !enabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          loadMore(false)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, enabled, loadMore])

  const refresh = useCallback(async () => {
    setCursor(null)
    setHasMore(true)
    await loadMore(true)
  }, [loadMore])

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    sentinelRef,
    refresh,
    setItems,
  }
}
