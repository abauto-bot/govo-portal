// GOVO Express Portal - v1.0 Clean Release Phase 1
// Canonical routes only. Additive schema setup. Telegram notifications preserved.

const fs = require('fs');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');

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

const ADMIN_COOKIE = 'govo_admin_session';
const ADMIN_SESSION_SECRET = String(process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || process.env.COOKIE_SECRET || ADMIN_PIN || 'govo-admin-session-secret').trim();

function rawPin(req) {
  return String((req.body && (req.body.admin_pin || req.body.pin)) || (req.query && req.query.pin) || '').trim();
}

function getPin(req) {
  return '';
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((acc, part) => {
    const i = part.indexOf('=');
    if (i > -1) acc[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return acc;
  }, {});
}

function adminToken() {
  if (!ADMIN_PIN) return '';
  return crypto.createHmac('sha256', `${ADMIN_SESSION_SECRET}:${ADMIN_PIN}`).update('govo-admin-lock-v1').digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function hasAdminCookie(req) {
  const token = parseCookies(req)[ADMIN_COOKIE];
  const expected = adminToken();
  return Boolean(expected && token && safeEqual(token, expected));
}

function requestIsHttps(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase() === 'https';
}

function setAdminCookie(req, res) {
  res.cookie(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: 'lax', secure: requestIsHttps(req), path: '/admin' });
}

function clearAdminCookie(req, res) {
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: 'lax', secure: requestIsHttps(req), path: '/admin' });
}

function hasValidAdminPin(req) {
  const pin = rawPin(req);
  return Boolean(ADMIN_PIN && pin && safeEqual(pin, ADMIN_PIN));
}

function isAdminAuthorized(req) {
  return hasAdminCookie(req) || hasValidAdminPin(req);
}

function adminLoginPage(message = '') {
  return page('Admin Login', `<section class="card lock-card app-hero"><span class="pill">Admin Security</span><h1>GOVO Admin Login</h1><p>Enter the admin PIN to open the GOVO Control Center.</p>${message ? `<p style="color:#fecaca;font-weight:900">${esc(message)}</p>` : ''}<form method="POST" action="/admin/login"><label>Admin PIN</label><input name="admin_pin" type="password" placeholder="Admin PIN" required autofocus><button>Login</button></form><div class="actions"><a class="btn secondary" href="/app">Back to App</a></div></section>`, 'admin');
}

