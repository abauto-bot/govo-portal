// GOVO Express Portal - v1.0 Clean Release Phase 1
// Canonical routes only. Additive schema setup. Telegram notifications preserved.

const fs = require('fs');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const multer = require("multer");

loadEnv();

const app = express();

/* GOVO PRODUCT UPLOAD FIX START */
const govoUploadsDir = path.join(__dirname, "uploads");

try {
  fs.mkdirSync(govoUploadsDir, { recursive: true });
} catch (e) {
  console.log("Upload dir create skipped:", e.message);
}

app.use("/uploads", express.static(govoUploadsDir));

const allowedImageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const allowedImageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, govoUploadsDir);
    },
    filename: function(req, file, cb) {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = allowedImageExts.includes(ext) ? ext : ".jpg";
      const field = String(file.fieldname || "image").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "image";
      const name = field + "-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + safeExt;
      cb(null, name);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const ok = allowedImageMimes.includes(file.mimetype) && allowedImageExts.includes(ext);
    if (!ok) return cb(new Error("Only jpg, jpeg, png, webp, gif images allowed"));
    cb(null, true);
  }
});
const productUpload = imageUpload;
/* GOVO PRODUCT UPLOAD FIX END */


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = String(process.env.ADMIN_PIN || process.env.GOVO_ADMIN_PIN || process.env.PIN || '').trim();
const pool = new Pool(pgConfig());

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch (e) {
    console.log('ENV load skipped:', e.message);
  }
}

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
      timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(v);
  }
}

function getPin(req) {
  return String((req.body && req.body.pin) || (req.query && req.query.pin) || '').trim();
}

