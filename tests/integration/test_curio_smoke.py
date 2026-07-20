"""Studio smoke test for payable deployment and contract state.

Run with `gltest tests/integration/ -v -s` while GenLayer Studio is available.
"""

from pathlib import Path

import pytest

pytest.importorskip("gltest")
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

CONTRACT = Path(__file__).parents[2] / "contracts" / "curio_learning_bounties.py"
ONE_GEN = 10**18


def test_deploy_create_and_read_bounty():
    factory = get_contract_factory(contract_file_path=CONTRACT)
    contract = factory.deploy(args=[])
    tx = contract.create_bounty(
        args=[
            "studio-smoke",
            "Explain GenLayer adjudication",
            "Create a structured tutorial showing why independent validator judgment matters.",
            "Must explain leader execution, validator recomputation, equivalence, and failure states.",
            "https://docs.genlayer.com",
        ]
    ).transact(value=ONE_GEN)
    assert tx_execution_succeeded(tx)
    bounties = contract.list_bounties(args=[]).call()
    assert len(bounties) == 1
    assert bounties[0]["bounty_id"] == "studio-smoke"
    assert bounties[0]["status"] == "open"
    assert int(bounties[0]["reward_wei"]) == ONE_GEN