function requireAdmin(req, res) {
  if (isAdminAuthorized(req)) return true;
  if (req.method === 'GET') return res.redirect('/admin'), false;
  res.status(403).send(page('Unauthorized', '<section class="card lock-card"><h1>Unauthorized</h1><p>Admin login required.</p><a class="btn" href="/admin">Admin Login</a></section>', 'admin'));
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
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#0b1020;color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}.app{max-width:1180px;margin:0 auto;padding:18px}.topbar{position:sticky;top:0;z-index:5;background:rgba(11,16,32,.92);backdrop-filter:blur(12px);border:1px solid rgba(148,163,184,.16);border-radius:18px;margin-bottom:18px;padding:14px}.brand-row{display:flex;align-items:center;justify-content:space-between;gap:14px}.brand{display:flex;align-items:center;gap:12px}.logo{width:42px;height:42px;border-radius:12px;background:#22c55e;color:#052e16;display:grid;place-items:center;font-weight:1000}.brand h2{font-size:18px;margin:0}.brand p{margin:2px 0 0;color:var(--muted);font-size:12px}.nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.nav a{color:#bfdbfe;text-decoration:none;padding:9px 11px;border:1px solid rgba(96,165,250,.18);border-radius:12px;background:#0f172a;font-weight:800;font-size:14px}.nav a.active,.nav a:hover{background:rgba(34,197,94,.15);color:#bbf7d0;border-color:rgba(34,197,94,.45)}.card{background:#111827;border:1px solid rgba(148,163,184,.16);border-radius:18px;padding:18px;margin-bottom:16px}.card h1{margin:0 0 14px;color:#22c55e;font-size:clamp(28px,5vw,48px);line-height:1.08}.card h2{margin:0 0 10px;color:#e2e8f0}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat{background:#0f172a;border:1px solid rgba(148,163,184,.14);border-radius:16px;padding:14px}.stat .label{font-size:12px;color:var(--muted);font-weight:900;text-transform:uppercase}.stat .value{font-size:28px;font-weight:1000;margin-top:7px}form{display:grid;gap:11px}label{font-weight:850;color:#e2e8f0}input,select,textarea{width:100%;border:1px solid #334155;border-radius:13px;background:#020617;color:#f8fafc;padding:12px;font-size:15px}textarea{min-height:92px}.btn,button{border:0;border-radius:13px;padding:11px 14px;font-weight:1000;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#22c55e;color:#052e16}.btn.secondary,button.secondary{background:#1e293b;color:#e2e8f0;border:1px solid #334155}.reject,button.reject{background:#ef4444;color:#fff}.pill,.badge{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;background:#052e16;border:1px solid #22c55e;color:#bbf7d0;font-weight:900;font-size:12px;text-transform:capitalize}.badge.rejected,.badge.cancelled,.badge.failed,.badge.unavailable{background:#7f1d1d;border-color:#ef4444;color:#fecaca}.badge.verified{background:#0c4a6e;border-color:#38bdf8;color:#e0f2fe}.badge.trusted{background:#064e3b;border-color:#34d399;color:#d1fae5}.badge.available{background:#052e16;border-color:#22c55e;color:#bbf7d0}.badge.emergency{background:#7c2d12;border-color:#fb923c;color:#ffedd5}.badge.rating{background:#422006;border-color:#facc15;color:#fef9c3}.badge.clear{background:#172554;border-color:#60a5fa;color:#dbeafe}.app-hero{background:radial-gradient(circle at 15% 0%,rgba(34,197,94,.28),transparent 34%),linear-gradient(180deg,#102016,#111827);overflow:hidden}.app-hero h1{font-size:clamp(34px,8vw,58px)}.quick-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.quick-grid .btn{min-height:58px;text-align:center}.chips{display:flex;gap:8px;overflow:auto;padding:2px 0 8px;scrollbar-width:none}.chips a{white-space:nowrap}.section-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.timeline{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:14px 0}.step{border:1px solid rgba(148,163,184,.18);background:#0f172a;border-radius:14px;padding:10px;text-align:center;color:var(--muted);font-size:12px;font-weight:900}.step.done{background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.58);color:#bbf7d0}.big-status{display:inline-flex;font-size:16px;padding:9px 13px;margin:6px 0 10px}.bottom-nav{position:sticky;bottom:10px;z-index:8;display:none;grid-template-columns:repeat(5,1fr);gap:6px;background:rgba(2,6,23,.94);border:1px solid rgba(34,197,94,.35);border-radius:18px;padding:8px;margin-top:18px;backdrop-filter:blur(12px)}.bottom-nav a{color:#d1fae5;text-decoration:none;text-align:center;font-size:12px;font-weight:900;padding:8px 4px;border-radius:12px}.bottom-nav a.active{background:#22c55e;color:#052e16}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.cards{display:grid;gap:14px}.item-grid,.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.detail-grid div,.item-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:10px;min-width:0}.detail-grid b,.item-box b{display:block;margin-bottom:5px}.detail-grid span,.item-box span{word-break:break-word}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.three{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.filters{display:grid;grid-template-columns:1fr .55fr auto;gap:8px;margin:12px 0}.footer{color:var(--muted);font-size:12px;text-align:center;padding:18px 0}.lock-card{max-width:520px;margin:50px auto}.table-wrap{overflow:auto}.admin-table{width:100%;min-width:900px;border-collapse:collapse}.admin-table th,.admin-table td{border-bottom:1px solid #263244;padding:10px;text-align:left;vertical-align:top}.admin-table th{color:#bfdbfe;font-size:12px;text-transform:uppercase}
@media(max-width:760px){.app{padding:12px 12px 88px}.grid,.item-grid,.detail-grid,.filters,.three{grid-template-columns:1fr}.quick-grid,.timeline{grid-template-columns:repeat(2,minmax(0,1fr))}.brand-row{align-items:flex-start}.card{padding:15px}.actions .btn,.actions form,button{width:100%}.bottom-nav{display:grid}}

/* GOVO Theme System v1 */
:root,[data-theme="dark"]{--bg:#0b1020;--card:#111827;--panel:#111827;--surface:#0f172a;--text:#e5e7eb;--muted:#94a3b8;--border:#263244;--primary:#22c55e;--primaryText:#052e16;--danger:#ef4444;--warning:#f59e0b;--success:#22c55e;--link:#86efac;--inputBg:#020617;--inputText:#f8fafc;--topbar:rgba(11,16,32,.94);color-scheme:dark}
[data-theme="light"]{--bg:#eef7f1;--card:#ffffff;--panel:#ffffff;--surface:#f6fbf7;--text:#102016;--muted:#53645b;--border:#c8d8ce;--primary:#16a34a;--primaryText:#ffffff;--danger:#dc2626;--warning:#b45309;--success:#16a34a;--link:#047857;--inputBg:#ffffff;--inputText:#0f172a;--topbar:rgba(246,251,247,.96);color-scheme:light}
body{background:var(--bg)!important;color:var(--text)!important}.topbar{background:var(--topbar)!important;border-color:var(--border)!important}.brand h2,.card h2,label,.admin-table th{color:var(--text)!important}.brand p,.footer,.card p,.detail-grid span,.item-box span{color:var(--muted)}.card,.stat{background:var(--card)!important;border-color:var(--border)!important}.stat,.detail-grid div,.item-box,.step{background:var(--surface)!important;border-color:var(--border)!important}.card h1,.app-hero h1{color:var(--primary)!important}input,select,textarea{background:var(--inputBg)!important;color:var(--inputText)!important;border-color:var(--border)!important}.nav a,.btn.secondary,button.secondary{background:var(--surface)!important;color:var(--text)!important;border-color:var(--border)!important}.nav a{color:var(--link)!important}.nav a.active,.nav a:hover{background:rgba(34,197,94,.14)!important;color:var(--primary)!important;border-color:var(--primary)!important}.btn,button{background:var(--primary)!important;color:var(--primaryText)!important}.reject,button.reject{background:var(--danger)!important;color:#fff!important}.card a:not(.btn),.footer a{color:var(--link)!important}.admin-table th,.admin-table td{border-color:var(--border)!important}.app-hero{background:radial-gradient(circle at 12% 0%,rgba(34,197,94,.25),transparent 34%),linear-gradient(180deg,var(--surface),var(--card))!important}.bottom-nav{background:color-mix(in srgb,var(--card) 94%,transparent)!important;border-color:var(--primary)!important}.bottom-nav a{color:var(--text)!important}.bottom-nav a.active{background:var(--primary)!important;color:var(--primaryText)!important}.theme-toggle{min-height:34px;padding:7px 10px;font-size:12px;border-radius:999px;white-space:nowrap}.header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.logo{background:var(--primary)!important;color:var(--primaryText)!important}.pill{background:rgba(34,197,94,.13);border-color:var(--primary);color:var(--primary)}
[data-theme="light"] .badge.verified{background:#e0f2fe;border-color:#0284c7;color:#075985}[data-theme="light"] .badge.trusted,[data-theme="light"] .badge.available{background:#dcfce7;border-color:#16a34a;color:#14532d}[data-theme="light"] .badge.rating{background:#fef3c7;border-color:#d97706;color:#78350f}[data-theme="light"] .badge.emergency{background:#ffedd5;border-color:#ea580c;color:#7c2d12}[data-theme="light"] .badge.rejected,[data-theme="light"] .badge.cancelled,[data-theme="light"] .badge.failed,[data-theme="light"] .badge.unavailable{background:#fee2e2;border-color:#dc2626;color:#7f1d1d}
@media(max-width:760px){.header-actions{width:100%;justify-content:space-between}.theme-toggle{width:auto!important;min-height:32px;padding:7px 9px}.brand-row{gap:10px}.nav{overflow-x:auto;flex-wrap:nowrap}.nav a{white-space:nowrap}}

`;

function adminNav(active) {
  const links = [
    ['Dashboard', '/admin/os'],
    ['Orders', '/admin/orders'],
    ['Merchants', '/admin/leads'],
    ['Riders', '/admin/riders'],
    ['Providers', '/admin/providers'],
    ['Service Requests', '/admin/service-requests'],
    ['Reviews', '/admin/reviews'],
  ];
  return `<nav class="nav">${links.map(([label, href]) => `<a class="${active === 'admin' && href === '/admin/os' ? 'active' : ''}" href="${href}">${label}</a>`).join('')}<a href="/">Main Website</a><form method="POST" action="/admin/logout" style="display:inline"><button class="secondary" style="padding:9px 11px">Logout</button></form></nav>`;
}


function themeHead() {
  return `<script>(function(){try{var t=localStorage.getItem('govo_theme')||'dark';if(t!=='light')t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();</script>`;
}

function themeToggle() {
  return `<button type="button" class="secondary theme-toggle" id="themeToggle" aria-label="Toggle theme" onclick="window.govoToggleTheme&&window.govoToggleTheme()">Dark</button>`;
}

function themeRuntimeScript() {
  return `<script>(function(){function label(t){return t==='light'?'☀ Light':'☾ Dark'}function apply(t){if(t!=='light')t='dark';document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('govo_theme',t)}catch(e){}var b=document.getElementById('themeToggle');if(b)b.textContent=label(t)}window.govoToggleTheme=function(){var cur=document.documentElement.getAttribute('data-theme')||'dark';apply(cur==='light'?'dark':'light')};apply(document.documentElement.getAttribute('data-theme')||'dark');})();</script>`;
}

function page(title, body, active = '') {
  const publicNav = [
    ['app', '/app', 'App'],
    ['merchant', '/merchant', 'Merchant'],
    ['rider', '/rider', 'Rider'],
    ['shops', '/shops', 'Shops'],
    ['services', '/services', 'Services'],
    ['provider', '/provider', 'Provider'],
    ['track', '/track', 'Track'],
  ].map(([key, href, label]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('');
  const isAdmin = active === 'admin';
  const nav = isAdmin ? adminNav(active) : `<nav class="nav">${publicNav}</nav>`;
  const robots = isAdmin ? '<meta name="robots" content="noindex,nofollow">' : '';
  const showBottom = !['admin', 'merchant', 'rider'].includes(active);
  const bottom = showBottom ? `<nav class="bottom-nav"><a class="${active === 'app' ? 'active' : ''}" href="/app">Home</a><a class="${active === 'shops' ? 'active' : ''}" href="/shops">Shops</a><a class="${active === 'services' ? 'active' : ''}" href="/services">Services</a><a class="${active === 'track' ? 'active' : ''}" href="/track">Track</a><a href="/merchant">Join</a></nav>` : '';
  return `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${robots}${themeHead()}<title>${esc(title)} | GOVO Express</title><style>${css}</style></head><body><main class="app"><header class="topbar"><div class="brand-row"><div class="brand"><div class="logo">G</div><div><h2>GOVO Express</h2><p>Merchant, rider and delivery portal</p></div></div><div class="header-actions"><span class="pill">Live System</span>${themeToggle()}</div></div>${nav}</header>${body}<div class="footer">GOVO Express v1.0 Clean Release</div>${bottom}</main>${themeRuntimeScript()}</body></html>`;
}

function badge(status) {
  const s = String(status || 'pending').toLowerCase();
  return `<span class="badge ${esc(s)}">${esc(s)}</span>`;
}

function boolish(v) {
  return v === true || v === 1 || String(v || '').toLowerCase() === 'true' || String(v || '') === '1';
}

function normalizeStatus(status) {
  const s = String(status == null ? '' : status).trim().toLowerCase();
  if (!s) return 'pending';
  if (['approve', 'approved', 'accepted', 'active', 'true', '1'].includes(s)) return 'approved';
  if (['reject', 'rejected', 'declined', 'false', '0'].includes(s)) return 'rejected';
  if (s === 'pending') return 'pending';
  return 'pending';
}

const approvalPendingSql = `(status IS NULL OR TRIM(status)='' OR LOWER(TRIM(status))='pending')`;
const approvalApprovedSql = `LOWER(TRIM(COALESCE(status,'')))='approved'`;
const approvalRejectedSql = `LOWER(TRIM(COALESCE(status,'')))='rejected'`;

function approvalStatusWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return {
    pending: `(${prefix}status IS NULL OR TRIM(${prefix}status)='' OR LOWER(TRIM(${prefix}status))='pending')`,
    approved: `LOWER(TRIM(COALESCE(${prefix}status,'')))='approved'`,
    rejected: `LOWER(TRIM(COALESCE(${prefix}status,'')))='rejected'`,
  };
}

function approvalFilterLinks(basePath, current) {
  const items = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];
  return `<div class="toolbar">${items.map(([key, label]) => `<a class="btn ${current === key ? '' : 'secondary'}" href="${basePath}?status=${key}">${label}</a>`).join('')}</div>`;
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

function chip(label, href, active = false) {
  return `<a class="btn ${active ? '' : 'secondary'}" href="${href}">${esc(label)}</a>`;
}

function compactMerchantCard(x) {
  return `<div class="card">${listingImage(x.image_url, x.shop_name)}<div class="section-head"><h2>${esc(x.shop_name || 'GOVO Shop')}</h2><span class="pill">${esc(x.category || 'Shop')}</span></div>${trustBadges(x)}<p style="color:var(--muted)">${esc(x.shop_address || x.location || 'Meherpur')}</p><div class="actions"><a class="btn" href="/shop/${encodeURIComponent(x.id)}">View Shop</a><a class="btn secondary" href="/order?shop=${encodeURIComponent(x.shop_name || '')}">Order</a></div></div>`;
}

function compactProviderCard(x) {
  return `<div class="card">${listingImage(x.image_url, x.provider_name)}<div class="section-head"><h2>${esc(x.provider_name || 'Provider')}</h2><span class="pill">${esc(x.service_type || 'Service')}</span></div>${trustBadges(x)}<p style="color:var(--muted)">${esc(x.area || x.address || 'Meherpur')}</p><div class="actions"><a class="btn" href="/service/${encodeURIComponent(x.id)}">View Service</a><a class="btn secondary" href="/service/${encodeURIComponent(x.id)}#request_form">Request Now</a></div></div>`;
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
    return `<form method="POST" action="${action}"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="field" value="${field}"><input type="hidden" name="value" value="${current ? 'false' : 'true'}"><button class="${current ? '' : 'secondary'}">${esc(label)}: ${esc(current ? 'On' : 'Off')}</button></form>`;
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
  for (const col of ['shop_name TEXT', 'merchant_phone TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'pickup_location TEXT', 'drop_location TEXT', 'item_details TEXT', 'note TEXT', 'preferred_time TEXT', 'customer_note TEXT', "status TEXT DEFAULT 'pending'", 'merchant_status TEXT', 'admin_note TEXT', 'merchant_note TEXT', 'provider_note TEXT', 'rider_id INT', 'rider_name TEXT', 'rider_phone TEXT', 'assigned_rider_id INT', 'assigned_rider_name TEXT', 'assigned_rider_phone TEXT', 'rider_note TEXT', 'merchant_lead_id INTEGER', "order_type TEXT DEFAULT 'delivery'", 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_orders', col);
  for (const col of ['provider_name TEXT', 'phone TEXT', 'whatsapp TEXT', 'service_type TEXT', 'area TEXT', 'address TEXT', 'experience TEXT', 'description TEXT', 'image_url TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'is_verified BOOLEAN DEFAULT false', 'is_trusted BOOLEAN DEFAULT false', 'is_available BOOLEAN DEFAULT true', 'emergency_available BOOLEAN DEFAULT false', 'rating_avg NUMERIC DEFAULT 0', 'rating_count INT DEFAULT 0', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_service_providers', col);
  for (const col of ['provider_id INT', 'provider_name TEXT', 'provider_phone TEXT', 'service_type TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'service_address TEXT', 'problem_details TEXT', 'preferred_time TEXT', 'note TEXT', 'customer_note TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'provider_note TEXT', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_service_requests', col);

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

app.use('/admin', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const openPaths = ['/', '/login', '/logout'];
  if (openPaths.includes(req.path)) return next();
  if (hasAdminCookie(req)) return next();
  if (hasValidAdminPin(req)) {
    setAdminCookie(req, res);
    return next();
  }
  if (req.method === 'GET') return res.redirect('/admin');
  return res.status(403).send(page('Unauthorized', '<section class="card lock-card"><h1>Unauthorized</h1><p>Admin login required.</p><a class="btn" href="/admin">Admin Login</a></section>', 'admin'));
});

app.get('/admin', (req, res) => {
  if (hasAdminCookie(req)) return res.redirect('/admin/os');
  if (hasValidAdminPin(req)) {
    setAdminCookie(req, res);
    return res.redirect('/admin/os');
  }
  return res.send(adminLoginPage());
});

app.post('/admin/login', (req, res) => {
  if (hasValidAdminPin(req)) {
    setAdminCookie(req, res);
    return res.redirect('/admin/os');
  }
  return res.status(401).send(adminLoginPage('Wrong admin PIN. Please try again.'));
});

app.all('/admin/logout', (req, res) => {
  clearAdminCookie(req, res);
  res.redirect('/admin');
});

app.get('/admin/os', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [orders, merchants, riders, providers, serviceRequests, recentOrders, recentServiceRequests, recentMerchants, recentProviders] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending') IN ('accepted','preparing','merchant_confirmed'))::int active_merchant, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='ready')::int ready, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='picked_up')::int picked_up, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int delivered FROM govo_orders`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE COALESCE(is_verified,false)=true)::int verified, COUNT(*) FILTER (WHERE COALESCE(is_trusted,false)=true)::int trusted FROM govo_merchant_leads`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved FROM govo_rider_leads`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE COALESCE(is_verified,false)=true)::int verified, COUNT(*) FILTER (WHERE COALESCE(is_trusted,false)=true)::int trusted, COUNT(*) FILTER (WHERE COALESCE(emergency_available,false)=true AND COALESCE(is_available,true)=true)::int emergency_available FROM govo_service_providers`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='working')::int working, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='completed')::int completed FROM govo_service_requests`),
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
    res.send(page('Admin OS', `<section class="card hero"><h1>GOVO Admin OS</h1><p>Operations Control Center for orders, dispatch, providers and approvals.</p><div class="toolbar"><a class="btn" href="/admin/os">Refresh</a><a class="btn secondary" href="/admin/orders?status=pending">Pending Orders</a><a class="btn secondary" href="/admin/service-requests?status=pending">Pending Services</a></div></section><section class="grid">${stat('Pending Orders', o.pending, 'Need merchant/admin action')}${stat('Accepted / Preparing', o.active_merchant, 'Merchant working')}${stat('Ready Orders', o.ready, 'Ready for rider')}${stat('Assigned Orders', o.assigned, 'Rider assigned')}${stat('Picked Up Orders', o.picked_up, 'On the way')}${stat('Delivered Orders', o.delivered, 'Completed deliveries')}${stat('Pending Service Requests', sr.pending, 'Need provider/admin action')}${stat('Working Service Requests', sr.working, 'Provider working')}${stat('Completed Service Requests', sr.completed, 'Finished service jobs')}${stat('Pending Merchants', m.pending, 'Waiting approval')}${stat('Pending Riders', r.pending, 'Waiting approval')}${stat('Pending Providers', p.pending, 'Waiting approval')}${stat('Total Orders', o.total, 'All customer orders')}${stat('Total Merchants', m.total, 'Merchant registrations')}${stat('Approved Merchants', m.approved, 'Visible in shops')}${stat('Total Riders', r.total, 'Rider registrations')}${stat('Approved Riders', r.approved, 'Assignable riders')}${stat('Total Service Providers', p.total, 'Provider registrations')}${stat('Approved Providers', p.approved, 'Visible in services')}${stat('Emergency Providers', p.emergency_available, 'Urgent support')}</section><section class="card"><h2>Quick Actions</h2><div class="toolbar">${action('Manage Orders', '/admin/orders')}${action('Manage Merchants', '/admin/leads')}${action('Manage Riders', '/admin/riders')}${action('Manage Providers', '/admin/providers')}${action('Manage Service Requests', '/admin/service-requests')}${action('Pilot Dashboard', '/admin/pilot')}${action('Public Pilot Page', '/pilot')}${action('Merchant Pilot Page', '/pilot/merchant')}${action('Provider Pilot Page', '/pilot/provider')}${action('Rider Pilot Page', '/pilot/rider')}${action('View Shops', '/shops')}${action('View Services', '/services')}${action('Track Order', '/track')}${action('Main Website', '/')}</div></section><section class="card"><h2>Alerts</h2><div class="cards compact">${alert('Pending merchant approvals', m.pending, '/admin/leads?status=pending')}${alert('Pending rider approvals', r.pending, '/admin/riders?status=pending')}${alert('Pending provider approvals', p.pending, '/admin/providers?status=pending')}${alert('Pending service requests', sr.pending, '/admin/service-requests?status=pending')}${alert('Pending orders', o.pending, '/admin/orders?status=pending')}</div></section><section class="grid two">${recentSection('Last 5 Orders', recentOrders.rows, (x) => recentCard(`#${x.id} ${x.shop_name || 'Order'}`, x.status, `${x.customer_name || 'Customer'} - ${x.customer_phone || 'No phone'} - ${x.drop_location || 'No location'} - ${bdTime(x.created_at)}`, `/admin/orders?q=${encodeURIComponent(x.id)}`))}${recentSection('Last 5 Service Requests', recentServiceRequests.rows, (x) => recentCard(`#${x.id} ${x.service_type || 'Service'}`, x.status, `${x.customer_name || 'Customer'} - ${x.customer_phone || 'No phone'} - ${x.provider_name || 'Provider'} - ${bdTime(x.created_at)}`, `/admin/service-requests?q=${encodeURIComponent(x.id)}`))}${recentSection('Last 5 Merchant Leads', recentMerchants.rows, (x) => recentCard(`#${x.id} ${x.shop_name || 'Merchant'}`, x.status, `${x.owner_name || 'Owner'} - ${x.phone || 'No phone'} - ${x.category || 'No category'} - ${bdTime(x.created_at)}`, `/admin/leads?q=${encodeURIComponent(x.phone || x.shop_name || x.id)}`))}${recentSection('Last 5 Provider Leads', recentProviders.rows, (x) => recentCard(`#${x.id} ${x.provider_name || 'Provider'}`, x.status, `${x.phone || 'No phone'} - ${x.service_type || 'No service'} - ${x.area || 'No area'} - ${bdTime(x.created_at)}`, `/admin/providers?q=${encodeURIComponent(x.phone || x.provider_name || x.id)}`))}</section>`, 'admin'));
  } catch (e) { next(e); }
});


app.get('/admin/pilot', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const today = `created_at >= CURRENT_DATE`;
    let healthOk = false;
    try { await pool.query('SELECT 1'); healthOk = true; } catch {}
    const [merchants, providers, riders, orders, requests] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending FROM govo_merchant_leads`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending FROM govo_service_providers`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending FROM govo_rider_leads`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE ${today})::int total_today, COUNT(*) FILTER (WHERE ${today} AND COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE ${today} AND COALESCE(status,'pending')='delivered')::int delivered FROM govo_orders`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE ${today})::int total_today, COUNT(*) FILTER (WHERE ${today} AND COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE ${today} AND COALESCE(status,'pending')='completed')::int completed FROM govo_service_requests`),
    ]);
    const m = merchants.rows[0] || {}, p = providers.rows[0] || {}, r = riders.rows[0] || {}, o = orders.rows[0] || {}, sr = requests.rows[0] || {};
    const ready = healthOk && Number(m.approved || 0) > 0 && Number(p.approved || 0) > 0 && Number(r.approved || 0) > 0;
    const stat = (label, value, hint) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div><p>${esc(hint || '')}</p></div>`;
    const link = (label, href) => `<a class="btn secondary" href="${href}">${esc(label)}</a>`;
    res.send(page('Pilot Dashboard', `<section class="card app-hero"><h1>GOVO Pilot Dashboard</h1><p>Control panel for first merchants, providers, riders and customer pilot traffic.</p><div class="actions"><span class="badge ${ready ? 'available' : 'failed'}">${ready ? 'ready' : 'needs attention'}</span><a class="btn secondary" href="/pilot">Public Pilot Page</a></div><h2>${ready ? 'Pilot can start with internal users' : 'Approve at least one merchant, provider and rider first'}</h2></section><section class="grid">${stat('Total Merchants', m.total, 'Registered')}${stat('Approved Merchants', m.approved, 'Ready for pilot')}${stat('Pending Merchants', m.pending, 'Need approval')}${stat('Total Providers', p.total, 'Registered')}${stat('Approved Providers', p.approved, 'Ready for pilot')}${stat('Pending Providers', p.pending, 'Need approval')}${stat('Total Riders', r.total, 'Registered')}${stat('Approved Riders', r.approved, 'Ready for dispatch')}${stat('Pending Riders', r.pending, 'Need approval')}${stat('Orders Today', o.total_today, 'Today')}${stat('Pending Orders', o.pending, 'Need action')}${stat('Delivered Today', o.delivered, 'Completed today')}${stat('Service Requests Today', sr.total_today, 'Today')}${stat('Pending Service Requests', sr.pending, 'Need action')}${stat('Completed Service Requests', sr.completed, 'Completed today')}</section><section class="card"><h2>Pilot Links</h2><div class="toolbar">${link('Launch Checklist','/admin/launch-checklist')}${link('QA Center','/admin/qa')}${link('Orders','/admin/orders')}${link('Service Requests','/admin/service-requests')}${link('Merchants','/admin/leads')}${link('Providers','/admin/providers')}${link('Riders','/admin/riders')}${link('Public Pilot Page','/pilot')}</div></section>`, 'admin'));
  } catch (e) { next(e); }
});

