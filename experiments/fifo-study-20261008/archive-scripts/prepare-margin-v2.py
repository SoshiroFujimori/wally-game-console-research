from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/postopt-checkpoint.tcl').read_text()
s=s.replace('phys_opt_design -directive AggressiveExplore', '''write_xdc -force $out/input_constraints.xdc
set fh [open $out/input_constraints.xdc r]
set inputConstraints [read $fh]
close $fh
if {[regexp {set_clock_uncertainty} $inputConstraints]} {error "Existing explicit clock uncertainty requires review"}
set marginClock [get_clocks clk_pll_i]
set originalSlack [get_property SLACK [get_timing_paths -delay_type max -max_paths 1]]
set_clock_uncertainty -setup 0.0 $marginClock
set zeroSlack [get_property SLACK [get_timing_paths -delay_type max -max_paths 1]]
puts "CHECK_ORIGINAL_SLACK=$originalSlack CHECK_ZERO_UNCERTAINTY_SLACK=$zeroSlack"
if {abs($zeroSlack-$originalSlack)>0.0001} {error "Zero user uncertainty changes original timing"}
set_clock_uncertainty -setup 0.150 $marginClock
phys_opt_design -directive AggressiveExplore
set_clock_uncertainty -setup 0.0 $marginClock
puts "RESTORED_ORIGINAL_ZERO_USER_UNCERTAINTY"''')
(r/'scripts/postopt-temporary-margin-v2.tcl').write_text(s)
