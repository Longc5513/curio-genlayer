import { readFileSync } from 'node:fs'
import path from 'node:path'
import type {
  DecodedDeployData,
  GenLayerChain,
  GenLayerClient,
  TransactionHash,
} from 'genlayer-js/types'
import { TransactionStatus } from 'genlayer-js/types'
import { localnet } from 'genlayer-js/chains'

/** Executed by `genlayer deploy`; the CLI injects the configured client/account. */
export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), 'contracts/curio_learning_bounties.py')
  const contractCode = new Uint8Array(readFileSync(filePath))

  await client.initializeConsensusSmartContract()
  const deployTransaction = await client.deployContract({ code: contractCode, args: [] })
  const receipt = await client.waitForTransactionReceipt({
    hash: deployTransaction as TransactionHash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
  })

  if (
    receipt.status !== 5 &&
    receipt.status !== 6 &&
    receipt.statusName !== 'ACCEPTED' &&
    receipt.statusName !== 'FINALIZED'
  ) {
    throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`)
  }

  const address =
    (client.chain as GenLayerChain).id === localnet.id
      ? receipt.data.contract_address
      : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress

  if (!address) throw new Error('Deployment succeeded but no contract address was decoded')
  console.log(`CurioLearningBounties deployed at: ${address}`)
}
