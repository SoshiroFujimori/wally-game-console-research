from pathlib import Path
p=Path('/path/to/research/experiments/fifo-study-20261008/scripts')
s=(p/'postopt.tcl').read_text().replace('set tree [lindex $argv 0]','set checkpoint [lindex $argv 0]').replace('open_project $tree/fpga/generator/WallyFPGA.xpr\nopen_run impl_1','open_checkpoint $checkpoint').replace('close_project\n','')
(p/'postopt-checkpoint.tcl').write_text(s)
