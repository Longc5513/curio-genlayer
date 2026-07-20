# Contributing

Use conventional commits such as `feat:`, `fix:`, `test:`, `docs:`, and `security:`.

Before opening a pull request, run:

```bash
python -m pytest tests/test_contract_source.py tests/test_frontend_source.py -q
python scripts/check_project.py
genvm-lint check contracts/curio_learning_bounties.py
python -m pytest tests/direct -v
npm --prefix app run lint
npm --prefix app run build
```

Changes to validator logic, access control, GEN value flow, or settlement must include tests and a brief security explanation. Never add private keys, seed phrases, fake transaction hashes, or unverified deployment addresses.
