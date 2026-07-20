# Architecture

## Product decision

Curio is a learning-bounty marketplace, not a generic course storefront. A requester escrows GEN and publishes a qualitative learning outcome. A contributor submits a public deliverable. The Intelligent Contract fetches the evidence, applies the requester rubric, reaches validator consensus, and attaches a financial consequence.

## Components

```text
Browser wallet
    │
    ▼
React + TypeScript frontend (`app/`)
    │  genlayer-js read/write calls
    ▼
CurioLearningBounties (`contracts/curio_learning_bounties.py`)
    ├─ deterministic: escrow, permissions, state machine, replay protection
    ├─ nondeterministic: web-rendered evidence + LLM rubric evaluation
    ├─ validation: independent validator re-evaluation and field comparison
    └─ settlement: contributor payout, requester refund, or more-info state
```

## Consensus-critical decision

The consensus-critical output is:

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
open ──submit──> submitted ──consensus accept──> paid
  │                    ├──── consensus reject──> refunded
  │                    └── consensus uncertain──> more_info ──resubmit──> submitted
  └────cancel by requester──────────────────────> cancelled/refunded
```

GEN is transferred only after the consensus result returns. An undetermined transaction does not reach settlement code and therefore does not mutate bounty state.

## Trust boundaries

- Requester brief and rubric are authoritative policy inputs.
- Reference and submission URLs are untrusted evidence.
- URLs must use HTTPS and obvious loopback/private/metadata targets are rejected.
- The prompt explicitly ignores embedded instructions in evidence.
- Browser UI never fabricates contract rows or transaction success.
