const ui = require("./govo_components_v12c");
const BRAND = require("./govo_brand_v12c");
const DATA = require("./govo_data_v12c");
const VISUAL = require("./govo_visual_v12f");

function esc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function href(base, page) {
  if (base) return page === "app" ? base : `${base}/${page}`;
  return page === "app" ? "/app" : `/${page}`;
}

function svg(key) {
  const base = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    delivery: `<svg ${base}><path d="M4 15h11"/><path d="M5 15l2-6h7l2 6"/><circle cx="7" cy="18" r="2"/><circle cx="16" cy="18" r="2"/><path d="M15 10h3l2 3v2h-4"/></svg>`,
    shops: `<svg ${base}><path d="M4 10h16l-1-5H5l-1 5Z"/><path d="M6 10v9h12v-9"/><path d="M9 19v-5h6v5"/></svg>`,
    services: `<svg ${base}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4"/><path d="M15 5l4 4"/></svg>`,
    ride: `<svg ${base}><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M7 17l4-8h3l3 8"/><path d="M11 9H8"/><path d="M14 9l2-3"/></svg>`,
    doctor: `<svg ${base}><path d="M7 4v7a5 5 0 0 0 10 0V4"/><path d="M5 4h4"/><path d="M15 4h4"/><path d="M12 16v2a3 3 0 0 0 6 0v-1"/></svg>`,
    home: `<svg ${base}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>`,
    agri: `<svg ${base}><path d="M12 21V10"/><path d="M12 10c-4 0-6-2-7-6 5 0 7 2 7 6Z"/><path d="M12 12c4 0 6-2 7-6-5 0-7 2-7 6Z"/></svg>`,
    more: `<svg ${base}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`,
    order: `<svg ${base}><path d="M6 3h12v18H6z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h4"/></svg>`,
    wallet: `<svg ${base}><path d="M4 7h16v12H4z"/><path d="M16 12h4"/><path d="M7 7V5h10v2"/></svg>`,
    account: `<svg ${base}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    support: `<svg ${base}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M5 13v4h3v-5H5z"/><path d="M16 12v5h3v-4h-3z"/><path d="M16 19c-1 1-2 1-4 1"/></svg>`,
    track: `<svg ${base}><path d="M4 18c4-10 12 2 16-8"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="10" r="2"/></svg>`,
    bolt: `<svg ${base}><path d="M13 2L5 14h6l-1 8 9-13h-6l0-7Z"/></svg>`,
    shield: `<svg ${base}><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z"/><path d="M9 12l2 2 4-5"/></svg>`,
    clock: `<svg ${base}><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>`,
    grid: `<svg ${base}><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>`
  };
  return `<span class="flow-svg">${icons[key] || icons.more}</span>`;
}

const FALLBACK_SERVICES = [
  ["Cleaning", "Home cleaning & helper", "services"],
  ["Plumbing", "Pipe, tap, bathroom repair", "services"],
  ["Electrician", "Light, fan, wiring support", "bolt"],
  ["AC Repair", "AC service & technician", "services"],
  ["Car Wash", "Bike/car cleaning", "ride"],
  ["Painting", "Room & house painting", "services"],
  ["Carpentry", "Furniture repair", "services"],
  ["Pest Control", "Home safety service", "shield"],
  ["Doctor", "Appointment & health help", "doctor"],
  ["Agri Service", "Farm support & advice", "agri"],
  ["Home Service", "Local home help", "home"],
  ["More", "Request custom service", "more"]
];

const services = (DATA.services && DATA.services.length)
  ? DATA.services.map(x => [x.name || "Local Service", x.subtitle || x.category || "GOVO service", x.icon || "services", x])
  : FALLBACK_SERVICES;

const FALLBACK_SHOPS = [
  ["Meherpur Super Shop", "Grocery, Daily Needs", "Open", "4.8", "2.5 km"],
  ["Fresh Mart", "Grocery, Fruits, Vegetables", "Open", "4.7", "1.8 km"],
  ["Rafiq Pharmacy", "Medicine, Healthcare", "Open", "4.9", "1.2 km"],
  ["Food Plaza", "Restaurant, Fast Food", "Open", "4.6", "2.0 km"]
];

const shops = (DATA.shops && DATA.shops.length)
  ? DATA.shops.map(x => [
      x.name || "Local Shop",
      x.subtitle || x.category || "GOVO Partner",
      x.status || "Open",
      x.rating || "4.8",
      x.distance || x.area || "Nearby",
      x
    ])
  : FALLBACK_SHOPS;

const PROFILE_FALLBACKS = [
  { name: "Profile 1", subtitle: "Demo customer profile · Meherpur", status: "Ready" },
  { name: "Profile 2", subtitle: "Demo service profile · Gangni", status: "Ready" }
];

const ORDER_FALLBACKS = [
  { id: "#GOVO-DEMO-1", title: "Profile 1 Delivery", status: "Ready", amount: "৳120", pickup: "Meherpur", dropoff: "Gangni" },
  { id: "#GOVO-DEMO-2", title: "Profile 2 Service", status: "Pending", amount: "৳150", pickup: "Bamundi", dropoff: "Mujibnagar" }
];

