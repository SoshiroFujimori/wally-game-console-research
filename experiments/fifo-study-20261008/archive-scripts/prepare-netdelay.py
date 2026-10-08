from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/place-extratiming.tcl').read_text().replace('place_design -directive ExtraTimingOpt','place_design -directive ExtraNetDelay_high').replace('route_design -directive AggressiveExplore','route_design -directive Explore')
(r/'scripts/place-netdelay.tcl').write_text(s)
