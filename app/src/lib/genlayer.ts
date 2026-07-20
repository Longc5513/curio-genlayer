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
  isRabby?: boolean
  isCoinbaseWallet?: boolean
  isBraveWallet?: boolean
  providers?: Eip1193Provider[]
}

interface Eip6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo
  provider: Eip1193Provider
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

const DEFAULT_CONTRACT_ADDRESS = '0xD0fAC36E518A85315E7bc1dEd7Cbc2233e6a7E8C' as const
const chainMap = { localnet, studionet, testnetAsimov, testnetBradbury } as const
const configuredNetwork = import.meta.env.VITE_GENLAYER_NETWORK || 'studionet'

export const networkName: NetworkName = Object.prototype.hasOwnProperty.call(chainMap, configuredNetwork)
  ? (configuredNetwork as NetworkName)
  : 'studionet'
export const network = chainMap[networkName]
export const contractAddress = (
  import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS
) as Address
const officialExplorerMap: Record<NetworkName, string> = {
  localnet: 'http://localhost:8080',
  studionet: 'https://explorer-studio.genlayer.com',
  testnetAsimov: 'https://explorer-asimov.genlayer.com',
  testnetBradbury: 'https://explorer-bradbury.genlayer.com',
}
export const explorerBase = import.meta.env.VITE_GENLAYER_EXPLORER_URL || officialExplorerMap[networkName]
export const studioImportUrl = `https://studio.genlayer.com/?import-contract=${contractAddress}`

let activeProvider: Eip1193Provider | null = null
let providerDiscovery: Promise<Eip6963ProviderDetail[]> | null = null

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function requireContract(): Address {
  if (!isAddress(contractAddress)) {
    throw new Error('The GenLayer Intelligent Contract address is invalid.')
  }
  return contractAddress
}

function legacyProviders(): Eip1193Provider[] {
  const injected = window.ethereum
  if (!injected) return []
  const candidates = Array.isArray(injected.providers) && injected.providers.length > 0
    ? injected.providers
    : [injected]
  return [...new Set(candidates)]
}

function providerPriority(detail: Eip6963ProviderDetail): number {
  const rdns = detail.info.rdns.toLowerCase()
  if (rdns === 'io.metamask') return 100
  if (rdns.includes('metamask')) return 90
  if (rdns.includes('rabby')) return 80
  if (rdns.includes('coinbase')) return 70
  return 10
}

async function discoverEip6963Providers(): Promise<Eip6963ProviderDetail[]> {
  if (providerDiscovery) return providerDiscovery
  providerDiscovery = new Promise((resolve) => {
    const found = new Map<string, Eip6963ProviderDetail>()
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
      if (!detail?.provider || !detail.info?.uuid) return
      found.set(detail.info.uuid, detail)
    }
    window.addEventListener('eip6963:announceProvider', onAnnounce as EventListener)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener)
      resolve([...found.values()].sort((a, b) => providerPriority(b) - providerPriority(a)))
    }, 180)
  })
  return providerDiscovery
}

async function resolveWalletProvider(): Promise<Eip1193Provider | null> {
  if (activeProvider) return activeProvider

  const announced = await discoverEip6963Providers()
  if (announced.length > 0) {
    activeProvider = announced[0].provider
    return activeProvider
  }

  const legacy = legacyProviders()
  activeProvider = legacy.find((provider) => provider.isMetaMask && !provider.isRabby) || legacy[0] || null
  return activeProvider
}

export function getInjectedProvider(): Eip1193Provider | null {
  if (activeProvider) return activeProvider
  const legacy = legacyProviders()
  return legacy.find((provider) => provider.isMetaMask && !provider.isRabby) || legacy[0] || null
}

function errorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const object = error as Record<string, unknown>
  if (typeof object.code === 'number') return object.code
  const data = object.data
  if (data && typeof data === 'object') {
    const dataObject = data as Record<string, unknown>
    if (typeof dataObject.code === 'number') return dataObject.code
    const original = dataObject.originalError
    if (original && typeof original === 'object' && typeof (original as Record<string, unknown>).code === 'number') {
      return (original as Record<string, unknown>).code as number
    }
  }
  const cause = object.cause
  return cause && cause !== error ? errorCode(cause) : undefined
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (!error || typeof error !== 'object') return String(error || 'Unknown wallet error')
  const object = error as Record<string, unknown>
  for (const key of ['shortMessage', 'message', 'details', 'reason'] as const) {
    if (typeof object[key] === 'string' && object[key]) return object[key] as string
  }
  const data = object.data
  if (data && data !== error) {
    const nested = errorMessage(data)
    if (nested && nested !== '[object Object]') return nested
  }
  const cause = object.cause
  if (cause && cause !== error) {
    const nested = errorMessage(cause)
    if (nested && nested !== '[object Object]') return nested
  }
  return 'The wallet returned an unreadable RPC error. Open the wallet extension and retry the request.'
}

function walletError(prefix: string, error: unknown): Error {
  const code = errorCode(error)
  const message = errorMessage(error).replace(/^Error:\s*/, '')
  if (code === 4001) return new Error(`${prefix}: request rejected in the wallet.`)
  if (code === -32002) return new Error(`${prefix}: a wallet request is already pending. Open the wallet extension and complete it.`)
  return new Error(`${prefix}${code !== undefined ? ` (code ${code})` : ''}: ${message}`)
}

function chainIdHex(): `0x${string}` {
  return `0x${network.id.toString(16)}`
}

