# Reuse physical data only. The current checkpoint remains the logical design.
# AMD UG904, Using Incremental Implementation; UG835, read_checkpoint.
set current [lindex $argv 0]
set reference [lindex $argv 1]
set out [lindex $argv 2]
set_param general.maxThreads 8
file mkdir $out
open_checkpoint $current
read_checkpoint -incremental $reference
report_incremental_reuse -file $out/reuse_before.rpt
place_design
phys_opt_design -directive AggressiveExplore
write_checkpoint $out/placed.dcp
route_design -directive Explore
phys_opt_design -directive AggressiveExplore
write_checkpoint $out/routed.dcp
report_incremental_reuse -file $out/reuse_after.rpt
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
set setup [get_timing_paths -delay_type max -max_paths 1]
set hold [get_timing_paths -delay_type min -max_paths 1]
if {[llength $setup]!=1 || [llength $hold]!=1} {error "Missing timing paths"}
set wns [get_property SLACK $setup]
set whs [get_property SLACK $hold]
puts "QUALIFY_WNS=$wns QUALIFY_WHS=$whs"
if {$wns<0 || $whs<0} {error "Timing has not closed"}
if {[llength [get_drc_violations -quiet -filter {SEVERITY == Error}]]} {error "DRC errors remain"}
write_bitstream $out/fpgaTop.bit
puts "TIMING_DRC_QUALIFIED"
close_design
exit
