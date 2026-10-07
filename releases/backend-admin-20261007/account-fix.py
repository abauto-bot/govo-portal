from pathlib import Path
import shutil
base=Path('/home/abu/govo-backend-admin-20261007')
p=base/'runtime/server.js'
shutil.copy2(p,base/'backup/phase1-server.js')
s=p.read_text()
for role in ['merchant','rider']:
 old="await pool.query("+chr(96)+"UPDATE govo_"+role+"_leads SET password_hash=$1, password_salt=$2, password_set_at=NOW(), updated_at=NOW() WHERE id=$3"+chr(96)+", [hp.hash, hp.salt, r.rows[0].id]);"
 new="const activated = await pool.query("+chr(96)+"UPDATE govo_"+role+"_leads SET password_hash=$1, password_salt=$2, password_set_at=NOW(), updated_at=NOW() WHERE id=$3 AND (password_hash IS NULL OR password_hash='') RETURNING id"+chr(96)+", [hp.hash, hp.salt, r.rows[0].id]);\n    if (!activated.rows.length) return res.status(409).send(accountCreatePage('"+role+"', phone, 'Account already exists. Please login or request an Admin password reset.'));"
 assert old in s;s=s.replace(old,new,1)
p.write_text(s)
deploy=(base/'deploy.py').read_text()
deploy=deploy.replace("expected=(base/'backup/server.js').read_bytes()","expected=(base/'backup/phase1-server.js').read_bytes()")
deploy=deploy.replace("'backup/future-server.js'","'backup/phase2-future-server.js'").replace("'backup/live-server.js'","'backup/phase2-live-server.js'")
deploy=deploy.split("apk=base/")[0]+"print('Account-activation protection deployed and source backed up')\n"
(base/'deploy-account-fix.py').write_text(deploy)
print('Atomic protection against existing-account overwrite prepared')
