from pathlib import Path
import hashlib,json,os,sys,tempfile
base=Path('/home/abu/govo-apk-ui-fix-20261007');live=Path('/var/www/govo-main/index.html')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--prepare' in sys.argv:
 current=live.read_text();(base/'backup/public-index.html').write_text(current)
 if 'GOVO-Express-All-in-One-1.1.0.apk' in current:candidate=current.replace('GOVO-Express-All-in-One-1.1.0.apk','GOVO-Express-All-in-One-1.1.1.apk')
 else:
  prior=Path('/home/abu/govo-all-in-one-20261007')
  assert sha(live)==json.loads((prior/'deploy-manifest.json').read_text())['before'],'Public homepage changed; review required'
  candidate=(prior/'public/index.html').read_text().replace('GOVO-Express-All-in-One-1.1.0.apk','GOVO-Express-All-in-One-1.1.1.apk')
 (base/'public-index.html').write_text(candidate)
 (base/'home-manifest.json').write_text(json.dumps({'before':sha(live),'after':sha(base/'public-index.html')},indent=2))
 print('Homepage v1.1.1 download update staged');sys.exit()
if os.geteuid()!=0:sys.exit('Run with sudo in Termius; public homepage administrator access required.')
m=json.loads((base/'home-manifest.json').read_text())
if sha(live)==m['after']:sys.exit('Latest APK link already live.')
if sha(live)!=m['before'] or sha(base/'public-index.html')!=m['after']:sys.exit('Homepage changed; stop for review.')
fd,tmp=tempfile.mkstemp(prefix='.govo-apk111-',dir=live.parent)
with os.fdopen(fd,'wb') as f:f.write((base/'public-index.html').read_bytes());f.flush();os.fsync(f.fileno())
os.chmod(tmp,0o644);os.replace(tmp,live);print('Homepage download now points to GOVO v1.1.1.')
