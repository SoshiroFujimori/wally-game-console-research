#!/usr/bin/env python3
"""Publish selected completed board evidence with raw/public provenance hashes."""
import argparse
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
p.add_argument('--matrix', action='append', default=[], help='Completed matrix directory, relative to --raw')
p.add_argument('--file', action='append', default=[], help='Additional selected text evidence, relative to --raw')
a = p.parse_args()
config = load_config(a.config)
raw_root = a.raw.resolve()
selected = set(a.file)

def source(relative):
    path = (raw_root / relative).resolve()
    if Path(relative).is_absolute() or not path.is_relative_to(raw_root):
        raise ValueError('Evidence must remain inside the selected raw directory.')
    if path.suffix not in {'.json', '.csv', '.log', '.txt', '.rpt', '.command', '.patch'}:
        raise ValueError('Select text evidence; binary media require a separate visual review.')
    return path

for name in a.matrix:
    status_path = str(Path(name) / 'status.json')
    status = json.loads(source(status_path).read_text())
    if status['status'] != 'complete':
        raise ValueError('Refusing to publish an incomplete matrix as completed: ' + name)
    selected.add(status_path)
    for trial in status['completed']:
        for filename in ('command.txt', 'uart.log', 'uart.json', 'frames.csv'):
            selected.add(str(Path(name) / trial['case'] / filename))

# Validate everything before creating the destination. Earlier evidence is never overwritten.
paths = [(relative, source(relative)) for relative in sorted(selected)]
for _, path in paths:
    if not path.is_file():
        raise ValueError('Missing evidence: ' + str(path))
prepared = []
for relative, path in paths:
    original = path.read_bytes()
    readable = original
    transforms = []
    # A UART listener can receive zero bytes while the FPGA is being configured.
    # Keep the raw bytes intact and represent them explicitly in the text copy.
    if path.suffix == '.log' and b'\x00' in readable:
        transforms.append({'nul_bytes_rendered_as_escape': readable.count(b'\x00')})
        readable = readable.replace(b'\x00', b'\\x00')
    published = sanitize_bytes(readable, relative, config)
    if b'\r\n' in published:
        transforms.append({'crlf_sequences_normalized_to_lf': published.count(b'\r\n')})
        published = re.sub(rb'\r+\n', b'\n', published)
    prepared.append((relative, original, published, transforms))
a.output.mkdir(parents=True, exist_ok=False)
manifest = []
for relative, original, published, transforms in prepared:
    destination = a.output / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(published)
    manifest.append({'path': relative,
                     'text_transformations': transforms,
                     'raw_sha256': hashlib.sha256(original).hexdigest(),
                     'public_sha256': hashlib.sha256(published).hexdigest()})
(a.output / 'manifest.json').write_text(json.dumps({
    'description': 'Selected privacy-sanitized evidence; raw originals are preserved separately.',
    'matrices': a.matrix, 'files': manifest}, indent=2) + '\n')
print(json.dumps({'files': len(manifest), 'matrices': len(a.matrix)}))
