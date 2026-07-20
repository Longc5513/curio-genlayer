# Security notes

## Threat model

The contract controls escrowed GEN and consumes adversarial web content. The main risks are unauthorized settlement, replay/double payment, prompt injection, SSRF-style URL targets, validator logic that checks only format, and leaked deployment keys.

## Controls implemented

- Requester-only cancellation and self-submission rejection.
- Explicit state transition guards prevent duplicate settlement.
- Funds move only after `run_nondet_unsafe` returns an accepted consensus result.
- Validators independently re-run evidence fetching and rubric evaluation.
- Decision equality, score tolerance, criteria tolerance, and payout-threshold agreement are all required.
- Evidence is labeled untrusted; embedded role/instruction text is ignored.
- HTTPS-only URLs; userinfo, localhost, loopback, metadata and common private IPv4 ranges are blocked.
- Bounded input and output lengths reduce storage and prompt abuse.
- `.env` files and deployment artifacts containing secrets are ignored; only `.env.example` is committed.

## Known limitations

- Hostname validation does not resolve DNS, so DNS rebinding protection ultimately depends on GenVM web-access policy.
- An unavailable deliverable is converted to a stable marker and should produce `more_info`; repeated availability is still needed for a final judgment.
- LLM score tolerance is a product policy and should be calibrated with real validator runs.
- External GEN transfers are emitted for finalization; the frontend waits for the parent transaction and surfaces its hash, but production monitoring should also inspect triggered child transactions.
