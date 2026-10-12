"""Bounded native host framing and real current-user IPC checks on Windows."""
import json
import os
from pathlib import Path
import struct
import subprocess
import time
import tempfile

root = Path(__file__).resolve().parents[2]
binary = root / 'build' / 'native'
flags = subprocess.CREATE_NO_WINDOW
env = dict(os.environ, MATERIAL_COMPANION_EXTENSION_ID='a' * 32)

def call(payload, origin='chrome-extension://' + 'a' * 32 + '/'):
    return subprocess.run([str(binary / 'companion-host.exe'), origin], input=payload,
                          capture_output=True, env=env, creationflags=flags, timeout=12)

def frame(data):
    return struct.pack('<I', len(data)) + data

assert call(b'', 'chrome-extension://' + 'b' * 32 + '/').returncode == 2
assert call(b'\x01\x00').returncode == 3
assert call(struct.pack('<I', 262145)).returncode == 3
assert call(frame(b'{"method":"approve","request":{},"version":1}')).returncode == 6
assert call(frame(b'{"method":"query","request":{},"version":1,"version":1}')).returncode == 6

temporary_store = tempfile.TemporaryDirectory(prefix='companion-ipc-test-')
service = subprocess.Popen([str(binary / 'companion-service.exe'), '--data-root', temporary_store.name], env=env,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           creationflags=flags)
try:
    time.sleep(0.25)
    assert service.poll() is None, 'service startup unavailable or endpoint already owned'
    duplicate = subprocess.run([str(binary / 'companion-service.exe'), '--data-root', temporary_store.name], env=env, creationflags=flags, capture_output=True, timeout=5)
    assert duplicate.returncode != 0
    assert service.poll() is None
    data = json.dumps({'method': 'query', 'request': {'projectId': 'fixture', 'requestId': 'absent'},
                       'version': 1}, sort_keys=True, separators=(',', ':')).encode()
    answer = call(frame(data))
    assert answer.returncode == 0, answer.returncode
    size = struct.unpack('<I', answer.stdout[:4])[0]
    assert size == len(answer.stdout) - 4
    assert json.loads(answer.stdout[4:]) == {'state': 'unknown', 'version': 1}
    invalid_submit = b'{"method":"submit","request":{},"version":1}'
    answer = call(frame(invalid_submit))
    assert json.loads(answer.stdout[4:])['state'] == 'rejected'
    print('PASS 10 native host and live IPC assertions')
finally:
    service.terminate()
    service.wait(timeout=5)
    temporary_store.cleanup()
