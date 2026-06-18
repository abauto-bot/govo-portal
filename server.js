// GOVO Express Portal - Admin OS Version
// Stable routes: Merchant/Rider registration, Admin leads, Approve/Reject, Telegram notification

const fs = require('fs');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');

// ---------- ENV loader ----------
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }
} catch (e) {
  console.log('ENV load skipped:', e.message);
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = process.env.ADMIN_PIN || process.env.GOVO_ADMIN_PIN || process.env.PIN || '';

function pgConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432),
    database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'govo',
    user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
  };
}

const pool = new Pool(pgConfig());

// ---------- helpers ----------
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bdTime(v) {
  if (!v) return '';
  try {
    return new Date(v).toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(v);
  }
}

function getPin(req) {
  return String((req.query && req.query.pin) || (req.body && req.body.pin) || '');
}

function pinok(req, res) {
  const pin = getPin(req);
  if (!ADMIN_PIN || pin === ADMIN_PIN) return true;
  res.status(403).send(page('Admin Locked', `
    <section class="card lock-card">
      <div class="big-icon">🔒</div>
      <h1>Admin Locked</h1>
      <p>Admin panel open korte correct PIN lagbe.</p>
      <form class="inline-form" method="GET" action="/admin/leads">
        <input name="pin" type="password" placeholder="Admin PIN" autofocus />
        <button class="btn primary">Unlock</button>
      </form>
    </section>
  `, 'admin'));
  return false;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('Telegram skipped: token/chat id missing');
    return;
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!resp.ok) console.log('Telegram failed:', await resp.text());
  } catch (e) {
    console.log('Telegram error:', e.message);
  }
}

function pinQuery(req) {
  const pin = encodeURIComponent(getPin(req) || ADMIN_PIN || '');
  return `pin=${pin}`;
}

const css = `
:root{
  --bg:#0b1020;--panel:#111827;--panel2:#0f172a;--line:#263244;--text:#e5e7eb;--muted:#94a3b8;
  --green:#22c55e;--green2:#16a34a;--red:#ef4444;--yellow:#f59e0b;--blue:#60a5fa;
  --shadow:0 22px 70px rgba(0,0,0,.32);
}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at top left,#132044 0,#0b1020 34%,#090d19 100%);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:var(--text);min-height:100vh}.app{max-width:1220px;margin:0 auto;padding:22px}.topbar{position:sticky;top:0;z-index:10;background:rgba(11,16,32,.83);backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.16);border-radius:22px;margin-bottom:18px;padding:14px;box-shadow:var(--shadow)}.brand-row{display:flex;align-items:center;justify-content:space-between;gap:14px}.brand{display:flex;align-items:center;gap:12px}.logo{width:44px;height:44px;border-radius:16px;background:linear-gradient(135deg,#22c55e,#16a34a);display:grid;place-items:center;color:#052e16;font-weight:1000}.brand h2{margin:0;font-size:18px}.brand p{margin:2px 0 0;color:var(--muted);font-size:12px}.nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.nav a{color:#bfdbfe;text-decoration:none;padding:9px 12px;border:1px solid rgba(96,165,250,.16);border-radius:12px;background:rgba(15,23,42,.78);font-weight:800;font-size:14px}.nav a.active,.nav a:hover{background:rgba(34,197,94,.16);color:#bbf7d0;border-color:rgba(34,197,94,.45)}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:16px 0}.stat{background:linear-gradient(180deg,rgba(17,24,39,.96),rgba(15,23,42,.96));border:1px solid rgba(148,163,184,.14);border-radius:20px;padding:16px;box-shadow:var(--shadow)}.stat .label{font-size:12px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.08em}.stat .value{font-size:28px;font-weight:1000;margin-top:8px}.card{background:linear-gradient(180deg,rgba(17,24,39,.96),rgba(15,23,42,.96));border:1px solid rgba(148,163,184,.16);border-radius:24px;padding:22px;box-shadow:var(--shadow);margin-bottom:18px}.card h1{margin:0 0 16px;color:#22c55e;font-size:clamp(30px,6vw,54px);line-height:1.05}.card h2{margin:0 0 12px;color:#e2e8f0}.mini-note{color:var(--muted);font-size:13px;margin:4px 0 16px}.form{display:grid;gap:14px;max-width:720px}.form label{font-weight:850;color:#e2e8f0}.form input,.form select,.form textarea,.inline-form input,.filters input,.filters select{width:100%;border:1px solid #334155;border-radius:16px;background:#020617;color:#f8fafc;padding:15px;font-size:16px;outline:none}.form input:focus,.form select:focus,.form textarea:focus,.filters input:focus,.filters select:focus{border-color:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.14)}.btn{border:0;border-radius:14px;padding:12px 16px;font-weight:1000;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}.btn.primary{background:linear-gradient(135deg,#22c55e,#16a34a);color:#052e16}.btn.secondary{background:#1e293b;color:#e2e8f0;border:1px solid #334155}.btn.reject{background:var(--red);color:white}.btn.approve{background:var(--green);color:#052e16}.ok{border-color:rgba(34,197,94,.35)}.admin-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.filters{display:grid;grid-template-columns:1.5fr .8fr auto;gap:10px;align-items:end;margin:14px 0}.admin-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(148,163,184,.12);border-radius:18px}.admin-table{width:100%;min-width:980px;border-collapse:separate;border-spacing:0;font-size:14px}.admin-table th{font-size:12px;text-align:left;white-space:nowrap;color:#dbeafe;padding:13px 12px;border-bottom:1px solid #334155;background:rgba(15,23,42,.9);position:sticky;top:0}.admin-table td{padding:13px 12px;border-bottom:1px solid #1f2937;vertical-align:middle;line-height:1.25}.admin-table tr:hover td{background:rgba(96,165,250,.05)}.title-cell{font-weight:1000;color:#f8fafc}.badge{display:inline-flex;align-items:center;justify-content:center;padding:7px 11px;border-radius:999px;font-weight:1000;font-size:12px;text-transform:uppercase;white-space:nowrap}.badge.pending{background:#334155;color:#e2e8f0}.badge.approved{background:#14532d;color:#bbf7d0}.badge.rejected{background:#7f1d1d;color:#fecaca}.action-row{display:flex;gap:8px;align-items:center;white-space:nowrap}.action-btn{display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border-radius:12px;font-weight:1000;text-decoration:none;font-size:13px;min-width:84px}.action-btn.approve{background:#22c55e;color:#052e16}.action-btn.reject{background:#ef4444;color:#fff}.time-cell{font-size:12px;white-space:nowrap;color:#cbd5e1}.empty{padding:22px;color:var(--muted);text-align:center}.lock-card{max-width:520px;margin:60px auto;text-align:center}.big-icon{font-size:46px}.inline-form{display:flex;gap:10px;margin-top:14px}.pill{display:inline-flex;align-items:center;gap:6px;padding:8px 11px;border-radius:999px;background:rgba(96,165,250,.12);color:#bfdbfe;border:1px solid rgba(96,165,250,.22);font-weight:800;font-size:13px}.mobile-cards{display:none}.lead-card{border:1px solid rgba(148,163,184,.14);border-radius:18px;padding:14px;background:#0b1224;margin-bottom:10px}.lead-card .row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(148,163,184,.1);padding:7px 0}.lead-card .row:last-child{border-bottom:0}.lead-card .k{color:var(--muted);font-size:12px;font-weight:900;text-transform:uppercase}.lead-card .v{text-align:right;font-weight:750}.footer{color:var(--muted);font-size:12px;text-align:center;padding:22px 0}
@media(max-width:780px){.app{padding:14px}.brand-row{align-items:flex-start}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{grid-template-columns:1fr}.card{padding:17px}.nav a{font-size:13px;padding:8px 10px}.admin-wrap{display:none}.mobile-cards{display:block}.inline-form{flex-direction:column}.action-row{flex-wrap:wrap}.action-btn{flex:1}.stat .value{font-size:24px}}
`;

