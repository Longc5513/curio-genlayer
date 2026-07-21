// ── Curio Learning Bounties Types ───────────────────────────────────
// Matches contracts/curio_learning_bounties.py exactly

export interface LearningBounty {
  bounty_id: string
  requester: string
  title: string
  brief: string
  rubric: string
  reference_url: string
  reward_wei: number
  status: string           // open | submitted | paid | refunded | more_info | cancelled
  contributor: string
  submission_url: string
  submission_note: string
  verdict: string          // pending | accept | reject | more_info | cancelled
  quality_score: number    // 0-100
  criteria_met: number     // 0-10
  reasoning: string
  missing_evidence: string
  created_at: string
  updated_at: string
  review_round: number
}

export interface ContractStats {
  bounty_count: number
  total_escrowed_wei: number
  total_paid_wei: number
  total_refunded_wei: number
}

export interface ContractHealth {
  configured: boolean
  reachable: boolean
  version: string
  stats: ContractStats | null
  error: string
}

export type TxPhase = 'idle' | 'wallet' | 'submitting' | 'consensus' | 'success' | 'error'
export interface TxState { phase: TxPhase; label: string; hash?: string; error?: string }

export type View = 'dashboard' | 'browse' | 'bounty' | 'create' | 'my-bounties' | 'my-submissions'

export const STATUS_META: Record<string, { color: string; label: string; icon: string }> = {
  open:        { color: '#3fb950', label: 'Open',           icon: '🟢' },
  submitted:   { color: '#58a6ff', label: 'Submitted',      icon: '📩' },
  paid:        { color: '#56d4a0', label: 'Paid',           icon: '✅' },
  refunded:    { color: '#f0883e', label: 'Refunded',       icon: '↩️' },
  more_info:   { color: '#d29922', label: 'Needs Revision', icon: '🔄' },
  cancelled:   { color: '#7d8590', label: 'Cancelled',      icon: '❌' },
}

export const VERDICT_META: Record<string, { color: string; label: string }> = {
  pending:    { color: '#7d8590', label: 'Pending Review' },
  accept:     { color: '#3fb950', label: 'Accepted' },
  reject:     { color: '#f85149', label: 'Rejected' },
  more_info:  { color: '#d29922', label: 'More Info Needed' },
  cancelled:  { color: '#7d8590', label: 'Cancelled' },
}
