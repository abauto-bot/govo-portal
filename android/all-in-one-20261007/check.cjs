const fs=require('fs'),assert=require('assert');
const {chromium}=require('/home/abu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const root='/home/abu/govo-all-in-one-20261007';
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--no-sandbox']});let cases=0;
 for(const width of [320,360,390,768,1280])for(const theme of ['dark','light']){
  const c=await b.newContext({viewport:{width,height:900}});await c.addInitScript(t=>localStorage.setItem('govo_theme',t),theme);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://govoexpress.com/',r=>r.fulfill({path:root+'/public/index.html',contentType:'text/html'}));
  await p.goto('https://govoexpress.com/',{waitUntil:'networkidle'});
  const r=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,links:[...document.querySelectorAll('a[download]')].map(a=>a.getAttribute('href')),images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),icons:document.querySelectorAll('.service .ico svg').length}));
  assert(!r.overflow,JSON.stringify({width,theme,r}));assert(r.images);assert.equal(r.icons,7);assert.equal(r.links.length,4);assert(r.links.every(x=>x==='/assets/GOVO-Express-All-in-One-1.1.0.apk'));
  if(width<=768){assert(await p.locator('.apk-top').isVisible());assert(await p.locator('.apk-top a').isVisible());assert((await p.locator('.apk-top a').boundingBox()).height>=44);}
  assert.equal(errors.length,0);if(width===390&&theme==='dark')await p.screenshot({path:root+'/homepage-stage.png',fullPage:false});
  cases++;console.log('PASS',width,theme);await c.close();
 }
 for(const url of ['https://app.govoexpress.com/app','https://merchant.govoexpress.com/merchant/login','https://rider.govoexpress.com/rider/login']){
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));const response=await p.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);assert.equal(errors.length,0);console.log('ROLE_PAGE_PASS',url);await p.close();
 }
 fs.writeFileSync(root+'/browser-checks.json',JSON.stringify({cases,rolePages:3,deviceInstallTest:'Not run: no Android device or emulator connected'},null,2));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
