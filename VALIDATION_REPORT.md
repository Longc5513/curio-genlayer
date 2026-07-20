# Validation report

Validated on **2026-07-20** from the rebuilt source tree.

## Passed locally

- `19` source/invariant tests passed.
- TypeScript strict lint passed.
- Vite production build passed (`466` modules transformed).
- Python contract syntax parsing passed.
- Repository checker passed: required files, production configuration, lockfile, obvious-secret scan, and legacy-chain dependency scan.
- Frontend is preconfigured for Studio contract `0x679737cCE4804439f2CF6d6082224A58658D0011`.
- Frontend has no `wallet_getSnaps` call, no localStorage wallet, and no simulated bounty rows.
- Wallet discovery supports EIP-6963 and legacy injected providers; one cached provider is reused for connection, network setup, event subscriptions, and signing.
- Account approval is committed to UI state before the separate Studionet switch, preventing the previous false “Not connected” state.
- Nested wallet/RPC errors are converted to actionable text instead of `[object Object]`.
- Transactions wait for `FINALIZED`, require `FINISHED_WITH_RETURN`, and expose submitted/emitted GEN evidence.

## External verification still required

- Confirm in Studio that the deployed source at the supplied address has SHA-256 `2402c3f374fa1bb2899f53657f821f3d296c79a45359e334c9fbef8cac53b2a8` and matches `contracts/curio_learning_bounties.py`.
- Execute a positive-value create transaction with a funded Studio wallet.
- Execute submit and adjudicate from permitted accounts.
- Verify payout/refund external messages and final balances.
- Publish GitHub Pages, run the public CI workflow, record the demo, and complete the submission links.

Those network/account-dependent facts are intentionally not fabricated by the package.
