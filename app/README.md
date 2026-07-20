# Curio frontend

Vite + React + TypeScript interface for `CurioLearningBounties`.

```bash
npm ci
npm run dev
```

Production defaults are already configured for Studio contract:

```text
0x679737cCE4804439f2CF6d6082224A58658D0011
```

The frontend:

- reads contract health, stats, and bounties from GenLayer;
- discovers multi-wallet providers with EIP-6963 and falls back to `window.ethereum`;
- connects a real injected EIP-1193 wallet without `wallet_getSnaps`;
- keeps account approval separate from network addition/switching, so a network error does not hide an approved account;
- reuses the same selected provider for account access, network setup, and transaction signing;
- sends the exact GEN reward through `writeContract({ value })`;
- waits for `FINALIZED` and requires a successful GenLayer execution result;
- displays the submitted GEN amount and emitted settlement-message evidence;
- never inserts simulated contract rows when the integration is unavailable.

GitHub Pages receives optional repository-variable overrides and sets `VITE_BASE_PATH` automatically.

See `../docs/WALLET_TROUBLESHOOTING.md` for wallet and network recovery steps.
