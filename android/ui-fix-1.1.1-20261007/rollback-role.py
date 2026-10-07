from pathlib import Path
import subprocess,hashlib,sys
base=Path('/home/abu/govo-apk-ui-fix-20261007');container='govo_portal_v20_live'
run=lambda a:subprocess.run(a,check=True,capture_output=True,text=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
run(['docker','cp',container+':/app/govo_role_os_v34.js',str(base/'rollback-current.js')])
if sha(base/'rollback-current.js')!=sha(base/'govo_role_os_v34.js'):sys.exit('Role UI changed; stop for review.')
run(['docker','cp',str(base/'backup/govo_role_os_v34.js'),container+':/app/govo_role_os_v34.js']);run(['docker','restart',container])
future=Path('/home/abu/govo-role-flows-complete-20261003_220547/govo_role_os_v34.js')
if future.exists() and sha(future)==sha(base/'govo_role_os_v34.js'):future.write_bytes((base/'backup/govo_role_os_v34.js').read_bytes())
print('Previous role presentation restored; APK versions retained.')
