from pathlib import Path
import re
import sys

ROOT = Path(__file__).parents[1]
required = [
    "contracts/curio_learning_bounties.py",
    "app/src/lib/genlayer.ts",
    "app/.env.example",
    ".env.example",
    "README.md",
    "ARCHITECTURE.md",
    "SECURITY.md",
    "SUBMISSION_CHECKLIST.md",
    "GENLAYER_REVIEW.md",
    "VALIDATION_REPORT.md",
    "deployment.example.json",
    "deploy/deployScript.ts",
    ".github/workflows/ci.yml",
    "LICENSE",
]
errors: list[str] = []
for item in required:
    if not (ROOT / item).is_file():
        errors.append(f"missing {item}")

secret_patterns = {
    "OpenAI-style API key": re.compile(r"sk-[A-Za-z0-9]{20,}"),
    "64-byte hex private key": re.compile(r"(?<![A-Za-z0-9])0x[a-fA-F0-9]{64}(?![A-Za-z0-9])"),
}
for path in ROOT.rglob("*"):
    excluded = {".git", "node_modules", ".genlayer-codex-kit"}
    if not path.is_file() or any(part in excluded for part in path.parts):
        continue
    if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".zip", ".docx"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for label, pattern in secret_patterns.items():
        if pattern.search(text):
            errors.append(f"possible {label} in {path.relative_to(ROOT)}")

legacy_terms = ["@shelby-protocol", "@aptos-labs", "@solana/wallet", "wagmi"]
for term in legacy_terms:
    hits = []
    for path in [ROOT / "package.json", ROOT / "app/package.json"]:
        if term in path.read_text(encoding="utf-8"):
            hits.append(str(path.relative_to(ROOT)))
    if hits:
        errors.append(f"legacy dependency {term} remains in {', '.join(hits)}")

if errors:
    print("Project checks failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)
print(
    "Project checks passed: required GenLayer files, no obvious secrets, "
    "and no legacy chain dependencies."
)