app.get('/admin/leads', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = ['pending', 'approved', 'rejected', 'all'].includes(String(req.query.status || 'pending').trim().toLowerCase()) ? String(req.query.status || 'pending').trim().toLowerCase() : 'pending';
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { where.push(approvalStatusWhere()[status]); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(shop_name,'') || ' ' || COALESCE(owner_name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(category,'') || ' ' || COALESCE(products,'')) LIKE $${params.length}`); }
    const merchants = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, delivery_needed, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, admin_note, shop_description, shop_address, products, image_url, COALESCE(is_verified,false) AS is_verified, COALESCE(is_trusted,false) AS is_trusted, COALESCE(is_available,true) AS is_available, COALESCE(emergency_available,false) AS emergency_available, COALESCE(rating_avg,0) AS rating_avg, COALESCE(rating_count,0) AS rating_count, created_at FROM govo_merchant_leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalRejectedSql})::int rejected FROM govo_merchant_leads`);
    const cards = merchants.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>${esc(x.shop_name || 'Unnamed Shop')}</h2>${badge(x.status)}</div>${trustBadges(x)}<div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name)}</span></div><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div><div><b>Category</b><span>${esc(x.category)}</span></div><div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/admin/merchant/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminTrustControls('merchant', x, pin)}<div class="actions"><a class="btn secondary" href="/shop/${encodeURIComponent(x.id)}">View Shop</a><a class="btn secondary" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || '')}">Dashboard</a><a class="btn secondary" href="/merchant/products?phone=${encodeURIComponent(x.phone || '')}">Products</a></div></div>`).join('');
    res.send(page('Admin Merchants', `${statCards(counts.rows[0] || {})}<section class="card"><h1>Admin Merchants</h1>${approvalFilterLinks('/admin/leads', status)}<form class="filters" method="GET" action="/admin/leads"><input name="q" value="${esc(q)}" placeholder="Search merchants"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/riders">Riders</a><a class="btn secondary" href="/admin/orders">Orders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No merchant found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/merchant/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const id = String(req.body.id || req.body.lead_id || req.body.merchant_id || '').trim();
    const status = normalizeStatus(req.body.status || req.body.action);
    const r = await pool.query(`UPDATE govo_merchant_leads SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING id, shop_name, owner_name, phone, category, location, status, admin_note`, [status, String(req.body.admin_note || ''), id]);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Merchant Status Updated', '', `Merchant ID: #${x.id}`, `Shop: ${x.shop_name || ''}`, `Owner: ${x.owner_name || ''}`, `Phone: ${x.phone || ''}`, `Category: ${x.category || ''}`, `Location: ${x.location || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/leads`);
  } catch (e) { next(e); }
});

app.get('/admin/riders', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = ['pending', 'approved', 'rejected', 'all'].includes(String(req.query.status || 'pending').trim().toLowerCase()) ? String(req.query.status || 'pending').trim().toLowerCase() : 'pending';
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { where.push(approvalStatusWhere()[status]); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(rider_name,'') || ' ' || COALESCE(name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(vehicle_type,'')) LIKE $${params.length}`); }
    const riders = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, location, vehicle_type, experience, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, admin_note, created_at FROM govo_rider_leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalRejectedSql})::int rejected FROM govo_rider_leads`);
    const cards = riders.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>${esc(x.rider_name || 'Unnamed Rider')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>Location</b><span>${esc(x.location)}</span></div><div><b>Vehicle</b><span>${esc(x.vehicle_type)}</span></div><div><b>Experience</b><span>${esc(x.experience)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div><form method="POST" action="/admin/rider/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form></div>`).join('');
    res.send(page('Admin Riders', `${statCards(counts.rows[0] || {})}<section class="card"><h1>Admin Riders</h1>${approvalFilterLinks('/admin/riders', status)}<form class="filters" method="GET" action="/admin/riders"><input name="q" value="${esc(q)}" placeholder="Search riders"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/leads">Merchants</a><a class="btn secondary" href="/admin/orders">Orders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No rider found</h2></div>'}</section>`, 'admin'));
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
    res.redirect(`/admin/leads`);
  } catch (e) { next(e); }
});

app.post('/admin/rider/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = normalizeStatus(req.body.status);
    const r = await pool.query(`UPDATE govo_rider_leads SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING id, COALESCE(rider_name,name) AS rider_name, phone, vehicle_type, location, status, admin_note`, [status, String(req.body.admin_note || ''), String(req.body.id || '')]);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Rider Status Updated', '', `Rider ID: #${x.id}`, `Name: ${x.rider_name || ''}`, `Phone: ${x.phone || ''}`, `Vehicle: ${x.vehicle_type || ''}`, `Location: ${x.location || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/riders`);
  } catch (e) { next(e); }
});

