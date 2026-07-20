from pathlib import Path

ROOT = Path(__file__).parents[1]
GENLAYER = (ROOT / "app/src/lib/genlayer.ts").read_text(encoding="utf-8")
APP = (ROOT / "app/src/App.tsx").read_text(encoding="utf-8")


def test_frontend_uses_genlayer_js_and_wallet_provider():
    assert "from 'genlayer-js'" in GENLAYER
    assert "eth_requestAccounts" in GENLAYER
    assert "provider: window.ethereum" in GENLAYER
    assert "client.connect(networkName)" in GENLAYER
    assert "Object.prototype.hasOwnProperty.call(chainMap, configuredNetwork)" in GENLAYER


def test_frontend_reads_and_writes_the_contract():
    assert "readContract" in GENLAYER
    assert "writeContract" in GENLAYER
    assert "waitForTransactionReceipt" in GENLAYER
    for method in ("create_bounty", "submit_solution", "adjudicate", "cancel_open_bounty"):
        assert method in APP


def test_frontend_has_honest_states():
    for phrase in (
        "Intelligent Contract not configured",
        "No bounties yet",
        "Awaiting consensus",
        "More info requested",
        "Contract execution finished with an error",
    ):
        status_source = (ROOT / "app/src/components/StatusBadge.tsx").read_text()
        assert phrase in APP or phrase in GENLAYER or phrase in status_source


def test_frontend_sends_real_gen_value_and_pages_base_is_configurable():
    assert "value," in GENLAYER
    assert "parseGen(form.reward)" in APP
    vite = (ROOT / "app/vite.config.ts").read_text(encoding="utf-8")
    assert "VITE_BASE_PATH" in vite
