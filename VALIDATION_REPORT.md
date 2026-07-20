# Validation report

Validated on **2026-07-20** from the packaged source tree.

## Completed locally

- Python syntax parsing for the Intelligent Contract and deployment helper scripts.
- 13 source/invariant tests covering GenLayer consensus primitives, substantive validator comparison, settlement ordering, adjudication access control, prompt-injection boundaries, stable evidence-failure handling, real wallet integration, GEN value passing, on-chain reads/writes, GitHub Pages base configuration, and honest UI states.
- Repository checker for required files, obvious embedded secrets, and legacy Shelby/Aptos/Solana frontend dependencies.
- GitHub-ready repository files: CI, Pages workflow, Dependabot, issue/PR templates, PowerShell/Bash push helpers, deployment recorder, submission verifier, demo script, and submission draft.
- ZIP integrity test after packaging.

## Requires the owner's network account or hosted environment

- Download npm/Python dependencies and run the hosted CI matrix.
- Run `genvm-lint` and `genlayer-test` direct/Studio suites with official tooling.
- Deploy the Intelligent Contract using a funded GenLayer account.
- Verify the deployed address, positive escrow value, consensus activity, and settlement messages in Explorer.
- Configure GitHub repository variables and deploy the frontend through Pages.
- Record a demo video and publish the DoraHacks submission.

These external steps cannot be truthfully fabricated in source. `scripts/record_deployment.py` and `scripts/verify_submission.py` are included to make the verified handoff reproducible.
