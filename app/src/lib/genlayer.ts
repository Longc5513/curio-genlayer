import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import type { TransactionHash } from 'genlayer-js/types'
import type { CalldataEncodable } from 'genlayer-js/types'
import type { LearningBounty, ContractStats, ContractHealth, TxState } from './types'
export type { LearningBounty, ContractStats, ContractHealth, TxState }

type Address = `0x${string}`

// ── Config ──────────────────────────────────────────────────────────

const CONTRACT_ADDRESS = (import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || '0x25Ab03cdC59C701A6D53973945c834f0B0E51C1B') as Address
const EXPLORER_BASE = import.meta.env.VITE_GENLAYER_EXPLORER_URL || 'https://explorer-studio.genlayer.com'

// ── EIP-1193 Wallet ─────────────────────────────────────────────────

interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
  isMetaMask?: boolean
  providers?: Eip1193Provider[]
}

let activeProvider: Eip1193Provider | null = null
const isAddr = (v: string): v is Address => /^0x[a-fA-F0-9]{40}$/.test(v)

function getProviders(): Eip1193Provider[] {
  const eth = (window as unknown as Record<string, unknown>).ethereum as Eip1193Provider | undefined
  if (!eth) return []
  return Array.isArray(eth.providers) ? [...new Set(eth.providers)] as Eip1193Provider[] : [eth]
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

// ── Wallet Functions ────────────────────────────────────────────────

export async function connectWallet(): Promise<Address> {
  const p = await getProvider()
  if (!p) throw new Error('Install MetaMask or another EIP-1193 wallet')
  const accs = await p.request({ method: 'eth_requestAccounts' })
  const a = Array.isArray(accs) ? String(accs[0] || '') : ''
  if (!isAddr(a)) throw new Error('No account returned')
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
  if (!p) return () => { /* noop */ }
  const fn = (...args: unknown[]) => {
    const accs = Array.isArray(args[0]) ? args[0] : []
    onAcc(isAddr(String(accs[0] || '')) ? String(accs[0]) as Address : null)
  }
  p.on?.('accountsChanged', fn)
  p.on?.('chainChanged', () => onChain())
  return () => { p.removeListener?.('accountsChanged', fn); p.removeListener?.('chainChanged', onChain) }
}

// ── Read Functions (match contract @gl.public.view) ─────────────────

export async function getContractHealth(): Promise<ContractHealth> {
  try {
    const [v, s] = await Promise.all([
      readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_contract_version', args: [] }),
      readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_stats', args: [] }),
    ])
    return { configured: true, reachable: true, version: String(v), stats: s as unknown as ContractStats, error: '' }
  } catch (e) { return { configured: true, reachable: false, version: '', stats: null, error: errMsg(e) } }
}

export async function listBounties(): Promise<LearningBounty[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_bounties', args: [] })
  return Array.isArray(r) ? r as unknown as LearningBounty[] : []
}

export async function getBounty(bountyId: string): Promise<LearningBounty> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_bounty', args: [bountyId] })
  return r as unknown as LearningBounty
}

export async function listRequesterBounties(requester: string): Promise<LearningBounty[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_requester_bounties', args: [requester] })
  return Array.isArray(r) ? r as unknown as LearningBounty[] : []
}

export async function listContributorBounties(contributor: string): Promise<LearningBounty[]> {
  const r = await readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'list_contributor_bounties', args: [contributor] })
  return Array.isArray(r) ? r as unknown as LearningBounty[] : []
}

// ── Write Functions (match contract @gl.public.write) ───────────────

async function write(account: Address, fn: string, args: unknown[], value: bigint = 0n, onHash?: (h: string) => void): Promise<string> {
  const p = await getProvider()
  if (!p) throw new Error('Wallet not connected')
  await ensureWalletNetwork()
  const client = createClient({ chain: studionet, account, provider: p })
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args: args as CalldataEncodable[], value }) as unknown as TransactionHash
  onHash?.(hash)
  await readClient.waitForTransactionReceipt({ hash })
  return hash
}

// create_bounty is @gl.public.write.payable — must send GEN value
export const createBounty = (acc: Address, id: string, title: string, brief: string, rubric: string, refUrl: string, valueWei: bigint, onHash?: (h: string) => void) =>
  write(acc, 'create_bounty', [id, title, brief, rubric, refUrl], valueWei, onHash)

// submit_solution is @gl.public.write
export const submitSolution = (acc: Address, bountyId: string, submissionUrl: string, note: string, onHash?: (h: string) => void) =>
  write(acc, 'submit_solution', [bountyId, submissionUrl, note], 0n, onHash)

// adjudicate is @gl.public.write
export const adjudicate = (acc: Address, bountyId: string, onHash?: (h: string) => void) =>
  write(acc, 'adjudicate', [bountyId], 0n, onHash)

// cancel_open_bounty is @gl.public.write
export const cancelBounty = (acc: Address, bountyId: string, onHash?: (h: string) => void) =>
  write(acc, 'cancel_open_bounty', [bountyId], 0n, onHash)

// ── Utils ───────────────────────────────────────────────────────────

export const transactionUrl = (hash?: string) => hash ? `${EXPLORER_BASE}/tx/${hash}` : undefined
export const contractAddress = CONTRACT_ADDRESS
export const networkName = studionet.name
export const studioImportUrl = `https://studio.genlayer.com/?import-contract=${CONTRACT_ADDRESS}`
