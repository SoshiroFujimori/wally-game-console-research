from pathlib import Path
import json,hashlib,datetime,csv
r=Path('/path/to/research/experiments/fifo-study-20261008')
rows=list(csv.DictReader((r/'analysis-v2/runs.csv').open()))
for kind in ('mailbox','fifo16','fifo512'):
    p=r/'variants'/kind/('qualification-wldriven-extra/qualification.json' if kind=='fifo16' else 'selected-qualification.json')
    d=json.loads(p.read_text()); bit=Path(d['bit'])
    assert hashlib.sha256(bit.read_bytes()).hexdigest()==d['sha256']
    m=json.loads((r/'board-v2'/kind/'matrix.json').read_text())
    smoke=json.loads((r/'board-v2'/kind/'smoke.json').read_text())
    assert smoke['passed'] and len(m)==30
    assert sum(bool(x.get('pixel_check')) for x in m)==9
    d['board_test']={'updated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'matrix':str(r/'board-v2'/kind/'matrix.json'), 'valid_runs':30, 'game_runs':27,'replay_runs':3,'whole_frame_checked_cases':9,'smoke':smoke,'limits':'Large texture regression remains separate; no HDMI game visual validation.'}
    p.write_text(json.dumps(d,indent=2)+'\n')
print('Qualification records updated for all three measured bitstreams.')
