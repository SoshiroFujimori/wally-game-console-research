from pathlib import Path
import subprocess,re,base64,gzip,hashlib,json
r=Path('/path/to/research/experiments/fifo-study-20261008')
out=r/'board/fifo16-diagnostics'
cmd='sha256sum /tmp/fifo-smoke.rgb565 /tmp/fifo-smoke.rgb565.expected; echo FRAME_BEGIN; gzip -c /tmp/fifo-smoke.rgb565 | base64; echo FRAME_END; echo EXPECTED_BEGIN; gzip -c /tmp/fifo-smoke.rgb565.expected | base64; echo EXPECTED_END'
with (out/'frame-readback.log').open('w') as f:
    p=subprocess.run(['python3',str(r/'uart.py'),'--label','fifo16-diagnostic-frame-readback','--seconds','60','--command',cmd],stdout=f,stderr=subprocess.STDOUT)
assert p.returncode==0
text=(out/'frame-readback.log').read_text()
for label,name in [('FRAME','actual'),('EXPECTED','expected')]:
    b64=re.search(r'\n'+label+r'_BEGIN\r?\n(.*?)\r?\n'+label+'_END',text,re.S)[1]
    data=gzip.decompress(base64.b64decode(b64))
    assert len(data)==640*480*2
    sha=hashlib.sha256(data).hexdigest()
    assert sha in text,sha
    (out/(name+'.rgb565')).write_bytes(data)
    rgb=bytearray()
    for k in range(0,len(data),2):
        v=int.from_bytes(data[k:k+2],'little')
        rgb.extend((((v>>11)&31)*255//31,((v>>5)&63)*255//63,(v&31)*255//31))
    (out/(name+'.ppm')).write_bytes(b'P6\n640 480\n255\n'+rgb)
a=(out/'actual.rgb565').read_bytes();b=(out/'expected.rgb565').read_bytes()
diff=[]
for k in range(0,len(a),2):
    if a[k:k+2]!=b[k:k+2]:
        diff.append(dict(x=(k//2)%640,y=(k//2)//640,actual=int.from_bytes(a[k:k+2],'little'),expected=int.from_bytes(b[k:k+2],'little')))
(out/'pixel-differences.json').write_text(json.dumps(diff,indent=2)+'\n')
print('PIXEL_DIFFERENCES',len(diff),'bbox',(min(x['x'] for x in diff),min(x['y'] for x in diff),max(x['x'] for x in diff),max(x['y'] for x in diff)))
print(diff[:20])

