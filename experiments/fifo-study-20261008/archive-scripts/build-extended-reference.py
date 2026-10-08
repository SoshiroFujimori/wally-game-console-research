from pathlib import Path
import re,shutil,subprocess,os,json,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008');w=r/'latest';o=r/'reference-extended';o.mkdir(exist_ok=True)
s=re.sub(r'//[^\n]*', '', (w/'testbench/tests.vh').read_text())
arrays=['arch64m','arch64a_amo','arch64c','arch64cpriv','arch64zcd','arch64f','arch64d']
files=set()
for a in arrays:
    m=re.search(r'string\s+'+a+r'\[\]\s*=\s*\x27\{(.*?)\};',s,re.S)
    assert m,a
    files.update(re.findall(r'"(rv64i_m/[^"\n]+\.S)"',m[1]))
suite=o/'suite';src=w/'addins/riscv-arch-test/riscv-test-suite'
for file in sorted(files):
    p=src/file
    if not p.exists():
        file=file.replace('rv64i_m/','rv32i_m/');p=src/file
    assert p.exists(),p
    dst=suite/file;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
    ref=src/file.replace('/src/','/references/').replace('.S','.reference_output')
    if ref.exists():
        dest=suite/ref.relative_to(src);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ref,dest)
config=(w/'tests/riscof/config.ini').read_text().replace('{0}',str(w/'tests/riscof')).replace('{1}','64gc').replace('{2}','4')
(o/'config.ini').write_text(config)
env=os.environ.copy();env['PATH']=str(w/'bin')+':/opt/riscv/bin:'+env['PATH'];env['WALLY']=str(w);env['RISCV']='/opt/riscv'
cmd=['/path/to/wally-game-console/.venv/bin/riscof','run','--suite',str(suite),'--env',str(src/'env'),'--config',str(o/'config.ini'),'--work-dir',str(o/'work'),'--no-browser','--no-dut-run']
print('Reference files:',len(files),flush=True)
with (r/'logs/extended-reference-build.log').open('w') as f:
    result=subprocess.run(cmd,cwd=w/'tests/riscof',env=env,stdout=f,stderr=subprocess.STDOUT)
(o/'result.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':cmd,'files':sorted(files),'exit':result.returncode},indent=2)+'\n')
print('Reference exit:',result.returncode,flush=True)
raise SystemExit(result.returncode)
