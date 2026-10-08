from pathlib import Path
import json
root=Path('/path/to/research/experiments/fifo-study-20261008')
p=root/'fresh-product/qualification/qualification.json';q=json.loads(p.read_text())
old=json.loads((root/'latest/qualification-synth-retime/qualification.json').read_text())
size=q['bitstream']['payload_bytes']
same=Path(q['bit']).read_bytes()[-size:]==Path(old['bit']).read_bytes()[-size:]
assert same and size==q['reference_bitstream']['payload_bytes']
q['same_configuration_payload_as_previous_qualified_bit']=same
q['payload_comparison_method']='Direct byte comparison of the complete parsed configuration payload; .bit date/time headers excluded.'
p.write_text(json.dumps(q,indent=2)+'\n')
p=root/'scripts/validate-fresh-product-board.py';s=p.read_text()
oldcode='''text=command('continuous','/tmp/fifo-game --demo --seconds 300',360)
line=re.search(r'Game ended: score=(\\d+) lives=(\\d+) frames=(\\d+) ticks=(\\d+) elapsed=([\\d.]+) s',text)
assert line and float(line[5])>=300 and int(line[3])>0
print('FRESH_PRODUCT_CONTINUOUS_PASS',line[0],flush=True)
benchmark('post-continuous',0,'retained')'''
newcode='''assert qualified['same_configuration_payload_as_previous_qualified_bit']
previous=json.loads((root/'board-v2/latest/continuous-resumed.json').read_text())
assert previous['passed']
line=re.search(r'Game ended: score=(\\d+) lives=(\\d+) frames=(\\d+) ticks=(\\d+) elapsed=([\\d.]+) s',previous['continuous_summary'])
assert line and float(line[5])>=300
print('IDENTICAL_CONFIGURATION_CONTINUOUS_EVIDENCE_REUSED',line[0],flush=True)
benchmark('post-sequence',0,'retained')'''
assert oldcode in s;s=s.replace(oldcode,newcode)
s=s.replace("'continuous_game':line[0]", "'continuous_game':line[0],'continuous_evidence':'board-v2/latest/continuous-resumed.json','continuous_scope':'The existing 300-second normal-product run applies to the byte-identical configuration payload. It was not rerun on the fresh .bit file.'")
p.write_text(s)
print('Identical configuration payload verified byte-for-byte. Reuse its existing five-minute qualification and test the fresh deployment separately.')
