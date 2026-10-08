from pathlib import Path
import csv,json,re,statistics as st,hashlib
o=Path('/path/to/research/experiments/fifo-study-20261008')
out=o/'analysis-v2';out.mkdir(exist_ok=True)
rows=[];states={};payloads={}
for variant in ('fifo512','fifo16','mailbox'):
    d=o/'board-v2'/variant
    for rec in sorted(d.glob('*.json')):
        v=json.loads(rec.read_text())
        if 'counters' not in v or 'result' not in v:continue
        cfile=rec.with_suffix('.csv')
        data=[{k:int(x) for k,x in r.items()} for r in csv.DictReader(cfile.open())]
        assert len(data)==180 and [r['frame'] for r in data]==list(range(180)),str(rec)
        for a,b in zip(data,data[1:]):assert ((b['display_count']-a['display_count'])&0xffffffff)==1
        counters=dict(re.findall(r'(\w+)=([^\s]+)',v['counters']))
        result=dict(re.findall(r'(\w+)=([^\s]+)',v['result']))
        assert int(counters['words'])*4==sum(r['write_bytes'] for r in data),(str(rec),counters)
        key=(v['state'],v['style'])
        seq=[r['state_hash'] for r in data];packets=[r['write_bytes'] for r in data]
        if key in states:assert states[key]==seq and payloads[key]==packets,('input or command count changed',str(rec))
        states[key]=seq;payloads[key]=packets
        if v['style']!='replay':
            common=(v['state'],'all-game-styles')
            if common in states:assert states[common]==seq,('game state changed between rendering styles',str(rec))
            states[common]=seq
        n=len(data)
        avg=lambda col:sum(r[col] for r in data)/n
        interval=[r['completion_interval_ns']/1e6 for r in data]
        prep=[(r['api_ns']+r['swap_ns']-r['write_ns'])/1e6 for r in data]
        assert min(prep)>=0
        rows.append({'variant':variant,'state':v['state'],'style':v['style'],'repeat':v['repeat'],
          'frames':n,'completed_swaps_s':float(result['fps']),'elapsed_s':float(result['elapsed_s']),
          'logic_ms':avg('logic_ns')/1e6,'prepare_ms':st.mean(prep),'transfer_ms':avg('write_ns')/1e6,
          'completion_wait_ms':avg('wait_ns')/1e6,'interval_mean_ms':st.mean(interval),
          'interval_p95_ms':sorted(interval)[(n-1)*95//100],'command_bytes_frame':avg('write_bytes'),
          'apb_wait_ms_frame':int(counters['wait_cycles'])/20000/n,
          'apb_wait_cycles':int(counters['wait_cycles']),'max_apb_wait_us':int(counters['longest_wait_cycles'])/20,
          'hw_words':int(counters['words']),'hw_elapsed_cycles':int(counters['total_cycles']),
          'state_sequence_sha256':hashlib.sha256(json.dumps(seq).encode()).hexdigest(),
          'pixel_check':v.get('pixel_check',False),'csv_file':str(cfile.relative_to(o))})
if rows:
    with (out/'runs.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
groups=[]
for key in sorted(set((r['variant'],r['state'],r['style']) for r in rows)):
    rs=[r for r in rows if (r['variant'],r['state'],r['style'])==key]
    g=dict(zip(('variant','state','style'),key));g['repetitions']=len(rs)
    for col in ('completed_swaps_s','prepare_ms','transfer_ms','apb_wait_ms_frame','interval_p95_ms','command_bytes_frame'):
        values=[r[col] for r in rs]
        g[col+'_median']=st.median(values);g[col+'_min']=min(values);g[col+'_max']=max(values)
    groups.append(g)
(out/'summary.json').write_text(json.dumps({'runs':len(rows),'groups':groups,'all_word_counts_and_states_verified':True},indent=2)+'\n')
print(json.dumps({'runs':len(rows),'groups':len(groups),'word_and_state_checks':'PASS' if rows else 'PENDING'}))