function requireAdmin(req, res) {
  const pin = getPin(req);
  if (ADMIN_PIN && pin === ADMIN_PIN) return true;
  res.status(403).send(page('Admin Locked', `
    <section class="card lock-card">
      <h1>Admin Locked</h1>
      <p>Admin panel open korte correct PIN lagbe.</p>
      <form method="GET" action="${esc(req.path || '/admin/os')}">
        <input name="pin" type="password" placeholder="Admin PIN" required autofocus>
        <button>Unlock</button>
      </form>
    </section>
  `, 'admin'));
  return false;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.ADMIN_CHAT_ID || '';
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

const css = `
:root{--bg:#0b1020;--panel:#111827;--line:#263244;--text:#e5e7eb;--muted:#94a3b8;--green:#22c55e;--red:#ef4444;--blue:#60a5fa}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0b1020;color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}.app{max-width:1180px;margin:0 auto;padding:18px}.topbar{position:sticky;top:0;z-index:5;background:rgba(11,16,32,.92);backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,.16);border-radius:18px;margin-bottom:18px;padding:14px}.brand-row{display:flex;align-items:center;justify-content:space-between;gap:14px}.brand{display:flex;align-items:center;gap:12px}.logo{width:42px;height:42px;border-radius:12px;background:#22c55e;color:#052e16;display:grid;place-items:center;font-weight:1000}.brand h2{font-size:18px;margin:0}.brand p{margin:2px 0 0;color:var(--muted);font-size:12px}.nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.nav a{color:#bfdbfe;text-decoration:none;padding:9px 11px;border:1px solid rgba(96,165,250,.18);border-radius:12px;background:#0f172a;font-weight:800;font-size:14px}.nav a.active,.nav a:hover{background:rgba(34,197,94,.15);color:#bbf7d0;border-color:rgba(34,197,94,.45)}.card{background:#111827;border:1px solid rgba(148,163,184,.16);border-radius:18px;padding:18px;margin-bottom:16px}.card h1{margin:0 0 14px;color:#22c55e;font-size:clamp(28px,5vw,48px);line-height:1.08}.card h2{margin:0 0 10px;color:#e2e8f0}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat{background:#0f172a;border:1px solid rgba(148,163,184,.14);border-radius:16px;padding:14px}.stat .label{font-size:12px;color:var(--muted);font-weight:900;text-transform:uppercase}.stat .value{font-size:28px;font-weight:1000;margin-top:7px}form{display:grid;gap:11px}label{font-weight:850;color:#e2e8f0}input,select,textarea{width:100%;border:1px solid #334155;border-radius:13px;background:#020617;color:#f8fafc;padding:12px;font-size:15px}textarea{min-height:92px}.btn,button{border:0;border-radius:13px;padding:11px 14px;font-weight:1000;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#22c55e;color:#052e16}.btn.secondary,button.secondary{background:#1e293b;color:#e2e8f0;border:1px solid #334155}.reject,button.reject{background:#ef4444;color:#fff}.pill,.badge{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-weight:900;font-size:12px;text-transform:capitalize}.badge.rejected,.badge.cancelled,.badge.failed,.badge.unavailable{background:#7f1d1d;border-color:#ef4444;color:#fecaca}.badge.verified{background:#0c4a6e;border-color:#38bdf8;color:#e0f2fe}.badge.trusted{background:#064e3b;border-color:#34d399;color:#d1fae5}.badge.available{background:#052e16;border-color:#22c55e;color:#bbf7d0}.badge.emergency{background:#7c2d12;border-color:#fb923c;color:#ffedd5}.badge.rating{background:#422006;border-color:#facc15;color:#fef9c3}.badge.clear{background:#172554;border-color:#60a5fa;color:#dbeafe}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.cards{display:grid;gap:14px}.item-grid,.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.detail-grid div,.item-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px;min-width:0}.detail-grid b,.item-box b{display:block;margin-bottom:5px}.detail-grid span,.item-box span{word-break:break-word}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.three{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.filters{display:grid;grid-template-columns:1fr .55fr auto;gap:8px;margin:12px 0}.footer{color:var(--muted);font-size:12px;text-align:center;padding:18px 0}.lock-card{max-width:520px;margin:50px auto}.table-wrap{overflow:auto}.admin-table{width:100%;min-width:900px;border-collapse:collapse}.admin-table th,.admin-table td{border-bottom:1px solid #263244;padding:10px;text-align:left;vertical-align:top}.admin-table th{color:#bfdbfe;font-size:12px;text-transform:uppercase}
@media(max-width:760px){.app{padding:12px}.grid,.item-grid,.detail-grid,.filters,.three{grid-template-columns:1fr}.brand-row{align-items:flex-start}.card{padding:15px}.actions .btn,.actions form,button{width:100%}}
`;

function page(title, body, active = '') {
  const pin = ADMIN_PIN ? `?pin=${encodeURIComponent(ADMIN_PIN)}` : '';
  const nav = [
    ['merchant', '/merchant', 'Merchant'],
    ['rider', '/rider', 'Rider'],
    ['shops', '/shops', 'Shops'],
    ['services', '/services', 'Services'],
    ['provider', '/provider', 'Provider'],
    ['track', '/track', 'Track'],
    ['admin', `/admin/os${pin}`, 'Admin'],
  ].map(([key, href, label]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | GOVO Express</title><style>${css}</style></head><body><main class="app"><header class="topbar"><div class="brand-row"><div class="brand"><div class="logo">G</div><div><h2>GOVO Express</h2><p>Merchant, rider and delivery portal</p></div></div><span class="pill">Live System</span></div><nav class="nav">${nav}</nav></header>${body}<div class="footer">GOVO Express v1.0 Clean Release</div></main></body></html>`;
}

function badge(status) {
  const s = String(status || 'pending').toLowerCase();
  return `<span class="badge ${esc(s)}">${esc(s)}</span>`;
}

function boolish(v) {
  return v === true || v === 1 || String(v || '').toLowerCase() === 'true' || String(v || '') === '1';
}

function ratingText(x) {
  const avg = Number(x.rating_avg || 0);
  const count = Number(x.rating_count || 0);
  return `${avg ? avg.toFixed(1).replace(/\.0$/, '') : '0'} / 5 (${count})`;
}

function trustBadges(x) {
  const available = boolish(x.is_available);
  return `<div class="actions trust-row">
    ${boolish(x.is_verified) ? '<span class="badge verified">Verified</span>' : ''}
    ${boolish(x.is_trusted) ? '<span class="badge trusted">Trusted</span>' : ''}
    <span class="badge ${available ? 'available' : 'unavailable'}">${available ? 'Available' : 'Unavailable'}</span>
    ${boolish(x.emergency_available) ? '<span class="badge emergency">Emergency</span>' : ''}
    <span class="badge rating">Rating ${esc(ratingText(x))}</span>
  </div>`;
}

function listingImage(src, alt, large = false) {
  if (!src) return '';
  return `<img src="${esc(src)}" alt="${esc(alt || 'GOVO image')}" style="width:100%;${large ? 'max-height:260px' : 'height:170px'};object-fit:cover;border-radius:14px;border:1px solid rgba(34,197,94,.35);margin:10px 0">`;
}

function adminTrustControls(type, x, pin) {
  const fields = [
    ['is_verified', 'Verified'],
    ['is_trusted', 'Trusted'],
    ['is_available', 'Available'],
    ['emergency_available', 'Emergency'],
  ];
  return `<div class="actions">${fields.map(([field, label]) => {
    const current = boolish(x[field]);
    const action = type === 'merchant' ? '/admin/merchant/trust' : '/admin/provider/trust';
    return `<form method="POST" action="${action}"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="field" value="${field}"><input type="hidden" name="value" value="${current ? 'false' : 'true'}"><button class="${current ? '' : 'secondary'}">${esc(label)}: ${esc(current ? 'On' : 'Off')}</button></form>`;
  }).join('')}</div>`;
}

function statCards(c) {
  return `<section class="grid">
    <div class="stat"><div class="label">Total</div><div class="value">${esc(c.total || 0)}</div></div>
    <div class="stat"><div class="label">Pending</div><div class="value">${esc(c.pending || 0)}</div></div>
    <div class="stat"><div class="label">Approved</div><div class="value">${esc(c.approved || 0)}</div></div>
    <div class="stat"><div class="label">Rejected</div><div class="value">${esc(c.rejected || 0)}</div></div>
  </section>`;
}

async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_merchant_leads (id SERIAL PRIMARY KEY, shop_name TEXT, owner_name TEXT, phone TEXT, location TEXT, category TEXT, delivery_needed TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_rider_leads (id SERIAL PRIMARY KEY, rider_name TEXT, phone TEXT, location TEXT, vehicle_type TEXT, experience TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_orders (id SERIAL PRIMARY KEY, shop_name TEXT, merchant_phone TEXT, customer_name TEXT, customer_phone TEXT, pickup_location TEXT, drop_location TEXT, item_details TEXT, note TEXT, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_shop_products (id SERIAL PRIMARY KEY, merchant_lead_id INT, shop_name TEXT, merchant_phone TEXT, product_name TEXT, price TEXT, category TEXT, description TEXT, image_url TEXT, is_available BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_merchant_profiles (id SERIAL PRIMARY KEY, merchant_lead_id INTEGER, shop_name TEXT, owner_name TEXT, phone TEXT UNIQUE, location TEXT, category TEXT, delivery_needed TEXT, description TEXT, opening_hours TEXT, delivery_area TEXT, logo_image TEXT, cover_image TEXT, whatsapp TEXT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);

  await pool.query(`CREATE TABLE IF NOT EXISTS govo_service_providers (id SERIAL PRIMARY KEY, provider_name TEXT, phone TEXT, whatsapp TEXT, service_type TEXT, area TEXT, address TEXT, experience TEXT, description TEXT, image_url TEXT, status TEXT DEFAULT 'pending', admin_note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_service_requests (id SERIAL PRIMARY KEY, provider_id INT, provider_name TEXT, provider_phone TEXT, service_type TEXT, customer_name TEXT, customer_phone TEXT, service_address TEXT, problem_details TEXT, preferred_time TEXT, note TEXT, status TEXT DEFAULT 'pending', admin_note TEXT, provider_note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_shop_items (id SERIAL PRIMARY KEY, merchant_phone TEXT, item_name TEXT, price TEXT, details TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`);

  const add = async (table, columnSql) => pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnSql}`);
  for (const col of ['shop_name TEXT', 'owner_name TEXT', 'phone TEXT', 'whatsapp TEXT', 'location TEXT', 'category TEXT', 'delivery_needed TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'shop_description TEXT', 'shop_address TEXT', 'products TEXT', 'image_url TEXT', 'is_verified BOOLEAN DEFAULT false', 'is_trusted BOOLEAN DEFAULT false', 'is_available BOOLEAN DEFAULT true', 'emergency_available BOOLEAN DEFAULT false', 'rating_avg NUMERIC DEFAULT 0', 'rating_count INT DEFAULT 0', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_merchant_leads', col);
  for (const col of ['rider_name TEXT', 'name TEXT', 'phone TEXT', 'location TEXT', 'vehicle_type TEXT', 'experience TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_rider_leads', col);
  for (const col of ['shop_name TEXT', 'merchant_phone TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'pickup_location TEXT', 'drop_location TEXT', 'item_details TEXT', 'note TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'merchant_note TEXT', 'rider_id INT', 'rider_name TEXT', 'rider_phone TEXT', 'merchant_lead_id INTEGER', "order_type TEXT DEFAULT 'delivery'", 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_orders', col);
  for (const col of ['provider_name TEXT', 'phone TEXT', 'whatsapp TEXT', 'service_type TEXT', 'area TEXT', 'address TEXT', 'experience TEXT', 'description TEXT', 'image_url TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'is_verified BOOLEAN DEFAULT false', 'is_trusted BOOLEAN DEFAULT false', 'is_available BOOLEAN DEFAULT true', 'emergency_available BOOLEAN DEFAULT false', 'rating_avg NUMERIC DEFAULT 0', 'rating_count INT DEFAULT 0', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_service_providers', col);
  for (const col of ['provider_id INT', 'provider_name TEXT', 'provider_phone TEXT', 'service_type TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'service_address TEXT', 'problem_details TEXT', 'preferred_time TEXT', 'note TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'provider_note TEXT', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_service_requests', col);

}

function domainType(req) {
  const host = String((req.headers && req.headers.host) || '').split(':')[0].toLowerCase();
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('rider.')) return 'rider';
  if (host.startsWith('merchant.')) return 'merchant';
  return 'public';
}

app.use((req, res, next) => {
  if (req.path !== '/') return next();
  const type = domainType(req);
  if (type === 'admin') return res.redirect('/admin/os');
  if (type === 'rider') return res.redirect('/rider');
  if (type === 'merchant') return res.redirect('/shops');
  return next();
});

app.get('/', (req, res) => res.redirect('/merchant'));
app.get('/health', (req, res) => res.json({ ok: true, service: 'govo-portal', version: 'v1.0-clean-phase1' }));

app.get('/merchant', (req, res) => {
  res.send(page('Merchant Registration', `<section class="card"><h1>GOVO Merchant Registration</h1><form method="POST" action="/merchant"><label>Shop Name</label><input name="shop_name" required><label>Owner Name</label><input name="owner_name" required><label>Phone</label><input name="phone" required><label>Location</label><input name="location" required><label>Category</label><select name="category"><option>Restaurant</option><option>Grocery</option><option>Pharmacy</option><option>Fashion</option><option>Electronics</option><option>Service Provider</option><option>Other</option></select><label>Delivery Needed?</label><select name="delivery_needed"><option>Yes</option><option>No</option><option>Later</option></select><button>Submit Merchant Info</button></form></section>`, 'merchant'));
});

app.post('/merchant', async (req, res, next) => {
  try {
    const lead = { shop_name: req.body.shop_name, owner_name: req.body.owner_name, phone: req.body.phone, location: req.body.location, category: req.body.category, delivery_needed: req.body.delivery_needed };
    await pool.query(`INSERT INTO govo_merchant_leads (shop_name, owner_name, phone, location, category, delivery_needed, status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`, [lead.shop_name, lead.owner_name, lead.phone, lead.location, lead.category, lead.delivery_needed]);
    sendTelegram(['New GOVO Merchant Lead', '', `Shop: ${lead.shop_name || ''}`, `Owner: ${lead.owner_name || ''}`, `Phone: ${lead.phone || ''}`, `Location: ${lead.location || ''}`, `Category: ${lead.category || ''}`, `Delivery: ${lead.delivery_needed || ''}`, `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}`].join('\n')).catch(() => {});
    res.send(page('Merchant Submitted', `<section class="card"><h1>Merchant Submitted</h1><p>GOVO team info receive koreche.</p><a class="btn" href="/merchant">Add Another</a></section>`));
  } catch (e) { next(e); }
});

app.get('/rider', (req, res) => {
  res.send(page('Rider Registration', `<section class="card"><h1>GOVO Rider Registration</h1><form method="POST" action="/rider"><label>Rider Name</label><input name="rider_name" required><label>Phone</label><input name="phone" required><label>Location</label><input name="location" required><label>Vehicle Type</label><select name="vehicle_type"><option>Bike</option><option>Cycle</option><option>Auto</option><option>Other</option></select><label>Experience</label><textarea name="experience"></textarea><button>Submit Rider Info</button></form></section>`, 'rider'));
});

app.post('/rider', async (req, res, next) => {
  try {
    await pool.query(`INSERT INTO govo_rider_leads (rider_name, phone, location, vehicle_type, experience, status) VALUES ($1,$2,$3,$4,$5,'pending')`, [req.body.rider_name, req.body.phone, req.body.location, req.body.vehicle_type, req.body.experience]);
    sendTelegram(['New GOVO Rider Lead', '', `Name: ${req.body.rider_name || ''}`, `Phone: ${req.body.phone || ''}`, `Location: ${req.body.location || ''}`, `Vehicle: ${req.body.vehicle_type || ''}`, `Experience: ${req.body.experience || ''}`, `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}`].join('\n')).catch(() => {});
    res.send(page('Rider Submitted', `<section class="card"><h1>Rider Submitted</h1><p>GOVO team info receive koreche.</p><a class="btn" href="/rider">Add Another</a></section>`));
  } catch (e) { next(e); }
});

app.get('/admin', (req, res) => res.redirect(`/admin/os${getPin(req) ? `?pin=${encodeURIComponent(getPin(req))}` : ''}`));

app.get('/admin/os', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const pinParam = encodeURIComponent(pin);
    const [orders, merchants, riders, providers, serviceRequests, recentOrders, recentServiceRequests, recentMerchants, recentProviders] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int delivered FROM govo_orders`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved, COUNT(*) FILTER (WHERE COALESCE(is_verified,false)=true)::int verified, COUNT(*) FILTER (WHERE COALESCE(is_trusted,false)=true)::int trusted FROM govo_merchant_leads`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved FROM govo_rider_leads`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved, COUNT(*) FILTER (WHERE COALESCE(is_verified,false)=true)::int verified, COUNT(*) FILTER (WHERE COALESCE(is_trusted,false)=true)::int trusted, COUNT(*) FILTER (WHERE COALESCE(emergency_available,false)=true AND COALESCE(is_available,true)=true)::int emergency_available FROM govo_service_providers`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='completed')::int completed FROM govo_service_requests`),
      pool.query(`SELECT id, shop_name, customer_name, customer_phone, drop_location, COALESCE(status,'pending') AS status, created_at FROM govo_orders ORDER BY id DESC LIMIT 5`),
      pool.query(`SELECT id, provider_name, service_type, customer_name, customer_phone, COALESCE(status,'pending') AS status, created_at FROM govo_service_requests ORDER BY id DESC LIMIT 5`),
      pool.query(`SELECT id, shop_name, owner_name, phone, category, COALESCE(status,'pending') AS status, created_at FROM govo_merchant_leads ORDER BY id DESC LIMIT 5`),
      pool.query(`SELECT id, provider_name, phone, service_type, area, COALESCE(status,'pending') AS status, created_at FROM govo_service_providers ORDER BY id DESC LIMIT 5`),
    ]);
    const o = orders.rows[0] || {};
    const m = merchants.rows[0] || {};
    const r = riders.rows[0] || {};
    const p = providers.rows[0] || {};
    const sr = serviceRequests.rows[0] || {};
    const stat = (label, value, hint) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div><p>${esc(hint || '')}</p></div>`;
    const action = (label, href) => `<a class="btn secondary" href="${href}">${esc(label)}</a>`;
    const alert = (label, count, href) => `<a class="card" href="${href}" style="text-decoration:none"><div class="actions" style="justify-content:space-between"><h2>${esc(label)}</h2>${badge(count ? 'pending' : 'clear')}</div><p><b>${esc(count || 0)}</b> waiting for action</p></a>`;
    const recentSection = (title, rows, render) => `<section class="card"><h2>${esc(title)}</h2><div class="cards compact">${rows.length ? rows.map(render).join('') : '<div class="card"><p>No recent activity</p></div>'}</div></section>`;
    const recentCard = (title, status, details, href) => `<a class="card" href="${href}" style="text-decoration:none"><div class="actions" style="justify-content:space-between"><h2>${esc(title)}</h2>${badge(status)}</div><p>${esc(details)}</p></a>`;
    res.send(page('Admin OS', `
      <section class="card hero"><h1>GOVO Admin OS</h1><p>Super App Control Center. Review approvals, live demand, and recent business activity from one screen.</p><div class="toolbar"><a class="btn" href="/admin/os?pin=${pinParam}">Refresh</a><a class="btn secondary" href="/">Main Website</a></div></section>
      <section class="grid">
        ${stat('Total Orders', o.total, 'All customer orders')}
        ${stat('Pending Orders', o.pending, 'Need admin or merchant action')}
        ${stat('Delivered Orders', o.delivered, 'Completed delivery orders')}
        ${stat('Total Merchants', m.total, 'Merchant registrations')}
        ${stat('Pending Merchants', m.pending, 'Waiting approval')}
        ${stat('Approved Merchants', m.approved, 'Visible in shops')}
        ${stat('Verified Merchants', m.verified, 'Admin verified shops')}
        ${stat('Trusted Merchants', m.trusted, 'High trust shops')}
        ${stat('Total Riders', r.total, 'Rider registrations')}
        ${stat('Pending Riders', r.pending, 'Waiting approval')}
        ${stat('Approved Riders', r.approved, 'Assignable riders')}
        ${stat('Total Service Providers', p.total, 'Provider registrations')}
        ${stat('Pending Providers', p.pending, 'Waiting approval')}
        ${stat('Approved Providers', p.approved, 'Visible in services')}
        ${stat('Verified Providers', p.verified, 'Admin verified providers')}
        ${stat('Trusted Providers', p.trusted, 'High trust providers')}
        ${stat('Emergency Providers', p.emergency_available, 'Available for urgent service')}
        ${stat('Total Service Requests', sr.total, 'Customer service requests')}
        ${stat('Pending Service Requests', sr.pending, 'Need provider/admin action')}
        ${stat('Completed Service Requests', sr.completed, 'Finished service jobs')}
      </section>
      <section class="card"><h2>Quick Actions</h2><div class="toolbar">
        ${action('Manage Orders', `/admin/orders?pin=${pinParam}`)}
        ${action('Manage Merchants', `/admin/leads?pin=${pinParam}`)}
        ${action('Manage Riders', `/admin/riders?pin=${pinParam}`)}
        ${action('Manage Providers', `/admin/providers?pin=${pinParam}`)}
        ${action('Manage Service Requests', `/admin/service-requests?pin=${pinParam}`)}
        ${action('View Shops', '/shops')}
        ${action('View Services', '/services')}
        ${action('Track Order', '/track')}
        ${action('Main Website', '/')}
      </div></section>
      <section class="card"><h2>Alerts</h2><div class="cards compact">
        ${alert('Pending merchant approvals', m.pending, `/admin/leads?pin=${pinParam}&status=pending`)}
        ${alert('Pending rider approvals', r.pending, `/admin/riders?pin=${pinParam}&status=pending`)}
        ${alert('Pending provider approvals', p.pending, `/admin/providers?pin=${pinParam}&status=pending`)}
        ${alert('Pending service requests', sr.pending, `/admin/service-requests?pin=${pinParam}&status=pending`)}
        ${alert('Pending orders', o.pending, `/admin/orders?pin=${pinParam}&status=pending`)}
      </div></section>
      <section class="grid two">
        ${recentSection('Last 5 Orders', recentOrders.rows, (x) => recentCard(`#${x.id} ${x.shop_name || 'Order'}`, x.status, `${x.customer_name || 'Customer'} - ${x.customer_phone || 'No phone'} - ${x.drop_location || 'No location'} - ${bdTime(x.created_at)}`, `/admin/orders?pin=${pinParam}&q=${encodeURIComponent(x.id)}`))}
        ${recentSection('Last 5 Service Requests', recentServiceRequests.rows, (x) => recentCard(`#${x.id} ${x.service_type || 'Service'}`, x.status, `${x.customer_name || 'Customer'} - ${x.customer_phone || 'No phone'} - ${x.provider_name || 'Provider'} - ${bdTime(x.created_at)}`, `/admin/service-requests?pin=${pinParam}&q=${encodeURIComponent(x.id)}`))}
        ${recentSection('Last 5 Merchant Leads', recentMerchants.rows, (x) => recentCard(`#${x.id} ${x.shop_name || 'Merchant'}`, x.status, `${x.owner_name || 'Owner'} - ${x.phone || 'No phone'} - ${x.category || 'No category'} - ${bdTime(x.created_at)}`, `/admin/leads?pin=${pinParam}&q=${encodeURIComponent(x.phone || x.shop_name || x.id)}`))}
        ${recentSection('Last 5 Provider Leads', recentProviders.rows, (x) => recentCard(`#${x.id} ${x.provider_name || 'Provider'}`, x.status, `${x.phone || 'No phone'} - ${x.service_type || 'No service'} - ${x.area || 'No area'} - ${bdTime(x.created_at)}`, `/admin/providers?pin=${pinParam}&q=${encodeURIComponent(x.phone || x.provider_name || x.id)}`))}
      </section>
    `, 'admin'));
  } catch (e) { next(e); }
});

app.get('/admin/leads', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { params.push(status); where.push(`COALESCE(status,'pending')=$${params.length}`); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(shop_name,'') || ' ' || COALESCE(owner_name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(category,'') || ' ' || COALESCE(products,'')) LIKE $${params.length}`); }
    const merchants = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, delivery_needed, COALESCE(status,'pending') AS status, admin_note, shop_description, shop_address, products, image_url, COALESCE(is_verified,false) AS is_verified, COALESCE(is_trusted,false) AS is_trusted, COALESCE(is_available,true) AS is_available, COALESCE(emergency_available,false) AS emergency_available, COALESCE(rating_avg,0) AS rating_avg, COALESCE(rating_count,0) AS rating_count, created_at FROM govo_merchant_leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int rejected FROM govo_merchant_leads`);
    const cards = merchants.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>${esc(x.shop_name || 'Unnamed Shop')}</h2>${badge(x.status)}</div>${trustBadges(x)}<div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name)}</span></div><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div><div><b>Category</b><span>${esc(x.category)}</span></div><div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/admin/merchant/status"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminTrustControls('merchant', x, pin)}<div class="actions"><a class="btn secondary" href="/shop/${encodeURIComponent(x.id)}">View Shop</a><a class="btn secondary" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || '')}">Dashboard</a><a class="btn secondary" href="/merchant/products?phone=${encodeURIComponent(x.phone || '')}">Products</a></div></div>`).join('');
    res.send(page('Admin Merchants', `${statCards(counts.rows[0] || {})}<section class="card"><h1>Admin Merchants</h1><form class="filters" method="GET" action="/admin/leads"><input type="hidden" name="pin" value="${esc(pin)}"><input name="q" value="${esc(q)}" placeholder="Search merchants"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a><a class="btn secondary" href="/admin/riders?pin=${encodeURIComponent(pin)}">Riders</a><a class="btn secondary" href="/admin/orders?pin=${encodeURIComponent(pin)}">Orders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No merchant found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/merchant/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const id = String(req.body.id || req.body.lead_id || req.body.merchant_id || '').trim();
    let status = String(req.body.status || req.body.action || 'pending').trim().toLowerCase();
    if (status === 'approve') status = 'approved';
    if (status === 'reject') status = 'rejected';
    if (!['approved', 'rejected', 'pending'].includes(status)) status = 'pending';
    const r = await pool.query(`UPDATE govo_merchant_leads SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING id, shop_name, owner_name, phone, category, location, status, admin_note`, [status, String(req.body.admin_note || ''), id]);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Merchant Status Updated', '', `Merchant ID: #${x.id}`, `Shop: ${x.shop_name || ''}`, `Owner: ${x.owner_name || ''}`, `Phone: ${x.phone || ''}`, `Category: ${x.category || ''}`, `Location: ${x.location || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/leads?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

app.get('/admin/riders', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { params.push(status); where.push(`COALESCE(status,'pending')=$${params.length}`); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(rider_name,'') || ' ' || COALESCE(name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(vehicle_type,'')) LIKE $${params.length}`); }
    const riders = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, location, vehicle_type, experience, COALESCE(status,'pending') AS status, admin_note, created_at FROM govo_rider_leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='rejected')::int rejected FROM govo_rider_leads`);
    const cards = riders.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>${esc(x.rider_name || 'Unnamed Rider')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>Location</b><span>${esc(x.location)}</span></div><div><b>Vehicle</b><span>${esc(x.vehicle_type)}</span></div><div><b>Experience</b><span>${esc(x.experience)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div><form method="POST" action="/admin/rider/status"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form></div>`).join('');
    res.send(page('Admin Riders', `${statCards(counts.rows[0] || {})}<section class="card"><h1>Admin Riders</h1><form class="filters" method="GET" action="/admin/riders"><input type="hidden" name="pin" value="${esc(pin)}"><input name="q" value="${esc(q)}" placeholder="Search riders"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a><a class="btn secondary" href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchants</a><a class="btn secondary" href="/admin/orders?pin=${encodeURIComponent(pin)}">Orders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No rider found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});


app.post('/admin/merchant/trust', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const field = String(req.body.field || '').trim();
    if (!['is_verified', 'is_trusted', 'is_available', 'emergency_available'].includes(field)) return res.status(400).send(page('Invalid Trust Field', '<section class="card"><h1>Invalid Trust Field</h1></section>', 'admin'));
    const value = boolish(req.body.value);
    const r = await pool.query(`UPDATE govo_merchant_leads SET ${field}=$1, updated_at=NOW() WHERE id=$2 RETURNING id, shop_name, phone, is_verified, is_trusted, is_available, emergency_available`, [value, req.body.id || '']);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Merchant Trust Updated', '', `Merchant ID: #${x.id}`, `Shop: ${x.shop_name || ''}`, `Phone: ${x.phone || ''}`, `Verified: ${x.is_verified}`, `Trusted: ${x.is_trusted}`, `Available: ${x.is_available}`, `Emergency: ${x.emergency_available}`].join('\n'));
    }
    res.redirect(`/admin/leads?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

app.post('/admin/rider/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    let status = String(req.body.status || 'pending').trim().toLowerCase();
    if (status === 'approve') status = 'approved';
    if (status === 'reject') status = 'rejected';
    if (!['approved', 'rejected', 'pending'].includes(status)) status = 'pending';
    const r = await pool.query(`UPDATE govo_rider_leads SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING id, COALESCE(rider_name,name) AS rider_name, phone, vehicle_type, location, status, admin_note`, [status, String(req.body.admin_note || ''), String(req.body.id || '')]);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Rider Status Updated', '', `Rider ID: #${x.id}`, `Name: ${x.rider_name || ''}`, `Phone: ${x.phone || ''}`, `Vehicle: ${x.vehicle_type || ''}`, `Location: ${x.location || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/riders?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

app.get('/admin/orders', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { params.push(status); where.push(`COALESCE(status,'pending')=$${params.length}`); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(shop_name,'') || ' ' || COALESCE(merchant_phone,'') || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(customer_phone,'') || ' ' || COALESCE(drop_location,'') || ' ' || COALESCE(item_details,'') || ' ' || COALESCE(rider_name,'')) LIKE $${params.length}`); }
    const [orders, riders, counts] = await Promise.all([
      pool.query(`SELECT id, shop_name, merchant_phone, customer_name, customer_phone, pickup_location, drop_location, item_details, note, COALESCE(status,'pending') AS status, admin_note, merchant_note, rider_id, rider_name, rider_phone, created_at, updated_at FROM govo_orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params),
      pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone FROM govo_rider_leads WHERE COALESCE(status,'pending')='approved' ORDER BY id DESC LIMIT 100`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int delivered FROM govo_orders`),
    ]);
    const riderOptions = riders.rows.map((r) => `<option value="${esc(r.id)}">${esc(r.rider_name || '')} - ${esc(r.phone || '')}</option>`).join('');
    const cards = orders.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.shop_name || 'GOVO Order')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Merchant</b><span>${esc(x.shop_name)}<br>${esc(x.merchant_phone)}</span></div><div><b>Pickup</b><span>${esc(x.pickup_location)}</span></div><div><b>Drop</b><span>${esc(x.drop_location)}</span></div><div><b>Item</b><span>${esc(x.item_details)}</span></div><div><b>Rider</b><span>${esc(x.rider_name || 'Not assigned')}<br>${esc(x.rider_phone || '')}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div><form method="POST" action="/admin/order/assign"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="order_id" value="${esc(x.id)}"><select name="rider_id" required><option value="">Select Rider</option>${riderOptions}</select><button>Assign Rider</button></form><form method="POST" action="/admin/order/status"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="accepted">Accept</button><button class="reject" name="status" value="rejected">Reject</button><button name="status" value="delivered">Delivered</button></div></form></div>`).join('');
    const c = counts.rows[0] || {};
    res.send(page('Admin Orders', `<section class="grid"><div class="stat"><div class="label">Total</div><div class="value">${esc(c.total || 0)}</div></div><div class="stat"><div class="label">Pending</div><div class="value">${esc(c.pending || 0)}</div></div><div class="stat"><div class="label">Assigned</div><div class="value">${esc(c.assigned || 0)}</div></div><div class="stat"><div class="label">Delivered</div><div class="value">${esc(c.delivered || 0)}</div></div></section><section class="card"><h1>Admin Orders</h1><form class="filters" method="GET" action="/admin/orders"><input type="hidden" name="pin" value="${esc(pin)}"><input name="q" value="${esc(q)}" placeholder="Search orders"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="accepted" ${status === 'accepted' ? 'selected' : ''}>Accepted</option><option value="assigned" ${status === 'assigned' ? 'selected' : ''}>Assigned</option><option value="picked_up" ${status === 'picked_up' ? 'selected' : ''}>Picked Up</option><option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Delivered</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a><a class="btn secondary" href="/admin/leads?pin=${encodeURIComponent(pin)}">Merchants</a><a class="btn secondary" href="/admin/riders?pin=${encodeURIComponent(pin)}">Riders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No orders found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/order/assign', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone FROM govo_rider_leads WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [String(req.body.rider_id || '')]);
    if (!rider.rows.length) return res.status(404).send(page('Rider Not Found', `<section class="card"><h1>Rider Not Found</h1><a class="btn" href="/admin/orders?pin=${encodeURIComponent(pin)}">Back Orders</a></section>`));
    const rd = rider.rows[0];
    const order = await pool.query(`UPDATE govo_orders SET rider_id=$1, rider_name=$2, rider_phone=$3, status='assigned', updated_at=NOW() WHERE id=$4 RETURNING *`, [rd.id, rd.rider_name, rd.phone, String(req.body.order_id || '')]);
    if (order.rows.length) {
      const x = order.rows[0];
      await sendTelegram(['GOVO Order Assigned', '', `Order ID: #${x.id}`, `Rider: ${rd.rider_name || ''}`, `Rider Phone: ${rd.phone || ''}`, `Shop: ${x.shop_name || ''}`, `Customer: ${x.customer_name || ''}`, `Drop: ${x.drop_location || ''}`, `Item: ${x.item_details || ''}`].join('\n'));
    }
    res.redirect(`/admin/orders?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

app.post('/admin/order/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const allowed = ['pending', 'accepted', 'assigned', 'picked_up', 'delivered', 'rejected', 'failed', 'merchant_confirmed', 'preparing', 'ready'];
    let status = String(req.body.status || 'pending').trim().toLowerCase();
    if (!allowed.includes(status)) status = 'pending';
    const r = await pool.query(`UPDATE govo_orders SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, String(req.body.admin_note || ''), String(req.body.id || '')]);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Order Status Updated', '', `Order ID: #${x.id}`, `Status: ${String(x.status || '').toUpperCase()}`, `Rider: ${x.rider_name || 'Not assigned'}`, `Shop: ${x.shop_name || ''}`, `Customer: ${x.customer_name || ''}`, `Drop: ${x.drop_location || ''}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/orders?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

const superAppCategories = [
  { slug: 'food', icon: '🍽️', title: 'Food / Restaurant', desc: 'Meals, snacks, cafes and local restaurants.', keywords: ['food', 'restaurant', 'cafe', 'hotel', 'kitchen', 'burger', 'pizza', 'biryani', 'fast food'] },
  { slug: 'grocery', icon: '🛒', title: 'Grocery', desc: 'Daily bazar, essentials and household items.', keywords: ['grocery', 'bazar', 'super shop', 'supershop', 'daily', 'essential'] },
  { slug: 'pharmacy', icon: '💊', title: 'Medicine / Pharmacy', desc: 'Medicine, pharmacy and health essentials.', keywords: ['medicine', 'pharmacy', 'pharma', 'drug', 'health'] },
  { slug: 'electronics', icon: '📱', title: 'Electronics / Mobile', desc: 'Mobile, accessories, gadgets and electronics.', keywords: ['electronics', 'mobile', 'phone', 'gadget', 'accessories', 'computer'] },
  { slug: 'fashion', icon: '👕', title: 'Fashion', desc: 'Clothing, shoes, cosmetics and lifestyle.', keywords: ['fashion', 'clothing', 'cloth', 'dress', 'shoes', 'cosmetic', 'beauty'] },
  { slug: 'agriculture', icon: '🌾', title: 'Agriculture', desc: 'Seeds, fertilizer, equipment and agro services.', keywords: ['agriculture', 'agro', 'seed', 'fertilizer', 'farm', 'krishi'] },
  { slug: 'home-service', icon: '🏠', title: 'Home Service', desc: 'Cleaning, repair, shifting and home support.', keywords: ['home service', 'home', 'cleaning', 'repair', 'shifting', 'service provider'] },
  { slug: 'technician', icon: '🛠️', title: 'Technician', desc: 'Electrician, plumber, AC, appliance and repair experts.', keywords: ['technician', 'electrician', 'plumber', 'mechanic', 'repair', 'ac', 'fridge'] },
  { slug: 'doctor', icon: '🩺', title: 'Doctor Appointment', desc: 'Doctors, clinics, diagnostics and appointments.', keywords: ['doctor', 'clinic', 'hospital', 'diagnostic', 'appointment', 'medical'] },
  { slug: 'courier', icon: '📦', title: 'Courier / Delivery', desc: 'Parcel, delivery and local courier services.', keywords: ['courier', 'delivery', 'parcel', 'logistics'] },
  { slug: 'transport', icon: '🚗', title: 'Transport', desc: 'Ride, rental, moving and transport support.', keywords: ['transport', 'car', 'bike', 'ride', 'rental', 'truck', 'pickup'] },
  { slug: 'house-rent', icon: '🏘️', title: 'House Rent', desc: 'House, flat, room and property rent listings.', keywords: ['house rent', 'rent', 'flat', 'room', 'property', 'to-let', 'tolet'] },
  { slug: 'other-services', icon: '✨', title: 'Other Services', desc: 'Everything else available through GOVO partners.', keywords: ['other', 'service', 'services', 'misc'] },
];

function merchantSearchText(x) {
  return [x.shop_name, x.owner_name, x.phone, x.whatsapp, x.location, x.shop_address, x.category, x.delivery_needed, x.shop_description, x.products, x.product_search].join(' ').toLowerCase();
}

function categoryForSlug(slug) {
  return superAppCategories.find((c) => c.slug === slug) || null;
}

function merchantMatchesCategory(x, cat) {
  if (!cat) return false;
  const text = merchantSearchText(x);
  return cat.keywords.some((k) => text.includes(k.toLowerCase()));
}

function merchantCard(x) {
  return `<div class="card">${listingImage(x.image_url, x.shop_name)}<div class="actions" style="justify-content:space-between"><h2>${esc(x.shop_name || '')}</h2><span class="pill">${esc(x.category || 'Service')}</span></div>${trustBadges(x)}<div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name)}</span></div><div><b>Phone</b><span>${esc(x.whatsapp || x.phone)}</span></div><div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div><div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div><div><b>About</b><span>${esc(x.shop_description || 'Details coming soon')}</span></div><div><b>Products</b><span>${esc(x.products || 'Not added yet')}</span></div></div><div class="actions"><a class="btn" href="/shop/${encodeURIComponent(x.id)}">View</a><a class="btn secondary" href="/order?shop=${encodeURIComponent(x.shop_name || '')}">Order / Book</a><a class="btn secondary" href="tel:${esc(x.whatsapp || x.phone || '')}">Call</a></div></div>`;
}

async function approvedMerchants() {
  return pool.query(`
    SELECT l.id, l.shop_name, l.owner_name, l.phone, l.whatsapp, l.location, l.category, l.delivery_needed,
           COALESCE(l.status,'pending') AS status, l.shop_description, l.shop_address, l.products, l.image_url,
           COALESCE(l.is_verified,false) AS is_verified, COALESCE(l.is_trusted,false) AS is_trusted, COALESCE(l.is_available,true) AS is_available,
           COALESCE(l.emergency_available,false) AS emergency_available, COALESCE(l.rating_avg,0) AS rating_avg, COALESCE(l.rating_count,0) AS rating_count, l.created_at,
           COALESCE(string_agg(COALESCE(p.product_name,'') || ' ' || COALESCE(p.category,'') || ' ' || COALESCE(p.description,''), ' '), '') AS product_search
    FROM govo_merchant_leads l
    LEFT JOIN govo_shop_products p ON (p.merchant_lead_id=l.id OR p.merchant_phone=l.phone) AND COALESCE(p.is_deleted,false)=false
    WHERE COALESCE(l.status,'pending')='approved'
    GROUP BY l.id, l.shop_name, l.owner_name, l.phone, l.whatsapp, l.location, l.category, l.delivery_needed, l.status, l.shop_description, l.shop_address, l.products, l.image_url, l.is_verified, l.is_trusted, l.is_available, l.emergency_available, l.rating_avg, l.rating_count, l.created_at
    ORDER BY l.id DESC
    LIMIT 500
  `);
}

app.get('/shops', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedMerchants();
    const rows = q ? all.rows.filter((x) => merchantSearchText(x).includes(q)) : all.rows.slice(0, 24);
    const categoryCards = superAppCategories.map((cat) => {
      const count = all.rows.filter((x) => merchantMatchesCategory(x, cat)).length;
      return `<div class="card" style="padding:15px"><div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between"><div><div style="font-size:30px;line-height:1">${cat.icon}</div><h2 style="font-size:21px;margin:10px 0 6px">${esc(cat.title)}</h2></div><span class="pill">${count}</span></div><p style="color:var(--muted);min-height:42px">${esc(cat.desc)}</p><a class="btn" href="/category/${encodeURIComponent(cat.slug)}">View</a></div>`;
    }).join('');
    const cards = rows.map(merchantCard).join('');
    res.send(page('GOVO Super App', `
      <section class="card" style="background:linear-gradient(180deg,#102016,#111827)">
        <span class="pill">GOVO Super App</span>
        <h1>Find shops, services, delivery and local help</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">Browse approved GOVO partners by category, search local products and services, then order or book directly.</p>
        <form method="GET" action="/shops" style="margin-top:14px">
          <input name="q" value="${esc(q)}" placeholder="Search food, medicine, phone, technician, location, shop name">
          <button>Search GOVO</button>
        </form>
      </section>
      <section class="card">
        <h2>Explore Categories</h2>
        <div class="item-grid">${categoryCards}</div>
      </section>
      <section class="card">
        <div class="actions" style="justify-content:space-between"><h2>${q ? 'Search Results' : 'Featured Shops & Services'}</h2><span class="pill">${rows.length} showing</span></div>
      </section>
      <section class="cards">${cards || '<div class="card"><h2>No approved shop or service found</h2><p>Try another search or category.</p></div>'}</section>
    `, 'shops'));
  } catch (e) { next(e); }
});

app.get('/category/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const cat = categoryForSlug(slug);
    if (!cat) return res.status(404).send(page('Category Not Found', `<section class="card"><h1>Category Not Found</h1><p>This GOVO category is not available.</p><a class="btn" href="/shops">Back to Super App</a></section>`, 'shops'));
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedMerchants();
    let rows = all.rows.filter((x) => merchantMatchesCategory(x, cat));
    if (q) rows = rows.filter((x) => merchantSearchText(x).includes(q));
    const cards = rows.map(merchantCard).join('');
    res.send(page(cat.title, `
      <section class="card" style="background:linear-gradient(180deg,#102016,#111827)">
        <a class="btn secondary" href="/shops">Back to Super App</a>
        <div style="font-size:38px;margin-top:14px">${cat.icon}</div>
        <h1>${esc(cat.title)}</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">${esc(cat.desc)}</p>
        <form method="GET" action="/category/${encodeURIComponent(cat.slug)}" style="margin-top:14px">
          <input name="q" value="${esc(q)}" placeholder="Search within ${esc(cat.title)} by name, product, location, phone">
          <button>Search Category</button>
        </form>
      </section>
      <section class="card"><div class="actions" style="justify-content:space-between"><h2>Approved ${esc(cat.title)}</h2><span class="pill">${rows.length}</span></div></section>
      <section class="cards">${cards || '<div class="card"><h2>No approved provider found</h2><p>Try another search or check back later.</p></div>'}</section>
    `, 'shops'));
  } catch (e) { next(e); }
});

app.get('/shop/:id', async (req, res, next) => {
  try {
    const shop = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, delivery_needed, COALESCE(status,'pending') AS status, shop_description, shop_address, products, image_url, COALESCE(is_verified,false) AS is_verified, COALESCE(is_trusted,false) AS is_trusted, COALESCE(is_available,true) AS is_available, COALESCE(emergency_available,false) AS emergency_available, COALESCE(rating_avg,0) AS rating_avg, COALESCE(rating_count,0) AS rating_count, created_at FROM govo_merchant_leads WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [req.params.id]);
    const x = shop.rows[0];
    if (!x) return res.status(404).send(page('Shop Not Found', '<section class="card"><h1>Shop Not Found</h1><p>This shop is not approved or not found.</p></section>'));
    const products = await pool.query(`SELECT * FROM govo_shop_products WHERE (merchant_lead_id=$1 OR merchant_phone=$2) AND COALESCE(is_available,true)=true AND COALESCE(is_deleted,false)=false ORDER BY category NULLS LAST, id DESC LIMIT 120`, [x.id, x.phone]);
    const productHtml = products.rows.map((p) => {
      const itemValue = `${p.product_name || 'Product'}${p.price ? ` - ${p.price}` : ''}`;
      return `<div class="card" style="padding:14px;margin:0"><div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between"><div style="min-width:0"><span class="pill">${esc(p.category || 'Menu')}</span><h2 style="font-size:22px;margin-top:10px">${esc(p.product_name || 'Product')}</h2><p style="font-weight:1000;color:#bbf7d0;margin:6px 0">${esc(p.price || '')}</p></div>${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.product_name || 'Product')}" style="width:86px;height:86px;object-fit:cover;border-radius:14px;border:1px solid rgba(34,197,94,.45)">` : ''}</div><p>${esc(p.description || '')}</p><button type="button" onclick="document.getElementById('item_details').value=${esc(JSON.stringify(itemValue))};document.getElementById('order_form').scrollIntoView({behavior:'smooth',block:'start'});">Add to Order</button></div>`;
    }).join('');
    res.send(page(x.shop_name || 'GOVO Shop', `
      <section class="card">
        <a class="btn secondary" href="/shops">Back Shops</a>
        <h1>${esc(x.shop_name || '')}</h1>
        ${listingImage(x.image_url, x.shop_name, true)}
        ${trustBadges(x)}
        <div class="detail-grid">
          <div><b>Owner</b><span>${esc(x.owner_name)}</span></div>
          <div><b>Phone</b><span>${esc(x.whatsapp || x.phone)}</span></div>
          <div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div>
          <div><b>Category</b><span>${esc(x.category)}</span></div>
          <div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div>
          <div><b>About</b><span>${esc(x.shop_description || '')}</span></div>
        </div>
      </section>
      <section class="card">
        <h2>Products / Menu</h2>
        <div class="item-grid">${productHtml || '<p>No available product added yet.</p>'}</div>
      </section>
      <section class="card" id="order_form">
        <h2>Order From This Shop</h2>
        <form method="POST" action="/order">
          <input type="hidden" name="shop_name" value="${esc(x.shop_name || '')}">
          <input type="hidden" name="merchant_phone" value="${esc(x.whatsapp || x.phone || '')}">
          <input type="hidden" name="pickup_location" value="${esc(x.shop_address || x.location || x.shop_name || '')}">
          <label>Your Name</label><input name="customer_name" required>
          <label>Your Phone</label><input name="customer_phone" required>
          <label>Drop Location</label><input name="drop_location" required>
          <label>Product / Menu Details</label><textarea id="item_details" name="item_details" required placeholder="Tap Add to Order, or write item details"></textarea>
          <label>Note</label><textarea name="note"></textarea>
          <button>Submit Order</button>
        </form>
      </section>
    `, 'shops'));
  } catch (e) { next(e); }
});

app.all('/order', async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      const order = { shop_name: req.body.shop_name || '', merchant_phone: req.body.merchant_phone || '', customer_name: req.body.customer_name || '', customer_phone: req.body.customer_phone || '', pickup_location: req.body.pickup_location || '', drop_location: req.body.drop_location || '', item_details: req.body.item_details || '', note: req.body.note || '' };
      const r = await pool.query(`INSERT INTO govo_orders (shop_name, merchant_phone, customer_name, customer_phone, pickup_location, drop_location, item_details, note, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING id`, [order.shop_name, order.merchant_phone, order.customer_name, order.customer_phone, order.pickup_location, order.drop_location, order.item_details, order.note]);
      const id = r.rows[0].id;
      sendTelegram(['New GOVO Order', '', `Order ID: #${id}`, `Shop: ${order.shop_name || 'N/A'}`, `Merchant Phone: ${order.merchant_phone || 'N/A'}`, `Customer: ${order.customer_name || 'N/A'}`, `Customer Phone: ${order.customer_phone || 'N/A'}`, `Pickup: ${order.pickup_location || 'N/A'}`, `Drop: ${order.drop_location || 'N/A'}`, `Item: ${order.item_details || 'N/A'}`, `Note: ${order.note || 'N/A'}`].join('\n')).catch(() => {});
      return res.redirect(`/order/success?id=${encodeURIComponent(id)}`);
    }
    const shopName = String(req.query.shop || '');
    let merchantPhone = '';
    let pickup = '';
    if (shopName) {
      const r = await pool.query(`SELECT shop_name, phone, whatsapp, location, shop_address FROM govo_merchant_leads WHERE shop_name=$1 ORDER BY id DESC LIMIT 1`, [shopName]);
      if (r.rows.length) { merchantPhone = r.rows[0].whatsapp || r.rows[0].phone || ''; pickup = r.rows[0].shop_address || r.rows[0].location || ''; }
    }
    res.send(page('Delivery Book', `<section class="card"><h1>Delivery Book</h1><form method="POST" action="/order"><label>Shop Name</label><input name="shop_name" value="${esc(shopName)}" required><label>Merchant Phone</label><input name="merchant_phone" value="${esc(merchantPhone)}"><label>Customer Name</label><input name="customer_name" required><label>Customer Phone</label><input name="customer_phone" required><label>Pickup Location</label><input name="pickup_location" value="${esc(pickup)}" required><label>Drop Location</label><input name="drop_location" required><label>Product / Service Details</label><textarea name="item_details" required></textarea><label>Note</label><textarea name="note"></textarea><button>Submit Order</button></form></section>`));
  } catch (e) { next(e); }
});

app.get('/order/success', (req, res) => {
  const id = String(req.query.id || '');
  res.send(page('Order Submitted', `<section class="card"><h1>Order Submitted</h1><p>Your order has been received.</p><h2>Tracking ID: #${esc(id)}</h2><div class="actions"><a class="btn" href="/track?id=${encodeURIComponent(id)}">Track Order</a><a class="btn secondary" href="/shops">Back Shops</a></div></section>`));
});

app.get('/track', async (req, res, next) => {
  try {
    const id = String(req.query.id || '').trim();
    const phone = String(req.query.phone || '').trim();
    let result = '';
    if (id || phone) {
      let r;
      if (id && phone) r = await pool.query(`SELECT * FROM govo_orders WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 5`, [id, phone]);
      else if (id) r = await pool.query(`SELECT * FROM govo_orders WHERE id=$1 ORDER BY id DESC LIMIT 5`, [id]);
      else r = await pool.query(`SELECT * FROM govo_orders WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone]);
      result = r.rows.length ? r.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>Order #${esc(x.id)}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Shop</b><span>${esc(x.shop_name || 'GOVO Order')}</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Pickup</b><span>${esc(x.pickup_location)}</span></div><div><b>Drop</b><span>${esc(x.drop_location)}</span></div><div><b>Item</b><span>${esc(x.item_details)}</span></div><div><b>Rider</b><span>${esc(x.rider_name || 'Not assigned')}<br>${esc(x.rider_phone || '')}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Merchant Note</b><span>${esc(x.merchant_note || 'No note')}</span></div></div></div>`).join('') : '<div class="card"><h2>No Order Found</h2></div>';
    }
    res.send(page('Track Order', `<section class="card"><h1>Track Order</h1><form method="GET" action="/track"><label>Order ID</label><input name="id" value="${esc(id)}" placeholder="Example: 12"><label>Customer Phone</label><input name="phone" value="${esc(phone)}" placeholder="017xxxxxxxx"><button>Check Status</button></form></section>${result}`, 'track'));
  } catch (e) { next(e); }
});

async function approvedMerchantByPhone(phone) {
  const r = await pool.query(`SELECT * FROM govo_merchant_leads WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
  const lead = r.rows[0];
  return { lead, approved: !!lead && String(lead.status || 'pending').toLowerCase() === 'approved' };
}

app.get('/merchant/dashboard', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '').trim();
    if (!phone) return res.send(page('Merchant Dashboard', `<section class="card"><h1>Merchant Dashboard</h1><form method="GET" action="/merchant/dashboard"><label>Phone</label><input name="phone" required><button>Open Dashboard</button></form></section>`, 'merchant'));
    const check = await approvedMerchantByPhone(phone);
    if (!check.lead) return res.send(page('Merchant Dashboard', '<section class="card"><h1>No merchant found</h1><a class="btn" href="/merchant">Register Merchant</a></section>', 'merchant'));
    if (!check.approved) return res.send(page('Merchant Dashboard', `<section class="card"><h1>Merchant Pending</h1><p>Merchant status is ${esc(check.lead.status || 'pending')}.</p></section>`, 'merchant'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || check.lead.image_url || '').trim();
    if (imageUrl) await pool.query(`UPDATE govo_merchant_leads SET image_url=$1, shop_name=$2, owner_name=$3, location=$4, category=$5, shop_description=$6, whatsapp=$7, updated_at=NOW() WHERE id=$8`, [imageUrl, req.body.shop_name, req.body.owner_name, req.body.location, req.body.category, req.body.description, req.body.whatsapp, check.lead.id]);
    else await pool.query(`UPDATE govo_merchant_leads SET shop_name=$1, owner_name=$2, location=$3, category=$4, shop_description=$5, whatsapp=$6, updated_at=NOW() WHERE id=$7`, [req.body.shop_name, req.body.owner_name, req.body.location, req.body.category, req.body.description, req.body.whatsapp, check.lead.id]);
    const existingProfile = await pool.query(`SELECT id FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone]);
    if (!existingProfile.rows.length) {
      await pool.query(`INSERT INTO govo_merchant_profiles (merchant_lead_id, shop_name, owner_name, phone, location, category, delivery_needed, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'published')`, [check.lead.id, check.lead.shop_name, check.lead.owner_name, check.lead.phone, check.lead.location, check.lead.category, check.lead.delivery_needed]);
    }
    const prof = (await pool.query(`SELECT * FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone])).rows[0] || {};
    const items = await pool.query(`SELECT id, item_name, price, details FROM govo_shop_items WHERE merchant_phone=$1 AND COALESCE(is_active,true)=true ORDER BY id DESC LIMIT 50`, [phone]);
    const itemHtml = items.rows.map((i) => `<div class="item-box"><b>${esc(i.item_name || '')}</b><span>${esc(i.price || '')}</span><br><span>${esc(i.details || '')}</span><div class="actions"><a class="btn secondary" href="/merchant/item/${encodeURIComponent(i.id)}/delete?phone=${encodeURIComponent(phone)}">Remove</a></div></div>`).join('');
    res.send(page('Merchant Dashboard', `<section class="card"><h1>Merchant Dashboard</h1><p>Phone: ${esc(phone)}</p><form method="POST" action="/merchant/profile" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><label>Shop Name</label><input name="shop_name" value="${esc(prof.shop_name || check.lead.shop_name || '')}" required><label>Owner Name</label><input name="owner_name" value="${esc(prof.owner_name || check.lead.owner_name || '')}"><label>Location</label><input name="location" value="${esc(prof.location || check.lead.location || '')}"><label>Category</label><input name="category" value="${esc(prof.category || check.lead.category || '')}"><label>Opening Hours</label><input name="opening_hours" value="${esc(prof.opening_hours || '')}"><label>Delivery Area</label><input name="delivery_area" value="${esc(prof.delivery_area || '')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(prof.whatsapp || check.lead.whatsapp || '')}"><label>Description</label><textarea name="description">${esc(prof.description || check.lead.shop_description || '')}</textarea><label>Shop Image / Logo</label>${listingImage(check.lead.image_url || prof.logo_image, check.lead.shop_name)}<input type="file" name="shop_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(check.lead.image_url || prof.logo_image || '')}" placeholder="Optional existing image URL"><button>Save Shop Info</button></form></section><section class="card"><h2>Add Product / Service</h2><form method="POST" action="/merchant/item"><input type="hidden" name="phone" value="${esc(phone)}"><label>Item Name</label><input name="item_name" required><label>Price</label><input name="price"><label>Details</label><textarea name="details"></textarea><button>Add Item</button></form><h2>Current Items</h2><div class="item-grid">${itemHtml || '<p>No item added yet.</p>'}</div></section>`, 'merchant'));
  } catch (e) { next(e); }
});

app.post('/merchant/profile', imageUpload.single('shop_image'), async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const check = await approvedMerchantByPhone(phone);
    if (!check.approved) return res.status(403).send(page('Not Approved', '<section class="card"><h1>Not Approved</h1></section>'));
    const existingProfile = await pool.query(`SELECT id FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone]);
    if (existingProfile.rows.length) {
      await pool.query(`UPDATE govo_merchant_profiles SET merchant_lead_id=$1, shop_name=$2, owner_name=$3, location=$4, category=$5, description=$6, opening_hours=$7, delivery_area=$8, whatsapp=$9, logo_image=$10, status='published', updated_at=NOW() WHERE phone=$11`, [check.lead.id, req.body.shop_name, req.body.owner_name, req.body.location, req.body.category, req.body.description, req.body.opening_hours, req.body.delivery_area, req.body.whatsapp, imageUrl, phone]);
    } else {
      await pool.query(`INSERT INTO govo_merchant_profiles (merchant_lead_id, shop_name, owner_name, phone, location, category, description, opening_hours, delivery_area, whatsapp, logo_image, status, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',NOW())`, [check.lead.id, req.body.shop_name, req.body.owner_name, phone, req.body.location, req.body.category, req.body.description, req.body.opening_hours, req.body.delivery_area, req.body.whatsapp, imageUrl]);
    }
    res.redirect(`/merchant/dashboard?phone=${encodeURIComponent(phone)}`);
  } catch (e) { next(e); }
});

app.post('/merchant/item', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const check = await approvedMerchantByPhone(phone);
    if (!check.approved) return res.status(403).send(page('Not Approved', '<section class="card"><h1>Not Approved</h1></section>'));
    await pool.query(`INSERT INTO govo_shop_items (merchant_phone, item_name, price, details) VALUES ($1,$2,$3,$4)`, [phone, req.body.item_name, req.body.price, req.body.details]);
    res.redirect(`/merchant/dashboard?phone=${encodeURIComponent(phone)}`);
  } catch (e) { next(e); }
});

