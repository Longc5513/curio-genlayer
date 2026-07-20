# GenLayer submission checklist

## Gate

- [x] Real Python Intelligent Contract is present in `contracts/`.
- [x] AI/web work runs inside GenLayer non-deterministic execution.
- [x] Validator logic independently derives and compares the substantive answer.
- [x] GEN escrow settlement depends on the consensus result.
- [x] Frontend uses `genlayer-js`, an EVM wallet provider, contract reads and writes.
- [x] Repository has clear structure, tests, CI, `.env.example`, and no committed secret.
- [ ] Contract deployed and verified in GenLayer Explorer.
- [ ] `deployment.json` committed with the real network/address/transaction hash.
- [ ] `app/.env.example` or README updated with the real deployed address.
- [ ] Functional frontend deployed publicly.
- [ ] Demo video recorded showing wallet connect → create → submit → adjudicate → explorer verification.
- [ ] DoraHacks submission created with public repository, deployed contract and demo links.

## Reviewer evidence to add after deployment

| Evidence | Value |
|---|---|
| Network | `testnetBradbury` |
| Contract address | `TBD` |
| Deployment transaction | `TBD` |
| Explorer link | `TBD` |
| Live app | `TBD` |
| Demo video | `TBD` |
| DoraHacks submission | `TBD` |

Do not replace `TBD` with invented links. Verify the deployed address matches the code in this repository.
