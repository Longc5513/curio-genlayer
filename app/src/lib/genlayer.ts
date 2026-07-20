import { createClient } from 'genlayer-js'
import { localnet, studionet, testnetAsimov, testnetBradbury } from 'genlayer-js/chains'
import { ExecutionResult, TransactionStatus } from 'genlayer-js/types'
import type { CalldataEncodable, TransactionHash } from 'genlayer-js/types'
import type { LearningBounty } from './types'

type Address = `0x${string}`
export type NetworkName = 'localnet' | 'studionet' | 'testnetAsimov' | 'testnetBradbury'

export interface Eip1193Provider {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
  isMetaMask?: boolean
  providers?: Eip1193Provider[]
}

export interface ContractStats {
  bounty_count: number
  total_escrowed_wei: string | number | bigint
  total_paid_wei: string | number | bigint
  total_refunded_wei: string | number | bigint
  contract_balance_wei?: string | number | bigint
  escrow_is_funded?: boolean
}

export interface ContractHealth {
  configured: boolean
  reachable: boolean
  version: string
  stats: ContractStats | null
  error: string
}

export interface TransactionEvidence {
  hash: TransactionHash
  executionResult: string
  emittedMessageCount: number
  emittedValueWei: bigint
  submittedValueWei: bigint
}

const DEFAULT_CONTRACT_ADDRESS = '0x679737cCE4804439f2CF6d6082224A58658D0011' as const
const chainMap = { localnet, studionet, testnetAsimov, testnetBradbury } as const
const configuredNetwork = import.meta.env.VITE_GENLAYER_NETWORK || 'studionet'

export const networkName: NetworkName = Object.prototype.hasOwnProperty.call(chainMap, configuredNetwork)
  ? (configuredNetwork as NetworkName)
  : 'studionet'
export const network = chainMap[networkName]
export const contractAddress = (
  import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS
) as Address
export const explorerBase = import.meta.env.VITE_GENLAYER_EXPLORER_URL || network.blockExplorers?.default.url || ''
export const studioImportUrl = `https://studio.genlayer.com/?import-contract=${contractAddress}`

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function requireContract(): Address {
  if (!isAddress(contractAddress)) {
    throw new Error('The GenLayer Intelligent Contract address is invalid.')
  }
  return contractAddress
}

function providerErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const direct = (error as { code?: unknown }).code
  if (typeof direct === 'number') return direct
  const nested = (error as { data?: { originalError?: { code?: unknown } } }).data?.originalError?.code
  return typeof nested === 'number' ? nested : undefined
}

export function getInjectedProvider(): Eip1193Provider | null {
  const injected = window.ethereum
  if (!injected) return null
  const providers = injected.providers
  if (Array.isArray(providers) && providers.length > 0) {
    return providers.find((provider) => provider.isMetaMask) || providers[0]
  }
  return injected
}

function chainIdHex(): `0x${string}` {
  return `0x${network.id.toString(16)}`
}

export async function ensureWalletNetwork(provider = getInjectedProvider()): Promise<void> {
  if (!provider) throw new Error('No EVM wallet was detected. Install MetaMask or a compatible browser wallet.')
  const expected = chainIdHex()
  const current = String(await provider.request({ method: 'eth_chainId' })).toLowerCase()
  if (current === expected.toLowerCase()) return

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: expected }],
    })
    return
  } catch (error) {
    const code = providerErrorCode(error)
    if (code !== 4902 && code !== -32603 && code !== -32601) throw error
  }

  const explorer = network.blockExplorers?.default.url
  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: expected,
      chainName: network.name,
      rpcUrls: [...network.rpcUrls.default.http],
      nativeCurrency: network.nativeCurrency,
      ...(explorer ? { blockExplorerUrls: [explorer] } : {}),
    }],
  })
  await provider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: expected }],
  })
}

export async function connectWallet(): Promise<Address> {
  const provider = getInjectedProvider()
  if (!provider) throw new Error('No EVM wallet was detected. Install MetaMask or a compatible browser wallet.')
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  const account = Array.isArray(accounts) ? String(accounts[0] || '') : ''
  if (!isAddress(account)) throw new Error('The wallet returned no valid account.')
  await ensureWalletNetwork(provider)
  return account
}

export async function getConnectedWallet(): Promise<Address | null> {
  const provider = getInjectedProvider()
  if (!provider) return null
  const accounts = await provider.request({ method: 'eth_accounts' })
  const account = Array.isArray(accounts) ? String(accounts[0] || '') : ''
  return isAddress(account) ? account : null
}

