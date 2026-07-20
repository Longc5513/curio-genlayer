# Security notes

## Threat model

The contract controls escrowed GEN and consumes adversarial web content. Main risks include unauthorized adjudication, replay/double payment, prompt injection, SSRF-style URL targets, validator logic that checks only format, false escrow success, and leaked deployment keys.

## Controls implemented

- Requester-only cancellation and self-submission rejection.
- Adjudication restricted to the requester or current contributor.
- Explicit state transition guards prevent duplicate settlement.
- Payable creation requires positive `gl.message.value`; the frontend passes the parsed GEN amount through `writeContract.value`.
- Funds move only after `run_nondet_unsafe` returns an accepted consensus result.
- Validators independently re-run evidence fetching and rubric evaluation.
- Decision equality, score tolerance, criteria tolerance, and payout-threshold agreement are all required.
- Evidence is normalized, bounded, delimited, labeled untrusted, and embedded role/instruction text is explicitly ignored.
- HTTPS-only URLs; userinfo, localhost, loopback, metadata and common private IPv4 ranges are blocked.
- Fetch failures use stable markers and lead to a visible `more_info` path rather than provider-specific exceptions or a silent split.
- State is updated before asynchronous external GEN transfer messages are emitted.
- `.env` files and credentials are ignored; only examples and verified public deployment evidence may be committed.

## Known limitations

- Hostname validation does not resolve DNS, so DNS rebinding protection ultimately depends on GenVM web-access policy.
- An unavailable deliverable is converted to a stable marker and should produce `more_info`; repeated availability is still needed for a final judgment.
- LLM score tolerance is product policy and should be calibrated with real multi-validator runs.
- External GEN transfers are asynchronous messages; production review should inspect triggered child transactions in addition to the parent adjudication transaction.
- Public adjudication is intentionally not available to unrelated third parties. This prevents unsolicited consensus spending but means one of the two parties must trigger review.