export async function ensureWalletNetwork(provider?: Eip1193Provider | null): Promise<void> {
  const wallet = provider || await resolveWalletProvider()
  if (!wallet) throw new Error('No EVM wallet was detected. Install MetaMask or another EIP-1193 wallet.')
  activeProvider = wallet

  const expected = chainIdHex().toLowerCase()
  let current: string
  try {
    current = String(await wallet.request({ method: 'eth_chainId' })).toLowerCase()
  } catch (error) {
    throw walletError('Could not read the active wallet network', error)
  }
  if (current === expected) return

  try {
    await wallet.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: expected }],
    })
  } catch (switchError) {
    const code = errorCode(switchError)
    const text = errorMessage(switchError).toLowerCase()
    const canAdd = code === 4902 || code === -32603 || code === -32601 || code === -32004
      || text.includes('unknown chain') || text.includes('unrecognized chain') || text.includes('not added')
    if (!canAdd) throw walletError(`Could not switch to ${network.name}`, switchError)

    const explorer = network.blockExplorers?.default.url
    try {
      await wallet.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: expected,
          chainName: network.name,
          rpcUrls: [...network.rpcUrls.default.http],
          nativeCurrency: {
            name: network.nativeCurrency.name,
            symbol: network.nativeCurrency.symbol,
            decimals: network.nativeCurrency.decimals,
          },
          ...(explorer ? { blockExplorerUrls: [explorer] } : {}),
        }],
      })
    } catch (addError) {
      const addText = errorMessage(addError).toLowerCase()
      if (!addText.includes('already') && !addText.includes('exists')) {
        throw walletError(`Could not add ${network.name} to the wallet`, addError)
      }
    }

    try {
      await wallet.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: expected }],
      })
    } catch (retryError) {
      throw walletError(`Could not activate ${network.name}`, retryError)
    }
  }

  const selected = String(await wallet.request({ method: 'eth_chainId' })).toLowerCase()
  if (selected !== expected) {
    throw new Error(`Wallet stayed on chain ${selected}; select ${network.name} (${expected}) in the wallet and retry.`)
  }
}

export async function connectWallet(): Promise<Address> {
  const provider = await resolveWalletProvider()
  if (!provider) throw new Error('No EVM wallet was detected. Install MetaMask or another EIP-1193 wallet.')
  activeProvider = provider

  let accounts: unknown
  try {
    accounts = await provider.request({ method: 'eth_requestAccounts' })
  } catch (error) {
    throw walletError('Wallet connection failed', error)
  }

  const account = Array.isArray(accounts) ? String(accounts[0] || '') : ''
  if (!isAddress(account)) throw new Error('The wallet returned no valid EVM account.')
  return account
}

export async function getConnectedWallet(): Promise<Address | null> {
  const provider = await resolveWalletProvider()
  if (!provider) return null
  try {
    const accounts = await provider.request({ method: 'eth_accounts' })
    const account = Array.isArray(accounts) ? String(accounts[0] || '') : ''
    return isAddress(account) ? account : null
  } catch {
    return null
  }
}

export function subscribeWallet(
  onAccount: (account: Address | null) => void,
  onChainChanged: () => void,
): () => void {
  const attached = new Set<Eip1193Provider>()
  let disposed = false

  const accountsChanged = (...args: unknown[]) => {
    const accounts = Array.isArray(args[0]) ? args[0] : []
    const account = String(accounts[0] || '')
    onAccount(isAddress(account) ? account : null)
  }
  const chainChanged = () => onChainChanged()
  const attach = (provider: Eip1193Provider | null) => {
    if (!provider || disposed || attached.has(provider)) return
    attached.add(provider)
    provider.on?.('accountsChanged', accountsChanged)
    provider.on?.('chainChanged', chainChanged)
  }

  for (const provider of legacyProviders()) attach(provider)
  void resolveWalletProvider().then(attach).catch(() => undefined)

  return () => {
    disposed = true
    for (const provider of attached) {
      provider.removeListener?.('accountsChanged', accountsChanged)
      provider.removeListener?.('chainChanged', chainChanged)
    }
    attached.clear()
  }
}

export const readClient = createClient({ chain: network })

function createWriteClient(account: Address, provider: Eip1193Provider) {
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
    const raw = errorMessage(error)
    const hint = raw.toLowerCase().includes('execution failed')
      ? 'The contract may not be deployed on this network. Run: gl contract deploy --file contracts/curio_learning_bounties.py --network studionet'
      : ''
    return {
      configured: true,
      reachable: false,
      version: '',
      stats: null,
      error: hint ? `${raw}\n${hint}` : raw,
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
  const provider = await resolveWalletProvider()
  if (!provider) throw new Error('Wallet provider is unavailable. Connect MetaMask and retry.')
  await ensureWalletNetwork(provider)

  const accounts = await provider.request({ method: 'eth_accounts' })
  const selectedAccount = Array.isArray(accounts) ? String(accounts[0] || '') : ''
  if (!isAddress(selectedAccount)) throw new Error('The wallet is no longer connected. Reconnect it and retry.')
  if (selectedAccount.toLowerCase() !== account.toLowerCase()) {
    throw new Error(`The selected wallet account changed to ${selectedAccount}. Retry with the active account.`)
  }

  const client = createWriteClient(account, provider)
  let hash: TransactionHash
  try {
    hash = (await client.writeContract({
      address: requireContract(),
      functionName,
      args: args as CalldataEncodable[],
      value,
    })) as unknown as TransactionHash
  } catch (error) {
    throw walletError('Transaction signing failed', error)
  }
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
      traceMessage = errorMessage(trace.stderr || trace.return_data || '')
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
  return `${explorerBase.replace(/\/$/, '')}/tx/${hash}`
}
