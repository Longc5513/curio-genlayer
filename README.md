# Curio — Consensus-backed learning bounties on GenLayer

Curio lets a requester escrow GEN for an open-ended learning deliverable. A contributor submits a public result. The Python Intelligent Contract asks GenLayer validators to independently evaluate that result against the requester-authored rubric, then pays the contributor, refunds the requester, or preserves escrow while requesting more information.

This is not a UI-only network rename. The financially meaningful decision is made by the GenLayer contract and validator consensus.

## Why GenLayer

A normal deterministic contract can hold funds but cannot fairly decide whether a tutorial is accurate, a curriculum satisfies a brief, or a research lesson provides sufficient evidence. Curio uses GenLayer for that qualitative adjudication. The validator recomputes the task and compares substantive decision fields rather than checking only JSON shape.

## Repository structure

```text
contracts/   Python Intelligent Contract
app/         Vite + React + TypeScript frontend
  src/lib/   GenLayerJS client, wallet, GEN formatting
  src/       complete create/submit/adjudicate UI
deploy/      TypeScript deployment script
tests/       contract/frontend source and invariant tests
docs/        reserved for verified screenshots and demo evidence
.github/     CI checks
```

## Contract flow

1. Requester calls `create_bounty(...)` with a GEN value. Funds remain in contract escrow.
2. Contributor calls `submit_solution(...)` with a public HTTPS deliverable and evidence note.
3. `adjudicate(...)` renders evidence and produces an `accept`, `reject`, or `more_info` result. Stable unavailable markers prevent provider-specific fetch errors from becoming inconsistent validator inputs.
4. Validators independently run the same evaluation and compare decision, score, criteria count and payout-boundary agreement.
5. Accepted consensus pays the contributor, refunds the requester, or keeps funds escrowed for a revised submission.

See [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), and [VALIDATION_REPORT.md](VALIDATION_REPORT.md).

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
npm install
npm --prefix app install
```

Run checks:

```bash
python -m pytest tests -q             # source checks; GenLayer tests skip if tooling is absent
gltest tests/integration/ -v -s        # with GenLayer Studio running
python scripts/check_project.py
genvm-lint check contracts/curio_learning_bounties.py
npm --prefix app run build
```

Start the frontend:

```bash
npm --prefix app run dev
```

Without a real `VITE_GENLAYER_CONTRACT_ADDRESS`, the UI shows an explicit integration-unavailable state and no fake bounties.

## Deploy the Intelligent Contract

Choose the network and deploy with the GenLayer CLI, or run the included TypeScript script:

```bash
genlayer network testnet-bradbury
npm run deploy
```

The CLI prints the deployed address. Verify the address and deployment transaction in Explorer, record the verified evidence in `deployment.json`, then copy the address to `app/.env`:

```dotenv
VITE_GENLAYER_CONTRACT_ADDRESS=0xREAL_DEPLOYED_ADDRESS
VITE_GENLAYER_NETWORK=testnetBradbury
```

Never commit the real private key.

## Deployment status

| Item | Status |
|---|---|
| Intelligent Contract source | Complete |
| Custom validator/equivalence logic | Complete |
| Wallet + read/write frontend | Complete |
| Testnet contract address | **Not deployed in this package** |
| Live frontend | **Not deployed in this package** |
| Demo video | **Not recorded in this package** |
| DoraHacks submission | **Not submitted in this package** |

Use [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) to finish and verify these external steps. Do not publish placeholder evidence.

## Environment variables

Frontend `app/.env`:

- `VITE_GENLAYER_CONTRACT_ADDRESS`: verified deployed Intelligent Contract address.
- `VITE_GENLAYER_NETWORK`: network matching the deployed contract.
- `VITE_GENLAYER_EXPLORER_URL`: optional transaction-link base.

## License

MIT. See [LICENSE](LICENSE).
