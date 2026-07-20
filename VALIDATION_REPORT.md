# Validation report

Validated on **2026-07-20** from the packaged source tree.

## Completed locally

- Python syntax parsing for the Intelligent Contract.
- Repository/source invariant tests for GenLayer consensus primitives, substantive validator comparison, settlement ordering, prompt-injection controls, stable evidence-failure handling, wallet integration, on-chain reads/writes, and honest UI states.
- Repository checker for required files, obvious embedded secrets, and legacy Shelby/Aptos/Solana/Ethereum frontend dependencies.
- GenLayer Codex Kit doctor and file-integrity checks.
- TypeScript source validation with local declarations where third-party packages were unavailable.
- ZIP integrity test after packaging.

## Requires a networked GenLayer environment

The following are included but cannot be truthfully marked as completed inside an offline source-editing environment:

- Install dependencies and run `genvm-lint` against the official GenVM linter.
- Run direct-mode tests with `genlayer-test`.
- Run Studio integration tests with `gltest` and active validators.
- Build the frontend with downloaded npm dependencies.
- Deploy the Intelligent Contract to a selected GenLayer network.
- Verify the deployed address and activity in Explorer.
- Deploy and manually test the live frontend with a real wallet.
- Record a demo video and create the DoraHacks submission.

Until the deployed address, Explorer evidence, live app, and demo are supplied, the honest review outcome is **request more info** rather than accepted.
