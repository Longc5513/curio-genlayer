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

- No simulated or `localStorage` wallet: writes use an injected EIP-1193 wallet through `genlayer-js`.
- No leader-only validation: validators independently run the evaluation again.
- No unrestricted resolution method: only the requester or current contributor can request adjudication.
- No raw, unlimited evidence injection: only public HTTPS URLs are accepted; rendered evidence is bounded, normalized, delimited, and marked untrusted.
- No silent 50/50 fallback: malformed AI output fails; inaccessible evidence produces an explicit `more_info` result.
- No fake escrow success: `create_bounty` is payable, requires positive `gl.message.value`, the frontend passes the GEN value in `writeContract`, and the UI exposes finalized execution plus emitted settlement-message evidence.
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

The package defaults to the user-provided Studio deployment `0x679737cCE4804439f2CF6d6082224A58658D0011`. Override it through environment variables after redeploying the included source.

## Studio deployment included

The frontend is preconfigured for the user-provided Studio deployment:

```text
Network: studionet
Address: 0x679737cCE4804439f2CF6d6082224A58658D0011
Import:  https://studio.genlayer.com/?import-contract=0x679737cCE4804439f2CF6d6082224A58658D0011
```

The deployment address is public configuration, not a secret. `deployment.json` records its status. The repository contract is restored from the same deployment bundle that preceded this supplied address. Before final submission, still open the import link and independently verify the source and transaction history.

To redeploy the same packaged contract source yourself:

```bash
npm install -g genlayer
genlayer network studionet
npm run deploy
```

For Bradbury, switch the CLI and frontend network together, record the real address, and never commit a private key or seed phrase.

## Wallet behavior

The frontend does not call `wallet_getSnaps` and does not depend on a Snap handler. It requests an account with `eth_requestAccounts`, switches/adds the configured GenLayer chain through standard EIP-1193 methods, delegates signing to the injected wallet through GenLayerJS, waits for `FINALIZED`, and checks the GenLayer execution result before refreshing state.

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
| Studio contract address | Preconfigured: `0x679737cCE4804439f2CF6d6082224A58658D0011` |
| Live frontend with real contract | GitHub Pages workflow has working Studio defaults; repository variables may override them |
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
