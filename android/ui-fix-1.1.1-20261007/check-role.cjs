const fs=require('fs'),assert=require('assert');
const {roleShell}=require('./govo_role_os_v34');
const {chromium}=require('/home/abu/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const root=__dirname,live=process.argv.includes('--live');
for(const role of ['merchant','rider','admin']){
 const html='<html><head></head><body><main class="app"><header></header><form method="post" action="/'+role+'/login"><input name="phone"><input type="password" name="password"><button>Login</button></form></main></body></html>';
 const auth=roleShell(html,role,'GOVO '+role);
 assert(/govo-os-auth/.test(auth));assert(!auth.includes('<nav class="govo-os-dock"'));assert(!auth.includes('<section class="govo-os-workspace"'));assert(auth.includes('action="/'+role+'/login"'));assert(auth.includes('name="password"'));
 const dash=roleShell('<html><head></head><body><main class="app"><header></header><form action="/'+role+'/status" method="post"><input name="status"></form></main></body></html>',role,role[0].toUpperCase()+role.slice(1)+' Dashboard');
 assert(dash.includes('<nav class="govo-os-dock"'));assert(dash.includes('action="/'+role+'/status"'));assert(!/class="[^"]*govo-os-auth/.test(dash));
}
console.log('PASS auth/dashboard classification and unchanged form contracts');
function fixture(name){
 let html=fs.readFileSync(root+'/fixtures/'+name+'.html','utf8');
 const title=html.match(/<title>(.*?)<\/title>/s)[1];
 html=html.replace(/<style id="govo-role-os-style">[\s\S]*?<\/style>/,'').replace(/<aside class="govo-os-rail"[\s\S]*?<\/aside>/,'').replace(/<div class="govo-os-backdrop"[^>]*><\/div>/,'').replace(/<section class="govo-os-workspace"[\s\S]*?<\/section>/,'').replace(/<details class="govo-os-launcher"[\s\S]*?<\/details>/,'').replace(/<nav class="govo-os-dock"[\s\S]*?<\/nav>/,'').replace(/<script id="govo-role-os-runtime">[\s\S]*?<\/script>/,'');
 return roleShell(html,name.startsWith('rider')?'rider':'merchant',title);
}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--no-sandbox']});let cases=0;
 for(const name of ['merchant','merchant-login','rider','rider-login'])for(const width of [320,390,768])for(const theme of ['dark','light']){
  const role=name.split('-')[0],url='https://'+role+'.govoexpress.com/'+role+(name.endsWith('-login')?'/login':'');
  const c=await b.newContext({viewport:{width,height:844}});await c.addInitScript(t=>localStorage.setItem('govo_theme',t),theme);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(!live)await p.route(url,r=>r.fulfill({body:fixture(name),contentType:'text/html'}));
  const response=await p.goto(url,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  await p.evaluate(fs.readFileSync(root+'/role-selector.js','utf8'));
  await p.evaluate(fs.readFileSync(root+'/role-selector.js','utf8'));
  const r=await p.evaluate(()=>({auth:document.body.classList.contains('govo-os-auth'),dock:!!document.querySelector('.govo-os-dock'),workspace:!!document.querySelector('.govo-os-workspace'),launcher:!!document.querySelector('.govo-os-launcher'),overflow:document.documentElement.scrollWidth>innerWidth+1,selector:document.querySelectorAll('#govo-apk-role-selector').length,link:document.querySelector('#govo-apk-role-selector a').getAttribute('href'),forms:[...document.forms].map(f=>[f.method,f.getAttribute('action')])}));
  assert(r.auth);assert(!r.dock);assert(!r.workspace);assert(!r.launcher);assert(!r.overflow,JSON.stringify({name,width,theme,r}));assert.equal(r.selector,1);assert.equal(r.link,'govo-role://choose');assert.equal(errors.length,0,errors.join(','));
  const button=p.locator('form button').first();await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();assert(box.y>=0&&box.y+box.height<=844,'Form button clipped');
  if(name==='rider'&&width===390&&theme==='dark')await p.screenshot({path:root+'/'+(live?'live':'stage')+'-rider.png',fullPage:true});
  console.log('PASS',name,width,theme);cases++;await c.close();
 }
 await b.close();fs.writeFileSync(root+'/'+(live?'live':'stage')+'-role-checks.json',JSON.stringify({cases,authDashboardContracts:'PASS',roleSelector:'single insertion, secure native action',formButtons:'visible and unobscured',devicePopupTest:'No Android emulator or device connected'},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
