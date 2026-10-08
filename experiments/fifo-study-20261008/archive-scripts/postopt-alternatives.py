from pathlib import Path
import subprocess,json
r=Path('/path/to/research/experiments/fifo-study-20261008')
base=r/'latest/qualification-wldriven/routed.dcp'
template=(r/'scripts/postopt-checkpoint.tcl').read_text()
results=[]
for directive in ['AlternateReplication','AggressiveFanoutOpt','ExploreWithAggressiveHoldFix']:
 out=r/'latest'/('qualification-'+directive.lower())
 script=r/'scripts'/('postopt-'+directive.lower()+'.tcl')
 script.write_text(template.replace('phys_opt_design -directive AggressiveExplore','phys_opt_design -directive '+directive))
 log=r/'logs'/('postopt-'+directive.lower()+'.log')
 with log.open('w') as f:
  p=subprocess.run(['bash','-c','source /home/researcher/AMD/2025.2/Vivado/settings64.sh && vivado -mode batch -nojournal -nolog -source "$1" -tclargs "$2" "$3"','fifo-postopt',str(script),str(base),str(out)],cwd=r,stdout=f,stderr=subprocess.STDOUT)
 results.append({'directive':directive,'exit':p.returncode,'directory':str(out)})
 (r/'logs/postopt-alternatives.json').write_text(json.dumps(results,indent=2)+'\n')
 print(results[-1],flush=True)
 if p.returncode==0 and (out/'fpgaTop.bit').is_file():break
