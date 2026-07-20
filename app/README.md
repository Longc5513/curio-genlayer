# Curio frontend

Vite + React + TypeScript interface for `CurioLearningBounties`.

```bash
cp .env.example .env
npm install
npm run dev
```

The frontend reads the configured Intelligent Contract with `genlayer-js`, connects an EVM-compatible browser wallet for writes, waits for transaction finality, and does not insert demo contract data when integration is unavailable.
