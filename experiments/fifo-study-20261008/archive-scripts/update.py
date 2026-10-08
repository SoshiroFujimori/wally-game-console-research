from pathlib import Path
import re, subprocess, shutil, json, hashlib
r=Path('/path/to/wally-game-console')
o=Path('/path/to/research/experiments/fifo-study-20261008')
p=r/'src/lsu/lsu.sv'
s=p.read_text()
s,n=re.subn(r'<<<<<<< HEAD\n.*?=======\n(.*?)>>>>>>> upstream/main\n',lambda m:m[1],s,flags=re.S)
assert n==1
p.write_text(s)
p=r/'src/uncore/uncore.sv'
s=p.read_text()
s,n=re.subn(r'<<<<<<< HEAD\n.*?=======\n(.*?)>>>>>>> upstream/main\n',lambda m:m[1].replace('logic                        HSELNoneD;','logic                        HSELNoneD, HSELEXTIO, HSELEXTIOD;'),s,flags=re.S)
assert n==1
p.write_text(s)
subprocess.run(['git','-C',str(r),'add','src/lsu/lsu.sv','src/uncore/uncore.sv'],check=True)
bit=r/'fpga/generator/WallyFPGA.runs/impl_1/fpgaTop.bit'
shutil.copy2(bit,o/'baseline/old-product.bit')
(o/'baseline/bitstream.sha256').write_text(hashlib.sha256(bit.read_bytes()).hexdigest()+'\n')
subprocess.run(['git','-C',str(r/'addins/rasterix'),'checkout','--detach','9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0'],check=True)
subprocess.run(['git','-C',str(r),'submodule','update','--init','--recursive'],check=True)
# The superproject update restores the pinned RasterIX, so explicitly select latest last.
subprocess.run(['git','-C',str(r/'addins/rasterix'),'checkout','--detach','9269a01c9bd4c3342bfa70ef8e3cdd751c15c6d0'],check=True)
subprocess.run(['git','-C',str(r/'addins/rasterix'),'submodule','update','--init','--recursive'],check=True)
subprocess.run(['git','-C',str(r),'add','addins/rasterix'],check=True)
print('MERGE_CONFLICTS_RESOLVED_AND_RASTERIX_UPDATED')
