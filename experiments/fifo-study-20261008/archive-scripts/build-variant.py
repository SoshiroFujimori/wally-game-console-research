from pathlib import Path
import subprocess,sys,json,datetime,os
o=Path('/path/to/research/experiments/fifo-study-20261008')
kind=sys.argv[1];tree=o/'variants'/kind
assert kind in ('fifo512','fifo16','mailbox') and tree.is_dir()
env=os.environ.copy();env['WALLY']=str(tree);env['RISCV']='/opt/riscv'
env['PATH']=str(tree/'bin')+':/opt/riscv/bin:'+env['PATH']
record={'variant':kind,'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid':os.getpid()}
(tree/'build-status.json').write_text(json.dumps(record,indent=2))
with (o/'logs'/('build-'+kind+'.log')).open('w') as log:
    p=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh; make nexysvideo-rasterix < /dev/null'],cwd=tree/'fpga/generator',env=env,stdout=log,stderr=subprocess.STDOUT)
record['build_exit']=p.returncode
errors=[s for s in (o/'logs'/('build-'+kind+'.log')).read_text(errors='replace').splitlines() if s.startswith('ERROR:')]
record['errors']=errors
if not errors and p.returncode==0:
    with (o/'logs'/('qualify-'+kind+'.log')).open('w') as log:
        p=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh; exec vivado -mode batch -source "$1" -nojournal -nolog -tclargs "$2" "$3"','qualify',str(o/'scripts/qualify.tcl'),str(tree),str(tree/'qualification')],cwd=tree,stdout=log,stderr=subprocess.STDOUT)
    record['qualification_exit']=p.returncode
record['finished_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
(tree/'build-status.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record),flush=True)
assert not errors and record.get('qualification_exit')==0