app.get('/admin/orders', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    const allowedFilters = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'failed', 'rejected'];
    if (status !== 'all' && allowedFilters.includes(status)) { params.push(status); where.push(`COALESCE(status,'pending')=$${params.length}`); }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(`LOWER(CAST(id AS TEXT) || ' ' || COALESCE(shop_name,'') || ' ' || COALESCE(merchant_phone,'') || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(customer_phone,'') || ' ' || COALESCE(pickup_location,'') || ' ' || COALESCE(drop_location,'') || ' ' || COALESCE(item_details,'') || ' ' || COALESCE(rider_name,'') || ' ' || COALESCE(rider_phone,'') || ' ' || COALESCE(assigned_rider_name,'') || ' ' || COALESCE(assigned_rider_phone,'')) LIKE $${params.length}`);
    }
    const [orders, riders, counts] = await Promise.all([
      pool.query(`SELECT id, shop_name, merchant_phone, customer_name, customer_phone, pickup_location, drop_location, item_details, note, preferred_time, customer_note, COALESCE(status,'pending') AS status, COALESCE(merchant_status,'') AS merchant_status, admin_note, merchant_note, rider_id, rider_name, rider_phone, assigned_rider_id, assigned_rider_name, assigned_rider_phone, rider_note, created_at, updated_at FROM govo_orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params),
      pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, location FROM govo_rider_leads WHERE COALESCE(status,'pending')='approved' ORDER BY id DESC LIMIT 100`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='ready')::int ready, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='picked_up')::int picked_up, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='delivered')::int delivered FROM govo_orders`),
    ]);
    const riderOptions = (selectedId) => riders.rows.map((r) => `<option value="${esc(r.id)}" ${String(selectedId || '') === String(r.id) ? 'selected' : ''}>${esc(r.rider_name || 'Rider')} - ${esc(r.phone || '')}${r.location ? ` (${esc(r.location)})` : ''}</option>`).join('');
    const statusButton = (value, label, current, danger = false) => `<button class="${danger ? 'reject' : ''}" name="status" value="${esc(value)}" ${String(current || '').toLowerCase() === value ? 'style="outline:2px solid #bbf7d0"' : ''}>${esc(label)}</button>`;
    const cards = orders.rows.map((x) => {
      const assignedId = x.assigned_rider_id || x.rider_id || '';
      const assignedName = x.assigned_rider_name || x.rider_name || 'Not assigned';
      const assignedPhone = x.assigned_rider_phone || x.rider_phone || '';
      return `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.shop_name || 'GOVO Order')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Merchant</b><span>${esc(x.shop_name)}<br>${esc(x.merchant_phone)}</span></div><div><b>Merchant Status</b><span>${esc(x.merchant_status || 'No merchant update')}<br>${esc(x.merchant_note || 'No merchant note')}</span></div><div><b>Pickup</b><span>${esc(x.pickup_location)}</span></div><div><b>Delivery</b><span>${esc(x.drop_location)}</span></div><div><b>Item Details</b><span>${esc(x.item_details)}</span></div><div><b>Customer Note</b><span>${esc(x.customer_note || x.note || 'No note')}<br>${esc(x.preferred_time ? `Preferred: ${x.preferred_time}` : '')}</span></div><div><b>Rider</b><span>${esc(assignedName)}<br>${esc(assignedPhone || '')}<br>${esc(x.rider_note || 'No rider note')}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div><form method="POST" action="/admin/order/assign"><input type="hidden" name="order_id" value="${esc(x.id)}"><label>Assign approved rider</label><select name="rider_id" required><option value="">Select Rider</option>${riderOptions(assignedId)}</select><button>Assign Rider</button></form><form method="POST" action="/admin/order/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" value="${esc(x.admin_note || '')}" placeholder="Admin note"><div class="three">${statusButton('pending', 'Pending', x.status)}${statusButton('accepted', 'Accepted', x.status)}${statusButton('preparing', 'Preparing', x.status)}</div><div class="three">${statusButton('ready', 'Ready', x.status)}${statusButton('assigned', 'Assigned', x.status)}${statusButton('picked_up', 'Picked Up', x.status)}</div><div class="three">${statusButton('delivered', 'Delivered', x.status)}${statusButton('failed', 'Failed', x.status, true)}${statusButton('rejected', 'Rejected', x.status, true)}</div></form></div>`;
    }).join('');
    const c = counts.rows[0] || {};
    const opt = (v, label) => `<option value="${v}" ${status === v ? 'selected' : ''}>${label}</option>`;
    res.send(page('Admin Orders', `<section class="grid"><div class="stat"><div class="label">Total</div><div class="value">${esc(c.total || 0)}</div></div><div class="stat"><div class="label">Pending</div><div class="value">${esc(c.pending || 0)}</div></div><div class="stat"><div class="label">Ready</div><div class="value">${esc(c.ready || 0)}</div></div><div class="stat"><div class="label">Assigned</div><div class="value">${esc(c.assigned || 0)}</div></div><div class="stat"><div class="label">Picked Up</div><div class="value">${esc(c.picked_up || 0)}</div></div><div class="stat"><div class="label">Delivered</div><div class="value">${esc(c.delivered || 0)}</div></div></section><section class="card"><h1>Admin Orders</h1><form class="filters" method="GET" action="/admin/orders"><input name="q" value="${esc(q)}" placeholder="Search ID, customer, item, rider, merchant"><select name="status"><option value="all">All</option>${opt('pending','Pending')}${opt('accepted','Accepted')}${opt('preparing','Preparing')}${opt('ready','Ready')}${opt('assigned','Assigned')}${opt('picked_up','Picked Up')}${opt('delivered','Delivered')}${opt('failed','Failed')}${opt('rejected','Rejected')}</select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/leads">Merchants</a><a class="btn secondary" href="/admin/riders">Riders</a><a class="btn secondary" href="/track">Track</a></div></section><section class="cards">${cards || '<div class="card"><h2>No orders found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/order/assign', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone FROM govo_rider_leads WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [String(req.body.rider_id || '')]);
    if (!rider.rows.length) return res.status(404).send(page('Rider Not Found', `<section class="card"><h1>Rider Not Found</h1><a class="btn" href="/admin/orders">Back Orders</a></section>`));
    const rd = rider.rows[0];
    const order = await pool.query(`UPDATE govo_orders SET rider_id=$1, rider_name=$2, rider_phone=$3, assigned_rider_id=$1, assigned_rider_name=$2, assigned_rider_phone=$3, status='assigned', updated_at=NOW() WHERE id=$4 RETURNING *`, [rd.id, rd.rider_name, rd.phone, String(req.body.order_id || '')]);
    if (order.rows.length) {
      const o = order.rows[0];
      await sendTelegram([`GOVO Rider Assigned`, `Order: #${o.id}`, `Rider: ${rd.rider_name || ''} (${rd.phone || ''})`, `Customer: ${o.customer_name || ''} (${o.customer_phone || ''})`, `Pickup: ${o.pickup_location || ''}`, `Delivery: ${o.drop_location || ''}`].join('\n'));
    }
    res.redirect(`/admin/orders`);
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
    res.redirect(`/admin/orders`);
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
  return `<div class="card">${listingImage(x.image_url, x.shop_name)}<div class="actions" style="justify-content:space-between"><h2>${esc(x.shop_name || '')}</h2><span class="pill">${esc(x.category || 'Service')}</span></div>${trustBadges(x)}<div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name)}</span></div><div><b>Phone</b><span>${esc(x.whatsapp || x.phone)}</span></div><div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div><div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div><div><b>About</b><span>${esc(x.shop_description || 'Details coming soon')}</span></div><div><b>Products</b><span>${esc(x.products || 'Not added yet')}</span></div></div><div class="actions"><a class="btn" href="/shop/${encodeURIComponent(x.id)}">View Shop</a><a class="btn secondary" href="/order?shop=${encodeURIComponent(x.shop_name || '')}">Order</a><a class="btn secondary" href="tel:${esc(x.whatsapp || x.phone || '')}">Call</a></div></div>`;
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
    const rows = q ? all.rows.filter((x) => merchantSearchText(x).includes(q)) : all.rows.slice(0, 30);
    const chips = superAppCategories.slice(0, 12).map((cat) => chip(`${cat.icon} ${cat.title.replace(' / Restaurant', '').replace(' / Mobile', '')}`, `/category/${encodeURIComponent(cat.slug)}`)).join('');
    const cards = rows.map(merchantCard).join('');
    res.send(page('GOVO Shops', `
      <section class="card app-hero">
        <span class="pill">GOVO Shops</span>
        <h1>Shop, order and discover local partners</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">Search approved GOVO merchants by shop, product, category, location or phone.</p>
        <form method="GET" action="/shops" style="margin-top:14px"><input name="q" value="${esc(q)}" placeholder="Search food, grocery, medicine, phone, location"><button>Search Shops</button></form>
        <div class="toolbar"><a class="btn secondary" href="/app">Home</a><a class="btn secondary" href="/services">Services</a><a class="btn secondary" href="/order">Order</a></div>
      </section>
      <section class="card"><div class="section-head"><h2>Categories</h2><span class="pill">${superAppCategories.length}</span></div><div class="chips">${chips}</div></section>
      <section class="card"><div class="section-head"><h2>${q ? 'Shop Search Results' : 'Featured Verified Shops'}</h2><span class="pill">${rows.length} showing</span></div></section>
      <section class="cards">${cards || '<div class="card"><h2>No shop found</h2><p style="color:var(--muted)">Try another product, location, phone number or category.</p><div class="actions"><a class="btn" href="/shops">Clear Search</a><a class="btn secondary" href="/services">Browse Services</a></div></div>'}</section>
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
      return `<div class="card" style="padding:14px;margin:0"><div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between"><div style="min-width:0"><span class="pill">${esc(p.category || 'Menu')}</span><h2 style="font-size:22px;margin-top:10px">${esc(p.product_name || 'Product')}</h2><p style="font-weight:1000;color:#bbf7d0;margin:6px 0">${esc(p.price || '')}</p></div>${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.product_name || 'Product')}" style="width:86px;height:86px;object-fit:cover;border-radius:14px;border:1px solid rgba(34,197,94,.45)">` : ''}</div><p>${esc(p.description || '')}</p><div class="actions"><button type="button" onclick="document.getElementById('item_details').value=${esc(JSON.stringify(itemValue))};document.getElementById('order_form').scrollIntoView({behavior:'smooth',block:'start'});">Add to Order</button><a class="btn secondary" href="/order?shop_id=${encodeURIComponent(x.id)}&shop_name=${encodeURIComponent(x.shop_name || '')}&merchant_phone=${encodeURIComponent(x.whatsapp || x.phone || '')}&pickup_address=${encodeURIComponent(x.shop_address || x.location || x.shop_name || '')}&item=${encodeURIComponent(itemValue)}">Order this</a></div></div>`;
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

function orderForm(data = {}, error = '') {
  const shopSummary = data.shop_name || data.item || data.pickup_address ? `<section class="card"><h2>Selected Order</h2><div class="detail-grid"><div><b>Shop</b><span>${esc(data.shop_name || 'Custom pickup')}</span></div><div><b>Pickup</b><span>${esc(data.pickup_address || '')}</span></div><div><b>Item</b><span>${esc(data.item_details || data.item || '')}</span></div><div><b>Time</b><span>${esc(data.preferred_time || 'Any time')}</span></div></div></section>` : '';
  return page('Place Delivery Order', `${error ? `<section class="card"><h1>Check order details</h1><p style="color:#fecaca;font-weight:900">${esc(error)}</p></section>` : ''}<section class="card app-hero"><span class="pill">Fast Delivery</span><h1>Place Delivery Order</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Tell GOVO what to pick up, where to collect it, and where to deliver it. You will get a tracking ID after submission.</p><div class="actions"><a class="btn secondary" href="/app">Back to App</a><a class="btn secondary" href="/shops">Shops</a><a class="btn secondary" href="/track">Track Order</a></div></section>${shopSummary}<section class="card"><h2>Delivery Details</h2><form method="POST" action="/order"><input type="hidden" name="shop_id" value="${esc(data.shop_id || '')}"><label>Your Name</label><input name="customer_name" value="${esc(data.customer_name || '')}" required><label>Your Phone</label><input name="customer_phone" value="${esc(data.customer_phone || '')}" required><label>Pickup Address</label><input name="pickup_address" value="${esc(data.pickup_address || data.pickup_location || '')}" placeholder="Shop or pickup point" required><label>Delivery Address</label><input name="delivery_address" value="${esc(data.delivery_address || data.drop_location || '')}" placeholder="Where should GOVO deliver?" required><label>Product / Parcel Details</label><textarea name="item_details" required placeholder="Example: 2 burgers, 1 cola / parcel details">${esc(data.item_details || data.item || '')}</textarea><label>Preferred Time <span style="color:var(--muted)">(optional)</span></label><input name="preferred_time" value="${esc(data.preferred_time || '')}" placeholder="Now / Today 6 PM"><label>Notes</label><textarea name="notes" placeholder="Any extra instruction for GOVO">${esc(data.notes || data.note || '')}</textarea><label>Shop Name <span style="color:var(--muted)">(optional)</span></label><input name="shop_name" value="${esc(data.shop_name || '')}"><input type="hidden" name="merchant_phone" value="${esc(data.merchant_phone || '')}"><button>Submit Order</button></form></section>`, 'track');
}

function normalizeOrderBody(body = {}) {
  return {
    shop_id: String(body.shop_id || '').trim(),
    shop_name: String(body.shop_name || body.shop || '').trim(),
    merchant_phone: String(body.merchant_phone || '').trim(),
    customer_name: String(body.customer_name || '').trim(),
    customer_phone: String(body.customer_phone || '').trim(),
    pickup_address: String(body.pickup_address || body.pickup_location || '').trim(),
    delivery_address: String(body.delivery_address || body.drop_location || '').trim(),
    item_details: String(body.item_details || body.item || '').trim(),
    notes: String(body.notes || body.note || '').trim(),
    preferred_time: String(body.preferred_time || '').trim(),
  };
}

app.all('/order', async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      const order = normalizeOrderBody(req.body);
      const missing = [];
      for (const [field, label] of [['customer_name', 'Your name'], ['customer_phone', 'Your phone'], ['pickup_address', 'Pickup address'], ['delivery_address', 'Delivery address'], ['item_details', 'Product / parcel details']]) {
        if (!order[field]) missing.push(label);
      }
      if (missing.length) return res.status(400).send(orderForm(order, `Please fill: ${missing.join(', ')}`));
      const r = await pool.query(`INSERT INTO govo_orders (shop_name, merchant_phone, customer_name, customer_phone, pickup_location, drop_location, item_details, note, preferred_time, customer_note, status, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',NOW()) RETURNING id`, [order.shop_name, order.merchant_phone, order.customer_name, order.customer_phone, order.pickup_address, order.delivery_address, order.item_details, order.notes, order.preferred_time, order.notes]);
      const id = r.rows[0].id;
      sendTelegram(['New GOVO Order', '', `Order ID: #${id}`, `Shop: ${order.shop_name || 'Custom order'}`, `Merchant Phone: ${order.merchant_phone || 'N/A'}`, `Customer: ${order.customer_name}`, `Customer Phone: ${order.customer_phone}`, `Pickup: ${order.pickup_address}`, `Delivery: ${order.delivery_address}`, `Item: ${order.item_details}`, `Preferred: ${order.preferred_time || 'Any time'}`, `Note: ${order.notes || 'N/A'}`].join('\n')).catch(() => {});
      return res.redirect(`/order/success?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(order.customer_phone)}`);
    }
    const q = req.query || {};
    let data = normalizeOrderBody({ ...q, item_details: q.item || q.item_details, pickup_address: q.pickup_address || q.pickup_location, delivery_address: q.delivery_address || q.drop_location });
    if (data.shop_name && !data.merchant_phone) {
      const r = await pool.query(`SELECT shop_name, phone, whatsapp, location, shop_address FROM govo_merchant_leads WHERE shop_name=$1 ORDER BY id DESC LIMIT 1`, [data.shop_name]);
      if (r.rows.length) {
        data.merchant_phone = r.rows[0].whatsapp || r.rows[0].phone || '';
        data.pickup_address = data.pickup_address || r.rows[0].shop_address || r.rows[0].location || '';
      }
    }
    res.send(orderForm(data));
  } catch (e) { next(e); }
});

app.get('/order/success', (req, res) => {
  const id = String(req.query.id || '');
  const phone = String(req.query.phone || '');
  res.send(page('Order Submitted', `<section class="card app-hero"><span class="pill">Order Received</span><h1>Order Submitted Successfully</h1><p>Your order has been received by GOVO. Save your tracking ID.</p><h2>Tracking ID: #${esc(id)}</h2><p style="color:var(--muted);font-weight:900">Customer phone: ${esc(phone || 'Not provided')}</p><div class="timeline"><div class="step done">Submitted</div><div class="step">Admin Review</div><div class="step">Rider Assigned</div><div class="step">Delivered</div></div><div class="actions"><a class="btn" href="/track/order/${encodeURIComponent(id)}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}">Track Order</a><a class="btn secondary" href="/app">Back to App</a><a class="btn secondary" href="/shops">Shops</a></div></section>`, 'track'));
});

function statusMeaning(status) {
  const s = String(status || 'pending').toLowerCase();
  return {
    pending: 'waiting for review',
    accepted: 'accepted and being processed',
    preparing: 'merchant preparing order',
    ready: 'merchant marked ready',
    assigned: 'assigned to rider/provider',
    picked_up: 'rider picked up',
    working: 'provider working',
    delivered: 'finished',
    completed: 'finished',
    rejected: 'cancelled/rejected',
    failed: 'failed',
    cancelled: 'cancelled/failed',
  }[s] || 'status update in progress';
}

function progressStage(type, status) {
  const s = String(status || 'pending').toLowerCase();
  if (type === 'order') {
    if (['delivered', 'completed'].includes(s)) return 6;
    if (s === 'picked_up') return 5;
    if (s === 'assigned') return 4;
    if (['ready'].includes(s)) return 3;
    if (['accepted', 'preparing', 'merchant_confirmed'].includes(s)) return 2;
    if (['rejected', 'failed', 'cancelled'].includes(s)) return 6;
    return 1;
  }
  if (['completed', 'delivered'].includes(s)) return 4;
  if (['working', 'assigned', 'ready'].includes(s)) return 3;
  if (s === 'accepted') return 2;
  if (['rejected', 'failed', 'cancelled'].includes(s)) return 4;
  return 1;
}

function timelineHtml(type, status) {
  const stage = progressStage(type, status);
  const labels = type === 'order' ? ['Submitted', 'Merchant Accepted', 'Preparing / Ready', 'Rider Assigned', 'Picked Up', 'Delivered'] : ['Submitted', 'Provider Accepted', 'Working', 'Completed'];
  return `<div class="timeline">${labels.map((label, i) => `<div class="step ${i + 1 <= stage ? 'done' : ''}">${esc(label)}</div>`).join('')}</div>`;
}

function trackingOrderCard(x) {
  const riderName = x.assigned_rider_name || x.rider_name || 'Not assigned';
  const riderPhone = x.assigned_rider_phone || x.rider_phone || '';
  const merchantState = x.merchant_status || (['accepted', 'preparing', 'ready', 'rejected'].includes(String(x.status || '').toLowerCase()) ? x.status : 'waiting');
  return `<div class="card"><div class="section-head"><h2>Delivery Order #${esc(x.id)}</h2><span class="badge big-status ${esc(String(x.status || 'pending').toLowerCase())}">${esc(x.status || 'pending')}</span></div><p style="color:var(--muted);font-weight:900">${esc(statusMeaning(x.status))}</p>${timelineHtml('order', x.status)}<div class="detail-grid"><div><b>ID</b><span>#${esc(x.id)}</span></div><div><b>Type</b><span>Order</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Shop</b><span>${esc(x.shop_name || 'GOVO Order')}<br>${esc(x.merchant_phone || '')}</span></div><div><b>Merchant Status</b><span>${esc(merchantState)}<br>${esc(x.merchant_note || 'No merchant note')}</span></div><div><b>Pickup</b><span>${esc(x.pickup_location)}</span></div><div><b>Drop / Details</b><span>${esc(x.drop_location)}<br>${esc(x.item_details)}</span></div><div><b>Rider</b><span>${esc(riderName)}<br>${esc(riderPhone)}<br>${esc(x.rider_note || 'No rider note')}</span></div><div><b>Notes</b><span>Admin: ${esc(x.admin_note || 'No note')}<br>Customer: ${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Updated</b><span>${esc(bdTime(x.updated_at || x.created_at))}</span></div></div><div class="actions"><a class="btn secondary" href="/track/order/${encodeURIComponent(x.id)}">Open Tracking Link</a></div></div>`;
}

