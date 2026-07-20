from pathlib import Path

ROOT = Path(__file__).parents[1]
GENLAYER = (ROOT / "app/src/lib/genlayer.ts").read_text(encoding="utf-8")
APP = (ROOT / "app/src/App.tsx").read_text(encoding="utf-8")
STATUS = (ROOT / "app/src/components/StatusBadge.tsx").read_text(encoding="utf-8")


def test_frontend_uses_real_eip1193_wallet_without_snap_dependency():
    assert "from 'genlayer-js'" in GENLAYER
    assert "eth_requestAccounts" in GENLAYER
    assert "eth_sendTransaction" not in GENLAYER  # signing is delegated inside genlayer-js
    assert "provider })" in GENLAYER
    assert "wallet_switchEthereumChain" in GENLAYER
    assert "wallet_addEthereumChain" in GENLAYER
    assert "wallet_getSnaps" not in GENLAYER
    assert ".connect(" not in GENLAYER


def test_frontend_reads_and_writes_the_contract():
    assert "readContract" in GENLAYER
    assert "writeContract" in GENLAYER
    assert "waitForTransactionReceipt" in GENLAYER
    assert "ExecutionResult.FINISHED_WITH_RETURN" in GENLAYER
    assert "getContractHealth" in GENLAYER
    for method in ("create_bounty", "submit_solution", "adjudicate", "cancel_open_bounty"):
        assert method in APP


def test_frontend_has_honest_states_and_no_fake_rows():
    for phrase in (
        "No bounties yet",
        "Awaiting consensus",
        "More info requested",
        "The configured Intelligent Contract is not reachable",
        "No localStorage wallet or simulated bounty data is used",
    ):
        assert phrase in APP or phrase in GENLAYER or phrase in STATUS
    assert "localStorage" not in GENLAYER


def test_frontend_sends_real_gen_value_and_exposes_settlement_evidence():
    assert "value," in GENLAYER
    assert "parseGen(form.reward)" in APP
    assert "emittedMessageCount" in GENLAYER
    assert "emittedValueWei" in GENLAYER
    assert "submittedValueWei" in GENLAYER


def test_deployed_contract_and_pages_base_are_configured():
    assert "0x679737cCE4804439f2CF6d6082224A58658D0011" in GENLAYER
    vite = (ROOT / "app/vite.config.ts").read_text(encoding="utf-8")
    assert "VITE_BASE_PATH" in vite
    production = (ROOT / "app/.env.production").read_text(encoding="utf-8")
    assert "VITE_GENLAYER_NETWORK=studionet" in production


def test_wallet_connection_survives_network_switch_failure_and_uses_one_provider():
    # Multi-wallet browsers announce providers through EIP-6963; the chosen
    # provider is cached and reused for account access, network setup and signing.
    assert "eip6963:requestProvider" in GENLAYER
    assert "eip6963:announceProvider" in GENLAYER
    assert "activeProvider" in GENLAYER
    assert "resolveWalletProvider" in GENLAYER

    connect_start = GENLAYER.index("export async function connectWallet")
    connect_end = GENLAYER.index("export async function getConnectedWallet")
    connect_body = GENLAYER[connect_start:connect_end]
    assert "eth_requestAccounts" in connect_body
    assert "ensureWalletNetwork" not in connect_body

    handle_start = APP.index("async function handleConnect")
    handle_end = APP.index("async function transact")
    handle_body = APP[handle_start:handle_end]
    assert handle_body.index("setAccount(connected)") < handle_body.index("await ensureWalletNetwork()")
    assert "Wallet connected · GenLayer network setup failed" in handle_body


def test_wallet_errors_are_human_readable_not_object_object():
    formatter = (ROOT / "app/src/lib/format.ts").read_text(encoding="utf-8")
    assert "JSON.stringify" in formatter
    assert "shortMessage" in formatter
    assert "A wallet request is already pending" in formatter
    assert "return String(error || 'Unknown wallet error')" not in formatter
    assert "readableObjectError" in formatter
    assert "Connect wallet to continue" in APP
