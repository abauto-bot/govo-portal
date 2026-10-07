from pathlib import Path
import subprocess,hashlib,shutil,time,requests
base=Path('/home/abu/govo-backend-admin-20261007')
container='govo_portal_v20_live'
def run(*args):return subprocess.check_output(args,text=True).strip()
def sha(data):return hashlib.sha256(data).hexdigest()
expected=(base/'backup/server.js').read_bytes()
live=subprocess.check_output(['docker','exec',container,'cat','/app/server.js'])
assert sha(live)==sha(expected),'Active source changed; deployment refused'
future=Path('/home/abu/govo-role-flows-complete-20261003_220547/server.js')
assert future.is_file()
shutil.copy2(future,base/'backup/future-server.js')
subprocess.run(['docker','cp',container+':/app/server.js',str(base/'backup/live-server.js')],check=True)
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
 subprocess.run(['docker','cp',str(base/'backup/live-server.js'),container+':/app/server.js'],check=True)
 subprocess.run(['docker','restart',container],check=True)
 raise
apk=base/'admin-android/delivery/GOVO-Admin-1.0.0.apk'
dest=Path('/var/www/govo-main/assets')/apk.name
assert not dest.exists(),'Refusing overwrite published Admin release'
shutil.copy2(apk,dest);dest.chmod(0o644)
print('DEPLOYED backend; source and future-build backups retained')
print('ADMIN_APK_SHA256',sha(apk.read_bytes()))
