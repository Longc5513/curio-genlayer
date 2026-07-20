# GenLayer submission checklist

## Source gate

- [x] Real Python Intelligent Contract is present in `contracts/`.
- [x] AI/web work runs inside GenLayer non-deterministic execution.
- [x] Validator logic independently derives and compares the substantive answer.
- [x] GEN escrow settlement depends on the consensus result.
- [x] Payable creation requires a positive GEN value.
- [x] Adjudication has explicit party access control.
- [x] Evidence URLs and prompt-injection boundaries are handled explicitly.
- [x] Malformed or unavailable evidence does not trigger a silent 50/50 fallback.
- [x] Frontend uses `genlayer-js`, a real EVM wallet provider, contract reads/writes, and the GEN `value` field.
- [x] Repository has CI, GitHub Pages, Dependabot, tests, `.env.example`, and no committed secret.

## Deployment evidence

- [x] Studio contract address supplied and wired into the frontend.
- [ ] Imported Studio source verified to match the repository contract exactly.
- [ ] Create-bounty transaction visibly carries a positive GEN value.
- [x] `deployment.json` committed with the supplied Studio address.
- [ ] Deployment transaction and source match independently verified.
- [ ] `python scripts/verify_submission.py` passes.
- [ ] GitHub Actions `Curio checks` workflow passes publicly.
- [ ] Repository variables configured and GitHub Pages frontend deployed.
- [ ] Live wallet flow tested: connect → create → submit → adjudicate.
- [ ] Payout/refund external transfer or child transaction verified in Explorer.
- [ ] Demo video recorded using `docs/DEMO_SCRIPT.md`.
- [ ] DoraHacks submission completed from `DORAHACKS_SUBMISSION.md`.

## Reviewer evidence

| Evidence | Verified value |
|---|---|
| Network | `studionet` |
| Contract address | `0x679737cCE4804439f2CF6d6082224A58658D0011` (user-provided Studio deployment) |
| Deployment transaction | Pending real deployment |
| Positive GEN escrow transaction | Pending real transaction |
| Adjudication transaction | Pending real transaction |
| Settlement transfer/child transaction | Pending real transaction |
| Live app | Pending Pages deployment |
| Demo video | Pending recording |
| DoraHacks submission | Pending submission |

Never replace pending evidence with invented links. Verify that the deployed contract code matches this repository.