app.get('/merchant/item/:id/delete', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '').trim();
    await pool.query(`UPDATE govo_shop_items SET is_active=false WHERE id=$1 AND merchant_phone=$2`, [req.params.id, phone]);
    res.redirect(`/merchant/dashboard?phone=${encodeURIComponent(phone)}`);
  } catch (e) { next(e); }
});

app.all('/merchant/products', productUpload.single('product_image'), async (req, res, next) => {
  try {
    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    if (!phone) return res.send(page('Merchant Products', `<section class="card"><h1>Product / Menu Manager</h1><form method="GET" action="/merchant/products"><label>Merchant Phone</label><input name="phone" required><button>Open Product Manager</button></form></section>`, 'merchant'));
    const merchant = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, COALESCE(status,'pending') AS status FROM govo_merchant_leads WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!merchant.rows.length) return res.send(page('Merchant Not Found', '<section class="card"><h1>No Merchant Found</h1></section>', 'merchant'));
    const m = merchant.rows[0];
    const selectedFilter = String((req.body && req.body.filter) || (req.query && req.query.filter) || 'all').trim().toLowerCase();
    const redirect = () => res.redirect(`/merchant/products?phone=${encodeURIComponent(phone)}&filter=${encodeURIComponent(selectedFilter)}`);
    const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    if (req.method === 'POST' && req.body.action === 'add') {
      const imageUrl = uploadedImageUrl || String(req.body.image_url || '').trim();
      await pool.query(`INSERT INTO govo_shop_products (merchant_lead_id, shop_name, merchant_phone, product_name, price, category, description, image_url, is_available, is_deleted, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,false,NOW())`, [m.id, m.shop_name || '', m.phone || '', req.body.product_name || '', req.body.price || '', req.body.category || '', req.body.description || '', imageUrl]);
      return redirect();
    }
    if (req.method === 'POST' && req.body.action === 'edit') {
      const current = await pool.query(`SELECT image_url FROM govo_shop_products WHERE id=$1 AND merchant_phone=$2 AND COALESCE(is_deleted,false)=false LIMIT 1`, [req.body.id || '', phone]);
      const currentImageUrl = current.rows[0] ? String(current.rows[0].image_url || '') : '';
      const imageUrl = uploadedImageUrl || String(req.body.image_url || currentImageUrl || '').trim();
      await pool.query(`UPDATE govo_shop_products SET product_name=$1, price=$2, category=$3, description=$4, image_url=$5, shop_name=$6, merchant_lead_id=$7, updated_at=NOW() WHERE id=$8 AND merchant_phone=$9 AND COALESCE(is_deleted,false)=false`, [req.body.product_name || '', req.body.price || '', req.body.category || '', req.body.description || '', imageUrl, m.shop_name || '', m.id, req.body.id || '', phone]);
      return redirect();
    }
    if (req.method === 'POST' && req.body.action === 'toggle') {
      await pool.query(`UPDATE govo_shop_products SET is_available=NOT COALESCE(is_available,true), updated_at=NOW() WHERE id=$1 AND merchant_phone=$2 AND COALESCE(is_deleted,false)=false`, [req.body.id || '', phone]);
      return redirect();
    }
    if (req.method === 'POST' && req.body.action === 'delete') {
      await pool.query(`UPDATE govo_shop_products SET is_deleted=true, is_available=false, updated_at=NOW() WHERE id=$1 AND merchant_phone=$2`, [req.body.id || '', phone]);
      return redirect();
    }

    const filter = ['available', 'unavailable'].includes(selectedFilter) ? selectedFilter : 'all';
    const conditions = [`(merchant_lead_id=$1 OR merchant_phone=$2)`, `COALESCE(is_deleted,false)=false`];
    if (filter === 'available') conditions.push(`COALESCE(is_available,true)=true`);
    if (filter === 'unavailable') conditions.push(`COALESCE(is_available,true)=false`);
    const products = await pool.query(`SELECT * FROM govo_shop_products WHERE ${conditions.join(' AND ')} ORDER BY COALESCE(is_available,true) DESC, category NULLS LAST, id DESC LIMIT 200`, [m.id, phone]);
    const count = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(is_available,true)=true AND COALESCE(is_deleted,false)=false)::int available, COUNT(*) FILTER (WHERE COALESCE(is_available,true)=false AND COALESCE(is_deleted,false)=false)::int unavailable FROM govo_shop_products WHERE (merchant_lead_id=$1 OR merchant_phone=$2) AND COALESCE(is_deleted,false)=false`, [m.id, phone]);
    const c = count.rows[0] || {};
    const filterLink = (label, value) => `<a class="btn ${filter === value ? '' : 'secondary'}" href="/merchant/products?phone=${encodeURIComponent(phone)}&filter=${encodeURIComponent(value)}">${label}</a>`;
    const rows = products.rows.map((x) => `
      <div class="card" style="padding:14px">
        <div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start">
          <div style="min-width:0">
            <span class="pill">${esc(x.category || 'Menu')}</span>
            <h2 style="font-size:22px;margin-top:10px">${esc(x.product_name || '')}</h2>
            <p style="font-weight:1000;color:#bbf7d0;margin:6px 0">${esc(x.price || '')}</p>
          </div>
          ${x.image_url ? `<img src="${esc(x.image_url)}" alt="${esc(x.product_name || 'Product')}" style="width:82px;height:82px;object-fit:cover;border-radius:14px;border:1px solid rgba(34,197,94,.45)">` : ''}
        </div>
        <p>${esc(x.description || '')}</p>
        ${badge(x.is_available ? 'available' : 'unavailable')}
        <form method="POST" action="/merchant/products" enctype="multipart/form-data" style="margin-top:12px">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input type="hidden" name="filter" value="${esc(filter)}">
          <input type="hidden" name="id" value="${esc(x.id)}">
          <input type="hidden" name="action" value="edit">
          <label>Name</label><input name="product_name" value="${esc(x.product_name || '')}" required>
          <label>Price</label><input name="price" value="${esc(x.price || '')}">
          <label>Category</label><input name="category" value="${esc(x.category || '')}">
          <label>Description</label><textarea name="description">${esc(x.description || '')}</textarea>
          <label>Current Image URL</label><input name="image_url" value="${esc(x.image_url || '')}" placeholder="Existing URL kept if no upload"><label>Upload New Image</label><input type="file" name="product_image" accept="image/jpeg,image/png,image/webp,image/gif">
          <button>Save Product</button>
        </form>
        <div class="actions">
          <form method="POST" action="/merchant/products"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="filter" value="${esc(filter)}"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="action" value="toggle"><button class="secondary">${x.is_available ? 'Mark Unavailable' : 'Mark Available'}</button></form>
          <form method="POST" action="/merchant/products" onsubmit="return confirm('Hide this product from menu?')"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="filter" value="${esc(filter)}"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="action" value="delete"><button class="reject">Delete Safely</button></form>
        </div>
      </div>
    `).join('');
    res.send(page('Product / Menu Manager', `
      <section class="card">
        <h1>Product / Menu Manager</h1>
        <p>Shop: ${esc(m.shop_name || '')} | Showing: ${esc(filter)}</p>
        <div class="toolbar">
          ${filterLink(`All ${c.total || 0}`, 'all')}
          ${filterLink(`Available ${c.available || 0}`, 'available')}
          ${filterLink(`Unavailable ${c.unavailable || 0}`, 'unavailable')}
          <a class="btn secondary" href="/shop/${encodeURIComponent(m.id)}">View Shop</a>
        </div>
        <form method="POST" action="/merchant/products" enctype="multipart/form-data">
          <input type="hidden" name="phone" value="${esc(phone)}">
          <input type="hidden" name="filter" value="${esc(filter)}">
          <input type="hidden" name="action" value="add">
          <label>Product/Menu Name</label><input name="product_name" required>
          <label>Price</label><input name="price" placeholder="৳120 / Negotiable">
          <label>Category</label><input name="category" placeholder="Food / Grocery / Service">
          <label>Description</label><textarea name="description"></textarea>
          <label>Upload Image</label><input type="file" name="product_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Image URL</label><input name="image_url" placeholder="Optional legacy URL">
          <button>Add Product</button>
        </form>
      </section>
      <section class="cards">${rows || '<div class="card"><h2>No product found</h2></div>'}</section>
    `, 'merchant'));
  } catch (e) { next(e); }
});

app.all('/merchant/orders', async (req, res, next) => {
  try {
    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    if (!phone) return res.send(page('Merchant Orders', `<section class="card"><h1>Merchant Orders</h1><form method="GET" action="/merchant/orders"><label>Merchant Phone</label><input name="phone" required><button>Open Orders</button></form></section>`, 'merchant'));
    const merchant = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, COALESCE(status,'pending') AS status FROM govo_merchant_leads WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!merchant.rows.length) return res.send(page('Merchant Not Found', '<section class="card"><h1>Merchant Not Found</h1></section>', 'merchant'));
    const m = merchant.rows[0];
    if (req.method === 'POST') {
      const status = String(req.body.status || 'merchant_confirmed');
      const updated = await pool.query(`UPDATE govo_orders SET status=$1, merchant_note=$2, updated_at=NOW() WHERE id=$3 AND (merchant_phone=$4 OR merchant_phone=$5 OR shop_name=$6) RETURNING *`, [status, String(req.body.merchant_note || ''), String(req.body.id || ''), m.phone || '', m.whatsapp || '', m.shop_name || '']);
      if (updated.rows.length) {
        const x = updated.rows[0];
        sendTelegram(['GOVO Merchant Order Update', '', `Order ID: #${x.id}`, `Shop: ${x.shop_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Merchant Note: ${x.merchant_note || 'N/A'}`, `Customer: ${x.customer_name || ''}`, `Drop: ${x.drop_location || ''}`, `Item: ${x.item_details || ''}`].join('\n')).catch(() => {});
      }
      return res.redirect(`/merchant/orders?phone=${encodeURIComponent(phone)}`);
    }
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE merchant_phone=$1 OR merchant_phone=$2 OR shop_name=$3 ORDER BY id DESC LIMIT 100`, [m.phone || '', m.whatsapp || '', m.shop_name || '']);
    const cards = orders.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.customer_name || '')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.customer_phone)}</span></div><div><b>Drop</b><span>${esc(x.drop_location)}</span></div><div><b>Item</b><span>${esc(x.item_details)}</span></div><div><b>Rider</b><span>${esc(x.rider_name || 'Not assigned')}</span></div></div><form method="POST" action="/merchant/orders"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="merchant_note" placeholder="Merchant note"><div class="three"><button name="status" value="merchant_confirmed">Confirm</button><button name="status" value="preparing">Preparing</button><button name="status" value="ready">Ready</button></div></form></div>`).join('');
    res.send(page('Merchant Orders', `<section class="card"><h1>Merchant Orders</h1><p>Shop: ${esc(m.shop_name || '')}</p></section><section class="cards">${cards || '<div class="card"><h2>No orders found</h2></div>'}</section>`, 'merchant'));
  } catch (e) { next(e); }
});

