"""Recompute the archived 27-run results; never talks to the FPGA."""
from pathlib import Path
from collections import defaultdict
import csv,json,re,statistics,sys

records=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent.parent/'実験記録/E4'
plan=json.loads((records/'plans/controlled-finalhdmi.json').read_text(encoding='utf-8'))
groups=defaultdict(list);states=defaultdict(list);boots=set();binaries=set()
for case in plan['cases']:
 label=case['label']
 m=re.fullmatch(r'finalhdmi-v009-(full|grouped|retained)-t(\d+)-r(\d+)',label)
 assert m,label
 mode,window,repeat=m.groups()
 folder=records/'controlled-runs'/label
 result=json.loads((folder/'result.json').read_text(encoding='utf-8'))
 rows=list(csv.DictReader((folder/'frames.csv').open(encoding='utf-8')))
 assert result['passed'] and result['binaryVerified'],label
 assert len(rows)==180 and result['rows']==180,label
 assert result['countsConsecutive'] and result['framesConsecutive'],label
 check=dict(x.split('=',1) for x in result['frameCheck'].split()[1:])
 assert int(check['pixels'])==307200 and int(check['mismatches'])==0,label
 assert result['boot']['passed'],label
 boots.add(result['boot']['sha256']);binaries.add(result['sourceManifest']['build/cross/breakout'])
 vector=[r['state_hash'] for r in rows];states[int(window)].append(vector)
 prep=statistics.mean(int(r['api_ns'])+int(r['swap_ns'])-int(r['write_ns']) for r in rows)/1e6
 assert prep>=0,label
 groups[(int(window),mode)].append({'label':label,'completion_rate':float(result['metrics']['fps']),
   'preparation_ms':prep,'command_bytes':statistics.mean(int(r['write_bytes']) for r in rows)})
assert len(boots)==len(binaries)==1
assert len(plan['cases'])==27 and len(groups)==9
for window,values in states.items():
 assert len(values)==9 and all(v==values[0] for v in values),window
summary=[]
for (window,mode),runs in sorted(groups.items()):
 assert len(runs)==3
 summary.append({'state_frame':window,'mode':mode,'trials':3,
  **{key:statistics.median(r[key] for r in runs) for key in ['completion_rate','preparation_ms','command_bytes']}})
print(json.dumps({'scope':'Archived experimental HDMI results; not a new device measurement',
 'trials':27,'recorded_states':4860,'all_state_sequences_match':True,
 'all_final_pixel_checks_pass':True,'bitstream_sha256':next(iter(boots)),
 'summaries':summary},ensure_ascii=False,indent=2))
