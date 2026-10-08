from pathlib import Path
r=Path('/path/to/research/experiments/fifo-study-20261008')
s=(r/'scripts/postopt-checkpoint.tcl').read_text()
print(s)