app.all('/rider/dashboard', async (req, res, next) => {
  try {
    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    if (!phone) return res.send(page('Rider Dashboard', `<section class="card"><h1>Rider Dashboard</h1><form method="GET" action="/rider/dashboard"><label>Rider Phone</label><input name="phone" required><button>Open Dashboard</button></form></section>`, 'rider'));
    const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, location, vehicle_type, COALESCE(status,'pending') AS status FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!rider.rows.length) return res.send(page('Rider Not Found', '<section class="card"><h1>Rider Not Found</h1><a class="btn" href="/rider">Register Rider</a></section>', 'rider'));
    const rd = rider.rows[0];
    if (req.method === 'POST') {
      const status = String(req.body.status || 'picked_up');
      const updated = await pool.query(`UPDATE govo_orders SET status=$1, updated_at=NOW() WHERE id=$2 AND rider_phone=$3 RETURNING *`, [status, String(req.body.id || ''), phone]);
      if (updated.rows.length) {
        const x = updated.rows[0];
        sendTelegram(['GOVO Rider Update', '', `Order ID: #${x.id}`, `Status: ${String(x.status || '').toUpperCase()}`, `Rider: ${x.rider_name || ''}`, `Shop: ${x.shop_name || ''}`, `Customer: ${x.customer_name || ''}`, `Drop: ${x.drop_location || ''}`, `Item: ${x.item_details || ''}`].join('\n')).catch(() => {});
      }
      return res.redirect(`/rider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE rider_phone=$1 ORDER BY id DESC LIMIT 100`, [phone]);
    const cards = orders.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.shop_name || '')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Pickup</b><span>${esc(x.pickup_location)}</span></div><div><b>Drop</b><span>${esc(x.drop_location)}</span></div><div><b>Item</b><span>${esc(x.item_details)}</span></div></div><form method="POST" action="/rider/dashboard"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="id" value="${esc(x.id)}"><div class="three"><button name="status" value="picked_up">Picked Up</button><button name="status" value="delivered">Delivered</button><button class="reject" name="status" value="failed">Failed</button></div></form></div>`).join('');
    res.send(page('Rider Dashboard', `<section class="card"><h1>Rider Dashboard</h1><p>${esc(rd.rider_name || '')} - ${esc(rd.phone || '')}</p>${badge(rd.status)}</section><section class="cards">${cards || '<div class="card"><h2>No assigned orders found</h2></div>'}</section>`, 'rider'));
  } catch (e) { next(e); }
});

const serviceCategories = [
  { slug: 'electrician', icon: '⚡', title: 'Electrician', desc: 'Wiring, lights, fans and power repair.', keywords: ['electrician', 'electric', 'wiring', 'light', 'fan'] },
  { slug: 'plumber', icon: '🚰', title: 'Plumber', desc: 'Water line, pipe, bathroom and kitchen fixes.', keywords: ['plumber', 'pipe', 'water', 'bathroom', 'kitchen'] },
  { slug: 'ac-repair', icon: '❄️', title: 'AC Repair', desc: 'AC service, cooling, installation and maintenance.', keywords: ['ac', 'air conditioner', 'cooling', 'installation'] },
  { slug: 'mobile-repair', icon: '📱', title: 'Mobile Repair', desc: 'Phone, display, battery and software repair.', keywords: ['mobile', 'phone', 'display', 'battery', 'software'] },
  { slug: 'home-service', icon: '🏠', title: 'Home Service', desc: 'Cleaning, shifting, repair and home support.', keywords: ['home', 'cleaning', 'shifting', 'repair', 'service'] },
  { slug: 'doctor', icon: '🩺', title: 'Doctor', desc: 'Doctor appointment and healthcare support.', keywords: ['doctor', 'clinic', 'medical', 'health', 'appointment'] },
  { slug: 'agriculture', icon: '🌾', title: 'Agriculture', desc: 'Agro support, field service and farming help.', keywords: ['agriculture', 'agro', 'farm', 'seed', 'fertilizer'] },
  { slug: 'transport', icon: '🚗', title: 'Transport', desc: 'Ride, rental, pickup and local transport.', keywords: ['transport', 'ride', 'car', 'bike', 'pickup', 'truck'] },
  { slug: 'house-rent', icon: '🏘️', title: 'House Rent', desc: 'House, room, flat and property rent help.', keywords: ['house rent', 'rent', 'flat', 'room', 'property'] },
  { slug: 'other', icon: '✨', title: 'Other', desc: 'Other approved GOVO service providers.', keywords: ['other', 'service', 'misc'] },
];

function providerSearchText(x) {
  return [x.provider_name, x.phone, x.whatsapp, x.service_type, x.area, x.address, x.experience, x.description].join(' ').toLowerCase();
}

function serviceCategoryMatches(x, cat) {
  const text = providerSearchText(x);
  return cat.keywords.some((k) => text.includes(k.toLowerCase()));
}

function providerCard(x) {
  return `<div class="card">${listingImage(x.image_url, x.provider_name)}<div class="actions" style="justify-content:space-between"><h2>${esc(x.provider_name || '')}</h2><span class="pill">${esc(x.service_type || 'Service')}</span></div>${trustBadges(x)}<div class="detail-grid"><div><b>Phone</b><span>${esc(x.whatsapp || x.phone)}</span></div><div><b>Area</b><span>${esc(x.area)}</span></div><div><b>Address</b><span>${esc(x.address)}</span></div><div><b>Experience</b><span>${esc(x.experience)}</span></div><div><b>About</b><span>${esc(x.description || 'Details coming soon')}</span></div><div><b>Status</b><span>${badge(x.status)}</span></div></div><div class="actions"><a class="btn" href="/service/${encodeURIComponent(x.id)}">Request Service</a><a class="btn secondary" href="tel:${esc(x.whatsapp || x.phone || '')}">Call</a></div></div>`;
}

async function approvedProviders() {
  return pool.query(`SELECT * FROM govo_service_providers WHERE COALESCE(status,'pending')='approved' ORDER BY id DESC LIMIT 500`);
}

app.all('/provider', imageUpload.single('provider_image'), async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || '').trim();
      const r = await pool.query(`INSERT INTO govo_service_providers (provider_name, phone, whatsapp, service_type, area, address, experience, description, image_url, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',NOW(),NOW()) RETURNING *`, [req.body.provider_name || '', req.body.phone || '', req.body.whatsapp || '', req.body.service_type || '', req.body.area || '', req.body.address || '', req.body.experience || '', req.body.description || '', imageUrl]);
      const x = r.rows[0];
      sendTelegram(['New GOVO Service Provider', '', `Provider ID: #${x.id}`, `Name: ${x.provider_name || ''}`, `Phone: ${x.phone || ''}`, `WhatsApp: ${x.whatsapp || ''}`, `Type: ${x.service_type || ''}`, `Area: ${x.area || ''}`, `Address: ${x.address || ''}`].join('\n')).catch(() => {});
      return res.send(page('Provider Submitted', `<section class="card"><h1>Provider Submitted</h1><p>GOVO team review kore approve korbe.</p><div class="actions"><a class="btn" href="/provider">Add Another</a><a class="btn secondary" href="/services">Services</a></div></section>`, 'services'));
    }
    res.send(page('Provider Registration', `<section class="card"><h1>Service Provider Registration</h1><p style="color:var(--muted)">Join GOVO Super App as an approved service provider.</p><form method="POST" action="/provider" enctype="multipart/form-data"><label>Provider Name</label><input name="provider_name" required><label>Phone</label><input name="phone" required><label>WhatsApp</label><input name="whatsapp"><label>Service Type</label><input name="service_type" placeholder="Electrician / Doctor / Transport" required><label>Area</label><input name="area" required><label>Address</label><textarea name="address"></textarea><label>Experience</label><input name="experience" placeholder="5 years / 100+ jobs"><label>Description</label><textarea name="description"></textarea><label>Profile / Service Image</label><input type="file" name="provider_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" placeholder="Optional existing image URL"><button>Submit Provider</button></form></section>`, 'services'));
  } catch (e) { next(e); }
});

