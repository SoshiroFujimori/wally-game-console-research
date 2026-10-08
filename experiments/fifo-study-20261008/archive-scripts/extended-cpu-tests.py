from pathlib import Path
import os,subprocess,json,datetime,re,concurrent.futures,signal
r=Path('/path/to/research/experiments/fifo-study-20261008')
env=os.environ.copy();env['WALLY']=str(r/'latest');env['RISCV']='/opt/riscv';env['PATH']='/opt/riscv/bin:'+env['PATH']
def run(suite):
    log=r/'logs'/('wally-'+suite+'.log')
    assert not log.exists(),log
    with log.open('w') as f:
        p=subprocess.Popen(['python3',str(r/'latest/bin/wsim'),'rv64gc',suite,'--sim','verilator'],cwd=r/'latest',env=env,stdout=f,stderr=subprocess.STDOUT,start_new_session=True)
        try: rc=p.wait(timeout=900)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid,signal.SIGTERM);p.wait(timeout=20);rc=124
    s=log.read_text(errors='replace')
    d=dict(suite=suite,exit=rc,passed=rc==0 and 'SUCCESS! All tests ran without failures.' in s,tests=s.count('succeeded.  Brilliant!!!'),log=str(log))
    print(json.dumps(d),flush=True);return d
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
    records=list(ex.map(run,['arch64m','arch64a_amo','arch64c','arch64f','arch64d']))
(r/'extended-cpu-tests.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'configuration':'rv64gc','simulator':'Verilator 5.036','tests':records},indent=2)+'\n')
raise SystemExit(0 if all(x['passed'] for x in records) else 1)
