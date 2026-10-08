set checkpoint [lindex $argv 0]
set out [lindex $argv 1]
file mkdir $out
open_checkpoint $checkpoint
set selectedPins [get_pins -hierarchical -filter {NAME =~ *tex0ComputeRecip*newtonIteration/i__carry__1_i_4__1/I1}]
puts "SELECTED_PINS=$selectedPins"
if {[llength $selectedPins] != 1} {error "Expected one reported critical-path pin"}
route_design -unroute -pins $selectedPins
route_design -pins $selectedPins -delay
phys_opt_design -directive AggressiveExplore
write_checkpoint $out/postroute_aggressive.dcp
report_timing_summary -delay_type min_max -report_unconstrained -file $out/timing_summary.rpt
report_drc -file $out/drc.rpt
report_route_status -file $out/route_status.rpt
report_bus_skew -warn_on_violation -file $out/bus_skew.rpt
report_cdc -details -file $out/cdc.rpt
report_clocks -file $out/clocks.rpt
check_timing -verbose -file $out/check_timing.rpt
report_utilization -file $out/utilization.rpt
report_utilization -hierarchical -file $out/utilization_hierarchical.rpt
report_exceptions -file $out/exceptions.rpt
set wns [get_property SLACK [get_timing_paths -delay_type max -max_paths 1]]
set whs [get_property SLACK [get_timing_paths -delay_type min -max_paths 1]]
puts "QUALIFY_WNS=$wns QUALIFY_WHS=$whs"
if {$wns<0 || $whs<0} {error "Timing has not closed"}
if {[llength [get_drc_violations -quiet -filter {SEVERITY == Error}]]} {error "DRC errors remain"}
write_bitstream $out/fpgaTop.bit
puts "TIMING_DRC_QUALIFIED"
exit
