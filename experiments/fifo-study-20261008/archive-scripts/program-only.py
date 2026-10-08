from pathlib import Path
import subprocess,sys,hashlib,json,datetime
o=Path('/path/to/research/experiments/fifo-study-20261008')
label=sys.argv[1];bit=Path(sys.argv[2]).resolve()
assert bit.is_file()
log=o/'logs'/(label+'-program.log');assert not log.exists()
result={'bit':str(bit),'sha256':hashlib.sha256(bit.read_bytes()).hexdigest(),'started':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with log.open('w') as f:
    p=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh; exec vivado -mode batch -source "$1" -nojournal -nolog -tclargs "$2"','program',str(o/'program.tcl'),str(bit)],cwd=o,stdout=f,stderr=subprocess.STDOUT)
s=log.read_text()
result.update(exit=p.returncode,passed=p.returncode==0 and 'ERROR:' not in s and 'REGISTER.CONFIG_STATUS.BIT00_CRC_ERROR = 0' in s and 'REGISTER.CONFIG_STATUS.BIT14_DONE_PIN = 1' in s)
(log.with_suffix('.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result));assert result['passed']