function trackingServiceCard(x) {
  return `<div class="card"><div class="section-head"><h2>Service Request #${esc(x.id)}</h2><span class="badge big-status ${esc(String(x.status || 'pending').toLowerCase())}">${esc(x.status || 'pending')}</span></div><p style="color:var(--muted);font-weight:900">${esc(statusMeaning(x.status))}</p>${timelineHtml('service', x.status)}<div class="detail-grid"><div><b>ID</b><span>#${esc(x.id)}</span></div><div><b>Type</b><span>Service</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Provider</b><span>${esc(x.provider_name || 'GOVO Provider')}<br>${esc(x.provider_phone || '')}</span></div><div><b>Provider Status</b><span>${esc(x.status || 'pending')}<br>${esc(x.provider_note || 'No provider note')}</span></div><div><b>Service Address</b><span>${esc(x.service_address)}</span></div><div><b>Problem Details</b><span>${esc(x.problem_details)}</span></div><div><b>Notes</b><span>Admin: ${esc(x.admin_note || 'No note')}<br>Customer: ${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Updated</b><span>${esc(bdTime(x.updated_at || x.created_at))}</span></div></div><div class="actions"><a class="btn secondary" href="/track/service/${encodeURIComponent(x.id)}">Open Tracking Link</a></div></div>`;
}

async function fetchTrackingResults({ id = '', phone = '', type = '' }) {
  const out = { orders: [], services: [] };
  if (type !== 'service') {
    if (id && phone) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 10`, [id, phone])).rows;
    else if (id) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE id=$1 ORDER BY id DESC LIMIT 10`, [id])).rows;
    else if (phone) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone])).rows;
  }
  if (type !== 'order') {
    if (id && phone) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 10`, [id, phone])).rows;
    else if (id) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE id=$1 ORDER BY id DESC LIMIT 10`, [id])).rows;
    else if (phone) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone])).rows;
  }
  return out;
}

function renderTrackPage({ id = '', phone = '', orders = [], services = [], direct = false }) {
  const searched = !!(id || phone || direct);
  const orderHtml = orders.map(trackingOrderCard).join('');
  const serviceHtml = services.map(trackingServiceCard).join('');
  const empty = searched && !orders.length && !services.length ? `<section class="card"><h2>No tracking found</h2><p style="color:var(--muted)">Check your order/request ID or phone number. Contact GOVO if you need help.</p><div class="actions"><a class="btn" href="/app">Home</a><a class="btn secondary" href="/shops">Shops</a><a class="btn secondary" href="/services">Services</a></div></section>` : '';
  return page('Track GOVO', `<section class="card app-hero"><span class="pill">Unified Tracking</span><h1>Track order or service request</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Search by tracking ID, request ID, or phone number. GOVO checks both delivery orders and service requests.</p><form method="GET" action="/track"><label>Order / Request ID</label><input name="id" value="${esc(id)}" placeholder="Example: 12"><label>Phone Number</label><input name="phone" value="${esc(phone)}" placeholder="017xxxxxxxx"><button>Check Status</button></form><div class="actions"><a class="btn secondary" href="/app">Home</a><a class="btn secondary" href="/shops">Shops</a><a class="btn secondary" href="/services">Services</a></div></section>${orderHtml ? `<section class="card"><div class="section-head"><h2>Delivery Orders</h2><span class="pill">${orders.length}</span></div></section><section class="cards">${orderHtml}</section>` : ''}${serviceHtml ? `<section class="card"><div class="section-head"><h2>Service Requests</h2><span class="pill">${services.length}</span></div></section><section class="cards">${serviceHtml}</section>` : ''}${empty}`, 'track');
}

app.get('/track', async (req, res, next) => {
  try {
    const id = String(req.query.id || '').trim();
    const phone = String(req.query.phone || '').trim();
    const results = await fetchTrackingResults({ id, phone });
    res.send(renderTrackPage({ id, phone, orders: results.orders, services: results.services }));
  } catch (e) { next(e); }
});

app.get('/track/:type/:id', async (req, res, next) => {
  try {
    const type = String(req.params.type || '').trim().toLowerCase();
    if (!['order', 'service'].includes(type)) return res.status(404).send(renderTrackPage({ direct: true }));
    const id = String(req.params.id || '').trim();
    const results = await fetchTrackingResults({ id, type });
    res.send(renderTrackPage({ id, orders: results.orders, services: results.services, direct: true }));
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
    if (!phone) return res.send(page('Merchant Dashboard', `<section class="card app-hero"><h1>Merchant Dashboard</h1><p>Login with your merchant phone to manage shop orders.</p><form method="GET" action="/merchant/dashboard"><label>Phone</label><input name="phone" required placeholder="01XXXXXXXXX"><button>Open Dashboard</button></form><div class="actions"><a class="btn secondary" href="/merchant">Join Merchant</a><a class="btn secondary" href="/app">Back to App</a></div></section>`, 'merchant'));
    const check = await approvedMerchantByPhone(phone);
    if (!check.lead) return res.send(page('Merchant Dashboard', '<section class="card"><h1>No merchant found</h1><a class="btn" href="/merchant">Register Merchant</a></section>', 'merchant'));
    if (!check.approved) return res.send(page('Merchant Dashboard', `<section class="card"><h1>Merchant Pending</h1><p>Merchant status is ${esc(check.lead.status || 'pending')}.</p><a class="btn secondary" href="/app">Back to App</a></section>`, 'merchant'));
    const m = check.lead;
    const prof = (await pool.query(`SELECT * FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone])).rows[0] || {};
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE merchant_lead_id=$1 OR merchant_phone=$2 OR merchant_phone=$3 OR shop_name=$4 ORDER BY id DESC LIMIT 100`, [m.id, m.phone || '', m.whatsapp || '', m.shop_name || '']);
    const orderActions = (x) => `<form method="POST" action="/merchant/order/status"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="merchant_note" value="${esc(x.merchant_note || '')}" placeholder="Merchant note"><div class="three"><button name="status" value="accepted">Accept</button><button name="status" value="preparing">Preparing</button><button name="status" value="ready">Ready</button></div><div class="actions"><button class="reject" name="status" value="rejected">Reject</button></div></form>`;
    const orderCards = orders.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.customer_name || 'Customer')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Item Details</b><span>${esc(x.item_details)}</span></div><div><b>Pickup Address</b><span>${esc(x.pickup_location)}</span></div><div><b>Delivery Address</b><span>${esc(x.drop_location)}</span></div><div><b>Notes</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Merchant Status</b><span>${esc(x.merchant_status || 'No update')}<br>${esc(x.merchant_note || 'No merchant note')}</span></div><div><b>Status</b><span>${esc(x.status || 'pending')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div>${orderActions(x)}<div class="actions"><a class="btn secondary" href="/track/order/${encodeURIComponent(x.id)}">Track</a></div></div>`).join('');
    const items = await pool.query(`SELECT id, item_name, price, details FROM govo_shop_items WHERE merchant_phone=$1 AND COALESCE(is_active,true)=true ORDER BY id DESC LIMIT 50`, [phone]);
    const itemHtml = items.rows.map((i) => `<div class="item-box"><b>${esc(i.item_name || '')}</b><span>${esc(i.price || '')}</span><br><span>${esc(i.details || '')}</span><div class="actions"><a class="btn secondary" href="/merchant/item/${encodeURIComponent(i.id)}/delete?phone=${encodeURIComponent(phone)}">Remove</a></div></div>`).join('');
    res.send(page('Merchant Dashboard', `<section class="card app-hero"><h1>Merchant Dashboard</h1>${listingImage(m.image_url || prof.logo_image, m.shop_name, true)}<div class="detail-grid"><div><b>Shop</b><span>${esc(m.shop_name || '')}</span></div><div><b>Phone</b><span>${esc(m.whatsapp || m.phone || phone)}</span></div><div><b>Category</b><span>${esc(m.category || '')}</span></div><div><b>Status</b><span>${badge(m.status)}</span></div><div><b>Trust</b><span>${trustBadges(m)}</span></div><div><b>Rating</b><span>${esc(ratingText(m))}</span></div></div><div class="actions"><a class="btn" href="/merchant/products?phone=${encodeURIComponent(phone)}">Products</a><a class="btn secondary" href="#orders">Orders</a><a class="btn secondary" href="/track">Track</a><a class="btn secondary" href="/app">Back to App</a></div></section><section class="card"><h2>Shop Profile</h2><form method="POST" action="/merchant/profile" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><label>Shop Name</label><input name="shop_name" value="${esc(prof.shop_name || m.shop_name || '')}" required><label>Owner Name</label><input name="owner_name" value="${esc(prof.owner_name || m.owner_name || '')}"><label>Location</label><input name="location" value="${esc(prof.location || m.location || '')}"><label>Category</label><input name="category" value="${esc(prof.category || m.category || '')}"><label>Opening Hours</label><input name="opening_hours" value="${esc(prof.opening_hours || '')}"><label>Delivery Area</label><input name="delivery_area" value="${esc(prof.delivery_area || '')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(prof.whatsapp || m.whatsapp || '')}"><label>Description</label><textarea name="description">${esc(prof.description || m.shop_description || '')}</textarea><label>Shop Image / Logo</label><input type="file" name="shop_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(m.image_url || prof.logo_image || '')}" placeholder="Optional existing image URL"><button>Save Shop Info</button></form></section><section class="card"><h2>Add Product / Service</h2><form method="POST" action="/merchant/item"><input type="hidden" name="phone" value="${esc(phone)}"><label>Item Name</label><input name="item_name" required><label>Price</label><input name="price"><label>Details</label><textarea name="details"></textarea><button>Add Item</button></form><h2>Current Items</h2><div class="item-grid">${itemHtml || '<p>No item added yet.</p>'}</div></section><section class="card" id="orders"><div class="section-head"><h2>Incoming Orders</h2><span class="pill">${esc(orders.rows.length)} orders</span></div><p style="color:var(--muted);font-weight:900">Next action: accept, prepare, mark ready, or reject.</p></section><section class="cards">${orderCards || '<div class="card"><h2>No orders yet</h2><p style="color:var(--muted);font-weight:900">Customer orders from your shop will appear here.</p></div>'}</section>`, 'merchant'));
  } catch (e) { next(e); }
});

app.post('/merchant/profile', imageUpload.single('shop_image'), async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const check = await approvedMerchantByPhone(phone);
    if (!check.approved) return res.status(403).send(page('Not Approved', '<section class="card"><h1>Not Approved</h1></section>'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || check.lead.image_url || '').trim();
    const existingProfile = await pool.query(`SELECT id FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone]);
    await pool.query(`UPDATE govo_merchant_leads SET shop_name=$1, owner_name=$2, location=$3, category=$4, shop_description=$5, whatsapp=$6, image_url=$7, updated_at=NOW() WHERE id=$8`, [req.body.shop_name, req.body.owner_name, req.body.location, req.body.category, req.body.description, req.body.whatsapp, imageUrl, check.lead.id]);
    if (existingProfile.rows.length) {
      await pool.query(`UPDATE govo_merchant_profiles SET merchant_lead_id=$1, shop_name=$2, owner_name=$3, location=$4, category=$5, description=$6, opening_hours=$7, delivery_area=$8, whatsapp=$9, logo_image=$10, status='published', updated_at=NOW() WHERE phone=$11`, [check.lead.id, req.body.shop_name, req.body.owner_name, req.body.location, req.body.category, req.body.description, req.body.opening_hours, req.body.delivery_area, req.body.whatsapp, imageUrl, phone]);
    } else {
      await pool.query(`INSERT INTO govo_merchant_profiles (merchant_lead_id, shop_name, owner_name, phone, location, category, description, opening_hours, delivery_area, whatsapp, logo_image, status, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',NOW())`, [check.lead.id, req.body.shop_name, req.body.owner_name, phone, req.body.location, req.body.category, req.body.description, req.body.opening_hours, req.body.delivery_area, req.body.whatsapp, imageUrl]);
    }
    res.redirect(`/merchant/dashboard?phone=${encodeURIComponent(phone)}`);
  } catch (e) { next(e); }
});

