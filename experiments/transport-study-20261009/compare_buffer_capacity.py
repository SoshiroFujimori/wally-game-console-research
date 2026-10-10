#!/usr/bin/env python3
"""Compare completed IF16/IF17 trials without requiring equal command volumes."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import statistics


def read_trials(directory, variant):
    status = json.loads((directory / 'status.json').read_text())
    if status['status'] != 'complete':
        raise ValueError('The selected matrix has not completed.')
    trials = {}
    images = {}
    checked = 0
    provenance = {}
    for trial in status['completed']:
        match = re.fullmatch(re.escape(variant) + r'-s0-(full|grouped|retained|replay)-r(\d+)', trial['case'])
        if not match:
            continue
        mode, repeat = match.groups()
        key = (mode, int(repeat))
        if key in trials:
            raise ValueError('Duplicate trial: ' + trial['case'])
        folder = directory / trial['case']
        log = (folder / 'uart.log').read_text().replace('\r', '')
        begin = re.search(r'^BEGIN_BREAKOUT (.+)$', log, re.M)
        result = re.search(r'^RESULT (.+)$', log, re.M)
        if not begin or not result or '\nBREAKOUT_PASS\n' not in log:
            raise ValueError('Missing successful completion: ' + trial['case'])
        configuration = dict(item.split('=', 1) for item in begin[1].split())
        measured = dict(item.split('=', 1) for item in result[1].split())
        if configuration['profile'] != 'frame':
            raise ValueError('Use the lower-instrumentation frame profile.')
        with (folder / 'frames.csv').open() as stream:
            frames = list(csv.DictReader(stream))
        if len(frames) != 180 or int(measured['frames']) != 180:
            raise ValueError('Expected the 180-frame comparison protocol.')
        if any((int(b['display_count']) - int(a['display_count'])) & 0xffffffff != 1
               for a, b in zip(frames, frames[1:])):
            raise ValueError('Nonconsecutive completion counters.')
        if trial['pixel_check']:
            pixel = re.search(r'^FRAME_CHECK .*fnv1a=([0-9a-f]+) pixels=(\d+) mismatches=(\d+)$', log, re.M)
            if not pixel or int(pixel[2]) != 307200 or int(pixel[3]) != 0:
                raise ValueError('Missing or failed full-image comparison.')
            if images.setdefault(mode, pixel[1]) != pixel[1]:
                raise ValueError('Final image changed between repetitions.')
            checked += 1
        trials[key] = {
            'states': [frame['state_hash'] for frame in frames],
            'fps': float(measured['fps']),
            'bytes': statistics.mean(int(frame['write_bytes']) for frame in frames),
            'calls': statistics.mean(int(frame['write_calls']) for frame in frames),
        }
        provenance[trial['case']] = hashlib.sha256((folder / 'frames.csv').read_bytes()).hexdigest()
    expected = {(mode, repeat) for mode in ('full', 'grouped', 'retained', 'replay') for repeat in (1, 2, 3)}
    if trials.keys() != expected or images.keys() != {mode for mode, _ in expected}:
        raise ValueError('Missing a mode, repetition, or checked final image.')
    return trials, images, checked, provenance


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    reference, ref_images, ref_checked, ref_hashes = read_trials(args.reference, 'o3-apb')
    candidate, new_images, new_checked, new_hashes = read_trials(args.candidate, 'if17-apb')
    if ref_images != new_images:
        raise ValueError('IF16 and IF17 final image hashes differ.')
    for key in reference:
        if reference[key]['states'] != candidate[key]['states']:
            raise ValueError('The game-state sequence changed: ' + str(key))
    rows = []
    for mode in ('full', 'grouped', 'retained', 'replay'):
        row = {'mode': mode, 'repetitions_per_capacity': 3}
        for name, trials in [('if16', reference), ('if17', candidate)]:
            values = [trials[(mode, repeat)] for repeat in (1, 2, 3)]
            for field in ('fps', 'bytes', 'calls'):
                data = [trial[field] for trial in values]
                for label, reducer in [('median', statistics.median), ('min', min), ('max', max)]:
                    row[name + '_' + field + '_' + label] = reducer(data)
        rows.append(row)
    args.output.mkdir(parents=True, exist_ok=False)
    with (args.output / 'summary.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    checks = {
        'matrices_complete': True, 'paired_trials': len(reference),
        'frames_per_capacity': len(reference) * 180,
        'reference_checked_images': ref_checked, 'candidate_checked_images': new_checked,
        'pixels_per_comparison': 307200, 'game_state_sequences_equal': True,
        'checked_final_image_hashes_equal': True,
        'command_volume_equality_required': False,
        'reason': 'The matched hardware/software capacity changes stripe partitioning and command counts.',
        'scope': 'Completed swaps, not optical FPS; three observed trials are not confidence intervals.',
        'frame_csv_sha256': {'if16': ref_hashes, 'if17': new_hashes},
    }
    (args.output / 'checks.json').write_text(json.dumps(checks, indent=2) + '\n')
    print(json.dumps({key: value for key, value in checks.items() if key != 'frame_csv_sha256'}))


if __name__ == '__main__':
    main()
