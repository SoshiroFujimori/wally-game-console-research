set project [lindex $argv 0]
set out [lindex $argv 1]
file mkdir $out
open_project $project
create_run retime_impl -parent_run synth_1 -flow [get_property FLOW [get_runs impl_1]] -constrset constrs_1
set run [get_runs retime_impl]
set_property STEPS.OPT_DESIGN.ARGS.DIRECTIVE Default $run
set_property STEPS.PLACE_DESIGN.ARGS.DIRECTIVE WLDrivenBlockPlacement $run
set_property STEPS.PHYS_OPT_DESIGN.IS_ENABLED true $run
set_property STEPS.PHYS_OPT_DESIGN.ARGS.DIRECTIVE AlternateFlowWithRetiming $run
set_property STEPS.ROUTE_DESIGN.ARGS.DIRECTIVE Explore $run
set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.IS_ENABLED true $run
set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore $run
launch_runs retime_impl -to_step route_design -jobs 8
wait_on_run retime_impl
puts "IMPLEMENTATION_STATUS=[get_property STATUS $run]"
if {[get_property PROGRESS $run] != "100%"} {error "Implementation failed"}
open_run retime_impl
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
