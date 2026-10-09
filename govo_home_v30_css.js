module.exports=`
/* Home and More only; loaded by the scoped page renderer. */
.v20-page-home,.v20-page-more{--brand:#51e482;--muted:#a8c8c9;background:radial-gradient(ellipse at 5% 0%,#0d302b,transparent 55%),#06141d;color:#f2fafb}
.v20-page-home .v20-shell,.v20-page-more .v20-shell{display:block!important;max-width:1000px!important;padding:12px 16px 120px!important}
.v20-page-home .v22-location{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-radius:18px;font-size:15px;margin:0 0 10px}
.v22-location>a{display:flex;align-items:center;gap:6px;min-height:44px;font-size:12px;font-weight:700;color:var(--brand)}
.v20-page-home .v20-hero.v22-hero{padding:20px 20px!important;margin:0!important;min-height:0!important;border-radius:26px!important;background:radial-gradient(ellipse at 95% 15%,rgba(26,205,230,.12),transparent 65%),linear-gradient(130deg,#10342c,#09202c)!important;box-shadow:0 12px 30px #0002}
.v20-page-home .v22-hero h1{font-size:clamp(32px,8vw,46px)!important;line-height:1.1!important;margin:0 0 12px!important;letter-spacing:-.04em}
.v20-page-home .v22-hero h1 em{display:block;font-style:normal;color:#52e881}
.v20-page-home .v22-hero p{font-size:15px!important;line-height:1.55;margin:0 0 14px;max-width:600px}
.v20-page-home .v20-search{padding:5px 6px 5px 12px;min-height:56px!important;margin:0;background:#061820!important;gap:8px}
.v20-page-home .v20-search>svg{display:none}.v20-page-home .v20-search input{font-size:14px;color:#eefbfc;min-height:44px}
.v20-search button{width:44px;height:44px;flex:none;display:grid;place-items:center;background:#36c76c;color:#062218;border:0;border-radius:13px;cursor:pointer}
.v20-page-home .v20-section,.v20-page-more .v20-section{margin:25px 0 16px!important;gap:10px}
.v20-page-home .v20-section h2,.v20-page-more .v20-section h2{font-size:20px!important;line-height:1.3}
.v20-section>a{display:flex;align-items:center;min-height:44px;font-size:13px;white-space:nowrap}
.v20-page-home .v22-action-grid,.v20-page-more .v22-action-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:18px 10px!important;margin:0!important;padding:0!important;border:0;background:transparent!important}
.v20-page-home .v22-action,.v20-page-more .v22-action{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:11px;min-width:0;min-height:122px;border:0;background:transparent!important;padding:0 2px;text-align:center;font-size:15px!important;font-weight:750;line-height:1.25;color:inherit}
.v20-page-home .v22-action>span:last-child,.v20-page-more .v22-action>span:last-child{display:block;max-width:100%;overflow-wrap:normal}
.v20-page-home .v22-action .v22-iconbox,.v20-page-more .v22-action .v22-iconbox,.v30-tile{position:relative;display:grid;place-items:center;width:82px!important;height:82px!important;border-radius:24px!important;border:1px solid #86dfce44!important;background:linear-gradient(145deg,#21534588,#0c354daa)!important;box-shadow:inset 0 2px 2px #d5fff826,inset 0 -3px 4px #001b3166,0 10px 18px #0003!important;isolation:isolate;flex:none}
.v22-iconbox:before,.v30-tile:before{content:'';position:absolute;inset:3px;border-radius:21px;background:linear-gradient(145deg,#fff2,transparent 48%);pointer-events:none;z-index:-1}
.v20-page-home .v22-action:nth-child(even) .v22-iconbox,.v20-page-more .v22-action:nth-child(even) .v22-iconbox{background:linear-gradient(145deg,#17435caa,#103b3888)!important}
.v20-page-home .v30-shortcuts>.v20-section{margin-top:20px!important}
.v20-page-home .v22-action-grid{row-gap:16px!important}
.v20-page-home .v22-action{min-height:118px}
.v30-category-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px 10px}
.v30-category{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0;min-height:118px;font-size:14px;text-align:center}
.v30-category b{font-size:14px;line-height:1.35;font-weight:750}.v30-category .v30-glossy-icon{width:62px;height:62px}
.v20-page-home .v22-card-scroll{display:grid!important;grid-auto-flow:column!important;grid-auto-columns:minmax(220px,75%)!important;grid-template-columns:none!important;gap:14px!important;overflow-x:auto!important;padding:3px 1px 14px;scroll-snap-type:x proximity}
.v22-shop-card{scroll-snap-align:start}.v20-page-home .v22-shop-card b,.v20-page-home .v22-provider b{font-size:16px!important;white-space:normal;overflow-wrap:anywhere}
.v20-page-home .v22-shop-card small,.v20-page-home .v22-provider small{font-size:13px!important;line-height:1.45;white-space:normal}
.v20-page-home .v22-shop-cover{height:110px!important}.v20-page-home .v22-meta{font-size:13px;color:var(--brand);margin-top:12px}
.v20-page-home .v22-provider-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
.v20-page-home .v22-steps{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.v20-page-home .v22-trust-grid{grid-template-columns:1fr}
.v20-page-home .v20-bottom,.v20-page-more .v20-bottom{background:#071b23ee;box-shadow:0 -4px 24px #0002}
.v20-bottom .v30-glossy-icon{width:32px;height:32px}.v20-bottom .v20-nav{font-size:11px}
.v20-desktop-nav .v30-glossy-icon{width:36px;height:36px}
.v30-glossy-icon[data-govo-icon="account"]{filter:brightness(2.8) saturate(.7)}
.v30-back{display:inline-flex;align-items:center;min-height:44px;font-size:14px;color:var(--brand)}
.v20-page-more .v22-page-title h1{font-size:32px;margin:10px 0}.v20-page-more .v22-page-title p{font-size:15px;color:var(--muted);margin-bottom:24px}
#categories{scroll-margin-top:110px}
.v20-page-home a:focus-visible,.v20-page-more a:focus-visible,.v20-search:focus-within{outline:3px solid #41c9ed;outline-offset:4px}
.v22-action:active .v22-iconbox,.v30-category:active .v30-tile{transform:scale(.96)}
html[data-theme="light"] .v20-page-home,html[data-theme="light"] .v20-page-more{--text:#18352f;--muted:#56706c;--brand:#188c50;background:radial-gradient(ellipse at 0% 0%,#d5f5e9,transparent 60%),#f2f9f7;color:#18352f}
html[data-theme="light"] .v20-page-home .v22-location{background:#ffffffcc;border-color:#c6e5dc}
html[data-theme="light"] .v20-page-home .v20-hero.v22-hero{background:linear-gradient(130deg,#ffffff,#e6f8f1 60%,#e0f3f6)!important;border-color:#c0e2d7}
html[data-theme="light"] .v20-page-home .v22-hero h1 em{color:#15894e}
html[data-theme="light"] .v20-page-home .v20-search{background:#ffffffed!important;border-color:#c4ddd6}
html[data-theme="light"] .v20-page-home .v20-search input{color:#18352f}
html[data-theme="light"] .v20-page-home .v22-action .v22-iconbox,html[data-theme="light"] .v20-page-more .v22-action .v22-iconbox,html[data-theme="light"] .v30-tile{background:linear-gradient(145deg,#fff,#e1f6eb)!important;border-color:#bddfd3!important;box-shadow:inset 0 2px 2px #fff,inset 0 -3px 4px #94c9b733,0 7px 16px #245b4210!important}
html[data-theme="light"] .v20-page-home .v22-action:nth-child(even) .v22-iconbox,html[data-theme="light"] .v20-page-more .v22-action:nth-child(even) .v22-iconbox{background:linear-gradient(145deg,#fff,#e1f3fa)!important;border-color:#bfdee5!important}
html[data-theme="light"] .v20-page-home .v20-bottom,html[data-theme="light"] .v20-page-more .v20-bottom{background:#ffffffed}
html[data-theme="light"] .v30-glossy-icon[data-govo-icon="account"]{filter:none}
@media(max-width:350px){.v20-page-home .v20-shell,.v20-page-more .v20-shell{padding-left:12px!important;padding-right:12px!important}.v20-page-home .v22-action,.v20-page-more .v22-action{font-size:14px!important}.v30-category b{font-size:13px}}
@media(min-width:700px){.v20-page-home .v22-action .v22-iconbox,.v20-page-more .v22-action .v22-iconbox,.v30-tile{width:94px!important;height:94px!important;border-radius:28px!important}.v22-action .v30-glossy-icon{width:76px;height:76px}.v30-category-grid,.v22-action-grid{column-gap:24px!important}.v20-page-home .v22-card-scroll{grid-auto-columns:minmax(230px,30%)!important}.v20-page-home .v22-provider-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(min-width:1024px){.v20-page-home .v20-shell,.v20-page-more .v20-shell{padding-bottom:40px!important}.v20-page-home .v22-action-grid,.v20-page-more .v22-action-grid{max-width:720px;margin:0 auto!important}.v30-category-grid{max-width:720px;margin:auto}.v20-page-home .v22-action{min-height:130px}.v20-page-home .v22-steps{grid-template-columns:repeat(4,minmax(0,1fr))}.v20-page-home .v22-trust-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;