function extraCss() {
  return `
  .flow-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px 16px}
  .flow-title{font-size:27px;line-height:1.05;margin:0;font-weight:950;letter-spacing:0;color:var(--govo-text)}
  .flow-sub{margin:7px 0 0;color:var(--govo-muted);font-size:13.5px;font-weight:700;line-height:1.45}
  .flow-card{border:1px solid rgba(207,255,232,.30);background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.028)),linear-gradient(180deg,rgba(22,88,70,.88),rgba(5,28,23,.82));color:var(--govo-text);border-radius:20px;box-shadow:0 26px 76px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.15);padding:16px;backdrop-filter:blur(24px) saturate(1.08)}
  .flow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
  .flow-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .flow-list{display:flex;flex-direction:column;gap:10px}
  .flow-row{display:flex;align-items:center;gap:12px}
  .flow-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .flow-svg{width:30px;height:30px;color:var(--govo-mint);display:inline-grid;place-items:center}
  .flow-svg svg{width:100%;height:100%}
  .flow-chip-row{display:flex;gap:8px;overflow:auto;padding:2px 0 12px}
  .flow-chip{white-space:nowrap;border:1px solid var(--govo-line);border-radius:999px;padding:8px 12px;font-size:12px;font-weight:850;background:rgba(255,255,255,.12);color:#e8fff4;box-shadow:inset 0 1px 0 rgba(255,255,255,.10)}
  .flow-chip.active{background:linear-gradient(135deg,#adffd8,#39e59b);color:var(--govo-ink);border-color:#78f5ba}
  .flow-btn{border:0;background:linear-gradient(135deg,#d6ffea,#39e59b 46%,#0ca66c);color:var(--govo-ink);border-radius:15px;padding:12px 15px;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 16px 36px rgba(12,166,108,.34), inset 0 1px 0 rgba(255,255,255,.55)}
  .flow-btn.light{background:rgba(255,255,255,.11);color:var(--govo-text);border:1px solid var(--govo-line)}
  .flow-input{border:1px solid rgba(207,255,232,.30);background:rgba(1,12,9,.66);border-radius:16px;padding:13px 14px;width:100%;font-weight:750;color:var(--govo-text);outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
  .flow-input:focus{border-color:var(--govo-line-strong);box-shadow:0 0 0 4px rgba(88,242,173,.10)}
  .flow-input::placeholder{color:#93b9a8}
  .flow-field{display:flex;flex-direction:column;gap:6px}
  .flow-label{font-size:12px;color:var(--govo-muted);font-weight:850}
  .shop-thumb{width:60px;height:60px;border-radius:18px;background:linear-gradient(135deg,#0b3e31,#d6ffea 48%,#39e59b);display:grid;place-items:center;color:var(--govo-ink);font-weight:950;flex:none;box-shadow:0 16px 34px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.54)}
  .status{font-size:12px;font-weight:900;color:var(--govo-mint-2)}
  .price{font-weight:950}
  .map-box{height:250px;border-radius:20px;background:linear-gradient(135deg,rgba(9,43,35,.86),rgba(2,16,12,.96));position:relative;overflow:hidden;border:1px solid var(--govo-line);box-shadow:0 20px 54px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.08)}
  .map-line{position:absolute;left:20%;top:52%;width:60%;height:5px;background:linear-gradient(90deg,#adffd8,#39e59b);border-radius:20px;transform:rotate(-22deg)}
  .pin-a,.pin-b{position:absolute;width:24px;height:24px;border-radius:50%;background:#39e59b;border:5px solid #f7fff9;box-shadow:0 8px 18px rgba(0,0,0,.22)}
  .pin-a{left:16%;top:60%}.pin-b{right:16%;top:31%;background:#ef4444}
  .wallet-hero{border-radius:22px;padding:18px;color:var(--govo-text);background:linear-gradient(135deg,#02100c,#073f32 58%,#0b704f);border:1px solid var(--govo-line);box-shadow:0 24px 62px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08)}
  .wallet-balance{font-size:32px;font-weight:950;margin-top:8px}
  .mini-note{font-size:12px;color:var(--govo-muted);font-weight:750;line-height:1.5}
  .flow-page-gap{display:flex;flex-direction:column;gap:12px}
  .flow-card:hover{border-color:rgba(88,242,173,.40)}
  .flow-card.flow-row,
  .flow-card.flow-between{
    min-height:74px;
  }
  .flow-card > b,.flow-row b,.flow-between b{font-size:15px;line-height:1.25}
  .flow-grid-2 .flow-card{min-height:104px}
  .govo-topbar{
    position:sticky;
    top:0;
    z-index:30;
    margin:0 -6px 2px;
    padding:9px 6px 14px;
    background:linear-gradient(180deg,rgba(0,5,3,.86),rgba(0,5,3,.42) 72%,transparent);
    backdrop-filter:blur(18px);
  }
  .govo-icon-btn{
    color:#ecfff5;
    font-weight:950;
  }
  .govo-hero-v12f,
  .govo-banner,
  .flow-card,
  .govo-service-card,
  .govo-trust-card,
  .govo-quick-action,
  .govo-search,
  .wallet-hero,
  .map-box{
    border-color:rgba(202,255,229,.34)!important;
    box-shadow:0 24px 70px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.15)!important;
  }
  .govo-hero-v12f,
  .govo-banner{
    background:
      radial-gradient(circle at 86% 18%,rgba(88,242,173,.34),transparent 27%),
      radial-gradient(circle at 13% 3%,rgba(232,198,109,.18),transparent 28%),
      linear-gradient(145deg,#000604 0%,#031b14 45%,#075a42 100%)!important;
  }
  .govo-service-card,
  .govo-trust-card,
  .govo-quick-action,
  .flow-card{
    background:
      linear-gradient(180deg,rgba(255,255,255,.115),rgba(255,255,255,.030)),
      linear-gradient(180deg,rgba(15,75,58,.88),rgba(2,18,14,.82))!important;
  }
  .flow-card,
  .govo-service-card,
  .govo-trust-card,
  .govo-quick-action{
    backdrop-filter:blur(22px) saturate(1.1);
  }
  .govo-search{
    margin-top:2px;
    background:
      linear-gradient(180deg,rgba(23,96,75,.96),rgba(3,20,15,.92))!important;
  }
  .govo-service-label,
  .flow-card,
  .flow-card span,
  .flow-card input,
  .flow-card label{
    text-shadow:0 1px 1px rgba(0,0,0,.18);
  }
  .mini-note,
  .flow-sub,
  .govo-quick-action span,
  .govo-trust-card span{
    color:#d8f4e6!important;
  }
  .flow-btn,
  .govo-primary-btn,
  .govo-hero-cta{
    background:linear-gradient(135deg,#e4fff0 0%,#63f5b7 42%,#0aae74 100%)!important;
    color:#03120d!important;
    border:0!important;
    box-shadow:0 18px 44px rgba(24,213,133,.36), inset 0 1px 0 rgba(255,255,255,.68)!important;
  }
  .flow-btn.light{
    background:rgba(255,255,255,.12)!important;
    color:#f5fff9!important;
    border:1px solid rgba(202,255,229,.32)!important;
  }
  .flow-chip{
    color:#ecfff5;
    background:rgba(255,255,255,.115);
  }
  .flow-chip.active{
    color:#03120d;
  }
  .govo-bottom-nav{
    background:linear-gradient(180deg,rgba(10,54,42,.97),rgba(0,8,5,.99))!important;
    border-color:rgba(202,255,229,.30)!important;
  }
  .govo-nav-item{
    min-width:0;
  }
  .govo-nav-item span{
    max-width:100%;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  @media(max-width:380px){
    .flow-grid{grid-template-columns:repeat(2,1fr)}
    .flow-grid-2{gap:9px}
    .flow-title{font-size:25px}
  }
  `;
}

