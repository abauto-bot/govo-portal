const fs=require('fs'),assert=require('assert');
const {chromium}=require('/home/abu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const root='/home/abu/govo-home-bn-20261006',live=process.argv.includes('--live');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--no-sandbox']});
 let count=0;
 for(const width of [320,360,390,768,1280]) for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(t=>localStorage.setItem('govo_theme',t),theme);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(!live) await page.route('https://govoexpress.com/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   const file=path==='/'?root+'/index.html':path.startsWith('/assets/govo-home-bn-20261006.')||path==='/assets/govo-network-bn-20261006.svg'?root+path:null;
   if(file)await route.fulfill({path:file,contentType:path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':'text/html'});else await route.continue();
  });
  await page.goto('https://govoexpress.com/',{waitUntil:'networkidle',timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{
   const r=document.querySelector('.brand-mark').getBoundingClientRect(),body=document.body.innerText;
   return {lang:document.documentElement.lang,theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth>innerWidth+1,icons:document.querySelectorAll('.service .ico svg').length,sections:document.querySelectorAll('main section').length,logo:getComputedStyle(document.querySelector('.brand-mark')).content,logoGeometry:[r.width,r.height],broken:[...document.images].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src),words:['আমাদের মিশন','আমাদের ভিশন','তিন ধাপে','মার্চেন্ট হিসেবে','রাইডার হিসেবে'].every(x=>body.includes(x)),english:[...document.querySelectorAll('h1,h2,.nav-links a,.service b')].filter(x=>/[A-Za-z]{4}/.test(x.textContent)&&!x.textContent.includes('GOVO')).map(x=>x.textContent)}
  });
  assert.equal(result.lang,'bn');assert.equal(result.theme,theme);assert.equal(result.overflow,false,JSON.stringify({width,theme,result}));assert.equal(result.icons,7);assert.equal(result.sections,9);assert.equal(result.words,true);assert.equal(result.broken.length,0);assert.equal(result.english.length,0);assert(result.logo.includes('govo-symbol-complete-v20261006.svg'));
  await page.locator('.theme-switch').click();assert.equal(await page.locator('html').getAttribute('data-theme'),theme==='dark'?'light':'dark');
  await page.locator('.theme-switch').click();
  if(await page.locator('[data-menu]').isVisible()){
   await page.locator('[data-menu]').click();assert.equal(await page.locator('[data-menu]').getAttribute('aria-expanded'),'true');
   await page.keyboard.press('Escape');assert.equal(await page.locator('[data-menu]').getAttribute('aria-expanded'),'false');
  }
  assert.equal(errors.length,0,errors.join('\n'));
  if(theme==='dark'&&(width===390||width===1280))await page.screenshot({path:root+'/'+(live?'live':'stage')+'-'+width+'.png',fullPage:true});
  if(width===390&&theme==='dark'){
   await page.route('https://app.govoexpress.com/**',r=>r.fulfill({body:'search captured',contentType:'text/plain'}));
   await page.locator('#govoSearch').fill('ভাত');await page.locator('#govoSearch').press('Enter');
   await page.waitForURL('**/shops?q=*');assert.equal(new URL(page.url()).searchParams.get('q'),'ভাত');
  }
  count++;console.log('PASS',width,theme);await context.close();
 }
 await browser.close();fs.writeFileSync(root+'/'+(live?'live':'stage')+'-results.json',JSON.stringify({passed:count,checks:'Bengali copy, no overflow, seven icons, complete logo, images, theme, menu/Escape, search, no page errors'},null,2));
 console.log('COMPLETE',count,live?'live':'staged');
})().catch(e=>{console.error(e);process.exit(1)});
