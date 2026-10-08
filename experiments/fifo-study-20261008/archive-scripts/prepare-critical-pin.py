from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/postopt-checkpoint.tcl').read_text()
s=s.replace('phys_opt_design -directive AggressiveExplore', '''set selectedPins [get_pins -hierarchical -filter {NAME =~ *tex0ComputeRecip*newtonIteration/i__carry__1_i_4__1/I1}]
puts "SELECTED_PINS=$selectedPins"
if {[llength $selectedPins] != 1} {error "Expected one reported critical-path pin"}
route_design -unroute -pins $selectedPins
route_design -pins $selectedPins -delay
phys_opt_design -directive AggressiveExplore''')
(r/'scripts/route-critical-pin.tcl').write_text(s)
