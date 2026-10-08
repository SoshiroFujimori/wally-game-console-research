from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/postopt-checkpoint.tcl').read_text()
s=s.replace('phys_opt_design -directive AggressiveExplore', '''set marginClock [get_clocks clk_pll_i]
set originalMargin [get_property SETUP_UNCERTAINTY $marginClock]
puts "ORIGINAL_SETUP_UNCERTAINTY=$originalMargin"
set_clock_uncertainty -setup 0.150 $marginClock
phys_opt_design -directive AggressiveExplore
if {$originalMargin == ""} {set originalMargin 0.0}
set_clock_uncertainty -setup $originalMargin $marginClock
puts "RESTORED_SETUP_UNCERTAINTY=[get_property SETUP_UNCERTAINTY $marginClock]"''')
(r/'scripts/postopt-temporary-margin.tcl').write_text(s)
