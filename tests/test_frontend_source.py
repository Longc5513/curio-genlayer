from pathlib import Path

ROOT = Path(__file__).parents[1]
GENLAYER = (ROOT / "app/src/lib/genlayer.ts").read_text(encoding="utf-8")
APP = (ROOT / "app/src/App.tsx").read_text(encoding="utf-8")
STATUS = (ROOT / "app/src/components/StatusBadge.tsx").read_text(encoding="utf-8")


def test_frontend_uses_real_eip1193_wallet_without_snap_dependency():
    assert "from 'genlayer-js'" in GENLAYER
    assert "eth_requestAccounts" in GENLAYER
    assert "eth_sendTransaction" not in GENLAYER  # signing is delegated inside genlayer-js
    assert "wallet_switchEthereumChain" in GENLAYER
    assert "wallet_addEthereumChain" in GENLAYER
    assert "wallet_getSnaps" not in GENLAYER
    assert ".connect(" not in GENLAYER


def test_frontend_reads_and_writes_the_contract():
    assert "readContract" in GENLAYER
    assert "writeContract" in GENLAYER
    assert "waitForTransactionReceipt" in GENLAYER
    assert "getContractHealth" in GENLAYER
    for method in ("createBounty", "submitSolution", "adjudicate", "cancelBounty"):
        assert method in APP


def test_frontend_has_honest_states_and_no_fake_rows():
    assert "No bounties yet" in APP
    assert "Contract not reachable" in APP
    assert "localStorage" not in GENLAYER


def test_frontend_sends_real_gen_value_and_exposes_settlement_evidence():
    # The write helper must accept and forward a value parameter
    assert "value: bigint = 0n" in GENLAYER or "value: bigint" in GENLAYER
    # createBounty must pass the actual valueWei to the contract (not 0n)
    assert "valueWei, onHash)" in GENLAYER
    # The createBounty function signature must accept valueWei
    assert "valueWei: bigint" in GENLAYER
    # The app must convert user-entered GEN to wei and pass it
    assert "BigInt(Math.floor(parseFloat(gen) * 1e18))" in APP


def test_deployed_contract_and_pages_base_are_configured():
    assert "0x005f242A7577669be6267E391b07A9980Dff4c63" in GENLAYER
    production = (ROOT / "app/.env.production").read_text(encoding="utf-8")
    assert "VITE_GENLAYER_NETWORK=studionet" in production


def test_wallet_connection_uses_active_provider():
    assert "activeProvider" in GENLAYER
    assert "export async function connectWallet" in GENLAYER
    assert "export async function getConnectedWallet" in GENLAYER
    assert "eth_requestAccounts" in GENLAYER


def test_contract_settlement_functions_are_wired():
    # All settlement functions must be imported and callable from the UI
    for fn in ("createBounty", "submitSolution", "adjudicate", "submitAndAdjudicate", "cancelBounty"):
        assert fn in GENLAYER
    # The write helper must exist and be used by all write functions
    assert "async function write(" in GENLAYER
