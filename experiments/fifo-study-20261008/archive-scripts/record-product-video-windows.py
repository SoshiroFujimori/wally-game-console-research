from pathlib import Path
from contextlib import closing
import datetime,json,subprocess,sys
root=Path.home()/'.codex/tmp/rasterix-integration-20260909'
sys.path.insert(0,str(root));import obs
out=Path(r'\\wsl.localhost\Ubuntu\home\researcher\nexys-video-tests\fifo-study-20261008\display-final')
label='fifo-study-normal-product-40s-20261008'
with closing(obs.connect()) as ws:
    assert not obs.request(ws,'GetRecordStatus')['outputActive']
    assert not obs.request(ws,'GetStreamStatus')['outputActive']
    assert not obs.request(ws,'GetVirtualCamStatus')['outputActive']
    scene=obs.request(ws,'GetCurrentProgramScene')['sceneName']
    items=obs.request(ws,'GetSceneItemList',{'sceneName':scene})['sceneItems']
    visible=[i for i in items if i['sceneItemEnabled']]
    assert len(visible)==1 and visible[0]['inputKind']=='dshow_input'
    item=visible[0]['sceneItemId'];original=obs.request(ws,'GetSceneItemTransform',{'sceneName':scene,'sceneItemId':item})['sceneItemTransform']
    keys=('alignment','boundsType','cropBottom','cropLeft','cropRight','cropTop','positionX','positionY','rotation','scaleX','scaleY')
    previous={k:original[k] for k in keys}
    target=dict(previous);target.update({'positionX':240.0,'positionY':0.0,'scaleX':1440.0/original['sourceWidth'],'scaleY':1080.0/original['sourceHeight'],'rotation':0.0,'alignment':5,'boundsType':'OBS_BOUNDS_NONE','cropTop':0,'cropBottom':0,'cropLeft':0,'cropRight':0})
    record={'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'label':label,'previous_transform':previous,'recording_transform':target,'purpose':'Restore native 640x480 game aspect ratio for the recording. The capture source delivers a stretched 1280x720 image.'}
    path=out/'record-scene-v2.json';assert not path.exists();path.write_text(json.dumps(record,indent=2,ensure_ascii=True)+'\n')
    try:
        obs.request(ws,'SetSceneItemTransform',{'sceneName':scene,'sceneItemId':item,'sceneItemTransform':target})
        with (out/'recording-run.log').open('w',encoding='utf-8') as f:
            proc=subprocess.run([sys.executable,str(root/'record.py'),label,'--seconds','40'],stdout=f,stderr=subprocess.STDOUT,timeout=90)
        record['record_exit']=proc.returncode
    finally:
        obs.request(ws,'SetSceneItemTransform',{'sceneName':scene,'sceneItemId':item,'sceneItemTransform':previous})
        restored=obs.request(ws,'GetSceneItemTransform',{'sceneName':scene,'sceneItemId':item})['sceneItemTransform']
        record['restored_transform']={k:restored[k] for k in keys}
        record['finished_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
        path.write_text(json.dumps(record,indent=2,ensure_ascii=True)+'\n')
    assert record['record_exit']==0
    assert record['restored_transform']==previous
    print(json.dumps({'recording_directory':str(root/label),'aspect_restored':True}),flush=True)

