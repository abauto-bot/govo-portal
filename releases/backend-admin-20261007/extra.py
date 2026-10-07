exec(open('/home/abu/govo-backend-admin-20261007/verify.py').read())
for path in ['/admin/os','/admin/orders','/admin/dispatch','/admin/leads','/admin/riders','/admin/providers','/admin/service-requests','/admin/support','/admin/finance']:
 r=request('admin',path,cookie=admin)
 check(r.status_code==200 and 'Internal Server Error' not in r.text,'Admin authenticated page '+path)
for path in ['/merchant/profile','/merchant/item','/merchant/orders']:
 r=request('merchant',path,{'phone':'QA-M-A','id':'1','status':'ready'})
 check(r.status_code==403,'Legacy merchant endpoint requires session '+path)
r=request('merchant','/merchant/orders',{'phone':'QA-M-A','id':'1','status':'accepted'},mb)
check(r.status_code==403,'Legacy merchant endpoint rejects cross-account')
r=request('rider','/rider/dashboard',{'id':'1','status':'picked_up'},ra)
check(r.status_code==409,'Legacy rider endpoint protects delivered state')
for role,phone in [('merchant','QA-M-A'),('rider','QA-R-A')]:
 r=request(role,'/'+role+'/account/create',{'phone':phone,'password':'QA-attacker-9876','confirm_password':'QA-attacker-9876'})
 check(r.status_code==409,'Existing '+role+' password cannot be overwritten')
 r=request(role,'/'+role+'/login',{'phone':phone,'password':'QA-password-8137'})
 check(r.status_code==302,'Original '+role+' password remains valid')
print('TOTAL_EXTENDED',count,'PASS',flush=True)
