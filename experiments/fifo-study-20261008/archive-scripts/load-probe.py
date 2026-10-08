from pathlib import Path
import subprocess,json,re,sys,base64,gzip,hashlib
r=Path('/path/to/research/experiments/fifo-study-20261008')
kind=sys.argv[1]
# Load the common v2 binaries with the same hash checks as the measurement runner.
s=(r/'scripts/run-board-v2.py').read_text()
exec(s[:s.index('# First verify')])
probe=r/'board-v2'/kind/'texture-probe-v3';probe.mkdir(exist_ok=False)
def run(label,cmd,seconds=180):
    with (probe/(label+'.log')).open('w') as f:
        p=subprocess.run(['python3',str(r/'uart.py'),'--label',kind+'-probe-'+label,'--seconds',str(seconds),'--command',cmd],stdout=f,stderr=subprocess.STDOUT)
    text=(probe/(label+'.log')).read_text(errors='replace')
    if '"command_exit": null' in text:raise RuntimeError('Diagnostic command did not finish')
    print(label,'exit',p.returncode,'\n'.join(x for x in text.splitlines() if x.startswith('TEXTURE_')),flush=True)
    return p.returncode,text
rc,text=run('load','mount -t ext4 -o ro /dev/mmcblk0p4 /mnt/fifo-study && gzip -dc /mnt/fifo-study/fifo-study-20261008-v3/texture-probe.gz > /tmp/texture-probe && chmod +x /tmp/texture-probe && sha256sum /tmp/texture-probe && umount /mnt/fifo-study',240)
assert rc==0 and json.loads((r/'payload-v3/manifest.json').read_text())['texture-probe']['sha256'] in text
for label,args in [('only64','64'),('only256','256'),('keep-all','0 keep'),('reuse-all','0')]:
    rc,text=run(label,'/tmp/texture-probe '+args,180)
    (probe/(label+'.json')).write_text(json.dumps({'exit':rc,'checks':re.findall('TEXTURE_CHECK.*',text)},indent=2)+'\n')
    rc,data=run(label+'-pixels','sha256sum /tmp/texture-probe-64.rgb565 2>/dev/null; echo FRAME_BEGIN; gzip -c /tmp/texture-probe-64.rgb565 2>/dev/null | base64; echo FRAME_END',60)
    m=re.search(r'\nFRAME_BEGIN\r?\n(.*?)\r?\nFRAME_END',data,re.S)
    if m and m[1].strip():
        raw=gzip.decompress(base64.b64decode(m[1]));assert len(raw)==640*480*2
        assert hashlib.sha256(raw).hexdigest() in data
        (probe/(label+'-64.rgb565')).write_bytes(raw)
print('TEXTURE_PROBE_V3_COMPLETE',kind,flush=True)

