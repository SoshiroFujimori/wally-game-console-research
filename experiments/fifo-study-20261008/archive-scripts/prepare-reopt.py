from pathlib import Path
import os,signal,json,datetime
r=Path('/path/to/research/experiments/fifo-study-20261008')
pid=663925
proc=Path(f'/proc/{pid}')
if proc.exists():
 cmd=(proc/'cmdline').read_bytes().replace(b'\0',b' ').decode()
 assert '/home/researcher/AMD/2025.2/Vivado/bin/unwrapped/lnx64.o/vivado ' in cmd and '-source scripts/place-extratiming.tcl ' in cmd and 'latest/qualification-extratiming' in cmd,cmd
 info={'pid':pid,'start_ticks':(proc/'stat').read_text().split()[21],'cmd':cmd,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reason':'ExtraTimingOpt routing remained congested (82152 overlapping nodes); switching effort to synthesis-netlist optimization and WLDriven placement. No timing-failing bitstream is accepted.'}
 (r/'logs/extratiming-cancellation.json').write_text(json.dumps(info,indent=2)+'\n')
 os.kill(pid,signal.SIGTERM)
 print('Stopped only verified task-owned Vivado process',pid)
s=(r/'scripts/place-extratiming.tcl').read_text().replace('place_design -directive ExtraTimingOpt','opt_design -directive Explore\nplace_design -directive WLDrivenBlockPlacement').replace('route_design -directive AggressiveExplore','route_design -directive Explore')
(r/'scripts/place-reopt.tcl').write_text(s)
assert (r/'latest/fpga/generator/WallyFPGA.runs/synth_1/fpgaTop.dcp').is_file()
