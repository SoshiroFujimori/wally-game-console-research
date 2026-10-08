from pathlib import Path
import re,json,hashlib,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008');q=r/'latest/qualification-synth-retime'
log=(r/'logs/synth-retime-project.log').read_text();m=re.search(r'QUALIFY_WNS=([\d.-]+) QUALIFY_WHS=([\d.-]+)',log)
assert m and min(float(m[1]),float(m[2]))>=0 and 'TIMING_DRC_QUALIFIED' in log
assert 'All user specified timing constraints are met.' in (q/'timing_summary.rpt').read_text()
assert re.search(r'nets with routing errors\.*\s*:\s*0',(q/'route_status.rpt').read_text())
check=(q/'check_timing.rpt').read_text()
for label in ('no_clock','unconstrained_internal_endpoints','multiple_clock','generated_clocks','loops','latch_loops'):
    assert f'checking {label} (0)' in check,label
skew=[float(x[2]) for x in re.findall(r'^\s+(?:Slow|Fast)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*$',(q/'bus_skew.rpt').read_text(),re.M)]
assert skew and min(skew)>=0
cdc=(q/'cdc.rpt').read_text();assert not re.search(r'^CDC-\d+\s+Critical',cdc,re.M)
warnings=re.findall(r'^CDC-\d+\s+Warning.*$',cdc,re.M)
assert len(warnings)==2 and any('CDC-8 ' in x for x in warnings) and any('CDC-15 ' in x for x in warnings)
bit=q/'fpgaTop.bit'
d={'qualified_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bit':str(bit),'sha256':hashlib.sha256(bit.read_bytes()).hexdigest(),'wns_ns':float(m[1]),'whs_ns':float(m[2]),'min_bus_skew_slack_ns':min(skew),'unconstrained_internal_endpoints':0,'route_errors':0,'drc_errors':0,'recipe':['synth_design -retiming','opt_design Default','place_design WLDrivenBlockPlacement','phys_opt_design AggressiveExplore','route_design Explore','phys_opt_design AggressiveExplore'],'cdc_warnings':warnings,'manual_cdc_review':{'CDC-8':'Two unchanged MIG reset synchronizers without ASYNC_REG.','CDC-15':'Stable display address with toggle handshake and max-delay bounds; AMD SmartConnect data crossings use generated FIFO constraints. No new critical crossing or unconstrained internal endpoint.','command_channel':'Unmodified AMD asynchronous AXI4-Stream Data FIFO; generated IP CDC constraints preserved.','limits':'Static review is not a formal metastability proof.'},'board_test':'pending'}
(q/'qualification.json').write_text(json.dumps(d,indent=2)+'\n')
print(json.dumps(d,indent=2))
