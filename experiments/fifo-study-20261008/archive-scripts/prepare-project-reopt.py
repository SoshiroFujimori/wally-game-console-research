from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
base=(r/'scripts/postopt-checkpoint.tcl').read_text()
pre='''set project [lindex $argv 0]
set out [lindex $argv 1]
file mkdir $out
open_project $project
create_run reopt_impl -parent_run synth_1 -flow [get_property FLOW [get_runs impl_1]] -constrset constrs_1
set run [get_runs reopt_impl]
set_property STEPS.OPT_DESIGN.ARGS.DIRECTIVE Explore $run
set_property STEPS.PLACE_DESIGN.ARGS.DIRECTIVE WLDrivenBlockPlacement $run
set_property STEPS.PHYS_OPT_DESIGN.IS_ENABLED true $run
set_property STEPS.PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore $run
set_property STEPS.ROUTE_DESIGN.ARGS.DIRECTIVE Explore $run
set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.IS_ENABLED true $run
set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore $run
launch_runs reopt_impl -to_step route_design -jobs 8
wait_on_run reopt_impl
puts "IMPLEMENTATION_STATUS=[get_property STATUS $run]"
if {[get_property PROGRESS $run] != "100%"} {error "Implementation failed"}
open_run reopt_impl
'''
base=base[base.index('phys_opt_design'):]
(r/'scripts/project-reopt.tcl').write_text(pre+base)
