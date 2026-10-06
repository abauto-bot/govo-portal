#!/usr/bin/env python3
"""Deploy only the reviewed Bengali public homepage and its four locale assets."""
from pathlib import Path
import os, json, hashlib, shutil, tempfile, datetime, sys
BASE=Path('/home/abu/govo-home-bn-20261006')
LIVE=Path('/var/www/govo-main')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(source,target):
    fd,tmp=tempfile.mkstemp(prefix='.govo-bn-',dir=target.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            f.write(source.read_bytes()); f.flush(); os.fsync(f.fileno())
        os.chmod(tmp,0o644)
        os.replace(tmp,target)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
def main():
    if os.geteuid()!=0: sys.exit('Administrator access required. Run this script with sudo in your VPS terminal.')
    manifest=json.loads((BASE/'manifest.json').read_text())
    for rel,digest in manifest['files'].items():
        if sha(BASE/rel)!=digest: sys.exit('Staged file changed: '+rel)
    if json.loads((BASE/'stage-results.json').read_text())['passed']!=10:sys.exit('Staged tests incomplete')
    if sha(LIVE/'index.html')==manifest['files']['index.html']:
        print('Bengali homepage already installed.'); return
    if sha(LIVE/'index.html')!=manifest['previous_index_sha256']:sys.exit('Live homepage changed; stop for review.')
    for rel,digest in manifest['protected'].items():
        if sha(LIVE/rel)!=digest:sys.exit('Protected logo/style changed; stop for review: '+rel)
    for rel,digest in manifest['files'].items():
        if rel!='index.html' and (LIVE/rel).exists() and sha(LIVE/rel)!=digest:
            sys.exit('Existing asset conflict: '+rel)
    backup=BASE/'backup'
    if sha(backup/'index.html')!=manifest['previous_index_sha256']:sys.exit('Backup mismatch')
    for rel in manifest['files']:
        if rel!='index.html': atomic(BASE/rel,LIVE/rel)
    atomic(BASE/'index.html',LIVE/'index.html')
    if any(sha(LIVE/rel)!=digest for rel,digest in manifest['files'].items()):
        atomic(backup/'index.html',LIVE/'index.html');sys.exit('Verification failed; previous index restored.')
    (BASE/'deployment.json').write_text(json.dumps({'status':'installed','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':manifest['files']},indent=2))
    print('DEPLOYED: Bengali GOVO public homepage. Existing logo and UI preserved.')
    print('Backup: '+str(backup))
    print('Rollback: sudo python3 '+str(BASE/'rollback.py'))
if __name__=='__main__':main()
