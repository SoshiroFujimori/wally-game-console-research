from pathlib import Path
import os,subprocess,concurrent.futures,shutil,json
r=Path('/path/to/research/experiments/fifo-study-20261008');w=r/'latest';ref=r/'reference-extended/work'
env=os.environ.copy();env['WALLY']=str(w);env['RISCV']='/opt/riscv';env['PATH']='/opt/riscv/bin:'+env['PATH']
elfs=list(ref.glob('rv*i_m/*/src/*.S/ref/ref.elf'));assert len(elfs)==357,len(elfs)
def convert(elf):
    sig=elf.parent/'Reference-sail_c_simulator.signature';assert sig.stat().st_size>0
    subprocess.run(['python3',str(w/'bin/elf2hex'),str(elf),str(elf)+'.memfile'],env=env,check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['bash',str(w/'bin/extractFunctionRadix.sh'),str(elf)+'.objdump'],env=env,check=True,stdout=subprocess.DEVNULL)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(convert,elfs))
base=w/'tests/riscof/work/riscv-arch-test/rv64i_m'
for rd in sorted(ref.glob('rv*i_m')):
    for child in rd.iterdir():
        assert child.is_dir() and child.name in ('M','A','C','D','D_Zcd','F'),child
        shutil.copytree(child,base/child.name,dirs_exist_ok=True)
for suite in ('arch64m','arch64a_amo','arch64c','arch64f','arch64d'):
    p=r/'logs'/('wally-'+suite+'.log');p.rename(p.with_suffix('.missing-reference.log'))
p=r/'extended-cpu-tests.json';p.rename(r/'extended-cpu-tests-missing-reference.json')
print('Reference memory and signature files ready:',len(elfs),flush=True)
result=subprocess.run(['python3',str(r/'scripts/extended-cpu-tests.py')],env=env)
raise SystemExit(result.returncode)