app.all('/provider/dashboard', imageUpload.single('provider_image'), async (req, res, next) => {
  try {
    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    if (!phone) return res.send(page('Provider Dashboard', `<section class="card"><h1>Provider Dashboard</h1><form method="GET" action="/provider/dashboard"><label>Provider Phone</label><input name="phone" required><button>Open Dashboard</button></form><div class="actions"><a class="btn secondary" href="/provider">Register Provider</a><a class="btn secondary" href="/services">Services</a></div></section>`, 'services'));
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!provider.rows.length) return res.send(page('Provider Not Found', `<section class="card"><h1>Provider Not Found</h1><a class="btn" href="/provider">Register Provider</a></section>`, 'services'));
    const p = provider.rows[0];
    if (req.method === 'POST' && req.body.action === 'profile') {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || p.image_url || '').trim();
      await pool.query(`UPDATE govo_service_providers SET provider_name=$1, whatsapp=$2, service_type=$3, area=$4, address=$5, experience=$6, description=$7, image_url=$8, updated_at=NOW() WHERE id=$9`, [req.body.provider_name || '', req.body.whatsapp || '', req.body.service_type || '', req.body.area || '', req.body.address || '', req.body.experience || '', req.body.description || '', imageUrl, p.id]);
      return res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    if (req.method === 'POST' && req.body.action === 'request_status') {
      const allowed = ['accepted', 'working', 'completed', 'rejected'];
      const status = allowed.includes(String(req.body.status || '').toLowerCase()) ? String(req.body.status).toLowerCase() : 'accepted';
      const updated = await pool.query(`UPDATE govo_service_requests SET status=$1, provider_note=$2, updated_at=NOW() WHERE id=$3 AND provider_id=$4 RETURNING *`, [status, req.body.provider_note || '', req.body.request_id || '', p.id]);
      if (updated.rows.length) {
        const x = updated.rows[0];
        sendTelegram(['GOVO Provider Request Update', '', `Request ID: #${x.id}`, `Provider: ${p.provider_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Customer: ${x.customer_name || ''}`, `Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`].join('\n')).catch(() => {});
      }
      return res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    const fresh = (await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1`, [p.id])).rows[0] || p;
    const requests = await pool.query(`SELECT * FROM govo_service_requests WHERE provider_id=$1 OR provider_phone=$2 ORDER BY id DESC LIMIT 100`, [fresh.id, fresh.phone || '']);
    const requestCards = requests.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.customer_name || '')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.customer_phone)}</span></div><div><b>Address</b><span>${esc(x.service_address)}</span></div><div><b>Problem</b><span>${esc(x.problem_details)}</span></div><div><b>Preferred</b><span>${esc(x.preferred_time)}</span></div><div><b>Note</b><span>${esc(x.note)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/provider/dashboard"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="action" value="request_status"><input type="hidden" name="request_id" value="${esc(x.id)}"><input name="provider_note" placeholder="Provider note"><div class="three"><button name="status" value="accepted">Accept</button><button name="status" value="working">Working</button><button name="status" value="completed">Complete</button></div><button class="reject" name="status" value="rejected">Reject</button></form></div>`).join('');
    res.send(page('Provider Dashboard', `<section class="card"><h1>Provider Dashboard</h1><p>${esc(fresh.provider_name || '')} | ${badge(fresh.status)}</p><form method="POST" action="/provider/dashboard" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="action" value="profile"><label>Provider Name</label><input name="provider_name" value="${esc(fresh.provider_name || '')}" required><label>WhatsApp</label><input name="whatsapp" value="${esc(fresh.whatsapp || '')}"><label>Service Type</label><input name="service_type" value="${esc(fresh.service_type || '')}" required><label>Area</label><input name="area" value="${esc(fresh.area || '')}" required><label>Address</label><textarea name="address">${esc(fresh.address || '')}</textarea><label>Experience</label><input name="experience" value="${esc(fresh.experience || '')}"><label>Description</label><textarea name="description">${esc(fresh.description || '')}</textarea><label>Profile / Service Image</label>${listingImage(fresh.image_url, fresh.provider_name)}<input type="file" name="provider_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(fresh.image_url || '')}"><button>Save Profile</button></form><div class="actions"><a class="btn secondary" href="/service/${encodeURIComponent(fresh.id)}">Public Page</a><a class="btn secondary" href="/services">Services</a></div></section><section class="card"><h2>Service Requests</h2></section><section class="cards">${requestCards || '<div class="card"><h2>No request yet</h2></div>'}</section>`, 'services'));
  } catch (e) { next(e); }
});

