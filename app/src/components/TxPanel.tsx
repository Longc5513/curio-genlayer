import { transactionUrl } from '../lib/genlayer'
import type { TxState } from '../lib/types'

export function TxPanel({ state }: { state: TxState }) {
  if (state.phase === 'idle') return null
  const url = transactionUrl(state.hash)
  return (
    <div className={`tx-panel tx-panel--${state.phase}`} aria-live="polite">
      <div className="tx-dot" />
      <div className="tx-copy">
        <strong>{state.label}</strong>
        {state.hash && <code>{state.hash}</code>}
        {state.error && <p>{state.error}</p>}
        {url && <a href={url} target="_blank" rel="noreferrer">Open in explorer ↗</a>}
      </div>
    </div>
  )
}
