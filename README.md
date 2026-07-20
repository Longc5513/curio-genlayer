# Curio — Consensus-backed learning bounties on GenLayer

Curio lets a requester escrow GEN for an open-ended learning deliverable. A contributor submits a public result. The Python Intelligent Contract asks GenLayer validators to independently evaluate that result against the requester-authored rubric, then pays the contributor, refunds the requester, or preserves escrow while requesting more information.

This is not a UI-only network rename. The financially meaningful decision is made by the GenLayer contract and validator consensus.

## Why GenLayer

A normal deterministic contract can hold funds but cannot fairly decide whether a tutorial is accurate, a curriculum satisfies a brief, or a research lesson provides sufficient evidence. Curio uses GenLayer for qualitative adjudication. Validators recompute the task and compare substantive decision fields rather than checking only JSON shape.

## Repository structure

```text
contracts/   Python Intelligent Contract
deploy/      deployment is performed through the official GenLayer CLI
app/         Vite + React + TypeScript frontend
  src/lib/   GenLayerJS client, wallet, GEN formatting
  src/       create/submit/adjudicate UI
scripts/     project checks, deployment evidence, GitHub push helpers
tests/       source, direct-mode, and Studio integration tests
docs/        demo and reviewer evidence guidance
.github/     CI, GitHub Pages, Dependabot, issue/PR templates
```

## Contract flow

1. Requester calls payable `create_bounty(...)` with a positive GEN value. The exact value is recorded as escrow.
2. Contributor calls `submit_solution(...)` with a public HTTPS deliverable and evidence note.
3. The requester or current contributor calls `adjudicate(...)`.
4. Leader and validators independently render bounded evidence and evaluate it against the brief and rubric.
5. Validators compare the real decision, score, criteria count, and payout boundary.
6. Accepted consensus pays the contributor, refunds the requester, or keeps funds escrowed for a revised submission.

## Rejection issues addressed

- No simulated or `localStorage` wallet: writes use a MetaMask-compatible provider through `genlayer-js`.
- No leader-only validation: validators independently run the evaluation again.
- No unrestricted resolution method: only the requester or current contributor can request adjudication.
- No raw, unlimited evidence injection: only public HTTPS URLs are accepted; rendered evidence is bounded, normalized, delimited, and marked untrusted.
- No silent 50/50 fallback: malformed AI output fails; inaccessible evidence produces an explicit `more_info` result.
- No fake escrow success: `create_bounty` is payable, requires positive `gl.message.value`, and the frontend passes the GEN value in `writeContract`.
- No deterministic-only submission: payout/refund depends on `run_nondet_unsafe` validator consensus.
- No static contract card: frontend reads and writes the configured deployed contract.

See [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), and [GENLAYER_REVIEW.md](GENLAYER_REVIEW.md).

## Requirements

- Python 3.12+
- Node.js 22+
- GenLayer CLI and GenLayer Studio for deployment/integration tests
- MetaMask or another EVM-compatible browser wallet

## Local setup

```bash
cp app/.env.example app/.env
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm --prefix app install
```

Run checks:

```bash
python -m pytest tests/test_contract_source.py tests/test_frontend_source.py -q
python scripts/check_project.py
genvm-lint check contracts/curio_learning_bounties.py
python -m pytest tests/direct -v
npm --prefix app run lint
npm --prefix app run build
```

Start the frontend:

```bash
npm --prefix app run dev
```

Without a real `VITE_GENLAYER_CONTRACT_ADDRESS`, the UI displays an explicit integration-unavailable state and no fake bounties.

## Deploy the Intelligent Contract

The contract has no constructor arguments, so deployment uses the official direct CLI flow:

```bash
npm install -g genlayer
genlayer network testnet-bradbury
npm run deploy
```

Verify the address and deployment transaction in Explorer, then record them:

```bash
python scripts/record_deployment.py \
  --network testnetBradbury \
  --address 0xREAL_DEPLOYED_ADDRESS \
  --transaction 0xREAL_DEPLOYMENT_TRANSACTION \
  --explorer-url https://VERIFIED_EXPLORER_BASE
```

Never commit a private key or seed phrase.

## Push and publish on GitHub

Follow [GITHUB_SETUP.md](GITHUB_SETUP.md). The repository includes:

- one-command PowerShell/Bash push helpers;
- CI for source checks, GenVM lint, direct contract tests, and frontend build;
- a GitHub Pages workflow that receives the contract address through repository variables;
- Dependabot, issue template, and pull-request security checklist.

## Deployment status

| Item | Status |
|---|---|
| Intelligent Contract source | Complete |
| Custom validator/equivalence logic | Complete |
| Adjudication access control | Complete |
| Wallet + read/write frontend | Complete |
| GitHub CI and Pages workflows | Complete |
| Testnet contract address | Requires the owner's funded GenLayer account |
| Live frontend with real contract | Runs after repository variables are configured |
| Demo video | Record after deployment |
| DoraHacks submission | Submit after links are verified |

Use [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md), [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md), and [DORAHACKS_SUBMISSION.md](DORAHACKS_SUBMISSION.md). Do not publish placeholder evidence.

## Environment variables

Frontend `app/.env` or GitHub repository variables:

- `VITE_GENLAYER_CONTRACT_ADDRESS` / `GENLAYER_CONTRACT_ADDRESS`
- `VITE_GENLAYER_NETWORK` / `GENLAYER_NETWORK`
- `VITE_GENLAYER_EXPLORER_URL` / `GENLAYER_EXPLORER_URL`
- `VITE_BASE_PATH` is set automatically by the GitHub Pages workflow.

## License

MIT. See [LICENSE](LICENSE).