app.post('/merchant/order/status', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const check = await approvedMerchantByPhone(phone);
    if (!check.approved) return res.status(403).send(page('Not Approved', '<section class="card"><h1>Not Approved</h1></section>', 'merchant'));
    const m = check.lead;
    const allowed = ['accepted', 'preparing', 'ready', 'rejected'];
    let status = String(req.body.status || '').trim().toLowerCase();
    if (!allowed.includes(status)) status = 'accepted';
    const updated = await pool.query(`UPDATE govo_orders SET status=$1, merchant_status=$1, merchant_note=$2, updated_at=NOW() WHERE id=$3 AND (merchant_lead_id=$4 OR merchant_phone=$5 OR merchant_phone=$6 OR shop_name=$7) RETURNING *`, [status, String(req.body.merchant_note || ''), String(req.body.id || ''), m.id, m.phone || '', m.whatsapp || '', m.shop_name || '']);
    if (updated.rows.length) {
      const x = updated.rows[0];
      await sendTelegram(['GOVO Merchant Order Update', '', `Order ID: #${x.id}`, `Shop: ${x.shop_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Merchant Note: ${x.merchant_note || 'N/A'}`, `Customer: ${x.customer_name || ''}`, `Customer Phone: ${x.customer_phone || ''}`, `Delivery: ${x.drop_location || ''}`, `Item: ${x.item_details || ''}`].join('\n'));
    }
    res.redirect(`/merchant/dashboard?phone=${encodeURIComponent(phone)}#orders`);
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
      let status = String(req.body.status || 'accepted').trim().toLowerCase();
      if (status === 'merchant_confirmed') status = 'accepted';
      if (!['accepted', 'preparing', 'ready', 'rejected'].includes(status)) status = 'accepted';
      const updated = await pool.query(`UPDATE govo_orders SET status=$1, merchant_status=$1, merchant_note=$2, updated_at=NOW() WHERE id=$3 AND (merchant_lead_id=$4 OR merchant_phone=$5 OR merchant_phone=$6 OR shop_name=$7) RETURNING *`, [status, String(req.body.merchant_note || ''), String(req.body.id || ''), m.id, m.phone || '', m.whatsapp || '', m.shop_name || '']);
      if (updated.rows.length) {
        const x = updated.rows[0];
        sendTelegram(['GOVO Merchant Order Update', '', `Order ID: #${x.id}`, `Shop: ${x.shop_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Merchant Note: ${x.merchant_note || 'N/A'}`, `Customer: ${x.customer_name || ''}`, `Drop: ${x.drop_location || ''}`, `Item: ${x.item_details || ''}`].join('\n')).catch(() => {});
      }
      return res.redirect(`/merchant/orders?phone=${encodeURIComponent(phone)}`);
    }
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE merchant_phone=$1 OR merchant_phone=$2 OR shop_name=$3 ORDER BY id DESC LIMIT 100`, [m.phone || '', m.whatsapp || '', m.shop_name || '']);
    const cards = orders.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.customer_name || '')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.customer_phone)}</span></div><div><b>Drop</b><span>${esc(x.drop_location)}</span></div><div><b>Item</b><span>${esc(x.item_details)}</span></div><div><b>Rider</b><span>${esc(x.rider_name || 'Not assigned')}</span></div></div><form method="POST" action="/merchant/orders"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="merchant_note" placeholder="Merchant note"><div class="three"><button name="status" value="accepted">Accept</button><button name="status" value="preparing">Preparing</button><button name="status" value="ready">Ready</button></div></form></div>`).join('');
    res.send(page('Merchant Orders', `<section class="card"><h1>Merchant Orders</h1><p>Shop: ${esc(m.shop_name || '')}</p></section><section class="cards">${cards || '<div class="card"><h2>No orders found</h2></div>'}</section>`, 'merchant'));
  } catch (e) { next(e); }
});

app.all('/rider/dashboard', async (req, res, next) => {
  try {
    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    if (!phone) return res.send(page('Rider Dashboard', `<section class="card app-hero"><h1>Rider Dashboard</h1><p>Login with your registered phone number to see assigned delivery orders.</p><form method="GET" action="/rider/dashboard"><label>Rider Phone</label><input name="phone" required placeholder="01XXXXXXXXX"><button>Open Dashboard</button></form><div class="actions"><a class="btn secondary" href="/rider">Join as Rider</a><a class="btn secondary" href="/app">Back to App</a></div></section>`, 'rider'));
    const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, location, area, vehicle_type, COALESCE(status,'pending') AS status FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!rider.rows.length) return res.send(page('Rider Not Found', `<section class="card"><h1>Rider Not Found</h1><p>No rider profile found for ${esc(phone)}.</p><div class="actions"><a class="btn" href="/rider">Register Rider</a><a class="btn secondary" href="/rider/dashboard">Try Another Phone</a></div></section>`, 'rider'));
    const rd = rider.rows[0];
    const riderStatus = String(rd.status || 'pending').toLowerCase();
    const isApproved = riderStatus === 'approved';
    if (req.method === 'POST') {
      const allowed = ['accepted', 'picked_up', 'delivered', 'failed'];
      const status = String(req.body.status || '').trim().toLowerCase();
      if (!isApproved) return res.status(403).send(page('Rider Pending', `<section class="card"><h1>Approval Required</h1><p>Your rider profile is ${esc(rd.status)}. GOVO admin must approve the rider before order updates.</p><a class="btn secondary" href="/rider/dashboard?phone=${encodeURIComponent(phone)}">Back Dashboard</a></section>`, 'rider'));
      if (!allowed.includes(status)) return res.status(400).send(page('Invalid Status', `<section class="card"><h1>Invalid rider action</h1><a class="btn secondary" href="/rider/dashboard?phone=${encodeURIComponent(phone)}">Back Dashboard</a></section>`, 'rider'));
      const updated = await pool.query(`UPDATE govo_orders SET status=$1, rider_note=$2, updated_at=NOW() WHERE id=$3 AND (rider_phone=$4 OR assigned_rider_phone=$4) RETURNING *`, [status, String(req.body.rider_note || ''), String(req.body.id || ''), phone]);
      if (updated.rows.length) {
        const o = updated.rows[0];
        await sendTelegram([`GOVO Rider Order Update`, `Order: #${o.id}`, `Status: ${status}`, `Rider: ${rd.rider_name || ''} (${rd.phone || ''})`, `Customer: ${o.customer_name || ''} (${o.customer_phone || ''})`, `Pickup: ${o.pickup_location || ''}`, `Delivery: ${o.drop_location || ''}`].join('\n'));
      }
      return res.redirect(`/rider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE rider_phone=$1 OR assigned_rider_phone=$1 ORDER BY id DESC LIMIT 100`, [phone]);
    const actionButtons = (x) => `<form method="POST" action="/rider/dashboard"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="rider_note" value="${esc(x.rider_note || '')}" placeholder="Rider note optional"><div class="three"><button name="status" value="accepted">Accept</button><button name="status" value="picked_up">Picked Up</button><button name="status" value="delivered">Delivered</button></div><div class="actions"><button class="reject" name="status" value="failed">Mark Failed</button></div></form>`;
    const cards = orders.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.shop_name || 'GOVO Order')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Pickup Address</b><span>${esc(x.pickup_location)}</span></div><div><b>Delivery Address</b><span>${esc(x.drop_location)}</span></div><div><b>Item Details</b><span>${esc(x.item_details)}</span></div><div><b>Customer Notes</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Order Status</b><span>${esc(x.status || 'pending')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Rider Note</b><span>${esc(x.rider_note || 'No rider note')}</span></div></div>${isApproved ? actionButtons(x) : '<p style="color:var(--muted);font-weight:900">Rider actions unlock after admin approval.</p>'}<div class="actions"><a class="btn secondary" href="/track/order/${encodeURIComponent(x.id)}">Track Order</a></div></div>`).join('');
    res.send(page('Rider Dashboard', `<section class="card app-hero"><h1>Rider Dashboard</h1><div class="detail-grid"><div><b>Name</b><span>${esc(rd.rider_name || 'Rider')}</span></div><div><b>Phone</b><span>${esc(rd.phone)}</span></div><div><b>Area</b><span>${esc(rd.area || rd.location || 'Not set')}</span></div><div><b>Status</b><span>${badge(rd.status)}</span></div><div><b>Vehicle</b><span>${esc(rd.vehicle_type || 'Not set')}</span></div><div><b>Orders</b><span>${esc(orders.rows.length)}</span></div></div><div class="actions"><a class="btn secondary" href="/rider/dashboard">Switch Rider</a><a class="btn secondary" href="/app">Back to App</a></div></section><section class="card"><h2>Assigned Orders</h2><p style="color:var(--muted);font-weight:900">Next action: accept, pick up, deliver, or mark failed.</p></section><section class="cards">${cards || '<div class="card"><h2>No assigned orders</h2><p style="color:var(--muted);font-weight:900">New orders will appear here after admin dispatch.</p></div>'}</section>`, 'rider'));
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
  return `<div class="card">${listingImage(x.image_url, x.provider_name)}<div class="actions" style="justify-content:space-between"><h2>${esc(x.provider_name || '')}</h2><span class="pill">${esc(x.service_type || 'Service')}</span></div>${trustBadges(x)}<div class="detail-grid"><div><b>Phone</b><span>${esc(x.whatsapp || x.phone)}</span></div><div><b>Area</b><span>${esc(x.area)}</span></div><div><b>Address</b><span>${esc(x.address)}</span></div><div><b>Experience</b><span>${esc(x.experience)}</span></div><div><b>About</b><span>${esc(x.description || 'Details coming soon')}</span></div><div><b>Status</b><span>${badge(x.status)}</span></div></div><div class="actions"><a class="btn" href="/service/${encodeURIComponent(x.id)}">View Service</a><a class="btn secondary" href="/service/${encodeURIComponent(x.id)}">Request Service</a><a class="btn secondary" href="tel:${esc(x.whatsapp || x.phone || '')}">Call</a></div></div>`;
}

async function approvedProviders() {
  return pool.query(`SELECT * FROM govo_service_providers WHERE COALESCE(status,'pending')='approved' ORDER BY id DESC LIMIT 500`);
}


const pilotLinks = [
  ['Customer App', 'https://merchant.govoexpress.com/app'],
  ['Join Merchant', 'https://merchant.govoexpress.com/merchant'],
  ['Join Provider', 'https://merchant.govoexpress.com/provider'],
  ['Join Rider', 'https://rider.govoexpress.com/rider'],
  ['Track Order', 'https://merchant.govoexpress.com/track'],
];

function shareCards() {
  return `<section class="card"><h2>Share GOVO Pilot Links</h2><div class="cards">${pilotLinks.map(([label, href]) => `<div class="card"><h2>${esc(label)}</h2><input value="${esc(href)}" readonly onclick="this.select()"><div class="actions"><a class="btn secondary" href="${href}">Open</a></div></div>`).join('')}</div></section>`;
}

function steps(items) {
  return `<div class="item-grid">${items.map((x, i) => `<div class="item-box"><b>${i + 1}. ${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div>`;
}

function pilotContact() {
  const phone = process.env.GOVO_CONTACT_PHONE || process.env.CONTACT_PHONE || process.env.ADMIN_PHONE || '';
  const whatsapp = process.env.GOVO_WHATSAPP || process.env.WHATSAPP || phone;
  if (whatsapp) return `<a class="btn secondary" href="https://wa.me/${esc(String(whatsapp).replace(/\D/g, ''))}">Contact GOVO</a>`;
  return '<span class="pill">Contact GOVO: local team / WhatsApp coming soon</span>';
}

app.get('/pilot', (req, res) => {
  res.send(page('GOVO Pilot', `<section class="card app-hero"><span class="pill">Pilot Launch</span><h1>GOVO Express Pilot — Meherpur Super App</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Customers can order from shops, request services, and track status. Merchants can list products, providers can receive jobs, and riders can handle delivery.</p><div class="actions"><a class="btn" href="/app">Open App</a><a class="btn secondary" href="/merchant">Join Merchant</a><a class="btn secondary" href="/provider">Join Provider</a><a class="btn secondary" href="/rider">Join Rider</a><a class="btn secondary" href="/track">Track Order</a>${pilotContact()}</div></section><section class="grid"><div class="card"><h2>Customers</h2><p>Order food/products, request services, and track delivery/service status from one GOVO app.</p></div><div class="card"><h2>Merchants</h2><p>Create shop profile, add products, receive orders, and update order status.</p></div><div class="card"><h2>Providers</h2><p>Show service profile, trust badges, emergency availability, and receive requests.</p></div><div class="card"><h2>Riders</h2><p>Get assigned orders and update accept, picked up, delivered or failed status.</p></div></section>${shareCards()}`, 'app'));
});

app.get('/pilot/merchant', (req, res) => {
  res.send(page('Merchant Pilot', `<section class="card app-hero"><h1>GOVO Merchant Pilot</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">More customers, online product list, delivery support, and order tracking for local shops.</p><div class="actions"><a class="btn" href="/merchant">Register Merchant</a><a class="btn secondary" href="/pilot">Pilot Home</a></div></section><section class="card"><h2>Benefits</h2>${steps([['More Customers','Customers can find your shop from GOVO.'],['Online Product List','Add products, prices, photos and availability.'],['Delivery Support','GOVO can dispatch riders for delivery orders.'],['Order Tracking','Customer, merchant, admin and rider can follow status.']])}</section><section class="card"><h2>Required Info</h2><p>Shop name, owner name, phone, area, category, product photos.</p></section><section class="card"><h2>How It Works</h2>${steps([['Register','Submit shop information.'],['Admin Approve','GOVO verifies and approves the shop.'],['Add Products','Upload product/menu details.'],['Receive Orders','Accept, prepare, ready or reject orders.']])}</section>${shareCards()}`, 'merchant'));
});

app.get('/pilot/provider', (req, res) => {
  res.send(page('Provider Pilot', `<section class="card app-hero"><h1>GOVO Provider Pilot</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Get more service requests with a GOVO profile, trust badge, and emergency availability.</p><div class="actions"><a class="btn" href="/provider">Register Provider</a><a class="btn secondary" href="/pilot">Pilot Home</a></div></section><section class="card"><h2>Benefits</h2>${steps([['More Requests','Customers can request your service directly.'],['Profile Page','Show service type, area, experience and photo.'],['Trust Badge','Verified/trusted badges help customers choose.'],['Emergency Availability','Show urgent availability when enabled.']])}</section><section class="card"><h2>Required Info</h2><p>Name, phone, service type, area, experience, photo.</p></section><section class="card"><h2>How It Works</h2>${steps([['Register','Submit provider information.'],['Admin Approve','GOVO verifies and approves profile.'],['Receive Request','Customer submits problem details.'],['Complete Job','Accept, work, complete or reject requests.']])}</section>${shareCards()}`, 'provider'));
});

app.get('/pilot/rider', (req, res) => {
  res.send(page('Rider Pilot', `<section class="card app-hero"><h1>GOVO Rider Pilot</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Earn from delivery work with assigned orders and simple mobile status updates.</p><div class="actions"><a class="btn" href="/rider">Register Rider</a><a class="btn secondary" href="/pilot">Pilot Home</a></div></section><section class="card"><h2>Benefits</h2>${steps([['Delivery Earning','Receive delivery assignments from GOVO admin.'],['Assigned Orders','See pickup, delivery, customer and item details.'],['Simple Updates','Accept, picked up, delivered or failed buttons.']])}</section><section class="card"><h2>Required Info</h2><p>Name, phone, area, vehicle type.</p></section><section class="card"><h2>How It Works</h2>${steps([['Register','Submit rider details.'],['Admin Approve','GOVO approves rider profile.'],['Receive Assigned Orders','Admin dispatches orders to rider.'],['Deliver','Update delivery status from mobile dashboard.']])}</section>${shareCards()}`, 'rider'));
});

app.get('/app', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const [merchantResult, providerResult] = await Promise.all([approvedMerchants(), approvedProviders()]);
    const merchants = merchantResult.rows;
    const providers = providerResult.rows;
    const matchedMerchants = q ? merchants.filter((x) => merchantSearchText(x).includes(q)).slice(0, 8) : merchants.filter((x) => boolish(x.is_verified) || boolish(x.is_trusted)).slice(0, 6);
    const matchedProviders = q ? providers.filter((x) => providerSearchText(x).includes(q)).slice(0, 8) : providers.filter((x) => boolish(x.is_trusted) || boolish(x.is_verified)).slice(0, 6);
    const emergencyProviders = providers.filter((x) => boolish(x.emergency_available) && boolish(x.is_available)).slice(0, 6);
    const cats = ['food','grocery','pharmacy','electronics','fashion','agriculture','technician','home-service','doctor','transport','house-rent'].map((slug) => categoryForSlug(slug)).filter(Boolean);
    const categoryGrid = cats.map((cat) => `<a class="card" style="text-decoration:none;padding:14px" href="/category/${encodeURIComponent(cat.slug)}"><div style="font-size:28px">${cat.icon}</div><h2 style="font-size:18px;margin:8px 0 4px">${esc(cat.title.replace(' / Restaurant','').replace(' / Mobile',''))}</h2><p style="color:var(--muted);margin:0;font-size:13px">${esc(cat.desc)}</p></a>`).join('');
    res.send(page('GOVO Customer App', `
      <section class="card app-hero">
        <span class="pill">Meherpur Super App</span>
        <h1>GOVO Express — Meherpur Super App</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">Order food, find local shops, book services, request emergency help and track deliveries from one place.</p>
        <form method="GET" action="/app" style="margin-top:14px"><input name="q" value="${esc(q)}" placeholder="Search shops, services, products, location"><button>Search GOVO</button></form>
      </section>
      <section class="card"><h2>Quick Actions</h2><div class="quick-grid">
        <a class="btn" href="/shops">Shops</a><a class="btn" href="/services">Request Service</a><a class="btn secondary" href="/services?q=emergency">Emergency Service</a><a class="btn secondary" href="/track">Track</a><a class="btn secondary" href="/order">Order</a><a class="btn secondary" href="/merchant">Join Merchant</a><a class="btn secondary" href="/provider">Join Provider</a><a class="btn secondary" href="/category/food">Food</a>
      </div></section>
      <section class="card"><div class="section-head"><h2>Explore GOVO</h2><span class="pill">Popular</span></div><div class="item-grid">${categoryGrid}</div></section>
      <section class="card"><div class="section-head"><h2>${q ? 'Search Results: Shops' : 'Featured Verified Shops'}</h2><a class="btn secondary" href="/shops${q ? `?q=${encodeURIComponent(q)}` : ''}">View All</a></div></section>
      <section class="cards">${matchedMerchants.map(compactMerchantCard).join('') || '<div class="card"><h2>No matching shop</h2><p style="color:var(--muted)">Try searching by product, shop, category or location.</p></div>'}</section>
      <section class="card"><div class="section-head"><h2>${q ? 'Search Results: Services' : 'Featured Trusted Providers'}</h2><a class="btn secondary" href="/services${q ? `?q=${encodeURIComponent(q)}` : ''}">View All</a></div></section>
      <section class="cards">${matchedProviders.map(compactProviderCard).join('') || '<div class="card"><h2>No matching service</h2><p style="color:var(--muted)">Try searching by service, area, provider name or phone.</p></div>'}</section>
      <section class="card"><div class="section-head"><h2>Emergency Available Services</h2><a class="btn secondary" href="/services?q=emergency">View</a></div></section>
      <section class="cards">${emergencyProviders.map(compactProviderCard).join('') || '<div class="card"><h2>No emergency provider online</h2><p style="color:var(--muted)">Call GOVO or browse all services.</p><a class="btn" href="/services">Browse Services</a></div>'}</section>
    `, 'app'));
  } catch (e) { next(e); }
});

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
    if (!phone) return res.send(page('Provider Dashboard', `<section class="card app-hero"><h1>Provider Dashboard</h1><p>Login with your provider phone to manage service requests.</p><form method="GET" action="/provider/dashboard"><label>Provider Phone</label><input name="phone" required placeholder="01XXXXXXXXX"><button>Open Dashboard</button></form><div class="actions"><a class="btn secondary" href="/provider">Register Provider</a><a class="btn secondary" href="/services">Services</a><a class="btn secondary" href="/app">Back to App</a></div></section>`, 'services'));
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!provider.rows.length) return res.send(page('Provider Not Found', '<section class="card"><h1>Provider Not Found</h1><a class="btn" href="/provider">Register Provider</a></section>', 'services'));
    const p = provider.rows[0];
    if (req.method === 'POST' && req.body.action === 'profile') {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || p.image_url || '').trim();
      await pool.query(`UPDATE govo_service_providers SET provider_name=$1, whatsapp=$2, service_type=$3, area=$4, address=$5, experience=$6, description=$7, image_url=$8, updated_at=NOW() WHERE id=$9`, [req.body.provider_name || '', req.body.whatsapp || '', req.body.service_type || '', req.body.area || '', req.body.address || '', req.body.experience || '', req.body.description || '', imageUrl, p.id]);
      return res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    if (req.method === 'POST' && req.body.action === 'request_status') {
      const allowed = ['accepted', 'working', 'completed', 'rejected'];
      const status = allowed.includes(String(req.body.status || '').toLowerCase()) ? String(req.body.status).toLowerCase() : 'accepted';
      const updated = await pool.query(`UPDATE govo_service_requests SET status=$1, provider_note=$2, updated_at=NOW() WHERE id=$3 AND (provider_id=$4 OR provider_phone=$5) RETURNING *`, [status, req.body.provider_note || '', req.body.request_id || '', p.id, p.phone || '']);
      if (updated.rows.length) {
        const x = updated.rows[0];
        await sendTelegram(['GOVO Provider Request Update', '', `Request ID: #${x.id}`, `Provider: ${p.provider_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Customer: ${x.customer_name || ''}`, `Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`].join('\n'));
      }
      return res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}#requests`);
    }
    const fresh = (await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1`, [p.id])).rows[0] || p;
    const requests = await pool.query(`SELECT *, COALESCE(customer_note,note,'') AS display_note FROM govo_service_requests WHERE provider_id=$1 OR provider_phone=$2 ORDER BY id DESC LIMIT 100`, [fresh.id, fresh.phone || '']);
    const requestActions = (x) => `<form method="POST" action="/provider/request/status"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="request_id" value="${esc(x.id)}"><input name="provider_note" value="${esc(x.provider_note || '')}" placeholder="Provider note"><div class="three"><button name="status" value="accepted">Accept</button><button name="status" value="working">Working</button><button name="status" value="completed">Complete</button></div><div class="actions"><button class="reject" name="status" value="rejected">Reject</button></div></form>`;
    const requestCards = requests.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.customer_name || 'Customer')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Service Address</b><span>${esc(x.service_address)}</span></div><div><b>Problem Details</b><span>${esc(x.problem_details)}</span></div><div><b>Preferred Time</b><span>${esc(x.preferred_time || 'Any time')}</span></div><div><b>Notes</b><span>${esc(x.display_note || 'No note')}</span></div><div><b>Provider Note</b><span>${esc(x.provider_note || 'No provider note')}</span></div><div><b>Status</b><span>${esc(x.status || 'pending')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div>${requestActions(x)}<div class="actions"><a class="btn secondary" href="/track/service/${encodeURIComponent(x.id)}">Track Request</a></div></div>`).join('');
    res.send(page('Provider Dashboard', `<section class="card app-hero"><h1>Provider Dashboard</h1>${listingImage(fresh.image_url, fresh.provider_name, true)}<div class="detail-grid"><div><b>Name</b><span>${esc(fresh.provider_name || '')}</span></div><div><b>Phone</b><span>${esc(fresh.whatsapp || fresh.phone || phone)}</span></div><div><b>Service Type</b><span>${esc(fresh.service_type || '')}</span></div><div><b>Area</b><span>${esc(fresh.area || '')}</span></div><div><b>Status</b><span>${badge(fresh.status)}</span></div><div><b>Trust</b><span>${trustBadges(fresh)}</span></div><div><b>Rating</b><span>${esc(ratingText(fresh))}</span></div><div><b>Requests</b><span>${esc(requests.rows.length)}</span></div></div><div class="actions"><a class="btn" href="#requests">My Requests</a><a class="btn secondary" href="/services">Services</a><a class="btn secondary" href="/track">Track</a><a class="btn secondary" href="/app">Back to App</a></div></section><section class="card"><h2>Provider Profile</h2><form method="POST" action="/provider/dashboard" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="action" value="profile"><label>Provider Name</label><input name="provider_name" value="${esc(fresh.provider_name || '')}" required><label>WhatsApp</label><input name="whatsapp" value="${esc(fresh.whatsapp || '')}"><label>Service Type</label><input name="service_type" value="${esc(fresh.service_type || '')}" required><label>Area</label><input name="area" value="${esc(fresh.area || '')}" required><label>Address</label><textarea name="address">${esc(fresh.address || '')}</textarea><label>Experience</label><input name="experience" value="${esc(fresh.experience || '')}"><label>Description</label><textarea name="description">${esc(fresh.description || '')}</textarea><label>Profile / Service Image</label><input type="file" name="provider_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(fresh.image_url || '')}"><button>Save Profile</button></form><div class="actions"><a class="btn secondary" href="/service/${encodeURIComponent(fresh.id)}">Public Page</a><a class="btn secondary" href="/services">Services</a></div></section><section class="card" id="requests"><div class="section-head"><h2>Service Requests</h2><span class="pill">${esc(requests.rows.length)} requests</span></div><p style="color:var(--muted);font-weight:900">Next action: accept, start working, complete, or reject.</p></section><section class="cards">${requestCards || '<div class="card"><h2>No requests yet</h2><p style="color:var(--muted);font-weight:900">Customer service requests will appear here.</p></div>'}</section>`, 'services'));
  } catch (e) { next(e); }
});

