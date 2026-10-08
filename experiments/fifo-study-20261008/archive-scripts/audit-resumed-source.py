from pathlib import Path
import hashlib,json,subprocess,datetime
root=Path('/path/to/research/experiments/fifo-study-20261008')
repo=Path('/path/to/wally-game-console')
fresh=json.loads((root/'fresh-product-source.json').read_text())
old=json.loads((root/'latest-source-v3.json').read_text())
files=fresh['files']
changed=[name for name,sha in files.items() if hashlib.sha256((repo/name).read_bytes()).hexdigest()!=sha]
assert not changed,changed
common=set(files)&set(old['files'])
mismatches=[name for name in common if files[name]!=old['files'][name]]
assert not mismatches,mismatches
submodules=[]
for name,sha in fresh['submodules'].items():
    head=subprocess.check_output(['git','-C',str(repo/name),'rev-parse','HEAD'],text=True).strip()
    assert head==sha,(name,head,sha)
    status=subprocess.check_output(['git','-C',str(repo/name),'status','--porcelain'],text=True).strip()
    submodules.append({'name':name,'commit':head,'dirty':bool(status)})
assert not [x for x in submodules if x['name']=='addins/rasterix' and x['dirty']]
assert not subprocess.check_output(['git','-C',str(repo),'ls-files','-u'],text=True).strip()
worktree=subprocess.check_output(['git','-C',str(repo),'diff','--name-only'],text=True).splitlines()
assert set(worktree)=={'examples/rasterix/CMakeLists.txt','examples/rasterix/BreakoutRenderer.hpp','fpga/generator/wally.tcl'},worktree
res={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_files_checked':len(files),'same_as_paused_manifest_common_files':len(common),'paused_only_files':sorted(set(old['files'])-set(files)),'fresh_only_files':sorted(set(files)-set(old['files'])),'source_changed_during_build':changed,'submodules':submodules,'worktree_changes':worktree,'unmerged_paths':0,'main_head':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'upstream_merge_head':subprocess.check_output(['git','-C',str(repo),'rev-parse','MERGE_HEAD'],text=True).strip()}
(root/'resumed-source-audit.json').write_text(json.dumps(res,indent=2)+'\n')
print(json.dumps(res,indent=2))
