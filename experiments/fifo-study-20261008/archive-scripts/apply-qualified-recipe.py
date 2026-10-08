from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
old='''if {$rasterixEnabled} {
    # Spread the renderer and CPU logic to reduce routing congestion.
    set_property STEPS.PLACE_DESIGN.ARGS.DIRECTIVE AltSpreadLogic_high [get_runs impl_1]
}

if {$board=="nexysvideo"} {
    set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.IS_ENABLED true [get_runs impl_1]
    set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.ARGS.DIRECTIVE Explore [get_runs impl_1]
}'''
new='''if {$board=="nexysvideo"} {
    set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.IS_ENABLED true [get_runs impl_1]
    set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.ARGS.DIRECTIVE Explore [get_runs impl_1]
}

if {$rasterixEnabled} {
    # Optimize the renderer's DSP and logic placement for the 100 MHz clock.
    set_property STEPS.PLACE_DESIGN.ARGS.DIRECTIVE WLDrivenBlockPlacement [get_runs impl_1]
    set_property STEPS.PHYS_OPT_DESIGN.IS_ENABLED true [get_runs impl_1]
    set_property STEPS.PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore [get_runs impl_1]
    set_property STEPS.ROUTE_DESIGN.ARGS.DIRECTIVE Explore [get_runs impl_1]
    set_property STEPS.POST_ROUTE_PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore [get_runs impl_1]
}'''
for root in (Path('/path/to/wally-game-console'),r/'latest'):
    p=root/'fpga/generator/wally.tcl';s=p.read_text();assert s.count(old)==1
    s=s.replace(old,new)
    needle='launch_runs synth_1 -jobs 16';assert s.count(needle)==1
    s=s.replace(needle,'''if {$rasterixEnabled} {
    # Allow register retiming in the renderer's arithmetic datapaths.
    set_property STEPS.SYNTH_DESIGN.ARGS.RETIMING true [get_runs synth_1]
}

'''+needle)
    p.write_text(s)
print('Recorded the qualified synthesis and implementation settings in the product generator.')
