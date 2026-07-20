# DoraHacks submission draft

Replace bracketed fields only after they are verified.

## Project name

Curio — Consensus-backed learning bounties on GenLayer

## One-line description

Curio escrows GEN for open-ended learning deliverables and uses independent GenLayer AI validators to decide whether to pay the contributor, refund the requester, or request more evidence.

## Problem

Traditional escrow contracts can enforce objective conditions, but they cannot fairly judge whether a tutorial is accurate, a curriculum satisfies a brief, or a research lesson meets a qualitative rubric. A centralized platform or one AI model would become the trusted judge.

## Solution

A requester creates a bounty and locks GEN in an Intelligent Contract. A contributor submits a public deliverable. The leader and validators independently render the evidence and evaluate it against the requester-authored rubric. Settlement happens only after substantive consensus.

## Why GenLayer is essential

The financially meaningful outcome depends on subjective adjudication over unstructured web content. The contract uses GenLayer non-deterministic web/LLM execution and custom validator equivalence. A normal deterministic contract cannot produce the same trust-minimized judgment.

## Security and reliability

- Real MetaMask-compatible wallet connection; no simulated localStorage wallet.
- Positive GEN value required by the payable `create_bounty` method.
- Adjudication restricted to the requester or current contributor.
- Validators independently recompute the answer instead of checking JSON shape.
- Submission/reference content is bounded and explicitly treated as untrusted evidence.
- Unavailable evidence leads to a visible `more_info` path, not a silent 50/50 fallback.
- State is updated before asynchronous GEN settlement messages are emitted.

## Links

- Repository: [REPOSITORY_URL]
- Live app: [LIVE_APP_URL]
- Demo video: [DEMO_VIDEO_URL]
- Network: testnetBradbury
- Contract: [CONTRACT_ADDRESS]
- Deployment transaction: [DEPLOYMENT_TRANSACTION_URL]

## Main flow shown in the demo

Wallet connect → create and escrow GEN → contributor submission → validator consensus → payout/refund/more-info → Explorer verification.
