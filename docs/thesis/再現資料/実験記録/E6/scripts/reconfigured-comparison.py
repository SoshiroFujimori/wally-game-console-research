from pathlib import Path
import csv,datetime,hashlib,json,re,subprocess
root=Path('/path/to/research/experiments/fifo-study-20261008')
out=root/'board-reconfiguration'
assert not out.exists()
out.mkdir()
manifest=json.loads((root/'payload-v2/manifest.json').read_text())
variants=[
 ('fifo512','variants/fifo512/qualification-wldriven/fpgaTop.bit','eaeeb0d7ef884b66adf6ee42c523b6b773e60f130342f2c8382abc751d77c288'),
 ('mailbox','variants/mailbox/qualification-wldriven/fpgaTop.bit','ab8b0751ae79233db90fb011e2daaf03c91b329de9ceefd08c40b1d15a40fdd6'),
 ('fifo16','variants/fifo16/qualification-wldriven-extra/fpgaTop.bit','27f563c662385b58da7917421e85b68c4eebaa89b0b20ee4d6dbc055bd7b56d4')]
protocol={'registered_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'purpose':'Supplement the within-boot comparison with a new FPGA reconfiguration and Linux boot for each variant. Keep separate from the original 90 runs.','scope':'One additional JTAG reconfiguration and boot per variant; not physical power cycles.','variants':variants,'state_frame':0,'warmup_frames':30,'measured_frames':180,'repetitions':3,'styles':['full','retained'],'bench_sha256':manifest['bench']['sha256'],'all_frames_state_and_word_counts_checked':True,'whole_frame_check':'First repetition of each style, six final images total','order':'fifo512, mailbox, fifo16; styles alternate order on repetition 1'}
(out/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
rows=[]
for kind,relative,sha in variants:
    bit=root/relative
    assert hashlib.sha256(bit.read_bytes()).hexdigest()==sha
    folder=out/kind;folder.mkdir()
    with (folder/'boot.log').open('w') as f:
        p=subprocess.run(['python3',str(root/'boot.py'),str(bit),'reconfigured-'+kind],stdout=f,stderr=subprocess.STDOUT)
    if p.returncode:raise RuntimeError('Boot failed '+kind)
    print(kind,'RECONFIGURED_BOOT_PASS',flush=True)
    def command(label,cmd,seconds=180):
        path=folder/(label+'.log');assert not path.exists()
        with path.open('w') as f:
            p=subprocess.run(['python3',str(root/'uart.py'),'--label','reconfigured-'+kind+'-'+label,'--seconds',str(seconds),'--command',cmd],stdout=f,stderr=subprocess.STDOUT)
        data=path.read_text(errors='replace')
        if p.returncode:raise RuntimeError(str(path))
        return data
    text=command('load','(mkdir -p /mnt/fifo-study && mount -t ext4 -o ro /dev/mmcblk0p4 /mnt/fifo-study && gzip -dc /mnt/fifo-study/fifo-study-20261008-v2/bench.gz > /tmp/fifo-bench && chmod +x /tmp/fifo-bench && sha256sum /tmp/fifo-bench && umount /mnt/fifo-study)',300)
    assert manifest['bench']['sha256'] in text
    print(kind,'SOFTWARE_HASH_VERIFIED',flush=True)
    for rep in range(3):
        order=['full','retained'] if rep!=1 else ['retained','full']
        for style in order:
            label=f'r{rep}-s0-{style}'
            flag=' --retained' if style=='retained' else ''
            dump=' --dump /tmp/reconfigured-frame.rgb565' if rep==0 else ''
            cmd=f'/tmp/fifo-bench --frames 180 --warmup 30 --wait spin --state-frame 0{flag} --csv /tmp/reconfigured-case.csv{dump}; fifo_rc=$?; if [ "$fifo_rc" = 0 ]; then printf "\\nCSV_BEGIN\\n"; cat /tmp/reconfigured-case.csv; printf "CSV_END\\n"; fi; test "$fifo_rc" = 0'
            text=command(label,cmd)
            assert 'BREAKOUT_PASS' in text and 'HW_COUNTERS id=4649' in text
            if rep==0:assert 'pixels=307200 mismatches=0' in text
            body=re.search(r'\nCSV_BEGIN\r?\n(.*?)CSV_END\r?\n',text,re.S)[1].replace('\r','')
            (folder/(label+'.csv')).write_text(body)
            data=list(csv.DictReader(body.splitlines()))
            original=list(csv.DictReader((root/'board-v2'/kind/f'r0-s0-{style}.csv').open()))
            assert len(data)==180
            for column in ('frame','state_hash','write_bytes'):
                assert [x[column] for x in data]==[x[column] for x in original],(kind,label,column)
            assert all(((int(b['display_count'])-int(a['display_count']))&0xffffffff)==1 for a,b in zip(data,data[1:]))
            result=re.search(r'RESULT frames=.*',text)[0].strip()
            counters=re.search(r'HW_COUNTERS id=.*',text)[0].strip()
            hw=dict(re.findall(r'(\w+)=([^\s]+)',counters))
            assert int(hw['words'])*4==sum(int(x['write_bytes']) for x in data)
            row={'variant':kind,'repeat':rep,'style':style,'result':result,'counters':counters,'pixel_check':rep==0,'pixel_result':re.search(r'FRAME_CHECK count=.*',text)[0].strip() if rep==0 else None,'bit_sha256':sha,'software_sha256':manifest['bench']['sha256']}
            rows.append(row)
            (folder/(label+'.json')).write_text(json.dumps(row,indent=2)+'\n')
            print(kind,label,result,flush=True)
(out/'results.json').write_text(json.dumps({'finished_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'runs':rows},indent=2)+'\n')
print('RECONFIGURATION_RECHECK_PASS',len(rows),flush=True)
