from pathlib import Path
import datetime,hashlib,json,re,struct
root=Path('/path/to/research/experiments/fifo-study-20261008')
q=root/'fresh-product/qualification'
status=json.loads((root/'fresh-product/build-status.json').read_text())
assert status.get('qualification_exit')==0,status
log=(root/'logs/fresh-product-qualification.log').read_text()
m=re.search(r'QUALIFY_WNS=([\d.-]+) QUALIFY_WHS=([\d.-]+)',log)
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
old=json.loads((root/'latest/qualification-synth-retime/qualification.json').read_text())
assert warnings==old['cdc_warnings'],warnings
assert re.findall(r'^CDC-\d+\s+.*$',cdc,re.M)==re.findall(r'^CDC-\d+\s+.*$',(root/'latest/qualification-synth-retime/cdc.rpt').read_text(),re.M),'CDC summary differs; review manually'
def bitstream(path):
    data=path.read_bytes();pos=2+int.from_bytes(data[:2],'big')
    assert int.from_bytes(data[pos:pos+2],'big')==1;pos+=2
    headers={}
    while True:
        tag=chr(data[pos]);pos+=1
        if tag=='e':
            size=int.from_bytes(data[pos:pos+4],'big');pos+=4
            assert pos+size==len(data)
            return {'sha256':hashlib.sha256(data).hexdigest(),'payload_sha256':hashlib.sha256(data[pos:]).hexdigest(),'payload_bytes':size,'headers':headers}
        assert tag in 'abcd'
        size=int.from_bytes(data[pos:pos+2],'big');pos+=2
        headers[tag]=data[pos:pos+size].decode().rstrip('\0');pos+=size
bit=q/'fpgaTop.bit'
newbit=bitstream(bit);oldbit=bitstream(Path(old['bit']))
resource=(q/'utilization.rpt').read_text()
rows={}
for label in ('Slice LUTs','Slice Registers','Block RAM Tile','DSPs'):
    match=re.search(r'\|\s*'+re.escape(label)+r'\s*\|\s*([\d.]+)\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|',resource)
    assert match,label
    rows[label]={'used':float(match[1]),'available':float(match[2]),'percent':float(match[3])}
result={'qualified_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bit':str(bit),'sha256':newbit['sha256'],'bitstream':newbit,'reference_bitstream':oldbit,'same_configuration_payload_as_previous_qualified_bit':newbit['payload_sha256']==oldbit['payload_sha256'],'wns_ns':float(m[1]),'whs_ns':float(m[2]),'min_bus_skew_slack_ns':min(skew),'unconstrained_internal_endpoints':0,'route_errors':0,'drc_errors':0,'cdc_warnings':warnings,'manual_cdc_review':old['manual_cdc_review'],'resources':rows,'source_manifest':'fresh-product-source.json','recipe':old['recipe'],'generated_ip_reused':False,'generator':'Current product make nexysvideo-rasterix; generated IP from scratch, no manual floorplan or post-build timing edits','board_test':'pending'}
(q/'qualification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2),flush=True)
