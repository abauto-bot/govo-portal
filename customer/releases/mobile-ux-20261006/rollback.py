from pathlib import Path
import subprocess
root=Path('/home/abu/govo-mobile-ux-20261006')
subprocess.run(['docker','cp',str(root/'backup/govo_v20_pages.js'),'govo_portal_v20_live:/app/govo_v20_pages.js'],check=True)
subprocess.run(['docker','restart','govo_portal_v20_live'],check=True)
future=Path('/home/abu/govo-role-flows-complete-20261003_220547/govo_v20_pages.js')
if (root/'backup/future-govo_v20_pages.js').is_file(): future.write_bytes((root/'backup/future-govo_v20_pages.js').read_bytes())
print('Original customer UI restored; verify http://127.0.0.1:3000/health')
