from pathlib import Path
import json,sys
r=Path.cwd(); k=r/'.genlayer-codex-kit'
req=[r/'AGENTS.md',k/'router.md',k/'docs/source-policy.md',k/'builder/AGENTS.md',k/'reviewer/AGENTS.md',k/'security/AGENTS.md',k/'design/AGENTS.md',k/'integrations/AGENTS.md',k/'schemas/evidence.schema.json',k/'schemas/finding.schema.json',k/'schemas/review-report.schema.json',k/'manifest.json']
miss=[str(p.relative_to(r)) for p in req if not p.exists()]
if miss:
 print('Missing files:'); [print('-',x) for x in miss]; sys.exit(1)
for p in (k/'schemas').glob('*.json'): json.loads(p.read_text(encoding='utf-8'))
size=(r/'AGENTS.md').stat().st_size; print(f'AGENTS.md: {size} bytes')
if size>32768: print('Warning: AGENTS.md exceeds 32 KiB'); sys.exit(2)
print('GenLayer Codex Kit v3 is assembled and valid.')
