import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import type { TransactionHash } from 'genlayer-js/types'
import type { CalldataEncodable } from 'genlayer-js/types'

type Address = `0x${string}`

const CONTRACT_ADDRESS = '0x668d5D34d9a58447410bb1f06B14496CE6Bb7D46' as Address
const EXPLORER_BASE = 'https://explorer-studio.genlayer.com'

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

interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
  isMetaMask?: boolean; providers?: Eip1193Provider[]
}

let activeProvider: Eip1193Provider | null = null
const isAddr = (v: string): v is Address => /^0x[a-fA-F0-9]{40}$/.test(v)

function getProviders(): Eip1193Provider[] {
  const eth = (window as any).ethereum
  if (!eth) return []
  return Array.isArray(eth.providers) ? [...new Set(eth.providers)] : [eth]
}

async function getProvider(): Promise<Eip1193Provider | null> {
  if (activeProvider) return activeProvider
  const p = getProviders()
  activeProvider = p.find((x) => x.isMetaMask) || p[0] || null
  return activeProvider
}

export const readClient = createClient({ chain: studionet })

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  return 'Unknown error'
}

export async function connectWallet(): Promise<Address> {
  const p = await getProvider()
  if (!p) throw new Error('Install MetaMask')
  const accs = await p.request({ method: 'eth_requestAccounts' })
  const a = Array.isArray(accs) ? String(accs[0] || '') : ''
  if (!isAddr(a)) throw new Error('No account')
  return a
}

export async function getConnectedWallet(): Promise<Address | null> {
  const p = await getProvider()
  if (!p) return null
  try {
    const accs = await p.request({ method: 'eth_accounts' })
    const a = Array.isArray(accs) ? String(accs[0] || '') : ''
    return isAddr(a) ? a : null
  } catch { return null }
}

export async function ensureWalletNetwork(): Promise<void> {
  const p = await getProvider()
  if (!p) throw new Error('No wallet')
  const hex = `0x${studionet.id.toString(16)}`
  const cur = String(await p.request({ method: 'eth_chainId' })).toLowerCase()
  if (cur === hex.toLowerCase()) return
  try {
    await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
  } catch {
    await p.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: hex, chainName: studionet.name, rpcUrls: studionet.rpcUrls.default.http, nativeCurrency: studionet.nativeCurrency }],
    })
    await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
  }
}

export function subscribeWallet(onAcc: (a: Address | null) => void, onChain: () => void): () => void {
  const p = activeProvider || getProviders()[0]
  if (!p) return () => {}
  const fn = (...args: unknown[]) => {
    const accs = Array.isArray(args[0]) ? args[0] : []
    onAcc(isAddr(String(accs[0] || '')) ? String(accs[0]) as Address : null)
  }
  p.on?.('accountsChanged', fn)
  p.on?.('chainChanged', () => onChain())
  return () => { p.removeListener?.('accountsChanged', fn); p.removeListener?.('chainChanged', onChain) }
}

export async function getContractHealth(): Promise<ContractHealth> {
  try {
    const [v, s] = await Promise.all([
      readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_contract_version', args: [] }),
      readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_stats', args: [] }),
    ])
    return { configured: true, reachable: true, version: String(v), stats: s as unknown as ContractStats, error: '' }
  } catch (e) { return { configured: true, reachable: false, version: '', stats: null, error: errMsg(e) } }
}

export async function listCompanies(): Promise<Company[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_companies', args: [] })
  return Array.isArray(r) ? r as unknown as Company[] : []
}
export async function listActiveCompanies(): Promise<Company[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_active_companies', args: [] })
  return Array.isArray(r) ? r as unknown as Company[] : []
}
export async function listCompanyTasks(cid: string): Promise<AdjudicationTask[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_tasks', args: [cid] })
  return Array.isArray(r) ? r as unknown as AdjudicationTask[] : []
}
export async function listCompanyResults(cid: string): Promise<AdjudicationResult[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_results', args: [cid] })
  return Array.isArray(r) ? r as unknown as AdjudicationResult[] : []
}
export async function listBatches(): Promise<BatchJob[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_batches', args: [] })
  return Array.isArray(r) ? r as unknown as BatchJob[] : []
}
export async function getSupportedFields(): Promise<string[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_supported_fields', args: [] })
  return Array.isArray(r) ? r as string[] : []
}

async function write(account: Address, fn: string, args: unknown[], onHash?: (h: string) => void): Promise<string> {
  const p = await getProvider()
  if (!p) throw new Error('Wallet not connected')
  await ensureWalletNetwork()
  const client = createClient({ chain: studionet, account, provider: p })
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args: args as CalldataEncodable[] }) as unknown as TransactionHash
  onHash?.(hash)
  await readClient.waitForTransactionReceipt({ hash })
  return hash
}

export const addCompany = (acc: Address, cid: string, name: string, industry: string, desc: string, web: string, email: string, onHash?: (h: string) => void) =>
  write(acc, 'add_company', [cid, name, industry, desc, web, email], onHash)

export const batchAddCompanies = (acc: Address, json: string, onHash?: (h: string) => void) =>
  write(acc, 'batch_add_companies', [json], onHash)

export const createTask = (acc: Address, tid: string, cid: string, field: string, title: string, desc: string, criteria: string, onHash?: (h: string) => void) =>
  write(acc, 'create_task', [tid, cid, field, title, desc, criteria], onHash)

export const batchCreateTasks = (acc: Address, name: string, cids: string, field: string, titleT: string, descT: string, criteria: string, onHash?: (h: string) => void) =>
  write(acc, 'batch_create_tasks', [name, cids, field, titleT, descT, criteria], onHash)

export const adjudicate = (acc: Address, tid: string, onHash?: (h: string) => void) =>
  write(acc, 'adjudicate', [tid], onHash)

export const batchAdjudicate = (acc: Address, bid: string, onHash?: (h: string) => void) =>
  write(acc, 'batch_adjudicate', [bid], onHash)

export const transactionUrl = (hash?: string) => hash ? `${EXPLORER_BASE}/tx/${hash}` : undefined
export const shortAddress = (v?: string) => v ? `${v.slice(0, 6)}…${v.slice(-4)}` : 'N/A'
export const contractAddress = CONTRACT_ADDRESS
export const networkName = 'studionet'
export const studioImportUrl = `https://studio.genlayer.com/?import-contract=${CONTRACT_ADDRESS}`
