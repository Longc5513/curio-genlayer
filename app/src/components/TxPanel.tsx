import { formatGen } from '../lib/format'
import { transactionUrl } from '../lib/genlayer'
import type { TxState } from '../lib/types'

export function TxPanel({ state }: { state: TxState }) {
  if (state.phase === 'idle') return null
  const url = transactionUrl(state.hash)
  const hasEvidence = state.phase === 'success' && (
    state.executionResult || state.submittedValueWei !== undefined || state.emittedMessageCount !== undefined
  )
  return (
    <div className={`tx-panel tx-panel--${state.phase}`} aria-live="polite">
      <div className="tx-dot" />
      <div className="tx-copy">
        <strong>{state.label}</strong>
        {state.hash && <code>{state.hash}</code>}
        {state.error && <p>{state.error}</p>}
        {hasEvidence && (
          <div className="tx-evidence">
            <span>Execution: <b>{state.executionResult || 'FINALIZED'}</b></span>
            {state.submittedValueWei !== undefined && state.submittedValueWei > 0n && (
              <span>GEN sent into escrow: <b>{formatGen(state.submittedValueWei)}</b></span>
            )}
            {state.emittedMessageCount !== undefined && (
              <span>Settlement messages: <b>{state.emittedMessageCount}</b></span>
            )}
            {state.emittedValueWei !== undefined && state.emittedValueWei > 0n && (
              <span>GEN emitted for settlement: <b>{formatGen(state.emittedValueWei)}</b></span>
            )}
          </div>
        )}
        {url && <a href={url} target="_blank" rel="noreferrer">Open transaction in explorer ↗</a>}
      </div>
    </div>
  )
}
