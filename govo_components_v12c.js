const BRAND = require("./govo_brand_v12c");

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function iconSvg(key) {
  const base = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const map = {
    delivery: `<svg ${base}><path d="M4 15h11"/><path d="M5 15l2-6h7l2 6"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><path d="M15 10h3l2 3v2h-4"/></svg>`,
    shops: `<svg ${base}><path d="M4 10h16l-1-5H5l-1 5Z"/><path d="M6 10v9h12v-9"/><path d="M9 19v-5h6v5"/></svg>`,
    services: `<svg ${base}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4"/><path d="M15 5l4 4"/></svg>`,
    ride: `<svg ${base}><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M7 17l4-8h3l3 8"/><path d="M11 9H8"/><path d="M14 9l2-3"/></svg>`,
    doctor: `<svg ${base}><path d="M7 4v7a5 5 0 0 0 10 0V4"/><path d="M5 4h4"/><path d="M15 4h4"/><path d="M12 16v2a3 3 0 0 0 6 0v-1"/><circle cx="18" cy="17" r="1"/></svg>`,
    home: `<svg ${base}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>`,
    agri: `<svg ${base}><path d="M12 21V10"/><path d="M12 10c-4 0-6-2-7-6 5 0 7 2 7 6Z"/><path d="M12 12c4 0 6-2 7-6-5 0-7 2-7 6Z"/></svg>`,
    more: `<svg ${base}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`,
    grid: `<svg ${base}><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>`,
    clock: `<svg ${base}><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/><path d="M3 12h2"/><path d="M19 12h2"/></svg>`,
    bolt: `<svg ${base}><path d="M13 2L5 14h6l-1 8 9-13h-6l0-7Z"/></svg>`,
    shield: `<svg ${base}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z"/><path d="M9 12l2 2 4-5"/></svg>`
  };
  return `<div class="govo-svg-icon">${map[key] || map.more}</div>`;
}

