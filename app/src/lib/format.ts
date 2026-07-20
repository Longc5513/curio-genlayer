export function shortAddr(v?: string) { return v ? `${v.slice(0,6)}…${v.slice(-4)}` : 'N/A' }
export function scoreColor(s: number) { return s >= 80 ? '#72e8b7' : s >= 60 ? '#ffd793' : s >= 40 ? '#9edcff' : '#ff8a78' }
export function cleanError(e: unknown): string {
  if (e instanceof Error) return e.message.replace(/^Error:\s*/,'')
  if (typeof e === 'string') return e
  return 'Unknown error'
}