app.get('/services', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedProviders();
    const rows = q ? all.rows.filter((x) => providerSearchText(x).includes(q)) : all.rows.slice(0, 24);
    const categoryCards = serviceCategories.map((cat) => {
      const count = all.rows.filter((x) => serviceCategoryMatches(x, cat)).length;
      return `<div class="card" style="padding:15px"><div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between"><div><div style="font-size:30px;line-height:1">${cat.icon}</div><h2 style="font-size:21px;margin:10px 0 6px">${esc(cat.title)}</h2></div><span class="pill">${count}</span></div><p style="color:var(--muted);min-height:42px">${esc(cat.desc)}</p><a class="btn" href="/services?q=${encodeURIComponent(cat.title)}">View</a></div>`;
    }).join('');
    const cards = rows.map(providerCard).join('');
    res.send(page('GOVO Services', `<section class="card" style="background:linear-gradient(180deg,#102016,#111827)"><span class="pill">GOVO Services</span><h1>Book trusted local service providers</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Find approved providers for repair, health, agriculture, transport, rent and home service.</p><form method="GET" action="/services"><input name="q" value="${esc(q)}" placeholder="Search service, area, name, phone"><button>Search Services</button></form><div class="actions"><a class="btn secondary" href="/shops">Shops</a><a class="btn secondary" href="/track">Track</a><a class="btn secondary" href="/provider">Become Provider</a></div></section><section class="card"><h2>Service Categories</h2><div class="item-grid">${categoryCards}</div></section><section class="card"><div class="actions" style="justify-content:space-between"><h2>${q ? 'Search Results' : 'Featured Providers'}</h2><span class="pill">${rows.length} showing</span></div></section><section class="cards">${cards || '<div class="card"><h2>No approved provider found</h2></div>'}</section>`, 'services'));
  } catch (e) { next(e); }
});

