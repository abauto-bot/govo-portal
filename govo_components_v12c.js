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
    --govo-radius:${ui.radius};
    --govo-big-radius:${ui.bigRadius};
    --govo-shadow:${ui.shadow};
    --govo-fast:${ui.fastTransition};
    --govo-normal:${ui.normalTransition};
  }

  *{box-sizing:border-box}
  html{
    width:100%;
    min-width:100%;
    overflow-x:hidden;
    background:#fff;
  }
  body{
    margin:0;
    width:100%;
    min-width:100%;
    overflow-x:hidden;
    font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background:linear-gradient(180deg,#ffffff 0%,#f4f8f5 100%);
    color:var(--govo-dark);
  }

  a{text-decoration:none;color:inherit}
  button,input{font:inherit}

  .govo-page{
    width:100%;
    min-width:100%;
    min-height:100svh;
    display:block;
    background:
      radial-gradient(circle at 20% 0%, rgba(22,163,74,.08), transparent 28%),
      radial-gradient(circle at 90% 20%, rgba(4,122,61,.08), transparent 26%),
      #f7faf8;
  }

  .govo-phone{
    width:100%;
    max-width:none;
    min-height:100svh;
    background:#fff;
    position:relative;
    overflow:hidden;
    padding:10px 10px calc(76px + env(safe-area-inset-bottom, 0px));
    margin:0;
  }

  .govo-topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
    padding:6px 2px 10px;
  }

  .govo-icon-btn{
    width:38px;height:38px;
    border:1px solid #e8eee9;
    border-radius:14px;
    background:#fff;
    display:grid;
    place-items:center;
    box-shadow:0 8px 22px rgba(15,23,42,.06);
  }

  .govo-logo{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:3px;
    letter-spacing:-1px;
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
    background:var(--govo-primary);
  }
  .govo-logo .speed:before{top:1px;width:28px}
  .govo-logo .speed:after{bottom:1px;width:20px}
  .govo-logo .go{
    color:#050505;
  }
  .govo-logo .clock-o{
    width:27px;height:27px;
    border:6px solid var(--govo-primary);
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
    border-radius:18px;
    padding:16px;
    min-height:174px;
    overflow:hidden;
    color:#fff;
    background:
      radial-gradient(circle at 82% 28%, rgba(255,255,255,.28), transparent 22%),
      linear-gradient(135deg,#032414 0%,#04582b 54%,#16a34a 100%);
    box-shadow:var(--govo-shadow);
    animation:govoRise .42s ease both;
  }
  .govo-hero:before{
    content:"";
    position:absolute;
    width:155px;height:155px;
    right:-28px;top:-24px;
    border:12px solid rgba(255,255,255,.48);
    border-radius:50%;
  }
  .govo-hero:after{
    content:"GOVO";
    position:absolute;
    right:12px;bottom:28px;
    width:138px;height:74px;
    border-radius:80px 80px 30px 30px;
    background:linear-gradient(135deg,#18c45d,#087234);
    box-shadow:inset 0 -10px 0 rgba(0,0,0,.12), 0 18px 35px rgba(0,0,0,.20);
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:950;
    color:rgba(255,255,255,.9);
    letter-spacing:.06em;
  }

  .govo-hero .govo-rider{
    position:absolute;
    right:74px;
    bottom:80px;
    width:40px;
    height:40px;
    border-radius:50%;
    background:#d9f99d;
    border:5px solid #16a34a;
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
    background:#0b7a36;
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
    letter-spacing:-1.3px;
    font-weight:950;
  }
  .govo-hero p{
    margin:10px 0 13px;
    color:rgba(255,255,255,.88);
    font-size:14px;
  }
  .govo-primary-btn{
    border:0;
    background:linear-gradient(135deg,#17b94f,#078733);
    color:#fff;
    border-radius:14px;
    padding:10px 14px;
    font-weight:850;
    display:inline-flex;
    align-items:center;
    gap:8px;
    box-shadow:0 12px 24px rgba(22,163,74,.25);
  }
  .govo-primary-btn:active{transform:scale(.98)}

  .govo-search{
    margin:-20px 0 12px;
    position:relative;
    z-index:5;
    display:flex;
    gap:8px;
    align-items:center;
    background:#fff;
    border:1px solid #e9eee9;
    border-radius:18px;
    box-shadow:0 14px 28px rgba(15,23,42,.10);
    padding:8px 8px 8px 14px;
  }
  .govo-search input{
    flex:1;
    border:0;
    outline:0;
    color:#111;
    min-width:0;
  }
  .govo-mic{
    width:38px;height:38px;
    border:0;
    border-radius:50%;
    background:var(--govo-primary);
    color:#fff;
    display:grid;
    place-items:center;
    font-weight:900;
  }

  .govo-grid{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:8px;
  }
  .govo-service-card{
    min-height:72px;
    border:1px solid #edf1ed;
    background:#fff;
    border-radius:16px;
    box-shadow:0 10px 22px rgba(15,23,42,.045);
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:8px;
    transition:transform var(--govo-fast), box-shadow var(--govo-fast);
  }
  .govo-service-card:hover{
    transform:translateY(-2px);
    box-shadow:0 14px 28px rgba(15,23,42,.08);
  }
  .govo-service-icon{
    color:var(--govo-deep);
    font-size:25px;
    line-height:1;
  }

  .govo-svg-icon{
    width:26px;
    height:26px;
    color:var(--govo-deep);
    display:grid;
    place-items:center;
  }

  .govo-svg-icon svg{
    width:100%;
    height:100%;
  }
  .govo-service-label{
    font-size:11px;
    font-weight:800;
    text-align:center;
  }

  .govo-banner{
    margin-top:12px;
    border-radius:18px;
    padding:15px;
    min-height:102px;
    color:#fff;
    background:
      radial-gradient(circle at 86% 18%,rgba(255,255,255,.22),transparent 18%),
      linear-gradient(135deg,#052a17,#05622f);
    box-shadow:var(--govo-shadow);
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
  .govo-banner p{margin:0 0 14px;color:rgba(255,255,255,.82);font-size:13px}

  .govo-trust{
    margin-top:12px;
    margin-bottom:8px;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:8px;
  }
  .govo-trust-card{
    border:1px solid #edf1ed;
    border-radius:16px;
    background:#fff;
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
    color:#64748b;
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
    background:rgba(255,255,255,.97);
    backdrop-filter:blur(14px);
    border-top:1px solid #e9eee9;
    display:grid;
    grid-template-columns:repeat(5,1fr);
    align-items:end;
    padding:7px 8px calc(9px + env(safe-area-inset-bottom, 0px));
    z-index:50;
    box-shadow:0 -12px 28px rgba(15,23,42,.06);
  }
  .govo-nav-item{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    font-size:10px;
    font-weight:800;
    color:#111;
  }
  .govo-nav-item.active{color:var(--govo-primary)}
  .govo-nav-icon{font-size:19px}
  .govo-nav-go{
    width:54px;height:54px;
    margin-top:-25px;
    border-radius:50%;
    background:radial-gradient(circle at 30% 20%,#25d366,#047a3d);
    color:#fff;
    display:grid;
    place-items:center;
    font-weight:950;
    font-size:20px;
    box-shadow:0 18px 28px rgba(22,163,74,.35);
  }

  @keyframes govoRise{
    from{opacity:0;transform:translateY(14px)}
    to{opacity:1;transform:translateY(0)}
  }




  @media(max-width:390px){
    .govo-phone{padding:9px 9px calc(76px + env(safe-area-inset-bottom, 0px))}
    .govo-hero{min-height:166px;padding:15px}
    .govo-hero h1{font-size:27px}
    .govo-grid{gap:8px}
    .govo-service-card{min-height:68px}
    .govo-service-label{font-size:10px}
    .govo-banner{min-height:96px}
    .govo-trust{gap:7px}
    .govo-trust-card b{font-size:9.5px}
    .govo-trust-card span{font-size:8.5px}
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
