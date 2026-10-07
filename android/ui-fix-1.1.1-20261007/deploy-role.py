from pathlib import Path
import subprocess,hashlib,re,urllib.request,time,json
base=Path('/home/abu/govo-apk-ui-fix-20261007');container='govo_portal_v20_live'
run=lambda args:subprocess.run(args,check=True,capture_output=True,text=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((base/'stage-role-checks.json').read_text())['cases']==24
run(['node','--check',str(base/'govo_role_os_v34.js')])
run(['docker','cp',container+':/app/govo_role_os_v34.js',str(base/'live-before.js')])
assert sha(base/'live-before.js')==sha(base/'backup/govo_role_os_v34.js'),'Live module changed'
protected=['server.js','govo_header_v28.js','govo_v20_pages.js','govo_v20_shops.js']
code="const f=require('fs'),c=require('crypto');console.log(JSON.stringify(Object.fromEntries("+json.dumps(protected)+".map(x=>[x,c.createHash('sha256').update(f.readFileSync('/app/'+x)).digest('hex')]))));"
before=json.loads(run(['docker','exec',container,'node','-e',code]).stdout)
try:
 run(['docker','cp',str(base/'govo_role_os_v34.js'),container+':/app/govo_role_os_v34.js'])
 run(['docker','restart',container])
 for attempt in range(20):
  try:
   for role in ['rider','merchant']:
    with urllib.request.urlopen('https://'+role+'.govoexpress.com/'+role+'?verify=ui111',timeout=10) as r:html=r.read().decode()
    body=re.search(r'<body[^>]*>',html).group()
    assert 'govo-os-auth' in body and '<nav class="govo-os-dock"' not in html and '<section class="govo-os-workspace"' not in html
   break
  except Exception:
   if attempt==19:raise
   time.sleep(1)
 after=json.loads(run(['docker','exec',container,'node','-e',code]).stdout)
 assert before==after,'Protected modules changed'
 (base/'deploy-role-results.json').write_text(json.dumps({'status':'deployed_smoke_verified','protected_hashes':before,'module_sha256':sha(base/'govo_role_os_v34.js')},indent=2))
 print('DEPLOYED_ROLE_AUTH_UI; protected server/customer/header/shop modules unchanged')
except Exception:
 run(['docker','cp',str(base/'backup/govo_role_os_v34.js'),container+':/app/govo_role_os_v34.js']);run(['docker','restart',container]);raise
