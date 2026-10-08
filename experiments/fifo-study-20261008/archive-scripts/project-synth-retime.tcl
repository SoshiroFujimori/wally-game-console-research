set_param general.maxThreads 8
set project [lindex $argv 0]
set out [lindex $argv 1]
file mkdir $out
open_project $project
create_run synth_retimed -flow [get_property FLOW [get_runs synth_1]] -constrset constrs_1
set sr [get_runs synth_retimed]
set_property STEPS.SYNTH_DESIGN.ARGS.RETIMING true $sr
launch_runs synth_retimed -jobs 8
wait_on_run synth_retimed
puts "SYNTHESIS_STATUS=[get_property STATUS $sr]"
if {[get_property PROGRESS $sr] != "100%"} {error "Retimed synthesis failed"}
create_run impl_retimed -parent_run synth_retimed -flow [get_property FLOW [get_runs impl_1]] -constrset constrs_1
set run [get_runs impl_retimed]
set_property STEPS.PLACE_DESIGN.ARGS.DIRECTIVE WLDrivenBlockPlacement $run
set_property STEPS.PHYS_OPT_DESIGN.IS_ENABLED true $run
set_property STEPS.PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore $run
set_property STEPS.ROUTE_DESIGN.ARGS.DIRECTIVE Explore $run
launch_runs impl_retimed -to_step route_design -jobs 8
wait_on_run impl_retimed
puts "IMPLEMENTATION_STATUS=[get_property STATUS $run]"
set dcp [file join [get_property DIRECTORY $run] fpgaTop_routed.dcp]
if {![file exists $dcp]} {error "Retimed routing failed"}
close_project
open_checkpoint $dcp
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
exit
