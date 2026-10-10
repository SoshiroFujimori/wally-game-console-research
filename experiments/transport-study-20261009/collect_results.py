#!/usr/bin/env python3
"""Import selected functional evidence without changing the raw records."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/publication'))
from sanitize import load_config, sanitize_bytes

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--raw', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--config', type=Path, required=True)
p.add_argument('--if17-only', action='store_true', help='Import the larger-working-buffer model comparisons separately')
a = p.parse_args()
config = load_config(a.config)
a.output.mkdir(parents=True, exist_ok=False)
groups = {
    'gpu-matrix': ('upstream', 'quads'),
    'gpu-textures': ('upstream', 'textures'),
    'gpu-buffered-matrix': ('dma-read-buffer', 'quads'),
    'gpu-buffered-textures': ('dma-read-buffer', 'textures'),
    'gpu-buffered-parser-matrix': ('dma-read-buffer-and-parser', 'quads'),
    'gpu-buffered-parser-textures': ('dma-read-buffer-and-parser', 'textures'),
}
if a.if17_only:
    groups = {'gpu-if17-matrix': ('upstream-if17', 'quads'),
              'gpu-if17-textures': ('upstream-if17', 'textures')}
manifest, rows = [], []

def import_file(relative):
    original = (a.raw / relative).read_bytes()
    redacted = re.sub(rb'\r+\n', b'\n', sanitize_bytes(original, str(relative), config))
    out = a.output / relative
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(redacted)
    manifest.append({'path': str(relative),
                     'raw_sha256': hashlib.sha256(original).hexdigest(),
                     'public_sha256': hashlib.sha256(redacted).hexdigest()})

for group, (variant, workload) in groups.items():
    result = json.loads((a.raw / group / 'result.json').read_text())
    assert len(result['cases']) == 24
    import_file(Path(group) / 'result.json')
    for case in result['cases']:
        import_file(Path(group) / (case['case'] + '.log'))
        rows.append({'variant': variant, 'workload': workload,
                     'case': case['case'], 'exit': case['exit'],
                     'passed': case['exit'] == 0})

extra_files = () if a.if17_only else ('dma-sim.csv', 'dma-sim-result.log',
                 'dma-buffered-top/dma-read-buffer.patch',
                 'dma-buffered-top/manifest.json',
                 'dma-buffered-parser-top/parser-handshake.patch',
                 'dma-buffered-parser-top/manifest.json')
for relative in extra_files:
    import_file(Path(relative))

with (a.output / 'functional-cases.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
(a.output / 'manifest.json').write_text(json.dumps({
    'description': 'Selected, privacy-sanitized copies. Hashes distinguish raw originals from public copies.',
    'files': manifest}, indent=2) + '\n')
print(json.dumps({'cases': len(rows), 'files': len(manifest)}))
