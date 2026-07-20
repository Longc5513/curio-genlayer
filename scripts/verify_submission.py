#!/usr/bin/env python3
"""Fail when submission evidence is missing, malformed, or mismatched."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOYMENT = ROOT / "deployment.json"
CONTRACT = ROOT / "contracts" / "curio_learning_bounties.py"

errors: list[str] = []
if not DEPLOYMENT.exists():
    errors.append("deployment.json is missing; deploy and run scripts/record_deployment.py")
else:
    try:
        data = json.loads(DEPLOYMENT.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"deployment.json is invalid JSON: {exc}")
        data = {}

    address = str(data.get("contractAddress", ""))
    tx = str(data.get("deploymentTransaction", ""))
    explorer = str(data.get("explorerUrl", ""))
    if not re.fullmatch(r"0x[a-fA-F0-9]{40}", address):
        errors.append("contractAddress is missing or invalid")
    if not re.fullmatch(r"0x[a-fA-F0-9]{64}", tx):
        errors.append("deploymentTransaction is missing or invalid")
    if not explorer.startswith("https://"):
        errors.append("explorerUrl must be a verified HTTPS URL")

    expected_hash = hashlib.sha256(CONTRACT.read_bytes()).hexdigest()
    if data.get("contractSourceSha256") != expected_hash:
        errors.append("deployed source hash does not match the current contract source")

if errors:
    print("Submission verification failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("Submission evidence is complete and matches the current contract source.")
