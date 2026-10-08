from pathlib import Path
import subprocess,json,hashlib,datetime,re
r=Path('/path/to/wally-game-console')
o=Path('/path/to/research/experiments/fifo-study-20261008')
def cmd(args):return subprocess.check_output(args,text=True).strip()
result={'updated_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'main_head':cmd(['git','-C',str(r),'rev-parse','HEAD']),'merge_head':cmd(['git','-C',str(r),'rev-parse','MERGE_HEAD']),'upstream_revision':cmd(['git','-C',str(r),'rev-parse','upstream/main']),'rasterix_revision':cmd(['git','-C',str(r/'addins/rasterix'),'rev-parse','HEAD']),'rasterix_status':cmd(['git','-C',str(r/'addins/rasterix'),'status','--porcelain']),'submodules':cmd(['git','-C',str(r),'submodule','status','--recursive']),'versions':{}}
for key,args in [('native_verilator',['/usr/local/bin/verilator','--version']),('wally_verilator',['/opt/riscv/bin/verilator','--version']),('riscv_gcc',['/opt/riscv/bin/riscv64-unknown-elf-gcc','--version']),('linux_gcc',['/opt/riscv/buildroot/output/host/bin/riscv64-buildroot-linux-gnu-gcc','--version'])]:
    result['versions'][key]=cmd(args).splitlines()[0]
for kind in ('latest','fifo16','fifo512','mailbox'):
    tree=o/'latest' if kind=='latest' else o/'variants'/kind
    files=['fpga/src/rasterix_apb.sv','fpga/src/rasterix.sv','fpga/generator/wally.tcl','fpga/generator/axiscdc.tcl']
    for p in ['fpga/src/command_mailbox.sv','fpga/constraints/command_mailbox.xdc','fpga/generator/axiscommand.tcl']:
        if (tree/p).exists():files.append(p)
    result[kind]={p:hashlib.sha256((tree/p).read_bytes()).hexdigest() for p in files}
(o/'provenance.json').write_text(json.dumps(result,indent=2)+'\n')
summary={'rasterix_unit_tests':50,'cvw_rv64i_tests':50,'cvw_targeted_memory_tests':3,'cvw_peripheral_tests':5,'apb_unit':'APB_PASS','display_unit':'DISPLAY_PASS'}
for mode in ('fifo16','fifo512','mailbox'):
    text=(o/'logs'/('channel-'+mode+'.log')).read_text()
    summary[mode]=re.findall(r'CHANNEL_(?:PASS|SEGMENT).*',text)
assert all('CHANNEL_PASS' in summary[k][-1] for k in ('fifo16','fifo512','mailbox'))
(o/'simulation-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary))
