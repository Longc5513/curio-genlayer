#!/usr/bin/env python3
"""Record verified GenLayer deployment evidence without committing private keys."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "curio_learning_bounties.py"
ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")
TX_RE = re.compile(r"^0x[a-fA-F0-9]{64}$")
NETWORKS = {"localnet", "studionet", "testnetAsimov", "testnetBradbury"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--network", choices=sorted(NETWORKS), required=True)
    parser.add_argument("--address", required=True)
    parser.add_argument("--transaction", required=True)
    parser.add_argument("--explorer-url", required=True)
    parser.add_argument("--live-app", default="")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not ADDRESS_RE.fullmatch(args.address):
        raise SystemExit("Invalid contract address; expected 0x plus 40 hex characters")
    if not TX_RE.fullmatch(args.transaction):
        raise SystemExit("Invalid transaction hash; expected 0x plus 64 hex characters")
    if not args.explorer_url.startswith("https://"):
        raise SystemExit("Explorer URL must use HTTPS")
    if args.live_app and not args.live_app.startswith("https://"):
        raise SystemExit("Live app URL must use HTTPS")

    contract_hash = hashlib.sha256(CONTRACT.read_bytes()).hexdigest()
    record = {
        "network": args.network,
        "contractAddress": args.address,
        "deploymentTransaction": args.transaction,
        "explorerUrl": args.explorer_url,
        "liveApp": args.live_app,
        "deployedAt": datetime.now(timezone.utc).isoformat(),
        "contractSourceSha256": contract_hash,
    }
    (ROOT / "deployment.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")

    env = (
        f"VITE_GENLAYER_CONTRACT_ADDRESS={args.address}\n"
        f"VITE_GENLAYER_NETWORK={args.network}\n"
        f"VITE_GENLAYER_EXPLORER_URL={args.explorer_url.rstrip('/')}\n"
    )
    (ROOT / "app" / ".env").write_text(env, encoding="utf-8")

    print("Wrote deployment.json and app/.env")
    print("Set these GitHub repository variables for Pages:")
    print(f"GENLAYER_CONTRACT_ADDRESS={args.address}")
    print(f"GENLAYER_NETWORK={args.network}")
    print(f"GENLAYER_EXPLORER_URL={args.explorer_url.rstrip('/')}")


if __name__ == "__main__":
    main()
