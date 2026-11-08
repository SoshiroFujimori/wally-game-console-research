#!/usr/bin/env python3
"""Check memory reads, swaps, reset recovery and pixels entering the HDMI core.

The serializer is excluded here. Physical output requires implementation timing
checks and a real receiver. Logs may contain local paths; sanitize before sharing.
Run after sourcing the installed Vivado settings script.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-tree', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
source = args.source_tree.resolve()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=False)
here = Path(__file__).resolve().parent
rtl = source/'fpga/src/rasterixdisplay.sv'
dependencies = sorted((source/'addins/hdmi/src').glob('*.sv'))
assert len(dependencies) == 10
report = {'passed': False, 'started_utc': datetime.now(timezone.utc).isoformat(),
          'source_hashes': {str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in [rtl, here/'tb_baseline.sv', here/'tb_stress.sv', *dependencies]},
          'commands': [], 'scope': __doc__}


def run(command, directory, label):
    log = directory/(label+'.log')
    with log.open('x') as stream:
        result = subprocess.run(command, cwd=directory, stdout=stream, stderr=subprocess.STDOUT)
    text = log.read_text(errors='replace')
    report['commands'].append({'args': command, 'exit': result.returncode, 'log': str(log)})
    assert result.returncode == 0 and 'FATAL_ERROR' not in text, log
    return text


try:
    for label, cases in [('baseline', [[]]), ('stress', [['SEED=8abc4817'], ['SEED=70a6b538', 'FAULT']])]:
        directory = output/label
        directory.mkdir()
        run(['xvlog', '--sv', '-d', 'VERILATOR', str(here/f'tb_{label}.sv'), str(rtl),
             *map(str, dependencies)], directory, 'compile')
        run(['xelab', '--relax', '--debug', 'typical', '--mt', '4', '-s', 'scanout', 'tb'], directory, 'elaborate')
        for index, case in enumerate(cases):
            parameters = [item for arg in case for item in ['--testplusarg', arg]]
            text = run(['xsim', 'scanout', '--runall', '--onfinish', 'quit', *parameters], directory, f'run-{index}')
            assert 'PASS 720P_SCANOUT' in text and 'HDMI_PIPELINE_PIXELS=' in text, directory
    report['passed'] = True
finally:
    report['finished_utc'] = datetime.now(timezone.utc).isoformat()
    (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
print('Passed the baseline, delayed-response, reset and injected-error cases.')
