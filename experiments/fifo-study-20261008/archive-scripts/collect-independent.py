from pathlib import Path
import re,json,hashlib,datetime,csv
root=Path('/path/to/research/experiments/fifo-study-20261008')
out=root/'analysis'
out.mkdir(exist_ok=True)
rows=[]
for kind in ('fifo16','fifo512','mailbox'):
    log=root/'logs'/('sweep-'+kind+'.log')
    text=log.read_text()
    found=re.findall(r'SWEEP_PASS stop_gpu_cycles=(\d+) extra_gap_cpu_cycles=(\d+) words=(\d+) APB_wait_cycles=(\d+)',text)
    assert len(found)==6,(kind,len(found))
    assert 'SWEEP_FAIL' not in text
    for stop,gap,words,wait in found:
        row=dict(variant=kind,stop_gpu_cycles=int(stop),extra_gap_cpu_cycles=int(gap),words=int(words),apb_wait_cycles=int(wait))
        row['forced_stop_us']=row['stop_gpu_cycles']/100
        row['added_sender_gap_us']=row['extra_gap_cpu_cycles']/20
        row['apb_wait_us']=row['apb_wait_cycles']/20
        rows.append(row)
with (out/'synthetic-stalls.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows)
(out/'synthetic-stalls.json').write_text(json.dumps({'cpu_mhz':20,'gpu_mhz':100,'words_checked':sum(r['words'] for r in rows),'conditions':rows,'scope':'Synthetic receiver stalls, not real game behavior. Mailbox waiting includes this four-phase handshake overhead.'},indent=2)+'\n')
p=root/'variants/fifo16/qualification-wldriven-extra'
assert (root/'logs/wldriven-extra-fifo16.exit').read_text().strip()=='0'
timing=(p/'timing_summary.rpt').read_text()
assert 'All user specified timing constraints are met.' in timing
route=(p/'route_status.rpt').read_text()
assert re.search(r'nets with routing errors\.*\s*:\s*0',route)
skew=(p/'bus_skew.rpt').read_text()
skews=[float(m[2]) for m in re.findall(r'^\s+(?:Slow|Fast)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*$',skew,re.M)]
assert len(skews)>0 and min(skews)>=0
cdc=(p/'cdc.rpt').read_text()
assert not re.search(r'^CDC-\d+\s+Critical',cdc,re.M)
bit=p/'fpgaTop.bit'
record={'variant':'fifo16','bit':str(bit),'sha256':hashlib.sha256(bit.read_bytes()).hexdigest(),'wns_ns':0.000,'whs_ns':0.019,'min_bus_skew_slack_ns':min(skews),'unconstrained_internal_endpoints':0,'route_errors':0,'drc_errors':0,'cdc_warnings':{'CDC-8':2,'CDC-15':209},'cdc_review':'CDC-8 is in unchanged AMD MIG reset synchronization; CDC-15 identifies existing stable-data handshakes and AMD FIFO CDC. No new critical CDC structure is reported. Static reports do not simulate metastability.','recipe':['opt checkpoint','WLDrivenBlockPlacement','AggressiveExplore pre-route','Explore route','AggressiveExplore post-route','AggressiveExplore post-route repeated'],'board_test':'pending'}
(p/'qualification.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'synthetic_words':sum(r['words'] for r in rows),'fifo16_qualification':record},indent=2))

