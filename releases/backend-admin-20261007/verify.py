exec(open('/home/abu/govo-backend-admin-20261007/qa.py').read().split('fixture()\nma=')[0])
fixture()
ma=login('merchant','QA-M-A');mb=login('merchant','QA-M-B');ra=login('rider','QA-R-A');rb=login('rider','QA-R-B')
admin=request('admin','/admin/login',{'admin_pin':'qa-only-8137'}).headers['Set-Cookie'].split(';')[0]
count=0
def check(ok,label):
 global count
 assert ok,label
 count+=1;print('PASS',label,flush=True)
r=request('customer','/order',{'customer_name':'QA Customer Unique','customer_phone':'QA-C-1','customer_address':'QA address','items':'QA parcel','merchant_id':'1','merchant_name':'QA Shop A'})
check(r.status_code==302,'Customer creates merchant-ID order without phone')
for cookie,label in [('', 'anonymous'),(mb,'cross-account')]:
 r=request('merchant','/merchant/order/status',{'phone':'QA-M-A','id':'1','status':'accepted'},cookie)
 check(r.status_code==403,label+' merchant mutation blocked')
check(sql('SELECT status FROM govo_orders WHERE id=1')=='new','Unauthorized writes leave DB unchanged')
for path in ['/merchant/dashboard','/merchant/orders']:
 check('QA Customer Unique' in request('merchant',path,cookie=ma).text,'Merchant A sees ID-linked order '+path)
 check('QA Customer Unique' not in request('merchant',path,cookie=mb).text,'Merchant B cannot see order '+path)
for st in ['accepted','preparing','ready']:
 r=request('merchant','/merchant/order/status',{'phone':'QA-M-A','id':'1','status':st},ma)
 check(r.status_code==302 and sql('SELECT status FROM govo_orders WHERE id=1')==st,'Merchant '+st)
r=request('admin','/admin/orders/assign-rider',{'order_id':'1','rider_id':'1'},admin)
check(r.status_code==302 and sql('SELECT status FROM govo_orders WHERE id=1')=='assigned','Admin dispatch reaches DB')
check('QA Customer Unique' in request('rider','/rider/dashboard',cookie=ra).text,'Assigned rider sees order')
check('QA Customer Unique' not in request('rider','/rider/dashboard',cookie=rb).text,'Other rider cannot see order')
for cookie,st in [(rb,'picked_up'),(ra,'delivered'),(ra,'garbage')]:
 r=request('rider','/rider/orders/update-status',{'id':'1','status':st},cookie)
 check(r.status_code in (400,409),'Wrong rider, skipped transition or invalid status blocked '+st)
for st in ['picked_up','on_the_way','delivered']:
 r=request('rider','/rider/orders/update-status',{'id':'1','status':st},ra)
 check(r.status_code==302 and sql('SELECT status FROM govo_orders WHERE id=1')==st,'Rider '+st)
r=request('rider','/rider/orders/update-status',{'id':'1','status':'picked_up'},ra)
check(r.status_code==409 and sql('SELECT status FROM govo_orders WHERE id=1')=='delivered','Delivered order cannot regress')
r=request('merchant','/merchant/order/status',{'phone':'QA-M-A','id':'1','status':'ready'},ma)
check(r.status_code==409,'Merchant cannot reopen delivered order')
code=sql('SELECT order_code FROM govo_orders WHERE id=1')
r=request('customer','/track?code='+code)
check(r.status_code==200 and 'delivered' in r.text.lower(),'Customer tracking reflects delivered')
check(int(sql('SELECT count(*) FROM govo_order_events'))>=8,'Shared audit history contains lifecycle events')
print('TOTAL',count,'PASS',flush=True)
