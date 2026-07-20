## Summary

Describe the contract, frontend, test, or documentation change.

## GenLayer impact

- [ ] No change to consensus behavior
- [ ] Validator/equivalence logic changed and was reviewed
- [ ] GEN value flow or access control changed and was reviewed
- [ ] Frontend contract calls changed and were tested with a real wallet

## Verification

- [ ] `python -m pytest tests/test_contract_source.py tests/test_frontend_source.py -q`
- [ ] `python scripts/check_project.py`
- [ ] `genvm-lint check contracts/curio_learning_bounties.py`
- [ ] `python -m pytest tests/direct -v`
- [ ] `npm --prefix app run build`

Do not add private keys, seed phrases, fake deployment evidence, or unverified contract addresses.
