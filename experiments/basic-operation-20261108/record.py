"""Record only the FPGA capture input and run a bounded game trial over UART.

Output contains local paths/settings: sanitize selected files before publication.
Requires websocket-client and pyserial. No desktop mouse/keyboard actions.
"""
from pathlib import Path
from contextlib import closing
import argparse, base64, datetime, json, subprocess, sys, time
import obs_client as obs
p=argparse.ArgumentParser()
p.add_argument('--output',type=Path,required=True)
p.add_argument('--config',type=Path,required=True)
p.add_argument('--port',required=True)
p.add_argument('--seconds',type=int,default=30)
p.add_argument('--source-aspect',choices=['4:3','16:9'],required=True)
a=p.parse_args()
assert 1 <= a.seconds <= 3600
work=Path(__file__).resolve().parent
out=a.output.resolve()
out.mkdir(exist_ok=False)
with closing(obs.connect(a.config)) as ws:
    for kind in ('GetRecordStatus','GetStreamStatus','GetVirtualCamStatus'):
        assert not obs.request(ws,kind)['outputActive']
    scene=obs.request(ws,'GetCurrentProgramScene')['sceneName']
    visible=[i for i in obs.request(ws,'GetSceneItemList',{'sceneName':scene})['sceneItems'] if i['sceneItemEnabled']]
    assert len(visible)==1 and visible[0]['inputKind']=='dshow_input', 'Only the capture source may be recorded'
    item=visible[0]['sceneItemId']; source=visible[0]['sourceName']
    original=obs.request(ws,'GetSceneItemTransform',{'sceneName':scene,'sceneItemId':item})['sceneItemTransform']
    keys=('alignment','boundsType','cropBottom','cropLeft','cropRight','cropTop','positionX','positionY','rotation','scaleX','scaleY')
    previous={k:original[k] for k in keys}
    settings=obs.request(ws,'GetVideoSettings')
    height=settings['baseHeight']; width=height*(4/3 if a.source_aspect=='4:3' else 16/9)
    assert settings['baseWidth'] >= width
    target=dict(previous)
    target.update(positionX=(settings['baseWidth']-width)/2,positionY=0,scaleX=width/original['sourceWidth'],scaleY=height/original['sourceHeight'],rotation=0,alignment=5,boundsType='OBS_BOUNDS_NONE',cropTop=0,cropBottom=0,cropLeft=0,cropRight=0)
    directory=obs.request(ws,'GetRecordDirectory')['recordDirectory']
    inputs=obs.request(ws,'GetInputList')['inputs']
    mutes={i['inputName']:obs.request(ws,'GetInputMute',{'inputName':i['inputName']})['inputMuted'] for i in inputs if i['inputKind'] in ('wasapi_input_capture','wasapi_output_capture')}
    info={'started_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requested_game_seconds':a.seconds,'previous_transform':previous,'recording_transform':target,'previous_directory':directory,'previous_mutes':mutes,'video_settings':settings,'frames':[]}
    recording=False; process=None
    def save_info():
        (out/'recording-private.json').write_text(json.dumps(info,indent=2)+'\n')
    def wait_stopped():
        deadline=time.monotonic()+20
        while obs.request(ws,'GetRecordStatus')['outputActive']:
            if time.monotonic()>=deadline:
                raise TimeoutError('OBS recording did not stop within 20 seconds')
            time.sleep(.2)
    save_info()
    try:
        obs.request(ws,'SetSceneItemTransform',{'sceneName':scene,'sceneItemId':item,'sceneItemTransform':target})
        for name in mutes:
            obs.request(ws,'SetInputMute',{'inputName':name,'inputMuted':True})
        obs.request(ws,'SetRecordDirectory',{'recordDirectory':str(out)})
        obs.request(ws,'StartRecord'); recording=True
        start=time.monotonic(); print('Recording started',flush=True)
        with (out/'uart-harness.log').open('wb') as log:
            process=subprocess.Popen([sys.executable,str(work/'uart.py'),'--port',a.port,'--output',str(out/'game.raw'),'--seconds',str(a.seconds+70),'--command',f'/tmp/fifo-game --demo --seconds {a.seconds}'],stdout=log,stderr=subprocess.STDOUT)
            next_capture=0; ended=None
            while time.monotonic()-start < a.seconds+75:
                elapsed=time.monotonic()-start
                if elapsed>=next_capture:
                    png=obs.request(ws,'GetSourceScreenshot',{'sourceName':source,'imageFormat':'png'})
                    filename=f'frame-{len(info["frames"]):02d}.png'
                    (out/filename).write_bytes(base64.b64decode(png['imageData'].split(',',1)[1]))
                    info['frames'].append({'elapsed':elapsed,'file':filename})
                    next_capture+=5
                if process.poll() is not None:
                    if ended is None: ended=time.monotonic()
                    if time.monotonic()-ended >=2: break
                time.sleep(.25)
            info['uart_exit']=process.wait(timeout=5)
        info['recording']=obs.request(ws,'StopRecord'); recording=False
        wait_stopped()
        info['stats']=obs.request(ws,'GetStats')
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
        if recording:
            info['recording']=obs.request(ws,'StopRecord')
            wait_stopped()
        obs.request(ws,'SetRecordDirectory',{'recordDirectory':directory})
        obs.request(ws,'SetSceneItemTransform',{'sceneName':scene,'sceneItemId':item,'sceneItemTransform':previous})
        for name,mute in mutes.items(): obs.request(ws,'SetInputMute',{'inputName':name,'inputMuted':mute})
        restored=obs.request(ws,'GetSceneItemTransform',{'sceneName':scene,'sceneItemId':item})['sceneItemTransform']
        info['transform_restored']=all(restored[k]==v for k,v in previous.items())
        info['directory_restored']=obs.request(ws,'GetRecordDirectory')['recordDirectory']==directory
        info['mutes_restored']=all(obs.request(ws,'GetInputMute',{'inputName':n})['inputMuted']==v for n,v in mutes.items())
        info['finished_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
        save_info()
    assert info['uart_exit']==0 and info['transform_restored'] and info['directory_restored'] and info['mutes_restored']
    print(json.dumps({k:info[k] for k in ('uart_exit','transform_restored','directory_restored','mutes_restored','recording')}),flush=True)