function bottomNav(active, base) {
  const nav = [
    ["home", "Home", "app", "home"],
    ["orders", "Orders", "orders", "order"],
    ["go", "GO", "app", "go"],
    ["support", "Support", "support", "support"],
    ["account", "Account", "account", "account"]
  ];
  return `
  <nav class="govo-bottom-nav">
    ${nav.map(([key,label,page,icon]) => `
      <a class="govo-nav-item ${active === key ? "active" : ""}" href="${href(base,page)}">
        ${key === "go" ? `<div class="govo-nav-go">GO</div>` : `<div class="govo-nav-icon">${svg(icon)}</div>`}
        <span>${esc(label)}</span>
      </a>
    `).join("")}
  </nav>`;
}

function shell(title, active, body, base = "") {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>${esc(title)} — GOVO Express</title>
<style>${ui.govoCss()}${VISUAL.css()}${extraCss()}</style>
</head>
<body>
<main class="govo-page">
  <div class="govo-phone">
    ${body}
    ${bottomNav(active, base)}
    ${appScript(base)}
  </div>
</main>
</body>
</html>`;
}

function top(base, title, sub) {
  return `
  <header class="govo-topbar">
    <a class="govo-icon-btn" href="${href(base,"app")}">←</a>
    ${VISUAL.logo()}
    <a class="govo-icon-btn" href="${href(base,"support")}">⌁</a>
  </header>
  <section class="flow-head">
    <div>
      <h1 class="flow-title">${esc(title)}</h1>
      <p class="flow-sub">${esc(sub)}</p>
    </div>
  </section>`;
}

function app(base) {
  const serviceCards = BRAND.services.map(s => `
    <a class="govo-service-card" href="${href(base, s.key === "delivery" ? "delivery" : s.key === "shops" ? "shops" : s.key === "services" ? "services" : s.key === "more" ? "more" : s.key)}">
      ${svg(s.icon || s.key)}
      <div class="govo-service-label">${esc(s.label)}</div>
    </a>`).join("");

  const trust = [
    ["All Services","In One Place","grid"],
    ["Save Time","Everytime","clock"],
    ["Fast & Reliable","Quick Service","bolt"],
    ["Trusted Network","Verified Partners","shield"]
  ].map(t => `<div class="govo-trust-card">${svg(t[2])}<b>${t[0]}</b><span>${t[1]}</span></div>`).join("");

  return shell("App Home", "home", `
    ${appTopbar(base)}
    ${VISUAL.hero(base, href)}
    <section class="govo-quick-actions" aria-label="Quick actions">
      <a class="govo-quick-action" href="${href(base,"order")}"><b>Book now</b><span>Parcel, food, medicine</span></a>
      <a class="govo-quick-action" href="${href(base,"shops")}"><b>Nearby shops</b><span>Grocery and pharmacy</span></a>
      <a class="govo-quick-action" href="${href(base,"track")}"><b>Track order</b><span>Live status preview</span></a>
    </section>
    <form class="govo-search" action="${href(base,"services")}" method="get">
      <span>⌕</span><input name="q" placeholder="Search services, shops..." />
      <button class="govo-mic" type="button">🎙</button>
    </form>
    <section class="govo-grid">${serviceCards}</section>
    <section class="govo-banner">
      <h3>${esc(BRAND.merchant.title)}</h3>
      <p>${esc(BRAND.merchant.subtitle)}</p>
      <a class="govo-primary-btn" href="${href(base,"merchant")}">${esc(BRAND.merchant.cta)} →</a>
    </section>
    <section class="govo-trust">
      <a class="govo-trust-card" href="${href(base,"more")}">${svg("grid")}<b>All Services</b><span>In One Place</span></a>
      <a class="govo-trust-card" href="${href(base,"ai")}">${svg("clock")}<b>Save Time</b><span>Voice + AI Search</span></a>
      <a class="govo-trust-card" href="${href(base,"track")}">${svg("bolt")}<b>Fast & Reliable</b><span>Tracking Ready</span></a>
      <a class="govo-trust-card" href="${href(base,"support")}">${svg("shield")}<b>Trusted Network</b><span>Verified Partners</span></a>
    </section>
  `, base);
}

function servicesPage(base) {
  return shell("Services", "home", `
    ${top(base, "Services", "Cleaning, repair, doctor, agri, home help — all in one place.")}
    <div class="flow-chip-row">
      <span class="flow-chip active">All</span><span class="flow-chip">Home</span><span class="flow-chip">Repair</span><span class="flow-chip">Health</span><span class="flow-chip">Agri</span>
    </div>
    <section class="flow-grid">
      ${services.map(s => `<a class="govo-service-card" href="${href(base,"service")}">${svg(s[2])}<div class="govo-service-label">${esc(s[0])}</div></a>`).join("")}
    </section>
    <section class="govo-banner">
      <h3>Need a Custom Service?</h3>
      <p>Tell us what you need, GOVO will arrange it.</p>
      <a class="govo-primary-btn" href="${href(base,"support")}">Request Now →</a>
    </section>
  `, base);
}

function shopsPage(base) {
  return shell("Shops", "home", `
    ${top(base, "Shops", "Browse nearby shops, grocery, pharmacy, food and essentials.")}
    <form class="govo-search" action="${href(base,"shops")}" method="get" style="margin:0 0 12px">
      <span>⌕</span><input name="q" placeholder="Search shops or products..." />
      <button class="govo-mic" type="button">⌕</button>
    </form>
    <div class="flow-chip-row">
      <span class="flow-chip active">All</span><span class="flow-chip">Grocery</span><span class="flow-chip">Pharmacy</span><span class="flow-chip">Restaurant</span><span class="flow-chip">Electronics</span>
    </div>
    <section class="flow-list">
      ${shops.map((s,i) => `
        <a class="flow-card flow-row" href="${href(base,"shop")}">
          <div class="shop-thumb">${i+1}</div>
          <div style="flex:1">
            <b>${esc(s[0])}</b>
            <div class="mini-note">${esc(s[1])}</div>
            <div class="mini-note">★ ${esc(s[3])} · ${esc(s[4])} · <span class="status">${esc(s[2])}</span></div>
          </div>
          <span>›</span>
        </a>
      `).join("")}
    </section>
  `, base);
}

function orderPage(base) {
  return shell("Book Delivery", "orders", `
    ${top(base, "Book a Delivery", "Choose type, pickup, drop-off and vehicle.")}
    <div class="flow-grid-2">
      <button class="flow-btn">Parcel</button>
      <button class="flow-btn light">Food</button>
    </div>
    <section class="flow-card flow-page-gap">
      <div class="flow-field"><label class="flow-label">Pickup Location</label><input class="flow-input" placeholder="Enter pickup location"></div>
      <div class="flow-field"><label class="flow-label">Drop-off Location</label><input class="flow-input" placeholder="Enter drop-off location"></div>
      <div class="flow-field"><label class="flow-label">Package Details</label><input class="flow-input" placeholder="What are you sending?"></div>
    </section>
    <section class="flow-grid-2">
      <div class="flow-card"><b>Bike</b><div class="mini-note">৳60 - ৳100</div></div>
      <div class="flow-card"><b>Auto</b><div class="mini-note">৳120 - ৳180</div></div>
    </section>
    <a class="flow-btn" href="${href(base,"track")}" style="width:100%">Continue →</a>
  `, base);
}

function trackPage(base) {
  return shell("Track Order", "orders", `
    ${top(base, "Track Order", "Real-time route preview and rider status.")}
    <section class="flow-card flow-between">
      <div><b>Order ID: #GOVO123456</b><div class="mini-note">Estimated time</div><h2 style="margin:4px 0">15 - 20 min</h2></div>
      <span class="status">On the way</span>
    </section>
    <section class="map-box"><div class="map-line"></div><div class="pin-a"></div><div class="pin-b"></div></section>
    <section class="flow-grid-2">
      <a class="flow-btn" href="${href(base,"map")}">Open GOVO Map</a>
      <button class="flow-btn light govo-location-btn" type="button">Use My Location</button>
    </section>
    <div class="mini-note govo-location-output">Tracking map ready. Location দিলে live link হবে।</div>
    <section class="flow-card flow-row">
      <div class="shop-thumb">R</div>
      <div style="flex:1"><b>Sakib Ahmed</b><div class="mini-note">Rider · ★ 4.9</div></div>
      <a class="flow-btn light" href="tel:+8801912345678">Call</a>
    </section>
    <a class="flow-btn" href="${href(base,"orders")}" style="width:100%">View Details →</a>
  `, base);
}

function ordersPage(base) {
  const orders = (DATA.orders && DATA.orders.length ? DATA.orders : ORDER_FALLBACKS)
    .map(x => [x.id || "#GOVO-DEMO", x.title || "Delivery Order", x.status || "Pending", x.amount || "৳120"]);
  return shell("My Orders", "orders", `
    ${top(base, "My Orders", "View ongoing, delivered and cancelled orders.")}
    <div class="flow-chip-row"><span class="flow-chip active">All</span><span class="flow-chip">Ongoing</span><span class="flow-chip">Completed</span><span class="flow-chip">Cancelled</span></div>
    <section class="flow-list">
      ${orders.map(o => `<a class="flow-card flow-between" href="${href(base,"track")}"><div><b>${o[0]}</b><div class="mini-note">${o[1]}</div><div class="mini-note">Today, 10:30 AM</div></div><div style="text-align:right"><span class="status">${o[2]}</span><div class="price">${o[3]}</div></div></a>`).join("")}
    </section>
  `, base);
}

function walletPage(base) {
  return shell("Wallet", "account", `
    ${top(base, "Wallet", "Manage GOVO wallet balance and payments.")}
    <section class="wallet-hero">
      <div>GOVO Wallet Balance</div>
      <div class="wallet-balance">৳ 1,250.00</div>
      <button class="flow-btn light" style="width:100%;margin-top:14px">+ Add Money</button>
    </section>
    <section class="flow-list">
      ${["Added Money +৳500","Payment - Order #GOVO123456 -৳120","Cashback Received +৳50"].map(t => `<div class="flow-card flow-between"><span>${esc(t)}</span><span>›</span></div>`).join("")}
    </section>
  `, base);
}

function accountPage(base) {
  return shell("Account", "account", `
    ${top(base, "Account", "Profile, addresses, payments and settings.")}
    <section class="flow-card flow-row">
      <div class="shop-thumb">A</div>
      <div><b>Abu Avu</b><div class="mini-note">01912-345678</div><div class="mini-note">abuavu@example.com</div></div>
    </section>
    <section class="flow-list">
      ${[
        ["My Profile","account"],["Addresses","track"],["Payment Methods","wallet"],["Notifications","support"],["Help & Support","support"],["About GOVO Express","support"]
      ].map(x => `<a class="flow-card flow-between" href="${href(base,x[1])}"><span>${x[0]}</span><span>›</span></a>`).join("")}
    </section>
  `, base);
}

function supportPage(base) {
  return shell("Support", "support", `
    ${top(base, "Support", "We are here to help you with orders and services.")}
    <section class="govo-banner">
      <h3>Need Help?</h3><p>Call, WhatsApp or submit a support request.</p>
      <a class="govo-primary-btn" href="tel:+8801912345678">Call Now →</a>
    </section>
    <section class="flow-list">
      <a class="flow-card flow-between" href="${href(base,"order")}"><span>Order problem</span><span>›</span></a>
      <a class="flow-card flow-between" href="${href(base,"services")}"><span>Service request</span><span>›</span></a>
      <a class="flow-card flow-between" href="${href(base,"merchant")}"><span>Merchant join help</span><span>›</span></a>
      <a class="flow-card flow-between" href="${href(base,"rider")}"><span>Rider join help</span><span>›</span></a>
    </section>
  `, base);
}

function merchantPage(base) {
  return shell("Merchant", "home", `
    ${top(base, "Become a Merchant", "Grow your shop with GOVO local customer flow.")}
    <section class="govo-banner">
      <h3>Grow Your Business</h3><p>Receive orders, manage products and get payouts.</p>
      <a class="govo-primary-btn" href="${href(base,"support")}">Join Now →</a>
    </section>
    <section class="flow-grid-2">
      <div class="flow-card">${svg("shops")}<b>Store Management</b><div class="mini-note">Easy tools to run shop</div></div>
      <div class="flow-card">${svg("order")}<b>Orders</b><div class="mini-note">Accept customer orders</div></div>
      <div class="flow-card">${svg("wallet")}<b>Payouts</b><div class="mini-note">Fast settlements</div></div>
      <div class="flow-card">${svg("support")}<b>Support</b><div class="mini-note">Help when needed</div></div>
    </section>
  `, base);
}

function riderPage(base) {
  return shell("Rider", "home", `
    ${top(base, "Become a Rider", "Ride, earn and grow with GOVO Express.")}
    <section class="govo-banner">
      <h3>Deliver More. Earn More.</h3><p>Go online, accept delivery and track earnings.</p>
      <a class="govo-primary-btn" href="${href(base,"support")}">Join as Rider →</a>
    </section>
    <section class="flow-grid-2">
      <div class="flow-card">${svg("delivery")}<b>More Deliveries</b><div class="mini-note">Nearby requests</div></div>
      <div class="flow-card">${svg("wallet")}<b>Earnings</b><div class="mini-note">Weekly payout</div></div>
      <div class="flow-card">${svg("track")}<b>Smart Route</b><div class="mini-note">Fast navigation</div></div>
      <div class="flow-card">${svg("shield")}<b>Safe & Secure</b><div class="mini-note">Trusted network</div></div>
    </section>
  `, base);
}


function localCategoryPage(base, key, title, sub, items, active = "home") {
  return shell(title, active, `
    ${top(base, title, sub)}
    <section class="flow-grid">
      ${items.map(x => `<a class="govo-service-card" href="${href(base, x.href || "order")}">${svg(x.icon || "services")}<div class="govo-service-label">${esc(x.label)}</div></a>`).join("")}
    </section>
    <section class="govo-banner">
      <h3>${esc(title)} Request</h3>
      <p>আপনার দরকার লিখুন, GOVO team connect করবে।</p>
      <a class="govo-primary-btn" href="${href(base,"support")}">Request Help →</a>
    </section>
  `, base);
}

function deliveryPage(base) {
  return shell("Delivery", "orders", `
    ${top(base, "Delivery", "Parcel, food, medicine, grocery — quick local delivery.")}
    <section class="flow-grid-2">
      <a class="flow-card" href="${href(base,"order")}">${svg("delivery")}<b>Parcel Delivery</b><div class="mini-note">Document, package, gift</div></a>
      <a class="flow-card" href="${href(base,"order")}">${svg("shops")}<b>Shop Delivery</b><div class="mini-note">Grocery, pharmacy, essentials</div></a>
      <a class="flow-card" href="${href(base,"order")}">${svg("doctor")}<b>Medicine Delivery</b><div class="mini-note">Pharmacy pickup</div></a>
      <a class="flow-card" href="${href(base,"order")}">${svg("track")}<b>Track Delivery</b><div class="mini-note">Live status preview</div></a>
    </section>
    <a class="flow-btn" href="${href(base,"order")}" style="width:100%">Book Delivery →</a>
  `, base);
}

function ridePage(base) {
  return localCategoryPage(base, "ride", "Ride", "Bike, auto, local transport help.", [
    { label:"Bike Ride", icon:"ride", href:"order" },
    { label:"Auto Ride", icon:"delivery", href:"order" },
    { label:"Local Pickup", icon:"track", href:"order" },
    { label:"Emergency Ride", icon:"bolt", href:"support" }
  ]);
}

function doctorPage(base) {
  return localCategoryPage(base, "doctor", "Doctor & Health", "Doctor appointment, pharmacy, lab test and health support.", [
    { label:"Doctor Appointment", icon:"doctor", href:"support" },
    { label:"Pharmacy", icon:"shops", href:"shops" },
    { label:"Lab Test", icon:"services", href:"support" },
    { label:"Medicine Delivery", icon:"delivery", href:"order" }
  ]);
}

function homeServicePage(base) {
  return localCategoryPage(base, "home", "Home Service", "Home cleaning, plumbing, electrician and repair support.", [
    { label:"Cleaning", icon:"services", href:"services" },
    { label:"Plumbing", icon:"services", href:"services" },
    { label:"Electrician", icon:"bolt", href:"services" },
    { label:"AC Repair", icon:"services", href:"services" },
    { label:"Painting", icon:"services", href:"services" },
    { label:"Carpentry", icon:"services", href:"services" },
    { label:"Pest Control", icon:"shield", href:"services" },
    { label:"Custom Request", icon:"more", href:"support" }
  ]);
}

function agriPage(base) {
  return localCategoryPage(base, "agri", "Agri Service", "Agriculture product, advice, labor and local support.", [
    { label:"Fertilizer Help", icon:"agri", href:"support" },
    { label:"Seed / Product", icon:"shops", href:"shops" },
    { label:"Farm Worker", icon:"services", href:"support" },
    { label:"Agri Delivery", icon:"delivery", href:"order" }
  ]);
}

function morePage(base) {
  return shell("More Services", "home", `
    ${top(base, "More Services", "All GOVO local service categories.")}
    <section class="flow-grid">
      <a class="govo-service-card" href="${href(base,"delivery")}">${svg("delivery")}<div class="govo-service-label">Delivery</div></a>
      <a class="govo-service-card" href="${href(base,"shops")}">${svg("shops")}<div class="govo-service-label">Shops</div></a>
      <a class="govo-service-card" href="${href(base,"services")}">${svg("services")}<div class="govo-service-label">Services</div></a>
      <a class="govo-service-card" href="${href(base,"ride")}">${svg("ride")}<div class="govo-service-label">Ride</div></a>
      <a class="govo-service-card" href="${href(base,"doctor")}">${svg("doctor")}<div class="govo-service-label">Doctor</div></a>
      <a class="govo-service-card" href="${href(base,"home")}">${svg("home")}<div class="govo-service-label">Home Service</div></a>
      <a class="govo-service-card" href="${href(base,"agri")}">${svg("agri")}<div class="govo-service-label">Agri Service</div></a>
      <a class="govo-service-card" href="${href(base,"support")}">${svg("support")}<div class="govo-service-label">Help</div></a>
    </section>
  `, base);
}

function shopDetailPage(base) {
  const x = (DATA.shops && DATA.shops[0]) || {};
  return shell("Shop Details", "home", `
    ${top(base, "Shop Details", "Products, address and delivery booking.")}
    <section class="flow-card flow-row">
      <div class="shop-thumb">S</div>
      <div style="flex:1">
        <b>${esc(x.name || "Meherpur Super Shop")}</b>
        <div class="mini-note">${esc(x.subtitle || "Grocery, Daily Needs")} · ${esc(x.status || "Open")}</div>
        <div class="mini-note">★ ${esc(x.rating || "4.8")} · ${esc(x.distance || x.area || "Nearby")}</div>
      </div>
    </section>
    <section class="flow-grid-2">
      <div class="flow-card"><b>Rice / Grocery</b><div class="mini-note">Daily needs</div></div>
      <div class="flow-card"><b>Medicine</b><div class="mini-note">Pharmacy pickup</div></div>
      <div class="flow-card"><b>Food Item</b><div class="mini-note">Restaurant order</div></div>
      <div class="flow-card"><b>Custom Item</b><div class="mini-note">Write what you need</div></div>
    </section>
    <a class="flow-btn" href="${href(base,"order")}" style="width:100%">Book Delivery From This Shop →</a>
  `, base);
}

function serviceDetailPage(base) {
  const x = (DATA.services && DATA.services[0]) || {};
  return shell("Service Details", "home", `
    ${top(base, x.name || "Service Details", x.subtitle || "Choose service details and submit request.")}
    <section class="flow-card flow-page-gap">
      <div class="flow-field"><label class="flow-label">Service Type</label><input class="flow-input" placeholder="Cleaning / Plumbing / Electrician"></div>
      <div class="flow-field"><label class="flow-label">Area</label><input class="flow-input" placeholder="Meherpur / Gangni / Bamundi"></div>
      <div class="flow-field"><label class="flow-label">Details</label><input class="flow-input" placeholder="Describe what you need"></div>
    </section>
    <a class="flow-btn" href="${href(base,"support")}" style="width:100%">Submit Service Request →</a>
  `, base);
}



function appTopbar(base) {
  return `
    <header class="govo-topbar">
      <a class="govo-icon-btn" href="${href(base,"more")}" aria-label="Menu">☰</a>
      ${VISUAL.logo()}
      <a class="govo-icon-btn" href="${href(base,"ai")}" aria-label="AI Assistant">AI</a>
    </header>
  `;
}

function appScript(base) {
  const b = base || "";
  return `
<script>
(function(){
  const BASE = ${JSON.stringify("${base}")}.replace("${base}", "${base}");
  function go(path){
    if(!path) path = "/app";
    window.location.href = (BASE || "") + path;
  }

  document.querySelectorAll("[data-govo-click]").forEach(function(el){
    el.addEventListener("click", function(){
      const path = el.getAttribute("data-govo-click");
      if(path) go(path);
    });
  });

  document.querySelectorAll(".govo-mic").forEach(function(btn){
    btn.addEventListener("click", function(){
      const form = btn.closest("form");
      const input = form ? form.querySelector("input") : document.querySelector("input[name=q]");
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      function sendText(text){
        const q = (text || "").trim();
        if(input) input.value = q;
        if(q){
          window.location.href = (BASE || "") + "/ai?q=" + encodeURIComponent(q);
        }
      }

      if(SpeechRecognition){
        const rec = new SpeechRecognition();
        rec.lang = "bn-BD";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        btn.textContent = "🎧";
        rec.onresult = function(e){
          btn.textContent = "🎙";
          sendText(e.results[0][0].transcript || "");
        };
        rec.onerror = function(){
          btn.textContent = "🎙";
          const q = prompt("Voice কাজ না করলে এখানে লিখুন: কী service/shop/order লাগবে?");
          sendText(q || "");
        };
        rec.onend = function(){ btn.textContent = "🎙"; };
        rec.start();
      } else {
        const q = prompt("আপনি কী খুঁজছেন? যেমন: pharmacy, cleaning, delivery");
        sendText(q || "");
      }
    });
  });

  document.querySelectorAll(".govo-location-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      const out = document.querySelector(".govo-location-output");
      if(!navigator.geolocation){
        if(out) out.textContent = "Location support নেই। Manual area select করুন।";
        return;
      }
      if(out) out.textContent = "Location নিচ্ছে...";
      navigator.geolocation.getCurrentPosition(function(pos){
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        if(out) out.innerHTML = "Current location: " + lat + ", " + lng + "<br><a href='https://www.google.com/maps?q=" + lat + "," + lng + "' target='_blank'>Open in Google Maps</a>";
      }, function(){
        if(out) out.textContent = "Location permission পাওয়া যায়নি।";
      }, {enableHighAccuracy:true, timeout:8000});
    });
  });
})();
</script>`;
}

function aiPage(base) {
  const q = "";
  return shell("GOVO AI", "support", `
    ${top(base, "GOVO AI Assistant", "Voice/search দিয়ে service, shop, delivery বা support খুঁজুন।")}
    <form class="govo-search" action="${href(base,"ai")}" method="get" style="margin:0 0 12px">
      <span>⌕</span>
      <input name="q" placeholder="বলুন বা লিখুন: pharmacy, delivery, cleaning..." />
      <button class="govo-mic" type="button">🎙</button>
    </form>
    <section class="flow-card">
      <b>AI quick suggestions</b>
      <div class="mini-note">Data না থাকলেও GOVO fallback option দেখাবে।</div>
    </section>
    <section class="flow-grid-2">
      <a class="flow-card" href="${href(base,"shops")}">${svg("shops")}<b>Find Shop</b><div class="mini-note">Pharmacy, grocery, food</div></a>
      <a class="flow-card" href="${href(base,"services")}">${svg("services")}<b>Find Service</b><div class="mini-note">Cleaning, repair, home help</div></a>
      <a class="flow-card" href="${href(base,"order")}">${svg("delivery")}<b>Book Delivery</b><div class="mini-note">Parcel, medicine, food</div></a>
      <a class="flow-card" href="${href(base,"support")}">${svg("support")}<b>Human Help</b><div class="mini-note">Call / WhatsApp / support</div></a>
    </section>
    <section class="flow-list">
      ${PROFILE_FALLBACKS.map(x => `<a class="flow-card flow-between" href="${href(base,"support")}"><span><b>${esc(x.name)}</b><br><span class="mini-note">${esc(x.subtitle)}</span></span><span class="status">${esc(x.status)}</span></a>`).join("")}
    </section>
  `, base);
}

function mapPage(base) {
  return shell("GOVO Map", "orders", `
    ${top(base, "Map & Tracking", "Pickup/drop route, live location and Google Maps handoff.")}
    <section class="map-box">
      <div class="map-line"></div>
      <div class="pin-a"></div>
      <div class="pin-b"></div>
    </section>
    <section class="flow-card flow-page-gap">
      <div class="flow-between"><b>Pickup</b><span>Meherpur</span></div>
      <div class="flow-between"><b>Drop-off</b><span>Gangni / Bamundi</span></div>
      <div class="flow-between"><b>Status</b><span class="status">Route ready</span></div>
      <button class="flow-btn govo-location-btn" type="button">Use My Location</button>
      <div class="mini-note govo-location-output">Location permission দিলে map link তৈরি হবে।</div>
      <a class="flow-btn light" target="_blank" href="https://www.google.com/maps/dir/?api=1&origin=Meherpur%20Bangladesh&destination=Gangni%20Bangladesh">Open Google Maps Route →</a>
    </section>
  `, base);
}


const pages = {
  app,
  services: servicesPage,
  shops: shopsPage,
  shop: shopDetailPage,
  service: serviceDetailPage,
  delivery: deliveryPage,
  ride: ridePage,
  doctor: doctorPage,
  home: homeServicePage,
  agri: agriPage,
  more: morePage,
  order: orderPage,
  track: trackPage,
  orders: ordersPage,
  wallet: walletPage,
  account: accountPage,
  support: supportPage,
  merchant: merchantPage,
  rider: riderPage,
  ai: aiPage,
  map: mapPage
};

function render(page = "app", opts = {}) {
  const base = opts.base || "";
  const fn = pages[page] || pages.app;
  return fn(base);
}

function hasPage(page) {
  return !!pages[page];
}

module.exports = { render, hasPage, pages };
