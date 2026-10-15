/** Human-friendly relative timestamp */
export function timeAgo(ts: string | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - d.getTime()
  const secs = diff / 1000
  const mins = secs / 60
  const hrs = mins / 60
  const days = hrs / 24
  const weeks = days / 7
  if (secs < 60) return 'just now'
  if (mins < 60) return `${Math.floor(mins)}m`
  if (hrs < 24) return `${Math.floor(hrs)}h`
  if (days < 7) return `${Math.floor(days)}d`
  if (weeks < 4) return `${Math.floor(weeks)}w`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

/** Full date + time string */
export function fullDateTime(ts: string | null | undefined): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format a Date to "10:41 PM" */
export function formatTime(ts: string | null | undefined): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/** Day separator label: "Today", "Yesterday", or "5 Aug 2026" */
export function dayLabel(ts: string): string {
  const d = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
