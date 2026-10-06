const {chromium}=require('/home/abu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('fs');
const candidate=require('./candidate/govo_v20_pages');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();
await page.route('**/*',route=>route.abort());
let count=0;
for(const width of [320,360,390,768,1280])for(const theme of ['dark','light'])for(const name of ['app','ai','account','more']){
 await page.setViewportSize({width,height:844});
 const html=candidate.render(name,{shops:[{id:1,shop_name:'Example shop with a long descriptive name',category:'Grocery',location:'Meherpur'}]});
 await page.setContent(html);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${name}/${width}/${theme}`);
 const input=page.locator('input[name="q"]').first();if(await input.count()){assert.equal(await input.evaluate(el=>getComputedStyle(el).fontSize),'16px');assert.ok(await input.getAttribute('aria-label'));}
 const nav=page.locator('.v20-bottom');if(await nav.isVisible()){assert.ok(await nav.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight));}
 if(name!=='more')assert.equal(await page.locator('.v20-bottom a[aria-current="page"]').count(),1);
 if(name==='app'){assert.equal(await page.locator('.v22-action-grid a').count(),9);const submit=page.locator('.v20-search button');const b=await submit.boundingBox();assert.ok(b.width>=44&&b.height>=44);assert.equal(await page.locator('input[name="q"]').getAttribute('type'),'search');}
 count++;
}
await page.setViewportSize({width:390,height:844});await page.setContent(candidate.homePage());await page.emulateMedia({reducedMotion:'reduce'});
assert.equal(await page.locator('.v20-brand img').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.locator('input[name="q"]').focus();assert.ok(await page.locator('input[name="q"]').evaluate(e=>getComputedStyle(e).outlineStyle==='solid'));
console.log('PASS: '+count+' candidate layout/theme/page cases, tap targets, search labels, active navigation, keyboard focus and reduced motion.');
fs.writeFileSync('/home/abu/govo-mobile-ux-20261006/validation.json',JSON.stringify({cases:count,status:'passed',widths:[320,360,390,768,1280],themes:['dark','light']},null,2));
await browser.close();})().catch(e=>{console.error(e.message);process.exit(1)});
