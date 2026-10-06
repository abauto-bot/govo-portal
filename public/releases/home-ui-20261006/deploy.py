#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime,timezone
import hashlib,shutil,os,json,urllib.request
stage=Path('/home/abu/govo-home-ui-fix-20261006')
target=Path('/var/www/govo-main/index.html')
original=next(stage.glob('index.html.before-ui-*')).read_bytes()
ready=(stage/'index.html').read_bytes()
css=stage/'govo-home-ui-20261006.css'
validation=json.loads((stage/'validation.json').read_text())
assert len(validation['checks'])==16 and all(x['result']=='PASS' for x in validation['checks'])
assert validation['menu']==validation['theme']==validation['logoLoad']=='PASS'
if target.read_bytes()==ready:
 print('Patch already deployed.');raise SystemExit(0)
if target.read_bytes()!=original:raise SystemExit('STOP: live homepage changed since staging. No writes.')
if os.geteuid()!=0:raise SystemExit('Run this one deployment script with administrator permissions.')
backup=stage/('backup-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
backup.mkdir();shutil.copy2(target,backup/'index.html')
assets=target.parent/'assets';asset=assets/css.name
if asset.exists() and asset.read_bytes()!=css.read_bytes():raise SystemExit('STOP: asset conflict. No live writes.')
try:
 shutil.copy2(css,asset);os.chmod(asset,0o644)
 temporary=target.with_name('.index-ui-20261006.tmp')
 shutil.copy2(target,temporary);temporary.write_bytes(ready);temporary.replace(target)
 for url,expected in [('https://www.govoexpress.com/',b'data-govo-home-ui="20261006"'),('https://www.govoexpress.com/assets/govo-home-ui-20261006.css?v=20261006',b'data-govo-home-ui')]:
  response=urllib.request.urlopen(url,timeout=20)
  assert response.status==200 and expected in response.read()
except Exception:
 shutil.copy2(backup/'index.html',target)
 raise
result={'status':'deployed_verified_http','backup':str(backup),'scope':'public homepage role buttons and header sizing','time':datetime.now(timezone.utc).isoformat(),'sha256':hashlib.sha256(ready).hexdigest(),'browser_checks':16}
(stage/'deployment.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
print('Rollback: restore '+str(backup/'index.html')+' to '+str(target))
