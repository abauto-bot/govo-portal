from pathlib import Path
import subprocess,hashlib,shutil,time,requests
base=Path('/home/abu/govo-backend-admin-20261007')
container='govo_portal_v20_live'
def run(*args):return subprocess.check_output(args,text=True).strip()
def sha(data):return hashlib.sha256(data).hexdigest()
expected=(base/'backup/phase1-server.js').read_bytes()
live=subprocess.check_output(['docker','exec',container,'cat','/app/server.js'])
assert sha(live)==sha(expected),'Active source changed; deployment refused'
future=Path('/home/abu/govo-role-flows-complete-20261003_220547/server.js')
assert future.is_file()
shutil.copy2(future,base/'backup/phase2-future-server.js')
subprocess.run(['docker','cp',container+':/app/server.js',str(base/'backup/phase2-live-server.js')],check=True)
subprocess.run(['docker','cp',str(base/'runtime/server.js'),container+':/app/server.js'],check=True)
try:
 subprocess.run(['docker','exec',container,'node','--check','/app/server.js'],check=True)
 subprocess.run(['docker','restart',container],check=True,stdout=subprocess.DEVNULL)
 for attempt in range(20):
  try:
   r=requests.get('http://127.0.0.1:3000/__role-health',timeout=3)
   if r.status_code==200:break
  except requests.RequestException:pass
  time.sleep(1)
 else:raise RuntimeError('Health check failed')
 assert sha(subprocess.check_output(['docker','exec',container,'cat','/app/server.js']))==sha((base/'runtime/server.js').read_bytes())
 shutil.copy2(base/'runtime/server.js',future)
except Exception:
 subprocess.run(['docker','cp',str(base/'backup/phase2-live-server.js'),container+':/app/server.js'],check=True)
 subprocess.run(['docker','restart',container],check=True)
 raise
print('Account-activation protection deployed and source backed up')