function govoCss() {
  const c = BRAND.colors;
  const ui = BRAND.ui;

  return `
  :root{
    --govo-primary:${c.primary};
    --govo-deep:${c.deep};
    --govo-dark:${c.dark};
    --govo-slate:${c.slate};
    --govo-soft:${c.soft};
    --govo-white:${c.white};
    --govo-danger:${c.danger};
    --govo-warning:${c.warning};
    --govo-bg:#000503;
    --govo-bg-2:#031811;
    --govo-glass:rgba(8,45,36,.82);
    --govo-glass-strong:rgba(13,70,54,.94);
    --govo-line:rgba(207,255,232,.30);
    --govo-line-strong:rgba(124,255,194,.54);
    --govo-text:#f8fff9;
    --govo-muted:#cfeadd;
    --govo-mint:#58f2ad;
    --govo-mint-2:#adffd8;
    --govo-gold:#e8c66d;
    --govo-ink:#02100b;
    --govo-radius:${ui.radius};
    --govo-big-radius:${ui.bigRadius};
    --govo-shadow:0 34px 104px rgba(0,0,0,.54);
    --govo-fast:${ui.fastTransition};
    --govo-normal:${ui.normalTransition};
  }

  *{box-sizing:border-box}
  html{
    width:100%;
    min-width:100%;
    overflow-x:hidden;
    background:var(--govo-bg);
  }
  body{
    margin:0;
    width:100%;
    min-width:100%;
    overflow-x:hidden;
    line-height:1.35;
    font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background:var(--govo-bg);
    color:var(--govo-text);
    -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility;
  }

  a{text-decoration:none;color:inherit}
  button,input{font:inherit}

  .govo-page{
    width:100%;
    min-width:100%;
    min-height:100svh;
    display:block;
    background:
      radial-gradient(circle at 14% -8%, rgba(88,242,173,.26), transparent 30%),
      radial-gradient(circle at 91% 1%, rgba(232,198,109,.18), transparent 24%),
      radial-gradient(circle at 50% 105%, rgba(17,115,84,.30), transparent 38%),
      linear-gradient(160deg,#000302 0%,#02100c 42%,#043326 100%);
  }

  .govo-page:before{
    content:"";
    position:fixed;
    inset:0;
    pointer-events:none;
    background:
      linear-gradient(rgba(255,255,255,.032) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.024) 1px, transparent 1px);
    background-size:42px 42px;
    mask-image:linear-gradient(to bottom, rgba(0,0,0,.72), transparent 76%);
  }

  .govo-phone{
    width:100%;
    max-width:500px;
    min-height:100svh;
    background:transparent;
    position:relative;
    overflow:visible;
    padding:16px 14px calc(94px + env(safe-area-inset-bottom, 0px));
    margin:0 auto;
    isolation:isolate;
  }

  .govo-topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
    padding:7px 2px 15px;
  }

  .govo-icon-btn{
    width:42px;height:42px;
    border:1px solid var(--govo-line);
    border-radius:15px;
    background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.060));
    color:var(--govo-text);
    display:grid;
    place-items:center;
    box-shadow:0 16px 42px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.12);
    backdrop-filter:blur(20px) saturate(1.08);
  }
  .govo-icon-btn:hover{border-color:var(--govo-line-strong);background:rgba(255,255,255,.14)}
  .govo-icon-btn:focus-visible,
  .govo-primary-btn:focus-visible,
  .flow-btn:focus-visible,
  .govo-service-card:focus-visible,
  .govo-nav-item:focus-visible{
    outline:3px solid rgba(173,255,216,.42);
    outline-offset:3px;
  }

  .govo-logo{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:3px;
    letter-spacing:0;
    font-weight:950;
    font-size:25px;
    line-height:1;
  }
  .govo-logo .speed{
    display:inline-block;
    width:28px;
    height:18px;
    position:relative;
    margin-right:-3px;
  }
  .govo-logo .speed:before,
  .govo-logo .speed:after{
    content:"";
    position:absolute;
    left:0;
    height:3px;
    border-radius:99px;
    background:#39e59b;
  }
  .govo-logo .speed:before{top:1px;width:28px}
  .govo-logo .speed:after{bottom:1px;width:20px}
  .govo-logo .go{
    color:#f7fff9;
  }
  .govo-logo .clock-o{
    width:27px;height:27px;
    border:6px solid #39e59b;
    background:#f7fff9;
    border-radius:50%;
    display:inline-block;
    position:relative;
    margin-left:1px;
  }
  .govo-logo .clock-o:before{
    content:"";
    position:absolute;
    width:2px;height:8px;
    background:#111;
    left:50%;top:4px;
    transform:translateX(-50%);
    border-radius:4px;
  }
  .govo-logo .clock-o:after{
    content:"";
    position:absolute;
    width:8px;height:2px;
    background:#111;
    left:50%;top:50%;
    transform:translateY(-50%);
    border-radius:4px;
  }

  .govo-hero{
    position:relative;
    border-radius:24px;
    padding:20px;
    min-height:196px;
    overflow:hidden;
    color:#fff;
    background:
      radial-gradient(circle at 82% 24%, rgba(88,242,173,.36), transparent 27%),
      radial-gradient(circle at 16% 0%, rgba(232,198,109,.20), transparent 31%),
      linear-gradient(135deg,#02100c 0%,#06372c 50%,#08724f 100%);
    border:1px solid rgba(207,255,232,.24);
    box-shadow:0 30px 86px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.13);
    animation:govoRise .42s ease both;
  }
  .govo-hero:before{
    content:"";
    position:absolute;
    width:155px;height:155px;
    right:-28px;top:-24px;
    border:12px solid rgba(255,255,255,.24);
    border-radius:50%;
  }
  .govo-hero:after{
    content:"GOVO";
    position:absolute;
    right:12px;bottom:30px;
    width:138px;height:74px;
    border-radius:80px 80px 30px 30px;
    background:linear-gradient(135deg,#39e59b,#087234);
    box-shadow:inset 0 -10px 0 rgba(0,0,0,.12), 0 18px 35px rgba(0,0,0,.20);
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:950;
    color:#f8fff9;
    letter-spacing:.06em;
  }

  .govo-hero .govo-rider{
    position:absolute;
    right:74px;
    bottom:80px;
    width:40px;
    height:40px;
    border-radius:50%;
    background:#ffe9aa;
    border:5px solid #39e59b;
    z-index:3;
    box-shadow:0 12px 22px rgba(0,0,0,.18);
  }

  .govo-hero .govo-rider:after{
    content:"";
    position:absolute;
    left:10px;
    top:31px;
    width:45px;
    height:24px;
    border-radius:18px;
    background:#0b704f;
    transform:rotate(-6deg);
  }
  .govo-hero-content{
    position:relative;
    z-index:2;
    max-width:230px;
  }
  .govo-eyebrow{
    font-size:12px;
    font-weight:900;
    letter-spacing:.08em;
    opacity:.92;
    margin-bottom:10px;
  }
  .govo-hero h1{
    margin:0;
    font-size:29px;
    line-height:.96;
    letter-spacing:0;
    font-weight:950;
  }
  .govo-hero p{
    margin:10px 0 13px;
    color:rgba(237,255,246,.94);
    font-size:14.5px;
    line-height:1.45;
  }
  .govo-primary-btn{
    border:0;
    background:linear-gradient(135deg,#c8ffe4,#39e59b 48%,#0ca66c);
    color:#02110a;
    border-radius:15px;
    padding:11px 15px;
    font-weight:950;
    display:inline-flex;
    align-items:center;
    gap:8px;
    box-shadow:0 16px 38px rgba(12,166,108,.34), inset 0 1px 0 rgba(255,255,255,.52);
  }
  .govo-primary-btn:active{transform:scale(.98)}

  .govo-search{
    margin:0 0 14px;
    position:relative;
    z-index:5;
    display:flex;
    gap:8px;
    align-items:center;
    background:linear-gradient(180deg,rgba(18,82,64,.95),rgba(4,22,17,.90));
    border:1px solid var(--govo-line-strong);
    border-radius:20px;
    box-shadow:0 24px 60px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.14);
    padding:10px 9px 10px 15px;
    backdrop-filter:blur(20px);
  }
  .govo-search span{color:var(--govo-mint-2);font-weight:950}
  .govo-search input{
    flex:1;
    border:0;
    outline:0;
    color:var(--govo-text);
    background:transparent;
    min-width:0;
    font-weight:750;
  }
  .govo-search input::placeholder{color:#a9cdbd}
  .govo-mic{
    width:38px;height:38px;
    border:0;
    border-radius:50%;
    background:linear-gradient(135deg,#58f2ad,#0ca66c);
    color:var(--govo-ink);
    display:grid;
    place-items:center;
    font-weight:900;
  }

  .govo-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:9px;
  }
  .govo-service-card{
    min-height:88px;
    border:1px solid rgba(207,255,232,.30);
    background:
      linear-gradient(180deg,rgba(255,255,255,.115),rgba(255,255,255,.030)),
      linear-gradient(180deg,rgba(20,91,71,.90),rgba(5,29,23,.84));
    color:var(--govo-text);
    border-radius:20px;
    box-shadow:0 24px 70px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.15);
    backdrop-filter:blur(22px) saturate(1.08);
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:9px;
    transition:transform var(--govo-fast), box-shadow var(--govo-fast);
  }
  .govo-service-card:hover{
    transform:translateY(-2px);
    box-shadow:0 24px 62px rgba(0,0,0,.30);
    border-color:rgba(57,229,155,.36);
  }
  .govo-service-icon{
    color:var(--govo-mint);
    font-size:25px;
    line-height:1;
  }

  .govo-svg-icon{
    width:26px;
    height:26px;
    color:var(--govo-mint);
    display:grid;
    place-items:center;
  }

  .govo-svg-icon svg{
    width:100%;
    height:100%;
  }
  .govo-service-label{
    font-size:11.8px;
    font-weight:850;
    text-align:center;
    line-height:1.2;
  }

  .govo-banner{
    margin-top:12px;
    border-radius:22px;
    padding:18px;
    min-height:112px;
    color:#fff;
    background:
      radial-gradient(circle at 86% 18%,rgba(57,229,155,.28),transparent 20%),
      radial-gradient(circle at 12% 0%,rgba(232,198,109,.14),transparent 28%),
      linear-gradient(135deg,#010c08,#063326 58%,#086548);
    border:1px solid rgba(207,255,232,.28);
    box-shadow:0 28px 72px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.11);
    position:relative;
    overflow:hidden;
  }
  .govo-banner:after{
    content:"";
    position:absolute;
    right:18px;bottom:16px;
    width:90px;height:52px;
    border-radius:14px 14px 8px 8px;
    background:
      linear-gradient(90deg,#fff 0 18%,#16a34a 18% 34%,#fff 34% 50%,#16a34a 50% 66%,#fff 66% 82%,#16a34a 82% 100%);
    opacity:.95;
    box-shadow:0 18px 30px rgba(0,0,0,.16);
  }
  .govo-banner h3{margin:0 0 5px;font-size:18px}
  .govo-banner p{margin:0 0 14px;color:rgba(237,255,246,.94);font-size:13.5px;line-height:1.5;max-width:70%}

  .govo-trust{
    margin-top:12px;
    margin-bottom:8px;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:8px;
  }
  .govo-trust-card{
    border:1px solid rgba(207,255,232,.30);
    border-radius:20px;
    background:
      linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.026)),
      linear-gradient(180deg,rgba(18,79,63,.88),rgba(5,29,23,.80));
    color:var(--govo-text);
    padding:9px 6px;
    text-align:center;
    min-height:72px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
  }

  .govo-trust-card .govo-svg-icon{
    width:22px;
    height:22px;
  }
  .govo-trust-card b{
    display:block;
    font-size:10px;
    margin-top:5px;
  }
  .govo-trust-card span{
    display:block;
    color:var(--govo-muted);
    font-size:9px;
    margin-top:2px;
    font-weight:700;
  }

  .govo-bottom-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    transform:none;
    width:100%;
    max-width:none;
    margin:0;
    background:linear-gradient(180deg,rgba(9,48,38,.97),rgba(1,10,7,.99));
    backdrop-filter:blur(24px) saturate(1.08);
    border-top:1px solid var(--govo-line);
    display:grid;
    grid-template-columns:repeat(5,1fr);
    align-items:end;
    padding:8px 9px calc(10px + env(safe-area-inset-bottom, 0px));
    z-index:50;
    box-shadow:0 -18px 48px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08);
  }
  .govo-nav-item{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    font-size:10px;
    font-weight:800;
    color:var(--govo-muted);
    border-radius:14px;
    min-height:48px;
    justify-content:center;
  }
  .govo-nav-item:hover{color:#f3fff8;background:rgba(255,255,255,.05)}
  .govo-nav-item.active{color:var(--govo-mint-2)}
  .govo-nav-item.active span{color:#f3fff8}
  .govo-nav-icon{font-size:19px}
  .govo-nav-go{
    width:54px;height:54px;
    margin-top:-25px;
    border-radius:50%;
    background:radial-gradient(circle at 30% 20%,#adffd8,#39e59b 44%,#047a3d);
    color:var(--govo-ink);
    display:grid;
    place-items:center;
    font-weight:950;
    font-size:20px;
    box-shadow:0 18px 32px rgba(34,230,138,.38), inset 0 1px 0 rgba(255,255,255,.55);
  }

  .flow-card,
  .wallet-hero,
  .map-box{
    border-color:rgba(207,255,232,.24)!important;
    background:
      linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.022)),
      linear-gradient(180deg,rgba(19,83,65,.82),rgba(4,25,20,.78))!important;
    box-shadow:0 24px 68px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.12)!important;
  }

  .flow-card b,
  .govo-banner h3,
  .wallet-balance{
    color:#fbfff8;
  }

  .flow-btn,
  .govo-primary-btn{
    letter-spacing:0;
    box-shadow:0 18px 42px rgba(12,166,108,.38), inset 0 1px 0 rgba(255,255,255,.62);
  }

  .flow-btn.light{
    background:rgba(255,255,255,.105);
    border-color:rgba(207,255,232,.24);
  }

  .flow-chip{
    background:rgba(255,255,255,.095);
    border-color:rgba(207,255,232,.22);
  }

  .mini-note,
  .flow-sub,
  .govo-trust-card span,
  .govo-banner p{
    color:#cfeadd;
  }

  @keyframes govoRise{
    from{opacity:0;transform:translateY(14px)}
    to{opacity:1;transform:translateY(0)}
  }




  @media(max-width:390px){
    .govo-phone{padding:10px 10px calc(80px + env(safe-area-inset-bottom, 0px))}
    .govo-hero{min-height:178px;padding:17px;border-radius:22px}
    .govo-hero h1{font-size:27px}
    .govo-grid{gap:8px}
    .govo-service-card{min-height:76px}
    .govo-service-label{font-size:10px}
    .govo-banner{min-height:96px}
    .govo-trust{gap:7px}
    .govo-trust-card b{font-size:9.5px}
    .govo-trust-card span{font-size:8.5px}
  }

  @media(min-width:760px){
    .govo-phone{padding-top:22px}
    .govo-bottom-nav{
      left:50%;
      right:auto;
      transform:translateX(-50%);
      width:min(480px,100%);
      border-left:1px solid var(--govo-line);
      border-right:1px solid var(--govo-line);
      border-radius:24px 24px 0 0;
    }
  }

  @media(max-width:360px){
    .govo-grid{gap:7px}
    .govo-hero h1{font-size:26px}
    .govo-phone{padding-left:8px;padding-right:8px;padding-bottom:calc(76px + env(safe-area-inset-bottom, 0px))}
  }
  `;
}

