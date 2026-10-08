from pathlib import Path
import collections,csv,datetime,json,re,statistics as st
root=Path('/path/to/research/experiments/fifo-study-20261008')
folder=root/'board-reconfiguration';source=json.loads((folder/'results.json').read_text())
assert source['passed'] and len(source['runs'])==18
period=801*526/25200000*1e9
rows=[]
for rec in source['runs']:
    path=folder/rec['variant']/f"r{rec['repeat']}-s0-{rec['style']}.csv"
    values=[{k:int(v) for k,v in row.items()} for row in csv.DictReader(path.open())]
    stats=dict(re.findall(r'(\w+)=([^\s]+)',rec['result']))
    hw=dict(re.findall(r'(\w+)=([^\s]+)',rec['counters']))
    n=len(values);assert n==180
    assert int(hw['words'])*4==sum(x['write_bytes'] for x in values)
    hist=collections.Counter(round(x['completion_interval_ns']/period) for x in values[1:])
    rows.append({'variant':rec['variant'],'style':rec['style'],'repeat':rec['repeat'],'frames':n,'completed_swaps_s':float(stats['fps']),'transfer_ms':st.mean(x['write_ns'] for x in values)/1e6,'apb_wait_ms_frame':int(hw['wait_cycles'])/20000/n,'prepare_ms':st.mean(x['api_ns']+x['swap_ns']-x['write_ns'] for x in values)/1e6,'completion_wait_ms':st.mean(x['wait_ns'] for x in values)/1e6,'pixel_check':rec['pixel_check'],'period_counts_excluding_first':json.dumps(dict(sorted(hist.items()))),'csv_file':str(path.relative_to(root))})
with (folder/'runs.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
original=json.loads((root/'analysis-v2/summary.json').read_text())['groups']
groups=[]
for kind in ('mailbox','fifo16','fifo512'):
    for style in ('full','retained'):
        data=[r for r in rows if r['variant']==kind and r['style']==style]
        old=next(r for r in original if r['variant']==kind and r['state']==0 and r['style']==style)
        group={'variant':kind,'state':0,'style':style,'repetitions':len(data)}
        for metric in ('completed_swaps_s','transfer_ms','apb_wait_ms_frame'):
            v=[r[metric] for r in data]
            group[metric+'_median']=st.median(v);group[metric+'_min']=min(v);group[metric+'_max']=max(v)
            group['original_'+metric+'_median']=old[metric+'_median']
        groups.append(group)
result={'generated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runs':18,'measured_frames':18*180,'whole_frame_checked_cases':sum(r['pixel_check'] for r in rows),'groups':groups,'limits':'One additional FPGA reconfiguration and Linux boot per variant, not a physical power cycle. Original 90 runs retained separately; no confidence interval or statistical significance claim. Period histogram rounds measured completion intervals to the RTL display period and omits the first interval.'}
(folder/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
for row in rows:
    if row['variant']=='fifo16' and row['style']=='full':print(json.dumps(row))
