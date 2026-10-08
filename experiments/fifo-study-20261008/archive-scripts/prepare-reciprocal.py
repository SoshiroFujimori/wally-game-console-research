from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/place-netdelay.tcl').read_text()
s=s.replace('open_checkpoint $checkpoint\nplace_design -directive ExtraNetDelay_high', '''open_checkpoint $checkpoint
set reciprocal [get_cells -hier -filter {NAME =~ */tex0ComputeRecip}]
if {[llength $reciprocal] != 1} {error "Expected one reciprocal unit"}
create_pblock rasterix_reciprocal
resize_pblock [get_pblocks rasterix_reciprocal] -add {CLOCKREGION_X0Y0:CLOCKREGION_X0Y0}
add_cells_to_pblock [get_pblocks rasterix_reciprocal] $reciprocal
write_checkpoint $out/floorplanned_opt.dcp
place_design -directive WLDrivenBlockPlacement''')
(r/'scripts/place-reciprocal.tcl').write_text(s)
