from pathlib import Path
import os,json,hashlib,tempfile,sys
base=Path('/home/abu/govo-home-bn-20261006');live=Path('/var/www/govo-main/index.html')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if os.geteuid()!=0:sys.exit('Run with sudo in the VPS terminal.')
m=json.loads((base/'manifest.json').read_text())
if sha(live)==m['previous_index_sha256']:sys.exit('Already rolled back.')
if sha(live)!=m['files']['index.html']:sys.exit('Live homepage changed; stop for review.')
source=base/'backup/index.html'
if sha(source)!=m['previous_index_sha256']:sys.exit('Backup mismatch')
fd,tmp=tempfile.mkstemp(prefix='.govo-bn-rollback-',dir=live.parent)
with os.fdopen(fd,'wb') as f:f.write(source.read_bytes());f.flush();os.fsync(f.fileno())
os.chmod(tmp,0o644);os.replace(tmp,live)
print('Previous public homepage restored. New assets retained for safety.')
