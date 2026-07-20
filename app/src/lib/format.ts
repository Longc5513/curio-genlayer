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
  console.error('Cleaned error source:', error)
  
  if (error instanceof Error) {
    return error.message.replace(/^Error:\s*/, '')
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    
    // Try standard error properties
    const message =
      typeof err.message === 'string' ? err.message :
      typeof err.reason === 'string' ? err.reason :
      typeof err.error === 'string' ? err.error :
      typeof err['Error'] === 'string' ? err['Error'] as string :
      undefined

    if (message) return message.replace(/^Error:\s*/, '')

    // Try nested error objects
    const nested = err.data as Record<string, unknown> | undefined
      || err.originalError as Record<string, unknown> | undefined
      || (err.error as Record<string, unknown> | undefined)
    if (nested && typeof nested === 'object') {
      const nestedMessage =
        typeof nested.message === 'string' ? nested.message :
        typeof nested.reason === 'string' ? nested.reason :
        undefined
      if (nestedMessage) return nestedMessage.replace(/^Error:\s*/, '')
    }

    // Try toString if available
    if (typeof err.toString === 'function') {
      const str = err.toString()
      if (str && str !== '[object Object]') return str
    }

    // Last resort: JSON stringify with error handling
    try {
      const json = JSON.stringify(err)
      if (json && json !== '{}') return json
    } catch {
      // Ignore stringify errors
    }
  }

  const str = String(error)
  return (str && str !== '[object Object]') ? str : 'Unknown error (check console for details)'
}
