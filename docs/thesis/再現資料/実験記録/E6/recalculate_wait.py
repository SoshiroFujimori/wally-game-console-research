import csv
from statistics import median

with open('report/results/runs.csv', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
assert len(rows) == 90
for variant in ('mailbox', 'fifo16', 'fifo512'):
    selected = [r for r in rows if r['variant'] == variant
                and r['state'] == '0' and r['style'] == 'full']
    assert len(selected) == 3
    values = [float(r['apb_wait_ms_frame']) for r in selected]
    print(variant, f'{median(values):.3f} ms/frame')
