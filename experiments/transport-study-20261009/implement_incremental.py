#!/usr/bin/env python3
"""Implement a manifested experimental netlist using explicit reference placement."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--current', type=Path, required=True, help='Post-opt checkpoint of the experimental logical design')
p.add_argument('--reference', type=Path, required=True, help='Routed checkpoint of a timing-qualified reference')
p.add_argument('--source-manifest', type=Path, required=True)
p.add_argument('--vivado-bin', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
for path in (a.current, a.reference, a.source_manifest):
    assert path.is_file()
a.output.mkdir(parents=True, exist_ok=False)
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()
script = Path(__file__).with_suffix('.tcl')
record = {'started_utc': now(), 'pid': os.getpid(),
          'current': {'path': str(a.current), 'sha256': digest(a.current)},
          'reference': {'path': str(a.reference), 'sha256': digest(a.reference)},
          'source_manifest_sha256': digest(a.source_manifest),
          'implementation_script_sha256': digest(script),
          'source_manifest': json.loads(a.source_manifest.read_text()),
          'board_programming_performed': False}
(a.output / 'status.json').write_text(json.dumps(record, indent=2) + '\n')
with (a.output / 'implementation.log').open('w') as log:
    proc = subprocess.run([str(a.vivado_bin / 'vivado'), '-mode', 'batch', '-nojournal', '-nolog',
                           '-source', str(script), '-tclargs', str(a.current), str(a.reference), str(a.output)],
                          cwd=a.output, stdout=log, stderr=subprocess.STDOUT)
log = (a.output / 'implementation.log').read_text(errors='replace')
record['exit'] = proc.returncode
record['errors'] = [line for line in log.splitlines() if line.startswith('ERROR:')]
record['finished_utc'] = now()
match = re.search(r'QUALIFY_WNS=([-.\d]+) QUALIFY_WHS=([-.\d]+)', log)
if match:
    record['wns_ns'], record['whs_ns'] = map(float, match.groups())
record['timing_drc_pass'] = proc.returncode == 0 and not record['errors'] and 'TIMING_DRC_QUALIFIED' in log
if record['timing_drc_pass']:
    record['bitstream_sha256'] = digest(a.output / 'fpgaTop.bit')
    record['remaining_review'] = 'Inspect routing, clock-domain crossings, exceptions, unconstrained paths, and bus skew before board use.'
(a.output / 'status.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({k: record[k] for k in ('exit', 'errors', 'finished_utc', 'timing_drc_pass')}), flush=True)
raise SystemExit(0 if record['timing_drc_pass'] else 1)
