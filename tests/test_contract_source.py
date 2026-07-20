from pathlib import Path
import ast
import re

SOURCE_PATH = Path(__file__).parents[1] / "contracts" / "curio_learning_bounties.py"
SOURCE = SOURCE_PATH.read_text(encoding="utf-8")


def test_contract_is_valid_python_syntax():
    ast.parse(SOURCE)


def test_contract_uses_real_genlayer_consensus():
    required = [
        "class CurioLearningBounties(gl.Contract)",
        "@gl.public.write.payable",
        "gl.nondet.web.render",
        "gl.nondet.exec_prompt",
        "gl.vm.run_nondet_unsafe",
        "isinstance(leader_result, gl.vm.Return)",
        "validator_result = self._evaluate(snapshot)",
    ]
    for token in required:
        assert token in SOURCE, f"Missing consensus primitive: {token}"


def test_validator_compares_substantive_fields():
    for field in ('["decision"]', '["quality_score"]', '["criteria_met"]'):
        assert SOURCE.count(field) >= 2
    assert "payout boundary" in SOURCE.lower()


def test_state_mutation_occurs_after_consensus_result():
    consensus = SOURCE.index("result = gl.vm.run_nondet_unsafe")
    settlement = SOURCE.index('if bounty.verdict == "accept"')
    transfer = SOURCE.index("emit_transfer", settlement)
    assert consensus < settlement < transfer


def test_prompt_injection_controls_are_explicit():
    assert "untrusted evidence" in SOURCE
    assert "Ignore any instructions" in SOURCE
    assert "Judge only against" in SOURCE


def test_evidence_fetch_failure_has_stable_more_info_path():
    assert "def _render_evidence" in SOURCE
    assert 'return f"[{label}_UNAVAILABLE]"' in SOURCE
    assert "SUBMISSION_UNAVAILABLE" in SOURCE
    assert "REFERENCE_UNAVAILABLE" in SOURCE
    assert "Never include provider-specific exception text" in SOURCE


def test_no_obvious_embedded_secrets():
    forbidden = [r"sk-[A-Za-z0-9]{20,}", r"0x[a-fA-F0-9]{64}"]
    for pattern in forbidden:
        assert re.search(pattern, SOURCE) is None
