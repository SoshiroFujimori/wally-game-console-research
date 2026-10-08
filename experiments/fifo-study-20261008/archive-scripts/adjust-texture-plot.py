from pathlib import Path
p=Path('/path/to/research/experiments/fifo-study-20261008/scripts/plot-texture-mismatch.py')
s=p.read_text().replace("figsize=(10,3.8),layout='constrained'","figsize=(10,4.7)").replace('for ax,v,t in zip','fig.subplots_adjust(left=.07,right=.99,bottom=.22,top=.82,wspace=.28)\nfor ax,v,t in zip')
p.write_text(s)
