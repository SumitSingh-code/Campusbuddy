import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes with deduplication */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Debounce a function call */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

/** Deterministic hash: department string → color index 0-9 */
export function getDeptColorIndex(dept: string): number {
  if (!dept) return 0
  let hash = 0
  for (let i = 0; i < dept.length; i++) {
    hash = Math.imul(31, hash) + dept.charCodeAt(i) | 0
  }
  return Math.abs(hash) % 10
}

/** Department color pairs (bg, text) for the 10 hues */
export const DEPT_COLORS = [
  { bg: 'var(--d0-bg)', text: 'var(--d0-tx)' },
  { bg: 'var(--d1-bg)', text: 'var(--d1-tx)' },
  { bg: 'var(--d2-bg)', text: 'var(--d2-tx)' },
  { bg: 'var(--d3-bg)', text: 'var(--d3-tx)' },
  { bg: 'var(--d4-bg)', text: 'var(--d4-tx)' },
  { bg: 'var(--d5-bg)', text: 'var(--d5-tx)' },
  { bg: 'var(--d6-bg)', text: 'var(--d6-tx)' },
  { bg: 'var(--d7-bg)', text: 'var(--d7-tx)' },
  { bg: 'var(--d8-bg)', text: 'var(--d8-tx)' },
  { bg: 'var(--d9-bg)', text: 'var(--d9-tx)' },
]
