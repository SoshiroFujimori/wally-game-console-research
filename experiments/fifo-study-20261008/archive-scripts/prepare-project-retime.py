from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/project-reopt.tcl').read_text().replace('reopt_impl','retime_impl').replace('set_property STEPS.OPT_DESIGN.ARGS.DIRECTIVE Explore $run','set_property STEPS.OPT_DESIGN.ARGS.DIRECTIVE Default $run').replace('set_property STEPS.PHYS_OPT_DESIGN.ARGS.DIRECTIVE AggressiveExplore $run','set_property STEPS.PHYS_OPT_DESIGN.ARGS.DIRECTIVE AlternateFlowWithRetiming $run')
(r/'scripts/project-retime.tcl').write_text(s)
