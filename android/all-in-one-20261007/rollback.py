from pathlib import Path
import os,sys,json,hashlib,tempfile
base=Path('/home/abu/govo-all-in-one-20261007');live=Path('/var/www/govo-main/index.html')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if os.geteuid()!=0:sys.exit('Run with sudo in Termius.')
m=json.loads((base/'deploy-manifest.json').read_text())
if sha(live)==m['before']:sys.exit('Previous homepage already active.')
if sha(live)!=m['after']:sys.exit('Homepage changed; stop for review.')
source=base/'backup/index.html'
if sha(source)!=m['before']:sys.exit('Backup mismatch.')
fd,tmp=tempfile.mkstemp(prefix='.govo-apk-rollback-',dir=live.parent)
with os.fdopen(fd,'wb') as f:f.write(source.read_bytes());f.flush();os.fsync(f.fileno())
os.chmod(tmp,0o644);os.replace(tmp,live)
print('Previous homepage restored. Published APK retained for existing download links.')
