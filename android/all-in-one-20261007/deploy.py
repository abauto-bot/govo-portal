from pathlib import Path
import os,sys,json,hashlib,tempfile
base=Path('/home/abu/govo-all-in-one-20261007');live=Path('/var/www/govo-main/index.html')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if os.geteuid()!=0:sys.exit('Administrator access required in Termius.')
m=json.loads((base/'deploy-manifest.json').read_text())
if sha(live)==m['after']:sys.exit('App links already deployed.')
if sha(live)!=m['before']:sys.exit('Homepage changed; stop for review.')
source=base/'public/index.html'
if sha(source)!=m['after'] or sha(base/'backup/index.html')!=m['before']:sys.exit('Source or backup mismatch.')
apk=Path('/var/www/govo-main/assets/GOVO-Express-All-in-One-1.1.0.apk')
if sha(apk)!=m['apk']:sys.exit('APK mismatch.')
if json.loads((base/'browser-checks.json').read_text())['cases']!=10:sys.exit('Browser tests incomplete.')
fd,tmp=tempfile.mkstemp(prefix='.govo-apk-',dir=live.parent)
with os.fdopen(fd,'wb') as f:f.write(source.read_bytes());f.flush();os.fsync(f.fileno())
os.chmod(tmp,0o644);os.replace(tmp,live)
print('DEPLOYED: GOVO all-in-one APK download links.')
