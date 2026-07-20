export type BountyStatus =
  | 'open'
  | 'submitted'
  | 'more_info'
  | 'paid'
  | 'refunded'
  | 'cancelled'

export interface LearningBounty {
  bounty_id: string
  requester: `0x${string}`
  title: string
  brief: string
  rubric: string
  reference_url: string
  reward_wei: string | number | bigint
  status: BountyStatus
  contributor: `0x${string}`
  submission_url: string
  submission_note: string
  verdict: 'pending' | 'accept' | 'reject' | 'more_info' | 'cancelled'
  quality_score: number
  criteria_met: number
  reasoning: string
  missing_evidence: string
  created_at: string
  updated_at: string
  review_round: number
}

export type TxPhase = 'idle' | 'wallet' | 'submitting' | 'consensus' | 'success' | 'error'

export interface TxState {
  phase: TxPhase
  label: string
  hash?: `0x${string}`
  error?: string
}
