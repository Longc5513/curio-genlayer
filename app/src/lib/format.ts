export function shortAddr(v?: string): string {
  return v ? `${v.slice(0, 6)}…${v.slice(-4)}` : 'N/A'
}

export function weiToGen(wei: number): string {
  const gen = wei / 1e18
  if (gen === 0) return '0'
  if (gen < 0.001) return '<0.001'
  if (gen < 1) return gen.toFixed(4)
  if (gen < 1000) return gen.toFixed(2)
  return `${(gen / 1000).toFixed(1)}K`
}

export function scoreColor(s: number): string {
  if (s >= 80) return '#3fb950'
  if (s >= 60) return '#58a6ff'
  if (s >= 40) return '#d29922'
  return '#f85149'
}

export function verdictColor(v: string): string {
  switch (v) {
    case 'accept': return '#3fb950'
    case 'reject': return '#f85149'
    case 'more_info': return '#d29922'
    default: return '#7d8590'
  }
}

export function cleanError(e: unknown): string {
  if (e instanceof Error) return e.message.replace(/^Error:\s*/, '')
  if (typeof e === 'string') return e
  return 'Unknown error'
}

export function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = Math.max(0, now - then)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch { return dateStr }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}
