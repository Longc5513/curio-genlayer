"""Fast contract checks using the official GenLayer direct-mode fixtures.

These tests are skipped when genlayer-test is not installed. Install the official
requirements to execute them against the real GenVM direct runner.
"""

import pytest

pytest.importorskip("genlayer_test")


def test_initial_views_are_empty(direct_deploy):
    contract = direct_deploy("contracts/curio_learning_bounties.py")
    assert contract.list_bounties() == []
    assert contract.get_stats() == {
        "bounty_count": 0,
        "total_escrowed_wei": 0,
        "total_paid_wei": 0,
        "total_refunded_wei": 0,
    }


def test_create_requires_positive_gen(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/curio_learning_bounties.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("A positive GEN reward is required"):
        contract.create_bounty(
            "lesson-1",
            "Build a GenLayer lesson",
            "Create a detailed lesson that explains validator consensus clearly.",
            "Must include accurate contract code, validation logic, and test guidance.",
            "https://docs.genlayer.com",
        )