function logo() {
  return `
    <div class="govo-logo" aria-label="${esc(BRAND.name)}">
      <span class="speed"></span>
      <span class="go">GOV</span><span class="clock-o"></span>
    </div>
  `;
}

function topbar() {
  return `
    <header class="govo-topbar">
      <button class="govo-icon-btn" aria-label="Menu">☰</button>
      ${logo()}
      <button class="govo-icon-btn" aria-label="Notifications">⌁</button>
    </header>
  `;
}

function hero() {
  return `
    <section class="govo-hero">
      <div class="govo-rider"></div>
      <div class="govo-hero-content">
        <div class="govo-eyebrow">${esc(BRAND.hero.eyebrow)}</div>
        <h1>${esc(BRAND.hero.titleLine1)}<br>${esc(BRAND.hero.titleLine2)}</h1>
        <p>${esc(BRAND.hero.subtitle)}</p>
        <a class="govo-primary-btn" href="/order">${esc(BRAND.hero.primaryCta)} <span>→</span></a>
      </div>
    </section>
  `;
}

function searchBar() {
  return `
    <form class="govo-search" action="/services" method="get">
      <span>⌕</span>
      <input name="q" placeholder="Search services, shops..." />
      <button class="govo-mic" type="button" aria-label="Voice search">🎙</button>
    </form>
  `;
}