function page(title, body, active = '') {
  const pin = ADMIN_PIN ? `?pin=${encodeURIComponent(ADMIN_PIN)}` : '';
  const nav = [
    ['merchant', '/merchant', 'Merchant'],
    ['rider', '/rider', 'Rider'],
    ['leads', `/admin/leads${pin}`, 'Admin Leads'],
    ['riders', `/admin/riders${pin}`, 'Admin Riders'],
    ['mdash', '/dashboard/merchant', 'Merchant Dashboard'],
    ['rdash', '/dashboard/rider', 'Rider Dashboard'],
  ].map(([key, href, label]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)} | GOVO Express</title><style>${css}</style>
<style id="govoMerchantCssPolish">
html.govo-merchant-host body{background:#071020!important}
html.govo-merchant-host .card{background:linear-gradient(180deg,#101827,#0b1220)!important;border:1px solid #223047!important;border-radius:28px!important;box-shadow:0 18px 60px rgba(0,0,0,.25)!important}
html.govo-merchant-host h1,html.govo-merchant-host h2,html.govo-merchant-host h3{color:#22c55e!important;font-weight:1000!important}
html.govo-merchant-host p{color:#a8b3c7!important;line-height:1.5!important}
html.govo-merchant-host input,html.govo-merchant-host textarea,html.govo-merchant-host select{width:100%!important;box-sizing:border-box!important;background:#050b18!important;border:1px solid #31415f!important;border-radius:16px!important;color:#fff!important;padding:15px!important;font-size:16px!important;outline:none!important;margin-top:6px!important;margin-bottom:12px!important}
html.govo-merchant-host textarea{min-height:110px!important}
html.govo-merchant-host label{display:block!important;font-size:15px!important;font-weight:900!important;color:#dbeafe!important;margin-top:10px!important}
html.govo-merchant-host button,html.govo-merchant-host .btn,html.govo-merchant-host a.btn{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;border-radius:18px!important;padding:14px 18px!important;background:#22c55e!important;color:#052e16!important;border:1px solid #22c55e!important;text-decoration:none!important;font-weight:1000!important;font-size:16px!important}
html.govo-merchant-host footer,html.govo-merchant-host .footer{color:#94a3b8!important}
@media(max-width:700px){html.govo-merchant-host .btn,html.govo-merchant-host button{width:100%!important}}
</style>
<script id="govoMerchantCssPolishJs">
(function(){
  var host=location.hostname.toLowerCase();
  if(host.startsWith("merchant.")){document.documentElement.classList.add("govo-merchant-host");}
  function clean(){
    if(!host.startsWith("merchant.")) return;
    document.querySelectorAll("a").forEach(function(a){
      var t=(a.textContent||"").toLowerCase();
      var h=(a.getAttribute("href")||"").toLowerCase();
      if(t.includes("admin")||h.includes("/admin")||t.includes("rider")||h.includes("/rider")) a.style.display="none";
    });
    document.querySelectorAll("footer,.footer,p,div").forEach(function(el){
      if((el.textContent||"").trim()==="GOVO Admin OS • Stable MVP") el.textContent="GOVO Express • Merchant System";
    });
  }
  clean(); setTimeout(clean,500); setTimeout(clean,1500);
})();
</script>

</head><body><main class="app"><header class="topbar"><div class="brand-row"><div class="brand"><div class="logo">G</div><div><h2>GOVO Express</h2><p>Merchant • Rider • Admin OS</p></div></div><span class="pill">Live System</span></div><nav class="nav">${nav}</nav></header>${body}<div class="footer">GOVO Admin OS • Stable MVP</div></main>
<script>
(function(){
  const host = location.hostname.toLowerCase();

  function type(){
    if(host.startsWith("admin.")) return "admin";
    if(host.startsWith("rider.")) return "rider";
    if(host.startsWith("merchant.")) return "merchant";
    return "public";
  }

  const t = type();

  document.querySelectorAll("a").forEach(a=>{
    const text = (a.textContent || "").toLowerCase();
    const href = (a.getAttribute("href") || "").toLowerCase();

    let keep = true;

    if(t === "admin"){
      keep =
        href.includes("/admin") ||
        text.includes("admin") ||
        href.includes("/shops") ||
        text.includes("shop");
    }

    if(t === "rider"){
      keep =
        href.includes("/rider") ||
        text.includes("rider");
    }

    if(t === "merchant"){
      keep =
        href.includes("/merchant") ||
        href.includes("/shops") ||
        href.includes("/shop") ||
        href.includes("/order") ||
        text.includes("merchant") ||
        text.includes("shop") ||
        text.includes("delivery") ||
        text.includes("order");

      if(href.includes("/admin") || text.includes("admin") || href.includes("/rider") || text.includes("rider")){
        keep = false;
      }
    }

    if(!keep){
      a.style.display = "none";
      a.setAttribute("data-govo-hidden", "1");
    }
  });
})();
</script>

</body></html>`;
}

function submittedPage(type, href) {
  return page(`${type} Submitted`, `
    <section class="card ok">
      <div class="big-icon">✅</div>
      <h1>${esc(type)} Submitted</h1>
      <p>GOVO team info receive koreche. Review er por update dewa hobe.</p>
      <a class="btn primary" href="${href}">Add Another</a>
    </section>
  `);
}

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_merchant_leads (
    id SERIAL PRIMARY KEY,
    shop_name TEXT,
    owner_name TEXT,
    phone TEXT,
    location TEXT,
    category TEXT,
    delivery_needed TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_rider_leads (
    id SERIAL PRIMARY KEY,
    rider_name TEXT,
    phone TEXT,
    location TEXT,
    vehicle_type TEXT,
    experience TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");
  console.log('Database ready');
}

async function stats() {
  const [m, r] = await Promise.all([
    pool.query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int rejected FROM govo_merchant_leads"),
    pool.query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int rejected FROM govo_rider_leads"),
  ]);
  return { merchant: m.rows[0], rider: r.rows[0] };
}

function statCards(data, type) {
  const d = data[type];
  return `<section class="grid">
    <div class="stat"><div class="label">Total ${type}</div><div class="value">${esc(d.total)}</div></div>
    <div class="stat"><div class="label">Pending</div><div class="value">${esc(d.pending)}</div></div>
    <div class="stat"><div class="label">Approved</div><div class="value">${esc(d.approved)}</div></div>
    <div class="stat"><div class="label">Rejected</div><div class="value">${esc(d.rejected)}</div></div>
  </section>`;
}

function statusBadge(st) {
  const s = String(st || 'pending').toLowerCase();
  return `<span class="badge ${esc(s)}">${esc(s)}</span>`;
}

function actionButtons(kind, id, st, pin) {
  const safeKind = kind === 'rider' ? 'rider' : 'merchant';
  const s = String(st || 'pending').toLowerCase();
  if (s === 'approved') return `<div class="action-row"><a class="action-btn reject" href="/admin/${safeKind}/${id}/reject?pin=${pin}">Reject</a></div>`;
  if (s === 'rejected') return `<div class="action-row"><a class="action-btn approve" href="/admin/${safeKind}/${id}/approve?pin=${pin}">Approve</a></div>`;
  return `<div class="action-row"><a class="action-btn approve" href="/admin/${safeKind}/${id}/approve?pin=${pin}">Approve</a><a class="action-btn reject" href="/admin/${safeKind}/${id}/reject?pin=${pin}">Reject</a></div>`;
}

function mobileMerchantCards(rows, pin) {
  if (!rows.length) return `<div class="empty">No merchant leads found.</div>`;
  return `<div class="mobile-cards">${rows.map((x) => `<div class="lead-card">
    <div class="row"><span class="k">Shop</span><span class="v">${esc(x.shop_name)}</span></div>
    <div class="row"><span class="k">Owner</span><span class="v">${esc(x.owner_name)}</span></div>
    <div class="row"><span class="k">Phone</span><span class="v">${esc(x.phone)}</span></div>
    <div class="row"><span class="k">Area</span><span class="v">${esc(x.location)}</span></div>
    <div class="row"><span class="k">Status</span><span class="v">${statusBadge(x.status)}</span></div>
    <div class="row"><span class="k">Action</span><span class="v">${actionButtons('merchant', x.id, x.status, pin)}</span></div>
  </div>`).join('')}</div>`;
}

function mobileRiderCards(rows, pin) {
  if (!rows.length) return `<div class="empty">No rider leads found.</div>`;
  return `<div class="mobile-cards">${rows.map((x) => `<div class="lead-card">
    <div class="row"><span class="k">Name</span><span class="v">${esc(x.rider_name)}</span></div>
    <div class="row"><span class="k">Phone</span><span class="v">${esc(x.phone)}</span></div>
    <div class="row"><span class="k">Area</span><span class="v">${esc(x.location)}</span></div>
    <div class="row"><span class="k">Vehicle</span><span class="v">${esc(x.vehicle_type)}</span></div>
    <div class="row"><span class="k">Status</span><span class="v">${statusBadge(x.status)}</span></div>
    <div class="row"><span class="k">Action</span><span class="v">${actionButtons('rider', x.id, x.status, pin)}</span></div>
  </div>`).join('')}</div>`;
}

async function listMerchants(req, res) {
  if (!pinok(req, res)) return;
  const pin = encodeURIComponent(getPin(req) || ADMIN_PIN || '');
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || 'all').toLowerCase();
  const where = [];
  const vals = [];
  if (status !== 'all') { vals.push(status); where.push(`COALESCE(status,'pending')=$${vals.length}`); }
  if (q) { vals.push(`%${q}%`); where.push(`(shop_name ILIKE $${vals.length} OR owner_name ILIKE $${vals.length} OR phone ILIKE $${vals.length} OR location ILIKE $${vals.length} OR category ILIKE $${vals.length})`); }
  const sql = `SELECT id,shop_name,owner_name,phone,location,category,delivery_needed,COALESCE(status,'pending') AS status,created_at FROM govo_merchant_leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 100`;
  const [r, st] = await Promise.all([pool.query(sql, vals), stats()]);
  const rows = r.rows;
  const tr = rows.map((x) => `<tr>
    <td>${esc(x.id)}</td><td class="title-cell">${esc(x.shop_name)}</td><td>${esc(x.owner_name)}</td><td>${esc(x.phone)}</td><td>${esc(x.location)}</td><td>${esc(x.category)}</td><td>${esc(x.delivery_needed)}</td><td>${statusBadge(x.status)}</td><td>${actionButtons('merchant', x.id, x.status, pin)}</td><td class="time-cell">${esc(bdTime(x.created_at))}</td>
  </tr>`).join('');
  const body = `${statCards(st, 'merchant')}
  <section class="card"><div class="admin-head"><div><h1>Merchant Leads</h1><p class="mini-note">Mobile e card view, desktop e clean table. Approve/Reject ekhon ekshathe gum hoye thakbe na.</p></div><a class="btn secondary" href="/admin/riders?pin=${pin}">Rider Leads</a></div>
  <form class="filters" method="GET" action="/admin/leads"><input type="hidden" name="pin" value="${pin}"/><input name="q" value="${esc(q)}" placeholder="Search shop, owner, phone, area..."/><select name="status"><option value="all" ${status==='all'?'selected':''}>All Status</option><option value="pending" ${status==='pending'?'selected':''}>Pending</option><option value="approved" ${status==='approved'?'selected':''}>Approved</option><option value="rejected" ${status==='rejected'?'selected':''}>Rejected</option></select><button class="btn primary">Search</button></form>
  ${mobileMerchantCards(rows, pin)}
  <div class="admin-wrap"><table class="admin-table"><tr><th>ID</th><th>Shop</th><th>Owner</th><th>Phone</th><th>Location</th><th>Category</th><th>Delivery</th><th>Status</th><th>Action</th><th>Time</th></tr>${tr || `<tr><td colspan="10" class="empty">No merchant leads found.</td></tr>`}</table></div></section>`;
  res.send(page('Merchant Leads', body, 'leads'));
}

async function listRiders(req, res) {
  if (!pinok(req, res)) return;
  const pin = encodeURIComponent(getPin(req) || ADMIN_PIN || '');
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || 'all').toLowerCase();
  const where = [];
  const vals = [];
  if (status !== 'all') { vals.push(status); where.push(`COALESCE(status,'pending')=$${vals.length}`); }
  if (q) { vals.push(`%${q}%`); where.push(`(rider_name ILIKE $${vals.length} OR phone ILIKE $${vals.length} OR location ILIKE $${vals.length} OR vehicle_type ILIKE $${vals.length} OR experience ILIKE $${vals.length})`); }
  const sql = `SELECT id,rider_name,phone,location,vehicle_type,experience,COALESCE(status,'pending') AS status,created_at FROM govo_rider_leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 100`;
  const [r, st] = await Promise.all([pool.query(sql, vals), stats()]);
  const rows = r.rows;
  const tr = rows.map((x) => `<tr>
    <td>${esc(x.id)}</td><td class="title-cell">${esc(x.rider_name)}</td><td>${esc(x.phone)}</td><td>${esc(x.location)}</td><td>${esc(x.vehicle_type)}</td><td>${esc(x.experience)}</td><td>${statusBadge(x.status)}</td><td>${actionButtons('rider', x.id, x.status, pin)}</td><td class="time-cell">${esc(bdTime(x.created_at))}</td>
  </tr>`).join('');
  const body = `${statCards(st, 'rider')}
  <section class="card"><div class="admin-head"><div><h1>Rider Leads</h1><p class="mini-note">Rider application review, approve/reject, status tracking.</p></div><a class="btn secondary" href="/admin/leads?pin=${pin}">Merchant Leads</a></div>
  <form class="filters" method="GET" action="/admin/riders"><input type="hidden" name="pin" value="${pin}"/><input name="q" value="${esc(q)}" placeholder="Search name, phone, area, vehicle..."/><select name="status"><option value="all" ${status==='all'?'selected':''}>All Status</option><option value="pending" ${status==='pending'?'selected':''}>Pending</option><option value="approved" ${status==='approved'?'selected':''}>Approved</option><option value="rejected" ${status==='rejected'?'selected':''}>Rejected</option></select><button class="btn primary">Search</button></form>
  ${mobileRiderCards(rows, pin)}
  <div class="admin-wrap"><table class="admin-table"><tr><th>ID</th><th>Name</th><th>Phone</th><th>Location</th><th>Vehicle</th><th>Experience</th><th>Status</th><th>Action</th><th>Time</th></tr>${tr || `<tr><td colspan="9" class="empty">No rider leads found.</td></tr>`}</table></div></section>`;
  res.send(page('Rider Leads', body, 'riders'));
}

// ---------- routes ----------

/* ================= GOVO DOMAIN UI SPLIT V2 ================= */

function domainType(req){
  const host = String((req.headers && req.headers.host) || "").split(":")[0].toLowerCase();
  if (host.startsWith("admin.")) return "admin";
  if (host.startsWith("rider.")) return "rider";
  if (host.startsWith("merchant.")) return "merchant";
  return "public";
}

app.use((req,res,next)=>{
  if (req.path !== "/") return next();

  const type = domainType(req);

  if (type === "admin") return res.redirect("/admin/os");
  if (type === "rider") return res.redirect("/rider");
  if (type === "merchant") return res.redirect("/shops");

  return next();
});


/* GOVO SAFE MERCHANT DASHBOARD LEADS ONLY START */

/* GOVO MERCHANT DASHBOARD V2 START */

async function govoEnsureMerchantDashboardV2(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_merchant_leads (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      owner_name TEXT,
      phone TEXT,
      whatsapp TEXT,
      location TEXT,
      category TEXT,
      delivery_needed TEXT,
      status TEXT DEFAULT 'pending',
      shop_description TEXT,
      shop_address TEXT,
      products TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_name TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS owner_name TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS phone TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS location TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS category TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS delivery_needed TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_description TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_address TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS products TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

app.all("/merchant/dashboard", async (req,res)=>{
  try {
    await govoEnsureMerchantDashboardV2();

    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || "").trim();

    if (!phone) {
      return res.send(page("Merchant Dashboard", `
        <div class="card">
          <h1>🏪 Merchant Dashboard</h1>
          <p>Shop manage korte merchant phone number দিন।</p>

          <form method="GET" action="/merchant/dashboard">
            <label>Merchant Phone</label>
            <input name="phone" placeholder="017xxxxxxxx" required>
            <button>Open Dashboard</button>
          </form>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <a class="btn" href="/merchant">➕ Register Shop</a>
            <a class="btn" href="/shops">🏪 All Shops</a>
          </div>
        </div>
      `));
    }

    const mres = await pool.query(`
      SELECT *
      FROM govo_merchant_leads
      WHERE phone=$1 OR whatsapp=$1
      ORDER BY id DESC
      LIMIT 1
    `, [phone]);

    if (!mres.rows.length) {
      return res.send(page("Merchant Not Found", `
        <div class="card">
          <h1>Merchant Not Found</h1>
          <p>এই phone number দিয়ে merchant পাওয়া যায়নি। আগে registration করুন।</p>
          <a class="btn" href="/merchant">➕ Register Shop</a>
        </div>
      `));
    }

    const m = mres.rows[0];

    if (req.method === "POST") {
      await pool.query(`
        UPDATE govo_merchant_leads
        SET shop_name=$1,
            owner_name=$2,
            whatsapp=$3,
            location=$4,
            category=$5,
            delivery_needed=$6,
            shop_description=$7,
            shop_address=$8,
            products=$9,
            image_url=$10
        WHERE id=$11
      `, [
        req.body.shop_name || "",
        req.body.owner_name || "",
        req.body.whatsapp || "",
        req.body.location || "",
        req.body.category || "",
        req.body.delivery_needed || "",
        req.body.shop_description || "",
        req.body.shop_address || "",
        req.body.products || "",
        req.body.image_url || "",
        m.id
      ]);

      return res.redirect("/merchant/dashboard?phone=" + encodeURIComponent(phone) + "&saved=1");
    }

    const fresh = await pool.query(`SELECT * FROM govo_merchant_leads WHERE id=$1 LIMIT 1`, [m.id]);
    const x = fresh.rows[0] || m;

    const saved = String((req.query && req.query.saved) || "") === "1";
    const approved = String(x.status || "pending") === "approved";

    return res.send(page("Merchant Dashboard", `
      <style>
        .govo-md-head h1{font-size:32px!important;color:#22c55e!important;margin:0 0 8px!important}
        .govo-md-status{display:inline-flex;padding:7px 12px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-weight:900;text-transform:capitalize}
        .govo-md-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:14px}
        .govo-md-grid a{text-decoration:none;text-align:center;padding:13px;border-radius:15px;border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.07);font-weight:900;color:#bbf7d0!important}
        .govo-md-info{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}
        .govo-md-info div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px}
        .govo-md-info b{display:block;font-size:13px!important;margin-bottom:5px}
        .govo-md-info span{display:block;font-size:14px!important;word-break:break-word}
        @media(max-width:700px){
          .govo-md-grid{grid-template-columns:1fr}
          .govo-md-info{grid-template-columns:1fr}
        }
      </style>

      <div class="card govo-md-head">
        <h1>🏪 Merchant Control Center</h1>
        ${saved ? `<p style="color:#22c55e;font-weight:900">✅ Shop info saved.</p>` : ""}
        <p><b>Shop:</b> ${esc(String(x.shop_name || ""))}</p>
        <p><b>Status:</b> <span class="govo-md-status">${esc(String(x.status || "pending"))}</span></p>
        ${approved ? `<p>✅ Customer shops page এ আপনার দোকান visible.</p>` : `<p>⚠️ Admin approve করলে customer shops page এ দেখাবে.</p>`}

        <div class="govo-md-grid">
          <a href="/merchant/orders?phone=${encodeURIComponent(phone)}">📦 My Orders</a>
          <a href="/merchant/products?phone=${encodeURIComponent(phone)}">🍱 Products/Menu</a>
          <a href="/shop/${encodeURIComponent(String(x.id))}">👁️ View Public Shop</a>
          <a href="/shops">🏪 All Shops</a>
          <a href="/track">🔎 Track Order</a>
          <a href="/merchant">➕ New Registration</a>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h2>Shop Summary</h2>
        <div class="govo-md-info">
          <div><b>Owner</b><span>${esc(String(x.owner_name || ""))}</span></div>
          <div><b>Phone</b><span>${esc(String(x.phone || ""))}</span></div>
          <div><b>WhatsApp</b><span>${esc(String(x.whatsapp || ""))}</span></div>
          <div><b>Category</b><span>${esc(String(x.category || ""))}</span></div>
          <div><b>Location</b><span>${esc(String(x.shop_address || x.location || ""))}</span></div>
          <div><b>Delivery</b><span>${esc(String(x.delivery_needed || ""))}</span></div>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h2>✏️ Edit Shop Info</h2>
        <form method="POST" action="/merchant/dashboard">
          <input type="hidden" name="phone" value="${esc(phone)}">

          <label>Shop Name</label>
          <input name="shop_name" value="${esc(String(x.shop_name || ""))}" required>

          <label>Owner Name</label>
          <input name="owner_name" value="${esc(String(x.owner_name || ""))}">

          <label>WhatsApp</label>
          <input name="whatsapp" value="${esc(String(x.whatsapp || x.phone || ""))}">

          <label>Area / Location</label>
          <input name="location" value="${esc(String(x.location || ""))}">

          <label>Full Shop Address</label>
          <textarea name="shop_address">${esc(String(x.shop_address || ""))}</textarea>

          <label>Category</label>
          <input name="category" value="${esc(String(x.category || ""))}" placeholder="Restaurant / Grocery / Electronics">

          <label>Delivery Needed</label>
          <input name="delivery_needed" value="${esc(String(x.delivery_needed || ""))}" placeholder="Yes / No">

          <label>Shop Description</label>
          <textarea name="shop_description">${esc(String(x.shop_description || ""))}</textarea>

          <label>Products Summary</label>
          <textarea name="products">${esc(String(x.products || ""))}</textarea>

          <label>Shop Image URL</label>
          <input name="image_url" value="${esc(String(x.image_url || ""))}" placeholder="https://...">

          <button>Save Shop Info</button>
        </form>
      </div>
    `));
  } catch(e) {
    console.log("Merchant dashboard v2 error:", e.message);
    return res.status(500).send(page("Merchant Dashboard Error", `<div class="card"><h1>Merchant Dashboard Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO MERCHANT DASHBOARD V2 END */


app.all("/merchant/dashboard", async (req,res)=>{
  try {
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_description TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_address TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS products TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS image_url TEXT");

    if (req.method === "POST") {
      const id = String(req.body.id || "");
      const phone = String(req.body.phone || "");

      await pool.query(`
        UPDATE govo_merchant_leads
        SET shop_name=$1,
            owner_name=$2,
            location=$3,
            category=$4,
            delivery_needed=$5,
            whatsapp=$6,
            shop_address=$7,
            image_url=$8,
            shop_description=$9,
            products=$10
        WHERE id=$11
      `, [
        req.body.shop_name || "",
        req.body.owner_name || "",
        req.body.location || "",
        req.body.category || "",
        req.body.delivery_needed || "Yes",
        req.body.whatsapp || phone,
        req.body.shop_address || "",
        req.body.image_url || "",
        req.body.shop_description || "",
        req.body.products || "",
        id
      ]);

      return res.redirect("/merchant/dashboard?phone=" + encodeURIComponent(phone) + "&saved=1");
    }

    const phone = String((req.query && req.query.phone) || "");

    if (!phone) {
      return res.send(page("Merchant Dashboard", `
        <div class="card">
          <h1>Merchant Dashboard</h1>
          <p>Approved merchant phone number diye login/check korun.</p>
          <form method="GET" action="/merchant/dashboard">
            <label>Phone</label>
            <input name="phone" placeholder="017xxxxxxxx" required>
            <button>Open Dashboard</button>
          </form>
        </div>
      `));
    }

    const r = await pool.query(`
      SELECT *
      FROM govo_merchant_leads
      WHERE phone=$1
      ORDER BY id DESC
      LIMIT 1
    `, [phone]);

    if (!r.rows.length) {
      return res.send(page("Merchant Not Found", `
        <div class="card">
          <h1>No Merchant Found</h1>
          <p>Ei phone number diye merchant pawa jayni.</p>
          <a class="btn" href="/merchant">Register Merchant</a>
        </div>
      `));
    }

    const x = r.rows[0];
    const saved = req.query && req.query.saved ? `<p style="color:#22c55e;font-weight:900">✅ Shop info saved successfully.</p>` : "";

    return res.send(page("Merchant Dashboard", `
      <div class="card">
        <h1>Edit Shop Info</h1>
        ${saved}
        <p>Status: <b>${esc(String(x.status || "pending"))}</b></p>

        <form method="POST" action="/merchant/dashboard">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <input type="hidden" name="phone" value="${esc(String(x.phone || ""))}">

          <label>Shop Name</label>
          <input name="shop_name" value="${esc(String(x.shop_name || ""))}" required>

          <label>Owner Name</label>
          <input name="owner_name" value="${esc(String(x.owner_name || ""))}" required>

          <label>Location</label>
          <input name="location" value="${esc(String(x.location || ""))}" required>

          <label>Category</label>
          <input name="category" value="${esc(String(x.category || ""))}" required>

          <label>Delivery Needed</label>
          <input name="delivery_needed" value="${esc(String(x.delivery_needed || "Yes"))}">

          <label>WhatsApp / Phone</label>
          <input name="whatsapp" value="${esc(String(x.whatsapp || x.phone || ""))}">

          <label>Shop Address</label>
          <input name="shop_address" value="${esc(String(x.shop_address || x.location || ""))}">

          <label>Image URL</label>
          <input name="image_url" value="${esc(String(x.image_url || ""))}" placeholder="https://...">

          <label>Shop Description</label>
          <textarea name="shop_description">${esc(String(x.shop_description || ""))}</textarea>

          <label>Products / Services</label>
          <textarea name="products">${esc(String(x.products || ""))}</textarea>

          <button>Save Shop Info</button>
        </form>

        <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap">
          <a class="btn" href="/shops">View Public Shops</a>
          <a class="btn" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || "")}">Refresh</a>
        </div>
      </div>
    `));
  } catch(e) {
    console.log("Safe merchant dashboard error:", e.message);
    return res.status(500).send(page("Merchant Dashboard Error", `<div class="card"><h1>Merchant Dashboard Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});
/* GOVO SAFE MERCHANT DASHBOARD LEADS ONLY END */



/* GOVO SAFE SHOPS CARD V2 START */

/* GOVO SAFE ORDER FLOW FINAL START */

async function govoEnsureOrdersTable(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS shop_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS pickup_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS drop_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS item_details TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

async function govoOrderNotify(text){
  try {
    if (typeof sendTelegram === "function") {
      await sendTelegram(text);
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_CHAT_ID || "";
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId, text})
    });
  } catch(e) {
    console.log("Order Telegram notify skipped:", e.message);
  }
}

app.all("/order", async (req,res)=>{
  try {
    await govoEnsureOrdersTable();

    if (req.method === "POST") {
      const shop_name = String(req.body.shop_name || "");
      const merchant_phone = String(req.body.merchant_phone || "");
      const customer_name = String(req.body.customer_name || "");
      const customer_phone = String(req.body.customer_phone || "");
      const pickup_location = String(req.body.pickup_location || "");
      const drop_location = String(req.body.drop_location || "");
      const item_details = String(req.body.item_details || "");
      const note = String(req.body.note || "");

      const out = await pool.query(`
        INSERT INTO govo_orders
          (shop_name, merchant_phone, customer_name, customer_phone, pickup_location, drop_location, item_details, note, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
        RETURNING id
      `, [shop_name, merchant_phone, customer_name, customer_phone, pickup_location, drop_location, item_details, note]);

      const orderId = out.rows[0].id;

      await govoOrderNotify([
        "📦 New GOVO Order",
        "",
        `Order ID: #${orderId}`,
        `Shop: ${shop_name || "N/A"}`,
        `Merchant Phone: ${merchant_phone || "N/A"}`,
        `Customer: ${customer_name || "N/A"}`,
        `Customer Phone: ${customer_phone || "N/A"}`,
        `Pickup: ${pickup_location || "N/A"}`,
        `Drop: ${drop_location || "N/A"}`,
        `Item: ${item_details || "N/A"}`,
        `Note: ${note || "N/A"}`,
        `Time: ${new Date().toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}`
      ].join("\n"));

      return res.redirect("/order/success?id=" + encodeURIComponent(orderId));
    }

    const shop = String((req.query && req.query.shop) || "");
    let merchantPhone = "";
    let pickup = "";

    if (shop) {
      const r = await pool.query(`
        SELECT shop_name, phone, whatsapp, location, shop_address
        FROM govo_merchant_leads
        WHERE shop_name=$1
        ORDER BY id DESC
        LIMIT 1
      `, [shop]);

      if (r.rows.length) {
        merchantPhone = String(r.rows[0].whatsapp || r.rows[0].phone || "");
        pickup = String(r.rows[0].shop_address || r.rows[0].location || "");
      }
    }

    return res.send(page("Delivery Book", `
      <div class="card">
        <h1>📦 Delivery Book</h1>
        <p>Customer order information din. Submit korle admin orders e chole jabe.</p>

        <form method="POST" action="/order">
          <label>Shop Name</label>
          <input name="shop_name" value="${esc(shop)}" placeholder="Shop name" required>

          <label>Merchant Phone</label>
          <input name="merchant_phone" value="${esc(merchantPhone)}" placeholder="Merchant phone">

          <label>Customer Name</label>
          <input name="customer_name" placeholder="Customer name" required>

          <label>Customer Phone</label>
          <input name="customer_phone" placeholder="017xxxxxxxx" required>

          <label>Pickup Location</label>
          <input name="pickup_location" value="${esc(pickup)}" placeholder="Pickup location" required>

          <label>Drop Location</label>
          <input name="drop_location" placeholder="Customer address / drop location" required>

          <label>Item Details</label>
          <textarea name="item_details" placeholder="Food parcel / medicine / product details" required></textarea>

          <label>Note</label>
          <textarea name="note" placeholder="Extra note, optional"></textarea>

          <button>Submit Order</button>
        </form>

        <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap">
          <a class="btn" href="/shops">Back to Shops</a>
        </div>
      </div>
    `));
  } catch(e) {
    console.log("Order flow error:", e.message);
    return res.status(500).send(page("Order Error", `<div class="card"><h1>Order Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});


/* GOVO ADMIN ORDER ACTIONS START */

function govoAdminPinOk(req,res){
  const pin = String((req.query && req.query.pin) || (req.body && req.body.pin) || "");
  const real = String(process.env.ADMIN_PIN || "");
  if (!real || pin !== real) {
    res.status(403).send(page("Forbidden", `<div class="card"><h1>403</h1><p>Admin PIN required.</p></div>`));
    return false;
  }
  return true;
}

async function govoEnsureOrderAdminColumns(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS shop_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS pickup_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS drop_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS item_details TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

async function govoAdminOrderNotify(text){
  try {
    if (typeof sendTelegram === "function") {
      await sendTelegram(text);
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_CHAT_ID || "";
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId, text})
    });
  } catch(e) {
    console.log("Admin order telegram skipped:", e.message);
  }
}

app.post("/admin/order/status", async (req,res)=>{
  try {
    if (!govoAdminPinOk(req,res)) return;

    await govoEnsureOrderAdminColumns();

    const id = String(req.body.id || "");
    const status = String(req.body.status || "pending");
    const pin = String(req.body.pin || "");
    const admin_note = String(req.body.admin_note || "");

    const r = await pool.query(`
      UPDATE govo_orders
      SET status=$1, admin_note=$2, updated_at=NOW()
      WHERE id=$3
      RETURNING *
    `, [status, admin_note, id]);

    if (r.rows.length) {
      const x = r.rows[0];
      await govoAdminOrderNotify([
        "⚙️ GOVO Order Status Updated",
        "",
        `Order ID: #${x.id}`,
        `Status: ${String(x.status || "").toUpperCase()}`,
        `Shop: ${x.shop_name || "N/A"}`,
        `Customer: ${x.customer_name || "N/A"}`,
        `Phone: ${x.customer_phone || "N/A"}`,
        `Drop: ${x.drop_location || "N/A"}`,
        `Admin Note: ${x.admin_note || "N/A"}`,
        `Time: ${new Date().toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}`
      ].join("\n"));
    }

    return res.redirect("/admin/orders?pin=" + encodeURIComponent(pin));
  } catch(e) {
    console.log("Admin order status error:", e.message);
    return res.status(500).send(page("Order Status Error", `<div class="card"><h1>Order Status Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});


/* GOVO SHOPS HOME V3 START */

/* GOVO SHOP DETAILS V1 START */

/* GOVO PRODUCT MENU V1 START */

async function govoEnsureProductMenuV1(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_shop_products (
      id SERIAL PRIMARY KEY,
      merchant_lead_id INT,
      shop_name TEXT,
      merchant_phone TEXT,
      product_name TEXT,
      price TEXT,
      category TEXT,
      description TEXT,
      image_url TEXT,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS merchant_lead_id INT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS shop_name TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS merchant_phone TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS product_name TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS price TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS category TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS description TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
}

app.all("/merchant/products", async (req,res)=>{
  try {
    await govoEnsureProductMenuV1();

    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || "");

    if (!phone) {
      return res.send(page("Merchant Products", `
        <div class="card">
          <h1>Product / Menu Manager</h1>
          <p>Merchant phone number diye product/menu manage korun.</p>
          <form method="GET" action="/merchant/products">
            <label>Merchant Phone</label>
            <input name="phone" placeholder="017xxxxxxxx" required>
            <button>Open Product Manager</button>
          </form>
          <div style="margin-top:16px">
            <a class="btn" href="/merchant/dashboard">Back Dashboard</a>
            <a class="btn" href="/shops">View Shops</a>
          </div>
        </div>
      `));
    }

    const merchant = await pool.query(`
      SELECT id, shop_name, owner_name, phone, location, category, COALESCE(status,'pending') AS status
      FROM govo_merchant_leads
      WHERE phone=$1
      ORDER BY id DESC
      LIMIT 1
    `, [phone]);

    if (!merchant.rows.length) {
      return res.send(page("Merchant Not Found", `
        <div class="card">
          <h1>No Merchant Found</h1>
          <p>Ei phone number diye merchant pawa jayni.</p>
          <a class="btn" href="/merchant">Register Merchant</a>
        </div>
      `));
    }

    const m = merchant.rows[0];

    if (req.method === "POST" && req.body.action === "add") {
      await pool.query(`
        INSERT INTO govo_shop_products
          (merchant_lead_id, shop_name, merchant_phone, product_name, price, category, description, image_url, is_available)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
      `, [
        m.id,
        m.shop_name || "",
        m.phone || "",
        req.body.product_name || "",
        req.body.price || "",
        req.body.category || "",
        req.body.description || "",
        req.body.image_url || ""
      ]);

      return res.redirect("/merchant/products?phone=" + encodeURIComponent(phone) + "&saved=1");
    }

    if (req.method === "POST" && req.body.action === "toggle") {
      await pool.query(`
        UPDATE govo_shop_products
        SET is_available = NOT COALESCE(is_available,true), updated_at=NOW()
        WHERE id=$1 AND merchant_phone=$2
      `, [req.body.id || "", phone]);

      return res.redirect("/merchant/products?phone=" + encodeURIComponent(phone));
    }

    if (req.method === "POST" && req.body.action === "delete") {
      await pool.query(`
        DELETE FROM govo_shop_products
        WHERE id=$1 AND merchant_phone=$2
      `, [req.body.id || "", phone]);

      return res.redirect("/merchant/products?phone=" + encodeURIComponent(phone));
    }

    const products = await pool.query(`
      SELECT *
      FROM govo_shop_products
      WHERE merchant_lead_id=$1 OR merchant_phone=$2
      ORDER BY is_available DESC, id DESC
      LIMIT 200
    `, [m.id, phone]);

    const rows = products.rows.map(x=>`
      <div class="card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <h2 style="color:#22c55e;margin:0 0 8px">${esc(String(x.product_name || ""))}</h2>
            <p><b>Price:</b> ${esc(String(x.price || ""))}</p>
            <p><b>Category:</b> ${esc(String(x.category || ""))}</p>
            <p><b>Status:</b> ${x.is_available ? "Available" : "Hidden"}</p>
            <p>${esc(String(x.description || ""))}</p>
          </div>
          ${x.image_url ? `<img src="${esc(String(x.image_url))}" style="width:88px;height:88px;object-fit:cover;border-radius:18px;border:1px solid #22c55e">` : ""}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <form method="POST" action="/merchant/products">
            <input type="hidden" name="phone" value="${esc(phone)}">
            <input type="hidden" name="id" value="${esc(String(x.id))}">
            <input type="hidden" name="action" value="toggle">
            <button>${x.is_available ? "Hide" : "Show"}</button>
          </form>
          <form method="POST" action="/merchant/products" onsubmit="return confirm('Delete product?')">
            <input type="hidden" name="phone" value="${esc(phone)}">
            <input type="hidden" name="id" value="${esc(String(x.id))}">
            <input type="hidden" name="action" value="delete">
            <button>Delete</button>
          </form>
        </div>
      </div>
    `).join("");

    return res.send(page("Product / Menu Manager", `
      <div class="card">
        <h1>Product / Menu Manager</h1>
        <p><b>Shop:</b> ${esc(String(m.shop_name || ""))}</p>
        <p><b>Status:</b> ${esc(String(m.status || ""))}</p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0">
          <a class="btn" href="/merchant/dashboard?phone=${encodeURIComponent(phone)}">Merchant Dashboard</a>
          <a class="btn" href="/shop/${encodeURIComponent(String(m.id))}">View Shop Details</a>
          <a class="btn" href="/shops">View Shops</a>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h1>Add Product / Menu</h1>
        <form method="POST" action="/merchant/products">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input type="hidden" name="action" value="add">

          <label>Product/Menu Name</label>
          <input name="product_name" placeholder="Burger / Mobile charger / Rice 1kg" required>

          <label>Price</label>
          <input name="price" placeholder="৳120 / Negotiable">

          <label>Category</label>
          <input name="category" placeholder="Food / Electronics / Grocery">

          <label>Description</label>
          <textarea name="description" placeholder="Product details"></textarea>

          <label>Image URL</label>
          <input name="image_url" placeholder="https://...">

          <button>Add Product</button>
        </form>
      </div>

      <div style="margin-top:18px">
        ${rows || `<div class="card"><h2>No product added yet</h2><p>First product/menu add korun.</p></div>`}
      </div>
    `));
  } catch(e) {
    console.log("Product menu error:", e.message);
    return res.status(500).send(page("Product Menu Error", `<div class="card"><h1>Product Menu Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});


/* GOVO CUSTOMER TRACKING V1 START */

async function govoEnsureTrackingOrders(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS shop_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS pickup_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS drop_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS item_details TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
}

function govoStatusBangla(status){
  status = String(status || "pending").toLowerCase();
  if(status === "accepted") return "✅ Accepted — Rider/Team processing korche";
  if(status === "rejected") return "❌ Rejected — Admin order reject koreche";
  if(status === "delivered") return "🏁 Delivered — Order complete";
  return "⏳ Pending — Admin review korche";
}


/* GOVO RIDER ASSIGN V1 START */

async function govoEnsureRiderAssignTables(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      rider_id INT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_id INT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");

  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
}

function govoPinOkV2(req,res){
  const pin = String((req.query && req.query.pin) || (req.body && req.body.pin) || "");
  const real = String(process.env.ADMIN_PIN || "");
  if (!real || pin !== real) {
    res.status(403).send(page("Forbidden", `<div class="card"><h1>403</h1><p>Admin PIN required.</p></div>`));
    return false;
  }
  return true;
}

async function govoNotifyV2(text){
  try {
    if (typeof sendTelegram === "function") {
      await sendTelegram(text);
      return;
    }
    const token = process.env.TELEGRAM_BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || "";
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId, text})
    });
  } catch(e) {
    console.log("Telegram notify skipped:", e.message);
  }
}

app.post("/admin/order/assign", async (req,res)=>{
  try {
    if(!govoPinOkV2(req,res)) return;

    await govoEnsureRiderAssignTables();

    const pin = String(req.body.pin || "");
    const orderId = String(req.body.order_id || "");
    const riderId = String(req.body.rider_id || "");

    const rider = await pool.query(`
      SELECT id, rider_name, phone
      FROM govo_rider_leads
      WHERE id=$1
      LIMIT 1
    `, [riderId]);

    if (!rider.rows.length) {
      return res.status(404).send(page("Rider Not Found", `<div class="card"><h1>Rider Not Found</h1><p>Rider pawa jayni.</p><a class="btn" href="/admin/orders?pin=${esc(pin)}">Back Orders</a></div>`));
    }

    const rd = rider.rows[0];

    const order = await pool.query(`
      UPDATE govo_orders
      SET rider_id=$1,
          rider_name=$2,
          rider_phone=$3,
          status='assigned',
          updated_at=NOW()
      WHERE id=$4
      RETURNING *
    `, [rd.id, rd.rider_name, rd.phone, orderId]);

    if (order.rows.length) {
      const x = order.rows[0];

      await govoNotifyV2([
        "🛵 GOVO Order Assigned",
        "",
        `Order ID: #${x.id}`,
        `Rider: ${rd.rider_name || ""}`,
        `Rider Phone: ${rd.phone || ""}`,
        `Shop: ${x.shop_name || ""}`,
        `Customer: ${x.customer_name || ""}`,
        `Drop: ${x.drop_location || ""}`,
        `Item: ${x.item_details || ""}`
      ].join("\n"));
    }

    return res.redirect("/admin/orders?pin=" + encodeURIComponent(pin));
  } catch(e) {
    console.log("Order assign error:", e.message);
    return res.status(500).send(page("Assign Error", `<div class="card"><h1>Assign Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.post("/admin/order/status", async (req,res)=>{
  try {
    if(!govoPinOkV2(req,res)) return;

    await govoEnsureRiderAssignTables();

    const pin = String(req.body.pin || "");
    const id = String(req.body.id || "");
    const status = String(req.body.status || "pending");
    const admin_note = String(req.body.admin_note || "");

    const r = await pool.query(`
      UPDATE govo_orders
      SET status=$1, admin_note=$2, updated_at=NOW()
      WHERE id=$3
      RETURNING *
    `, [status, admin_note, id]);

    if (r.rows.length) {
      const x = r.rows[0];
      await govoNotifyV2([
        "⚙️ GOVO Order Status Updated",
        "",
        `Order ID: #${x.id}`,
        `Status: ${String(x.status || "").toUpperCase()}`,
        `Rider: ${x.rider_name || "Not assigned"}`,
        `Shop: ${x.shop_name || ""}`,
        `Customer: ${x.customer_name || ""}`,
        `Drop: ${x.drop_location || ""}`,
        `Admin Note: ${x.admin_note || "N/A"}`
      ].join("\n"));
    }

    return res.redirect("/admin/orders?pin=" + encodeURIComponent(pin));
  } catch(e) {
    console.log("Admin status error:", e.message);
    return res.status(500).send(page("Status Error", `<div class="card"><h1>Status Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});


/* GOVO ADMIN ORDERS PIN LOGIN FIX START */

async function govoEnsureAdminOrdersPinFix(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      rider_id INT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS shop_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS pickup_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS drop_location TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS item_details TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_id INT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");

  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
}

function govoAdminOrdersLogin(res, message){
  return res.status(200).send(page("Admin PIN Login", `
    <div class="card">
      <h1>🔐 Admin PIN Login</h1>
      <p>${message ? esc(String(message)) : "Admin orders দেখতে PIN দিন."}</p>

      <form method="GET" action="/admin/orders">
        <label>Admin PIN</label>
        <input name="pin" placeholder="Enter admin PIN" required>
        <button>Open Admin Orders</button>
      </form>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
        <a class="btn" href="/admin/os">Admin Home</a>
        <a class="btn" href="https://govoexpress.com">Main Website</a>
      </div>
    </div>
  `));
}


/* GOVO ADMIN ORDERS MOBILE UI START */

async function govoEnsureAdminOrdersMobileUi(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      rider_id INT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_id INT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
}

function govoAdminOrdersPinLoginMobile(res, msg){
  return res.send(page("Admin PIN Login", `
    <div class="card">
      <h1>🔐 Admin PIN Login</h1>
      <p>${esc(String(msg || "Admin orders দেখতে PIN দিন."))}</p>
      <form method="GET" action="/admin/orders">
        <label>Admin PIN</label>
        <input name="pin" placeholder="Enter admin PIN" required>
        <button>Open Orders</button>
      </form>
    </div>
  `));
}


/* GOVO ADMIN ORDERS COMPACT UI START */


/* GOVO MERCHANT ORDERS V1 START */

async function govoEnsureMerchantOrdersV1(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      merchant_note TEXT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
}

async function govoMerchantNotifyV1(text){
  try {
    if (typeof sendTelegram === "function") {
      await sendTelegram(text);
      return;
    }
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_CHAT_ID || "";
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId, text})
    });
  } catch(e) {
    console.log("Merchant order notify skipped:", e.message);
  }
}

app.all("/merchant/orders", async (req,res)=>{
  try {
    await govoEnsureMerchantOrdersV1();

    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || "").trim();

    if (!phone) {
      return res.send(page("Merchant Orders", `
        <div class="card">
          <h1>📦 Merchant Orders</h1>
          <p>নিজের দোকানের order দেখতে merchant phone দিন।</p>

          <form method="GET" action="/merchant/orders">
            <label>Merchant Phone</label>
            <input name="phone" placeholder="017xxxxxxxx" required>
            <button>Open Orders</button>
          </form>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <a class="btn" href="/merchant/dashboard">Merchant Dashboard</a>
            <a class="btn" href="/shops">View Shops</a>
          </div>
        </div>
      `));
    }

    const merchant = await pool.query(`
      SELECT id, shop_name, owner_name, phone, whatsapp, location, shop_address, COALESCE(status,'pending') AS status
      FROM govo_merchant_leads
      WHERE phone=$1 OR whatsapp=$1
      ORDER BY id DESC
      LIMIT 1
    `, [phone]);

    if (!merchant.rows.length) {
      return res.send(page("Merchant Not Found", `
        <div class="card">
          <h1>Merchant Not Found</h1>
          <p>এই phone number দিয়ে merchant পাওয়া যায়নি।</p>
          <a class="btn" href="/merchant">Register Merchant</a>
        </div>
      `));
    }

    const m = merchant.rows[0];

    if (req.method === "POST") {
      const id = String(req.body.id || "");
      const status = String(req.body.status || "merchant_confirmed");
      const merchant_note = String(req.body.merchant_note || "");

      const updated = await pool.query(`
        UPDATE govo_orders
        SET status=$1, merchant_note=$2, updated_at=NOW()
        WHERE id=$3
          AND (
            merchant_phone=$4
            OR merchant_phone=$5
            OR shop_name=$6
          )
        RETURNING *
      `, [status, merchant_note, id, m.phone || "", m.whatsapp || "", m.shop_name || ""]);

      if (updated.rows.length) {
        const x = updated.rows[0];
        await govoMerchantNotifyV1([
          "🏪 GOVO Merchant Order Update",
          "",
          `Order ID: #${x.id}`,
          `Shop: ${x.shop_name || ""}`,
          `Status: ${String(x.status || "").toUpperCase()}`,
          `Merchant Note: ${x.merchant_note || "N/A"}`,
          `Customer: ${x.customer_name || ""}`,
          `Drop: ${x.drop_location || ""}`,
          `Item: ${x.item_details || ""}`
        ].join("\n"));
      }

      return res.redirect("/merchant/orders?phone=" + encodeURIComponent(phone));
    }

    const orders = await pool.query(`
      SELECT *
      FROM govo_orders
      WHERE merchant_phone=$1
         OR merchant_phone=$2
         OR shop_name=$3
      ORDER BY id DESC
      LIMIT 100
    `, [m.phone || "", m.whatsapp || "", m.shop_name || ""]);

    const cards = orders.rows.map(x=>`
      <div class="card govo-merchant-order-card">
        <div class="govo-mo-head">
          <div>
            <span class="govo-mo-chip">#${esc(String(x.id))}</span>
            <h2>${esc(String(x.customer_name || "Customer"))}</h2>
            <small>${esc(String(x.customer_phone || ""))}</small>
          </div>
          <span class="govo-mo-status">${esc(String(x.status || "pending"))}</span>
        </div>

        <div class="govo-mo-grid">
          <div><b>Pickup</b><span>${esc(String(x.pickup_location || ""))}</span></div>
          <div><b>Drop</b><span>${esc(String(x.drop_location || ""))}</span></div>
          <div><b>Item</b><span>${esc(String(x.item_details || ""))}</span></div>
          <div><b>Customer Note</b><span>${esc(String(x.note || "No note"))}</span></div>
          <div><b>Admin Note</b><span>${esc(String(x.admin_note || "No note"))}</span></div>
          <div><b>Rider</b><span>${esc(String(x.rider_name || "Not assigned"))}</span><small>${esc(String(x.rider_phone || ""))}</small></div>
        </div>

        <form method="POST" action="/merchant/orders" class="govo-mo-form">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <input name="merchant_note" placeholder="Merchant note">
          <div class="govo-mo-buttons">
            <button name="status" value="merchant_confirmed">Confirm</button>
            <button name="status" value="preparing">Preparing</button>
            <button name="status" value="ready">Ready</button>
          </div>
        </form>
      </div>
    `).join("");

    return res.send(page("Merchant Orders", `
      <style>
        .govo-mo-nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .govo-mo-nav a{font-size:13px!important;padding:9px 11px!important;border-radius:13px!important;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:800;color:#bbf7d0!important}
        .govo-merchant-order-card{margin-top:14px!important;padding:16px!important}
        .govo-mo-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .govo-mo-head h2{font-size:22px!important;line-height:1.15!important;margin:10px 0 4px!important;color:#22c55e!important}
        .govo-mo-head small{font-size:13px!important;color:#cbd5e1!important}
        .govo-mo-chip,.govo-mo-status{display:inline-flex;padding:5px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-size:13px!important;font-weight:900;text-transform:capitalize}
        .govo-mo-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}
        .govo-mo-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px;min-width:0}
        .govo-mo-grid b{display:block;font-size:13px!important;margin-bottom:5px}
        .govo-mo-grid span{display:block;font-size:14px!important;line-height:1.35!important;word-break:break-word}
        .govo-mo-grid small{display:block;font-size:12px!important;margin-top:3px}
        .govo-mo-form{display:grid;gap:8px;margin-top:10px}
        .govo-mo-form input{font-size:14px!important;padding:10px!important;border-radius:12px!important;width:100%!important}
        .govo-mo-form button{font-size:14px!important;padding:10px!important;border-radius:12px!important}
        .govo-mo-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        @media(max-width:700px){
          .govo-mo-grid{grid-template-columns:1fr}
          .govo-mo-buttons{grid-template-columns:1fr}
          .govo-mo-head{flex-direction:column}
        }
      </style>

      <div class="card">
        <h1>📦 Merchant Orders</h1>
        <p><b>Shop:</b> ${esc(String(m.shop_name || ""))}</p>
        <p><b>Merchant:</b> ${esc(String(m.owner_name || ""))} — ${esc(String(m.phone || ""))}</p>

        <div class="govo-mo-nav">
          <a href="/merchant/dashboard?phone=${encodeURIComponent(phone)}">Dashboard</a>
          <a href="/merchant/products?phone=${encodeURIComponent(phone)}">Products/Menu</a>
          <a href="/shop/${encodeURIComponent(String(m.id))}">View Shop</a>
          <a href="/shops">All Shops</a>
        </div>
      </div>

      ${cards || `<div class="card"><h2>No orders yet</h2><p>Customer order korle ekhane show korbe.</p></div>`}
    `));
  } catch(e) {
    console.log("Merchant orders error:", e.message);
    return res.status(500).send(page("Merchant Orders Error", `<div class="card"><h1>Merchant Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO MERCHANT ORDERS V1 END */



/* GOVO ADMIN ORDER FILTERS V1 START */


/* GOVO ADMIN RIDERS POLISH V1 START */

async function govoEnsureAdminRidersPolishV1(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_rider_leads (
      id SERIAL PRIMARY KEY,
      rider_name TEXT,
      phone TEXT,
      location TEXT,
      vehicle_type TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS name TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS phone TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS location TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS vehicle_type TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
}

function govoAdminRiderPinOk(req,res){
  const pin = String((req.query && req.query.pin) || (req.body && req.body.pin) || "").trim();
  const real = String(process.env.ADMIN_PIN || "").trim();

  if (!pin || !real || pin !== real) {
    res.send(page("Admin PIN Login", `
      <div class="card">
        <h1>🔐 Admin PIN</h1>
        <p>Rider management খুলতে PIN দিন।</p>
        <form method="GET" action="/admin/riders">
          <input name="pin" placeholder="Enter admin PIN" required>
          <button>Open Riders</button>
        </form>
      </div>
    `));
    return false;
  }

  return true;
}

async function govoAdminRiderNotifyV1(text){
  try {
    if (typeof sendTelegram === "function") {
      await sendTelegram(text);
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_CHAT_ID || "";
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId, text})
    });
  } catch(e) {
    console.log("Admin rider notify skipped:", e.message);
  }
}

app.post("/admin/rider/status", async (req,res)=>{
  try {
    if (!govoAdminRiderPinOk(req,res)) return;

    await govoEnsureAdminRidersPolishV1();

    const pin = String(req.body.pin || "");
    const id = String(req.body.id || "");
    const status = String(req.body.status || "pending");
    const admin_note = String(req.body.admin_note || "");

    const r = await pool.query(`
      UPDATE govo_rider_leads
      SET status=$1, admin_note=$2, updated_at=NOW()
      WHERE id=$3
      RETURNING *
    `, [status, admin_note, id]);

    if (r.rows.length) {
      const x = r.rows[0];
      await govoAdminRiderNotifyV1([
        "🛵 GOVO Rider Status Updated",
        "",
        `Rider ID: #${x.id}`,
        `Name: ${x.rider_name || x.name || ""}`,
        `Phone: ${x.phone || ""}`,
        `Vehicle: ${x.vehicle_type || ""}`,
        `Location: ${x.location || ""}`,
        `Status: ${String(x.status || "").toUpperCase()}`,
        `Admin Note: ${x.admin_note || "N/A"}`
      ].join("\n"));
    }

    return res.redirect("/admin/riders?pin=" + encodeURIComponent(pin));
  } catch(e) {
    console.log("Admin rider status error:", e.message);
    return res.status(500).send(page("Rider Status Error", `<div class="card"><h1>Rider Status Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/admin/riders", async (req,res)=>{
  try {
    if (!govoAdminRiderPinOk(req,res)) return;

    await govoEnsureAdminRidersPolishV1();

    const pin = String(req.query.pin || "");
    const status = String((req.query && req.query.status) || "all").trim();
    const q = String((req.query && req.query.q) || "").trim();

    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`COALESCE(status,'pending')=$${params.length}`);
    }

    if (q) {
      params.push("%" + q.toLowerCase() + "%");
      conditions.push(`
        LOWER(
          COALESCE(rider_name,'') || ' ' ||
          COALESCE(name,'') || ' ' ||
          COALESCE(phone,'') || ' ' ||
          COALESCE(location,'') || ' ' ||
          COALESCE(vehicle_type,'') || ' ' ||
          COALESCE(admin_note,'')
        ) LIKE $${params.length}
      `);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const riders = await pool.query(`
      SELECT id,
             COALESCE(NULLIF(rider_name,''), NULLIF(name,''), 'Unnamed Rider') AS rider_name,
             phone, location, vehicle_type,
             COALESCE(status,'pending') AS status,
             admin_note, created_at, updated_at
      FROM govo_rider_leads
      ${where}
      ORDER BY id DESC
      LIMIT 150
    `, params);

    const counts = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int AS pending,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int AS approved,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int AS rejected
      FROM govo_rider_leads
    `);

    const c = counts.rows[0] || {};

    const link = (label, st, active) => {
      const sp = new URLSearchParams({ pin });
      if (st && st !== "all") sp.set("status", st);
      return `<a class="${active ? "active" : ""}" href="/admin/riders?${sp.toString()}">${label}</a>`;
    };

    const cards = riders.rows.map(x=>`
      <div class="card govo-rider-admin-card">
        <div class="govo-ra-head">
          <div>
            <span class="govo-chip">#${esc(String(x.id))}</span>
            <h2>${esc(String(x.rider_name || ""))}</h2>
            <small>${esc(String(x.phone || ""))}</small>
          </div>
          <span class="govo-status">${esc(String(x.status || "pending"))}</span>
        </div>

        <div class="govo-ra-grid">
          <div><b>Location</b><span>${esc(String(x.location || ""))}</span></div>
          <div><b>Vehicle</b><span>${esc(String(x.vehicle_type || ""))}</span></div>
          <div><b>Admin Note</b><span>${esc(String(x.admin_note || "No note"))}</span></div>
          <div><b>Joined</b><span>${esc(String(x.created_at || ""))}</span></div>
        </div>

        <form method="POST" action="/admin/rider/status" class="govo-ra-form">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <input name="admin_note" placeholder="Admin note">
          <div class="govo-ra-buttons">
            <button name="status" value="approved">Approve</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="pending">Pending</button>
          </div>
        </form>

        <div class="govo-ra-links">
          <a href="/rider/dashboard?phone=${encodeURIComponent(String(x.phone || ""))}">Open Rider Dashboard</a>
          <a href="tel:${esc(String(x.phone || ""))}">Call Rider</a>
        </div>
      </div>
    `).join("");

    return res.send(page("Admin Riders", `
      <style>
        .govo-ra-nav{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
        .govo-ra-nav a{font-size:13px!important;padding:9px 11px!important;border-radius:999px;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:900;color:#bbf7d0!important;background:rgba(34,197,94,.06)}
        .govo-ra-nav a.active{background:#22c55e!important;color:#052e16!important}
        .govo-ra-search{display:grid;gap:8px;margin-top:12px}
        .govo-ra-search input{padding:10px!important;border-radius:12px!important;font-size:14px!important}
        .govo-ra-search button{padding:10px!important;border-radius:12px!important;font-size:14px!important}
        .govo-rider-admin-card{margin-top:14px!important;padding:16px!important}
        .govo-ra-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .govo-ra-head h2{font-size:22px!important;line-height:1.15!important;margin:10px 0 4px!important;color:#22c55e!important}
        .govo-ra-head small{font-size:13px!important;color:#cbd5e1!important}
        .govo-chip,.govo-status{display:inline-flex;padding:5px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-size:13px!important;font-weight:900;text-transform:capitalize}
        .govo-ra-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}
        .govo-ra-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px}
        .govo-ra-grid b{display:block;font-size:13px!important;margin-bottom:5px}
        .govo-ra-grid span{display:block;font-size:14px!important;line-height:1.35!important;word-break:break-word}
        .govo-ra-form{display:grid;gap:8px;margin-top:10px}
        .govo-ra-form input{font-size:14px!important;padding:10px!important;border-radius:12px!important;width:100%!important}
        .govo-ra-form button{font-size:14px!important;padding:10px!important;border-radius:12px!important}
        .govo-ra-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        .govo-ra-links{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
        .govo-ra-links a{text-align:center;text-decoration:none;font-size:13px!important;padding:10px;border-radius:12px;border:1px solid rgba(34,197,94,.35);color:#bbf7d0!important;font-weight:900}
        @media(max-width:700px){
          .govo-ra-grid{grid-template-columns:1fr}
          .govo-ra-buttons,.govo-ra-links{grid-template-columns:1fr}
          .govo-ra-head{flex-direction:column}
        }
      </style>

      <div class="card">
        <h1>🛵 Admin Riders</h1>
        <p>Rider approve/reject, search, filter, dashboard access.</p>

        <div class="govo-ra-nav">
          ${link("All " + (c.total || 0), "all", status==="all")}
          ${link("Pending " + (c.pending || 0), "pending", status==="pending")}
          ${link("Approved " + (c.approved || 0), "approved", status==="approved")}
          ${link("Rejected " + (c.rejected || 0), "rejected", status==="rejected")}
        </div>

        <form method="GET" action="/admin/riders" class="govo-ra-search">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input name="q" value="${esc(q)}" placeholder="Search rider, phone, location, vehicle">
          <button>🔎 Search Rider</button>
        </form>

        <div class="govo-ra-nav">
          <a href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a>
          <a href="/admin/orders?pin=${encodeURIComponent(pin)}">Orders</a>
          <a href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchants</a>
          <a href="/rider">Rider Registration</a>
        </div>

        <p><b>${riders.rows.length}</b> rider showing.</p>
      </div>

      ${cards || `<div class="card"><h2>No rider found</h2><p>Filter/search change kore dekho.</p></div>`}
    `));
  } catch(e) {
    console.log("Admin riders polish error:", e.message);
    return res.status(500).send(page("Admin Riders Error", `<div class="card"><h1>Admin Riders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN RIDERS POLISH V1 END */


app.get("/admin/orders", async (req,res)=>{
  try {
    const pin = String((req.query && req.query.pin) || "").trim();
    const real = String(process.env.ADMIN_PIN || "").trim();

    if (!pin || !real || pin !== real) {
      return res.send(page("Admin PIN Login", `
        <div class="card">
          <h1>🔐 Admin PIN</h1>
          <p>Admin orders দেখতে PIN দিন।</p>
          <form method="GET" action="/admin/orders">
            <input name="pin" placeholder="Enter admin PIN" required>
            <button>Open Orders</button>
          </form>
        </div>
      `));
    }

    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_id INT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_note TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
    await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");

    const status = String((req.query && req.query.status) || "all").trim();
    const day = String((req.query && req.query.day) || "").trim();
    const q = String((req.query && req.query.q) || "").trim();

    const conditions = [];
    const params = [];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`COALESCE(status,'pending')=$${params.length}`);
    }

    if (day === "today") {
      conditions.push(`created_at::date = CURRENT_DATE`);
    }

    if (q) {
      params.push("%" + q.toLowerCase() + "%");
      conditions.push(`
        LOWER(
          COALESCE(shop_name,'') || ' ' ||
          COALESCE(merchant_phone,'') || ' ' ||
          COALESCE(customer_name,'') || ' ' ||
          COALESCE(customer_phone,'') || ' ' ||
          COALESCE(pickup_location,'') || ' ' ||
          COALESCE(drop_location,'') || ' ' ||
          COALESCE(item_details,'') || ' ' ||
          COALESCE(rider_name,'') || ' ' ||
          COALESCE(rider_phone,'')
        ) LIKE $${params.length}
      `);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const orders = await pool.query(`
      SELECT id, shop_name, merchant_phone, customer_name, customer_phone,
             pickup_location, drop_location, item_details, note,
             COALESCE(status,'pending') AS status,
             admin_note, merchant_note, rider_name, rider_phone, created_at
      FROM govo_orders
      ${where}
      ORDER BY id DESC
      LIMIT 100
    `, params);

    const counts = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int AS pending,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='accepted')::int AS accepted,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='picked_up')::int AS picked_up,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int AS rejected
      FROM govo_orders
    `);

    const riders = await pool.query(`
      SELECT id, rider_name, phone
      FROM govo_rider_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const c = counts.rows[0] || {};
    const link = (label, extra, active) => {
      const sp = new URLSearchParams({ pin });
      Object.keys(extra || {}).forEach(k => {
        if (extra[k]) sp.set(k, extra[k]);
      });
      return `<a class="${active ? "active" : ""}" href="/admin/orders?${sp.toString()}">${label}</a>`;
    };

    const riderOptions = riders.rows.map(r=>`
      <option value="${esc(String(r.id))}">${esc(String(r.rider_name || ""))} — ${esc(String(r.phone || ""))}</option>
    `).join("");

    const cards = orders.rows.map(x=>`
      <div class="card govo-order-card">
        <div class="govo-order-head">
          <div>
            <span class="govo-chip">#${esc(String(x.id))}</span>
            <h2>${esc(String(x.shop_name || "Unknown Shop"))}</h2>
            <small>${esc(String(x.merchant_phone || ""))}</small>
          </div>
          <span class="govo-status">${esc(String(x.status || "pending"))}</span>
        </div>

        <div class="govo-grid">
          <div><b>Customer</b><span>${esc(String(x.customer_name || ""))}</span><small>${esc(String(x.customer_phone || ""))}</small></div>
          <div><b>Pickup</b><span>${esc(String(x.pickup_location || ""))}</span></div>
          <div><b>Drop</b><span>${esc(String(x.drop_location || ""))}</span></div>
          <div><b>Item</b><span>${esc(String(x.item_details || ""))}</span></div>
          <div><b>Rider</b><span>${esc(String(x.rider_name || "Not assigned"))}</span><small>${esc(String(x.rider_phone || ""))}</small></div>
          <div><b>Note</b><span>${esc(String(x.note || "No note"))}</span></div>
        </div>

        <form method="POST" action="/admin/order/assign" class="govo-form">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="order_id" value="${esc(String(x.id))}">
          <select name="rider_id" required>
            <option value="">Select Rider</option>
            ${riderOptions}
          </select>
          <button>🛵 Assign Rider</button>
        </form>

        <form method="POST" action="/admin/order/status" class="govo-form">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <input name="admin_note" placeholder="Admin note">
          <div class="govo-buttons">
            <button name="status" value="accepted">Accept</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="delivered">Delivered</button>
          </div>
        </form>
      </div>
    `).join("");

    return res.send(page("Admin Orders", `
      <style>
        .govo-filter-nav{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
        .govo-filter-nav a{font-size:13px!important;padding:9px 11px!important;border-radius:999px;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:900;color:#bbf7d0!important;background:rgba(34,197,94,.06)}
        .govo-filter-nav a.active{background:#22c55e!important;color:#052e16!important}
        .govo-search{display:grid;gap:8px;margin-top:12px}
        .govo-search input{padding:10px!important;border-radius:12px!important;font-size:14px!important}
        .govo-search button{padding:10px!important;border-radius:12px!important;font-size:14px!important}
        .govo-order-card{margin-top:14px!important;padding:16px!important}
        .govo-order-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .govo-order-head h2{font-size:22px!important;margin:10px 0 4px!important;color:#22c55e!important;line-height:1.15!important}
        .govo-order-head small{font-size:13px!important;color:#cbd5e1!important}
        .govo-chip,.govo-status{display:inline-flex;padding:5px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-size:13px!important;font-weight:900;text-transform:capitalize}
        .govo-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}
        .govo-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px}
        .govo-grid b{display:block;font-size:13px!important;margin-bottom:5px}
        .govo-grid span{display:block;font-size:14px!important;line-height:1.35!important;word-break:break-word}
        .govo-grid small{display:block;font-size:12px!important;margin-top:3px;color:#cbd5e1}
        .govo-form{display:grid;gap:8px;margin-top:10px}
        .govo-form input,.govo-form select{font-size:14px!important;padding:10px!important;border-radius:12px!important;width:100%!important}
        .govo-form button{font-size:14px!important;padding:10px!important;border-radius:12px!important}
        .govo-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        @media(max-width:700px){
          .govo-grid{grid-template-columns:1fr}
          .govo-buttons{grid-template-columns:1fr}
          .govo-order-head{flex-direction:column}
        }
      </style>

      <div class="card">
        <h1>📦 Admin Orders</h1>
        <p>Filter diye fast order manage korun.</p>

        <div class="govo-filter-nav">
          ${link("All " + (c.total || 0), {}, status==="all" && !day)}
          ${link("Today " + (c.today || 0), {day:"today"}, day==="today")}
          ${link("Pending " + (c.pending || 0), {status:"pending"}, status==="pending")}
          ${link("Accepted " + (c.accepted || 0), {status:"accepted"}, status==="accepted")}
          ${link("Assigned " + (c.assigned || 0), {status:"assigned"}, status==="assigned")}
          ${link("Picked Up " + (c.picked_up || 0), {status:"picked_up"}, status==="picked_up")}
          ${link("Delivered " + (c.delivered || 0), {status:"delivered"}, status==="delivered")}
          ${link("Rejected " + (c.rejected || 0), {status:"rejected"}, status==="rejected")}
        </div>

        <form method="GET" action="/admin/orders" class="govo-search">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input name="q" value="${esc(q)}" placeholder="Search shop, customer, phone, drop, item">
          <button>🔎 Search Orders</button>
        </form>

        <div class="govo-filter-nav">
          <a href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a>
          <a href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchants</a>
          <a href="/admin/riders?pin=${encodeURIComponent(pin)}">Riders</a>
        </div>

        <p><b>${orders.rows.length}</b> order showing.</p>
      </div>

      ${cards || `<div class="card"><h2>No orders found</h2><p>Filter change kore dekho.</p></div>`}
    `));
  } catch(e) {
    console.log("Admin order filters error:", e.message);
    return res.status(500).send(page("Admin Orders Error", `<div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN ORDER FILTERS V1 END */


app.get("/admin/orders", async (req,res)=>{
  try {
    const pin = String((req.query && req.query.pin) || "").trim();
    const real = String(process.env.ADMIN_PIN || "").trim();

    if (!pin || !real || pin !== real) {
      return res.send(page("Admin PIN Login", `
        <div class="card govo-compact-wrap">
          <h1>🔐 Admin PIN</h1>
          <p>Admin orders দেখতে PIN দিন.</p>
          <form method="GET" action="/admin/orders">
            <input name="pin" placeholder="Enter admin PIN" required>
            <button>Open Orders</button>
          </form>
        </div>
      `));
    }

    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_id INT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
    await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");

    const orders = await pool.query(`
      SELECT id, shop_name, merchant_phone, customer_name, customer_phone,
             pickup_location, drop_location, item_details, note,
             COALESCE(status,'pending') AS status,
             admin_note, rider_name, rider_phone, created_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 100
    `);

    const riders = await pool.query(`
      SELECT id, rider_name, phone
      FROM govo_rider_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const riderOptions = riders.rows.map(r=>`
      <option value="${esc(String(r.id))}">${esc(String(r.rider_name || ""))} — ${esc(String(r.phone || ""))}</option>
    `).join("");

    const cards = orders.rows.map(x=>`
      <div class="card govo-order-compact-card">
        <div class="govo-order-head">
          <div>
            <span class="govo-chip">#${esc(String(x.id))}</span>
            <h2>${esc(String(x.shop_name || "Unknown Shop"))}</h2>
            <small>${esc(String(x.merchant_phone || ""))}</small>
          </div>
          <span class="govo-status-chip">${esc(String(x.status || "pending"))}</span>
        </div>

        <div class="govo-mini-grid">
          <div><b>Customer</b><span>${esc(String(x.customer_name || ""))}</span><small>${esc(String(x.customer_phone || ""))}</small></div>
          <div><b>Pickup</b><span>${esc(String(x.pickup_location || ""))}</span></div>
          <div><b>Drop</b><span>${esc(String(x.drop_location || ""))}</span></div>
          <div><b>Item</b><span>${esc(String(x.item_details || ""))}</span></div>
          <div><b>Rider</b><span>${esc(String(x.rider_name || "Not assigned"))}</span><small>${esc(String(x.rider_phone || ""))}</small></div>
          <div><b>Note</b><span>${esc(String(x.note || "No note"))}</span></div>
        </div>

        <form method="POST" action="/admin/order/assign" class="govo-compact-form">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="order_id" value="${esc(String(x.id))}">
          <select name="rider_id" required>
            <option value="">Select Rider</option>
            ${riderOptions}
          </select>
          <button>🛵 Assign Rider</button>
        </form>

        <form method="POST" action="/admin/order/status" class="govo-compact-form">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <input name="admin_note" placeholder="Admin note">
          <div class="govo-compact-buttons">
            <button name="status" value="accepted">Accept</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="delivered">Delivered</button>
          </div>
        </form>
      </div>
    `).join("");

    return res.send(page("Admin Orders", `
      <style>
        .govo-compact-wrap h1{font-size:32px!important;line-height:1.1!important;margin:0 0 10px!important}
        .govo-compact-wrap p{font-size:15px!important;line-height:1.5!important;margin:0 0 14px!important}
        .govo-compact-nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .govo-compact-nav a{font-size:13px!important;padding:9px 11px!important;border-radius:13px!important;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:800;color:#bbf7d0!important}
        .govo-order-compact-card{margin-top:14px!important;padding:16px!important}
        .govo-order-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .govo-order-head h2{font-size:22px!important;line-height:1.15!important;margin:10px 0 4px!important;color:#22c55e!important}
        .govo-order-head small{font-size:13px!important;color:#cbd5e1!important}
        .govo-chip,.govo-status-chip{display:inline-flex;padding:5px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-size:13px!important;font-weight:900;text-transform:capitalize}
        .govo-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}
        .govo-mini-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px;min-width:0}
        .govo-mini-grid b{display:block;font-size:13px!important;color:#e5e7eb!important;margin-bottom:5px}
        .govo-mini-grid span{display:block;font-size:14px!important;line-height:1.35!important;word-break:break-word;color:#f8fafc!important}
        .govo-mini-grid small{display:block;font-size:12px!important;line-height:1.3!important;color:#cbd5e1!important;margin-top:3px}
        .govo-compact-form{display:grid;gap:8px;margin-top:10px}
        .govo-compact-form input,.govo-compact-form select{font-size:14px!important;padding:10px!important;border-radius:12px!important;width:100%!important}
        .govo-compact-form button{font-size:14px!important;padding:10px!important;border-radius:12px!important}
        .govo-compact-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        @media(max-width:700px){
          .card.govo-compact-wrap{padding:18px!important}
          .govo-compact-wrap h1{font-size:30px!important}
          .govo-mini-grid{grid-template-columns:1fr}
          .govo-compact-buttons{grid-template-columns:1fr}
          .govo-order-head{flex-direction:column}
        }
      </style>

      <div class="card govo-compact-wrap">
        <h1>📦 Admin Orders</h1>
        <p>Orders manage, rider assign, status update.</p>
        <div class="govo-compact-nav">
          <a href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a>
          <a href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchant Leads</a>
          <a href="/admin/riders?pin=${encodeURIComponent(pin)}">Rider Leads</a>
          <a href="/rider/dashboard">Rider Dashboard</a>
        </div>
      </div>

      ${cards || `<div class="card govo-order-compact-card"><h2>No orders found</h2></div>`}
    `));
  } catch(e) {
    return res.status(500).send(page("Admin Orders Error", `<div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN ORDERS COMPACT UI END */


app.get("/admin/orders", async (req,res)=>{
  try {
    const pin = String((req.query && req.query.pin) || "").trim();
    const real = String(process.env.ADMIN_PIN || "").trim();

    if (!pin) return govoAdminOrdersPinLoginMobile(res, "PIN missing. Admin orders খুলতে PIN দিন.");
    if (!real || pin !== real) return govoAdminOrdersPinLoginMobile(res, "Wrong PIN. আবার সঠিক PIN দিন.");

    await govoEnsureAdminOrdersMobileUi();

    const orders = await pool.query(`
      SELECT id, shop_name, merchant_phone, customer_name, customer_phone,
             pickup_location, drop_location, item_details, note,
             COALESCE(status,'pending') AS status,
             admin_note, rider_id, rider_name, rider_phone, created_at, updated_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 100
    `);

    const riders = await pool.query(`
      SELECT id, rider_name, phone, COALESCE(status,'pending') AS status
      FROM govo_rider_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const riderOptions = riders.rows.map(r=>`
      <option value="${esc(String(r.id))}">${esc(String(r.rider_name || ""))} — ${esc(String(r.phone || ""))}</option>
    `).join("");

    const cards = orders.rows.map(x=>`
      <div class="card govo-order-card">
        <div class="govo-order-top">
          <div>
            <div class="govo-badge">#${esc(String(x.id))}</div>
            <h2>${esc(String(x.shop_name || "Unknown Shop"))}</h2>
            <p>${esc(String(x.merchant_phone || ""))}</p>
          </div>
          <div class="govo-status">${esc(String(x.status || "pending"))}</div>
        </div>

        <div class="govo-order-grid">
          <div><b>Customer</b><br>${esc(String(x.customer_name || ""))}<br>${esc(String(x.customer_phone || ""))}</div>
          <div><b>Pickup</b><br>${esc(String(x.pickup_location || ""))}</div>
          <div><b>Drop</b><br>${esc(String(x.drop_location || ""))}</div>
          <div><b>Item</b><br>${esc(String(x.item_details || ""))}</div>
          <div><b>Note</b><br>${esc(String(x.note || "No note"))}</div>
          <div><b>Rider</b><br>${esc(String(x.rider_name || "Not assigned"))}<br>${esc(String(x.rider_phone || ""))}</div>
        </div>

        <form method="POST" action="/admin/order/assign" class="govo-action-box">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="order_id" value="${esc(String(x.id))}">
          <select name="rider_id" required>
            <option value="">Select Rider</option>
            ${riderOptions}
          </select>
          <button>🛵 Assign Rider</button>
        </form>

        <form method="POST" action="/admin/order/status" class="govo-action-box">
          <input type="hidden" name="pin" value="${esc(pin)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <input name="admin_note" placeholder="Admin note">
          <div class="govo-status-buttons">
            <button name="status" value="accepted">Accept</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="delivered">Delivered</button>
          </div>
        </form>
      </div>
    `).join("");

    return res.send(page("Admin Orders", `
      <style>
        .govo-admin-nav{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
        .govo-admin-nav a{padding:10px 12px;border-radius:14px;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:900}
        .govo-order-card{margin-top:18px}
        .govo-order-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .govo-order-top h2{color:#22c55e;margin:10px 0 4px;font-size:26px}
        .govo-badge,.govo-status{display:inline-flex;padding:7px 12px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-weight:900}
        .govo-order-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0;line-height:1.55}
        .govo-order-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px}
        .govo-action-box{display:grid;gap:10px;margin-top:12px}
        .govo-action-box input,.govo-action-box select{width:100%;padding:12px;border-radius:12px}
        .govo-status-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        @media(max-width:700px){
          .govo-order-grid{grid-template-columns:1fr}
          .govo-status-buttons{grid-template-columns:1fr}
          .govo-order-top{flex-direction:column}
        }
      </style>

      <div class="card">
        <h1>📦 Admin Orders</h1>
        <p>Mobile friendly order management.</p>
        <div class="govo-admin-nav">
          <a href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a>
          <a href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchant Leads</a>
          <a href="/admin/riders?pin=${encodeURIComponent(pin)}">Rider Leads</a>
          <a href="/rider/dashboard">Rider Dashboard</a>
        </div>
      </div>

      ${cards || `<div class="card"><h2>No orders found</h2></div>`}
    `));
  } catch(e) {
    console.log("Admin orders mobile UI error:", e.message);
    return res.status(500).send(page("Admin Orders Error", `<div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN ORDERS MOBILE UI END */


app.get("/admin/orders", async (req,res)=>{
  try {
    const pin = String((req.query && req.query.pin) || "").trim();
    const real = String(process.env.ADMIN_PIN || "").trim();

    if (!pin) {
      return govoAdminOrdersLogin(res, "PIN missing. Admin orders খুলতে PIN দিন.");
    }

    if (!real || pin !== real) {
      return govoAdminOrdersLogin(res, "Wrong PIN. আবার সঠিক PIN দিন.");
    }

    await govoEnsureAdminOrdersPinFix();

    const orders = await pool.query(`
      SELECT id, shop_name, merchant_phone, customer_name, customer_phone,
             pickup_location, drop_location, item_details, note,
             COALESCE(status,'pending') AS status,
             admin_note, rider_id, rider_name, rider_phone, created_at, updated_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 100
    `);

    const riders = await pool.query(`
      SELECT id, rider_name, phone, location, vehicle_type, COALESCE(status,'pending') AS status
      FROM govo_rider_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const riderOptions = riders.rows.map(r=>`
      <option value="${esc(String(r.id))}">${esc(String(r.rider_name || ""))} — ${esc(String(r.phone || ""))}</option>
    `).join("");

    const rows = orders.rows.map(x=>`
      <tr>
        <td>#${esc(String(x.id))}</td>
        <td>
          <b>${esc(String(x.shop_name || ""))}</b><br>
          <small>${esc(String(x.merchant_phone || ""))}</small>
        </td>
        <td>
          <b>${esc(String(x.customer_name || ""))}</b><br>
          ${esc(String(x.customer_phone || ""))}
        </td>
        <td>
          <b>Pickup:</b> ${esc(String(x.pickup_location || ""))}<br>
          <b>Drop:</b> ${esc(String(x.drop_location || ""))}
        </td>
        <td>
          ${esc(String(x.item_details || ""))}<br>
          <small>${esc(String(x.note || ""))}</small>
        </td>
        <td>
          <b>${esc(String(x.status || "pending"))}</b><br>
          <small>Rider: ${esc(String(x.rider_name || "Not assigned"))}</small><br>
          <small>${esc(String(x.rider_phone || ""))}</small>
        </td>
        <td>
          <form method="POST" action="/admin/order/assign" style="display:grid;gap:8px;min-width:170px;margin-bottom:10px">
            <input type="hidden" name="pin" value="${esc(pin)}">
            <input type="hidden" name="order_id" value="${esc(String(x.id))}">
            <select name="rider_id" required>
              <option value="">Select Rider</option>
              ${riderOptions}
            </select>
            <button>Assign Rider</button>
          </form>

          <form method="POST" action="/admin/order/status" style="display:grid;gap:8px;min-width:170px">
            <input type="hidden" name="pin" value="${esc(pin)}">
            <input type="hidden" name="id" value="${esc(String(x.id))}">
            <input name="admin_note" placeholder="Admin note" style="padding:8px;border-radius:10px">
            <button name="status" value="accepted">Accept</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="delivered">Delivered</button>
          </form>
        </td>
        <td><small>${esc(String(x.created_at || ""))}</small></td>
      </tr>
    `).join("");

    return res.send(page("Admin Orders", `
      <div class="card">
        <h1>📦 Admin Orders</h1>
        <p>Orders manage korun, rider assign korun, status update korun.</p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0">
          <a class="btn" href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a>
          <a class="btn" href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchant Leads</a>
          <a class="btn" href="/admin/riders?pin=${encodeURIComponent(pin)}">Rider Leads</a>
          <a class="btn" href="/rider/dashboard">Rider Dashboard</a>
        </div>

        <div style="overflow:auto">
          <table>
            <tr>
              <th>ID</th>
              <th>Shop</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Item</th>
              <th>Status/Rider</th>
              <th>Actions</th>
              <th>Time</th>
            </tr>
            ${rows || `<tr><td colspan="8">No orders found</td></tr>`}
          </table>
        </div>
      </div>
    `));
  } catch(e) {
    console.log("Admin orders pin fix error:", e.message);
    return res.status(500).send(page("Admin Orders Error", `<div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN ORDERS PIN LOGIN FIX END */


app.get("/admin/orders", async (req,res)=>{
  try {
    if(!govoPinOkV2(req,res)) return;

    await govoEnsureRiderAssignTables();

    const pin = String(req.query.pin || "");

    const orders = await pool.query(`
      SELECT id, shop_name, merchant_phone, customer_name, customer_phone,
             pickup_location, drop_location, item_details, note,
             COALESCE(status,'pending') AS status,
             admin_note, rider_id, rider_name, rider_phone, created_at, updated_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 100
    `);

    const riders = await pool.query(`
      SELECT id, rider_name, phone, location, vehicle_type, COALESCE(status,'pending') AS status
      FROM govo_rider_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const riderOptions = riders.rows.map(r=>`
      <option value="${esc(String(r.id))}">${esc(String(r.rider_name || ""))} — ${esc(String(r.phone || ""))}</option>
    `).join("");

    const rows = orders.rows.map(x=>`
      <tr>
        <td>#${esc(String(x.id))}</td>
        <td>
          <b>${esc(String(x.shop_name || ""))}</b><br>
          <small>${esc(String(x.merchant_phone || ""))}</small>
        </td>
        <td>
          <b>${esc(String(x.customer_name || ""))}</b><br>
          ${esc(String(x.customer_phone || ""))}
        </td>
        <td>
          <b>Pickup:</b> ${esc(String(x.pickup_location || ""))}<br>
          <b>Drop:</b> ${esc(String(x.drop_location || ""))}
        </td>
        <td>
          ${esc(String(x.item_details || ""))}<br>
          <small>${esc(String(x.note || ""))}</small>
        </td>
        <td>
          <b>${esc(String(x.status || "pending"))}</b><br>
          <small>Rider: ${esc(String(x.rider_name || "Not assigned"))}</small><br>
          <small>${esc(String(x.rider_phone || ""))}</small>
        </td>
        <td>
          <form method="POST" action="/admin/order/assign" style="display:grid;gap:8px;min-width:170px;margin-bottom:10px">
            <input type="hidden" name="pin" value="${esc(pin)}">
            <input type="hidden" name="order_id" value="${esc(String(x.id))}">
            <select name="rider_id" required>
              <option value="">Select Rider</option>
              ${riderOptions}
            </select>
            <button>Assign Rider</button>
          </form>

          <form method="POST" action="/admin/order/status" style="display:grid;gap:8px;min-width:170px">
            <input type="hidden" name="pin" value="${esc(pin)}">
            <input type="hidden" name="id" value="${esc(String(x.id))}">
            <input name="admin_note" placeholder="Admin note" style="padding:8px;border-radius:10px">
            <button name="status" value="accepted">Accept</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="delivered">Delivered</button>
          </form>
        </td>
        <td><small>${esc(String(x.created_at || ""))}</small></td>
      </tr>
    `).join("");

    return res.send(page("Admin Orders", `
      <div class="card">
        <h1>Admin Orders</h1>
        <p>Orders manage korun, rider assign korun.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0">
          <a class="btn" href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchant Leads</a>
          <a class="btn" href="/admin/riders?pin=${encodeURIComponent(pin)}">Rider Leads</a>
          <a class="btn" href="/rider/dashboard">Rider Dashboard</a>
        </div>
        <div style="overflow:auto">
          <table>
            <tr>
              <th>ID</th>
              <th>Shop</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Item</th>
              <th>Status/Rider</th>
              <th>Actions</th>
              <th>Time</th>
            </tr>
            ${rows || `<tr><td colspan="8">No orders found</td></tr>`}
          </table>
        </div>
      </div>
    `));
  } catch(e) {
    console.log("Admin orders/rider assign error:", e.message);
    return res.status(500).send(page("Admin Orders Error", `<div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});


/* GOVO RIDER DASHBOARD V2 START */

async function govoEnsureRiderDashboardV2(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_rider_leads (
      id SERIAL PRIMARY KEY,
      rider_name TEXT,
      phone TEXT,
      location TEXT,
      vehicle_type TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      merchant_note TEXT,
      rider_id INT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS phone TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS location TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS vehicle_type TEXT");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_id INT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
}

async function govoRiderNotifyV2(text){
  try {
    if (typeof sendTelegram === "function") {
      await sendTelegram(text);
      return;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_CHAT_ID || "";
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({chat_id: chatId, text})
    });
  } catch(e) {
    console.log("Rider notify skipped:", e.message);
  }
}

app.all("/rider/dashboard", async (req,res)=>{
  try {
    await govoEnsureRiderDashboardV2();

    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || "").trim();

    if (!phone) {
      return res.send(page("Rider Dashboard", `
        <div class="card">
          <h1>🛵 Rider Dashboard</h1>
          <p>Assigned delivery order দেখতে rider phone দিন।</p>

          <form method="GET" action="/rider/dashboard">
            <label>Rider Phone</label>
            <input name="phone" placeholder="018xxxxxxxx" required>
            <button>Open Dashboard</button>
          </form>

          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
            <a class="btn" href="/rider">🛵 Rider Registration</a>
            <a class="btn" href="/track">🔎 Track Order</a>
          </div>
        </div>
      `));
    }

    const rider = await pool.query(`
      SELECT id, rider_name, phone, location, vehicle_type, COALESCE(status,'pending') AS status
      FROM govo_rider_leads
      WHERE phone=$1
      ORDER BY id DESC
      LIMIT 1
    `, [phone]);

    if (!rider.rows.length) {
      return res.send(page("Rider Not Found", `
        <div class="card">
          <h1>Rider Not Found</h1>
          <p>এই phone number দিয়ে rider পাওয়া যায়নি।</p>
          <a class="btn" href="/rider">Register Rider</a>
        </div>
      `));
    }

    const rd = rider.rows[0];

    if (req.method === "POST") {
      const id = String(req.body.id || "");
      const status = String(req.body.status || "picked_up");

      const updated = await pool.query(`
        UPDATE govo_orders
        SET status=$1, updated_at=NOW()
        WHERE id=$2 AND rider_phone=$3
        RETURNING *
      `, [status, id, phone]);

      if (updated.rows.length) {
        const x = updated.rows[0];
        await govoRiderNotifyV2([
          "🛵 GOVO Rider Update",
          "",
          `Order ID: #${x.id}`,
          `Status: ${String(x.status || "").toUpperCase()}`,
          `Rider: ${x.rider_name || ""}`,
          `Shop: ${x.shop_name || ""}`,
          `Customer: ${x.customer_name || ""}`,
          `Drop: ${x.drop_location || ""}`,
          `Item: ${x.item_details || ""}`
        ].join("\n"));
      }

      return res.redirect("/rider/dashboard?phone=" + encodeURIComponent(phone));
    }

    const status = String((req.query && req.query.status) || "all").trim();
    const q = String((req.query && req.query.q) || "").trim();

    const conditions = ["rider_phone=$1"];
    const params = [phone];

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`COALESCE(status,'pending')=$${params.length}`);
    }

    if (q) {
      params.push("%" + q.toLowerCase() + "%");
      conditions.push(`
        LOWER(
          COALESCE(shop_name,'') || ' ' ||
          COALESCE(customer_name,'') || ' ' ||
          COALESCE(customer_phone,'') || ' ' ||
          COALESCE(pickup_location,'') || ' ' ||
          COALESCE(drop_location,'') || ' ' ||
          COALESCE(item_details,'')
        ) LIKE $${params.length}
      `);
    }

    const where = "WHERE " + conditions.join(" AND ");

    const orders = await pool.query(`
      SELECT *
      FROM govo_orders
      ${where}
      ORDER BY id DESC
      LIMIT 100
    `, params);

    const counts = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='picked_up')::int AS picked_up,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='failed')::int AS failed
      FROM govo_orders
      WHERE rider_phone=$1
    `, [phone]);

    const c = counts.rows[0] || {};

    const link = (label, st, active) => {
      const sp = new URLSearchParams({ phone });
      if (st && st !== "all") sp.set("status", st);
      return `<a class="${active ? "active" : ""}" href="/rider/dashboard?${sp.toString()}">${label}</a>`;
    };

    const cards = orders.rows.map(x=>`
      <div class="card govo-rider-card">
        <div class="govo-rider-head">
          <div>
            <span class="govo-chip">#${esc(String(x.id))}</span>
            <h2>${esc(String(x.shop_name || "Order"))}</h2>
            <small>${esc(String(x.customer_name || ""))} — ${esc(String(x.customer_phone || ""))}</small>
          </div>
          <span class="govo-status">${esc(String(x.status || "pending"))}</span>
        </div>

        <div class="govo-rider-grid">
          <div><b>Pickup</b><span>${esc(String(x.pickup_location || ""))}</span></div>
          <div><b>Drop</b><span>${esc(String(x.drop_location || ""))}</span></div>
          <div><b>Item</b><span>${esc(String(x.item_details || ""))}</span></div>
          <div><b>Customer Note</b><span>${esc(String(x.note || "No note"))}</span></div>
          <div><b>Admin Note</b><span>${esc(String(x.admin_note || "No note"))}</span></div>
          <div><b>Merchant Note</b><span>${esc(String(x.merchant_note || "No note"))}</span></div>
        </div>

        <form method="POST" action="/rider/dashboard" class="govo-rider-form">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <div class="govo-rider-buttons">
            <button name="status" value="picked_up">📦 Picked Up</button>
            <button name="status" value="delivered">🏁 Delivered</button>
            <button name="status" value="failed">⚠️ Failed</button>
          </div>
        </form>
      </div>
    `).join("");

    return res.send(page("Rider Dashboard", `
      <style>
        .govo-rider-nav{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
        .govo-rider-nav a{font-size:13px!important;padding:9px 11px!important;border-radius:999px;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:900;color:#bbf7d0!important;background:rgba(34,197,94,.06)}
        .govo-rider-nav a.active{background:#22c55e!important;color:#052e16!important}
        .govo-rider-search{display:grid;gap:8px;margin-top:12px}
        .govo-rider-search input{padding:10px!important;border-radius:12px!important;font-size:14px!important}
        .govo-rider-search button{padding:10px!important;border-radius:12px!important;font-size:14px!important}
        .govo-rider-card{margin-top:14px!important;padding:16px!important}
        .govo-rider-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .govo-rider-head h2{font-size:22px!important;line-height:1.15!important;margin:10px 0 4px!important;color:#22c55e!important}
        .govo-rider-head small{font-size:13px!important;color:#cbd5e1!important}
        .govo-chip,.govo-status{display:inline-flex;padding:5px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-size:13px!important;font-weight:900;text-transform:capitalize}
        .govo-rider-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}
        .govo-rider-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px}
        .govo-rider-grid b{display:block;font-size:13px!important;margin-bottom:5px}
        .govo-rider-grid span{display:block;font-size:14px!important;line-height:1.35!important;word-break:break-word}
        .govo-rider-form{display:grid;gap:8px;margin-top:10px}
        .govo-rider-form button{font-size:14px!important;padding:10px!important;border-radius:12px!important}
        .govo-rider-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        @media(max-width:700px){
          .govo-rider-grid{grid-template-columns:1fr}
          .govo-rider-buttons{grid-template-columns:1fr}
          .govo-rider-head{flex-direction:column}
        }
      </style>

      <div class="card">
        <h1>🛵 Rider Dashboard</h1>
        <p><b>Rider:</b> ${esc(String(rd.rider_name || ""))}</p>
        <p><b>Phone:</b> ${esc(String(rd.phone || ""))}</p>
        <p><b>Status:</b> ${esc(String(rd.status || ""))}</p>

        <div class="govo-rider-nav">
          ${link("All " + (c.total || 0), "all", status==="all")}
          ${link("Assigned " + (c.assigned || 0), "assigned", status==="assigned")}
          ${link("Picked Up " + (c.picked_up || 0), "picked_up", status==="picked_up")}
          ${link("Delivered " + (c.delivered || 0), "delivered", status==="delivered")}
          ${link("Failed " + (c.failed || 0), "failed", status==="failed")}
        </div>

        <form method="GET" action="/rider/dashboard" class="govo-rider-search">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input name="q" value="${esc(q)}" placeholder="Search order, customer, phone, drop, item">
          <button>🔎 Search</button>
        </form>

        <div class="govo-rider-nav">
          <a href="/rider">Rider Registration</a>
          <a href="/track">Track Order</a>
          <a href="https://govoexpress.com">Main Website</a>
        </div>
      </div>

      ${cards || `<div class="card"><h2>No assigned orders found</h2><p>Admin order assign করলে এখানে দেখাবে।</p></div>`}
    `));
  } catch(e) {
    console.log("Rider dashboard v2 error:", e.message);
    return res.status(500).send(page("Rider Dashboard Error", `<div class="card"><h1>Rider Dashboard Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO RIDER DASHBOARD V2 END */


app.all("/rider/dashboard", async (req,res)=>{
  try {
    await govoEnsureRiderAssignTables();

    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || "");

    if (!phone) {
      return res.send(page("Rider Dashboard", `
        <div class="card">
          <h1>Rider Dashboard</h1>
          <p>Rider phone number diye assigned order dekho.</p>
          <form method="GET" action="/rider/dashboard">
            <label>Rider Phone</label>
            <input name="phone" placeholder="018xxxxxxxx" required>
            <button>Open Dashboard</button>
          </form>
          <div style="margin-top:16px">
            <a class="btn" href="/rider">Rider Registration</a>
          </div>
        </div>
      `));
    }

    if (req.method === "POST") {
      const id = String(req.body.id || "");
      const status = String(req.body.status || "picked_up");

      const r = await pool.query(`
        UPDATE govo_orders
        SET status=$1, updated_at=NOW()
        WHERE id=$2 AND rider_phone=$3
        RETURNING *
      `, [status, id, phone]);

      if (r.rows.length) {
        const x = r.rows[0];

        await govoNotifyV2([
          "🛵 Rider Order Update",
          "",
          `Order ID: #${x.id}`,
          `Status: ${String(x.status || "").toUpperCase()}`,
          `Rider: ${x.rider_name || ""}`,
          `Customer: ${x.customer_name || ""}`,
          `Drop: ${x.drop_location || ""}`
        ].join("\n"));
      }

      return res.redirect("/rider/dashboard?phone=" + encodeURIComponent(phone));
    }

    const rider = await pool.query(`
      SELECT id, rider_name, phone, location, vehicle_type, COALESCE(status,'pending') AS status
      FROM govo_rider_leads
      WHERE phone=$1
      ORDER BY id DESC
      LIMIT 1
    `, [phone]);

    if (!rider.rows.length) {
      return res.send(page("Rider Not Found", `
        <div class="card">
          <h1>Rider Not Found</h1>
          <p>Ei phone number diye rider pawa jayni.</p>
          <a class="btn" href="/rider">Register Rider</a>
        </div>
      `));
    }

    const rd = rider.rows[0];

    const orders = await pool.query(`
      SELECT *
      FROM govo_orders
      WHERE rider_phone=$1
      ORDER BY id DESC
      LIMIT 100
    `, [phone]);

    const cards = orders.rows.map(x=>`
      <div class="card" style="margin-top:16px">
        <h2 style="color:#22c55e">Order #${esc(String(x.id))}</h2>
        <p><b>Status:</b> ${esc(String(x.status || ""))}</p>
        <p><b>Shop:</b> ${esc(String(x.shop_name || ""))}</p>
        <p><b>Customer:</b> ${esc(String(x.customer_name || ""))} — ${esc(String(x.customer_phone || ""))}</p>
        <p><b>Pickup:</b> ${esc(String(x.pickup_location || ""))}</p>
        <p><b>Drop:</b> ${esc(String(x.drop_location || ""))}</p>
        <p><b>Item:</b> ${esc(String(x.item_details || ""))}</p>

        <form method="POST" action="/rider/dashboard" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input type="hidden" name="id" value="${esc(String(x.id))}">
          <button name="status" value="picked_up">Picked Up</button>
          <button name="status" value="delivered">Delivered</button>
          <button name="status" value="failed">Failed</button>
        </form>
      </div>
    `).join("");

    return res.send(page("Rider Dashboard", `
      <div class="card">
        <h1>Rider Dashboard</h1>
        <p><b>Rider:</b> ${esc(String(rd.rider_name || ""))}</p>
        <p><b>Phone:</b> ${esc(String(rd.phone || ""))}</p>
        <p><b>Status:</b> ${esc(String(rd.status || ""))}</p>
      </div>
      ${cards || `<div class="card" style="margin-top:16px"><h2>No assigned order</h2><p>Admin order assign korle ekhane show korbe.</p></div>`}
    `));
  } catch(e) {
    console.log("Rider dashboard error:", e.message);
    return res.status(500).send(page("Rider Dashboard Error", `<div class="card"><h1>Rider Dashboard Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO RIDER ASSIGN V1 END */



/* GOVO TRACK POLISH V2 START */

async function govoEnsureTrackPolishV2(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      merchant_note TEXT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");
}

function govoTrackStatusTextV2(status){
  status = String(status || "pending").toLowerCase();
  if(status === "accepted") return "✅ Accepted";
  if(status === "assigned") return "🛵 Rider Assigned";
  if(status === "picked_up") return "📦 Picked Up";
  if(status === "merchant_confirmed") return "🏪 Merchant Confirmed";
  if(status === "preparing") return "👨‍🍳 Preparing";
  if(status === "ready") return "✅ Ready for Pickup";
  if(status === "delivered") return "🏁 Delivered";
  if(status === "rejected") return "❌ Rejected";
  if(status === "failed") return "⚠️ Failed";
  return "⏳ Pending";
}

app.get("/track", async (req,res)=>{
  try {
    await govoEnsureTrackPolishV2();

    const id = String((req.query && req.query.id) || "").trim();
    const phone = String((req.query && req.query.phone) || "").trim();

    let cards = "";

    if (id || phone) {
      let r;

      if (id && phone) {
        r = await pool.query(`SELECT * FROM govo_orders WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 5`, [id, phone]);
      } else if (id) {
        r = await pool.query(`SELECT * FROM govo_orders WHERE id=$1 ORDER BY id DESC LIMIT 5`, [id]);
      } else {
        r = await pool.query(`SELECT * FROM govo_orders WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone]);
      }

      cards = r.rows.length ? r.rows.map(x=>`
        <div class="card govo-track-card">
          <div class="govo-track-head">
            <div>
              <span class="govo-track-chip">Order #${esc(String(x.id))}</span>
              <h2>${esc(String(x.shop_name || "GOVO Order"))}</h2>
              <small>${esc(String(x.customer_phone || ""))}</small>
            </div>
            <span class="govo-track-status">${esc(govoTrackStatusTextV2(x.status))}</span>
          </div>

          <div class="govo-track-progress">
            <div class="${["pending","accepted","assigned","picked_up","merchant_confirmed","preparing","ready","delivered"].includes(String(x.status||"").toLowerCase()) ? "on" : ""}">Order</div>
            <div class="${["accepted","assigned","picked_up","merchant_confirmed","preparing","ready","delivered"].includes(String(x.status||"").toLowerCase()) ? "on" : ""}">Accepted</div>
            <div class="${["assigned","picked_up","delivered"].includes(String(x.status||"").toLowerCase()) ? "on" : ""}">Rider</div>
            <div class="${String(x.status||"").toLowerCase()==="delivered" ? "on" : ""}">Done</div>
          </div>

          <div class="govo-track-grid">
            <div><b>Customer</b><span>${esc(String(x.customer_name || ""))}</span></div>
            <div><b>Pickup</b><span>${esc(String(x.pickup_location || ""))}</span></div>
            <div><b>Drop</b><span>${esc(String(x.drop_location || ""))}</span></div>
            <div><b>Item</b><span>${esc(String(x.item_details || ""))}</span></div>
            <div><b>Rider</b><span>${esc(String(x.rider_name || "Not assigned"))}</span><small>${esc(String(x.rider_phone || ""))}</small></div>
            <div><b>Admin Note</b><span>${esc(String(x.admin_note || "No note"))}</span></div>
            <div><b>Merchant Note</b><span>${esc(String(x.merchant_note || "No note"))}</span></div>
            <div><b>Created</b><span>${esc(String(x.created_at || ""))}</span></div>
          </div>
        </div>
      `).join("") : `
        <div class="card">
          <h2>No Order Found</h2>
          <p>Order ID/phone ঠিক আছে কিনা check korun.</p>
        </div>
      `;
    }

    return res.send(page("Track Order", `
      <style>
        .govo-track-card{margin-top:14px!important;padding:16px!important}
        .govo-track-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
        .govo-track-head h2{font-size:22px!important;line-height:1.15!important;margin:10px 0 4px!important;color:#22c55e!important}
        .govo-track-chip,.govo-track-status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-size:13px!important;font-weight:900}
        .govo-track-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:14px 0}
        .govo-track-progress div{font-size:12px!important;text-align:center;padding:8px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09)}
        .govo-track-progress div.on{background:#052e16;border-color:#22c55e;color:#bbf7d0;font-weight:900}
        .govo-track-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
        .govo-track-grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px}
        .govo-track-grid b{display:block;font-size:13px!important;margin-bottom:5px}
        .govo-track-grid span{display:block;font-size:14px!important;line-height:1.35!important;word-break:break-word}
        .govo-track-grid small{display:block;font-size:12px!important;margin-top:3px}
        @media(max-width:700px){
          .govo-track-head{flex-direction:column}
          .govo-track-grid{grid-template-columns:1fr}
          .govo-track-progress{grid-template-columns:1fr 1fr}
        }
      </style>

      <div class="card">
        <h1>🔎 Track Order</h1>
        <p>Order ID অথবা customer phone দিয়ে delivery status দেখুন।</p>

        <form method="GET" action="/track">
          <label>Order ID</label>
          <input name="id" value="${esc(id)}" placeholder="Example: 12">

          <label>Customer Phone</label>
          <input name="phone" value="${esc(phone)}" placeholder="017xxxxxxxx">

          <button>Check Status</button>
        </form>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <a class="btn" href="/shops">🏪 Shops</a>
          <a class="btn" href="https://govoexpress.com">🏠 Home</a>
        </div>
      </div>

      ${cards}
    `));
  } catch(e) {
    return res.status(500).send(page("Track Error", `<div class="card"><h1>Track Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/order/success", async (req,res)=>{
  const id = String((req.query && req.query.id) || "");
  return res.send(page("Order Submitted", `
    <div class="card">
      <h1>✅ Order Submitted</h1>
      <p>আপনার order receive হয়েছে। নিচের Tracking ID save করে রাখুন।</p>
      <h2 style="color:#22c55e">Tracking ID: #${esc(id)}</h2>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
        <a class="btn" href="/track?id=${encodeURIComponent(id)}">🔎 Track Order</a>
        <a class="btn" href="/shops">🏪 Back Shops</a>
        <a class="btn" href="https://govoexpress.com">🏠 Home</a>
      </div>
    </div>
  `));
});

/* GOVO TRACK POLISH V2 END */


app.get("/track", async (req,res)=>{
  try {
    await govoEnsureTrackingOrders();

    const id = String((req.query && req.query.id) || "").trim();
    const phone = String((req.query && req.query.phone) || "").trim();

    let resultHtml = "";

    if (id || phone) {
      let r;

      if (id && phone) {
        r = await pool.query(`
          SELECT *
          FROM govo_orders
          WHERE id=$1 AND customer_phone=$2
          ORDER BY id DESC
          LIMIT 1
        `, [id, phone]);
      } else if (id) {
        r = await pool.query(`
          SELECT *
          FROM govo_orders
          WHERE id=$1
          ORDER BY id DESC
          LIMIT 1
        `, [id]);
      } else {
        r = await pool.query(`
          SELECT *
          FROM govo_orders
          WHERE customer_phone=$1
          ORDER BY id DESC
          LIMIT 5
        `, [phone]);
      }

      if (!r.rows.length) {
        resultHtml = `
          <div class="card" style="margin-top:18px">
            <h2>No Order Found</h2>
            <p>Order ID or phone number check kore abar try korun.</p>
          </div>
        `;
      } else {
        resultHtml = r.rows.map(x=>`
          <div class="card" style="margin-top:18px">
            <h1>Order #${esc(String(x.id))}</h1>
            <p style="font-size:20px;font-weight:900;color:#22c55e">${esc(govoStatusBangla(x.status))}</p>

            <div style="font-size:17px;line-height:1.8;color:#dbeafe">
              <div><b>Shop:</b> ${esc(String(x.shop_name || ""))}</div>
              <div><b>Customer:</b> ${esc(String(x.customer_name || ""))}</div>
              <div><b>Phone:</b> ${esc(String(x.customer_phone || ""))}</div>
              <div><b>Pickup:</b> ${esc(String(x.pickup_location || ""))}</div>
              <div><b>Drop:</b> ${esc(String(x.drop_location || ""))}</div>
              <div><b>Item:</b> ${esc(String(x.item_details || ""))}</div>
              <div><b>Note:</b> ${esc(String(x.note || ""))}</div>
              <div><b>Admin Note:</b> ${esc(String(x.admin_note || "No note yet"))}</div>
              <div><b>Created:</b> ${esc(String(x.created_at || ""))}</div>
            </div>
          </div>
        `).join("");
      }
    }

    return res.send(page("Track Order", `
      <div class="card">
        <h1>🔎 Track Your Order</h1>
        <p>Order ID ba phone number diye delivery status check korun.</p>

        <form method="GET" action="/track">
          <label>Order ID</label>
          <input name="id" value="${esc(id)}" placeholder="Example: 12">

          <label>Customer Phone</label>
          <input name="phone" value="${esc(phone)}" placeholder="017xxxxxxxx">

          <button>Check Status</button>
        </form>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
          <a class="btn" href="/shops">🏪 Back Shops</a>
          <a class="btn" href="https://govoexpress.com">🏠 Home</a>
        </div>
      </div>

      ${resultHtml}
    `));
  } catch(e) {
    console.log("Track order error:", e.message);
    return res.status(500).send(page("Track Error", `<div class="card"><h1>Track Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/order/success", async (req,res)=>{
  const id = String((req.query && req.query.id) || "");
  return res.send(page("Order Submitted", `
    <div class="card">
      <h1>✅ Order Submitted</h1>
      <p>Your order has been received. Admin team review korbe.</p>
      <p><b>Tracking / Order ID:</b> #${esc(id)}</p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
        <a class="btn" href="/track?id=${encodeURIComponent(id)}">🔎 Track Order</a>
        <a class="btn" href="/shops">🏪 Back Shops</a>
        <a class="btn" href="/order">📦 Create Another Order</a>
      </div>
    </div>
  `));
});

/* GOVO CUSTOMER TRACKING V1 END */


app.get("/shop/:id", async (req,res)=>{
  try {
    await govoEnsureProductMenuV1();

    const id = String((req.params && req.params.id) || "");

    const shop = await pool.query(`
      SELECT id, shop_name, owner_name, phone, location, category, delivery_needed,
             COALESCE(status,'pending') AS status,
             shop_description, shop_address, products, whatsapp, image_url, created_at
      FROM govo_merchant_leads
      WHERE id=$1 AND COALESCE(status,'pending')='approved'
      LIMIT 1
    `, [id]);

    if (!shop.rows.length) {
      return res.status(404).send(page("Shop Not Found", `
        <div class="card">
          <h1>Shop Not Found</h1>
          <p>Ei shop available na, ba admin approve hoyni.</p>
          <a class="btn" href="/shops">Back Shops</a>
        </div>
      `));
    }

    const x = shop.rows[0];
    const merchantPhone = String(x.whatsapp || x.phone || "");
    const pickup = String(x.shop_address || x.location || "");
    const shopName = String(x.shop_name || "");

    const products = await pool.query(`
      SELECT *
      FROM govo_shop_products
      WHERE merchant_lead_id=$1 AND COALESCE(is_available,true)=true
      ORDER BY id DESC
      LIMIT 100
    `, [x.id]);

    const productCards = products.rows.map(p=>`
      <div class="card" style="margin-top:14px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <h2 style="color:#22c55e;margin:0 0 8px">${esc(String(p.product_name || ""))}</h2>
            <p><b>Price:</b> ${esc(String(p.price || ""))}</p>
            <p><b>Category:</b> ${esc(String(p.category || ""))}</p>
            <p>${esc(String(p.description || ""))}</p>
          </div>
          ${p.image_url ? `<img src="${esc(String(p.image_url))}" style="width:86px;height:86px;object-fit:cover;border-radius:18px;border:1px solid #22c55e">` : ""}
        </div>
        <button type="button" onclick="document.querySelector('[name=item_details]').value='${esc(String(p.product_name || ""))} - ${esc(String(p.price || ""))}'; document.getElementById('govoOrderForm').scrollIntoView({behavior:'smooth'});">Add to Order</button>
      </div>
    `).join("");

    return res.send(page(shopName, `
      <div class="card">
        <h1>${esc(shopName)}</h1>
        <p>Full shop details, products/menu and delivery booking.</p>

        <div style="font-size:17px;line-height:1.85;color:#dbeafe;margin-top:12px">
          <div><b>Owner:</b> ${esc(String(x.owner_name || ""))}</div>
          <div><b>Phone:</b> ${esc(merchantPhone)}</div>
          <div><b>Address:</b> ${esc(pickup || "Not added yet")}</div>
          <div><b>Category:</b> ${esc(String(x.category || ""))}</div>
          <div><b>About:</b> ${esc(String(x.shop_description || "Details coming soon"))}</div>
          <div><b>Products Summary:</b> ${esc(String(x.products || "Not added yet"))}</div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
          <a class="btn" href="/shops">Back Shops</a>
          <a class="btn" href="https://govoexpress.com">Home</a>
          <a class="btn" href="tel:${esc(merchantPhone)}">Call Shop</a>
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <h1>Product / Menu List</h1>
        <p>Customer ekhan theke product select kore delivery order korte parbe.</p>
        ${productCards || `<p>No product/menu added yet.</p>`}
      </div>

      <div class="card" style="margin-top:18px" id="govoOrderForm">
        <h1>Delivery Book</h1>
        <form method="POST" action="/order">
          <label>Shop Name</label>
          <input name="shop_name" value="${esc(shopName)}" required>

          <label>Merchant Phone</label>
          <input name="merchant_phone" value="${esc(merchantPhone)}">

          <label>Customer Name</label>
          <input name="customer_name" placeholder="Customer name" required>

          <label>Customer Phone</label>
          <input name="customer_phone" placeholder="017xxxxxxxx" required>

          <label>Pickup Location</label>
          <input name="pickup_location" value="${esc(pickup)}" required>

          <label>Drop Location</label>
          <input name="drop_location" placeholder="Customer address / drop location" required>

          <label>Item Details</label>
          <textarea name="item_details" placeholder="Product/Menu details" required></textarea>

          <label>Note</label>
          <textarea name="note" placeholder="Extra note, optional"></textarea>

          <button>Submit Order</button>
        </form>
      </div>
    `));
  } catch(e) {
    console.log("Shop details/menu error:", e.message);
    return res.status(500).send(page("Shop Details Error", `<div class="card"><h1>Shop Details Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO PRODUCT MENU V1 END */


app.get("/shop/:id", async (req,res)=>{
  try {
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_description TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_address TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS products TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS image_url TEXT");

    const id = String((req.params && req.params.id) || "");

    const r = await pool.query(`
      SELECT id, shop_name, owner_name, phone, location, category, delivery_needed,
             COALESCE(status,'pending') AS status,
             shop_description, shop_address, products, whatsapp, image_url, created_at
      FROM govo_merchant_leads
      WHERE id=$1 AND COALESCE(status,'pending')='approved'
      LIMIT 1
    `, [id]);

    if (!r.rows.length) {
      return res.status(404).send(page("Shop Not Found", `
        <div class="card">
          <h1>Shop Not Found</h1>
          <p>Ei shop available na, ba admin approve kora hoyni.</p>
          <a class="btn" href="/shops">🏪 Back to Shops</a>
        </div>
      `));
    }

    const x = r.rows[0];
    const shopName = String(x.shop_name || "");
    const merchantPhone = String(x.whatsapp || x.phone || "");
    const pickup = String(x.shop_address || x.location || "");

    return res.send(page(shopName, `
      <div class="card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
          <div>
            <div style="display:inline-flex;padding:8px 14px;border-radius:999px;border:1px solid #22c55e;background:#052e16;color:#bbf7d0;font-weight:900">
              ${esc(String(x.category || "Shop"))}
            </div>
            <h1 style="color:#22c55e;margin:16px 0 10px">${esc(shopName)}</h1>
            <p>Full shop details and delivery booking.</p>
          </div>
          ${x.image_url ? `<img src="${esc(String(x.image_url))}" style="width:110px;height:110px;object-fit:cover;border-radius:22px;border:1px solid #22c55e">` : ""}
        </div>

        <div style="font-size:17px;line-height:1.85;color:#dbeafe;margin-top:12px">
          <div><b>Owner:</b> ${esc(String(x.owner_name || ""))}</div>
          <div><b>Phone:</b> ${esc(merchantPhone)}</div>
          <div><b>Address:</b> ${esc(pickup || "Not added yet")}</div>
          <div><b>Delivery:</b> ${esc(String(x.delivery_needed || ""))}</div>
          <div><b>About:</b> ${esc(String(x.shop_description || "Details coming soon"))}</div>
          <div><b>Products / Services:</b> ${esc(String(x.products || "Not added yet"))}</div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
          <a class="btn" href="/shops">🏪 Back Shops</a>
          <a class="btn" href="https://govoexpress.com">🏠 Home</a>
          <a class="btn" href="tel:${esc(merchantPhone)}">☎️ Call Shop</a>
        </div>
      </div>

      <div class="card" style="margin-top:22px">
        <h1>📦 Delivery Book</h1>
        <p>Ei shop theke delivery request korte customer information din.</p>

        <form method="POST" action="/order">
          <label>Shop Name</label>
          <input name="shop_name" value="${esc(shopName)}" required>

          <label>Merchant Phone</label>
          <input name="merchant_phone" value="${esc(merchantPhone)}">

          <label>Customer Name</label>
          <input name="customer_name" placeholder="Customer name" required>

          <label>Customer Phone</label>
          <input name="customer_phone" placeholder="017xxxxxxxx" required>

          <label>Pickup Location</label>
          <input name="pickup_location" value="${esc(pickup)}" required>

          <label>Drop Location</label>
          <input name="drop_location" placeholder="Customer address / drop location" required>

          <label>Item Details</label>
          <textarea name="item_details" placeholder="Ki delivery korte hobe?" required></textarea>

          <label>Note</label>
          <textarea name="note" placeholder="Extra note, optional"></textarea>

          <button>Submit Order</button>
        </form>
      </div>
    `));
  } catch(e) {
    console.log("Shop details error:", e.message);
    return res.status(500).send(page("Shop Details Error", `<div class="card"><h1>Shop Details Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});
/* GOVO SHOP DETAILS V1 END */


app.get("/shops", async (req,res)=>{
  try {
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_description TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_address TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS products TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS image_url TEXT");

    const q = String((req.query && req.query.q) || "").trim().toLowerCase();
    const category = String((req.query && req.query.category) || "").trim();
    const area = String((req.query && req.query.area) || "").trim();

    const all = await pool.query(`
      SELECT id, shop_name, owner_name, phone, location, category, delivery_needed,
             COALESCE(status,'pending') AS status,
             shop_description, shop_address, products, whatsapp, image_url, created_at
      FROM govo_merchant_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 300
    `);

    let rows = all.rows;

    if (q) {
      rows = rows.filter(x => [
        x.shop_name, x.owner_name, x.phone, x.location, x.category,
        x.shop_description, x.shop_address, x.products
      ].join(" ").toLowerCase().includes(q));
    }

    if (category) {
      rows = rows.filter(x => String(x.category || "") === category);
    }

    if (area) {
      rows = rows.filter(x => String(x.location || "").toLowerCase().includes(area.toLowerCase()) || String(x.shop_address || "").toLowerCase().includes(area.toLowerCase()));
    }

    const categories = [...new Set(all.rows.map(x=>String(x.category || "").trim()).filter(Boolean))].sort();
    const areas = [...new Set(all.rows.map(x=>String(x.location || "").trim()).filter(Boolean))].sort();

    const categoryOptions = [`<option value="">All Category</option>`].concat(
      categories.map(c=>`<option value="${esc(c)}" ${c===category?"selected":""}>${esc(c)}</option>`)
    ).join("");

    const areaOptions = [`<option value="">All Area</option>`].concat(
      areas.map(a=>`<option value="${esc(a)}" ${a===area?"selected":""}>${esc(a)}</option>`)
    ).join("");

    const cards = rows.map(x=>`
      <div class="card" style="margin-bottom:22px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
          <div>
            <div style="display:inline-flex;padding:8px 14px;border-radius:999px;border:1px solid #22c55e;background:#052e16;color:#bbf7d0;font-weight:900">
              ${esc(String(x.category || "Shop"))}
            </div>
            <h2 style="color:#22c55e;margin:16px 0 10px;font-size:32px">${esc(String(x.shop_name || ""))}</h2>
          </div>
          ${x.image_url ? `<img src="${esc(String(x.image_url))}" style="width:82px;height:82px;object-fit:cover;border-radius:18px;border:1px solid #22c55e">` : ""}
        </div>

        <div style="font-size:17px;line-height:1.8;color:#dbeafe;margin-top:10px">
          <div><b>Owner:</b> ${esc(String(x.owner_name || ""))}</div>
          <div><b>Phone:</b> ${esc(String(x.whatsapp || x.phone || ""))}</div>
          <div><b>Location:</b> ${esc(String(x.shop_address || x.location || ""))}</div>
          <div><b>Delivery:</b> ${esc(String(x.delivery_needed || ""))}</div>
          <div><b>About:</b> ${esc(String(x.shop_description || "Details coming soon"))}</div>
          <div><b>Products:</b> ${esc(String(x.products || "Not added yet"))}</div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
          <a class="btn" href="/shop/${encodeURIComponent(x.id)}">👁️ View Details</a>\n          <a class="btn" href="/order?shop=${encodeURIComponent(x.shop_name || "")}">📦 Delivery Book</a>
          <a class="btn" href="tel:${esc(String(x.whatsapp || x.phone || ""))}">☎️ Call Shop</a>
          <a class="btn" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || "")}">🏪 Shop Dashboard</a>
        </div>
      </div>
    `).join("");

    return res.send(page("GOVO Shops", `
      <div class="card">
        <h1>🏪 GOVO Shops</h1>
        <p>Approved dokan gulo ekhane dekha jabe. Customer shop select kore delivery book korte parbe.</p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0">
          <a class="btn" href="https://govoexpress.com">🏠 Back Home</a>
          <a class="btn" href="/shops">🏪 All Shops</a>
          <a class="btn" href="/merchant">➕ Register Shop</a>
          <a class="btn" href="/merchant/dashboard">🔐 Merchant Login</a>
        </div>

        <form method="GET" action="/shops" style="display:grid;gap:12px;margin-top:16px">
          <input name="q" value="${esc(q)}" placeholder="🔎 Search shop, product, owner, phone">
          <select name="category">${categoryOptions}</select>
          <select name="area">${areaOptions}</select>
          <button>Filter Shops</button>
        </form>

        <p style="margin-top:14px"><b>${rows.length}</b> shop found out of <b>${all.rows.length}</b> approved shops.</p>
      </div>

      <div style="margin-top:22px">
        ${cards || `<div class="card"><h2>No shop found</h2><p>Filter change korun ba admin theke merchant approve korun.</p><a class="btn" href="/shops">Reset Filter</a></div>`}
      </div>
    `));
  } catch(e) {
    console.log("Shops home v3 error:", e.message);
    return res.status(500).send(page("Shops Error", `<div class="card"><h1>Shops Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});
/* GOVO SHOPS HOME V3 END */


app.get("/admin/orders", async (req,res)=>{
  try {
    if (!govoAdminPinOk(req,res)) return;

    await govoEnsureOrderAdminColumns();

    const pin = String(req.query.pin || "");

    const r = await pool.query(`
      SELECT id, shop_name, merchant_phone, customer_name, customer_phone,
             pickup_location, drop_location, item_details, note,
             COALESCE(status,'pending') AS status,
             admin_note, created_at, updated_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 100
    `);

    const rows = r.rows.map(x=>`
      <tr>
        <td>#${esc(String(x.id))}</td>
        <td>
          <b>${esc(String(x.shop_name || ""))}</b><br>
          <small>${esc(String(x.merchant_phone || ""))}</small>
        </td>
        <td>
          <b>${esc(String(x.customer_name || ""))}</b><br>
          ${esc(String(x.customer_phone || ""))}
        </td>
        <td>
          <b>Pickup:</b> ${esc(String(x.pickup_location || ""))}<br>
          <b>Drop:</b> ${esc(String(x.drop_location || ""))}
        </td>
        <td>${esc(String(x.item_details || ""))}<br><small>${esc(String(x.note || ""))}</small></td>
        <td><b>${esc(String(x.status || "pending"))}</b><br><small>${esc(String(x.admin_note || ""))}</small></td>
        <td>
          <form method="POST" action="/admin/order/status" style="display:grid;gap:8px;min-width:150px">
            <input type="hidden" name="pin" value="${esc(pin)}">
            <input type="hidden" name="id" value="${esc(String(x.id))}">
            <input name="admin_note" placeholder="Admin note" style="padding:8px;border-radius:10px">
            <button name="status" value="accepted">Accept</button>
            <button name="status" value="rejected">Reject</button>
            <button name="status" value="delivered">Delivered</button>
          </form>
        </td>
        <td><small>${esc(String(x.created_at || ""))}</small></td>
      </tr>
    `).join("");

    return res.send(page("Admin Orders", `
      <div class="card">
        <h1>Admin Orders</h1>
        <p>Customer delivery orders manage korun.</p>
        <div style="overflow:auto">
          <table>
            <tr>
              <th>ID</th>
              <th>Shop</th>
              <th>Customer</th>
              <th>Route</th>
              <th>Item</th>
              <th>Status</th>
              <th>Action</th>
              <th>Time</th>
            </tr>
            ${rows || `<tr><td colspan="8">No orders found</td></tr>`}
          </table>
        </div>
      </div>
    `));
  } catch(e) {
    console.log("Admin orders v2 error:", e.message);
    return res.status(500).send(page("Admin Orders Error", `<div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN ORDER ACTIONS END */


app.get("/order/success", async (req,res)=>{
  const id = String((req.query && req.query.id) || "");
  return res.send(page("Order Submitted", `
    <div class="card">
      <h1>✅ Order Submitted</h1>
      <p>Your order has been received. Admin team review korbe.</p>
      <p><b>Order ID:</b> #${esc(id)}</p>
      <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn" href="/shops">Back to Shops</a>
        <a class="btn" href="/order">Create Another Order</a>
      </div>
    </div>
  `));
});

/* GOVO SAFE ORDER FLOW FINAL END */


app.get("/shops", async (req,res)=>{
  try {
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_description TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS shop_address TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS products TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS whatsapp TEXT");
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS image_url TEXT");

    const r = await pool.query(`
      SELECT id, shop_name, owner_name, phone, location, category, delivery_needed,
             COALESCE(status,'pending') AS status,
             shop_description, shop_address, products, whatsapp, image_url, created_at
      FROM govo_merchant_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const cards = r.rows.map(x=>`
      <div class="card" style="margin-bottom:22px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap">
          <div>
            <div style="display:inline-flex;padding:8px 14px;border-radius:999px;border:1px solid #22c55e;background:#052e16;color:#bbf7d0;font-weight:900">
              ${esc(String(x.category || "Shop"))}
            </div>
            <h2 style="color:#22c55e;margin:16px 0 10px;font-size:32px">${esc(String(x.shop_name || ""))}</h2>
          </div>
          ${x.image_url ? `<img src="${esc(String(x.image_url))}" style="width:82px;height:82px;object-fit:cover;border-radius:18px;border:1px solid #22c55e">` : ""}
        </div>

        <div style="font-size:17px;line-height:1.8;color:#dbeafe;margin-top:10px">
          <div><b>Owner:</b> ${esc(String(x.owner_name || ""))}</div>
          <div><b>Phone:</b> ${esc(String(x.whatsapp || x.phone || ""))}</div>
          <div><b>Location:</b> ${esc(String(x.shop_address || x.location || ""))}</div>
          <div><b>Delivery:</b> ${esc(String(x.delivery_needed || ""))}</div>
          <div><b>About:</b> ${esc(String(x.shop_description || "Details coming soon"))}</div>
          <div><b>Products:</b> ${esc(String(x.products || "Not added yet"))}</div>
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
          <a class="btn" href="/shop/${encodeURIComponent(x.id)}">👁️ View Details</a>\n          <a class="btn" href="/order?shop=${encodeURIComponent(x.shop_name || "")}">📦 Delivery Book</a>
          <a class="btn" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || "")}">🏪 Shop Dashboard</a>
        </div>
      </div>
    `).join("");

    return res.send(page("GOVO Shops", `
      <div class="card">
        <h1>GOVO Shops</h1>
        <p>Approved merchant shops. Customer ekhane theke delivery book korte parbe.</p>
        <a class="btn" href="/merchant/dashboard">Merchant Login</a>
      </div>
      <div style="margin-top:22px">
        ${cards || `<div class="card"><h2>No approved shop found</h2><p>Admin theke merchant approve korun.</p></div>`}
      </div>
    `));
  } catch(e) {
    console.log("Safe shops v2 error:", e.message);
    return res.status(500).send(page("Shops Error", `<div class="card"><h1>Shops Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});
/* GOVO SAFE SHOPS CARD V2 END */



/* GOVO ADMIN OS DASHBOARD V2 START */

async function govoEnsureAdminOsDashboardV2(){
  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_orders (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      merchant_phone TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      pickup_location TEXT,
      drop_location TEXT,
      item_details TEXT,
      note TEXT,
      status TEXT DEFAULT 'pending',
      admin_note TEXT,
      merchant_note TEXT,
      rider_name TEXT,
      rider_phone TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_merchant_leads (
      id SERIAL PRIMARY KEY,
      shop_name TEXT,
      owner_name TEXT,
      phone TEXT,
      location TEXT,
      category TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS govo_rider_leads (
      id SERIAL PRIMARY KEY,
      rider_name TEXT,
      phone TEXT,
      location TEXT,
      vehicle_type TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_name TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS rider_phone TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_note TEXT");
  await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS admin_note TEXT");

  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");

  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
  await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()");
}

function govoAdminOsLoginV2(res, msg){
  return res.send(page("Admin OS Login", `
    <div class="card">
      <h1>🔐 Admin OS Login</h1>
      <p>${esc(String(msg || "Admin dashboard খুলতে PIN দিন."))}</p>
      <form method="GET" action="/admin/os">
        <label>Admin PIN</label>
        <input name="pin" placeholder="Enter admin PIN" required>
        <button>Open Admin OS</button>
      </form>
    </div>
  `));
}

app.get("/admin/os", async (req,res)=>{
  try {
    const pin = String((req.query && req.query.pin) || "").trim();
    const real = String(process.env.ADMIN_PIN || "").trim();

    if (!pin) return govoAdminOsLoginV2(res, "PIN missing. Admin OS খুলতে PIN দিন.");
    if (!real || pin !== real) return govoAdminOsLoginV2(res, "Wrong PIN. আবার সঠিক PIN দিন.");

    await govoEnsureAdminOsDashboardV2();

    const orderStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int AS pending,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='accepted')::int AS accepted,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='assigned')::int AS assigned,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='picked_up')::int AS picked_up,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today
      FROM govo_orders
    `);

    const merchantStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int AS approved,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int AS pending
      FROM govo_merchant_leads
    `);

    const riderStats = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int AS approved,
        COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int AS pending
      FROM govo_rider_leads
    `);

    const recent = await pool.query(`
      SELECT id, shop_name, customer_name, customer_phone, drop_location,
             item_details, COALESCE(status,'pending') AS status, rider_name, created_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 8
    `);

    const o = orderStats.rows[0] || {};
    const m = merchantStats.rows[0] || {};
    const r = riderStats.rows[0] || {};

    const statCard = (title, value, sub) => `
      <div class="govo-stat-card">
        <small>${esc(title)}</small>
        <b>${esc(String(value || 0))}</b>
        <span>${esc(sub || "")}</span>
      </div>
    `;

    const recentRows = recent.rows.map(x=>`
      <div class="govo-recent-order">
        <div>
          <b>#${esc(String(x.id))} — ${esc(String(x.shop_name || ""))}</b>
          <small>${esc(String(x.customer_name || ""))} • ${esc(String(x.customer_phone || ""))}</small>
          <small>Drop: ${esc(String(x.drop_location || ""))}</small>
        </div>
        <span>${esc(String(x.status || "pending"))}</span>
      </div>
    `).join("");

    return res.send(page("Admin OS", `
      <style>
        .govo-os-head h1{font-size:34px!important;margin:0 0 8px!important;color:#22c55e!important}
        .govo-os-head p{font-size:15px!important;line-height:1.45!important}
        .govo-os-nav{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:16px}
        .govo-os-nav a{padding:12px;border-radius:15px;border:1px solid rgba(34,197,94,.35);text-decoration:none;font-weight:900;text-align:center;color:#bbf7d0!important;background:rgba(34,197,94,.06)}
        .govo-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}
        .govo-stat-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px}
        .govo-stat-card small{display:block;font-size:12px!important;color:#cbd5e1!important}
        .govo-stat-card b{display:block;font-size:28px!important;color:#22c55e!important;margin:5px 0}
        .govo-stat-card span{font-size:12px!important;color:#cbd5e1!important}
        .govo-recent-order{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:12px;margin-top:10px}
        .govo-recent-order b{display:block;font-size:14px!important;color:#f8fafc!important}
        .govo-recent-order small{display:block;font-size:12px!important;color:#cbd5e1!important;margin-top:3px}
        .govo-recent-order span{font-size:12px!important;font-weight:900;color:#bbf7d0;background:#052e16;border:1px solid #22c55e;border-radius:999px;padding:5px 9px;text-transform:capitalize}
        @media(max-width:700px){
          .govo-stat-grid{grid-template-columns:1fr 1fr}
          .govo-os-nav{grid-template-columns:1fr}
        }
      </style>

      <div class="card govo-os-head">
        <h1>⚙️ GOVO Admin OS</h1>
        <p>Business control center — orders, merchants, riders, tracking এক জায়গায়.</p>

        <div class="govo-os-nav">
          <a href="/admin/orders?pin=${encodeURIComponent(pin)}">📦 Orders</a>
          <a href="/admin/leads?pin=${encodeURIComponent(pin)}">🏪 Merchants</a>
          <a href="/admin/riders?pin=${encodeURIComponent(pin)}">🛵 Riders</a>
          <a href="/shops">👁️ Customer Shops</a>
          <a href="/track">🔎 Track Order</a>
          <a href="https://govoexpress.com">🏠 Main Website</a>
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h2>📊 Orders Overview</h2>
        <div class="govo-stat-grid">
          ${statCard("Total Orders", o.total, "All time")}
          ${statCard("Today Orders", o.today, "Current day")}
          ${statCard("Pending", o.pending, "Need action")}
          ${statCard("Accepted", o.accepted, "Admin accepted")}
          ${statCard("Assigned", o.assigned, "Rider assigned")}
          ${statCard("Picked Up", o.picked_up, "On delivery")}
          ${statCard("Delivered", o.delivered, "Completed")}
          ${statCard("Rejected", o.rejected, "Cancelled")}
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h2>🏪 Merchant / 🛵 Rider</h2>
        <div class="govo-stat-grid">
          ${statCard("Total Merchants", m.total, "All merchant leads")}
          ${statCard("Approved Merchants", m.approved, "Visible in shops")}
          ${statCard("Pending Merchants", m.pending, "Need approval")}
          ${statCard("Total Riders", r.total, "All rider leads")}
          ${statCard("Approved Riders", r.approved, "Can assign orders")}
          ${statCard("Pending Riders", r.pending, "Need approval")}
        </div>
      </div>

      <div class="card" style="margin-top:14px">
        <h2>🕒 Recent Orders</h2>
        ${recentRows || `<p>No recent orders.</p>`}
      </div>
    `));
  } catch(e) {
    console.log("Admin OS dashboard v2 error:", e.message);
    return res.status(500).send(page("Admin OS Error", `<div class="card"><h1>Admin OS Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

/* GOVO ADMIN OS DASHBOARD V2 END */


app.get("/admin/os", (req,res)=>{
  const pin = encodeURIComponent((req.query && req.query.pin) || process.env.ADMIN_PIN || "");
  res.send(page("GOVO Admin OS", `
    <div class="card">
      <h1>GOVO Admin OS</h1>
      <p>Merchant, Rider, Order sob ek jaigai manage korun.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:18px">
        <a class="btn" href="/admin/leads?pin=${pin}">Merchant Leads</a>
        <a class="btn" href="/admin/riders?pin=${pin}">Rider Leads</a>
        <a class="btn" href="/admin/orders?pin=${pin}">Orders</a>
        <a class="btn" href="/shops">View Shops</a>
      </div>
    </div>
  `));
});

/* ================= /GOVO DOMAIN UI SPLIT V2 ================= */


app.get('/', (req, res) => res.redirect('/merchant'));
app.get('/health', (req, res) => res.json({ ok: true, service: 'govo-portal', version: 'admin-os' }));
app.get('/admin', (req, res) => res.redirect(`/admin/leads?${pinQuery(req)}`));
app.get('/admin/leads', (req, res, next) => listMerchants(req, res).catch(next));
app.get('/admin/riders', (req, res, next) => listRiders(req, res).catch(next));

app.get('/merchant', (req, res) => {
  res.send(page('Merchant Registration', `<section class="card"><h1>GOVO Merchant Registration</h1><form class="form" method="POST" action="/merchant"><label>Shop Name</label><input name="shop_name" required/><label>Owner Name</label><input name="owner_name" required/><label>Phone</label><input name="phone" required/><label>Location</label><input name="location" required/><label>Category</label><select name="category"><option>Restaurant</option><option>Grocery</option><option>Pharmacy</option><option>Fashion</option><option>Electronics</option><option>Service Provider</option><option>Other</option></select><label>Delivery Needed?</label><select name="delivery_needed"><option>Yes</option><option>No</option><option>Later</option></select><button class="btn primary">Submit Merchant Info</button></form></section>`, 'merchant'));
});

app.post('/merchant', async (req, res, next) => {
  try {
    const lead = {
      shop_name: req.body.shop_name,
      owner_name: req.body.owner_name,
      phone: req.body.phone,
      location: req.body.location,
      category: req.body.category,
      delivery_needed: req.body.delivery_needed,
    };
    await pool.query(`INSERT INTO govo_merchant_leads (shop_name,owner_name,phone,location,category,delivery_needed,status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`, [lead.shop_name, lead.owner_name, lead.phone, lead.location, lead.category, lead.delivery_needed]);
    sendTelegram(["🟢 New GOVO Merchant Lead", "", `Shop: ${lead.shop_name || ''}`, `Owner: ${lead.owner_name || ''}`, `Phone: ${lead.phone || ''}`, `Location: ${lead.location || ''}`, `Category: ${lead.category || ''}`, `Delivery: ${lead.delivery_needed || ''}`, `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}`].join('\n')).catch(() => {});
    res.send(submittedPage('Merchant', '/merchant'));
  } catch (e) { next(e); }
});

app.get('/rider', (req, res) => {
  res.send(page('Rider Registration', `<section class="card"><h1>GOVO Rider Registration</h1><form class="form" method="POST" action="/rider"><label>Rider Name</label><input name="rider_name" required/><label>Phone</label><input name="phone" required/><label>Location</label><input name="location" required/><label>Vehicle Type</label><select name="vehicle_type"><option>Bike</option><option>Cycle</option><option>Auto</option><option>Other</option></select><label>Experience</label><textarea name="experience" rows="3"></textarea><button class="btn primary">Submit Rider Info</button></form></section>`, 'rider'));
});

app.post('/rider', async (req, res, next) => {
  try {
    await pool.query(`INSERT INTO govo_rider_leads (rider_name,phone,location,vehicle_type,experience,status) VALUES ($1,$2,$3,$4,$5,'pending')`, [req.body.rider_name, req.body.phone, req.body.location, req.body.vehicle_type, req.body.experience]);
    sendTelegram(["🛵 New GOVO Rider Lead", "", `Name: ${req.body.rider_name || ''}`, `Phone: ${req.body.phone || ''}`, `Location: ${req.body.location || ''}`, `Vehicle: ${req.body.vehicle_type || ''}`, `Experience: ${req.body.experience || ''}`, `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}`].join('\n')).catch(() => {});
    res.send(submittedPage('Rider', '/rider'));
  } catch (e) { next(e); }
});

app.get('/admin/merchant/:id/:action', async (req, res, next) => {
  try {
    if (!pinok(req, res)) return;
    const status = req.params.action === 'approve' ? 'approved' : req.params.action === 'reject' ? 'rejected' : 'pending';
    const r = await pool.query('UPDATE govo_merchant_leads SET status=$1 WHERE id=$2 RETURNING shop_name,owner_name,phone,location', [status, req.params.id]);
    const row = r.rows[0] || {};
    sendTelegram([`✅ GOVO Merchant ${status.toUpperCase()}`, `ID: ${req.params.id}`, `Shop: ${row.shop_name || ''}`, `Owner: ${row.owner_name || ''}`, `Phone: ${row.phone || ''}`].join('\n')).catch(() => {});
    res.redirect(`/admin/leads?${pinQuery(req)}`);
  } catch (e) { next(e); }
});

app.get('/admin/rider/:id/:action', async (req, res, next) => {
  try {
    if (!pinok(req, res)) return;
    const status = req.params.action === 'approve' ? 'approved' : req.params.action === 'reject' ? 'rejected' : 'pending';
    const r = await pool.query('UPDATE govo_rider_leads SET status=$1 WHERE id=$2 RETURNING rider_name,phone,location,vehicle_type', [status, req.params.id]);
    const row = r.rows[0] || {};
    sendTelegram([`✅ GOVO Rider ${status.toUpperCase()}`, `ID: ${req.params.id}`, `Name: ${row.rider_name || ''}`, `Phone: ${row.phone || ''}`, `Vehicle: ${row.vehicle_type || ''}`].join('\n')).catch(() => {});
    res.redirect(`/admin/riders?${pinQuery(req)}`);
  } catch (e) { next(e); }
});

app.get('/dashboard/merchant', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '');
    let records = '';
    if (phone) {
      const r = await pool.query("SELECT shop_name,COALESCE(status,'pending') AS status,created_at FROM govo_merchant_leads WHERE phone=$1 ORDER BY id DESC LIMIT 5", [phone]);
      records = `<div class="card"><h2>Merchant Records</h2>${r.rows.map((x) => `<p><b>${esc(x.shop_name)}</b><br/>Status: ${statusBadge(x.status)}<br/><span class="mini-note">${esc(bdTime(x.created_at))}</span></p>`).join('') || 'No record found'}</div>`;
    }
    res.send(page('Merchant Dashboard', `<section class="card"><h1>Merchant Dashboard</h1><form class="form"><label>Phone</label><input name="phone" value="${esc(phone)}"/><button class="btn primary">Check</button></form></section>${records}`, 'mdash'));
  } catch (e) { next(e); }
});

app.get('/dashboard/rider', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '');
    let records = '';
    if (phone) {
      const r = await pool.query("SELECT rider_name,COALESCE(status,'pending') AS status,created_at FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 5", [phone]);
      records = `<div class="card"><h2>Rider Records</h2>${r.rows.map((x) => `<p><b>${esc(x.rider_name)}</b><br/>Status: ${statusBadge(x.status)}<br/><span class="mini-note">${esc(bdTime(x.created_at))}</span></p>`).join('') || 'No record found'}</div>`;
    }
    res.send(page('Rider Dashboard', `<section class="card"><h1>Rider Dashboard</h1><form class="form"><label>Phone</label><input name="phone" value="${esc(phone)}"/><button class="btn primary">Check</button></form></section>${records}`, 'rdash'));
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error('GOVO error:', err);
  res.status(500).send(page('Server Error', `<section class="card"><h1>Server Error</h1><p>${esc(err.message || 'Unknown error')}</p></section>`));
});


/* ================= GOVO ORDER MODULE ================= */

async function ensureOrderTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS govo_orders (
        id SERIAL PRIMARY KEY,
        customer_name TEXT,
        customer_phone TEXT,
        pickup_location TEXT,
        drop_location TEXT,
        item_details TEXT,
        note TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Order table ready");
  } catch(e) {
    console.log("Order table setup error:", e.message);
  }
}

const orderAdminCss = `
<style>
.order-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:18px}
.order-card{border:1px solid #243044;background:#0f172a;border-radius:18px;padding:16px}
.order-card h3{margin:0 0 8px;color:#22c55e}
.order-meta{font-size:13px;color:#cbd5e1;line-height:1.5}
.status-pill{display:inline-block;padding:6px 10px;border-radius:999px;font-weight:800;font-size:12px;text-transform:uppercase}
.status-pill.pending{background:#334155;color:#e2e8f0}
.status-pill.accepted{background:#1e3a8a;color:#bfdbfe}
.status-pill.completed{background:#14532d;color:#bbf7d0}
.status-pill.cancelled{background:#7f1d1d;color:#fecaca}
.order-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.small-btn{padding:8px 10px;border-radius:10px;text-decoration:none;font-weight:800;font-size:13px}
.small-btn.accept{background:#3b82f6;color:#fff}
.small-btn.done{background:#22c55e;color:#052e16}
.small-btn.cancel{background:#ef4444;color:#fff}
.order-form-grid{display:grid;grid-template-columns:1fr;gap:12px}
</style>
`;

app.get("/order", (req,res)=>{
  res.send(page("GOVO Order", `
    <div class="card">
      <h1>GOVO Order Request</h1>
      <form method="POST" action="/order" class="order-form-grid">
        <label>Customer Name</label>
        <input name="customer_name" required>

        <label>Customer Phone</label>
        <input name="customer_phone" required>

        <label>Pickup Location</label>
        <input name="pickup_location" required>

        <label>Drop Location</label>
        <input name="drop_location" required>

        <label>Product / Service Details</label>
        <textarea name="item_details" required></textarea>

        <label>Note</label>
        <textarea name="note"></textarea>

        <button>Submit Order</button>
      </form>
    </div>
  `));
});

app.post("/order", async (req,res)=>{
  try {
    const order = {
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone,
      pickup_location: req.body.pickup_location,
      drop_location: req.body.drop_location,
      item_details: req.body.item_details,
      note: req.body.note || ""
    };

    const r = await pool.query(`
      INSERT INTO govo_orders
      (customer_name, customer_phone, pickup_location, drop_location, item_details, note)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
    `, [
      order.customer_name,
      order.customer_phone,
      order.pickup_location,
      order.drop_location,
      order.item_details,
      order.note
    ]);

    const orderId = r.rows[0].id;

    if (typeof sendTelegram === "function") {
      sendTelegram([
        "🧾 New GOVO Order",
        "",
        `ID: ${orderId}`,
        `Customer: ${order.customer_name || ""}`,
        `Phone: ${order.customer_phone || ""}`,
        `Pickup: ${order.pickup_location || ""}`,
        `Drop: ${order.drop_location || ""}`,
        `Details: ${order.item_details || ""}`,
        `Note: ${order.note || ""}`,
        `Time: ${new Date().toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}`
      ].join("\n")).catch(()=>{});
    }

    res.send(page("Order Submitted", `
      <div class="card ok">
        <h1>✅ Order Submitted</h1>
        <p>GOVO team order receive koreche.</p>
        <p><b>Order ID:</b> ${esc(String(orderId))}</p>
        <a class="btn" href="/order">Add Another Order</a>
      </div>
    `));
  } catch(e) {
    console.log("Order submit error:", e.message);
    res.status(500).send(page("Order Error", `
      <div class="card"><h1>Order Error</h1><p>${esc(String(e.message))}</p></div>
    `));
  }
});

app.get("/admin/orders", async (req,res)=>{
  if(!pinok(req,res)) return;

  try {
    const pin = encodeURIComponent((req.query && req.query.pin) || ADMIN_PIN || "");
    const r = await pool.query(`
      SELECT id, customer_name, customer_phone, pickup_location, drop_location,
             item_details, note, COALESCE(status,'pending') AS status, created_at
      FROM govo_orders
      ORDER BY id DESC
      LIMIT 100
    `);

    const cards = r.rows.map(x=>{
      const st = String(x.status || "pending").toLowerCase();

      let actions = "";
      if (st === "pending") {
        actions = `
          <a class="small-btn accept" href="/admin/order/${x.id}/accept?pin=${pin}">Accept</a>
          <a class="small-btn cancel" href="/admin/order/${x.id}/cancel?pin=${pin}">Cancel</a>
        `;
      } else if (st === "accepted") {
        actions = `
          <a class="small-btn done" href="/admin/order/${x.id}/complete?pin=${pin}">Complete</a>
          <a class="small-btn cancel" href="/admin/order/${x.id}/cancel?pin=${pin}">Cancel</a>
        `;
      } else if (st === "completed") {
        actions = `<span class="mini-note">Done</span>`;
      } else {
        actions = `<a class="small-btn accept" href="/admin/order/${x.id}/accept?pin=${pin}">Re-Accept</a>`;
      }

      const time = x.created_at ? new Date(x.created_at).toLocaleString("en-GB", {
        timeZone:"Asia/Dhaka",
        day:"2-digit",
        month:"short",
        year:"2-digit",
        hour:"2-digit",
        minute:"2-digit"
      }) : "";

      return `
        <div class="order-card">
          <h3>#${esc(String(x.id))} ${esc(String(x.customer_name || ""))}</h3>
          <div class="order-meta">
            <div><b>Phone:</b> ${esc(String(x.customer_phone || ""))}</div>
            <div><b>Pickup:</b> ${esc(String(x.pickup_location || ""))}</div>
            <div><b>Drop:</b> ${esc(String(x.drop_location || ""))}</div>
            <div><b>Details:</b> ${esc(String(x.item_details || ""))}</div>
            <div><b>Note:</b> ${esc(String(x.note || ""))}</div>
            <div><b>Time:</b> ${esc(String(time))}</div>
            <div style="margin-top:8px"><span class="status-pill ${esc(st)}">${esc(st)}</span></div>
          </div>
          <div class="order-actions">${actions}</div>
        </div>
      `;
    }).join("");

    res.send(page("Admin Orders", `
      ${orderAdminCss}
      <div class="card">
        <h1>GOVO Orders</h1>
        <p class="mini-note">New customer orders, delivery requests, and service requests.</p>
        <div class="order-grid">${cards || "<p>No orders found.</p>"}</div>
      </div>
    `));
  } catch(e) {
    console.log("Admin orders error:", e.message);
    res.status(500).send(page("Admin Orders Error", `
      <div class="card"><h1>Admin Orders Error</h1><p>${esc(String(e.message))}</p></div>
    `));
  }
});

app.get("/admin/order/:id/:action", async (req,res)=>{
  if(!pinok(req,res)) return;

  const action = req.params.action;
  const status =
    action === "accept" ? "accepted" :
    action === "complete" ? "completed" :
    action === "cancel" ? "cancelled" :
    "pending";

  try {
    await pool.query("UPDATE govo_orders SET status=$1 WHERE id=$2", [status, req.params.id]);

    if (typeof sendTelegram === "function") {
      sendTelegram(`📦 GOVO Order ${status.toUpperCase()}\nID: ${req.params.id}`).catch(()=>{});
    }

    res.redirect("/admin/orders?pin=" + encodeURIComponent((req.query && req.query.pin) || ADMIN_PIN || ""));
  } catch(e) {
    console.log("Order status update error:", e.message);
    res.status(500).send(page("Order Status Error", `
      <div class="card"><h1>Order Status Error</h1><p>${esc(String(e.message))}</p></div>
    `));
  }
});

/* ================= /GOVO ORDER MODULE ================= */



/* ================= GOVO MERCHANT MARKETPLACE MODULE ================= */

async function ensureMerchantStoreTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS govo_merchant_profiles (
        id SERIAL PRIMARY KEY,
        merchant_lead_id INTEGER,
        shop_name TEXT,
        owner_name TEXT,
        phone TEXT UNIQUE,
        location TEXT,
        category TEXT,
        delivery_needed TEXT,
        description TEXT,
        opening_hours TEXT,
        delivery_area TEXT,
        logo_image TEXT,
        cover_image TEXT,
        whatsapp TEXT,
        status TEXT DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS govo_shop_items (
        id SERIAL PRIMARY KEY,
        merchant_phone TEXT,
        item_name TEXT,
        price TEXT,
        details TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS govo_orders (
        id SERIAL PRIMARY KEY,
        customer_name TEXT,
        customer_phone TEXT,
        pickup_location TEXT,
        drop_location TEXT,
        item_details TEXT,
        note TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_lead_id INTEGER");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS merchant_phone TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS shop_name TEXT");
    await pool.query("ALTER TABLE govo_orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'delivery'");

    console.log("Merchant marketplace tables ready");
  } catch(e) {
    console.log("Merchant marketplace setup error:", e.message);
  }
}

const marketCss = `
<style>
.market-hero{display:grid;gap:12px;margin-bottom:18px}.market-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.shop-card{border:1px solid #243044;background:#0f172a;border-radius:18px;padding:16px}.shop-card h3{margin:0 0 8px;color:#22c55e}.shop-meta{font-size:13px;color:#cbd5e1;line-height:1.55}.pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#163b26;color:#86efac;font-size:12px;font-weight:800}.store-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.store-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:12px;background:#22c55e;color:#052e16;font-weight:900;text-decoration:none}.store-btn.outline{background:transparent;border:1px solid #22c55e;color:#86efac}.mini-muted{font-size:12px;color:#94a3b8}.item-list{display:grid;gap:10px}.item-box{border:1px solid #263244;border-radius:14px;padding:12px;background:#111827}.top-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 20px}.field-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}@media(max-width:700px){.market-grid{grid-template-columns:1fr}.store-actions{flex-direction:column}.store-btn{width:100%}}
</style>
`;

async function getApprovedMerchantByPhone(phone) {
  const r = await pool.query(`
    SELECT * FROM govo_merchant_leads
    WHERE phone=$1
    ORDER BY id DESC
    LIMIT 1
  `, [phone]);
  const lead = r.rows[0];
  if (!lead) return { lead: null, approved: false, reason: "No merchant registration found" };
  const approved = String(lead.status || "pending").toLowerCase() === "approved";
  return { lead, approved, reason: approved ? "approved" : `Merchant status is ${lead.status || 'pending'}` };
}

app.get("/shops", async (req,res)=>{
  try {
    const r = await pool.query(`
      SELECT id, shop_name, owner_name, phone, location, category, delivery_needed,
             COALESCE(status,'pending') AS status,
             created_at
      FROM govo_merchant_leads
      WHERE COALESCE(status,'pending')='approved'
      ORDER BY id DESC
      LIMIT 100
    `);

    const shopCss = `
    <style>
      .shop-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
      .shop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
      .shop-card{background:#0f172a;border:1px solid #243044;border-radius:20px;padding:18px}
      .shop-card h3{margin:8px 0;color:#22c55e;font-size:22px}
      .shop-meta{color:#cbd5e1;font-size:14px;line-height:1.6}
      .shop-tag{display:inline-block;background:#052e16;color:#bbf7d0;border:1px solid #22c55e;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800}
      .shop-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
      .shop-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 13px;border-radius:12px;text-decoration:none;font-weight:900}
      .shop-btn.primary{background:#22c55e;color:#052e16}
      .shop-btn.ghost{border:1px solid #22c55e;color:#bbf7d0}
      .muted{color:#94a3b8}
    </style>`;

    const cards = r.rows.map(x=>`
      <div class="shop-card">
        <span class="shop-tag">${esc(String(x.category || "Shop"))}</span>
        <h3>${esc(String(x.shop_name || ""))}</h3>
        <div class="shop-meta">
          <div><b>Owner:</b> ${esc(String(x.owner_name || ""))}</div>
          <div><b>Phone:</b> ${esc(String(x.phone || ""))}</div>
          <div><b>Location:</b> ${esc(String(x.location || ""))}</div>
          <div><b>Delivery:</b> ${esc(String(x.delivery_needed || ""))}</div>
        </div>
        <div class="shop-actions">
          <a class="shop-btn primary" href="/order?shop=${encodeURIComponent(x.shop_name || "")}">📦 Delivery Book</a>
          <a class="shop-btn ghost" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || "")}">Shop Dashboard</a>
        </div>
      </div>
    `).join("");

    res.send(page("GOVO Shops", `
      ${shopCss}
      <div class="card">
        <div class="shop-head">
          <div>
            <h1>GOVO Shops</h1>
            <p class="muted">Approved merchant shops. Customer ekhane theke delivery book korte parbe.</p>
          </div>
          <a class="btn" href="/merchant/dashboard">Merchant Login</a>
        </div>
        <div class="shop-grid">${cards || "<p>No approved shop found. Admin theke merchant approve korun.</p>"}</div>
      </div>
    `));
  } catch(e) {
    console.log("Safe shops error:", e.message);
    res.status(500).send(page("Shops Error", `<div class="card"><h1>Shops Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/shop/:id", async (req,res)=>{
  try {
    const r = await pool.query(`
      SELECT l.id AS lead_id,
             COALESCE(p.shop_name,l.shop_name) AS shop_name,
             COALESCE(p.owner_name,l.owner_name) AS owner_name,
             l.phone,
             COALESCE(p.location,l.location) AS location,
             COALESCE(p.category,l.category) AS category,
             COALESCE(p.delivery_needed,l.delivery_needed) AS delivery_needed,
             p.description, p.opening_hours, p.delivery_area, p.whatsapp
      FROM govo_merchant_leads l
      LEFT JOIN govo_merchant_profiles p ON p.phone=l.phone
      WHERE l.id=$1 AND LOWER(COALESCE(l.status,'pending'))='approved'
      LIMIT 1
    `, [req.params.id]);
    const shop = r.rows[0];
    if (!shop) return res.status(404).send(page("Shop Not Found", `<div class="card"><h1>Shop Not Found</h1><p>This shop is not approved or not found.</p></div>`));

    const items = await pool.query(`
      SELECT id,item_name,price,details FROM govo_shop_items
      WHERE merchant_phone=$1 AND is_active=true
      ORDER BY id DESC LIMIT 50
    `, [shop.phone]);

    const itemHtml = items.rows.map(i=>`
      <div class="item-box"><b>${esc(String(i.item_name || 'Item'))}</b><br><span>${esc(String(i.price || ''))}</span><br><span class="mini-muted">${esc(String(i.details || ''))}</span></div>
    `).join("");

    res.send(page(shop.shop_name || "GOVO Shop", `${marketCss}<div class="card"><a class="btn" href="/shops">← Shops</a><h1>${esc(String(shop.shop_name || 'GOVO Shop'))}</h1><p>${esc(String(shop.description || ''))}</p><div class="shop-meta"><div><b>Owner:</b> ${esc(String(shop.owner_name || ''))}</div><div><b>Phone:</b> ${esc(String(shop.phone || ''))}</div><div><b>Location:</b> ${esc(String(shop.location || ''))}</div><div><b>Category:</b> ${esc(String(shop.category || ''))}</div><div><b>Open:</b> ${esc(String(shop.opening_hours || ''))}</div><div><b>Area:</b> ${esc(String(shop.delivery_area || ''))}</div></div><div class="store-actions"><a class="store-btn" href="/book/${shop.lead_id}">📦 Book Delivery</a></div></div><div class="card"><h2>Products / Services</h2><div class="item-list">${itemHtml || '<p>No product added yet.</p>'}</div></div>`));
  } catch(e) {
    console.log("Shop detail error:", e.message);
    res.status(500).send(page("Shop Error", `<div class="card"><h1>Shop Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/book/:id", async (req,res)=>{
  try {
    const r = await pool.query(`
      SELECT l.id AS lead_id, COALESCE(p.shop_name,l.shop_name) AS shop_name, l.phone,
             COALESCE(p.location,l.location) AS location
      FROM govo_merchant_leads l
      LEFT JOIN govo_merchant_profiles p ON p.phone=l.phone
      WHERE l.id=$1 AND LOWER(COALESCE(l.status,'pending'))='approved'
      LIMIT 1
    `, [req.params.id]);
    const shop = r.rows[0];
    if (!shop) return res.status(404).send(page("Booking Not Found", `<div class="card"><h1>Booking Not Found</h1><p>Shop not approved or not found.</p></div>`));

    res.send(page("Book Delivery", `${marketCss}<div class="card"><h1>Book Delivery</h1><p>Shop: <b>${esc(String(shop.shop_name || ''))}</b></p><form method="POST" action="/book/${shop.lead_id}"><label>Your Name</label><input name="customer_name" required><label>Your Phone</label><input name="customer_phone" required><label>Drop Location</label><input name="drop_location" required><label>Product / Details</label><textarea name="item_details" required></textarea><label>Note</label><textarea name="note"></textarea><button>Confirm Booking</button></form></div>`));
  } catch(e) {
    console.log("Book form error:", e.message);
    res.status(500).send(page("Booking Error", `<div class="card"><h1>Booking Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.post("/book/:id", async (req,res)=>{
  try {
    const r = await pool.query(`
      SELECT l.id AS lead_id, COALESCE(p.shop_name,l.shop_name) AS shop_name, l.phone,
             COALESCE(p.location,l.location) AS location
      FROM govo_merchant_leads l
      LEFT JOIN govo_merchant_profiles p ON p.phone=l.phone
      WHERE l.id=$1 AND LOWER(COALESCE(l.status,'pending'))='approved'
      LIMIT 1
    `, [req.params.id]);
    const shop = r.rows[0];
    if (!shop) return res.status(404).send(page("Booking Not Found", `<div class="card"><h1>Booking Not Found</h1></div>`));

    const order = {
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone,
      pickup_location: shop.location || shop.shop_name || "Merchant Shop",
      drop_location: req.body.drop_location,
      item_details: req.body.item_details,
      note: req.body.note || "",
      merchant_lead_id: shop.lead_id,
      merchant_phone: shop.phone,
      shop_name: shop.shop_name
    };

    const saved = await pool.query(`
      INSERT INTO govo_orders
      (customer_name, customer_phone, pickup_location, drop_location, item_details, note, merchant_lead_id, merchant_phone, shop_name, order_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'shop_delivery')
      RETURNING id
    `, [order.customer_name, order.customer_phone, order.pickup_location, order.drop_location, order.item_details, order.note, order.merchant_lead_id, order.merchant_phone, order.shop_name]);

    const orderId = saved.rows[0].id;
    if (typeof sendTelegram === "function") {
      sendTelegram(["📦 New GOVO Shop Delivery", "", `Order ID: ${orderId}`, `Shop: ${order.shop_name || ''}`, `Merchant Phone: ${order.merchant_phone || ''}`, `Customer: ${order.customer_name || ''}`, `Phone: ${order.customer_phone || ''}`, `Drop: ${order.drop_location || ''}`, `Details: ${order.item_details || ''}`].join("\n")).catch(()=>{});
    }

    res.send(page("Booking Submitted", `<div class="card ok"><h1>✅ Booking Submitted</h1><p>GOVO team order receive koreche.</p><p><b>Order ID:</b> ${esc(String(orderId))}</p><a class="btn" href="/shops">Back to Shops</a></div>`));
  } catch(e) {
    console.log("Book submit error:", e.message);
    res.status(500).send(page("Booking Error", `<div class="card"><h1>Booking Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/merchant/dashboard", async (req,res)=>{
  const phone = String((req.query && req.query.phone) || "").trim();
  if (!phone) {
    return res.send(page("Merchant Dashboard", `${marketCss}<div class="card"><h1>Merchant Dashboard</h1><p class="mini-muted">Approved merchant phone number diye login/check korun.</p><form method="GET" action="/merchant/dashboard"><label>Phone</label><input name="phone" required><button>Open Dashboard</button></form></div>`));
  }

  try {
    const check = await getApprovedMerchantByPhone(phone);
    if (!check.lead) return res.send(page("Merchant Dashboard", `${marketCss}<div class="card"><h1>No merchant found</h1><p>${esc(check.reason)}</p><a class="btn" href="/merchant">Register Merchant</a></div>`));
    if (!check.approved) return res.send(page("Merchant Dashboard", `${marketCss}<div class="card"><h1>Merchant Pending</h1><p>${esc(check.reason)}</p><p>Admin approve korle dashboard active hobe.</p></div>`));

    await pool.query(`
      INSERT INTO govo_merchant_profiles (merchant_lead_id, shop_name, owner_name, phone, location, category, delivery_needed, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'published')
      ON CONFLICT (phone) DO NOTHING
    `, [check.lead.id, check.lead.shop_name, check.lead.owner_name, check.lead.phone, check.lead.location, check.lead.category, check.lead.delivery_needed]);

    const prof = (await pool.query("SELECT * FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1", [phone])).rows[0] || {};
    const items = await pool.query("SELECT id,item_name,price,details FROM govo_shop_items WHERE merchant_phone=$1 AND is_active=true ORDER BY id DESC LIMIT 50", [phone]);
    const itemHtml = items.rows.map(i=>`<div class="item-box"><b>${esc(String(i.item_name||''))}</b> — ${esc(String(i.price||''))}<br><span class="mini-muted">${esc(String(i.details||''))}</span> <a class="btn" href="/merchant/item/${i.id}/delete?phone=${encodeURIComponent(phone)}">Remove</a></div>`).join("");

    res.send(page("Merchant Dashboard", `${marketCss}<div class="card"><h1>Merchant Dashboard</h1><p class="mini-muted">Phone: ${esc(phone)} | Public shop: <a class="btn" href="/shop/${check.lead.id}">View Shop</a></p><form method="POST" action="/merchant/profile"><input type="hidden" name="phone" value="${esc(phone)}"><div class="field-grid"><div><label>Shop Name</label><input name="shop_name" value="${esc(String(prof.shop_name||''))}" required></div><div><label>Owner Name</label><input name="owner_name" value="${esc(String(prof.owner_name||''))}"></div><div><label>Location</label><input name="location" value="${esc(String(prof.location||''))}"></div><div><label>Category</label><input name="category" value="${esc(String(prof.category||''))}"></div><div><label>Opening Hours</label><input name="opening_hours" value="${esc(String(prof.opening_hours||''))}" placeholder="9 AM - 10 PM"></div><div><label>Delivery Area</label><input name="delivery_area" value="${esc(String(prof.delivery_area||''))}" placeholder="Meherpur, Gangni"></div><div><label>WhatsApp</label><input name="whatsapp" value="${esc(String(prof.whatsapp||''))}"></div></div><label>Description</label><textarea name="description">${esc(String(prof.description||''))}</textarea><button>Save Shop Info</button></form></div><div class="card"><h2>Add Product / Service</h2><form method="POST" action="/merchant/item"><input type="hidden" name="phone" value="${esc(phone)}"><label>Item Name</label><input name="item_name" required><label>Price</label><input name="price" placeholder="৳100"><label>Details</label><textarea name="details"></textarea><button>Add Item</button></form><h2>Current Items</h2><div class="item-list">${itemHtml || '<p>No item added yet.</p>'}</div></div>`));
  } catch(e) {
    console.log("Merchant dashboard error:", e.message);
    res.status(500).send(page("Merchant Dashboard Error", `<div class="card"><h1>Merchant Dashboard Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.post("/merchant/profile", async (req,res)=>{
  const phone = String(req.body.phone || "").trim();
  try {
    const check = await getApprovedMerchantByPhone(phone);
    if (!check.approved) return res.status(403).send(page("Not Approved", `<div class="card"><h1>Not Approved</h1><p>${esc(check.reason)}</p></div>`));
    await pool.query(`
      INSERT INTO govo_merchant_profiles
      (merchant_lead_id, shop_name, owner_name, phone, location, category, description, opening_hours, delivery_area, whatsapp, status, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',NOW())
      ON CONFLICT (phone) DO UPDATE SET
        shop_name=EXCLUDED.shop_name, owner_name=EXCLUDED.owner_name, location=EXCLUDED.location,
        category=EXCLUDED.category, description=EXCLUDED.description, opening_hours=EXCLUDED.opening_hours,
        delivery_area=EXCLUDED.delivery_area, whatsapp=EXCLUDED.whatsapp, status='published', updated_at=NOW()
    `, [check.lead.id, req.body.shop_name, req.body.owner_name, phone, req.body.location, req.body.category, req.body.description, req.body.opening_hours, req.body.delivery_area, req.body.whatsapp]);
    res.redirect("/merchant/dashboard?phone=" + encodeURIComponent(phone));
  } catch(e) {
    console.log("Merchant profile save error:", e.message);
    res.status(500).send(page("Profile Save Error", `<div class="card"><h1>Profile Save Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.post("/merchant/item", async (req,res)=>{
  const phone = String(req.body.phone || "").trim();
  try {
    const check = await getApprovedMerchantByPhone(phone);
    if (!check.approved) return res.status(403).send(page("Not Approved", `<div class="card"><h1>Not Approved</h1></div>`));
    await pool.query("INSERT INTO govo_shop_items (merchant_phone,item_name,price,details) VALUES ($1,$2,$3,$4)", [phone, req.body.item_name, req.body.price, req.body.details]);
    res.redirect("/merchant/dashboard?phone=" + encodeURIComponent(phone));
  } catch(e) {
    console.log("Merchant item add error:", e.message);
    res.status(500).send(page("Item Add Error", `<div class="card"><h1>Item Add Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/merchant/item/:id/delete", async (req,res)=>{
  const phone = String((req.query && req.query.phone) || "").trim();
  try {
    await pool.query("UPDATE govo_shop_items SET is_active=false WHERE id=$1 AND merchant_phone=$2", [req.params.id, phone]);
    res.redirect("/merchant/dashboard?phone=" + encodeURIComponent(phone));
  } catch(e) {
    console.log("Merchant item delete error:", e.message);
    res.status(500).send(page("Item Delete Error", `<div class="card"><h1>Item Delete Error</h1></div>`));
  }
});

/* ================= /GOVO MERCHANT MARKETPLACE MODULE ================= */


initDb().then(() => {
  app.listen(PORT, () => console.log('GOVO Admin OS running on', PORT));
}).catch((e) => {
  console.error('Startup failed:', e);
  process.exit(1);
});
