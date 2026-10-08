from pathlib import Path
import datetime,json,hashlib,subprocess
root=Path('/path/to/research/experiments/fifo-study-20261008')
q=root/'latest/qualification-synth-retime/qualification.json'
data=json.loads(q.read_text())
boot=json.loads((root/'resumed-product-boot-result.json').read_text())
smoke=json.loads((root/'board-v2/latest/smoke.json').read_text())
continuous=json.loads((root/'board-v2/latest/continuous-resumed.json').read_text())
assert data['sha256']==boot['sha256'] and smoke['passed'] and continuous['passed']
data['board_test']={'linux_boot_passed':True,'boot_evidence':'resumed-product-boot-result.json','drawing_check':smoke,'continuous_game':continuous,'hdmi_video':'Windows OBS source screenshot is Video Format Not Supported. No live HDMI game validation.','rechecked_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
q.write_text(json.dumps(data,indent=2)+'\n')
paths=['/path/to/wally-game-console','/path/to/research/experiments/fifo-study-20261008','/home/researcher/AMD/2025.2/Vivado','/opt/riscv','/usr/bin/python3']
deps=[]
for path in paths:
    p=Path(path).resolve()
    mount=json.loads(subprocess.check_output(['findmnt','--json','-T',str(p),'-o','SOURCE,TARGET,FSTYPE,OPTIONS'],text=True))
    deps.append({'configured_path':path,'resolved_path':str(p),'mount':mount})
(root/'resumed-runtime-dependencies.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'dependencies':deps,'scope':'Primary source, experiment output, Vivado, RISC-V runtime/tools, host Python; read-only inventory. No claim about unrelated jobs.'},indent=2)+'\n')
print('Updated normal product qualification; wrote runtime dependency inventory.')
