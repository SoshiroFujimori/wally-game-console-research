from pathlib import Path
import subprocess,hashlib,json,shutil,os,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008');src=Path('/path/to/wally-game-console');dst=r/'fresh-product'
assert subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip()=='cdf907bc1752b0f300e4fc70b9a51b2bae983b7f'
assert not subprocess.check_output(['git','-C',str(src),'ls-files','-u'],text=True).strip()
assert not dst.exists();dst.mkdir()
manifest={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':str(src),'files':{},'submodules':{}}
items=subprocess.check_output(['git','-C',str(src),'ls-files','--stage','-z']).split(b'\0')
for line in items:
    if not line:continue
    info,name=line.decode().split('\t',1);p=src/name;q=dst/name;q.parent.mkdir(parents=True,exist_ok=True)
    if info.startswith('160000'):
        assert p.is_dir();q.symlink_to(p,target_is_directory=True)
        manifest['submodules'][name]=subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
    elif p.is_symlink():q.symlink_to(os.readlink(p))
    elif p.is_file():
        shutil.copy2(p,q);manifest['files'][name]=hashlib.sha256(q.read_bytes()).hexdigest()
    else:raise RuntimeError('Missing tracked source: '+name)
assert not (dst/'fpga/generator/IP').exists()
(r/'fresh-product-source.json').write_text(json.dumps(manifest,indent=2)+'\n')
env=os.environ.copy();env['WALLY']=str(dst);env['RISCV']='/opt/riscv';env['PATH']=str(dst/'bin')+':/opt/riscv/bin:'+env['PATH']
record={'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':os.getpid(),'source_manifest':'fresh-product-source.json','generated_ip_reused':False,'source_files':len(manifest['files'])}
(dst/'build-status.json').write_text(json.dumps(record,indent=2)+'\n')
print('FRESH_BUILD_STARTED',json.dumps(record),flush=True)
with (r/'logs/fresh-product-build.log').open('w') as log:
    proc=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh && make nexysvideo-rasterix < /dev/null'],cwd=dst/'fpga/generator',env=env,stdout=log,stderr=subprocess.STDOUT)
record['build_exit']=proc.returncode;record['errors']=[s for s in (r/'logs/fresh-product-build.log').read_text(errors='replace').splitlines() if s.startswith('ERROR:')]
if proc.returncode==0 and not record['errors']:
    with (r/'logs/fresh-product-qualification.log').open('w') as log:
        proc=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh && exec vivado -mode batch -nojournal -nolog -source "$1" -tclargs "$2" "$3"','qualify',str(r/'scripts/qualify.tcl'),str(dst),str(dst/'qualification')],cwd=dst,env=env,stdout=log,stderr=subprocess.STDOUT)
    record['qualification_exit']=proc.returncode
record['finished_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();(dst/'build-status.json').write_text(json.dumps(record,indent=2)+'\n')
print('FRESH_BUILD_FINISHED',json.dumps(record),flush=True)
raise SystemExit(0 if record.get('qualification_exit')==0 else 1)
