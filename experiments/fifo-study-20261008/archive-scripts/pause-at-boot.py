from pathlib import Path
import hashlib,json,subprocess,datetime,os,signal
r=Path('/path/to/research/experiments/fifo-study-20261008');repo=Path('/path/to/wally-game-console')
q=r/'latest/qualification-synth-retime/qualification.json';d=json.loads(q.read_text());boot=json.loads((r/'latest-retimed-product-boot-result.json').read_text())
assert boot['program_exit']==0 and boot['uart_exit']==0 and boot['sha256']==d['sha256']
d['board_test']={'linux_boot_passed':True,'boot_evidence':'latest-retimed-product-boot-result.json','drawing_check':'pending at user-requested pause','continuous_game':'pending at user-requested pause'}
q.write_text(json.dumps(d,indent=2)+'\n')
m=json.loads((r/'latest-source-v2.json').read_text());m['created_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();m['note']='Paused after normal product static qualification and Linux boot. Generator records the qualified recipe; its fresh end-to-end invocation and normal-product drawing check remain to be completed.'
m['files']={p:hashlib.sha256((r/'latest'/p).read_bytes()).hexdigest() for p in m['files']}
(r/'latest-source-v3.json').write_text(json.dumps(m,indent=2)+'\n')
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args],text=True).strip()
state={'paused_utc':m['created_utc'],'reason':'Explicit user request to pause at a verified boundary.','branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),'merge_head':git('rev-parse','MERGE_HEAD'),'unmerged':git('ls-files','-u'),'rasterix_head':subprocess.check_output(['git','-C',str(repo/'addins/rasterix'),'rev-parse','HEAD'],text=True).strip(),'rasterix_status':subprocess.check_output(['git','-C',str(repo/'addins/rasterix'),'status','--porcelain'],text=True).strip(),'normal_bitstream':d,'comparison':'analysis-v2/validation-summary.json','next_steps':['Keep existing valid comparison results; do not rerun the 90-case matrix without a reason.','Restart the local hw_server if needed; program the qualified normal bitstream if the board was reset.','Run scripts/run-game-matrix-v2.py latest to load hash-checked payload-v2 and compare the full framebuffer. No latest smoke has run yet.','Run the normal product game continuously and preserve logs.','Verify the product generator with a fresh build using the recorded qualified settings.','Keep the large-texture parser bug and capture limitation explicit; official RasterIX sources remain unmodified.']}
assert state['branch']=='main' and not state['unmerged'] and not state['rasterix_status']
(r/'PAUSED.json').write_text(json.dumps(state,indent=2)+'\n')
(r/'paused-git-status.txt').write_text(git('status','--short')+'\n')
(r/'paused-working-tree.patch').write_text(subprocess.check_output(['git','-C',str(repo),'diff','--binary'],text=True))
(r/'paused-index.patch').write_text(subprocess.check_output(['git','-C',str(repo),'diff','--cached','--binary'],text=True))
p=Path('/proc/4111')
if p.exists():
    args=[a.decode() for a in (p/'cmdline').read_bytes().split(b'\0') if a]
    assert args==['/home/researcher/AMD/2025.2/Vivado/bin/unwrapped/lnx64.o/hw_server','-s','TCP:127.0.0.1:3121'],args
    os.kill(4111,signal.SIGTERM)
    (r/'hw-server-pause-stop.json').write_text(json.dumps({'pid':4111,'args':args,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reason':'Stop the task-owned idle JTAG server at user-requested pause.'},indent=2)+'\n')
print(json.dumps({'paused_utc':state['paused_utc'],'branch':state['branch'],'head':state['head'],'merge_head':state['merge_head'],'rasterix_clean':not state['rasterix_status'],'normal_boot_passed':True,'committed':False}))