app.post('/provider/request/status', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!provider.rows.length) return res.status(404).send(page('Provider Not Found', '<section class="card"><h1>Provider Not Found</h1></section>', 'services'));
    const p = provider.rows[0];
    const allowed = ['accepted', 'working', 'completed', 'rejected'];
    const status = allowed.includes(String(req.body.status || '').toLowerCase()) ? String(req.body.status).toLowerCase() : 'accepted';
    const updated = await pool.query(`UPDATE govo_service_requests SET status=$1, provider_note=$2, updated_at=NOW() WHERE id=$3 AND (provider_id=$4 OR provider_phone=$5) RETURNING *`, [status, req.body.provider_note || '', req.body.request_id || '', p.id, p.phone || '']);
    if (updated.rows.length) {
      const x = updated.rows[0];
      await sendTelegram(['GOVO Provider Request Update', '', `Request ID: #${x.id}`, `Provider: ${p.provider_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Customer: ${x.customer_name || ''}`, `Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`].join('\n'));
    }
    res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}#requests`);
  } catch (e) { next(e); }
});

app.get('/services', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedProviders();
    let rows = q ? all.rows.filter((x) => providerSearchText(x).includes(q) || (q === 'emergency' && boolish(x.emergency_available))) : all.rows.slice(0, 30);
    const chips = serviceCategories.map((cat) => chip(`${cat.icon} ${cat.title}`, `/services?q=${encodeURIComponent(cat.title)}`)).join('');
    const cards = rows.map(providerCard).join('');
    res.send(page('GOVO Services', `
      <section class="card app-hero"><span class="pill">GOVO Services</span><h1>Book trusted local service providers</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Find approved providers for repair, health, agriculture, transport, rent and home support.</p><form method="GET" action="/services"><input name="q" value="${esc(q)}" placeholder="Search service, area, name, phone"><button>Search Services</button></form><div class="toolbar"><a class="btn secondary" href="/app">Home</a><a class="btn secondary" href="/shops">Shops</a><a class="btn secondary" href="/provider">Become Provider</a></div></section>
      <section class="card"><div class="section-head"><h2>Service Categories</h2><span class="pill">${serviceCategories.length}</span></div><div class="chips">${chips}</div></section>
      <section class="card"><div class="section-head"><h2>${q ? 'Service Search Results' : 'Featured Trusted Providers'}</h2><span class="pill">${rows.length} showing</span></div></section>
      <section class="cards">${cards || '<div class="card"><h2>No service provider found</h2><p style="color:var(--muted)">Try another service, area, phone number or provider name.</p><div class="actions"><a class="btn" href="/services">Clear Search</a><a class="btn secondary" href="/app">Back to App</a></div></div>'}</section>
    `, 'services'));
  } catch (e) { next(e); }
});

