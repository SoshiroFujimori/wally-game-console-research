set repo [lindex $argv 0]
set out [lindex $argv 1]
file mkdir $out
open_project $repo/fpga/generator/WallyFPGA.xpr
set run [get_runs impl_1]
set status [get_property STATUS $run]
puts "IMPLEMENTATION_STATUS=$status"
if {![string match "write_bitstream Complete*" $status]} {error "Bitstream generation did not complete"}
open_run impl_1
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
file copy [file join [get_property DIRECTORY $run] fpgaTop.bit] $out/fpgaTop.bit
puts "TIMING_DRC_QUALIFIED"
close_project
exit
