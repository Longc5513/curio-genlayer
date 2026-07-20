# Wallet connection and transaction troubleshooting

Curio uses a real injected EIP-1193 wallet. It does not keep a wallet identity in
`localStorage` and it does not simulate a connected account.

## Connection flow

1. The app discovers injected wallets through EIP-6963 and falls back to
   `window.ethereum` for older extensions.
2. It asks the selected wallet for an account with `eth_requestAccounts`.
3. The account is shown immediately.
4. Network addition/switching is performed as a separate step.
5. The same provider and account are reused by `genlayer-js` when signing the
   Intelligent Contract call.

Separating steps 2 and 4 prevents a rejected or failed network-switch prompt from
making an already-approved account appear disconnected.

## Required Studionet settings

- RPC: `https://studio.genlayer.com/api`
- Chain ID: `61999` (`0xf22f`)
- Currency: `GEN`
- Explorer: `https://explorer-studio.genlayer.com`

The app requests these settings automatically through `wallet_addEthereumChain`
and `wallet_switchEthereumChain`.

## Common messages

- **Request rejected in the wallet**: approve the account or network prompt.
- **A wallet request is already pending**: open the wallet extension and finish
  or reject the older prompt before retrying.
- **No EVM wallet was detected**: enable MetaMask/Rabby/Coinbase Wallet for the
  current browser profile and reload the page.
- **Wallet stayed on another chain**: manually select GenLayer Studionet, then
  submit again.
- **The selected wallet account changed**: retry so the transaction is signed by
  the account currently shown in the wallet.

RPC error objects are recursively unpacked so the interface does not show the
unhelpful string `[object Object]`.
