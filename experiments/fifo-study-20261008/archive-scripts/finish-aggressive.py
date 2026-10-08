from pathlib import Path
import sys,time,subprocess,re,json,hashlib
root=Path('/path/to/research/experiments/fifo-study-20261008')
kind=sys.argv[1]
assert kind in ('latest','fifo512','mailbox')
base=root/('latest' if kind=='latest' else 'variants/'+kind)
marker=root/'logs'/('aggressive-route-'+kind+'.exit')
deadline=time.monotonic()+7200
while not marker.exists():
    if time.monotonic()>deadline: raise TimeoutError('Waiting for alternative implementation')
    time.sleep(10)
out=base/'qualification-aggressive-route'
history=[]
for attempt in range(4):
    log=root/'logs'/('aggressive-route-'+kind+'.log') if attempt==0 else root/'logs'/('postextra-aggressive-'+kind+'-'+str(attempt)+'.log')
    timing=log.read_text(errors='replace')
    m=re.search(r'QUALIFY_WNS=([\d.-]+) QUALIFY_WHS=([\d.-]+)',timing)
    history.append(dict(attempt=attempt,path=str(out),wns_ns=float(m[1]) if m else None,whs_ns=float(m[2]) if m else None))
    bit=out/'fpgaTop.bit'
    if bit.exists() and m and min(float(m[1]),float(m[2]))>=0 and 'TIMING_DRC_QUALIFIED' in timing:
        summary=(out/'timing_summary.rpt').read_text()
        assert 'All user specified timing constraints are met.' in summary
        assert re.search(r'nets with routing errors\.*\s*:\s*0',(out/'route_status.rpt').read_text())
        skew=[float(m[2]) for m in re.findall(r'^\s+(?:Slow|Fast)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*$',(out/'bus_skew.rpt').read_text(),re.M)]
        assert skew and min(skew)>=0
        cdc=(out/'cdc.rpt').read_text()
        assert not re.search(r'^CDC-\d+\s+Critical',cdc,re.M)
        rec=dict(variant=kind,bit=str(bit),sha256=hashlib.sha256(bit.read_bytes()).hexdigest(),wns_ns=float(m[1]),whs_ns=float(m[2]),min_bus_skew_slack_ns=min(skew),history=history,manual_cdc_review='pending',board_test='pending')
        (base/'selected-qualification.json').write_text(json.dumps(rec,indent=2)+'\n')
        print(json.dumps(rec),flush=True);sys.exit(0)
    if attempt==3:break
    assert m and 'Timing has not closed' in timing,'A non-timing failure needs manual inspection: '+str(log)
    checkpoint=out/('routed.dcp' if attempt==0 else 'postroute_aggressive.dcp')
    assert checkpoint.exists()
    out=base/('qualification-aggressive-route-extra'+str(attempt+1))
    assert not out.exists(),out
    nextlog=root/'logs'/('postextra-aggressive-'+kind+'-'+str(attempt+1)+'.log')
    cmd='source /home/researcher/AMD/2025.2/Vivado/settings64.sh; exec vivado -mode batch -nojournal -nolog -source '+str(root/'scripts/postopt-checkpoint.tcl')+' -tclargs '+str(checkpoint)+' '+str(out)
    with nextlog.open('w') as f:
        p=subprocess.run(['bash','-c',cmd],cwd=root,stdout=f,stderr=subprocess.STDOUT)
    print(kind,'postroute attempt',attempt+1,'exit',p.returncode,flush=True)
(base/'alternative-failed.json').write_text(json.dumps(history,indent=2)+'\n')
raise RuntimeError('Timing did not close within 3 additional physical-optimization passes')

