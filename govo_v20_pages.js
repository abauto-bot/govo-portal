const THEME=require('./govo_v20_theme');
const {icon}=require('./govo_v20_icons');

const logo='/uploads/govo-logo.png';

function shell(title,active,body){
  const nav=[
    ['home','Home','/app'],
    ['shops','Shops','/shops'],
    ['ai','GOVO','/ai'],
    ['services','Services','/services'],
    ['account','Account','/account']
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title} — GOVO Express V20</title>
<style>${THEME}</style>
</head>
<body>
<div class="v20-shell">
<header class="v20-top">
  <a class="v20-brand" href="/app">
    <img src="${logo}" alt="GOVO">
    <div><strong>GOVO EXPRESS</strong><small>OPERATION · TRUST · SPEED · EASY</small></div>
  </a>
  <a class="v20-icon-btn" href="/more" aria-label="Menu">${icon('menu')}</a>
</header>
${body}
</div>
<nav class="v20-bottom">
${nav.map(([k,l,h])=>`
<a class="v20-nav ${active===k?'active':''} ${k==='ai'?'v20-ai':''}" href="${h}">
${k==='ai'?`<span class="v20-ai-orb"><img src="${logo}" alt=""></span>`:icon(k)}
<span>${l}</span>
</a>`).join('')}
</nav>
</body></html>`;
}

function app(){
  const cards=[
    ['delivery','Delivery','Parcel, food, medicine'],
    ['shops','Shops','Local stores & merchants'],
    ['services','Services','Trusted local help'],
    ['home','Home Service','Everyday home needs']
  ];
  return shell('Home','home',`
<section class="v20-hero">
  <span class="v20-kicker">Meherpur Super App</span>
  <h1>Everything local.<br>One GOVO.</h1>
  <p>Delivery, shops, riders, transport and everyday services in one trusted local platform.</p>
  <div class="v20-actions">
    <a class="v20-btn" href="/ai">Solve with GOVO AI</a>
    <a class="v20-btn secondary" href="/order">Quick Order</a>
  </div>
</section>
<div class="v20-search">${icon('search')}<input placeholder="Search shops, services, anything..."></div>
<div class="v20-grid">
${cards.map(([i,t,s])=>`<a class="v20-card" href="${i==='delivery'?'/delivery':i==='shops'?'/shops':i==='services'?'/services':'/home-service'}">${icon(i)}<b>${t}</b><span>${s}</span></a>`).join('')}
</div>`);
}

function generic(name,active,desc){
  return shell(name,active,`
<section class="v20-hero">
<span class="v20-kicker">GOVO V20</span>
<h1>${name}</h1>
<p>${desc}</p>
<div class="v20-actions">
<a class="v20-btn" href="/ai">Ask GOVO AI</a>
<a class="v20-btn secondary" href="/app">Back Home</a>
</div>
</section>`);
}

function render(page){
  if(page==='app') return app();
  if(page==='shops') return generic('Shops','shops','Find trusted local GOVO merchants and products.');
  if(page==='services') return generic('Services','services','Book verified local services quickly and simply.');
  if(page==='ai') return generic('GOVO AI','ai','Speak, type or show a photo. GOVO helps route your need to the right action.');
  if(page==='account') return generic('Account','account','Your profile, orders, wallet and support.');
  return generic(page.replace(/-/g,' '),'home','GOVO V20 preview page.');
}
module.exports={render};
