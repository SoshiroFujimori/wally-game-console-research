#!/usr/bin/env python3
"""Compare prepared software builds on one explicitly selected, qualified board."""
import argparse
import csv
import datetime
import hashlib
import io
import itertools
import json
from pathlib import Path
import re
import subprocess
import sys

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--uart', required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--frames', type=int, default=180)
p.add_argument('--warmup', type=int, default=30)
p.add_argument('--repeats', type=int, default=3)
p.add_argument('--profile', choices=('detailed', 'frame'), default='detailed')
p.add_argument('--states', type=int, nargs='+', default=[0, 1800, 3600])
p.add_argument('--baseline', default='/tmp/app')
p.add_argument('--lto', default='/tmp/app-lto')
p.add_argument('--variant', action='append', nargs=4,
               metavar=('NAME', 'EXECUTABLE', 'TRANSPORT', 'DMA_MINIMUM'),
               help='Explicit comparison variant; repeat to replace the default software matrix')
p.add_argument('--modes', nargs='+', choices=('full', 'grouped', 'retained', 'replay'),
               default=['full', 'grouped', 'retained', 'replay'])
p.add_argument('--pixel-every-repeat', action='store_true')
a = p.parse_args()
assert a.frames >= 30 and a.repeats >= 1
variants = a.variant or [('o3-apb', a.baseline, 'apb', '64'), ('o3-unrolled', a.baseline, 'unrolled', '64'),
                         ('lto-apb', a.lto, 'apb', '64'), ('lto-unrolled', a.lto, 'unrolled', '64')]
if len({v[0] for v in variants}) != len(variants):
    p.error('Variant names must be unique.')
for name, path, transport, minimum in variants:
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]*', name):
        p.error('Use lowercase alphanumeric variant names, optionally separated by hyphens.')
    if not re.fullmatch(r'/tmp/[A-Za-z0-9._-]+', path):
        p.error('Select prepared executables in /tmp with simple filenames.')
    if transport not in ('apb', 'unrolled', 'dma') or not minimum.isdigit() or not 4 <= int(minimum) <= 1048576:
        p.error('Select apb, unrolled, or dma with a byte threshold from 4 to 1048576.')
a.output.mkdir(parents=True, exist_ok=False)
source = Path(__file__).resolve().parent
conditions = [(state, mode) for state in a.states for mode in a.modes if mode != 'replay']
if 'replay' in a.modes:
    conditions.append((0, 'replay'))
completed = []

def record(status):
    (a.output / 'status.json').write_text(json.dumps({
        'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'status': status, 'completed': completed,
        'configuration': {'variants': variants, 'states': a.states, 'modes': a.modes,
                          'frames': a.frames, 'warmup': a.warmup, 'repeats': a.repeats,
                          'profile': a.profile, 'pixel_every_repeat': a.pixel_every_repeat},
        'runner_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'uart_runner_sha256': hashlib.sha256((source / 'uart_run.py').read_bytes()).hexdigest()}, indent=2) + '\n')

record('running')
try:
    for repeat in range(a.repeats):
        for state, mode in conditions:
            # Rotate which software runs first, so order is not tied to a variant.
            order = variants[repeat % len(variants):] + variants[:repeat % len(variants)]
            for variant, executable, transport, minimum in order:
                label = f'{variant}-s{state}-{mode}-r{repeat + 1}'
                output = a.output / label
                output.mkdir()
                options = '' if mode == 'full' else ' --' + mode
                pixel_check = repeat == 0 or a.pixel_every_repeat
                dump = ' --dump /tmp/transport-frame.raw' if pixel_check else ''
                command = (f'{executable} --transport {transport} --state-frame {state}'
                           f' --dma-minimum {minimum}'
                           f' --frames {a.frames} --warmup {a.warmup} --wait spin'
                           f' --profile {a.profile} --csv /tmp/transport-frames.csv{options}{dump}'
                           ' && printf "CSV_BEGIN\\n" && cat /tmp/transport-frames.csv && printf "CSV_END\\n"')
                command_file = output / 'command.txt'
                command_file.write_text(command + '\n')
                with (output / 'runner.log').open('w') as log:
                    result = subprocess.run([sys.executable, str(source / 'uart_run.py'),
                        '--port', a.uart, '--output', str(output / 'uart.log'),
                        '--seconds', '180', '--command-file', str(command_file)],
                        stdout=log, stderr=subprocess.STDOUT, timeout=195)
                text = (output / 'uart.log').read_text(errors='replace').replace('\r', '')
                if result.returncode or '\nBREAKOUT_PASS\n' not in text:
                    raise RuntimeError('Board trial failed: ' + label)
                if pixel_check and not re.search(r'FRAME_CHECK .*pixels=307200 mismatches=0\n', text):
                    raise RuntimeError('Pixel comparison missing: ' + label)
                data = re.search(r'\nCSV_BEGIN\n(.*?)\nCSV_END\n', text, re.S)
                if not data:
                    raise RuntimeError('CSV delimiters missing: ' + label)
                rows = list(csv.DictReader(io.StringIO(data[1])))
                if len(rows) != a.frames:
                    raise RuntimeError('Wrong frame count: ' + label)
                for previous, current in zip(rows, rows[1:]):
                    if (int(current['display_count']) - int(previous['display_count'])) & 0xffffffff != 1:
                        raise RuntimeError('Nonconsecutive display completions: ' + label)
                (output / 'frames.csv').write_text(data[1] + '\n')
                completed.append({'case': label, 'frames': len(rows), 'pixel_check': pixel_check})
                record('running')
                print(json.dumps(completed[-1]), flush=True)
    record('complete')
except Exception as error:
    record('failed: ' + str(error))
    raise
