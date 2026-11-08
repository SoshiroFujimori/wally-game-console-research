"""Reopen the active capture input through the local OBS API, without UI control."""
import argparse
from contextlib import closing
import datetime
import json
from pathlib import Path
import time

import obs_client as obs


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--config', type=Path, required=True,
                    help='Private local obs-websocket config.json')
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
assert not args.output.exists(), 'Keep each trial in a separate output file'
record = {'started_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'input_disabled_seconds': 3, 'settle_seconds': 3,
          'desktop_input_used': False}
with closing(obs.connect(args.config)) as ws:
    for kind in ('GetRecordStatus', 'GetStreamStatus', 'GetVirtualCamStatus'):
        assert not obs.request(ws, kind)['outputActive'], 'An OBS output is active'
    assert not obs.request(ws, 'GetStudioModeEnabled')['studioModeEnabled'], \
        'Disable Studio Mode before running this capture test'
    scene = obs.request(ws, 'GetCurrentProgramScene')['sceneName']
    items = [item for item in obs.request(ws, 'GetSceneItemList',
             {'sceneName': scene})['sceneItems'] if item['sceneItemEnabled']]
    assert len(items) == 1 and items[0]['inputKind'] == 'dshow_input', \
        'The scene must contain only one enabled capture input'
    setting = obs.request(ws, 'GetInputSettings',
                          {'inputName': items[0]['sourceName']})['inputSettings']
    assert setting.get('deactivate_when_not_showing') is True, \
        'Configure OBS to deactivate the input when it is not visible'
    selection = {'sceneName': scene, 'sceneItemId': items[0]['sceneItemId']}
    try:
        obs.request(ws, 'SetSceneItemEnabled', dict(selection, sceneItemEnabled=False))
        time.sleep(3)
    finally:
        obs.request(ws, 'SetSceneItemEnabled', dict(selection, sceneItemEnabled=True))
    time.sleep(3)
    assert obs.request(ws, 'GetSceneItemEnabled', selection)['sceneItemEnabled']
record['finished_utc'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
record['input_reenabled'] = True
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print('Capture input reopened. This is not a video-validation result.')
