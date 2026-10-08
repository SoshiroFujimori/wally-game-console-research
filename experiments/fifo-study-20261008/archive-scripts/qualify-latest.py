from pathlib import Path
import subprocess,sys,time,json,datetime
o=Path('/path/to/research/experiments/fifo-study-20261008')
start=time.monotonic()
while not (o/'logs/build-latest.exit').exists():
    if time.monotonic()-start>7200:raise TimeoutError('build wait')
    time.sleep(5)
assert (o/'logs/build-latest.exit').read_text().strip()=='0'
assert not any(s.startswith('ERROR:') for s in (o/'logs/build-latest.log').read_text(errors='replace').splitlines())
with (o/'logs/qualify-latest.log').open('w') as f:
    result=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh; exec vivado -mode batch -source "$1" -nojournal -nolog -tclargs "$2" "$3"','qualify',str(o/'scripts/qualify.tcl'),str(o/'latest'),str(o/'latest/qualification')],cwd=o,stdout=f,stderr=subprocess.STDOUT)
print('LATEST_QUALIFICATION_EXIT',result.returncode,flush=True)
assert result.returncode==0 and 'TIMING_DRC_QUALIFIED' in (o/'logs/qualify-latest.log').read_text()
(o/'latest/qualification/status.json').write_text(json.dumps({'pass':True,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
