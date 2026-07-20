export interface Company {
  company_id: string; name: string; industry: string; description: string
  website: string; contact_email: string; created_at: string; updated_at: string; is_active: boolean
}
export interface AdjudicationTask {
  task_id: string; company_id: string; field: string; title: string; description: string
  criteria: string; status: string; created_at: string; updated_at: string
}
export interface AdjudicationResult {
  result_id: string; task_id: string; company_id: string; field: string
  overall_score: number; criteria_scores: string; verdict: string
  reasoning: string; recommendations: string; evaluator_notes: string; completed_at: string
}
export interface BatchJob {
  batch_id: string; name: string; company_ids: string; field: string; criteria: string
  status: string; total: number; completed: number; failed: number; created_at: string; completed_at: string
}
export interface ContractStats {
  total_companies: number; total_tasks: number; total_results: number
  total_batches: number; supported_fields: string[]
}
export interface ContractHealth {
  configured: boolean; reachable: boolean; version: string; stats: ContractStats | null; error: string
}
export type TxPhase = 'idle' | 'wallet' | 'submitting' | 'consensus' | 'success' | 'error'
export interface TxState { phase: TxPhase; label: string; hash?: string; error?: string }
