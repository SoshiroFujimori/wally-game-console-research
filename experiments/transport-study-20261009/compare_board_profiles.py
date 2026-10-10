#!/usr/bin/env python3
"""Compare completed matrices with and without internal timing calls."""
import argparse
import csv
import json
from pathlib import Path
import re
import statistics

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--detailed', type=Path, required=True)
p.add_argument('--frame', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()
statuses = [json.loads((root / 'status.json').read_text()) for root in (a.detailed, a.frame)]
assert all(s['status'] == 'complete' for s in statuses)
detailed_cases = {c['case']: c for c in statuses[0]['completed']}
groups = {}
images = 0
for case in statuses[1]['completed']:
    name = case['case']
    assert name in detailed_cases
    sequences, rates = [], []
    image_hashes = []
    for root, profile in ((a.detailed, 'detailed'), (a.frame, 'frame')):
        directory = root / name
        rows = list(csv.DictReader((directory / 'frames.csv').open()))
        assert len(rows) == case['frames']
        sequences.append([tuple(row[k] for k in ('state_hash', 'write_bytes', 'read_bytes',
                                                'write_calls', 'read_calls')) for row in rows])
        text = (directory / 'uart.log').read_text().replace('\r', '')
        assert re.search(r'^BEGIN_BREAKOUT .*profile=' + profile + r' ', text, re.M)
        result = re.search(r'^RESULT (.+)$', text, re.M)
        assert result and '\nBREAKOUT_PASS\n' in text
        values = dict(item.split('=', 1) for item in result[1].split())
        rates.append(float(values['fps']))
        if case['pixel_check']:
            check = re.search(r'^FRAME_CHECK .*fnv1a=([0-9a-f]+) pixels=307200 mismatches=0$', text, re.M)
            assert check
            image_hashes.append(check[1])
    assert sequences[0] == sequences[1], ('Different workload between profiles', name)
    if case['pixel_check']:
        assert image_hashes[0] == image_hashes[1]
        images += 1
    match = re.fullmatch(r'(.+)-s(\d+)-(full|grouped|retained|replay)-r\d+', name)
    assert match
    groups.setdefault(match.groups(), []).append(rates)

a.output.mkdir(parents=True, exist_ok=False)
summary = []
for (variant, state, mode), pairs in sorted(groups.items()):
    row = {'variant': variant, 'state_frame': int(state), 'mode': mode, 'repetitions': len(pairs)}
    for index, profile in enumerate(('detailed', 'frame')):
        values = [pair[index] for pair in pairs]
        for suffix, function in (('median', statistics.median), ('min', min), ('max', max)):
            row[profile + '_swaps_per_second_' + suffix] = function(values)
    row['frame_vs_detailed_median_percent'] = 100 * (row['frame_swaps_per_second_median'] /
                                                   row['detailed_swaps_per_second_median'] - 1)
    summary.append(row)
with (a.output / 'summary.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(summary[0]))
    writer.writeheader()
    writer.writerows(summary)
result = {'matched_trials': len(statuses[1]['completed']), 'matched_selected_images': images,
          'game_state_and_command_volume_sequences_equal': True,
          'note': 'Observed rates and ranges; this comparison is not an optical FPS measurement or a statistical significance test.'}
(a.output / 'checks.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
