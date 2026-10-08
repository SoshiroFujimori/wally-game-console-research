from pathlib import Path
from contextlib import closing
import sys,json,base64,datetime
sys.path.insert(0,str(Path.home()/'.codex/tmp/rasterix-integration-20260909'))
from obs import connect,request
out=Path(r'\\wsl.localhost\Ubuntu\home\researcher\nexys-video-tests\fifo-study-20261008\display-resumed')
out.mkdir(exist_ok=True)
with closing(connect()) as ws:
    data={name:request(ws,name) for name in ('GetVersion','GetVideoSettings','GetRecordStatus','GetStreamStatus','GetCurrentProgramScene','GetInputList')}
    sources=[i for i in data['GetInputList']['inputs'] if i['inputKind']=='dshow_input']
    assert len(sources)==1
    source=sources[0]['inputName']
    data['capture']=request(ws,'GetInputSettings',{'inputName':source})
    data['utc']=datetime.datetime.now(datetime.timezone.utc).isoformat()
    (out/'state.json').write_text(json.dumps(data,indent=2,ensure_ascii=True)+'\n')
    capture=request(ws,'GetSourceScreenshot',{'sourceName':source,'imageFormat':'png'})
    (out/'normal-product-frame.png').write_bytes(base64.b64decode(capture['imageData'].split(',',1)[1]))
    print(json.dumps({'recording':data['GetRecordStatus']['outputActive'],'streaming':data['GetStreamStatus']['outputActive'],'source':source,'screenshot':str(out/'normal-product-frame.png'),'width':data['GetVideoSettings']['baseWidth'],'height':data['GetVideoSettings']['baseHeight']}))
