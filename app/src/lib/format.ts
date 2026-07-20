const GEN_DECIMALS = 18n
const GEN_BASE = 10n ** GEN_DECIMALS

export function parseGen(value: string): bigint {
  const clean = value.trim()
  if (!/^\d+(\.\d{0,18})?$/.test(clean)) throw new Error('Enter a valid GEN amount')
  const [whole, fraction = ''] = clean.split('.')
  const padded = `${fraction}000000000000000000`.slice(0, 18)
  return BigInt(whole) * GEN_BASE + BigInt(padded)
}

export function formatGen(value: string | number | bigint): string {
  const raw = BigInt(value)
  const whole = raw / GEN_BASE
  const fraction = (raw % GEN_BASE).toString().padStart(18, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction.slice(0, 4)} GEN` : `${whole} GEN`
}

export function shortAddress(value?: string): string {
  if (!value) return 'Not connected'
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function readableObjectError(error: Record<string, unknown>, seen: Set<unknown>): string {
  if (seen.has(error)) return ''
  seen.add(error)

  for (const key of ['shortMessage', 'message', 'details', 'reason'] as const) {
    const value = error[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  for (const key of ['data', 'cause', 'error', 'originalError'] as const) {
    const value = error[key]
    const nested = extractError(value, seen)
    if (nested) return nested
  }

  const code = typeof error.code === 'number' ? error.code : undefined
  if (code === 4001) return 'Request rejected in the wallet.'
  if (code === -32002) return 'A wallet request is already pending. Open the wallet extension and complete it.'
  if (code === 4902) return 'The GenLayer network has not been added to this wallet.'

  try {
    const serialized = JSON.stringify(error, (_key, value) => typeof value === 'bigint' ? value.toString() : value)
    if (serialized && serialized !== '{}') return serialized
  } catch {
    // Fall through to a stable user-facing message.
  }
  return ''
}

function extractError(error: unknown, seen = new Set<unknown>()): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') return String(error)
  if (error && typeof error === 'object') return readableObjectError(error as Record<string, unknown>, seen)
  return ''
}

export function cleanError(error: unknown): string {
  const message = extractError(error).replace(/^Error:\s*/, '').trim()
  return message || 'Unknown wallet or RPC error. Open the wallet extension, cancel pending requests, and retry.'
}
