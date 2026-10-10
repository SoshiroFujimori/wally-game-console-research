#!/usr/bin/env python3
"""Compare completed transport matrices on one fixed experimental FPGA image."""
import argparse
import csv
import json
from pathlib import Path
import re
import statistics

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--input', type=Path, nargs='+', required=True)
p.add_argument('--bitstream-sha256', required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
if not re.fullmatch('[0-9a-f]{64}', a.bitstream_sha256):
    p.error('Provide the independently qualified and programmed bitstream hash.')
groups, states, commands, images, records = {}, {}, {}, {}, []
for matrix in a.input:
    status = json.loads((matrix / 'status.json').read_text())
    assert status['status'] == 'complete', matrix
    for trial in status['completed']:
        directory = matrix / trial['case']
        text = (directory / 'uart.log').read_text().replace('\r', '')
        assert '\nBREAKOUT_PASS\n' in text
        variant, state, mode, repeat = re.fullmatch(
            r'(.+)-s(\d+)-(full|grouped|retained|replay)-r(\d+)', trial['case']).groups()
        begin = dict(v.split('=', 1) for v in re.search(r'^BEGIN_BREAKOUT (.+)$', text, re.M)[1].split())
        result = dict(v.split('=', 1) for v in re.search(r'^RESULT (.+)$', text, re.M)[1].split())
        transport = dict(v.split('=', 1) for v in re.search(r'^TRANSPORT (.+)$', text, re.M)[1].split())
        frames = list(csv.DictReader((directory / 'frames.csv').open()))
        assert len(frames) == trial['frames'] == int(result['frames'])
        key = (state, mode == 'replay')
        sequence = [f['state_hash'] for f in frames]
        assert states.setdefault(key, sequence) == sequence
        counts = [tuple(f[k] for k in ['write_bytes', 'read_bytes', 'write_calls', 'read_calls']) for f in frames]
        assert commands.setdefault((state, mode), counts) == counts
        for before, after in zip(frames, frames[1:]):
            assert (int(after['display_count']) - int(before['display_count'])) & 0xffffffff == 1
        if trial['pixel_check']:
            check = re.search(r'^FRAME_CHECK .*fnv1a=([0-9a-f]+) pixels=307200 mismatches=0$', text, re.M)
            assert check
            assert images.setdefault(key, check[1]) == check[1]
        profile = begin['profile']
        record = dict(matrix=matrix.name, case=trial['case'], variant=variant,
                      state_frame=int(state), mode=mode, profile=profile, repeat=int(repeat),
                      transport=transport['mode'], dma_minimum=int(transport['dma_minimum']),
                      frames=len(frames), pixel_checked=trial['pixel_check'],
                      swaps_per_second=float(result['fps']))
        for field in ['write_bytes', 'dma_bytes', 'dma_lists']:
            record[field + '_per_frame'] = statistics.mean(int(f[field]) for f in frames)
        for field in ['write_ns', 'dma_copy_ns', 'dma_launch_ns', 'dma_completion_wait_ns']:
            record[field.replace('_ns', '_ms')] = (
                statistics.mean(int(f[field]) for f in frames) / 1e6 if profile == 'detailed' else None)
        records.append(record)
        groups.setdefault((profile, state, mode, variant), []).append(record)
summaries = []
for (profile, state, mode, variant), rows in sorted(groups.items()):
    row = dict(profile=profile, state_frame=int(state), mode=mode, variant=variant,
               transport=rows[0]['transport'], dma_minimum=rows[0]['dma_minimum'], repetitions=len(rows))
    for field in ['swaps_per_second', 'write_bytes_per_frame', 'dma_bytes_per_frame',
                  'dma_lists_per_frame', 'write_ms', 'dma_copy_ms', 'dma_launch_ms', 'dma_completion_wait_ms']:
        values = [r[field] for r in rows]
        for suffix, function in [('median', statistics.median), ('min', min), ('max', max)]:
            row[field + '_' + suffix] = None if all(v is None for v in values) else function(values)
    summaries.append(row)
a.output.mkdir(parents=True, exist_ok=False)
for name, rows in [('runs.csv', records), ('summary.csv', summaries)]:
    with (a.output / name).open('w', newline='') as out:
        writer = csv.DictWriter(out, fieldnames=list(rows[0]), lineterminator='\n')
        writer.writeheader(); writer.writerows(rows)
checks = dict(bitstream_sha256=a.bitstream_sha256, trials=len(records),
              frames=sum(r['frames'] for r in records),
              full_pixel_comparisons=sum(r['pixel_checked'] for r in records),
              game_states_match=True, command_volume_matches=True,
              selected_images_match=True, display_completions_consecutive=True,
              scope='Only the caller-qualified fixed FPGA configuration; completed swaps are not optical FPS.')
(a.output / 'checks.json').write_text(json.dumps(checks, indent=2) + '\n')
print(json.dumps(checks))
