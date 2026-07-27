module.exports = `
:root{
  --bg:#06110d;
  --bg2:#0a1f17;
  --card:#0f2b20;
  --card2:#12382a;
  --text:#f7fff9;
  --muted:#b8d7c6;
  --line:rgba(180,255,214,.18);
  --brand:#b7ff2a;
  --brand2:#22c55e;
  --brandDeep:#0f7a3f;
}
*{box-sizing:border-box}
html,body{margin:0;background:linear-gradient(180deg,var(--bg),#020806);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}
a{text-decoration:none;color:inherit}
button,input,textarea,select{font:inherit}
.v20-shell{max-width:980px;margin:0 auto;min-height:100vh;padding:14px 14px 100px}
.v20-top{display:flex;align-items:center;justify-content:space-between;padding:8px 0 16px;position:sticky;top:0;z-index:30;background:linear-gradient(180deg,rgba(6,17,13,.96),rgba(6,17,13,.70),transparent);backdrop-filter:blur(14px)}
.v20-brand{display:flex;align-items:center;gap:10px}
.v20-brand img{width:48px;height:48px;object-fit:contain}
.v20-brand strong{display:block;font-size:18px;letter-spacing:.02em}
.v20-brand small{display:block;color:var(--muted);font-size:10px;margin-top:2px}
.v20-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:#fff;display:grid;place-items:center}
.v20-hero{border:1px solid var(--line);border-radius:28px;padding:24px;background:
radial-gradient(circle at 88% 18%,rgba(183,255,42,.16),transparent 28%),
linear-gradient(145deg,#0a1b14,#0d3426 55%,#0f5839);box-shadow:0 24px 70px rgba(0,0,0,.36)}
.v20-kicker{display:inline-flex;padding:7px 11px;border-radius:999px;border:1px solid rgba(183,255,42,.35);color:var(--brand);font-size:12px;font-weight:800}
.v20-hero h1{font-size:clamp(36px,8vw,62px);line-height:.98;margin:14px 0 12px}
.v20-hero p{color:var(--muted);font-size:15px;line-height:1.6;max-width:620px}
.v20-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.v20-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;border-radius:16px;background:linear-gradient(135deg,var(--brand),#70e52d);color:#102006;font-weight:900;border:0}
.v20-btn.secondary{background:rgba(255,255,255,.06);color:#fff;border:1px solid var(--line)}
.v20-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
.v20-card{border:1px solid var(--line);border-radius:20px;padding:16px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)),var(--card);min-height:116px}
.v20-card svg{width:30px;height:30px;color:#70f3a8}
.v20-card b{display:block;margin-top:14px;font-size:15px}
.v20-card span{display:block;color:var(--muted);font-size:12px;margin-top:4px}
.v20-search{margin-top:14px;border:1px solid var(--line);border-radius:18px;padding:12px 14px;background:#0b241a;display:flex;gap:10px;align-items:center}
.v20-search input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff}
.v20-search svg{width:20px;height:20px;flex:none}
.v20-bottom{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:min(720px,calc(100% - 20px));display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:8px;border:1px solid var(--line);border-radius:24px;background:rgba(5,20,14,.94);backdrop-filter:blur(18px);z-index:40}
.v20-nav{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:54px;border-radius:16px;color:#cbe8d7;font-size:11px;font-weight:800}
.v20-nav svg{width:20px;height:20px}
.v20-nav.active{background:rgba(183,255,42,.10);color:var(--brand)}
.v20-ai{position:relative}
.v20-ai-orb{width:58px;height:58px;border-radius:20px;background:#07110d;border:1px solid rgba(183,255,42,.55);display:grid;place-items:center;margin-top:-20px;box-shadow:0 14px 34px rgba(0,0,0,.4)}
.v20-ai-orb img{width:44px;height:44px;object-fit:contain}

/* GOVO V20 browse family: scoped list/chip/form components (shared tokens) */
.v20-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.v20-chips::-webkit-scrollbar{display:none}
.v20-chip{flex:none;display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:#fff;font-weight:800;font-size:13px;text-decoration:none;white-space:nowrap}
.v20-chip.active{background:rgba(183,255,42,.12);border-color:rgba(183,255,42,.45);color:var(--brand)}
.v20-section{display:flex;align-items:center;justify-content:space-between;margin:18px 0 10px}
.v20-section h2{margin:0;font-size:18px}
.v20-count{flex:none;font-size:12px;font-weight:900;color:var(--brand);border:1px solid rgba(183,255,42,.4);border-radius:999px;padding:4px 10px}
.v20-list{display:grid;gap:12px;margin:0}
.v20-rowcard{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--line);border-radius:20px;padding:14px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02)),var(--card)}
.v20-thumb{width:56px;height:56px;border-radius:16px;object-fit:cover;border:1px solid var(--line);background:#0b241a;flex:none;display:grid;place-items:center;color:var(--brand);overflow:hidden}
.v20-thumb svg{width:26px;height:26px}
.v20-rowbody{min-width:0;flex:1}
.v20-rowtitle{display:flex;align-items:center;justify-content:space-between;gap:10px}
.v20-rowtitle h3{margin:0;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v20-pill{flex:none;font-size:11px;font-weight:900;color:var(--brand);border:1px solid rgba(183,255,42,.4);border-radius:999px;padding:3px 9px;max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v20-meta{color:var(--muted);font-size:13px;margin-top:4px;line-height:1.5}
.v20-trust{color:#86efac;font-size:12px;font-weight:800;margin-top:4px}
.v20-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.v20-actions .v20-btn{padding:10px 14px;font-size:13px}
.v20-form label{display:block;margin:12px 0 6px;font-size:13px;color:var(--muted);font-weight:800}
.v20-form input,.v20-form textarea,.v20-form select{width:100%;box-sizing:border-box;background:#0b241a;border:1px solid var(--line);border-radius:14px;padding:12px 14px;color:#fff;font:inherit;outline:0}
.v20-form input:focus,.v20-form textarea:focus,.v20-form select:focus{border-color:rgba(183,255,42,.5)}
.v20-form input.v20-qty{width:76px}
.v20-check{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px;color:var(--muted)}
.v20-detail{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.v20-detail div{border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.03)}
.v20-detail b{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.v20-detail span{font-size:14px;font-weight:700}
.v20-back{display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-weight:800;font-size:13px;margin-bottom:12px}
.v20-cta{display:flex;gap:14px;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:24px;padding:18px;background:linear-gradient(135deg,rgba(183,255,42,.14),rgba(34,197,94,.06)),var(--card)}
.v20-cta-art{flex:none;width:72px;height:72px;border-radius:22px;background:#07110d;border:1px solid rgba(183,255,42,.55);display:grid;place-items:center;box-shadow:0 14px 34px rgba(0,0,0,.4)}
.v20-cta-art img{width:52px;height:52px;object-fit:contain}
.v20-alert{margin-top:14px;border:1px solid rgba(248,113,113,.38);border-radius:18px;padding:14px;background:rgba(127,29,29,.24);display:grid;gap:4px}.v20-alert b{color:#fecaca}.v20-alert span{color:#fee2e2;font-size:13px}.v20-code{margin:18px auto 0;max-width:420px;border:1px dashed rgba(183,255,42,.55);border-radius:20px;padding:16px;background:rgba(0,0,0,.18)}.v20-code small{display:block;color:var(--muted);font-weight:800}.v20-code strong{display:block;font-size:clamp(22px,6vw,34px);margin-top:6px;color:var(--brand);letter-spacing:.04em}.v20-form button:disabled{opacity:.45;cursor:not-allowed}
@media(max-width:700px){
  .v20-shell{padding:10px 10px 94px}
  .v20-grid{grid-template-columns:repeat(2,1fr)}
  .v20-hero{padding:18px;border-radius:24px}
  .v20-card{min-height:100px;padding:14px}
  .v20-detail{grid-template-columns:1fr}
  .v20-cta{padding:14px}
}

/* V20 market-ready marketplace filters */
.v20-market-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}
.v20-market-stats a{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:76px;border:1px solid var(--line);border-radius:18px;background:var(--card);text-decoration:none;color:var(--text)}
.v20-market-stats b{font-size:24px;color:var(--brand)}
.v20-market-stats span{font-size:12px;color:var(--muted);font-weight:800}
.v20-tabs{display:flex;gap:8px;overflow:auto;padding:2px 0 12px}
.v20-tabs a{white-space:nowrap;padding:11px 18px;border:1px solid var(--line);border-radius:999px;color:var(--text);text-decoration:none;font-weight:900;background:var(--card)}
.v20-tabs a.active{background:var(--brand);color:#07130b;border-color:var(--brand)}
.v20-filter-panel{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;padding:14px;border:1px solid var(--line);border-radius:20px;background:var(--card);margin-bottom:18px}
.v20-filter-field{display:flex;flex-direction:column;gap:6px;margin:0}
.v20-filter-field span{font-size:12px;color:var(--muted);font-weight:900}
.v20-filter-field select{width:100%;min-height:46px;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--text);padding:0 12px;font-weight:800}
.v20-filter-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap}
.v20-market-cta{margin-top:20px;text-align:center}
.v20-market-cta .v20-actions{justify-content:center}
@media(max-width:900px){.v20-filter-panel{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.v20-filter-panel{grid-template-columns:1fr}.v20-market-stats{grid-template-columns:repeat(3,1fr)}.v20-market-stats b{font-size:20px}}


/* GOVO V20 launch-ready home */
.v20-home-hero{padding-bottom:24px}.v20-home-search{margin-top:20px}.v20-home-pulse{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 24px}.v20-home-pulse a{border:1px solid var(--line);background:linear-gradient(180deg,rgba(27,87,66,.8),rgba(5,30,23,.9));border-radius:20px;padding:16px 10px;text-align:center}.v20-home-pulse b{display:block;color:var(--lime);font-size:24px}.v20-home-pulse span{display:block;color:var(--muted);font-weight:800;font-size:12px;margin-top:3px}.v20-section>a{color:var(--lime);font-weight:900}.v20-category-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.v20-category-grid a{min-height:92px;border:1px solid var(--line);border-radius:19px;background:rgba(15,60,47,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:10px}.v20-category-grid span{font-size:27px}.v20-category-grid b{font-size:12px}.v20-home-list{display:grid;gap:9px}.v20-home-listing{display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:11px;padding:12px;border:1px solid var(--line);border-radius:18px;background:rgba(11,49,38,.82)}.v20-home-avatar{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,var(--lime),#1cb16f);color:#032014;font-weight:950;font-size:20px}.v20-home-listing b,.v20-home-listing span{display:block}.v20-home-listing span{color:var(--muted);font-size:12px;margin-top:3px}.v20-home-listing em{font-style:normal;color:var(--lime);font-weight:900}.v20-home-how{margin-top:22px}.v20-home-how>div{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line)}.v20-home-how>div>span{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;background:var(--lime);color:#052013;font-weight:950}.v20-home-how p{margin:0}.v20-home-how small{display:block;color:var(--muted);margin-top:3px}.v20-home-trust{margin-top:14px;margin-bottom:24px}@media(max-width:560px){.v20-category-grid{grid-template-columns:repeat(4,1fr)}.v20-category-grid a{min-height:80px;padding:7px}.v20-category-grid b{font-size:11px}.v20-home-pulse{gap:7px}.v20-home-pulse a{padding:13px 6px}.v20-home-actions{grid-template-columns:repeat(2,1fr)}}

/* GOVO V20 CUSTOMER JOURNEY CONSISTENCY */
.v20-page-head{padding:10px 2px 18px}.v20-page-head h1{font-size:clamp(34px,8vw,54px);line-height:1.02;margin:10px 0}.v20-page-head p{color:var(--muted);max-width:650px;line-height:1.55}
.v20-service-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.v20-quick-tile{position:relative;display:flex;flex-direction:column;min-height:142px;padding:18px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)),var(--card);color:var(--text)}.v20-quick-tile svg{width:31px;height:31px;color:#70f3a8}.v20-quick-tile b{margin-top:20px;font-size:16px}.v20-quick-tile span{margin-top:5px;color:var(--muted);font-size:12px;line-height:1.4}.v20-quick-tile em{position:absolute;right:12px;top:12px;background:var(--accent);color:#07140b;font-style:normal;font-size:10px;font-weight:900;padding:4px 7px;border-radius:999px}
.v20-cta-strip{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:18px}.v20-cta-strip h2{margin:0 0 5px}.v20-cta-strip p{color:var(--muted);margin:0}
.v20-ai-search{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;border:1px solid var(--line);border-radius:20px;padding:10px 10px 10px 16px;background:#071d14}.v20-ai-search svg{width:22px}.v20-ai-search input{border:0!important;background:transparent!important;padding:10px 0!important;font-size:17px!important}.v20-ai-search button{border:0;border-radius:14px;background:var(--accent);font-weight:900;padding:13px 18px}.v20-ai-result{margin-top:16px}.v20-chip-wrap{display:flex;flex-wrap:wrap;gap:9px}.v20-chip-wrap a{border:1px solid var(--line);border-radius:999px;padding:10px 13px;color:var(--text);background:rgba(255,255,255,.035);font-size:13px}.v20-ai-note{margin-top:18px;min-height:0}.v20-ai-note p{color:var(--muted);line-height:1.5}
.v20-account-card{display:flex;align-items:center;gap:15px;min-height:0}.v20-account-avatar{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#a9ff3f,#43e59b);color:#082016;font-size:24px;font-weight:950}.v20-account-card h2,.v20-account-card p{margin:0}.v20-account-card p{color:var(--muted);margin-top:5px;line-height:1.45}.v20-activity-box{margin-top:14px;min-height:0}.v20-activity-box label{display:block;font-weight:800;margin:12px 0 8px}.v20-inline-form{display:grid;grid-template-columns:1fr auto;gap:10px}.v20-inline-form input{min-width:0}.v20-activity-box small{display:block;color:var(--muted);margin-top:10px}.v20-row-stack{display:grid;gap:9px}.v20-row-link{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:18px;color:var(--text);background:rgba(255,255,255,.035)}.v20-row-icon{width:40px;height:40px;border-radius:13px;display:grid!important;place-items:center;background:rgba(112,243,168,.08)}.v20-row-icon svg{width:21px;height:21px;color:#70f3a8}.v20-row-link b,.v20-row-link small{display:block}.v20-row-link small{color:var(--muted);margin-top:3px}.v20-row-link strong{font-size:26px;color:var(--muted)}
@media(max-width:700px){.v20-service-grid{grid-template-columns:repeat(2,1fr)}.v20-quick-tile{min-height:122px;padding:15px}.v20-cta-strip{align-items:flex-start;flex-direction:column}.v20-inline-form{grid-template-columns:1fr}.v20-home-hero h1{font-size:42px}.v20-home-hero{padding:18px}.v20-top{position:relative}.v20-home-pulse{grid-template-columns:repeat(3,1fr)}}


/* GOVO V22 premium visual system */
:root{--bg:#00110c;--bg2:#031a13;--card:#0c211a;--card2:#102a21;--text:#f7fbf8;--muted:#afc2b8;--line:rgba(164,230,193,.13);--lime:#b7ff24;--accent:#aaff22;--brand:#b7ff24;--shadow:0 16px 44px rgba(0,0,0,.26)}
html,body{background:radial-gradient(circle at 50% -10%,rgba(15,92,62,.19),transparent 32%),linear-gradient(180deg,#00110c,#000806 75%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.v20-shell{max-width:760px;padding:12px 12px 102px}
.v20-top{padding:7px 2px 12px;background:linear-gradient(180deg,rgba(0,17,12,.98),rgba(0,17,12,.9),rgba(0,17,12,0));}
.v20-brand img{width:42px;height:42px}.v20-brand strong{font-size:17px}.v20-brand small{font-size:8px;color:#a9d36d;font-weight:800}
.v20-top-actions{display:flex;gap:8px}.v20-icon-btn{width:40px;height:40px;border-radius:13px;background:#0a1d17;border-color:var(--line);position:relative}.v20-icon-btn svg{width:21px}.v20-badge{position:absolute;right:-3px;top:-4px;background:#ef4444;color:#fff;border:2px solid #00110c;width:18px;height:18px;border-radius:50%;font-size:10px;display:grid;place-items:center;font-weight:900}
.v22-location{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#0b1d17;border:1px solid var(--line);border-radius:14px;padding:11px 13px;margin-bottom:10px;color:#eaf5ef}.v22-location>span{display:flex;align-items:center;gap:8px;font-size:13px}.v22-location svg{width:17px;color:var(--lime)}
.v20-hero.v22-hero{padding:18px;border-radius:20px;background:radial-gradient(circle at 85% 15%,rgba(26,173,109,.18),transparent 26%),linear-gradient(145deg,#08241c,#06150f);box-shadow:var(--shadow)}
.v22-hero h1{font-size:32px;line-height:1.04;margin:0 0 12px}.v22-hero h1 em{display:block;color:var(--lime);font-style:normal}.v22-hero p{font-size:13px;line-height:1.5;margin-bottom:16px}
.v20-search{background:#071812;border-radius:14px;padding:11px 12px;margin-top:0}.v20-search input{font-size:13px}.v20-search svg{color:#d9eee3}
.v22-action-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0 4px}.v22-action{display:flex;flex-direction:column;align-items:center;gap:7px;text-align:center;font-size:11px;font-weight:700;position:relative}.v22-action .v22-iconbox{width:54px;height:50px;border-radius:15px;border:1px solid var(--line);background:linear-gradient(180deg,#10251e,#0a1713);display:grid;place-items:center;color:var(--lime);box-shadow:0 10px 22px rgba(0,0,0,.18)}.v22-action svg{width:25px;height:25px}.v22-action em{position:absolute;right:2px;top:-6px;background:var(--lime);color:#102006;border-radius:999px;padding:2px 6px;font-size:8px;font-style:normal;font-weight:900}
.v20-section{margin:19px 0 9px}.v20-section h2{font-size:15px}.v20-section>a{font-size:11px}
.v22-category-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.v22-category-strip a{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:10px;font-weight:700;text-align:center}.v22-category-strip span{width:45px;height:45px;border-radius:50%;display:grid;place-items:center;background:#10231d;border:1px solid var(--line);font-size:22px}
.v22-card-scroll{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(132px,38%);gap:9px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.v22-card-scroll::-webkit-scrollbar{display:none}.v22-shop-card{border:1px solid var(--line);border-radius:15px;background:#0b1c16;overflow:hidden}.v22-shop-cover{height:82px;background:linear-gradient(135deg,#173b2e,#0d2019);display:grid;place-items:center;color:var(--lime);font-size:28px;font-weight:950}.v22-shop-card .v22-pad{padding:9px}.v22-shop-card b{font-size:12px;display:block}.v22-shop-card small{display:block;color:var(--muted);font-size:9px;margin-top:3px}.v22-meta{font-size:9px;color:#d7e8df;margin-top:6px;display:flex;justify-content:space-between;gap:4px}.v22-star{color:#ffc928}
.v22-provider-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.v22-provider{background:#0b1c16;border:1px solid var(--line);border-radius:14px;padding:10px;min-height:106px}.v22-provider .avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#163c2d;color:#65f0ad;font-weight:900}.v22-provider b{font-size:11px;display:block;margin-top:8px}.v22-provider small{display:block;color:var(--muted);font-size:9px;margin-top:3px}
.v22-banner{margin-top:14px;border-radius:15px;padding:14px;background:linear-gradient(110deg,#07452e,#0f6e48);border:1px solid rgba(183,255,36,.18);display:flex;justify-content:space-between;align-items:center;gap:12px}.v22-banner h3{margin:0;font-size:13px}.v22-banner p{margin:4px 0 0;font-size:10px;color:#cae9d9}.v22-banner .gift{font-size:42px}
.v22-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center}.v22-step span{width:34px;height:34px;border-radius:50%;background:#3b2f05;color:#ffd033;display:grid;place-items:center;margin:auto;font-weight:900;border:1px solid rgba(255,208,51,.2)}.v22-step b{font-size:10px;display:block;margin-top:7px}.v22-step small{font-size:8px;color:var(--muted);display:block;margin-top:3px}
.v22-trust-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.v22-trust{background:#0b1c16;border:1px solid var(--line);border-radius:12px;padding:10px}.v22-trust b{font-size:10px;display:block;color:#dff5e8}.v22-trust small{font-size:8px;color:var(--muted);display:block;margin-top:4px}
.v20-bottom{bottom:7px;width:min(720px,calc(100% - 14px));padding:5px;border-radius:20px;background:rgba(3,18,13,.97)}.v20-nav{min-height:50px;font-size:9px}.v20-nav svg{width:18px}.v20-ai-orb{width:52px;height:52px;border-radius:17px;margin-top:-18px}.v20-ai-orb img{width:40px;height:40px}
.v22-page-title{text-align:center;padding:18px 0 12px}.v22-page-title h1{margin:0;font-size:27px}.v22-page-title p{margin:7px auto 0;color:var(--muted);font-size:12px;max-width:390px;line-height:1.5}
.v22-ai-search{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;background:#0b1c16;border:1px solid var(--line);border-radius:15px;padding:8px 9px 8px 13px}.v22-ai-search input{border:0;background:transparent;color:white;outline:0;min-width:0}.v22-mic{width:38px;height:38px;border-radius:50%;border:0;background:#184c39;color:#79f1b6;display:grid;place-items:center}.v22-suggestions{display:flex;flex-direction:column;align-items:flex-start;gap:8px}.v22-suggestions a{padding:9px 12px;border-radius:999px;background:#10241d;border:1px solid var(--line);font-size:11px}.v22-popular-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.v22-popular{min-height:122px;padding:14px;background:#0b1c16;border:1px solid var(--line);border-radius:15px}.v22-popular svg{width:28px;color:#62efab}.v22-popular b{display:block;font-size:13px;margin-top:12px}.v22-popular small{display:block;color:var(--muted);font-size:10px;margin-top:5px;line-height:1.5}
.v22-account-guest{background:#0b1c16;border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center}.v22-account-guest .avatar{width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#b6ffce,#5be99f);color:#07150f}.v22-account-guest h2{font-size:15px;margin:0}.v22-account-guest p{font-size:10px;color:var(--muted);margin:5px 0 0;line-height:1.5}.v22-auth-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:8px}.v22-auth-actions a{padding:11px;text-align:center;border-radius:12px;background:var(--lime);color:#0b1b0f;font-size:11px;font-weight:900}.v22-auth-actions a.secondary{background:#15251f;color:#fff;border:1px solid var(--line)}
.v22-group{margin-top:13px;background:#0b1c16;border:1px solid var(--line);border-radius:16px;padding:10px}.v22-group h2{font-size:13px;margin:3px 4px 8px}.v20-row-link{border:0;border-top:1px solid var(--line);border-radius:0;background:transparent;padding:11px 4px}.v20-row-link:first-of-type{border-top:0}.v20-row-icon{background:transparent!important;width:32px;height:32px}.v20-row-link b{font-size:11px}.v20-row-link small{font-size:9px}.v20-row-link strong{font-size:20px}
@media(max-width:430px){.v22-action-grid{gap:7px}.v22-action .v22-iconbox{width:50px;height:48px}.v22-category-strip{gap:5px}.v22-category-strip span{width:42px;height:42px}.v22-provider-grid{gap:6px}.v22-shop-cover{height:76px}}



/* GOVO V23 theme + language settings */
html[data-theme="light"]{
  --bg:#f4f8f5;--bg2:#e8f1eb;--card:#ffffff;--card2:#f1f7f3;--text:#102019;
  --muted:#61746a;--line:rgba(21,66,45,.16);--shadow:0 14px 36px rgba(20,65,43,.11)
}
html[data-theme="light"],html[data-theme="light"] body{
  background:radial-gradient(circle at 50% -10%,rgba(94,218,143,.18),transparent 34%),linear-gradient(180deg,#f8fbf9,#edf5f0 76%);color:var(--text)
}
html[data-theme="light"] .v20-top{background:linear-gradient(180deg,rgba(248,251,249,.98),rgba(248,251,249,.9),rgba(248,251,249,0))}
html[data-theme="light"] .v20-icon-btn,html[data-theme="light"] .v22-location,html[data-theme="light"] .v20-search,
html[data-theme="light"] .v22-action .v22-iconbox,html[data-theme="light"] .v22-category-strip span,
html[data-theme="light"] .v22-shop-card,html[data-theme="light"] .v22-provider,
html[data-theme="light"] .v22-popular,html[data-theme="light"] .v22-account-guest,
html[data-theme="light"] .v22-group,html[data-theme="light"] .v20-card,
html[data-theme="light"] .v20-rowcard,html[data-theme="light"] .v20-filter-panel,
html[data-theme="light"] .v20-market-stats a,html[data-theme="light"] .v20-tabs a,
html[data-theme="light"] .v20-row-link{background:#fff;color:var(--text)}
html[data-theme="light"] .v20-hero.v22-hero,html[data-theme="light"] .v20-hero{
  background:radial-gradient(circle at 86% 16%,rgba(183,255,36,.28),transparent 27%),linear-gradient(145deg,#f9fffb,#dff5e8 58%,#bce8cf);color:#102019
}
html[data-theme="light"] .v20-search input,html[data-theme="light"] .v22-ai-search input,
html[data-theme="light"] .v20-form input,html[data-theme="light"] .v20-form textarea,
html[data-theme="light"] .v20-form select,html[data-theme="light"] .v20-filter-field select{color:#102019;background:#f5faf7}
html[data-theme="light"] .v20-btn.secondary,html[data-theme="light"] .v22-auth-actions a.secondary{color:#102019;background:#edf5f0}
html[data-theme="light"] .v20-bottom{background:rgba(249,252,250,.97);box-shadow:0 10px 35px rgba(17,55,37,.16)}
html[data-theme="light"] .v20-nav{color:#50665a}
html[data-theme="light"] .v20-nav.active{color:#315b13;background:rgba(138,211,37,.18)}
html[data-theme="light"] .v20-ai-orb{background:#fff}
html[data-theme="light"] .v22-shop-cover{background:linear-gradient(135deg,#d8f2e2,#b8dfc8)}
html[data-theme="light"] .v22-trust{background:#fff}
html[data-theme="light"] .v20-chip,html[data-theme="light"] .v22-suggestions a{background:#fff;color:#102019}
html[data-theme="light"] .v20-code{background:#f4faf6}

.v23-settings{position:fixed;inset:0;z-index:100;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.58);backdrop-filter:blur(7px);padding:12px}
.v23-settings.open{display:flex}
.v23-sheet{width:min(520px,100%);border:1px solid var(--line);border-radius:25px;background:var(--card);box-shadow:0 28px 80px rgba(0,0,0,.42);padding:18px;max-height:85vh;overflow:auto}
.v23-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.v23-sheet-head h2{margin:0;font-size:20px}.v23-close{width:38px;height:38px;border-radius:12px;border:1px solid var(--line);background:transparent;color:var(--text);font-size:22px}
.v23-setting-block{margin-top:16px}.v23-setting-block h3{margin:0 0 9px;font-size:14px}.v23-options{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.v23-option{border:1px solid var(--line);border-radius:15px;padding:13px 8px;background:rgba(255,255,255,.035);color:var(--text);font-weight:850;text-align:center;cursor:pointer}
.v23-option small{display:block;color:var(--muted);font-weight:600;margin-top:4px}.v23-option.active{border-color:var(--brand);box-shadow:0 0 0 2px rgba(183,255,36,.13);color:var(--brand)}
.v23-settings-link{cursor:pointer}
html[lang="bn"] body{font-family:"Noto Sans Bengali","Hind Siliguri",Inter,system-ui,sans-serif}
@media(max-width:430px){.v23-options{grid-template-columns:1fr}.v23-option{display:flex;align-items:center;justify-content:space-between;text-align:left;padding:12px 14px}.v23-option small{margin:0}}


/* GOVO V24 refined light theme — stronger contrast, calmer brand color */
html[data-theme="light"]{
  --bg:#f3f7f4;
  --bg2:#e7efea;
  --card:#ffffff;
  --card2:#f7faf8;
  --text:#13231b;
  --muted:#607067;
  --line:rgba(24,65,45,.18);
  --lime:#79b900;
  --accent:#91d600;
  --brand:#79b900;
  --brand2:#15945a;
  --shadow:0 12px 30px rgba(18,61,39,.10);
}
html[data-theme="light"],html[data-theme="light"] body{
  background:
    radial-gradient(circle at 88% 4%,rgba(145,214,0,.08),transparent 25%),
    linear-gradient(180deg,#f7faf8 0%,#eef4f0 72%,#e9f0ec 100%);
  color:var(--text);
}
html[data-theme="light"] .v20-shell{color:var(--text)}
html[data-theme="light"] .v20-top{
  background:linear-gradient(180deg,rgba(247,250,248,.99),rgba(247,250,248,.94),rgba(247,250,248,0));
}
html[data-theme="light"] .v20-brand strong,
html[data-theme="light"] h1,html[data-theme="light"] h2,html[data-theme="light"] h3,
html[data-theme="light"] b,html[data-theme="light"] strong{color:var(--text)}
html[data-theme="light"] .v20-brand small{color:#64823d}
html[data-theme="light"] .v20-icon-btn,
html[data-theme="light"] .v22-location,
html[data-theme="light"] .v20-search,
html[data-theme="light"] .v22-action .v22-iconbox,
html[data-theme="light"] .v22-category-strip span,
html[data-theme="light"] .v22-shop-card,
html[data-theme="light"] .v22-provider,
html[data-theme="light"] .v22-popular,
html[data-theme="light"] .v22-account-guest,
html[data-theme="light"] .v22-group,
html[data-theme="light"] .v20-card,
html[data-theme="light"] .v20-rowcard,
html[data-theme="light"] .v20-filter-panel,
html[data-theme="light"] .v20-market-stats a,
html[data-theme="light"] .v20-tabs a,
html[data-theme="light"] .v20-row-link,
html[data-theme="light"] .v22-trust{
  background:#fff;
  color:var(--text);
  border-color:var(--line);
  box-shadow:0 5px 18px rgba(18,61,39,.055);
}
html[data-theme="light"] .v20-hero.v22-hero,
html[data-theme="light"] .v20-hero{
  background:
    radial-gradient(circle at 90% 10%,rgba(145,214,0,.14),transparent 29%),
    linear-gradient(145deg,#ffffff 0%,#f0f8f3 56%,#e2f1e8 100%);
  color:var(--text);
  border-color:rgba(40,107,70,.20);
  box-shadow:0 10px 26px rgba(18,61,39,.09);
}
html[data-theme="light"] .v22-hero h1 em,
html[data-theme="light"] .v20-section>a,
html[data-theme="light"] .v20-kicker,
html[data-theme="light"] .v20-count,
html[data-theme="light"] .v22-action .v22-iconbox,
html[data-theme="light"] .v22-location svg,
html[data-theme="light"] .v20-row-icon svg,
html[data-theme="light"] .v22-popular svg{
  color:#679f00;
}
html[data-theme="light"] .v20-search{
  background:#fff;
  box-shadow:inset 0 0 0 1px rgba(24,65,45,.03);
}
html[data-theme="light"] .v20-search input,
html[data-theme="light"] .v22-ai-search input,
html[data-theme="light"] .v20-form input,
html[data-theme="light"] .v20-form textarea,
html[data-theme="light"] .v20-form select,
html[data-theme="light"] .v20-filter-field select{
  color:var(--text);
  background:#f8fbf9;
  border-color:rgba(24,65,45,.18);
}
html[data-theme="light"] input::placeholder,
html[data-theme="light"] textarea::placeholder{color:#7d8c84;opacity:1}
html[data-theme="light"] .v22-action .v22-iconbox{
  background:linear-gradient(180deg,#fff,#f5f9f6);
  box-shadow:0 7px 18px rgba(24,65,45,.10);
}
html[data-theme="light"] .v22-category-strip span{
  background:#fff;
  box-shadow:0 5px 14px rgba(24,65,45,.08);
}
html[data-theme="light"] .v22-shop-cover{
  background:linear-gradient(135deg,#d9eee1,#c4e3d0);
  color:#5d9300;
}
html[data-theme="light"] .v22-banner{
  background:linear-gradient(110deg,#0d6b47,#15945a);
  color:#fff;
}
html[data-theme="light"] .v22-banner h3,
html[data-theme="light"] .v22-banner b{color:#fff}
html[data-theme="light"] .v22-banner p{color:#dff7e9}
html[data-theme="light"] .v22-trust b{color:var(--text)}
html[data-theme="light"] .v20-btn,
html[data-theme="light"] .v22-auth-actions a{
  background:linear-gradient(135deg,#a8ed18,#83c900);
  color:#142400;
  box-shadow:0 6px 16px rgba(108,164,0,.20);
}
html[data-theme="light"] .v20-btn.secondary,
html[data-theme="light"] .v22-auth-actions a.secondary{
  color:var(--text);
  background:#f3f7f4;
  border-color:rgba(24,65,45,.18);
  box-shadow:none;
}
html[data-theme="light"] .v20-bottom{
  background:rgba(255,255,255,.96);
  border-color:rgba(24,65,45,.16);
  box-shadow:0 8px 28px rgba(18,61,39,.15);
}
html[data-theme="light"] .v20-nav{color:#51655a}
html[data-theme="light"] .v20-nav svg{color:#52685c}
html[data-theme="light"] .v20-nav.active{
  color:#527f00;
  background:rgba(126,185,0,.14);
}
html[data-theme="light"] .v20-nav.active svg{color:#5d9100}
html[data-theme="light"] .v20-ai-orb{
  background:#fff;
  border-color:rgba(111,169,0,.45);
  box-shadow:0 8px 24px rgba(18,61,39,.17);
}
html[data-theme="light"] .v20-chip,
html[data-theme="light"] .v22-suggestions a{
  background:#fff;
  color:var(--text);
  border-color:var(--line);
}
html[data-theme="light"] .v20-chip.active,
html[data-theme="light"] .v20-tabs a.active{
  background:#83c900;
  color:#132300;
  border-color:#83c900;
}
html[data-theme="light"] .v20-meta,
html[data-theme="light"] .v20-card span,
html[data-theme="light"] .v20-row-link small,
html[data-theme="light"] .v22-shop-card small,
html[data-theme="light"] .v22-provider small,
html[data-theme="light"] .v22-popular small,
html[data-theme="light"] .v22-account-guest p,
html[data-theme="light"] .v22-step small,
html[data-theme="light"] .v22-trust small{color:var(--muted)}
html[data-theme="light"] .v22-meta{color:#52665b}
html[data-theme="light"] .v20-row-link strong{color:#718078}
html[data-theme="light"] .v23-sheet{background:#fff;border-color:var(--line)}
html[data-theme="light"] .v23-option{background:#f7faf8;color:var(--text)}
html[data-theme="light"] .v23-option.active{
  color:#527f00;
  border-color:#79b900;
  background:#f2fae6;
  box-shadow:0 0 0 2px rgba(121,185,0,.12);
}

`;

/* GOVO V22 PREMIUM CUSTOMER UI OVERRIDES */
