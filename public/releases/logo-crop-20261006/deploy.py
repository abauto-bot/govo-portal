from pathlib import Path
import os,json,hashlib,tempfile,urllib.request,shutil
r=Path('/home/abu/govo-logo-crop-20261006');web=Path('/var/www/govo-main')
if os.geteuid()!=0:raise SystemExit('Run this script with sudo.')
expected=json.loads((r/'expected.json').read_text())
paths={'index.html':web/'index.html','govo-home-ui-20261006.css':web/'assets/govo-home-ui-20261006.css'}
for name,p in paths.items():
 if hashlib.sha256(p.read_bytes()).hexdigest()!=expected[name]:raise SystemExit('Live source changed; stop and refresh the candidate before deployment.')
def save(path,data):
 fd,temp=tempfile.mkstemp(dir=path.parent,prefix='.govo-logo-')
 with os.fdopen(fd,'wb') as f:f.write(data)
 os.chmod(temp,0o644);os.replace(temp,path)
try:
 save(web/'assets/govo-symbol-complete-v20261006.svg',(r/'govo-symbol-complete-v20261006.svg').read_bytes())
 for name,p in paths.items():save(p,(r/name).read_bytes())
 with urllib.request.urlopen('https://govoexpress.com/?logo_check=20261006',timeout=20) as response:html=response.read().decode()
 assert '20261006-logo-crop' in html
 with urllib.request.urlopen('https://govoexpress.com/assets/govo-symbol-complete-v20261006.svg',timeout=20) as response:asset=response.read()
 assert hashlib.sha256(asset).digest()==hashlib.sha256((r/'govo-symbol-complete-v20261006.svg').read_bytes()).digest()
 print('Logo fix deployed. Backup: '+str(r/'backup'))
except Exception:
 for name,p in paths.items():save(p,(r/'backup'/name).read_bytes())
 print('Check failed; prior public page restored.');raise