function serviceGrid() {
  return `
    <section class="govo-grid">
      ${BRAND.services.map(s => `
        <a class="govo-service-card" href="${esc(s.href)}">
          ${iconSvg(s.icon || s.key)}
          <div class="govo-service-label">${esc(s.label)}</div>
        </a>
      `).join("")}
    </section>
  `;
}

function merchantBanner() {
  return `
    <section class="govo-banner">
      <h3>${esc(BRAND.merchant.title)}</h3>
      <p>${esc(BRAND.merchant.subtitle)}</p>
      <a class="govo-primary-btn" href="${esc(BRAND.merchant.href)}">${esc(BRAND.merchant.cta)} →</a>
    </section>
  `;
}

function trustCards() {
  return `
    <section class="govo-trust">
      ${BRAND.trustCards.map(t => `
        <div class="govo-trust-card">
          ${iconSvg(t.icon)}
          <b>${esc(t.title)}</b>
          <span>${esc(t.subtitle)}</span>
        </div>
      `).join("")}
    </section>
  `;
}

function bottomNav(active = "home") {
  const icons = {
    home: "⌂",
    orders: "▤",
    go: "GO",
    support: "☏",
    account: "♙"
  };

  return `
    <nav class="govo-bottom-nav">
      ${BRAND.bottomNav.map(item => {
        const isGo = item.key === "go";
        return `
          <a class="govo-nav-item ${active === item.key ? "active" : ""}" href="${esc(item.href)}">
            ${isGo ? `<div class="govo-nav-go">GO</div>` : `<div class="govo-nav-icon">${esc(icons[item.key] || "•")}</div>`}
            <span>${esc(item.label)}</span>
          </a>
        `;
      }).join("")}
    </nav>
  `;
}

function appHomePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <title>${esc(BRAND.name)} — ${esc(BRAND.tagline)}</title>
  <style>${govoCss()}</style>
</head>
<body>
  <main class="govo-page">
    <div class="govo-phone">
      ${topbar()}
      ${hero()}
      ${searchBar()}
      ${serviceGrid()}
      ${merchantBanner()}
      ${trustCards()}
      ${bottomNav("home")}
    </div>
  </main>
</body>
</html>`;
}

module.exports = {
  BRAND,
  govoCss,
  logo,
  topbar,
  hero,
  searchBar,
  serviceGrid,
  merchantBanner,
  trustCards,
  bottomNav,
  appHomePage
};
