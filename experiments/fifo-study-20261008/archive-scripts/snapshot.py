from pathlib import Path
import subprocess, shutil, os, json, hashlib, datetime
r=Path('/path/to/wally-game-console')
o=Path('/path/to/research/experiments/fifo-study-20261008')
dst=o/'latest'
dst.mkdir(exist_ok=False)
subprocess.run(['git','-C',str(r),'checkout-index','--all','--prefix='+str(dst)+'/'],check=True)
for mod in (r/'addins').iterdir():
    if mod.is_dir() and (mod/'.git').exists():
        p=dst/'addins'/mod.name
        if p.exists(): p.rmdir()
        p.symlink_to(mod,target_is_directory=True)
shutil.copytree(r/'fpga/generator/IP',dst/'fpga/generator/IP',symlinks=False)
# Reuse generated vendor IP, but build all HDL and the project afresh.
srcs=subprocess.check_output(['git','-C',str(r),'ls-files','--stage'],text=True)
manifest={'created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parent':subprocess.check_output(['git','-C',str(r),'rev-parse','HEAD'],text=True).strip(),'wally':'2064ca2bb8a88e3e3ec43753be93d00bef49345b','rasterix':'9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0','files':{}}
for line in srcs.splitlines():
    left,name=line.split('\t',1)
    p=dst/name
    if left.startswith('160000'):continue
    if p.is_file():manifest['files'][name]=hashlib.sha256(p.read_bytes()).hexdigest()
(o/'latest-source.json').write_text(json.dumps(manifest,indent=2)+'\n')
(o/'latest-upstream.patch').write_bytes(subprocess.check_output(['git','-C',str(r),'diff','--cached','--binary']))
print('SNAPSHOT_READY',len(manifest['files']))
