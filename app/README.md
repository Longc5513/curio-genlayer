# Curio frontend

Vite + React + TypeScript interface for `CurioLearningBounties`.

```bash
cp .env.example .env
npm install
npm run dev
```

The frontend:

- reads the configured Intelligent Contract with a wallet-free GenLayer client;
- connects a real MetaMask-compatible provider for writes;
- switches the wallet to the configured GenLayer network;
- sends GEN through the `value` field when creating a bounty;
- waits for finality and checks execution errors;
- never inserts simulated contract data when integration is unavailable.

For GitHub Pages, the repository workflow supplies the contract configuration through repository variables and sets the Vite base path automatically.
