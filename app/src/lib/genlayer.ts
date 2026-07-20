import { createClient } from 'genlayer-js'
import { localnet, studionet, testnetAsimov, testnetBradbury } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import type { LearningBounty } from './types'

type Address = `0x${string}`
type TransactionHash = `0x${string}`
type NetworkName = 'localnet' | 'studionet' | 'testnetAsimov' | 'testnetBradbury'

const chainMap = { localnet, studionet, testnetAsimov, testnetBradbury } as const
const configuredNetwork = import.meta.env.VITE_GENLAYER_NETWORK || 'testnetBradbury'
export const networkName: NetworkName = Object.prototype.hasOwnProperty.call(chainMap, configuredNetwork)
  ? (configuredNetwork as NetworkName)
  : 'testnetBradbury'
export const contractAddress = (import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || '') as Address | ''
export const explorerBase = import.meta.env.VITE_GENLAYER_EXPLORER_URL || ''

function requireContract(): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
    throw new Error('Contract address is not configured. Copy app/.env.example to app/.env and add the deployed address.')
  }
  return contractAddress as Address
}

export const readClient = createClient({ chain: chainMap[networkName] })

export async function connectWallet(): Promise<Address> {
  if (!window.ethereum) throw new Error('No EVM wallet found. Install MetaMask or another compatible wallet.')
  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
  const account = accounts[0] as Address | undefined
  if (!account) throw new Error('The wallet returned no account')
  const client = createClient({ chain: chainMap[networkName], account, provider: window.ethereum })
  await client.connect(networkName)
  return account
}

function writeClient(account: Address) {
  if (!window.ethereum) throw new Error('Wallet provider is unavailable')
  return createClient({ chain: chainMap[networkName], account, provider: window.ethereum })
}

export async function listBounties(): Promise<LearningBounty[]> {
  const result = await readClient.readContract({
    address: requireContract(),
    functionName: 'list_bounties',
    args: [],
  })
  return Array.isArray(result) ? (result as LearningBounty[]) : []
}

export async function sendContractCall(
  account: Address,
  functionName: string,
  args: unknown[],
  value: bigint = 0n,
  onHash?: (hash: TransactionHash) => void,
): Promise<TransactionHash> {
  const client = writeClient(account)
  await client.connect(networkName)
  const hash = (await client.writeContract({
    address: requireContract(),
    functionName,
    args,
    value,
  })) as TransactionHash
  onHash?.(hash)
  const receipt = await readClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
  })
  const executionName = String(receipt.txExecutionResultName || '')
  if (executionName.includes('ERROR')) throw new Error('Contract execution finished with an error. Inspect the transaction trace.')
  return hash
}

export function transactionUrl(hash?: string): string | undefined {
  if (!hash || !explorerBase) return undefined
  return `${explorerBase.replace(/\/$/, '')}/transactions/${hash}`
}