export function subscribeWallet(
  onAccount: (account: Address | null) => void,
  onChainChanged: () => void,
): () => void {
  const provider = getInjectedProvider()
  if (!provider?.on) return () => undefined

  const accountsChanged = (...args: unknown[]) => {
    const accounts = Array.isArray(args[0]) ? args[0] : []
    const account = String(accounts[0] || '')
    onAccount(isAddress(account) ? account : null)
  }
  const chainChanged = () => onChainChanged()
  provider.on('accountsChanged', accountsChanged)
  provider.on('chainChanged', chainChanged)

  return () => {
    provider.removeListener?.('accountsChanged', accountsChanged)
    provider.removeListener?.('chainChanged', chainChanged)
  }
}

export const readClient = createClient({ chain: network })

function createWriteClient(account: Address) {
  const provider = getInjectedProvider()
  if (!provider) throw new Error('Wallet provider is unavailable.')
  return createClient({ chain: network, account, provider })
}

export async function listBounties(): Promise<LearningBounty[]> {
  const result = await readClient.readContract({
    address: requireContract(),
    functionName: 'list_bounties',
    args: [],
  })
  return Array.isArray(result) ? (result as unknown as LearningBounty[]) : []
}

export async function getContractHealth(): Promise<ContractHealth> {
  if (!isAddress(contractAddress)) {
    return { configured: false, reachable: false, version: '', stats: null, error: 'Invalid contract address.' }
  }
  try {
    const [version, stats] = await Promise.all([
      readClient.readContract({ address: contractAddress, functionName: 'get_contract_version', args: [] }),
      readClient.readContract({ address: contractAddress, functionName: 'get_stats', args: [] }),
    ])
    return {
      configured: true,
      reachable: true,
      version: String(version),
      stats: stats && typeof stats === 'object' ? (stats as unknown as ContractStats) : null,
      error: '',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    let helpMessage = errorMsg
    
    // Provide helpful guidance for common errors
    if (errorMsg.includes('revert') || errorMsg.includes('call') || errorMsg.includes('reverted')) {
      helpMessage = `Contract not found at ${contractAddress} on ${networkName}. Deploy the contract first: https://studio.genlayer.com`
    } else if (errorMsg.includes('network') || errorMsg.includes('NETWORK') || errorMsg.includes('RPC')) {
      helpMessage = `Network error: Cannot reach ${networkName} RPC. Check your connection or the contract address.`
    }
    
    console.error(`Contract health check failed on ${networkName} at ${contractAddress}:`, error)
    
    return {
      configured: true,
      reachable: false,
      version: '',
      stats: null,
      error: helpMessage,
    }
  }
}

function readMessageValue(message: unknown): bigint {
  if (!message || typeof message !== 'object') return 0n
  const raw = (message as { value?: unknown }).value
  if (typeof raw === 'bigint') return raw
  if (typeof raw === 'number' && Number.isFinite(raw)) return BigInt(Math.trunc(raw))
  if (typeof raw === 'string') {
    try { return BigInt(raw) } catch { return 0n }
  }
  return 0n
}

export async function sendContractCall(
  account: Address,
  functionName: string,
  args: unknown[],
  value: bigint = 0n,
  onHash?: (hash: TransactionHash) => void,
): Promise<TransactionEvidence> {
  const provider = getInjectedProvider()
  await ensureWalletNetwork(provider)
  const client = createWriteClient(account)
  const hash = (await client.writeContract({
    address: requireContract(),
    functionName,
    args: args as CalldataEncodable[],
    value,
  })) as unknown as TransactionHash
  onHash?.(hash)

  const receipt = await readClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
  })
  const executionResult = String(receipt.txExecutionResultName || ExecutionResult.NOT_VOTED)
  if (executionResult !== ExecutionResult.FINISHED_WITH_RETURN) {
    let traceMessage = ''
    try {
      const trace = await readClient.debugTraceTransaction({ hash })
      traceMessage = String(trace.stderr || trace.return_data || '')
    } catch {
      // The receipt still gives the authoritative failed execution state.
    }
    throw new Error(`Contract execution failed (${executionResult}). ${traceMessage}`.trim())
  }

  let messages: unknown[] = []
  try {
    const transaction = await readClient.getTransaction({ hash })
    messages = Array.isArray(transaction.messages) ? transaction.messages : []
  } catch {
    // Transaction evidence is supplementary; finalized execution is already confirmed.
  }

  return {
    hash,
    executionResult,
    emittedMessageCount: messages.length,
    emittedValueWei: messages.reduce<bigint>((sum, message) => sum + readMessageValue(message), 0n),
    submittedValueWei: value,
  }
}

export function transactionUrl(hash?: string): string | undefined {
  if (!hash || !explorerBase) return undefined
  return `${explorerBase.replace(/\/$/, '')}/transactions/${hash}`
}
