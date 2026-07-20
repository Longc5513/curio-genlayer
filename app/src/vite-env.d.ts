/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GENLAYER_CONTRACT_ADDRESS?: string
  readonly VITE_GENLAYER_NETWORK?: 'localnet' | 'studionet' | 'testnetAsimov' | 'testnetBradbury'
  readonly VITE_GENLAYER_EXPLORER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>
  }
}
