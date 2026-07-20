# GenLayer criteria review

This review starts from zero and scores only visible repository evidence. External deployment evidence is intentionally not claimed.

## Gate result: request more info until deployed

The source gate passes: a real Python Intelligent Contract exists, AI/web execution is implemented inside GenLayer, consensus controls GEN settlement, and the frontend calls the contract. The project should still be marked **request more info** until a reviewer can open the live app and verify the submitted contract address in Explorer against this repository.

## Project rubric

| Area | Source score | Evidence | Remaining requirement |
|---|---:|---|---|
| GenLayer fit | 4/5 | Validator judgment decides whether escrowed GEN is paid, refunded, or held for more evidence. | Real usage/traction would justify a 5. |
| Contract quality | 4/5 | Python SDK, `run_nondet_unsafe`, independent re-evaluation, substantive field comparison, payout-boundary check, state mutation after consensus, error/state guards. | Run the included direct/Studio tests and GenVM linter after installing official tooling; verify a real multi-validator transaction in Explorer. |
| Engineering | 3/5 | Clean separation, source checks, CI configuration, docs, security notes, deployment script, `.env.example`, no legacy chain dependencies or obvious secrets. | Public commit history, installed lockfiles, and verified CI output must be reviewed before scoring 4+. |
| Frontend / UX | 3/5 | Modern React UI, wallet connect, reads/writes, transaction states, full create/submit/adjudicate flow, honest unavailable/empty/error/more-info states. | Public deployment and human-tested full flow are required for 4+. |

## Additional four requirements

1. **Intelligent Contract and Equivalence Principle:** satisfied in `contracts/curio_learning_bounties.py`.
2. **Modern frontend, wallet, on-chain interaction:** satisfied in `app/` using `genlayer-js` and an injected EVM wallet.
3. **README, architecture, contract address, setup, deployment, demo:** repository documentation and templates are present; real address/live demo fields remain explicitly TBD until verified.
4. **Clean public repository, `.env.example`, no secrets, formatting/linting:** structure and checks are included; publishing the repository remains an external action.

## Reviewer note

Curio uses GenLayer for a financially meaningful, subjective decision: grading an unstructured learning deliverable against a human rubric. The validator independently repeats the evidence fetch and evaluation and rejects decision, score, criterion, or payout-threshold disagreement. Please verify the deployed address and full wallet flow before accepting.