app.get('/service/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [req.params.id]);
    const p = r.rows[0];
    if (!p) return res.status(404).send(page('Service Not Found', `<section class="card"><h1>Service Not Found</h1><p>This provider is not approved or not found.</p><a class="btn" href="/services">Back Services</a></section>`, 'services'));
    res.send(page(p.provider_name || 'GOVO Service', `<section class="card"><a class="btn secondary" href="/services">Back Services</a><h1>${esc(p.provider_name || '')}</h1>${listingImage(p.image_url, p.provider_name, true)}${trustBadges(p)}<div class="detail-grid"><div><b>Service</b><span>${esc(p.service_type)}</span></div><div><b>Phone</b><span>${esc(p.whatsapp || p.phone)}</span></div><div><b>Area</b><span>${esc(p.area)}</span></div><div><b>Address</b><span>${esc(p.address)}</span></div><div><b>Experience</b><span>${esc(p.experience)}</span></div><div><b>About</b><span>${esc(p.description)}</span></div></div></section><section class="card"><h2>Request Service</h2><form method="POST" action="/service/request"><input type="hidden" name="provider_id" value="${esc(p.id)}"><input type="hidden" name="service_type" value="${esc(p.service_type || '')}"><label>Your Name</label><input name="customer_name" required><label>Your Phone</label><input name="customer_phone" required><label>Service Address</label><textarea name="service_address" required></textarea><label>Problem Details</label><textarea name="problem_details" required></textarea><label>Preferred Time</label><input name="preferred_time" placeholder="Today 5 PM"><label>Note</label><textarea name="note"></textarea><button>Submit Request</button></form></section>`, 'services'));
  } catch (e) { next(e); }
});

