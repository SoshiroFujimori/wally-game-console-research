from pathlib import Path
import subprocess,gzip,hashlib,json
r=Path('/path/to/research/experiments/fifo-study-20261008')
p=r/'measurement/src/texture2d.cpp'
s=p.read_text()
assert 'glColor4f(' not in s
s=s.replace('    constexpr unsigned colors[]=', '    glColor4f(1,1,1,1);\n    constexpr unsigned colors[]=')
s=s.replace('if(uint16_t(data[i]|(data[i+1]<<8))!=expected)mismatches++;','if(uint16_t(data[i]|(data[i+1]<<8))!=expected){if(mismatches<12)std::printf("TEXTURE_DIFF x=%d y=%d actual=%04x expected=%04x\\n",x,y,uint16_t(data[i]|(data[i+1]<<8)),expected);mismatches++;}')
p.write_text(s)
with (r/'logs/texture2d-v2-build.log').open('w') as f:subprocess.run(['cmake','--build',str(r/'software-v2'),'-j','8','--target','texture2d'],stdout=f,stderr=subprocess.STDOUT,check=True)
out=r/'payload-v2';out.mkdir(exist_ok=False)
items={'bench':'breakout','game':'cvw-example/rasterix-breakout','demo':'cvw-example/rasterix-demo','texture2d':'texture2d'}
manifest={}
for name,rel in items.items():
    dest=out/name
    subprocess.run(['/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-strip','-o',str(dest),str(r/'software-v2'/rel)],check=True)
    data=dest.read_bytes();compressed=gzip.compress(data,compresslevel=9,mtime=0)
    (out/(name+'.gz')).write_bytes(compressed)
    manifest[name]=dict(sha256=hashlib.sha256(data).hexdigest(),gzip_sha256=hashlib.sha256(compressed).hexdigest(),size=len(data))
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in ('run-board','analyze'):
    s=(r/'scripts'/(name+'.py')).read_text()
    s=s.replace("o/'board'","o/'board-v2'").replace("o/'analysis'","o/'analysis-v2'")
    s=s.replace("o/'payload/manifest.json'","o/'payload-v2/manifest.json'")
    s=s.replace('/mnt/fifo-study/fifo-study-20261008/', '/mnt/fifo-study/fifo-study-20261008-v2/')
    s=s.replace("json.loads((o/'texture2d-install.json').read_text())['sha256']","manifest['texture2d']['sha256']")
    (r/'scripts'/(name+'-v2.py')).write_text(s)
print(json.dumps(manifest,indent=2))

