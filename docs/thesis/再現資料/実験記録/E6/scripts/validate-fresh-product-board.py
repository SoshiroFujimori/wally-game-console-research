from pathlib import Path
import csv,datetime,hashlib,json,re,subprocess
root=Path('/path/to/research/experiments/fifo-study-20261008')
q=root/'fresh-product/qualification/qualification.json'
qualified=json.loads(q.read_text());bit=Path(qualified['bit'])
assert hashlib.sha256(bit.read_bytes()).hexdigest()==qualified['sha256']
assert json.loads((root/'board-reconfiguration/results.json').read_text())['passed']
out=root/'board-fresh-product';assert not out.exists();out.mkdir()
with (out/'boot.log').open('w') as f:
    p=subprocess.run(['python3',str(root/'boot.py'),str(bit),'fresh-product'],stdout=f,stderr=subprocess.STDOUT)
assert p.returncode==0,'Fresh product boot failed'
print('FRESH_PRODUCT_BOOT_PASS',flush=True)
def command(label,cmd,seconds=180):
    path=out/(label+'.log');assert not path.exists()
    with path.open('w') as f:
        p=subprocess.run(['python3',str(root/'uart.py'),'--label','fresh-product-'+label,'--seconds',str(seconds),'--command',cmd],stdout=f,stderr=subprocess.STDOUT)
    text=path.read_text(errors='replace')
    assert p.returncode==0,str(path)
    return text
manifest=json.loads((root/'payload-v2/manifest.json').read_text())
text=command('load','(mkdir -p /mnt/fifo-study && mount -t ext4 -o ro /dev/mmcblk0p4 /mnt/fifo-study && gzip -dc /mnt/fifo-study/fifo-study-20261008-v2/bench.gz > /tmp/fifo-bench && gzip -dc /mnt/fifo-study/fifo-study-20261008-v2/game.gz > /tmp/fifo-game && chmod +x /tmp/fifo-bench /tmp/fifo-game && sha256sum /tmp/fifo-bench /tmp/fifo-game && umount /mnt/fifo-study)',360)
assert manifest['bench']['sha256'] in text and manifest['game']['sha256'] in text
print('FRESH_PRODUCT_SOFTWARE_HASH_VERIFIED',flush=True)
checks=[]
def benchmark(label,state,style):
    flag={'full':'','grouped':' --grouped','retained':' --retained'}[style]
    text=command(label,f'/tmp/fifo-bench --frames 180 --warmup 30 --wait spin --state-frame {state}{flag} --csv /tmp/fresh-product.csv --dump /tmp/fresh-product.rgb565; fifo_rc=$?; if [ "$fifo_rc" = 0 ]; then printf "\\nCSV_BEGIN\\n"; cat /tmp/fresh-product.csv; printf "CSV_END\\n"; fi; test "$fifo_rc" = 0')
    assert 'BREAKOUT_PASS' in text and 'pixels=307200 mismatches=0' in text
    assert 'HW_COUNTERS unavailable' in text,'Unexpected experiment instrumentation'
    body=re.search(r'\nCSV_BEGIN\r?\n(.*?)CSV_END\r?\n',text,re.S)[1].replace('\r','')
    (out/(label+'.csv')).write_text(body)
    data=list(csv.DictReader(body.splitlines()))
    reference=list(csv.DictReader((root/'board-v2/fifo512'/f'r0-s{state}-{style}.csv').open()))
    assert len(data)==180
    for column in ('frame','state_hash','write_bytes'):
        assert [x[column] for x in data]==[x[column] for x in reference],(label,column)
    assert all(((int(b['display_count'])-int(a['display_count']))&0xffffffff)==1 for a,b in zip(data,data[1:]))
    rec={'label':label,'state':state,'style':style,'result':re.search(r'RESULT frames=.*',text)[0].strip(),'pixel_result':re.search(r'FRAME_CHECK count=.*',text)[0].strip()}
    checks.append(rec);(out/(label+'.json')).write_text(json.dumps(rec,indent=2)+'\n')
    print('FRESH_PRODUCT_PIXELS_PASS',label,rec['result'],flush=True)
for state,style in ((0,'full'),(1800,'grouped'),(3600,'retained')):
    benchmark(f's{state}-{style}',state,style)
assert qualified['same_configuration_payload_as_previous_qualified_bit']
previous=json.loads((root/'board-v2/latest/continuous-resumed.json').read_text())
assert previous['passed']
line=re.search(r'Game ended: score=(\d+) lives=(\d+) frames=(\d+) ticks=(\d+) elapsed=([\d.]+) s',previous['continuous_summary'])
assert line and float(line[5])>=300
print('IDENTICAL_CONFIGURATION_CONTINUOUS_EVIDENCE_REUSED',line[0],flush=True)
benchmark('post-sequence',0,'retained')
result={'passed':True,'finished_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bitstream_sha256':qualified['sha256'],'source_manifest':'fresh-product-source.json','bench_sha256':manifest['bench']['sha256'],'game_sha256':manifest['game']['sha256'],'linux_boot':'fresh-product-boot-result.json','whole_frame_checks':checks,'continuous_game':line[0],'continuous_evidence':'board-v2/latest/continuous-resumed.json','continuous_scope':'The existing 300-second normal-product run applies to the byte-identical configuration payload. It was not rerun on the fresh .bit file.','continuous_seconds':float(line[5]),'completed_swaps':int(line[3]),'note':'Counterless product from a complete new stock-generator run. Pixel and swap counts, not captured HDMI video FPS.'}
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
qualified['board_test']=result;q.write_text(json.dumps(qualified,indent=2)+'\n')
print('FRESH_PRODUCT_BOARD_PASS',json.dumps(result),flush=True)
