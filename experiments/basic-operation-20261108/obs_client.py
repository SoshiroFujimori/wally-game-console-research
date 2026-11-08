"""Minimal local OBS WebSocket client; credentials are never logged."""
import base64
import hashlib
import json
from pathlib import Path
import uuid

import websocket


def connect(config_path):
    config = json.loads(Path(config_path).read_text(encoding='utf-8'))
    ws = websocket.create_connection(
        f"ws://127.0.0.1:{int(config['server_port'])}", timeout=15)
    try:
        hello = json.loads(ws.recv())['d']
        identify = {'rpcVersion': 1, 'eventSubscriptions': 0}
        if 'authentication' in hello:
            auth = hello['authentication']
            secret = base64.b64encode(hashlib.sha256(
                (config['server_password'] + auth['salt']).encode()).digest()).decode()
            identify['authentication'] = base64.b64encode(hashlib.sha256(
                (secret + auth['challenge']).encode()).digest()).decode()
        ws.send(json.dumps({'op': 1, 'd': identify}))
        assert json.loads(ws.recv())['op'] == 2, 'OBS identification failed'
        return ws
    except BaseException:
        ws.close()
        raise


def request(ws, name, data=None):
    request_id = str(uuid.uuid4())
    ws.send(json.dumps({'op': 6, 'd': {
        'requestType': name, 'requestId': request_id, 'requestData': data or {}}}))
    while True:
        reply = json.loads(ws.recv())
        if reply['op'] == 7 and reply['d']['requestId'] == request_id:
            result = reply['d']
            if not result['requestStatus']['result']:
                raise RuntimeError(str(result['requestStatus']))
            return result.get('responseData', {})
