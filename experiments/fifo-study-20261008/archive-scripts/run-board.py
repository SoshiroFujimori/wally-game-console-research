from pathlib import Path
import subprocess,sys,json,re,datetime,hashlib
o=Path('/path/to/research/experiments/fifo-study-20261008')
kind=sys.argv[1]
assert kind in ('latest','fifo512','fifo16','mailbox')
out=o/'board'/kind;out.mkdir(parents=True,exist_ok=True)
def command(label,cmd,seconds=120):
    log=out/(label+'.log');assert not log.exists()
    with log.open('w') as f:
        p=subprocess.run(['python3',str(o/'uart.py'),'--label',kind+'-'+label,'--seconds',str(seconds),'--command',cmd],stdout=f,stderr=subprocess.STDOUT)
    text=log.read_text(errors='replace')
    if p.returncode:raise RuntimeError(label+' failed; see '+str(log))
    return text
if not (out/'loaded.json').exists():
    text=command('load', '(mkdir -p /mnt/fifo-study && mount -t ext4 -o ro /dev/mmcblk0p4 /mnt/fifo-study && gzip -dc /mnt/fifo-study/fifo-study-20261008/bench.gz > /tmp/fifo-bench && gzip -dc /mnt/fifo-study/fifo-study-20261008/game.gz > /tmp/fifo-game && gzip -dc /mnt/fifo-study/fifo-study-20261008/texture2d.gz > /tmp/fifo-texture2d && chmod +x /tmp/fifo-bench /tmp/fifo-game /tmp/fifo-texture2d && sha256sum /tmp/fifo-bench /tmp/fifo-game /tmp/fifo-texture2d && umount /mnt/fifo-study)',420)
    manifest=json.loads((o/'payload/manifest.json').read_text())
    assert manifest['bench']['sha256'] in text and manifest['game']['sha256'] in text
    assert json.loads((o/'texture2d-install.json').read_text())['sha256'] in text
    (out/'loaded.json').write_text(json.dumps({'bench':manifest['bench']['sha256'],'game':manifest['game']['sha256'],'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
    print(kind,'SOFTWARE_HASH_VERIFIED',flush=True)
# First verify a representative frame before collecting the comparison matrix.
if not (out/'smoke.json').exists():
    text=command('smoke','/tmp/fifo-bench --frames 180 --warmup 30 --retained --wait spin --state-frame 0 --csv /tmp/fifo-smoke.csv --dump /tmp/fifo-smoke.rgb565',120)
    assert 'BREAKOUT_PASS' in text and 'pixels=307200 mismatches=0' in text,text[-2000:]
    if kind!='latest':assert 'HW_COUNTERS id=4649' in text
    (out/'smoke.json').write_text(json.dumps({'passed':True,'result':re.search(r'RESULT frames=.*',text)[0],'pixel_check':re.search(r'FRAME_CHECK count=.*',text)[0]},indent=2)+'\n')
    print(kind,'PIXEL_SMOKE_PASS',flush=True)
if not (out/'texture2d.json').exists():
    text=command('texture2d','/tmp/fifo-texture2d',240)
    assert 'TEXTURE_2D_PASS' in text and text.count('pixels=307200 mismatches=0')==3
    (out/'texture2d.json').write_text(json.dumps({'passed':True,'checks':re.findall(r'TEXTURE_CHECK.*',text)},indent=2)+'\n')
    print(kind,'TEXTURE_2D_PASS',flush=True)
# A latest-source product validation is separate from the instrumented comparison.
if kind=='latest':
    print('LATEST_SMOKE_COMPLETE',flush=True);sys.exit(0)
rows=[]
styles={'full':'','grouped':'--grouped','retained':'--retained'}
for repeat in range(3):
    for state in (0,1800,3600):
        # Rotate order within a boot, avoiding one fixed warm-cache order.
        order=list(styles)
        order=order[repeat:]+order[:repeat]
        for style in order:
            label=f'r{repeat}-s{state}-{style}'
            record=out/(label+'.json')
            if record.exists(): rows.append(json.loads(record.read_text()));continue
            dump=' --dump /tmp/fifo-check.rgb565' if repeat==0 else ''
            hashes='sha256sum /tmp/fifo-check.rgb565 /tmp/fifo-check.rgb565.expected;' if dump else ''
            text=command(label,f'/tmp/fifo-bench --frames 180 --warmup 30 --wait spin --state-frame {state} {styles[style]} --csv /tmp/fifo-case.csv{dump}; fifo_rc=$?; if [ "$fifo_rc" = 0 ]; then {hashes} printf "\\nCSV_BEGIN\\n"; cat /tmp/fifo-case.csv; printf "CSV_END\\n"; fi; test "$fifo_rc" = 0',150)
            assert 'BREAKOUT_PASS' in text and ('pixels=307200 mismatches=0' in text if dump else True)
            csv=re.search(r'\nCSV_BEGIN\r?\n(.*?)CSV_END\r?\n',text,re.S)[1].replace('\r','')
            (out/(label+'.csv')).write_text(csv)
            result=re.search(r'RESULT frames=.*',text)[0].strip()
            counters=re.search(r'HW_COUNTERS id=.*',text)[0].strip()
            row={'variant':kind,'repeat':repeat,'state':state,'style':style,'result':result,'counters':counters,'pixel_check':bool(dump)}
            record.write_text(json.dumps(row,indent=2)+'\n');rows.append(row)
            print(kind,label,result,flush=True)
# Fixed-list replay removes command-generation work from the measured loop.
for repeat in range(3):
    label=f'replay-{repeat}'
    record=out/(label+'.json')
    if record.exists():rows.append(json.loads(record.read_text()));continue
    text=command(label,'/tmp/fifo-bench --frames 180 --warmup 30 --wait spin --fixed --replay --grouped --state-frame 0 --csv /tmp/fifo-replay.csv; fifo_rc=$?; if [ "$fifo_rc" = 0 ]; then printf "\\nCSV_BEGIN\\n"; cat /tmp/fifo-replay.csv; printf "CSV_END\\n"; fi; test "$fifo_rc" = 0',150)
    assert 'BREAKOUT_PASS' in text
    csv=re.search(r'\nCSV_BEGIN\r?\n(.*?)CSV_END\r?\n',text,re.S)[1].replace('\r','')
    (out/(label+'.csv')).write_text(csv)
    row={'variant':kind,'repeat':repeat,'state':0,'style':'replay','result':re.search(r'RESULT frames=.*',text)[0].strip(),'counters':re.search(r'HW_COUNTERS id=.*',text)[0].strip()}
    (out/(label+'.json')).write_text(json.dumps(row,indent=2)+'\n');rows.append(row)
    print(kind,label,row['result'],flush=True)
(out/'matrix.json').write_text(json.dumps(rows,indent=2)+'\n')
print(kind,'MATRIX_COMPLETE',len(rows),flush=True)
