from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/postopt-checkpoint.tcl').read_text().replace('phys_opt_design -directive AggressiveExplore','route_design -tns_cleanup\nphys_opt_design -directive AggressiveExplore')
(r/'scripts/route-cleanup.tcl').write_text(s)
