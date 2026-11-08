"""Verify fixed label retention and text placement in a captured Breakout video.

This checks the decoded recording, not a software-rendered replacement.
It does not prove every game pixel or measure game-rendering FPS.
"""
import argparse
import csv
import hashlib
import json
import subprocess
from fractions import Fraction
from pathlib import Path
import numpy as np

p = argparse.ArgumentParser()
p.add_argument('video', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--labels', type=Path, default=Path(__file__).with_name('expected-labels.json'))
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=False)
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_streams',
    '-show_frames', '-show_entries',
    'stream=width,height,avg_frame_rate,nb_frames:frame=best_effort_timestamp_time',
    '-of', 'json', str(a.video)]))
stream = probe['streams'][0]
times = [float(f['best_effort_timestamp_time']) for f in probe['frames']]
assert (stream['width'], stream['height']) == (1920, 1080)
rate = float(Fraction(stream['avg_frame_rate']))
assert abs(rate - 60) < .001
regions = {'score': (24, 15, 82, 29), 'lives': (534, 15, 592, 29),
           'title': (237, 460, 403, 474)}
proc = subprocess.Popen([
    'ffmpeg', '-v', 'error', '-nostdin', '-i', str(a.video),
    '-vf', 'crop=1440:1080:240:0,scale=640:480:flags=neighbor',
    '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    stdout=subprocess.PIPE)
labels = json.loads(a.labels.read_text(encoding='utf-8-sig'))
samples = [(g['x'] + x * g['scale'] + g['scale'] // 2,
            g['y'] + y * g['scale'] + g['scale'] // 2,
            bool(row & (1 << (4 - x))), g['group'] == 'WALLY BREAKOUT', g['group'])
           for g in labels for y, row in enumerate(g['rows']) for x in range(5)]
xs, ys = np.array([v[0] for v in samples]), np.array([v[1] for v in samples])
expected = np.array([v[2] for v in samples])
is_cyan = np.array([v[3] for v in samples])
group_masks = {name: np.array([v[4] == name for v in samples])
               for name in ('SCORE', 'LIVES', 'WALLY BREAKOUT')}
rows = []
while True:
    data = proc.stdout.read(640 * 480 * 3)
    if not data:
        break
    assert len(data) == 640 * 480 * 3
    im = np.frombuffer(data, np.uint8).reshape(480, 640, 3)
    white = im.min(axis=2) > 160
    cyan = (im[:, :, 0] < 80) & (im[:, :, 1] > 160) & (im[:, :, 2] > 160)
    blue = (im[:, :, 2] > 110) & (im[:, :, 0] < 90) & (im[:, :, 1] < 90)
    masks = {name: (cyan if name == 'title' else white)[y:y1, x:x1]
             for name, (x, y, x1, y1) in regions.items()}
    counts = {k: int(v.sum()) for k, v in masks.items()}
    walls = [float(blue[65:420, x:x+3].mean()) for x in (13, 625)]
    complete = min(walls) > .8 and counts['score'] > 200 and counts['lives'] > 180 and counts['title'] > 600
    # Sample the center of each 2x2 font cell. Edge pixels vary with video
    # compression; center samples test every on/off bit in the source font.
    colors = im[ys, xs].astype(np.int16)
    actual_white = colors.min(axis=1) > 160
    actual_cyan = ((colors[:, 1] > 160) & (colors[:, 2] > 160) &
                   (colors[:, 1] - colors[:, 0] > 60))
    actual = np.where(is_cyan, actual_cyan, actual_white)
    mismatches = actual != expected
    errors = {name: int(mismatches[mask].sum()) for name, mask in group_masks.items()}
    valid = complete and not mismatches.any()
    rows.append({'frame': len(rows), 'seconds': times[len(rows)],
                 'left_wall': walls[0], 'right_wall': walls[1],
                 **{f'{k}_pixels': n for k, n in counts.items()},
                 **{f'{k}_cell_mismatches': n for k, n in errors.items()},
                 'labels_retained': int(valid)})
assert proc.wait() == 0 and len(rows) == len(times)
first = next((r['frame'] for r in rows if r['labels_retained']), None)
bad = [] if first is None else [r['frame'] for r in rows[first:] if not r['labels_retained']]
result = {
    'video_sha256': hashlib.sha256(a.video.read_bytes()).hexdigest(),
    'decoded_frames': len(rows), 'recording_rate_hz': rate,
    'first_complete_game_seconds': None if first is None else times[first],
    'frames_after_first_complete': 0 if first is None else len(rows) - first,
    'invalid_frames_after_first_complete': bad,
    'font_cell_samples_per_frame': len(samples),
    'expected_labels_sha256': hashlib.sha256(a.labels.read_bytes()).hexdigest(),
    'maximum_cell_mismatches': {} if first is None else {
        k: max(r[f'{k}_cell_mismatches'] for r in rows[first:]) for k in group_masks},
    'logical_text_regions_xyxy': regions,
    'passed': first is not None and times[first] <= 5 and not bad,
    'scope': __doc__.strip()}
with (a.output / 'frame-observations.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=rows[0], lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
(a.output / 'results.json').write_bytes((json.dumps(result, indent=2) + '\n').encode('utf-8'))
print(json.dumps({**result, 'invalid_frames_after_first_complete': len(bad)}, indent=2))
raise SystemExit(0 if result['passed'] else 1)
