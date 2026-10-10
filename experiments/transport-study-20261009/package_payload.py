#!/usr/bin/env python3
"""Package explicitly supplied executables without stripping their originals."""
import argparse, gzip, hashlib, json, re
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--output', type=Path, required=True)
p.add_argument('files', nargs='+', help='NAME=PATH')
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=False)
manifest = {}
for item in a.files:
    name, path = item.split('=',1)
    assert re.fullmatch(r'[a-z0-9-]+',name) and name not in manifest
    data = Path(path).read_bytes()
    assert data[:4] == b'\x7fELF'
    compressed = gzip.compress(data, compresslevel=9, mtime=0)
    (a.output/(name+'.gz')).write_bytes(compressed)
    manifest[name] = {'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
                      'gzip_sha256':hashlib.sha256(compressed).hexdigest()}
(a.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
