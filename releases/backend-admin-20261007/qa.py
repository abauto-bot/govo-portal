import requests,subprocess,json
BASE='http://172.31.0.3:3000'
def sql(q):
 return subprocess.check_output(['docker','exec','govo-backend-qa-db-20261007','psql','-U','postgres','-d','govo_qa','-tA','-c',q],text=True).strip()
def request(role,path,data=None,cookie=''):
 h={'Host':{'merchant':'merchant.govoexpress.com','rider':'rider.govoexpress.com','admin':'add.govoexpress.com','customer':'app.govoexpress.com'}[role],'X-Forwarded-Proto':'https'}
 if cookie:h['Cookie']=cookie
 return requests.request('POST' if data is not None else 'GET',BASE+path,data=data,headers=h,allow_redirects=False,timeout=20)
def login(role,phone):
 p='QA-password-8137'
 request(role,'/'+role+'/account/create',{'phone':phone,'password':p,'confirm_password':p})
 r=request(role,'/'+role+'/login',{'phone':phone,'password':p})
 assert r.status_code==302,(role,r.status_code)
 return r.headers['Set-Cookie'].split(';')[0]
def fixture():
 sql("TRUNCATE govo_orders,govo_order_events,govo_merchant_leads,govo_rider_leads RESTART IDENTITY CASCADE")
 for n in ['A','B']:
  sql("INSERT INTO govo_merchant_leads(shop_name,owner_name,phone,whatsapp,location,status) VALUES ('QA Shop "+n+"','QA Owner','QA-M-"+n+"','QA-M-"+n+"','QA only','approved')")
  sql("INSERT INTO govo_rider_leads(rider_name,name,phone,location,status) VALUES ('QA Rider "+n+"','QA Rider "+n+"','QA-R-"+n+"','QA only','approved')")
fixture()
ma=login('merchant','QA-M-A');mb=login('merchant','QA-M-B');ra=login('rider','QA-R-A');rb=login('rider','QA-R-B')
admin=request('admin','/admin/login',{'admin_pin':'qa-only-8137'}).headers['Set-Cookie'].split(';')[0]
r=request('customer','/order',{'customer_name':'QA Customer','customer_phone':'QA-C-1','customer_address':'QA address','items':'QA parcel','merchant_id':'1','merchant_name':'QA Shop A','merchant_phone':'QA-M-A'})
assert r.status_code==302,r.status_code
print('CUSTOMER_CREATE',sql("SELECT id||':'||status FROM govo_orders"))
r=request('merchant','/merchant/order/status',{'phone':'QA-M-A','id':'1','status':'accepted'})
print('UNAUTH_MERCHANT',r.status_code,sql("SELECT status FROM govo_orders WHERE id=1"))
r=request('merchant','/merchant/order/status',{'phone':'QA-M-A','id':'1','status':'preparing'},mb)
print('CROSS_MERCHANT',r.status_code,sql("SELECT status FROM govo_orders WHERE id=1"))
for st in ['accepted','preparing','ready']:
 r=request('merchant','/merchant/order/status',{'phone':'QA-M-A','id':'1','status':st},ma)
 print('MERCHANT',st,r.status_code,sql("SELECT status FROM govo_orders WHERE id=1"))
r=request('admin','/admin/orders/assign-rider',{'order_id':'1','rider_id':'1'},admin)
print('ADMIN_ASSIGN',r.status_code,sql("SELECT status FROM govo_orders WHERE id=1"))
r=request('rider','/rider/orders/update-status',{'id':'1','status':'delivered'},rb)
print('CROSS_RIDER',r.status_code,sql("SELECT status FROM govo_orders WHERE id=1"))
for st in ['picked_up','on_the_way','delivered','picked_up']:
 r=request('rider','/rider/orders/update-status',{'id':'1','status':st},ra)
 print('RIDER',st,r.status_code,sql("SELECT status FROM govo_orders WHERE id=1"))
print('EVENTS',sql("SELECT count(*) FROM govo_order_events"))