function normalizeServiceRequestBody(body = {}) {
  return {
    provider_id: String(body.provider_id || '').trim(),
    service_type: String(body.service_type || '').trim(),
    customer_name: String(body.customer_name || '').trim(),
    customer_phone: String(body.customer_phone || '').trim(),
    service_address: String(body.service_address || '').trim(),
    problem_details: String(body.problem_details || '').trim(),
    preferred_time: String(body.preferred_time || '').trim(),
    notes: String(body.notes || body.note || '').trim(),
  };
}

function serviceRequestForm(provider, data = {}, error = '') {
  return `${error ? `<section class="card"><h1>Check request details</h1><p style="color:#fecaca;font-weight:900">${esc(error)}</p></section>` : ''}<section class="card" id="request_form"><h2>Request This Service</h2><p style="color:var(--muted)">Problem ta short kore likhun. GOVO team/provider review kore status update dibe.</p><form method="POST" action="/service/request"><input type="hidden" name="provider_id" value="${esc(provider.id || data.provider_id || '')}"><input type="hidden" name="service_type" value="${esc(provider.service_type || data.service_type || '')}"><label>Your Name</label><input name="customer_name" value="${esc(data.customer_name || '')}" required><label>Your Phone</label><input name="customer_phone" value="${esc(data.customer_phone || '')}" required><label>Service Address</label><textarea name="service_address" required>${esc(data.service_address || '')}</textarea><label>Problem Details</label><textarea name="problem_details" required placeholder="Example: fan not working / pipe leakage / doctor appointment needed">${esc(data.problem_details || '')}</textarea><label>Preferred Time <span style="color:var(--muted)">(optional)</span></label><input name="preferred_time" value="${esc(data.preferred_time || '')}" placeholder="Today 5 PM / Tomorrow morning"><label>Notes</label><textarea name="notes" placeholder="Any extra instruction">${esc(data.notes || data.note || '')}</textarea><button>Submit Service Request</button></form><div class="actions"><a class="btn secondary" href="/services">Back to Services</a><a class="btn secondary" href="/track">Track Request</a></div></section>`;
}

function serviceDetailPage(provider, data = {}, error = '') {
  return page(provider.provider_name || 'GOVO Service', `<section class="card app-hero"><a class="btn secondary" href="/services">Back to Services</a><h1>${esc(provider.provider_name || '')}</h1>${listingImage(provider.image_url, provider.provider_name, true)}${trustBadges(provider)}<div class="detail-grid"><div><b>Service Type</b><span>${esc(provider.service_type)}</span></div><div><b>Area</b><span>${esc(provider.area)}</span></div><div><b>Address</b><span>${esc(provider.address)}</span></div><div><b>Phone / WhatsApp</b><span>${esc(provider.whatsapp || provider.phone || 'Available after request')}</span></div><div><b>Experience</b><span>${esc(provider.experience)}</span></div><div><b>Rating</b><span>${esc(ratingText(provider))}</span></div><div><b>Description</b><span>${esc(provider.description || 'Details coming soon')}</span></div></div><div class="actions"><a class="btn" href="#request_form">Request Now</a><a class="btn secondary" href="/track">Track Request</a></div></section>${serviceRequestForm(provider, data, error)}`, 'services');
}

app.get('/service/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [req.params.id]);
    const provider = r.rows[0];
    if (!provider) return res.status(404).send(page('Service Not Found', `<section class="card"><h1>Service Not Found</h1><p>This provider is not approved or not found.</p><a class="btn" href="/services">Back Services</a></section>`, 'services'));
    res.send(serviceDetailPage(provider));
  } catch (e) { next(e); }
});

app.post('/service/request', async (req, res, next) => {
  try {
    const data = normalizeServiceRequestBody(req.body);
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [data.provider_id || '']);
    const p = provider.rows[0];
    if (!p) return res.status(404).send(page('Provider Not Found', `<section class="card"><h1>Provider Not Found</h1><a class="btn" href="/services">Back Services</a></section>`, 'services'));
    const missing = [];
    for (const [field, label] of [['provider_id', 'Provider'], ['customer_name', 'Your name'], ['customer_phone', 'Your phone'], ['service_address', 'Service address'], ['problem_details', 'Problem details']]) {
      if (!data[field]) missing.push(label);
    }
    if (missing.length) return res.status(400).send(serviceDetailPage(p, data, `Please fill: ${missing.join(', ')}`));
    const saved = await pool.query(`INSERT INTO govo_service_requests (provider_id, provider_name, provider_phone, service_type, customer_name, customer_phone, service_address, problem_details, preferred_time, note, customer_note, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',NOW(),NOW()) RETURNING *`, [p.id, p.provider_name || '', p.phone || '', data.service_type || p.service_type || '', data.customer_name, data.customer_phone, data.service_address, data.problem_details, data.preferred_time, data.notes, data.notes]);
    const x = saved.rows[0];
    sendTelegram(['New GOVO Service Request', '', `Request ID: #${x.id}`, `Provider: ${x.provider_name || ''}`, `Provider Phone: ${x.provider_phone || ''}`, `Service: ${x.service_type || ''}`, `Customer: ${x.customer_name || ''}`, `Customer Phone: ${x.customer_phone || ''}`, `Address: ${x.service_address || ''}`, `Problem: ${x.problem_details || ''}`, `Preferred: ${x.preferred_time || ''}`, `Note: ${x.note || 'N/A'}`].join('\n')).catch(() => {});
    res.redirect(`/service/request/success?id=${encodeURIComponent(x.id)}&phone=${encodeURIComponent(x.customer_phone || '')}`);
  } catch (e) { next(e); }
});

app.get('/service/request/success', (req, res) => {
  const id = String(req.query.id || '');
  const phone = String(req.query.phone || '');
  res.send(page('Service Request Submitted', `<section class="card app-hero"><span class="pill">Request Received</span><h1>Service Request Submitted</h1><p>GOVO team and provider will review your request.</p><h2>Request ID: #${esc(id)}</h2><p style="color:var(--muted);font-weight:900">Customer phone: ${esc(phone || 'Not provided')}</p><div class="timeline"><div class="step done">Submitted</div><div class="step">Provider/Admin Review</div><div class="step">Working</div><div class="step">Completed</div></div><div class="actions"><a class="btn" href="/track/service/${encodeURIComponent(id)}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}">Track Request</a><a class="btn secondary" href="/services">Back to Services</a><a class="btn secondary" href="/app">Back to App</a></div></section>`, 'services'));
});

app.get('/admin/reviews', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(target_type,'') || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(customer_phone,'') || ' ' || COALESCE(comment,'')) LIKE $${params.length}`); }
    const reviews = await pool.query(`SELECT id, target_type, target_id, customer_name, customer_phone, rating, comment, COALESCE(status,'approved') AS status, created_at FROM govo_reviews ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const cards = reviews.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.target_type || 'review')} ${esc(x.rating || '')}/5</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Target</b><span>${esc(x.target_type)} #${esc(x.target_id)}</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Comment</b><span>${esc(x.comment)}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div></div>`).join('');
    res.send(page('Admin Reviews', `<section class="card"><h1>Admin Reviews</h1><form class="filters" method="GET" action="/admin/reviews"><input name="q" value="${esc(q)}" placeholder="Search reviews"><button>Search</button></form></section><section class="cards">${cards || '<div class="card"><h2>No reviews found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.get('/admin/providers', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = ['pending', 'approved', 'rejected', 'all'].includes(String(req.query.status || 'pending').trim().toLowerCase()) ? String(req.query.status || 'pending').trim().toLowerCase() : 'pending';
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    if (status !== 'all') { where.push(approvalStatusWhere()[status]); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(provider_name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(whatsapp,'') || ' ' || COALESCE(service_type,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`); }
    const providers = await pool.query(`SELECT *, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status FROM govo_service_providers ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const cards = providers.rows.map((x) => `<div class="card"><div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.provider_name || '')}</h2>${badge(x.status)}</div>${trustBadges(x)}<div class="detail-grid"><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>WhatsApp</b><span>${esc(x.whatsapp)}</span></div><div><b>Service</b><span>${esc(x.service_type)}</span></div><div><b>Area</b><span>${esc(x.area)}</span></div><div><b>Address</b><span>${esc(x.address)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/admin/provider/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminTrustControls('provider', x, pin)}<div class="actions"><a class="btn secondary" href="/provider/dashboard?phone=${encodeURIComponent(x.phone || '')}">Dashboard</a><a class="btn secondary" href="/service/${encodeURIComponent(x.id)}">Service Page</a></div></div>`).join('');
    res.send(page('Admin Providers', `<section class="card"><h1>Admin Providers</h1>${approvalFilterLinks('/admin/providers', status)}<form class="filters" method="GET" action="/admin/providers"><input name="q" value="${esc(q)}" placeholder="Search provider, phone, service, area"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a></div></section><section class="cards">${cards || '<div class="card"><h2>No provider found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/provider/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const status = normalizeStatus(req.body.status);
    const r = await pool.query(`UPDATE govo_service_providers SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, req.body.admin_note || '', req.body.id || '']);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Provider Status Updated', '', `Provider ID: #${x.id}`, `Name: ${x.provider_name || ''}`, `Phone: ${x.phone || ''}`, `Service: ${x.service_type || ''}`, `Area: ${x.area || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/providers`);
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
    res.redirect(`/admin/providers`);
  } catch (e) { next(e); }
});

app.get('/admin/service-requests', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    const allowedFilters = ['pending', 'accepted', 'working', 'completed', 'rejected'];
    if (status !== 'all' && allowedFilters.includes(status)) { params.push(status); where.push(`COALESCE(sr.status,'pending')=$${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(CAST(sr.id AS TEXT) || ' ' || COALESCE(sr.provider_name,'') || ' ' || COALESCE(sr.provider_phone,'') || ' ' || COALESCE(sr.service_type,'') || ' ' || COALESCE(sr.customer_name,'') || ' ' || COALESCE(sr.customer_phone,'') || ' ' || COALESCE(sr.service_address,'') || ' ' || COALESCE(sr.problem_details,'') || ' ' || COALESCE(sp.area,'')) LIKE $${params.length}`); }
    const requests = await pool.query(`SELECT sr.*, COALESCE(sr.customer_note,sr.note,'') AS display_note, sp.area AS provider_area FROM govo_service_requests sr LEFT JOIN govo_service_providers sp ON sp.id=sr.provider_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sr.id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='pending')::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='working')::int working, COUNT(*) FILTER (WHERE COALESCE(status,'pending')='completed')::int completed FROM govo_service_requests`);
    const statusButton = (value, label, current, danger = false) => `<button class="${danger ? 'reject' : ''}" name="status" value="${esc(value)}" ${String(current || '').toLowerCase() === value ? 'style="outline:2px solid #bbf7d0"' : ''}>${esc(label)}</button>`;
    const cards = requests.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.service_type || 'Service')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Provider</b><span>${esc(x.provider_name)}<br>${esc(x.provider_phone)}<br>${esc(x.provider_area || '')}</span></div><div><b>Provider Status / Note</b><span>${esc(x.status || 'pending')}<br>${esc(x.provider_note || 'No provider note')}</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Service Address</b><span>${esc(x.service_address)}</span></div><div><b>Problem Details</b><span>${esc(x.problem_details)}</span></div><div><b>Preferred</b><span>${esc(x.preferred_time || 'Any time')}</span></div><div><b>Customer Note</b><span>${esc(x.display_note || 'No note')}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div><form method="POST" action="/admin/service-request/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" value="${esc(x.admin_note || '')}" placeholder="Admin note"><div class="three">${statusButton('pending', 'Pending', x.status)}${statusButton('accepted', 'Accepted', x.status)}${statusButton('working', 'Working', x.status)}</div><div class="three">${statusButton('completed', 'Completed', x.status)}${statusButton('rejected', 'Rejected', x.status, true)}</div></form></div>`).join('');
    const c = counts.rows[0] || {};
    const opt = (v, label) => `<option value="${v}" ${status === v ? 'selected' : ''}>${label}</option>`;
    res.send(page('Admin Service Requests', `<section class="grid"><div class="stat"><div class="label">Total</div><div class="value">${esc(c.total || 0)}</div></div><div class="stat"><div class="label">Pending</div><div class="value">${esc(c.pending || 0)}</div></div><div class="stat"><div class="label">Working</div><div class="value">${esc(c.working || 0)}</div></div><div class="stat"><div class="label">Completed</div><div class="value">${esc(c.completed || 0)}</div></div></section><section class="card"><h1>Admin Service Requests</h1><form class="filters" method="GET" action="/admin/service-requests"><input name="q" value="${esc(q)}" placeholder="Search ID, customer, provider, service, problem, area"><select name="status"><option value="all">All</option>${opt('pending','Pending')}${opt('accepted','Accepted')}${opt('working','Working')}${opt('completed','Completed')}${opt('rejected','Rejected')}</select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/providers">Providers</a><a class="btn secondary" href="/track">Track</a></div></section><section class="cards">${cards || '<div class="card"><h2>No service request found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/service-request/status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const allowed = ['pending', 'accepted', 'working', 'completed', 'rejected'];
    let status = String(req.body.status || 'pending').trim().toLowerCase();
    if (!allowed.includes(status)) status = 'pending';
    const r = await pool.query(`UPDATE govo_service_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, req.body.admin_note || '', req.body.id || '']);
    if (r.rows.length) {
      const x = r.rows[0];
      await sendTelegram(['GOVO Service Request Status Updated', '', `Request ID: #${x.id}`, `Status: ${String(x.status || '').toUpperCase()}`, `Provider: ${x.provider_name || ''}`, `Customer: ${x.customer_name || ''}`, `Customer Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`, `Admin Note: ${x.admin_note || 'N/A'}`].join('\n'));
    }
    res.redirect(`/admin/service-requests`);
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
