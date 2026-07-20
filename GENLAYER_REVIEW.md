# GenLayer criteria review

This review starts from zero and scores only visible repository evidence. External deployment evidence is intentionally not claimed.

## Gate result: source passes; deployment must be verified

A real Python Intelligent Contract exists, AI/web execution runs inside GenLayer, independent validator consensus controls GEN settlement, and the frontend reads/writes the configured contract through a real browser wallet. A reviewer must still open the deployed app and verify that the submitted Explorer contract matches this repository.

## Project rubric

| Area | Source score | Evidence | Remaining requirement |
|---|---:|---|---|
| GenLayer fit | 4/5 | Validator judgment directly decides whether escrowed GEN is paid, refunded, or held for more evidence. | Real usage or traction would justify a 5. |
| Contract quality | 4/5 | Python SDK, `run_nondet_unsafe`, independent re-evaluation, substantive comparison, payout-boundary check, access control, prompt-injection controls, no silent fallback, and settlement after consensus. | Verify a real multi-validator transaction and resulting transfer in Explorer. |
| Engineering | 4/5 | Separated contract/frontend/tests, CI, Pages workflow, Dependabot, security docs, deployment evidence scripts, push helpers, `.env.example`, and no legacy chain dependencies or obvious secrets. | Public commit history and passing hosted CI must be reviewed. |
| Frontend / UX | 3/5 | Modern React UI, MetaMask-compatible wallet, contract reads/writes, GEN value, finality/error states, and full create/submit/adjudicate flow. | Public deployment and human-tested full flow are required for 4+. |

## Additional requirements addressed

1. **Intelligent Contract and Equivalence Principle:** implemented in `contracts/curio_learning_bounties.py`.
2. **Modern frontend, wallet, on-chain interaction:** implemented in `app/` using `genlayer-js` and an injected EVM provider.
3. **README, architecture, setup, deployment, demo:** complete source documentation plus verified-evidence scripts and demo/submission templates.
4. **Clean public repository:** CI, Pages, Dependabot, issue/PR templates, push helpers, `.env.example`, and secret checks are included.

## Reviewer note

Curio uses GenLayer for a financially meaningful subjective decision: grading an unstructured learning deliverable against a human-authored rubric. The validator independently repeats the evidence fetch and evaluation and rejects decision, score, criterion, or payout-threshold disagreement. Verify the deployed address, positive GEN escrow transaction, full wallet flow, and payout/refund child transaction before acceptance.
