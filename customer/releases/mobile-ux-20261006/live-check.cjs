const {chromium}=require('/home/abu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');const assert=require('node:assert/strict');const fs=require('fs');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();let cases=0;
await page.route('**/*',r=>r.request().method()==='GET'?r.continue():r.abort());
for(const width of [320,390])for(const path of ['/app','/more','/shops','/services'])for(const theme of ['dark','light']){
 await page.setViewportSize({width,height:844});const response=await page.goto('https://app.govoexpress.com'+path,{waitUntil:'domcontentloaded',timeout:30000});assert.equal(response.status(),200);
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Live overflow ${path}/${width}/${theme}`);
 if(path==='/app'){assert.ok(await page.locator('input[name=q]').getAttribute('enterkeyhint'));assert.equal(await page.locator('.v22-action-grid a').count(),9);}
 cases++;
}
const gates=[];for(const url of ['https://merchant.govoexpress.com/merchant','https://rider.govoexpress.com/rider','https://govoexpress.com/','https://add.govoexpress.com/admin']){const r=await page.request.get(url,{timeout:30000});assert.ok([200,401,403].includes(r.status()));gates.push({url,status:r.status()});}
fs.writeFileSync('/home/abu/govo-mobile-ux-20261006/live-validation.json',JSON.stringify({cases,gates,status:'passed'},null,2));console.log('PASS: '+cases+' live mobile/theme views and '+gates.length+' role/public HTTP gates.');await browser.close();})().catch(e=>{console.error(e.message);process.exit(1)});
