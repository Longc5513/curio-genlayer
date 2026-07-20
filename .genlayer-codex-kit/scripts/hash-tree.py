from pathlib import Path
import hashlib,json
r=Path.cwd(); k=r/'.genlayer-codex-kit'; d={}
for p in sorted(k.rglob('*')):
 if p.is_file() and p.name!='tree-hashes.json': d[str(p.relative_to(r)).replace('\\','/')]=hashlib.sha256(p.read_bytes()).hexdigest()
(k/'tree-hashes.json').write_text(json.dumps(d,indent=2),encoding='utf-8'); print(len(d))
