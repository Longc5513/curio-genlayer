# Architecture

## Product decision

Curio is a learning-bounty marketplace, not a generic course storefront. A requester escrows GEN and publishes a qualitative learning outcome. A contributor submits a public deliverable. The Intelligent Contract fetches bounded evidence, applies the requester rubric, reaches validator consensus, and attaches a financial consequence.

## Components

```text
MetaMask-compatible browser wallet
    │
    ▼
React + TypeScript frontend (`app/`)
    │  genlayer-js read/write/value calls
    ▼
CurioLearningBounties (`contracts/curio_learning_bounties.py`)
    ├─ deterministic: escrow, party permissions, state machine, replay protection
    ├─ nondeterministic: web-rendered evidence + LLM rubric evaluation
    ├─ validation: independent validator re-evaluation and field comparison
    └─ settlement: contributor payout, requester refund, or more-info state
```

## Consensus-critical decision

```json
{
  "decision": "accept | reject | more_info",
  "quality_score": 0,
  "criteria_met": 0,
  "reasoning": "...",
  "missing_evidence": "..."
}
```

The leader and each validator independently fetch and evaluate the same evidence. Validators compare the actual decision, score tolerance, criteria tolerance, and whether both scores remain on the same side of the 70-point payout threshold. They do not approve merely because the JSON is well formed.

## State machine

```text
open ──submit──> submitted ──party requests adjudication──> consensus
  │                                                        ├──accept──> paid
  │                                                        ├──reject──> refunded
  │                                                        └──uncertain──> more_info ──resubmit──> submitted
  └────cancel by requester──────────────────────────────────────────────> cancelled/refunded
```

Only the requester or current contributor can request adjudication. GEN is transferred only after the consensus result returns. An undetermined transaction does not reach settlement code and therefore does not mutate bounty state.

## Trust boundaries

- Requester brief and rubric are authoritative policy inputs.
- Reference pages, submission pages, and contributor notes are untrusted evidence.
- URLs must use HTTPS and obvious loopback/private/metadata targets are rejected.
- Rendered evidence is normalized, length-bounded, clearly delimited, and marked as data rather than instructions.
- Malformed LLM output fails instead of silently choosing a payout.
- Browser UI never fabricates contract rows, wallet state, value transfer, or transaction success.
- Deployment evidence is stored separately from private deployment credentials.
