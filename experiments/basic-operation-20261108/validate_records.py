#!/usr/bin/env python3
"""Verify published evidence hashes and the reported UART results.

This checks record consistency. It does not repeat the FPGA or visual tests.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_records(value):
    count = 0
    if isinstance(value, dict):
        if 'path' in value and 'published_sha256' in value:
            path = (ROOT / value['path']).resolve()
            assert path.is_relative_to(ROOT), value['path']
            assert digest(path) == value['published_sha256'], value['path']
            count += 1
        for child in value.values():
            count += check_records(child)
    elif isinstance(value, list):
        for child in value:
            count += check_records(child)
    return count


def check_game(trial, path):
    text = path.read_text(encoding='utf-8')
    match = re.search(r'Game ended: score=(\d+) lives=(\d+) frames=(\d+) '
                      r'ticks=(\d+) elapsed=([0-9.]+) s', text)
    assert match, path
    keys = ('score', 'lives', 'frames_reported', 'ticks_reported')
    for key, value in zip(keys, match.groups()[:4]):
        assert trial[key] == int(value), (path, key)
    assert trial['elapsed_seconds_reported'] == float(match[5]), path
    assert trial['exit_status'] == 0 and re.search(r'TEST_DONE_[0-9a-f]+=0', text)


def main():
    results = read_json(ROOT / 'results.json')
    implementation = read_json(ROOT / 'results/implementation.json')
    source = read_json(ROOT / 'hdmi/source-manifest.json')
    assert results['bitstream_sha256'] == implementation['bit_sha256']
    assert digest(ROOT / 'hdmi/output.patch') == source['patch_sha256']
    for name, expected in implementation['published_report_hashes'].items():
        assert digest(ROOT / 'results/implementation' / name) == expected, name
    assert digest(ROOT / results['video']['path']) == results['video']['sha256']
    for trial in results['current_trials']:
        assert trial['bit_sha256'] == results['bitstream_sha256']
        assert trial['frame_check']['passed_visible_frame_check']
        check_game(trial, ROOT / f'results/boot-{trial["trial"]:02d}/game.raw')
    check_game(results['continuous_trial'], ROOT / 'results/continuous-300s/game.raw')
    count = check_records(results)
    lossless = read_json(ROOT / 'video/complete-300s-lossless.json')
    assert lossless['published_video']['published_sha256'] == results['continuous_trial']['recording']['published_sha256']
    assert lossless['decoded_frames_compared'] == 18385
    assert lossless['decoded_pixels_identical']
    assert lossless['presentation_timestamps_and_durations_identical']
    count += check_records(lossless)
    count += check_records(read_json(ROOT / 'history/standard-product-trials.json'))
    derivation = read_json(ROOT / 'video/derivation.json')
    for name, expected in derivation['published_media_sha256'].items():
        assert digest(ROOT / 'video' / name) == expected, name
    print(json.dumps({'checked_record_hashes': count,
                      'verified_uart_results': len(results['current_trials']) + 1,
                      'scope': 'Saved-record consistency only; no new hardware test'}))


if __name__ == '__main__':
    main()
