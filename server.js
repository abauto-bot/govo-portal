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

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)} | GOVO Express</title><style>${css}</style></head><body><main class="app"><header class="topbar"><div class="brand-row"><div class="brand"><div class="logo">G</div><div><h2>GOVO Express</h2><p>Merchant • Rider • Admin OS</p></div></div><span class="pill">Live System</span></div><nav class="nav">${nav}</nav></header>${body}<div class="footer">GOVO Admin OS • Stable MVP</div></main></body></html>`;
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

initDb().then(() => {
  app.listen(PORT, () => console.log('GOVO Admin OS running on', PORT));
}).catch((e) => {
  console.error('Startup failed:', e);
  process.exit(1);
});
