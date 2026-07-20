/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GENLAYER_CONTRACT_ADDRESS?: string
  readonly VITE_GENLAYER_NETWORK?: 'localnet' | 'studionet' | 'testnetAsimov' | 'testnetBradbury'
  readonly VITE_GENLAYER_EXPLORER_URL?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: import('./lib/genlayer').Eip1193Provider
}
