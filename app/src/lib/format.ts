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

export function cleanError(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/^Error:\s*/, '')
  return String(error)
}