app.post('/service/request', async (req, res, next) => {
  try {
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [req.body.provider_id || '']);
    const p = provider.rows[0];
    if (!p) return res.status(404).send(page('Provider Not Found', `<section class="card"><h1>Provider Not Found</h1><a class="btn" href="/services">Back Services</a></section>`, 'services'));
    const saved = await pool.query(`INSERT INTO govo_service_requests (provider_id, provider_name, provider_phone, service_type, customer_name, customer_phone, service_address, problem_details, preferred_time, note, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW(),NOW()) RETURNING *`, [p.id, p.provider_name || '', p.phone || '', req.body.service_type || p.service_type || '', req.body.customer_name || '', req.body.customer_phone || '', req.body.service_address || '', req.body.problem_details || '', req.body.preferred_time || '', req.body.note || '']);
    const x = saved.rows[0];
    sendTelegram(['New GOVO Service Request', '', `Request ID: #${x.id}`, `Provider: ${x.provider_name || ''}`, `Provider Phone: ${x.provider_phone || ''}`, `Service: ${x.service_type || ''}`, `Customer: ${x.customer_name || ''}`, `Customer Phone: ${x.customer_phone || ''}`, `Address: ${x.service_address || ''}`, `Problem: ${x.problem_details || ''}`, `Preferred: ${x.preferred_time || ''}`].join('\n')).catch(() => {});
    res.send(page('Service Request Submitted', `<section class="card"><h1>Request Submitted</h1><p>GOVO team and provider will review your request.</p><h2>Request ID: #${esc(x.id)}</h2><div class="actions"><a class="btn" href="/services">Services</a><a class="btn secondary" href="/shops">Shops</a><a class="btn secondary" href="/track">Track</a></div></section>`, 'services'));
  } catch (e) { next(e); }
});

app.get('/admin/providers', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    if (status !== 'all') { params.push(status); where.push(`COALESCE(status,'pending')=$${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(provider_name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(whatsapp,'') || ' ' || COALESCE(service_type,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`); }
    const providers = await pool.query(`SELECT * FROM govo_service_providers ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const cards = providers.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.provider_name || '')}</h2>${badge(x.status)}</div>${trustBadges(x)}<div class="detail-grid"><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>WhatsApp</b><span>${esc(x.whatsapp)}</span></div><div><b>Service</b><span>${esc(x.service_type)}</span></div><div><b>Area</b><span>${esc(x.area)}</span></div><div><b>Address</b><span>${esc(x.address)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/admin/provider/status"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminTrustControls('provider', x, pin)}<div class="actions"><a class="btn secondary" href="/provider/dashboard?phone=${encodeURIComponent(x.phone || '')}">Dashboard</a><a class="btn secondary" href="/service/${encodeURIComponent(x.id)}">Service Page</a></div></div>`).join('');
    res.send(page('Admin Providers', `<section class="card"><h1>Admin Providers</h1><form class="filters" method="GET" action="/admin/providers"><input type="hidden" name="pin" value="${esc(pin)}"><input name="q" value="${esc(q)}" placeholder="Search provider, phone, service, area"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a><a class="btn secondary" href="/admin/service-requests?pin=${encodeURIComponent(pin)}">Service Requests</a></div></section><section class="cards">${cards || '<div class="card"><h2>No provider found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/provider/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    let status = String(req.body.status || 'pending').trim().toLowerCase();
    if (!['approved', 'rejected', 'pending'].includes(status)) status = 'pending';
    const r = await pool.query(`UPDATE govo_service_providers SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, req.body.admin_note || '', req.body.id || '']);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Provider Status Updated', '', `Provider ID: #${x.id}`, `Name: ${x.provider_name || ''}`, `Phone: ${x.phone || ''}`, `Service: ${x.service_type || ''}`, `Area: ${x.area || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/providers?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});


app.post('/admin/provider/trust', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const field = String(req.body.field || '').trim();
    if (!['is_verified', 'is_trusted', 'is_available', 'emergency_available'].includes(field)) return res.status(400).send(page('Invalid Trust Field', '<section class="card"><h1>Invalid Trust Field</h1></section>', 'admin'));
    const value = boolish(req.body.value);
    const r = await pool.query(`UPDATE govo_service_providers SET ${field}=$1, updated_at=NOW() WHERE id=$2 RETURNING id, provider_name, phone, is_verified, is_trusted, is_available, emergency_available`, [value, req.body.id || '']);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Provider Trust Updated', '', `Provider ID: #${x.id}`, `Name: ${x.provider_name || ''}`, `Phone: ${x.phone || ''}`, `Verified: ${x.is_verified}`, `Trusted: ${x.is_trusted}`, `Available: ${x.is_available}`, `Emergency: ${x.emergency_available}`].join('\n'));
    }
    res.redirect(`/admin/providers?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

app.get('/admin/service-requests', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    if (status !== 'all') { params.push(status); where.push(`COALESCE(status,'pending')=$${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(provider_name,'') || ' ' || COALESCE(provider_phone,'') || ' ' || COALESCE(service_type,'') || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(customer_phone,'') || ' ' || COALESCE(service_address,'') || ' ' || COALESCE(problem_details,'')) LIKE $${params.length}`); }
    const requests = await pool.query(`SELECT * FROM govo_service_requests ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const cards = requests.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.service_type || '')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Provider</b><span>${esc(x.provider_name)}<br>${esc(x.provider_phone)}</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Address</b><span>${esc(x.service_address)}</span></div><div><b>Problem</b><span>${esc(x.problem_details)}</span></div><div><b>Preferred</b><span>${esc(x.preferred_time)}</span></div><div><b>Note</b><span>${esc(x.note)}</span></div></div><form method="POST" action="/admin/service-request/status"><input type="hidden" name="pin" value="${esc(pin)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="pending">Pending</button><button name="status" value="accepted">Accepted</button><button name="status" value="assigned">Assigned</button></div><div class="three"><button name="status" value="working">Working</button><button name="status" value="completed">Completed</button><button class="reject" name="status" value="rejected">Rejected</button></div></form></div>`).join('');
    res.send(page('Admin Service Requests', `<section class="card"><h1>Admin Service Requests</h1><form class="filters" method="GET" action="/admin/service-requests"><input type="hidden" name="pin" value="${esc(pin)}"><input name="q" value="${esc(q)}" placeholder="Search request, provider, customer, area"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="accepted" ${status === 'accepted' ? 'selected' : ''}>Accepted</option><option value="assigned" ${status === 'assigned' ? 'selected' : ''}>Assigned</option><option value="working" ${status === 'working' ? 'selected' : ''}>Working</option><option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os?pin=${encodeURIComponent(pin)}">Admin Home</a><a class="btn secondary" href="/admin/providers?pin=${encodeURIComponent(pin)}">Providers</a></div></section><section class="cards">${cards || '<div class="card"><h2>No service request found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/service-request/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const allowed = ['pending', 'accepted', 'assigned', 'working', 'completed', 'rejected'];
    let status = String(req.body.status || 'pending').trim().toLowerCase();
    if (!allowed.includes(status)) status = 'pending';
    const r = await pool.query(`UPDATE govo_service_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, req.body.admin_note || '', req.body.id || '']);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Service Request Status Updated', '', `Request ID: #${x.id}`, `Status: ${String(x.status || '').toUpperCase()}`, `Provider: ${x.provider_name || ''}`, `Customer: ${x.customer_name || ''}`, `Customer Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/service-requests?pin=${encodeURIComponent(pin)}`);
  } catch (e) { next(e); }
});

app.get('/dashboard/merchant', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '');
    let records = '';
    if (phone) {
      const r = await pool.query(`SELECT shop_name, COALESCE(status,'pending') AS status, created_at FROM govo_merchant_leads WHERE phone=$1 ORDER BY id DESC LIMIT 5`, [phone]);
      records = `<section class="card"><h2>Merchant Records</h2>${r.rows.map((x) => `<p><b>${esc(x.shop_name)}</b><br>Status: ${badge(x.status)}<br>${esc(bdTime(x.created_at))}</p>`).join('') || 'No record found'}</section>`;
    }
    res.send(page('Merchant Status', `<section class="card"><h1>Merchant Status</h1><form><label>Phone</label><input name="phone" value="${esc(phone)}"><button>Check</button></form></section>${records}`, 'merchant'));
  } catch (e) { next(e); }
});

app.get('/dashboard/rider', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '');
    let records = '';
    if (phone) {
      const r = await pool.query(`SELECT COALESCE(rider_name,name) AS rider_name, COALESCE(status,'pending') AS status, created_at FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 5`, [phone]);
      records = `<section class="card"><h2>Rider Records</h2>${r.rows.map((x) => `<p><b>${esc(x.rider_name)}</b><br>Status: ${badge(x.status)}<br>${esc(bdTime(x.created_at))}</p>`).join('') || 'No record found'}</section>`;
    }
    res.send(page('Rider Status', `<section class="card"><h1>Rider Status</h1><form><label>Phone</label><input name="phone" value="${esc(phone)}"><button>Check</button></form></section>${records}`, 'rider'));
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error('GOVO error:', err);
  res.status(500).send(page('Server Error', `<section class="card"><h1>Server Error</h1><p>${esc(err.message || 'Unknown error')}</p></section>`));
});

ensureSchema().then(() => {
  app.listen(PORT, () => console.log('GOVO Express v1.0 clean running on', PORT));
}).catch((e) => {
  console.error('Startup failed:', e);
  process.exit(1);
});
