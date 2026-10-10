#!/usr/bin/env python3
"""Check equivalent game states and summarize completed board measurements."""
import argparse
import csv
import json
from pathlib import Path
import re
import statistics

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--input', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--partial', action='store_true', help='Explicitly analyze only completed trials of an ongoing matrix')
a = p.parse_args()
status = json.loads((a.input / 'status.json').read_text())
if status['status'] != 'complete' and not a.partial:
    raise SystemExit('The matrix has not completed; do not summarize it as complete.')
a.output.mkdir(parents=True, exist_ok=False)
runs, groups, state_sequences, command_sequences, image_hashes = [], {}, {}, {}, {}
profiles = set()
for case in status['completed']:
    directory = a.input / case['case']
    match = re.fullmatch(r'(.+)-s(\d+)-(full|grouped|retained|replay)-r(\d+)', case['case'])
    assert match, case['case']
    variant, state, mode, repeat = match.groups()
    text = (directory / 'uart.log').read_text().replace('\r', '')
    values = re.search(r'^RESULT (.+)$', text, re.M)
    assert values and '\nBREAKOUT_PASS\n' in text
    result = dict(item.split('=', 1) for item in values[1].split())
    begin = re.search(r'^BEGIN_BREAKOUT (.+)$', text, re.M)
    assert begin, ('Missing measurement configuration', case['case'])
    configuration = dict(item.split('=', 1) for item in begin[1].split())
    profile = configuration['profile']
    assert profile in ('frame', 'detailed')
    profiles.add(profile)
    assert len(profiles) == 1, 'Do not combine differently instrumented matrices.'
    with (directory / 'frames.csv').open() as stream:
        frames = list(csv.DictReader(stream))
    assert len(frames) == int(result['frames']) == case['frames']
    for previous, current in zip(frames, frames[1:]):
        assert ((int(current['display_count']) - int(previous['display_count'])) & 0xffffffff) == 1
    states = [f['state_hash'] for f in frames]
    # Full/grouped/retained must advance the same game. Replay holds it fixed.
    state_key = (state, mode == 'replay')
    assert state_sequences.setdefault(state_key, states) == states, ('Game-state mismatch', case['case'])
    command_key = (state, mode)
    commands = [tuple(f[k] for k in ('write_bytes', 'read_bytes', 'write_calls', 'read_calls')) for f in frames]
    assert command_sequences.setdefault(command_key, commands) == commands, ('Command-volume mismatch', case['case'])
    pixel = re.search(r'^FRAME_CHECK .*fnv1a=([0-9a-f]+) pixels=(\d+) mismatches=(\d+)$', text, re.M)
    if case['pixel_check']:
        assert pixel and int(pixel[2]) == 307200 and int(pixel[3]) == 0
        assert image_hashes.setdefault(state_key, pixel[1]) == pixel[1], ('Image hash mismatch', case['case'])
    row = {'case': case['case'], 'variant': variant, 'state_frame': int(state), 'mode': mode, 'profile': profile,
           'repeat': int(repeat), 'frames': len(frames), 'pixel_checked': case['pixel_check'],
           'swaps_per_second': float(result['fps']), 'elapsed_s': float(result['elapsed_s']),
           'completion_p95_ms': float(result['p95_ms']),
           'clock_call_ns': int(configuration['clock_call_ns'])}
    for field in ('logic_ns', 'api_ns', 'swap_ns', 'wait_ns', 'total_ns',
                  'completion_interval_ns', 'write_ns', 'worker_inclusive_ns',
                  'upload_inclusive_ns', 'dma_copy_ns', 'dma_launch_ns', 'dma_completion_wait_ns'):
        row[field.replace('_ns', '_ms')] = (
            statistics.mean(int(f[field]) for f in frames) / 1e6
            if profile == 'detailed' or field in ('total_ns', 'completion_interval_ns') else None)
    row['bytes_per_frame'] = statistics.mean(int(f['write_bytes']) for f in frames)
    runs.append(row)
    groups.setdefault((state, mode, variant), []).append(row)

summaries = []
for (state, mode, variant), rows in sorted(groups.items()):
    out = {'state_frame': int(state), 'mode': mode, 'variant': variant,
           'profile': rows[0]['profile'], 'repetitions': len(rows)}
    for field in ('swaps_per_second', 'logic_ms', 'api_ms', 'swap_ms', 'wait_ms', 'write_ms',
                  'completion_interval_ms', 'completion_p95_ms', 'bytes_per_frame'):
        values = [r[field] for r in rows]
        if all(v is None for v in values):
            for suffix in ('_median', '_min', '_max'):
                out[field + suffix] = None
            continue
        out[field + '_median'] = statistics.median(values)
        out[field + '_min'] = min(values)
        out[field + '_max'] = max(values)
    summaries.append(out)
for name, data in [('runs.csv', runs), ('summary.csv', summaries)]:
    with (a.output / name).open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(data[0]))
        writer.writeheader()
        writer.writerows(data)
checks = {'matrix_complete': status['status'] == 'complete',
          'profile': next(iter(profiles)),
          'trials': len(runs), 'frames': sum(r['frames'] for r in runs),
          'full_pixel_comparisons': sum(r['pixel_checked'] for r in runs),
          'pixels_per_comparison': 307200, 'game_state_sequences_equal': True,
          'command_volume_sequences_equal_within_mode': True,
          'compared_final_images_equal': True,
          'scope': 'Completed swap events, not optically measured FPS. Only selected final images have full pixel comparisons.'}
(a.output / 'checks.json').write_text(json.dumps(checks, indent=2) + '\n')
print(json.dumps(checks))
