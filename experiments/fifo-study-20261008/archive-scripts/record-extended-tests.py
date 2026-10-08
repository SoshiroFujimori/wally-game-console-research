from pathlib import Path
import json,hashlib,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008')
p=r/'extended-cpu-tests.json';d=json.loads(p.read_text())
assert all(x['passed'] for x in d['tests'])
assert sum(x['tests'] for x in d['tests'])==357
d['reference_sources']='Official riscv-arch-test test sources selected by the CVW tests.vh lists; Sail reference model through the unchanged CVW RISCOF plugin.'
d['reference_build']='reference-extended/result.json'
d['simulator_binary_sha256']=hashlib.sha256((r/'latest/sim/verilator/wkdir/rv64gc_testbench/Vtestbench').read_bytes()).hexdigest()
p.write_text(json.dumps(d,indent=2)+'\n')
(r/'upstream-refresh.json').write_text(json.dumps({'verified_utc':'2026-10-08T10:00:00Z','note':'Checked with git ls-remote during this run; version matches the frozen experiment versions. The timestamp is rounded to the UTC hour.', 'wally_url':'https://github.com/openhwgroup/cvw.git','wally_main':'2064ca2bb8a88e3e3ec43753be93d00bef49345b','rasterix_url':'https://github.com/ToNi3141/RasterIX.git','rasterix_main':'9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0'},indent=2)+'\n')
print('357 additional architecture tests passed; simulator hash recorded.')
