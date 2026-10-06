from pathlib import Path
import subprocess,time,hashlib,urllib.request
root=Path('/home/abu/govo-mobile-ux-20261006')
container='govo_portal_v20_live'
def run(*args): return subprocess.check_output(args,text=True).strip()
assert run('docker','inspect',container,'--format','{{.Id}}')=='36075b794f24689e46cce59fed466b9bb054ef397573e011dbbcf0cd77034af2'
assert run('docker','exec',container,'sha256sum','/app/server.js','/app/govo_header_v28.js','/app/govo_v20_pages.js','/app/govo_v20_theme.js')==(root/'backup/live-sha256.txt').read_text().strip()
future=Path('/home/abu/govo-role-flows-complete-20261003_220547/govo_v20_pages.js')
if future.is_file(): (root/'backup/future-govo_v20_pages.js').write_bytes(future.read_bytes())
def health():
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:3000/health',timeout=2) as r:
    if r.status==200:return
  except Exception: time.sleep(.5)
 raise RuntimeError('Portal health check did not recover')
try:
 run('docker','cp',str(root/'candidate/govo_v20_pages.js'),container+':/app/govo_v20_pages.js')
 run('docker','restart',container)
 health()
 req=urllib.request.Request('http://127.0.0.1:3000/app',headers={'Host':'app.govoexpress.com'})
 with urllib.request.urlopen(req,timeout=10) as r: html=r.read().decode()
 assert 'aria-current="page"' in html and 'enterkeyhint="search"' in html
 expected=(root/'backup/live-sha256.txt').read_text().splitlines()
 actual=run('docker','exec',container,'sha256sum','/app/server.js','/app/govo_header_v28.js','/app/govo_v20_theme.js').splitlines()
 assert actual==[expected[0],expected[1],expected[3]],'Protected runtime modules changed'
 run('docker','commit',container,'govo_portal:mobile-ux-deployed-20261006')
 if future.is_file(): future.write_bytes((root/'candidate/govo_v20_pages.js').read_bytes())
 print('DEPLOYED: health, current navigation/search markup and protected module hashes verified.')
except Exception:
 run('docker','cp',str(root/'backup/govo_v20_pages.js'),container+':/app/govo_v20_pages.js')
 run('docker','restart',container);health()
 print('Deployment failed; original UI restored.')
 raise
