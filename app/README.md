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
- connects a real injected EIP-1193 wallet without `wallet_getSnaps`;
- adds/switches the wallet to the configured GenLayer chain;
- sends the exact GEN reward through `writeContract({ value })`;
- waits for `FINALIZED` and requires a successful GenLayer execution result;
- displays the submitted GEN amount and emitted settlement-message evidence;
- never inserts simulated contract rows when the integration is unavailable.

GitHub Pages receives optional repository-variable overrides and sets `VITE_BASE_PATH` automatically.
