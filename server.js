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
const PORTAL_SESSION_SECRET = String(process.env.PORTAL_SESSION_SECRET || process.env.SESSION_SECRET || process.env.COOKIE_SECRET || 'govo-portal-session-secret').trim();
const MERCHANT_COOKIE = 'govo_merchant_session';
const RIDER_COOKIE = 'govo_rider_session';

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

function legacyAdminToken() {
  if (!ADMIN_PIN) return '';
  return crypto.createHmac('sha256', `${ADMIN_SESSION_SECRET}:${ADMIN_PIN}`).update('govo-admin-lock-v1').digest('hex');
}

function signAdminSession(ts) {
  if (!ADMIN_PIN) return '';
  return crypto.createHmac('sha256', `${ADMIN_SESSION_SECRET}:${ADMIN_PIN}`).update(`govo-admin-session-v1:${ts}`).digest('hex');
}

function adminCookieValue() {
  const ts = Date.now();
  const sig = signAdminSession(ts);
  return sig ? `v1.${ts}.${sig}` : '';
}

function validAdminCookieValue(value) {
  if (!ADMIN_PIN || !value) return false;
  const legacy = legacyAdminToken();
  if (legacy && safeEqual(value, legacy)) return true;
  const parts = String(value || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const ts = Number(parts[1]);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const maxAgeMs = 12 * 60 * 60 * 1000;
  if (Date.now() - ts > maxAgeMs) return false;
  return safeEqual(parts[2], signAdminSession(ts));
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function sessionCookieName(type) {
  return type === 'rider' ? RIDER_COOKIE : MERCHANT_COOKIE;
}

function sessionPath(type) {
  return type === 'rider' ? '/rider' : '/merchant';
}

function portalSessionSignature(type, id) {
  return crypto.createHmac('sha256', PORTAL_SESSION_SECRET).update(`${type}:${id}`).digest('hex');
}

function portalSessionValue(type, id) {
  return `${id}.${portalSessionSignature(type, id)}`;
}

function readPortalSession(req, type) {
  const raw = parseCookies(req)[sessionCookieName(type)];
  const parts = String(raw || '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return '';
  return safeEqual(parts[1], portalSessionSignature(type, parts[0])) ? parts[0] : '';
}

function setPortalSession(req, res, type, id) {
  res.cookie(sessionCookieName(type), portalSessionValue(type, id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: requestIsHttps(req),
    path: sessionPath(type),
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
}

function clearPortalSession(req, res, type) {
  res.clearCookie(sessionCookieName(type), {
    httpOnly: true,
    sameSite: 'lax',
    secure: requestIsHttps(req),
    path: sessionPath(type),
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    if (!password || !salt || !hash) return false;
    const calculated = crypto.pbkdf2Sync(String(password), String(salt), 120000, 32, 'sha256');
    const stored = Buffer.from(String(hash), 'hex');
    return stored.length === calculated.length && crypto.timingSafeEqual(calculated, stored);
  } catch {
    return false;
  }
}

function accountBadges(x = {}) {
  return `<div class="actions trust-row"><span class="badge ${x.password_hash ? 'available' : 'unavailable'}">${x.password_hash ? 'Password Set' : 'Password Not Set'}</span>${x.reset_requested_at ? '<span class="badge emergency">Reset Requested</span>' : '<span class="badge clear">No Reset Request</span>'}</div>`;
}

function adminPasswordResetForm(type, x = {}) {
  const action = type === 'merchant' ? '/admin/merchant/password-reset' : '/admin/rider/password-reset';
  return `<details class="card compact-card" style="margin-top:8px"><summary style="cursor:pointer;font-weight:900">Password Reset</summary><div style="margin-top:10px">${accountBadges(x)}<form method="POST" action="${action}"><input type="hidden" name="id" value="${esc(x.id || '')}"><label>Temporary Password</label><input name="temporary_password" type="password" minlength="6" placeholder="Minimum 6 characters" required><button>Set Temp Password</button></form>${x.reset_note ? `<p class="form-hint">Reset note: ${esc(x.reset_note)}</p>` : ''}</div></details>`;
}

function merchantLoginPage(prefill = '', message = '') {
  return page('Merchant Dashboard Login', `<section class="card app-hero"><h1>Merchant Dashboard</h1><p class="form-hint">Phone + password diye shop dashboard open korun.</p>${message ? `<p style="color:var(--warning);font-weight:900">${esc(message)}</p>` : ''}<form method="POST" action="/merchant/login"><label>Phone</label><input name="phone" value="${esc(prefill)}" required placeholder="01XXXXXXXXX"><label>Password</label><input name="password" type="password" required><button>Login</button></form><div class="actions"><a class="btn secondary" href="/merchant/account/create${prefill ? `?phone=${encodeURIComponent(prefill)}` : ''}">Create Account</a><a class="btn secondary" href="/merchant/forgot-password${prefill ? `?phone=${encodeURIComponent(prefill)}` : ''}">Forgot Password</a><a class="btn secondary" href="https://merchant.govoexpress.com/merchant">Register</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'merchant');
}

function riderLoginPage(prefill = '', message = '') {
  return page('Rider Login', `<section class="card app-hero"><h1>Rider Login</h1><p class="form-hint">Phone + password diye assigned delivery orders dekhun.</p>${message ? `<p style="color:var(--warning);font-weight:900">${esc(message)}</p>` : ''}<form method="POST" action="/rider/login"><label>Phone</label><input name="phone" value="${esc(prefill)}" required placeholder="01XXXXXXXXX"><label>Password</label><input name="password" type="password" required><button>Login</button></form><div class="actions"><a class="btn secondary" href="/rider/account/create${prefill ? `?phone=${encodeURIComponent(prefill)}` : ''}">Create Account</a><a class="btn secondary" href="/rider/forgot-password${prefill ? `?phone=${encodeURIComponent(prefill)}` : ''}">Forgot Password</a><a class="btn secondary" href="https://rider.govoexpress.com/rider/register">Register</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'rider');
}

function accountCreatePage(type, prefill = '', message = '') {
  const title = type === 'merchant' ? 'Create Merchant Account' : 'Create Rider Account';
  const action = type === 'merchant' ? '/merchant/account/create' : '/rider/account/create';
  const register = type === 'merchant' ? '/merchant' : '/rider/register';
  return page(title, `<section class="card app-hero"><h1>${esc(title)}</h1><p class="form-hint">Registered phone number diye password set korun. Notun ${type === 'merchant' ? 'shop' : 'rider'} hole age registration korun.</p>${message ? `<p style="color:var(--warning);font-weight:900">${esc(message)}</p>` : ''}<form method="POST" action="${action}"><label>Phone</label><input name="phone" value="${esc(prefill)}" required placeholder="01XXXXXXXXX"><label>Password</label><input name="password" type="password" minlength="6" required><label>Confirm Password</label><input name="confirm_password" type="password" minlength="6" required><button>Create Account</button></form><div class="actions"><a class="btn secondary" href="${register}">Register</a><a class="btn secondary" href="/${type === 'merchant' ? 'merchant/dashboard' : 'rider'}">Login</a></div></section>`, type === 'merchant' ? 'merchant' : 'rider');
}

function accountCreateSuccessPage(type, phone = '') {
  const title = type === 'merchant' ? 'Merchant Account Created' : 'Rider Account Created';
  const login = type === 'merchant' ? '/merchant/dashboard' : '/rider';
  return page(title, `<section class="card app-hero"><h1>${esc(title)}</h1><p class="form-hint">Password set hoyeche. Login kore dashboard open korun.</p><div class="actions"><a class="btn" href="${login}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}">Login</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, type);
}

function forgotPasswordPage(type, prefill = '', message = '') {
  const title = type === 'merchant' ? 'Merchant Password Reset' : 'Rider Password Reset';
  const action = type === 'merchant' ? '/merchant/forgot-password' : '/rider/forgot-password';
  return page(title, `<section class="card app-hero"><h1>${esc(title)}</h1><p class="form-hint">Phone submit korun. Account thakle admin reset request peye jabe.</p>${message ? `<p style="color:var(--success);font-weight:900">${esc(message)}</p>` : ''}<form method="POST" action="${action}"><label>Phone</label><input name="phone" value="${esc(prefill)}" required placeholder="01XXXXXXXXX"><label>Note <span style="color:var(--muted)">(optional)</span></label><textarea name="reset_note" placeholder="Example: password vule gechi"></textarea><button>Request Reset</button></form><div class="actions"><a class="btn secondary" href="/${type === 'merchant' ? 'merchant/dashboard' : 'rider'}">Back to Login</a></div></section>`, type === 'merchant' ? 'merchant' : 'rider');
}

function hasAdminCookie(req) {
  return validAdminCookieValue(parseCookies(req)[ADMIN_COOKIE]);
}

function requestIsHttps(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase() === 'https';
}

function setAdminCookie(req, res) {
  const value = adminCookieValue();
  if (!value) return;
  res.cookie(ADMIN_COOKIE, value, { httpOnly: true, sameSite: 'lax', secure: requestIsHttps(req), path: '/admin', maxAge: 12 * 60 * 60 * 1000 });
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
  return page('Admin Login', `<section class="card lock-card app-hero"><span class="pill">Admin Security</span><h1>GOVO Admin Login</h1><p>Enter the admin PIN to open the GOVO Control Center.</p>${message ? `<p style="color:#fecaca;font-weight:900">${esc(message)}</p>` : ''}<form method="POST" action="/admin/login"><label>Admin PIN</label><input name="admin_pin" type="password" placeholder="Admin PIN" required autofocus><button>Login</button></form><div class="actions"><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'admin');
}

function requireAdmin(req, res) {
  if (isAdminAuthorized(req)) return true;
  if (req.method === 'GET') return res.redirect('/admin/login'), false;
  res.status(403).send(page('Unauthorized', '<section class="card lock-card"><h1>Unauthorized</h1><p>Admin login required.</p><a class="btn" href="/admin/login">Admin Login</a></section>', 'admin'));
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

/* GOVO Final UI Designer Pass v3 */
:root,[data-theme="dark"]{--info:#38bdf8;--shadow:0 18px 50px rgba(0,0,0,.28);--soft:rgba(255,255,255,.045);--hero1:#102016;--hero2:#0f172a}
[data-theme="light"]{--info:#0284c7;--shadow:0 14px 34px rgba(15,23,42,.10);--soft:rgba(22,163,74,.055);--hero1:#e8f8ee;--hero2:#ffffff}
body{font-size:14px;line-height:1.45;background:linear-gradient(180deg,var(--bg),color-mix(in srgb,var(--bg) 92%,#000 8%))!important}.app{max-width:1080px;padding:14px}.topbar{position:relative!important;top:auto!important;border-radius:16px;margin-bottom:14px;box-shadow:var(--shadow);padding:12px}.brand-row{align-items:center}.brand{min-width:0}.brand h2{font-size:17px;letter-spacing:0}.brand p{font-size:11px}.logo{width:38px;height:38px;border-radius:11px;flex:0 0 auto}.nav{gap:7px;margin-top:10px;overflow-x:auto;scrollbar-width:thin}.nav a{border-radius:999px;font-size:12px;padding:8px 10px;white-space:nowrap}.admin-nav{position:relative}.card{border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 1px 0 rgba(255,255,255,.03)}.card h1{font-size:clamp(24px,5vw,40px);line-height:1.08;margin-bottom:10px}.card h2{font-size:18px;line-height:1.2;margin-bottom:8px}.card p{margin:6px 0 10px}.app-hero{border-color:color-mix(in srgb,var(--primary) 32%,var(--border));background:radial-gradient(circle at 12% 0%,rgba(34,197,94,.24),transparent 32%),linear-gradient(180deg,var(--hero1),var(--hero2))!important}.grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.cards{gap:10px}.stat{border-radius:13px;padding:12px}.stat .label{font-size:11px;letter-spacing:.02em}.stat .value{font-size:24px;margin-top:4px}.section-head{align-items:flex-start}.toolbar,.actions{gap:7px;margin:9px 0}.btn,button{border-radius:11px;min-height:38px;padding:9px 11px;font-size:13px;line-height:1.15}.actions .btn,.toolbar .btn,.actions button,.toolbar button{flex:0 1 auto}.three{gap:7px}.three button{width:100%}.quick-grid{grid-template-columns:repeat(auto-fit,minmax(116px,1fr));gap:8px}.quick-grid .btn{min-height:46px}.chips{gap:7px;padding-bottom:6px}.chips .btn{white-space:nowrap}.filters{grid-template-columns:minmax(180px,1fr) minmax(120px,.35fr) auto;gap:7px}form{gap:9px}label{font-size:13px}input,select,textarea{border-radius:11px;padding:10px 11px;font-size:14px;min-height:40px}textarea{min-height:82px}.detail-grid,.item-grid{gap:8px;margin:10px 0}.detail-grid div,.item-box{border-radius:11px;padding:9px}.detail-grid b,.item-box b{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.02em}.detail-grid span,.item-box span{font-size:14px;color:var(--text)}.badge,.pill{font-size:11px;padding:5px 8px;letter-spacing:.01em}.trust-row{margin:7px 0}.timeline{grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:7px;margin:10px 0}.step{border-radius:11px;padding:8px;font-size:11px}.bottom-nav{position:fixed!important;box-shadow:var(--shadow)}.bottom-nav a{font-size:11px}.table-wrap{border:1px solid var(--border);border-radius:12px}.admin-table{min-width:760px}.admin-table th,.admin-table td{padding:8px}.social-footer{padding:12px;text-align:center}.wa{background:#16a34a!important;color:#fff!important}.reject{background:var(--danger)!important}.header-actions .pill{display:none}.theme-toggle{box-shadow:none!important}.compact-record .card{padding:11px}.empty-state{border:1px dashed var(--border);background:var(--surface);border-radius:14px;padding:18px;text-align:center;color:var(--muted)}
.card form + form,.card form + .actions,.card .actions + form{margin-top:9px}.card img{box-shadow:0 8px 24px rgba(0,0,0,.16)}body.admin .card{padding:12px}.btn.secondary:hover,.nav a:hover{transform:translateY(-1px)}.btn,button,.nav a{transition:background .15s,border-color .15s,color .15s,transform .15s}.footer{padding:14px 0 10px}.lock-card{margin:28px auto}.public-contact{margin-top:8px}.group-note{font-size:13px}.big-status{font-size:14px;padding:7px 10px}.cards.compact{gap:8px}.cards.compact .card{padding:10px}.item-box .actions,.detail-grid .actions{margin-top:7px}
@media(max-width:760px){body{font-size:13px}.app{padding:10px 10px 78px}.topbar{border-radius:14px;padding:10px;margin-bottom:10px}.brand-row{align-items:flex-start}.brand{gap:9px}.logo{width:34px;height:34px}.brand h2{font-size:15px}.brand p{font-size:10px}.header-actions{width:auto;margin-left:auto}.theme-toggle{min-height:30px!important;padding:6px 8px!important;font-size:11px}.nav{margin-top:8px;padding-bottom:2px}.nav a{font-size:11px;padding:7px 9px}.card{padding:11px;border-radius:13px;margin-bottom:10px}.card h1{font-size:24px}.card h2{font-size:16px}.grid,.item-grid,.detail-grid,.filters,.three{grid-template-columns:1fr}.quick-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.quick-grid .btn{font-size:12px;min-height:42px;padding:8px}.toolbar,.actions{gap:6px}.toolbar .btn,.actions .btn,.toolbar button,.actions button{font-size:12px;min-height:36px;padding:8px 9px;width:auto}.actions form{width:100%}.actions form button{width:100%}.filters button{width:100%}.stat .value{font-size:21px}.timeline{grid-template-columns:repeat(2,minmax(0,1fr))}.bottom-nav{left:8px;right:8px;bottom:8px;border-radius:15px;padding:6px}.bottom-nav a{padding:7px 3px}.admin-table{min-width:640px}input,select,textarea{font-size:16px}.section-head{display:block}.section-head .btn,.section-head .pill{margin-top:6px}.trust-row{gap:5px}.badge,.pill{font-size:10px}.social-footer .toolbar{justify-content:flex-start}.app-hero{padding-top:13px;padding-bottom:13px}}
@media(min-width:761px){.cards{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.cards>.card{margin-bottom:0}.cards.compact{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.item-grid{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}}


/* GOVO Final UI QA Fix v4 */
.stat{min-height:88px;display:flex;flex-direction:column;justify-content:space-between}.stat p{font-size:12px;line-height:1.25;margin:4px 0 0}.card.compact-card{padding:11px}.listing-thumb{width:100%;height:132px;max-height:132px;object-fit:cover;border-radius:12px;border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));margin:0 0 9px;background:linear-gradient(135deg,var(--surface),var(--card));display:block}.listing-thumb.large{height:220px;max-height:220px}.image-placeholder{height:96px;border-radius:12px;border:1px dashed var(--border);background:linear-gradient(135deg,var(--surface),var(--card));display:grid;place-items:center;color:var(--muted);font-weight:900;font-size:12px;margin:0 0 9px}.image-placeholder.large{height:180px}.compact-card .section-head h2{font-size:16px;margin:0}.compact-meta{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0;color:var(--muted);font-size:12px}.compact-meta span{border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:4px 7px}.compact-card .trust-row{margin:6px 0}.compact-card .actions{margin-top:8px}.compact-card .btn{min-height:34px;font-size:12px;padding:7px 9px}.admin .grid{grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px}.admin .stat{min-height:78px;padding:10px}.admin .stat .value{font-size:22px}.admin .stat .label{font-size:10px}.admin .cards.compact .card{padding:9px;min-height:0}.admin .cards.compact h2{font-size:14px;margin:0}.admin .cards.compact p{font-size:12px;margin:4px 0}.admin .badge{font-size:10px;padding:4px 7px}.bottom-nav{max-width:560px;margin:0 auto}.public .app{padding-bottom:90px}.admin .app{padding-bottom:14px}.form-hint{color:var(--muted);font-size:13px;margin:0 0 10px}.empty-state,.cards>.card:only-child{min-height:0}.social-footer{margin-bottom:64px}
[data-theme="light"] body{background:linear-gradient(180deg,#edf8f1,#f8fcfa)!important}[data-theme="light"] .stat,[data-theme="light"] .compact-meta span{box-shadow:0 1px 0 rgba(15,23,42,.04)}[data-theme="dark"] .compact-meta span{background:rgba(255,255,255,.035)}
@media(max-width:760px){.admin .grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin .stat{min-height:72px}.admin .stat .value{font-size:20px}.listing-thumb{height:112px;max-height:112px}.listing-thumb.large{height:178px;max-height:178px}.image-placeholder{height:84px}.image-placeholder.large{height:150px}.cards{grid-template-columns:1fr}.compact-card .section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.compact-card .actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}.compact-card .actions .btn:nth-child(3){grid-column:1/-1}.public .app{padding-bottom:82px}.bottom-nav{left:8px;right:8px;padding:5px}.bottom-nav a{font-size:10px;padding:6px 2px}.app-hero p{font-size:14px!important}.app-hero form{margin-top:9px!important}.social-footer{margin-bottom:58px}}


/* GOVO Final Compact UX Fix v5 */
.admin-nav{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overscroll-behavior-x:contain;padding:2px 18px 4px 0;scrollbar-width:none;-webkit-overflow-scrolling:touch}.admin-nav::-webkit-scrollbar,.nav::-webkit-scrollbar,.chips::-webkit-scrollbar{display:none}.admin-nav a,.admin-nav button{flex:0 0 auto}.header-actions{flex:0 0 auto}.theme-toggle{min-width:auto!important;max-width:88px}.admin .topbar{overflow:hidden}.admin .grid{grid-template-columns:repeat(auto-fit,minmax(128px,1fr))!important}.admin .stat{min-height:66px!important;padding:8px!important;border-radius:11px}.admin .stat .label{font-size:9px!important;line-height:1.15}.admin .stat .value{font-size:19px!important;line-height:1;margin-top:2px}.admin .stat p{font-size:10px!important;line-height:1.15;margin:3px 0 0}.admin .card{padding:10px!important}.admin .card h1{font-size:22px}.admin .card h2{font-size:15px}.alert-clear{border-style:dashed;text-align:center}.alert-clear h2{color:var(--primary)!important}.activity-list{display:grid;gap:6px}.activity-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px;border:1px solid var(--border);border-radius:11px;background:var(--surface);text-decoration:none}.activity-row b{display:block;color:var(--text);font-size:13px}.activity-row span{display:block;color:var(--muted);font-size:11px;margin-top:2px}.admin .actions,.admin .toolbar{gap:5px}.admin .btn,.admin button{min-height:32px!important;padding:7px 8px!important;font-size:11px!important}.admin .three{gap:5px}.admin .detail-grid{gap:6px}.admin .detail-grid div{padding:7px}.admin .detail-grid b{font-size:10px}.listing-thumb{height:104px!important;max-height:104px!important}.image-placeholder{height:58px!important;max-height:58px!important;font-size:11px}.compact-card{min-height:0}.compact-card .trust-row{gap:4px}.compact-card .badge{font-size:9px;padding:4px 6px}.compact-meta{margin:5px 0}.compact-meta span{font-size:11px;padding:3px 6px}.compact-card .btn{min-height:31px!important;padding:6px 8px!important}.public .app{padding-bottom:104px}.bottom-nav{height:auto;max-height:54px}.bottom-nav a{line-height:1.05}.feature-section-empty{display:none!important}.form-hint{font-size:12px}.card.app-hero{padding-top:12px!important;padding-bottom:12px!important}
@media(max-width:760px){.brand-row{display:grid;grid-template-columns:1fr auto;align-items:start}.header-actions{grid-column:2;grid-row:1}.admin-nav{margin-right:-10px;padding-right:30px}.admin .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px}.admin .stat{min-height:62px!important}.admin .cards{gap:7px}.activity-row{padding:7px}.listing-thumb{height:90px!important;max-height:90px!important}.listing-thumb.large{height:150px!important;max-height:150px!important}.image-placeholder{height:46px!important;max-height:46px!important}.image-placeholder.large{height:118px!important;max-height:118px!important}.public .app{padding-bottom:112px}.social-footer{margin-bottom:70px}.compact-card .actions{grid-template-columns:1fr 1fr}.compact-card .actions .btn{font-size:11px!important}.quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.chips{margin-right:-10px;padding-right:18px}.filters{gap:6px}.card{margin-bottom:8px!important}}

`;

function adminNav(active) {
  const links = [
    ['Dashboard', '/admin/os'],
    ['Command', '/admin/command'],
    ['Orders', '/admin/orders'],
    ['Service Requests', '/admin/service-requests'],
    ['Support', '/admin/support'],
    ['Finance', '/admin/finance'],
    ['Onboarding', '/admin/onboarding'],
    ['Tasks', '/admin/tasks'],
    ['Merchants', '/admin/leads?filter=all'],
    ['Providers', '/admin/providers?filter=all'],
    ['Riders', '/admin/riders?filter=all'],
    ['WhatsApp', '/admin/whatsapp'],
    ['QA', '/admin/qa'],
    ['Launch', '/admin/launch-checklist'],
    ['Pilot', '/admin/pilot'],
    ['CRM', '/admin/pilot-crm'],
  ];
  return `<nav class="nav admin-nav">${links.map(([label, href]) => `<a class="${active === 'admin' && href === '/admin/os' ? 'active' : ''}" href="${href}">${label}</a>`).join('')}<a href="/admin/logout">Logout</a></nav>`;
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

function pageShell(title, content, options = {}) {
  const active = typeof options === 'string' ? options : (options.active || '');
  return page(title, content, active);
}


function homeStylePublicChromeV2() {
  return `
<style id="govo-home-style-public-chrome-v2">
  body.public .topbar{
    background:
      radial-gradient(circle at 18% 0%, rgba(34,197,94,.18), transparent 34%),
      linear-gradient(180deg, rgba(7,19,15,.98), rgba(7,19,15,.84)) !important;
    border:1px solid rgba(34,197,94,.20) !important;
    border-radius:0 0 28px 28px !important;
    box-shadow:0 18px 60px rgba(0,0,0,.32) !important;
    backdrop-filter:blur(18px) !important;
    padding:16px 18px !important;
    position:relative !important;
  }

  body.public .brand-row{
    display:flex !important;
    align-items:center !important;
    justify-content:space-between !important;
    gap:14px !important;
  }

  body.public .brand{
    display:flex !important;
    align-items:center !important;
    min-height:58px !important;
  }

  body.public .brand .logo,
  body.public .brand h2,
  body.public .brand p,
  body.public .brand > div:not(.govo-shell-wordmark-wrap){
    display:none !important;
  }

  body.public .govo-shell-wordmark{
    text-decoration:none !important;
    color:#f8fff8 !important;
    font-weight:950 !important;
    letter-spacing:-.09em !important;
    font-size:clamp(52px, 13vw, 76px) !important;
    line-height:.82 !important;
    white-space:nowrap !important;
    text-shadow:0 15px 45px rgba(0,0,0,.36) !important;
  }

  body.public .govo-shell-wordmark span{
    color:#22c55e !important;
    text-shadow:0 0 18px rgba(34,197,94,.82) !important;
    margin-left:.02em !important;
  }

  body.public .header-actions,
  body.public .theme-toggle,
  body.public #themeToggle,
  body.public .header-actions .pill{
    display:none !important;
  }

  body.public .topbar > .nav{
    display:none !important;
  }

  body.public #govo-shell-menu-btn{
    display:flex !important;
    width:56px !important;
    height:56px !important;
    border-radius:999px !important;
    align-items:center !important;
    justify-content:center !important;
    flex-direction:column !important;
    gap:5px !important;
    z-index:99999 !important;
    background:
      radial-gradient(circle at 35% 20%, rgba(34,197,94,.22), transparent 38%),
      rgba(7,19,15,.86) !important;
    border:1px solid rgba(34,197,94,.42) !important;
    box-shadow:0 16px 45px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08) !important;
    backdrop-filter:blur(18px) !important;
  }

  body.public #govo-shell-menu-btn span{
    display:block !important;
    width:24px !important;
    height:3px !important;
    border-radius:99px !important;
    background:#f4fff7 !important;
    box-shadow:0 0 12px rgba(34,197,94,.35) !important;
    transition:transform .22s ease, opacity .22s ease, width .22s ease !important;
  }

  body.public #govo-shell-menu-btn span:nth-child(2){
    width:17px !important;
    background:#22c55e !important;
  }

  body.public #govo-shell-menu-btn.open span:nth-child(1){
    transform:translateY(8px) rotate(45deg) !important;
  }

  body.public #govo-shell-menu-btn.open span:nth-child(2){
    opacity:0 !important;
    width:0 !important;
  }

  body.public #govo-shell-menu-btn.open span:nth-child(3){
    transform:translateY(-8px) rotate(-45deg) !important;
  }

  body.public #govo-shell-menu-panel{
    display:none !important;
    position:fixed !important;
    top:92px !important;
    right:16px !important;
    width:236px !important;
    z-index:999999 !important;
    padding:14px !important;
    border-radius:24px !important;
    background:
      radial-gradient(circle at 20% 0%, rgba(34,197,94,.16), transparent 44%),
      rgba(7,19,15,.96) !important;
    border:1px solid rgba(34,197,94,.38) !important;
    box-shadow:0 22px 70px rgba(0,0,0,.48) !important;
    backdrop-filter:blur(18px) !important;
  }

  body.public #govo-shell-menu-panel.open{
    display:block !important;
  }

  body.public #govo-shell-menu-panel a,
  body.public #govo-shell-menu-panel button{
    width:100% !important;
    min-height:48px !important;
    margin:6px 0 !important;
    border-radius:17px !important;
    display:flex !important;
    align-items:center !important;
    justify-content:center !important;
    text-decoration:none !important;
    font-weight:900 !important;
    color:#f4fff7 !important;
    background:rgba(255,255,255,.08) !important;
    border:1px solid rgba(255,255,255,.13) !important;
  }

  body.public #govo-shell-menu-panel button:first-child{
    color:#04110a !important;
    background:linear-gradient(135deg,#22c55e,#16a34a) !important;
  }

  body.public .app-hero,
  body.public .card{
    background:
      radial-gradient(circle at 12% 0%, rgba(34,197,94,.12), transparent 35%),
      rgba(255,255,255,.062) !important;
    border:1px solid rgba(255,255,255,.12) !important;
    box-shadow:0 18px 55px rgba(0,0,0,.22) !important;
    border-radius:26px !important;
  }

  body.public .btn,
  body.public button,
  body.public input[type="submit"]{
    border-radius:999px !important;
    font-weight:900 !important;
  }

  @media(max-width:720px){
    body.public .topbar{
      padding:16px 18px !important;
      border-radius:0 0 24px 24px !important;
    }

    body.public .govo-shell-wordmark{
      font-size:clamp(54px, 15vw, 78px) !important;
      max-width:68vw !important;
    }

    body.public #govo-shell-menu-btn{
      width:54px !important;
      height:54px !important;
      flex-shrink:0 !important;
    }

    body.public .app{
      padding-top:12px !important;
      padding-bottom:112px !important;
    }

    body.public h1{
      letter-spacing:-.045em !important;
      line-height:1.08 !important;
    }
  }
</style>

<script id="govo-home-style-public-chrome-v2">
(function(){
  function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn();}

  ready(function(){
    if(!document.body.classList.contains("public")) return;

    var FLOW = {
      app: "https://app.govoexpress.com/app",
      shops: "https://app.govoexpress.com/shops",
      services: "https://app.govoexpress.com/services",
      order: "https://app.govoexpress.com/order",
      serviceRequest: "https://app.govoexpress.com/service-request",
      support: "https://app.govoexpress.com/support",
      track: "https://app.govoexpress.com/track",
      merchantLogin: "https://merchant.govoexpress.com/merchant/dashboard",
      merchantJoin: "https://merchant.govoexpress.com/merchant",
      providerJoin: "https://merchant.govoexpress.com/provider",
      rider: "https://rider.govoexpress.com/rider"
    };

    var brand = document.querySelector(".topbar .brand");
    if(brand && !brand.querySelector(".govo-shell-wordmark")){
      brand.innerHTML = '<a class="govo-shell-wordmark" href="' + FLOW.app + '" aria-label="GOVO Home">GOVO<span>.</span></a>';
    }

    var row = document.querySelector(".topbar .brand-row");
    if(row && !document.getElementById("govo-shell-menu-btn")){
      var btn = document.createElement("button");
      btn.id = "govo-shell-menu-btn";
      btn.type = "button";
      btn.setAttribute("aria-label", "Open GOVO menu");
      btn.innerHTML = '<span></span><span></span><span></span>';
      row.appendChild(btn);

      var panel = document.createElement("div");
      panel.id = "govo-shell-menu-panel";
      panel.innerHTML =
        '<button type="button" id="govo-shell-theme-btn">☀️ / 🌙 Theme</button>' +
        '<a href="' + FLOW.app + '">🏠 App</a>' +
        '<a href="' + FLOW.shops + '">🏪 Shops</a>' +
        '<a href="' + FLOW.services + '">🛠️ Services</a>' +
        '<a href="' + FLOW.track + '">🔎 Track</a>' +
        '<a href="' + FLOW.support + '">☎️ Support</a>' +
        '<a href="' + FLOW.merchantLogin + '">🏬 Merchant Login</a>' +
        '<a href="' + FLOW.merchantJoin + '">➕ Merchant Join</a>' +
        '<a href="' + FLOW.rider + '">🏍️ Rider</a>';

      document.body.appendChild(panel);

      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        panel.classList.toggle("open");
        btn.classList.toggle("open", panel.classList.contains("open"));
      });

      panel.addEventListener("click", function(e){ e.stopPropagation(); });

      document.addEventListener("click", function(){
        panel.classList.remove("open");
        btn.classList.remove("open");
      });

      var themeBtn = document.getElementById("govo-shell-theme-btn");
      if(themeBtn){
        themeBtn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          if(window.govoToggleTheme) window.govoToggleTheme();
          else {
            document.body.classList.toggle("light");
            document.documentElement.classList.toggle("light");
          }
        });
      }
    }

    function setTarget(el, url){
      if(!el) return;
      if(el.tagName && el.tagName.toLowerCase()==="a"){
        el.href = url;
        el.target = "_self";
      }
    }

    document.querySelectorAll("a").forEach(function(el){
      var t=(el.textContent||"").trim().toLowerCase();
      var h=(el.getAttribute("href")||"").toLowerCase();

      if(t === "home" || t === "app" || h.endsWith("/app")) setTarget(el, FLOW.app);
      if(t.includes("shop") || h.endsWith("/shops")) setTarget(el, FLOW.shops);
      if((t.includes("service") && !t.includes("request")) || h.endsWith("/services")) setTarget(el, FLOW.services);
      if(t.includes("track") || h.endsWith("/track")) setTarget(el, FLOW.track);
      if(t.includes("support") || h.endsWith("/support")) setTarget(el, FLOW.support);
      if(t.includes("order") || h.endsWith("/order")) setTarget(el, FLOW.order);
      if(t.includes("request service") || t.includes("service request") || h.endsWith("/service-request")) setTarget(el, FLOW.serviceRequest);
      if(t.includes("merchant") && (t.includes("login") || t.includes("dashboard"))) setTarget(el, FLOW.merchantLogin);
      if(t.includes("merchant") && (t.includes("join") || t.includes("register"))) setTarget(el, FLOW.merchantJoin);
      if(t.includes("provider")) setTarget(el, FLOW.providerJoin);
      if(t.includes("rider")) setTarget(el, FLOW.rider);
    });
  });
})();
</script>
`;
}


function govoPublicShellCssV5() {
  return `
/* GOVO CLEAN PUBLIC SHELL V5 */
body.public{
  background:
    radial-gradient(circle at 18% 0%, rgba(34,197,94,.18), transparent 30%),
    radial-gradient(circle at 88% 18%, rgba(22,163,74,.12), transparent 34%),
    linear-gradient(180deg,#07130f 0%,#07110f 48%,#050b09 100%) !important;
  color:#f7fff8 !important;
}

body.public:before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:-1;
  opacity:.28;
  background-image:
    linear-gradient(rgba(34,197,94,.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34,197,94,.13) 1px, transparent 1px);
  background-size:72px 72px;
}

body.public .app{
  width:min(1120px,calc(100% - 32px)) !important;
  margin:0 auto !important;
  padding:0 0 118px !important;
}

body.public .govo-clean-topbar{
  margin:0 auto 30px !important;
  padding:18px 20px !important;
  border-radius:0 0 30px 30px !important;
  background:
    radial-gradient(circle at 15% 0%, rgba(34,197,94,.20), transparent 35%),
    linear-gradient(180deg, rgba(7,19,15,.98), rgba(7,19,15,.78)) !important;
  border:1px solid rgba(34,197,94,.22) !important;
  box-shadow:0 18px 65px rgba(0,0,0,.34) !important;
  backdrop-filter:blur(18px) !important;
}

body.public .govo-clean-row{
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
  gap:18px !important;
}

body.public .govo-clean-logo{
  text-decoration:none !important;
  color:#f8fff8 !important;
  font-weight:950 !important;
  letter-spacing:-.09em !important;
  font-size:clamp(64px,9vw,98px) !important;
  line-height:.78 !important;
  white-space:nowrap !important;
  text-shadow:0 14px 50px rgba(0,0,0,.44) !important;
}

body.public .govo-clean-logo span{
  color:#22c55e !important;
  text-shadow:0 0 20px rgba(34,197,94,.9) !important;
  margin-left:.015em !important;
}

body.public .govo-clean-menu-btn{
  width:58px !important;
  height:58px !important;
  border-radius:999px !important;
  display:flex !important;
  flex-direction:column !important;
  align-items:center !important;
  justify-content:center !important;
  gap:5px !important;
  background:
    radial-gradient(circle at 35% 20%, rgba(34,197,94,.22), transparent 38%),
    rgba(7,19,15,.86) !important;
  border:1px solid rgba(34,197,94,.45) !important;
  box-shadow:0 16px 45px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08) !important;
  backdrop-filter:blur(18px) !important;
  flex-shrink:0 !important;
  z-index:999999 !important;
  padding:0 !important;
}

body.public .govo-clean-menu-btn i{
  width:24px !important;
  height:3px !important;
  border-radius:99px !important;
  background:#f4fff7 !important;
  box-shadow:0 0 12px rgba(34,197,94,.36) !important;
  transition:transform .22s ease, opacity .22s ease, width .22s ease !important;
}

body.public .govo-clean-menu-btn i:nth-child(2){
  width:17px !important;
  background:#22c55e !important;
}

body.public.govo-clean-menu-open .govo-clean-menu-btn i:nth-child(1){
  transform:translateY(8px) rotate(45deg) !important;
}
body.public.govo-clean-menu-open .govo-clean-menu-btn i:nth-child(2){
  opacity:0 !important;
  width:0 !important;
}
body.public.govo-clean-menu-open .govo-clean-menu-btn i:nth-child(3){
  transform:translateY(-8px) rotate(-45deg) !important;
}

body.public .govo-clean-menu-panel{
  display:none !important;
  position:fixed !important;
  top:96px !important;
  right:18px !important;
  width:255px !important;
  z-index:999999 !important;
  padding:14px !important;
  border-radius:26px !important;
  background:
    radial-gradient(circle at 20% 0%, rgba(34,197,94,.18), transparent 44%),
    rgba(7,19,15,.96) !important;
  border:1px solid rgba(34,197,94,.40) !important;
  box-shadow:0 24px 75px rgba(0,0,0,.52) !important;
  backdrop-filter:blur(18px) !important;
}

body.public.govo-clean-menu-open .govo-clean-menu-panel{
  display:block !important;
}

body.public .govo-clean-menu-panel a,
body.public .govo-clean-menu-panel button{
  width:100% !important;
  min-height:50px !important;
  margin:7px 0 !important;
  border-radius:18px !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  text-decoration:none !important;
  font-weight:900 !important;
  color:#f4fff7 !important;
  background:rgba(255,255,255,.08) !important;
  border:1px solid rgba(255,255,255,.13) !important;
}

body.public .govo-clean-menu-panel button:first-child{
  color:#04110a !important;
  background:linear-gradient(135deg,#22c55e,#16a34a) !important;
}

/* kill all old public header fragments */
body.public .topbar:not(.govo-clean-topbar),
body.public .brand .logo,
body.public .brand h2,
body.public .brand p,
body.public .header-actions,
body.public .theme-toggle,
body.public #themeToggle,
body.public .topbar > .nav,
body.public #govo-shell-menu-btn,
body.public #govo-shell-menu-panel,
body.public #govo-public-menu-btn,
body.public #govo-public-menu-panel,
body.public #govo-more-btn,
body.public #govo-more-panel{
  display:none !important;
}

/* homepage-like cards and buttons */
body.public .app-hero,
body.public .card,
body.public .compact-card,
body.public .shop-card,
body.public .provider-card,
body.public .rider-card{
  border-radius:30px !important;
  background:
    radial-gradient(circle at 12% 0%, rgba(34,197,94,.14), transparent 38%),
    rgba(255,255,255,.062) !important;
  border:1px solid rgba(255,255,255,.13) !important;
  box-shadow:0 20px 70px rgba(0,0,0,.24) !important;
  backdrop-filter:blur(14px) !important;
}

body.public h1{
  color:#22c55e !important;
  letter-spacing:-.055em !important;
  line-height:1.05 !important;
  font-weight:950 !important;
  text-shadow:0 0 26px rgba(34,197,94,.18) !important;
}

body.public h2,
body.public h3{
  letter-spacing:-.035em !important;
  line-height:1.12 !important;
}

body.public p{
  color:rgba(244,255,247,.72) !important;
  line-height:1.72 !important;
}

body.public input,
body.public textarea,
body.public select{
  border-radius:20px !important;
  background:#020617 !important;
  border:1px solid rgba(255,255,255,.12) !important;
  color:#f8fff8 !important;
}

body.public .btn,
body.public button,
body.public input[type="submit"]{
  border-radius:999px !important;
  font-weight:900 !important;
}

body.public .btn:not(.secondary),
body.public button:not(.secondary),
body.public input[type="submit"]{
  background:linear-gradient(135deg,#22c55e,#16a34a) !important;
  color:#04110a !important;
  box-shadow:0 16px 40px rgba(34,197,94,.28) !important;
}

body.public .secondary,
body.public .btn.secondary,
body.public a.secondary{
  background:rgba(15,23,42,.88) !important;
  color:#f5fff7 !important;
  border:1px solid rgba(255,255,255,.12) !important;
}

body.public .bottom-nav{
  position:fixed !important;
  left:50% !important;
  bottom:18px !important;
  transform:translateX(-50%) !important;
  width:min(720px,calc(100% - 28px)) !important;
  padding:10px !important;
  border-radius:30px !important;
  background:rgba(4,12,22,.92) !important;
  border:1px solid rgba(34,197,94,.38) !important;
  box-shadow:0 20px 70px rgba(0,0,0,.42) !important;
  backdrop-filter:blur(18px) !important;
  z-index:99999 !important;
}

body.public .bottom-nav a{
  border-radius:999px !important;
  font-weight:900 !important;
}

@media(max-width:720px){
  body.public .app{
    width:100% !important;
    padding:0 18px 122px !important;
  }

  body.public .govo-clean-topbar{
    margin-left:-18px !important;
    margin-right:-18px !important;
    padding:15px 18px !important;
    border-radius:0 0 24px 24px !important;
  }

  body.public .govo-clean-logo{
    font-size:clamp(56px,16vw,82px) !important;
    max-width:70vw !important;
  }

  body.public .govo-clean-menu-btn{
    width:54px !important;
    height:54px !important;
  }

  body.public .govo-clean-menu-panel{
    top:86px !important;
    right:16px !important;
    width:240px !important;
  }

  body.public .app-hero,
  body.public .card{
    border-radius:26px !important;
  }

  body.public h1{
    font-size:clamp(34px,9vw,54px) !important;
  }
}
`;
}

function govoCleanPublicHeaderV5(isAdmin, nav) {
  if (isAdmin) {
    return `<header class="topbar"><div class="brand-row"><div class="brand"><div class="logo"></div><div><h2>GOVO</h2><p>Meherpur Super App</p></div></div><div class="header-actions"><span class="pill">Live System</span>${themeToggle()}</div></div>${nav}</header>`;
  }
  return `<header class="topbar govo-clean-topbar">
    <div class="brand-row govo-clean-row">
      <a class="govo-clean-logo" href="https://app.govoexpress.com/app">GOVO<span>.</span></a>
      <button type="button" class="govo-clean-menu-btn" onclick="document.body.classList.toggle('govo-clean-menu-open')" aria-label="Open GOVO menu"><i></i><i></i><i></i></button>
    </div>
    <nav class="govo-clean-menu-panel">
      <button type="button" onclick="window.govoToggleTheme ? window.govoToggleTheme() : document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light')">☀️ / 🌙 Theme</button>
      <a href="https://app.govoexpress.com/app">🏠 App</a>
      <a href="https://app.govoexpress.com/shops">🏪 Shops</a>
      <a href="https://app.govoexpress.com/services">🛠️ Services</a>
      <a href="https://app.govoexpress.com/track">🔎 Track</a>
      <a href="https://app.govoexpress.com/support">☎️ Support</a>
      <a href="https://merchant.govoexpress.com/merchant/dashboard">🏬 Merchant Login</a>
      <a href="https://merchant.govoexpress.com/merchant">➕ Merchant Join</a>
      <a href="https://rider.govoexpress.com/rider">🏍️ Rider</a>
    </nav>
  </header>`;
}

function govoCleanPublicRuntimeV5() {
  return `<script id="govo-clean-public-runtime-v5">
(function(){
  document.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.govo-clean-menu-btn');
    var panel = e.target.closest && e.target.closest('.govo-clean-menu-panel');
    if(!btn && !panel) document.body.classList.remove('govo-clean-menu-open');
  });
})();
</script>`;
}

function page(title, body, active = '') {
  const isAdmin = active === 'admin';

  const adminHeader = `<header class="topbar">
    <div class="brand-row">
      <div class="brand">
        <div class="logo"></div>
        <div><h2>GOVO</h2><p>Meherpur Super App</p></div>
      </div>
      <div class="header-actions"><span class="pill">Live System</span>${themeToggle()}</div>
    </div>
    ${adminNav(active)}
  </header>`;

  const publicHeader = `<header class="govo-final-topbar">
    <div class="govo-final-row">
      <a class="govo-final-logo" href="https://app.govoexpress.com/app">GOVO<span>.</span></a>
      <button type="button" class="govo-final-menu-btn" aria-label="Open GOVO menu" onclick="event.stopPropagation();document.body.classList.toggle('govo-final-open')">
        <i></i><i></i><i></i>
      </button>
    </div>
    <nav class="govo-final-panel">
      <button type="button" onclick="event.stopPropagation(); if(window.govoToggleTheme){window.govoToggleTheme()}">☀️ / 🌙 Theme</button>
      <a href="https://app.govoexpress.com/app">🏠 App</a>
      <a href="https://app.govoexpress.com/shops">🏪 Shops</a>
      <a href="https://app.govoexpress.com/services">🛠️ Services</a>
      <a href="https://app.govoexpress.com/track">🔎 Track</a>
      <a href="https://app.govoexpress.com/support">☎️ Support</a>
      <a href="https://merchant.govoexpress.com/merchant/dashboard">🏬 Merchant Login</a>
      <a href="https://merchant.govoexpress.com/merchant">➕ Merchant Join</a>
      <a href="https://rider.govoexpress.com/rider">🏍️ Rider</a>
    </nav>
  </header>`;

  const publicCss = isAdmin ? '' : `
    body.public{
      background:
        radial-gradient(circle at 18% 0%, rgba(34,197,94,.18), transparent 30%),
        radial-gradient(circle at 88% 18%, rgba(22,163,74,.12), transparent 34%),
        linear-gradient(180deg,#07130f 0%,#07110f 48%,#050b09 100%) !important;
      color:#f7fff8 !important;
    }
    body.public:before{
      content:"";position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.28;
      background-image:
        linear-gradient(rgba(34,197,94,.13) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,197,94,.13) 1px, transparent 1px);
      background-size:72px 72px;
    }
    body.public .app{
      width:min(1180px,calc(100% - 34px)) !important;
      margin:0 auto !important;
      padding:0 0 118px !important;
    }

    /* remove old mixed UI */
    body.public .topbar,
    body.public #govo-more-btn,
    body.public #govo-more-panel,
    body.public #govo-shell-menu-btn,
    body.public #govo-shell-menu-panel,
    body.public #govo-public-menu-btn,
    body.public #govo-public-menu-panel,
    body.public .theme-toggle,
    body.public #themeToggle,
    body.public .header-actions{
      display:none !important;visibility:hidden !important;pointer-events:none !important;
    }

    .govo-final-topbar{
      margin:0 auto 30px !important;
      padding:18px 22px !important;
      border-radius:0 0 30px 30px !important;
      background:
        radial-gradient(circle at 15% 0%, rgba(34,197,94,.20), transparent 35%),
        linear-gradient(180deg, rgba(7,19,15,.98), rgba(7,19,15,.78)) !important;
      border:1px solid rgba(34,197,94,.22) !important;
      box-shadow:0 18px 65px rgba(0,0,0,.34) !important;
      backdrop-filter:blur(18px) !important;
      position:relative !important;
      z-index:1000 !important;
    }
    .govo-final-row{
      display:flex !important;
      align-items:center !important;
      justify-content:space-between !important;
      gap:18px !important;
    }
    .govo-final-logo{
      text-decoration:none !important;
      color:#f8fff8 !important;
      font-weight:950 !important;
      letter-spacing:-.09em !important;
      font-size:clamp(66px,9vw,104px) !important;
      line-height:.78 !important;
      white-space:nowrap !important;
      text-shadow:0 14px 50px rgba(0,0,0,.44) !important;
    }
    .govo-final-logo span{
      color:#22c55e !important;
      text-shadow:0 0 22px rgba(34,197,94,.95) !important;
    }
    .govo-final-menu-btn{
      width:60px !important;height:60px !important;border-radius:999px !important;
      display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;
      gap:5px !important;
      background:radial-gradient(circle at 35% 20%,rgba(34,197,94,.22),transparent 38%),rgba(7,19,15,.86) !important;
      border:1px solid rgba(34,197,94,.45) !important;
      box-shadow:0 16px 45px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08) !important;
      padding:0 !important;flex-shrink:0 !important;
    }
    .govo-final-menu-btn i{
      width:25px !important;height:3px !important;border-radius:99px !important;
      background:#f4fff7 !important;box-shadow:0 0 12px rgba(34,197,94,.36) !important;
      transition:.22s !important;
    }
    .govo-final-menu-btn i:nth-child(2){width:18px !important;background:#22c55e !important;}
    body.public.govo-final-open .govo-final-menu-btn i:nth-child(1){transform:translateY(8px) rotate(45deg) !important;}
    body.public.govo-final-open .govo-final-menu-btn i:nth-child(2){opacity:0 !important;width:0 !important;}
    body.public.govo-final-open .govo-final-menu-btn i:nth-child(3){transform:translateY(-8px) rotate(-45deg) !important;}

    .govo-final-panel{
      display:none !important;
      position:fixed !important;top:96px !important;right:18px !important;width:260px !important;
      z-index:999999 !important;padding:14px !important;border-radius:26px !important;
      background:radial-gradient(circle at 20% 0%,rgba(34,197,94,.18),transparent 44%),rgba(7,19,15,.96) !important;
      border:1px solid rgba(34,197,94,.40) !important;
      box-shadow:0 24px 75px rgba(0,0,0,.52) !important;
      backdrop-filter:blur(18px) !important;
    }
    body.public.govo-final-open .govo-final-panel{display:block !important;}
    .govo-final-panel a,.govo-final-panel button{
      width:100% !important;min-height:50px !important;margin:7px 0 !important;border-radius:18px !important;
      display:flex !important;align-items:center !important;justify-content:center !important;
      text-decoration:none !important;font-weight:900 !important;
      color:#f4fff7 !important;background:rgba(255,255,255,.08) !important;border:1px solid rgba(255,255,255,.13) !important;
    }
    .govo-final-panel button:first-child{
      color:#04110a !important;background:linear-gradient(135deg,#22c55e,#16a34a) !important;
    }

    body.public .app-hero,
    body.public .card,
    body.public .compact-card,
    body.public .shop-card,
    body.public .provider-card,
    body.public .rider-card{
      border-radius:30px !important;
      background:radial-gradient(circle at 12% 0%,rgba(34,197,94,.14),transparent 38%),rgba(255,255,255,.062) !important;
      border:1px solid rgba(255,255,255,.13) !important;
      box-shadow:0 20px 70px rgba(0,0,0,.24) !important;
      backdrop-filter:blur(14px) !important;
    }
    body.public h1{
      color:#22c55e !important;
      letter-spacing:-.055em !important;
      line-height:1.05 !important;
      font-weight:950 !important;
      text-shadow:0 0 26px rgba(34,197,94,.18) !important;
    }
    body.public p{color:rgba(244,255,247,.72) !important;line-height:1.72 !important;}
    body.public input,body.public textarea,body.public select{
      border-radius:20px !important;background:#020617 !important;border:1px solid rgba(255,255,255,.12) !important;color:#f8fff8 !important;
    }
    body.public .btn,body.public input[type="submit"]{border-radius:999px !important;font-weight:900 !important;}
    body.public .btn:not(.secondary),body.public input[type="submit"]{
      background:linear-gradient(135deg,#22c55e,#16a34a) !important;color:#04110a !important;box-shadow:0 16px 40px rgba(34,197,94,.28) !important;
    }
    body.public .secondary,body.public .btn.secondary,body.public a.secondary{
      background:rgba(15,23,42,.88) !important;color:#f5fff7 !important;border:1px solid rgba(255,255,255,.12) !important;
    }
    body.public .bottom-nav{
      position:fixed !important;left:50% !important;bottom:18px !important;transform:translateX(-50%) !important;
      width:min(720px,calc(100% - 28px)) !important;padding:10px !important;border-radius:30px !important;
      background:rgba(4,12,22,.92) !important;border:1px solid rgba(34,197,94,.38) !important;
      box-shadow:0 20px 70px rgba(0,0,0,.42) !important;backdrop-filter:blur(18px) !important;z-index:99999 !important;
    }
    body.public .bottom-nav a{border-radius:999px !important;font-weight:900 !important;}

    @media(max-width:720px){
      body.public .app{width:100% !important;padding:0 18px 122px !important;}
      .govo-final-topbar{margin-left:-18px !important;margin-right:-18px !important;padding:15px 18px !important;border-radius:0 0 24px 24px !important;}
      .govo-final-logo{font-size:clamp(56px,16vw,82px) !important;max-width:70vw !important;}
      .govo-final-menu-btn{width:54px !important;height:54px !important;}
      .govo-final-panel{top:86px !important;right:16px !important;width:240px !important;}
    }
  `;

  const bottom = isAdmin ? '' : `<nav class="bottom-nav">
    <a class="${active === 'app' ? 'active' : ''}" href="https://app.govoexpress.com/app">Home</a>
    <a class="${active === 'shops' ? 'active' : ''}" href="https://app.govoexpress.com/shops">Shops</a>
    <a class="${active === 'services' ? 'active' : ''}" href="https://app.govoexpress.com/services">Services</a>
    <a class="${active === 'track' ? 'active' : ''}" href="https://app.govoexpress.com/track">Track</a>
    <a href="https://merchant.govoexpress.com/merchant">Join</a>
  </nav>`;

  const publicJs = isAdmin ? '' : `<script>
    document.addEventListener('click', function(e){
      if(!e.target.closest('.govo-final-menu-btn') && !e.target.closest('.govo-final-panel')){
        document.body.classList.remove('govo-final-open');
      }
    });
  </script>`;

  return `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${themeHead()}<title>${esc(title)} | GOVO Express</title><style>${css}${publicCss}</style></head><body class="${isAdmin ? 'admin' : 'public'}"><main class="app">${isAdmin ? adminHeader : publicHeader}${body}<div class="footer">GOVO Express v1.0 Clean Release</div>${bottom}</main>${themeRuntimeScript()}${publicJs}</body></html>`;
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

function visibilityFilterLinks(basePath, status, current) {
  const items = [['visible', 'Visible'], ['hidden', 'Hidden'], ['demo', 'Demo/Test'], ['all', 'All']];
  const qs = status ? `status=${encodeURIComponent(status)}&` : '';
  return `<div class="toolbar">${items.map(([key, label]) => `<a class="btn ${current === key ? '' : 'secondary'}" href="${basePath}?${qs}visibility=${key}">${label}</a>`).join('')}</div>`;
}

function visibilityWhere(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return {
    visible: `COALESCE(${prefix}public_visible,true)=true AND COALESCE(${prefix}is_demo,false)=false`,
    hidden: `COALESCE(${prefix}public_visible,true)=false`,
    demo: `COALESCE(${prefix}is_demo,false)=true`,
    all: 'TRUE',
  };
}

function publicVisibilitySql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `COALESCE(${prefix}public_visible,true)=true AND COALESCE(${prefix}is_demo,false)=false`;
}

function publicApprovedSql(alias = '') {
  const prefix = alias ? `${alias}.` : '';
  return `LOWER(TRIM(COALESCE(${prefix}status,'')))='approved' AND ${publicVisibilitySql(alias)}`;
}

function visibilityBadges(x) {
  const visible = !['false', '0'].includes(String(x.public_visible ?? 'true').toLowerCase());
  return `<div class="actions trust-row"><span class="badge ${visible ? 'available' : 'unavailable'}">${visible ? 'Public Visible' : 'Hidden'}</span>${boolish(x.is_demo) ? '<span class="badge emergency">Demo/Test</span>' : ''}</div>`;
}

function adminVisibilityControls(type, x) {
  const action = `/admin/${type}/visibility`;
  const visible = !['false', '0'].includes(String(x.public_visible ?? 'true').toLowerCase());
  const demo = boolish(x.is_demo);
  return `<div class="actions"><form method="POST" action="${action}"><input type="hidden" name="id" value="${esc(x.id)}"><button class="${visible ? 'secondary' : ''}" name="action" value="show_public">Show Public</button></form><form method="POST" action="${action}"><input type="hidden" name="id" value="${esc(x.id)}"><button class="${visible ? '' : 'secondary'}" name="action" value="hide_public">Hide Public</button></form><form method="POST" action="${action}"><input type="hidden" name="id" value="${esc(x.id)}"><button class="${demo ? 'secondary' : ''}" name="action" value="mark_demo">Mark Demo</button></form><form method="POST" action="${action}"><input type="hidden" name="id" value="${esc(x.id)}"><button class="${demo ? '' : 'secondary'}" name="action" value="unmark_demo">Not Demo</button></form></div>`;
}


function checkboxBool(v) {
  return v === 'on' || v === 'true' || v === '1' || v === true;
}

function keepValue(value, fallback = '') {
  const v = String(value == null ? '' : value).trim();
  return v || fallback || '';
}

function adminMerchantEditForm(x) {
  return `<details class="card compact-card"><summary><b>Edit Merchant Profile</b></summary><form method="POST" action="/admin/merchant/update" enctype="multipart/form-data"><input type="hidden" name="id" value="${esc(x.id)}"><label>Shop Name</label><input name="shop_name" value="${esc(x.shop_name || '')}"><label>Owner Name</label><input name="owner_name" value="${esc(x.owner_name || '')}"><label>Phone</label><input name="phone" value="${esc(x.phone || '')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(x.whatsapp || '')}"><label>Area / Location</label><input name="location" value="${esc(x.location || '')}"><label>Address</label><textarea name="shop_address">${esc(x.shop_address || '')}</textarea><label>Category</label><input name="category" value="${esc(x.category || '')}"><label>Description</label><textarea name="shop_description">${esc(x.shop_description || '')}</textarea><label><input type="checkbox" name="is_available" ${boolish(x.is_available) ? 'checked' : ''}> Available</label><label>Image Upload</label><input type="file" name="profile_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Image URL</label><input name="image_url" value="${esc(x.image_url || '')}"><label>Status</label><select name="status"><option value="pending" ${x.status === 'pending' ? 'selected' : ''}>pending</option><option value="approved" ${x.status === 'approved' ? 'selected' : ''}>approved</option><option value="rejected" ${x.status === 'rejected' ? 'selected' : ''}>rejected</option></select><div class="actions"><label><input type="checkbox" name="is_verified" ${boolish(x.is_verified) ? 'checked' : ''}> Verified</label><label><input type="checkbox" name="is_trusted" ${boolish(x.is_trusted) ? 'checked' : ''}> Trusted</label><label><input type="checkbox" name="is_available" ${boolish(x.is_available) ? 'checked' : ''}> Available</label><label><input type="checkbox" name="emergency_available" ${boolish(x.emergency_available) ? 'checked' : ''}> Emergency</label></div><button>Save Changes</button></form></details>`;
}

function adminProviderEditForm(x) {
  return `<details class="card compact-card"><summary><b>Edit Provider Profile</b></summary><form method="POST" action="/admin/provider/update" enctype="multipart/form-data"><input type="hidden" name="id" value="${esc(x.id)}"><label>Provider Name</label><input name="provider_name" value="${esc(x.provider_name || '')}"><label>Phone</label><input name="phone" value="${esc(x.phone || '')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(x.whatsapp || '')}"><label>Service Type</label><input name="service_type" value="${esc(x.service_type || '')}"><label>Area</label><input name="area" value="${esc(x.area || '')}"><label>Address</label><textarea name="address">${esc(x.address || '')}</textarea><label>Experience</label><input name="experience" value="${esc(x.experience || '')}"><label>Description</label><textarea name="description">${esc(x.description || '')}</textarea><label>Working Hours</label><input name="working_hours" value="${esc(x.working_hours || '')}"><label>Image Upload</label><input type="file" name="profile_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Image URL</label><input name="image_url" value="${esc(x.image_url || '')}"><label>Status</label><select name="status"><option value="pending" ${x.status === 'pending' ? 'selected' : ''}>pending</option><option value="approved" ${x.status === 'approved' ? 'selected' : ''}>approved</option><option value="rejected" ${x.status === 'rejected' ? 'selected' : ''}>rejected</option></select><div class="actions"><label><input type="checkbox" name="is_verified" ${boolish(x.is_verified) ? 'checked' : ''}> Verified</label><label><input type="checkbox" name="is_trusted" ${boolish(x.is_trusted) ? 'checked' : ''}> Trusted</label><label><input type="checkbox" name="is_available" ${boolish(x.is_available) ? 'checked' : ''}> Available</label><label><input type="checkbox" name="emergency_available" ${boolish(x.emergency_available) ? 'checked' : ''}> Emergency</label></div><button>Save Changes</button></form></details>`;
}

function adminRiderEditForm(x) {
  return `<details class="card compact-card"><summary><b>Edit Rider Profile</b></summary><form method="POST" action="/admin/rider/update" enctype="multipart/form-data"><input type="hidden" name="id" value="${esc(x.id)}"><label>Rider Name</label><input name="rider_name" value="${esc(x.rider_name || '')}"><label>Phone</label><input name="phone" value="${esc(x.phone || '')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(x.whatsapp || '')}"><label>Area</label><input name="area" value="${esc(x.area || x.location || '')}"><label>Address</label><textarea name="address">${esc(x.address || '')}</textarea><label>Vehicle Type</label><input name="vehicle_type" value="${esc(x.vehicle_type || '')}"><label>NID</label><input name="nid" value="${esc(x.nid || '')}"><label>Image Upload</label><input type="file" name="profile_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Image URL</label><input name="image_url" value="${esc(x.image_url || '')}"><label>Status</label><select name="status"><option value="pending" ${x.status === 'pending' ? 'selected' : ''}>pending</option><option value="approved" ${x.status === 'approved' ? 'selected' : ''}>approved</option><option value="rejected" ${x.status === 'rejected' ? 'selected' : ''}>rejected</option></select><button>Save Changes</button></form></details>`;
}

function pilotPartnerEmpty(type) {
  return `<div class="card compact-card"><h2>Pilot partners are being added.</h2><p style="color:var(--muted)">Please check again soon.</p><div class="actions"><a class="btn" href="https://merchant.govoexpress.com/merchant">Join Merchant</a><a class="btn secondary" href="https://merchant.govoexpress.com/provider">Join Provider</a></div></div>`;
}


function normalizedKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

function uniqueByIdentity(rows, type = 'merchant') {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const phone = normalizedKey(row.whatsapp || row.phone || row.provider_phone || row.merchant_phone);
    const name = normalizedKey(type === 'provider' ? row.provider_name : row.shop_name);
    const key = phone || name || String(row.id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function safeImageUrl(src) {
  const v = String(src || '').trim();
  if (!v) return '';
  if (v.startsWith('/uploads/')) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return '';
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
  const safe = safeImageUrl(src);
  const cls = large ? 'listing-thumb large' : 'listing-thumb';
  if (!safe) return `<div class="image-placeholder ${large ? 'large' : ''}">${esc(alt || 'GOVO')}</div>`;
  return `<img class="${cls}" src="${esc(safe)}" alt="${esc(alt || 'GOVO image')}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'image-placeholder ${large ? 'large' : ''}',textContent:'GOVO'}))">`;
}

function chip(label, href, active = false) {
  return `<a class="btn ${active ? '' : 'secondary'}" href="${href}">${esc(label)}</a>`;
}

function compactMerchantCard(x) {
  const phone = x.whatsapp || x.phone || '';
  return `<div class="card compact-card">${listingImage(x.image_url, x.shop_name)}<div class="section-head"><h2>${esc(x.shop_name || 'GOVO Shop')}</h2><span class="pill">${esc(x.category || 'Shop')}</span></div>${trustBadges(x)}<div class="compact-meta"><span>${esc(x.shop_address || x.location || 'Meherpur')}</span>${phone ? `<span>${esc(phone)}</span>` : ''}</div><div class="actions"><a class="btn" href="/shop/${encodeURIComponent(x.id)}">View Shop</a><a class="btn secondary" href="/order?shop=${encodeURIComponent(x.shop_name || '')}">Order</a>${phone ? `<a class="btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}</div></div>`;
}

function compactProviderCard(x) {
  const phone = x.whatsapp || x.phone || '';
  return `<div class="card compact-card">${listingImage(x.image_url, x.provider_name)}<div class="section-head"><h2>${esc(x.provider_name || 'Provider')}</h2><span class="pill">${esc(x.service_type || 'Service')}</span></div>${trustBadges(x)}<div class="compact-meta"><span>${esc(x.area || x.address || 'Meherpur')}</span>${phone ? `<span>${esc(phone)}</span>` : ''}</div><div class="actions"><a class="btn" href="/service/${encodeURIComponent(x.id)}">View Service</a><a class="btn secondary" href="/service/${encodeURIComponent(x.id)}#request_form">Request Now</a>${phone ? `<a class="btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}</div></div>`;
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
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_order_events (id SERIAL PRIMARY KEY, order_id INTEGER, event_type TEXT, status TEXT, note TEXT, actor_type TEXT DEFAULT 'admin', actor_name TEXT, created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_shop_products (id SERIAL PRIMARY KEY, merchant_lead_id INT, shop_name TEXT, merchant_phone TEXT, product_name TEXT, price TEXT, category TEXT, description TEXT, image_url TEXT, is_available BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_products (id SERIAL PRIMARY KEY, merchant_id INTEGER, merchant_name TEXT, name TEXT NOT NULL, category TEXT, price NUMERIC DEFAULT 0, description TEXT, image_url TEXT, stock_status TEXT DEFAULT 'available', public_visible BOOLEAN DEFAULT true, is_demo BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE govo_shop_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_merchant_profiles (id SERIAL PRIMARY KEY, merchant_lead_id INTEGER, shop_name TEXT, owner_name TEXT, phone TEXT UNIQUE, location TEXT, category TEXT, delivery_needed TEXT, description TEXT, opening_hours TEXT, delivery_area TEXT, logo_image TEXT, cover_image TEXT, whatsapp TEXT, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);

  await pool.query(`CREATE TABLE IF NOT EXISTS govo_service_providers (id SERIAL PRIMARY KEY, provider_name TEXT, phone TEXT, whatsapp TEXT, service_type TEXT, area TEXT, address TEXT, experience TEXT, description TEXT, image_url TEXT, status TEXT DEFAULT 'pending', admin_note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_service_requests (id SERIAL PRIMARY KEY, provider_id INT, provider_name TEXT, provider_phone TEXT, service_type TEXT, customer_name TEXT, customer_phone TEXT, service_address TEXT, problem_details TEXT, preferred_time TEXT, note TEXT, status TEXT DEFAULT 'pending', admin_note TEXT, provider_note TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_service_events (id SERIAL PRIMARY KEY, request_id INTEGER, event_type TEXT, status TEXT, note TEXT, actor_type TEXT DEFAULT 'admin', actor_name TEXT, created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_shop_items (id SERIAL PRIMARY KEY, merchant_phone TEXT, item_name TEXT, price TEXT, details TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_pilot_crm (id SERIAL PRIMARY KEY, lead_type TEXT NOT NULL DEFAULT 'merchant', name TEXT, phone TEXT, whatsapp TEXT, area TEXT, category TEXT, source TEXT, status TEXT DEFAULT 'new', priority TEXT DEFAULT 'normal', note TEXT, next_followup_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_launch_tasks (id SERIAL PRIMARY KEY, task_type TEXT DEFAULT 'followup', title TEXT NOT NULL, partner_type TEXT DEFAULT 'merchant', partner_id INTEGER NULL, partner_name TEXT, phone TEXT, area TEXT, priority TEXT DEFAULT 'normal', status TEXT DEFAULT 'todo', due_date TEXT, note TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_partner_notes (id SERIAL PRIMARY KEY, partner_type TEXT NOT NULL, partner_id INTEGER NULL, partner_name TEXT, phone TEXT, note_type TEXT DEFAULT 'followup', status TEXT DEFAULT 'open', note TEXT NOT NULL, next_followup_at TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_support_tickets (id SERIAL PRIMARY KEY, ticket_code TEXT UNIQUE, customer_name TEXT, customer_phone TEXT NOT NULL, customer_area TEXT, subject TEXT, message TEXT NOT NULL, related_type TEXT DEFAULT 'general', related_code TEXT, priority TEXT DEFAULT 'normal', status TEXT DEFAULT 'open', assigned_to TEXT, note TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_support_events (id SERIAL PRIMARY KEY, ticket_id INTEGER, event_type TEXT DEFAULT 'note', status TEXT, note TEXT, actor_type TEXT DEFAULT 'admin', actor_name TEXT, created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_finance_ledger (id SERIAL PRIMARY KEY, ref_type TEXT DEFAULT 'manual', ref_code TEXT, partner_type TEXT, partner_name TEXT, phone TEXT, amount NUMERIC DEFAULT 0, delivery_fee NUMERIC DEFAULT 0, commission_amount NUMERIC DEFAULT 0, merchant_payable NUMERIC DEFAULT 0, rider_payout NUMERIC DEFAULT 0, cash_collected NUMERIC DEFAULT 0, payment_method TEXT DEFAULT 'cash', payment_status TEXT DEFAULT 'unpaid', settlement_status TEXT DEFAULT 'pending', direction TEXT DEFAULT 'in', note TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);

  const add = async (table, columnSql) => pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnSql}`);
  for (const col of ['shop_name TEXT', 'owner_name TEXT', 'phone TEXT', 'whatsapp TEXT', 'location TEXT', 'category TEXT', 'delivery_needed TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'shop_description TEXT', 'shop_address TEXT', 'products TEXT', 'image_url TEXT', 'is_verified BOOLEAN DEFAULT false', 'is_trusted BOOLEAN DEFAULT false', 'is_available BOOLEAN DEFAULT true', 'emergency_available BOOLEAN DEFAULT false', 'rating_avg NUMERIC DEFAULT 0', 'rating_count INT DEFAULT 0', 'opening_hours TEXT', 'delivery_available BOOLEAN DEFAULT true', 'password_hash TEXT', 'password_salt TEXT', 'password_set_at TIMESTAMPTZ NULL', 'last_login_at TIMESTAMPTZ NULL', 'reset_requested_at TIMESTAMPTZ NULL', 'reset_note TEXT', 'public_visible BOOLEAN DEFAULT true', 'is_demo BOOLEAN DEFAULT false', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_merchant_leads', col);
  for (const col of ['rider_name TEXT', 'name TEXT', 'phone TEXT', 'location TEXT', 'vehicle_type TEXT', 'experience TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'whatsapp TEXT', 'area TEXT', 'address TEXT', 'nid TEXT', 'image_url TEXT', 'is_available BOOLEAN DEFAULT true', 'password_hash TEXT', 'password_salt TEXT', 'password_set_at TIMESTAMPTZ NULL', 'last_login_at TIMESTAMPTZ NULL', 'reset_requested_at TIMESTAMPTZ NULL', 'reset_note TEXT', 'public_visible BOOLEAN DEFAULT true', 'is_demo BOOLEAN DEFAULT false', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_rider_leads', col);
  for (const col of ['order_code TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'customer_area TEXT', 'customer_address TEXT', "order_type TEXT DEFAULT 'delivery'", 'merchant_id INTEGER NULL', 'merchant_name TEXT', 'shop_name TEXT', 'merchant_phone TEXT', 'provider_id INTEGER NULL', 'provider_name TEXT', 'rider_id INT', 'rider_name TEXT', 'rider_phone TEXT', 'assigned_rider_id INT', 'assigned_rider_name TEXT', 'assigned_rider_phone TEXT', 'items TEXT', 'item_details TEXT', 'note TEXT', 'preferred_time TEXT', 'customer_note TEXT', 'pickup_location TEXT', 'drop_location TEXT', 'delivery_fee NUMERIC DEFAULT 0', 'subtotal NUMERIC DEFAULT 0', 'total_amount NUMERIC DEFAULT 0', "payment_method TEXT DEFAULT 'cash'", "payment_status TEXT DEFAULT 'unpaid'", "status TEXT DEFAULT 'new'", "priority TEXT DEFAULT 'normal'", 'merchant_status TEXT', 'admin_note TEXT', 'merchant_note TEXT', 'provider_note TEXT', 'rider_note TEXT', 'merchant_lead_id INTEGER', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_orders', col);
  for (const col of ['order_id INTEGER', 'event_type TEXT', 'status TEXT', 'note TEXT', "actor_type TEXT DEFAULT 'admin'", 'actor_name TEXT', 'created_at TIMESTAMP DEFAULT NOW()']) await add('govo_order_events', col);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS govo_orders_order_code_unique ON govo_orders(order_code) WHERE order_code IS NOT NULL`);
  for (const col of ['merchant_id INTEGER', 'merchant_name TEXT', 'name TEXT', 'category TEXT', 'price NUMERIC DEFAULT 0', 'description TEXT', 'image_url TEXT', "stock_status TEXT DEFAULT 'available'", 'public_visible BOOLEAN DEFAULT true', 'is_demo BOOLEAN DEFAULT false', 'created_at TIMESTAMP DEFAULT NOW()', 'updated_at TIMESTAMP DEFAULT NOW()']) await add('govo_products', col);
  for (const col of ['provider_name TEXT', 'phone TEXT', 'whatsapp TEXT', 'service_type TEXT', 'area TEXT', 'address TEXT', 'experience TEXT', 'description TEXT', 'image_url TEXT', "status TEXT DEFAULT 'pending'", 'admin_note TEXT', 'is_verified BOOLEAN DEFAULT false', 'is_trusted BOOLEAN DEFAULT false', 'is_available BOOLEAN DEFAULT true', 'emergency_available BOOLEAN DEFAULT false', 'rating_avg NUMERIC DEFAULT 0', 'rating_count INT DEFAULT 0', 'working_hours TEXT', 'public_visible BOOLEAN DEFAULT true', 'is_demo BOOLEAN DEFAULT false', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_service_providers', col);
  for (const col of ['request_code TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'customer_area TEXT', 'customer_address TEXT', 'service_address TEXT', 'service_type TEXT', 'provider_id INTEGER NULL', 'provider_name TEXT', 'provider_phone TEXT', 'preferred_time TEXT', 'problem_details TEXT', 'note TEXT', 'customer_note TEXT', 'estimated_fee NUMERIC DEFAULT 0', "status TEXT DEFAULT 'new'", "priority TEXT DEFAULT 'normal'", 'admin_note TEXT', 'provider_note TEXT', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_service_requests', col);
  for (const col of ['request_id INTEGER', 'event_type TEXT', 'status TEXT', 'note TEXT', "actor_type TEXT DEFAULT 'admin'", 'actor_name TEXT', 'created_at TIMESTAMP DEFAULT NOW()']) await add('govo_service_events', col);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS govo_service_requests_request_code_unique ON govo_service_requests(request_code) WHERE request_code IS NOT NULL`);
  for (const col of ["lead_type TEXT NOT NULL DEFAULT 'merchant'", 'name TEXT', 'phone TEXT', 'whatsapp TEXT', 'area TEXT', 'category TEXT', 'source TEXT', "status TEXT DEFAULT 'new'", "priority TEXT DEFAULT 'normal'", 'note TEXT', 'next_followup_at TIMESTAMPTZ NULL', 'created_at TIMESTAMPTZ DEFAULT NOW()', 'updated_at TIMESTAMPTZ DEFAULT NOW()']) await add('govo_pilot_crm', col);
  for (const col of ["task_type TEXT DEFAULT 'followup'", 'title TEXT', "partner_type TEXT DEFAULT 'merchant'", 'partner_id INTEGER NULL', 'partner_name TEXT', 'phone TEXT', 'area TEXT', "priority TEXT DEFAULT 'normal'", "status TEXT DEFAULT 'todo'", 'due_date TEXT', 'note TEXT', 'created_at TIMESTAMP DEFAULT NOW()', 'updated_at TIMESTAMP DEFAULT NOW()']) await add('govo_launch_tasks', col);
  for (const col of ['partner_type TEXT', 'partner_id INTEGER NULL', 'partner_name TEXT', 'phone TEXT', "note_type TEXT DEFAULT 'followup'", "status TEXT DEFAULT 'open'", 'note TEXT', 'next_followup_at TEXT', 'created_at TIMESTAMP DEFAULT NOW()', 'updated_at TIMESTAMP DEFAULT NOW()']) await add('govo_partner_notes', col);
  for (const col of ['ticket_code TEXT', 'customer_name TEXT', 'customer_phone TEXT', 'customer_area TEXT', 'subject TEXT', 'message TEXT', "related_type TEXT DEFAULT 'general'", 'related_code TEXT', "priority TEXT DEFAULT 'normal'", "status TEXT DEFAULT 'open'", 'assigned_to TEXT', 'note TEXT', 'created_at TIMESTAMP DEFAULT NOW()', 'updated_at TIMESTAMP DEFAULT NOW()']) await add('govo_support_tickets', col);
  for (const col of ['ticket_id INTEGER', "event_type TEXT DEFAULT 'note'", 'status TEXT', 'note TEXT', "actor_type TEXT DEFAULT 'admin'", 'actor_name TEXT', 'created_at TIMESTAMP DEFAULT NOW()']) await add('govo_support_events', col);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS govo_support_tickets_ticket_code_unique ON govo_support_tickets(ticket_code) WHERE ticket_code IS NOT NULL`);
  for (const col of ["ref_type TEXT DEFAULT 'manual'", 'ref_code TEXT', 'partner_type TEXT', 'partner_name TEXT', 'phone TEXT', 'amount NUMERIC DEFAULT 0', 'delivery_fee NUMERIC DEFAULT 0', 'commission_amount NUMERIC DEFAULT 0', 'merchant_payable NUMERIC DEFAULT 0', 'rider_payout NUMERIC DEFAULT 0', 'cash_collected NUMERIC DEFAULT 0', "payment_method TEXT DEFAULT 'cash'", "payment_status TEXT DEFAULT 'unpaid'", "settlement_status TEXT DEFAULT 'pending'", "direction TEXT DEFAULT 'in'", 'note TEXT', 'created_at TIMESTAMP DEFAULT NOW()', 'updated_at TIMESTAMP DEFAULT NOW()']) await add('govo_finance_ledger', col);

  await pool.query(`DO $$
  BEGIN
    IF to_regclass('public.govo_riders') IS NOT NULL THEN
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS password_salt TEXT;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ NULL;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS reset_requested_at TIMESTAMPTZ NULL;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS reset_note TEXT;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS public_visible BOOLEAN DEFAULT true;
      ALTER TABLE govo_riders ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
    END IF;
  END $$`);

  await markDemoRecords();
}

async function markDemoRecords() {
  const demoPhones = ['01700000000', '01700000001', '01700000002', '01700000003', '01799999999', '01711111111', '01811111111'];
  const demoNameSql = `demo|test|telegram|final test|db test|sample`;
  await pool.query(`UPDATE govo_merchant_leads SET is_demo=true, public_visible=false, updated_at=NOW() WHERE COALESCE(is_demo,false)=false AND (phone = ANY($1::text[]) OR whatsapp = ANY($1::text[]) OR LOWER(COALESCE(shop_name,'') || ' ' || COALESCE(owner_name,'')) ~ $2)`, [demoPhones, demoNameSql]);
  await pool.query(`UPDATE govo_service_providers SET is_demo=true, public_visible=false, updated_at=NOW() WHERE COALESCE(is_demo,false)=false AND (phone = ANY($1::text[]) OR whatsapp = ANY($1::text[]) OR LOWER(COALESCE(provider_name,'') || ' ' || COALESCE(service_type,'')) ~ $2)`, [demoPhones, demoNameSql]);
  await pool.query(`UPDATE govo_rider_leads SET is_demo=true, public_visible=false, updated_at=NOW() WHERE COALESCE(is_demo,false)=false AND (phone = ANY($1::text[]) OR whatsapp = ANY($1::text[]) OR LOWER(COALESCE(rider_name,'') || ' ' || COALESCE(name,'')) ~ $2)`, [demoPhones, demoNameSql]);
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

function publicContactLinks() {
  const whatsapp = process.env.GOVO_WHATSAPP_PUBLIC_URL || process.env.GOVO_WHATSAPP_URL || process.env.GOVO_WHATSAPP || process.env.WHATSAPP || '';
  const facebook = process.env.GOVO_FACEBOOK_URL || '';
  const tiktok = process.env.GOVO_TIKTOK_URL || '';
  const waHref = whatsapp ? (/^https?:\/\//i.test(whatsapp) ? whatsapp : `https://wa.me/${String(whatsapp).replace(/\D/g, '')}`) : '';
  const links = [
    ['WhatsApp', waHref],
    ['Facebook', facebook],
    ['TikTok', tiktok],
  ].filter((x) => x[1]);
  if (!links.length) return '<span class="pill">Contact GOVO</span>';
  return links.map(([label, href]) => `<a class="btn secondary" href="${esc(href)}">${esc(label)}</a>`).join('');
}

app.get('/', (req, res) => {
  res.send(page('GOVO', `
    <section class="card app-hero">
      <span class="pill">GOVO</span>
      <h1>GOVO Express — Meherpur Super App</h1>
      <p style="color:var(--muted);font-size:16px;line-height:1.55">Local shop, service & delivery in one place.</p>
      <div class="actions">
        <a class="btn" href="https://app.govoexpress.com/app">Open App</a>
        <a class="btn secondary" href="https://app.govoexpress.com/shops">Shops</a>
        <a class="btn secondary" href="https://app.govoexpress.com/services">Services</a>
        <a class="btn secondary" href="https://app.govoexpress.com/track">Track</a>
      </div>
    </section>
    <section class="card"><h2>What you can do</h2><div class="item-grid">
      <div class="item-box"><b>Order from shops</b><span>Find local GOVO partner shops and place delivery orders.</span></div>
      <div class="item-box"><b>Request services</b><span>Book approved local providers for home, repair, health and more.</span></div>
      <div class="item-box"><b>Track delivery</b><span>Check order and service request status by ID or phone.</span></div>
    </div></section>
    <section class="card"><h2>Join GOVO</h2><div class="quick-grid">
      <a class="btn secondary" href="https://merchant.govoexpress.com/merchant">Merchant</a>
      <a class="btn secondary" href="https://merchant.govoexpress.com/provider">Provider</a>
      <a class="btn secondary" href="https://rider.govoexpress.com/rider">Rider</a>
    </div></section>
    <section class="card social-footer"><h2>Contact</h2><div class="toolbar">${publicContactLinks()}</div></section>
  `, 'app'));
});
app.get('/health', (req, res) => res.json({ ok: true, service: 'govo-portal', version: 'v1.0-clean-phase1' }));

app.get('/merchant', (req, res) => {
  res.send(page('Merchant Registration', `<section class="card"><h1>GOVO Merchant Registration</h1><p class="form-hint">Shop info din. GOVO admin approve korle customer app-e show korbe.</p><form method="POST" action="/merchant"><label>Shop Name</label><input name="shop_name" required><label>Owner Name</label><input name="owner_name" required><label>Phone</label><input name="phone" required><label>Location</label><input name="location" required><label>Category</label><select name="category"><option>Restaurant</option><option>Grocery</option><option>Pharmacy</option><option>Fashion</option><option>Electronics</option><option>Service Provider</option><option>Other</option></select><label>Delivery Needed?</label><select name="delivery_needed"><option>Yes</option><option>No</option><option>Later</option></select><button>Submit Merchant Info</button></form></section>`, 'merchant'));
});

app.post('/merchant', async (req, res, next) => {
  try {
    const lead = { shop_name: req.body.shop_name, owner_name: req.body.owner_name, phone: req.body.phone, location: req.body.location, category: req.body.category, delivery_needed: req.body.delivery_needed };
    await pool.query(`INSERT INTO govo_merchant_leads (shop_name, owner_name, phone, location, category, delivery_needed, status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`, [lead.shop_name, lead.owner_name, lead.phone, lead.location, lead.category, lead.delivery_needed]);
    sendTelegram(['New GOVO Merchant Lead', '', `Shop: ${lead.shop_name || ''}`, `Owner: ${lead.owner_name || ''}`, `Phone: ${lead.phone || ''}`, `Location: ${lead.location || ''}`, `Category: ${lead.category || ''}`, `Delivery: ${lead.delivery_needed || ''}`, `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}`].join('\n')).catch(() => {});
    res.send(page('Merchant Submitted', `<section class="card"><h1>Merchant Submitted</h1><p>GOVO team info receive koreche.</p><a class="btn" href="https://merchant.govoexpress.com/merchant">Add Another</a></section>`));
  } catch (e) { next(e); }
});

app.get('/rider', (req, res) => {
  if (readPortalSession(req, 'rider')) return res.redirect('/rider/dashboard');
  res.send(riderLoginPage(String(req.query.phone || '').trim()));
});

app.get('/rider/register', (req, res) => {
  res.send(page('Rider Registration', `<section class="card"><h1>GOVO Rider Registration</h1><p class="form-hint">Delivery rider hisebe join korte basic info submit korun.</p><form method="POST" action="/rider"><label>Rider Name</label><input name="rider_name" required><label>Phone</label><input name="phone" required><label>Location</label><input name="location" required><label>Vehicle Type</label><select name="vehicle_type"><option>Bike</option><option>Cycle</option><option>Auto</option><option>Other</option></select><label>Experience</label><textarea name="experience"></textarea><button>Submit Rider Info</button></form><div class="actions"><a class="btn secondary" href="https://rider.govoexpress.com/rider">Rider Login</a></div></section>`, 'rider'));
});

app.post('/rider', async (req, res, next) => {
  try {
    await pool.query(`INSERT INTO govo_rider_leads (rider_name, phone, location, vehicle_type, experience, status) VALUES ($1,$2,$3,$4,$5,'pending')`, [req.body.rider_name, req.body.phone, req.body.location, req.body.vehicle_type, req.body.experience]);
    sendTelegram(['New GOVO Rider Lead', '', `Name: ${req.body.rider_name || ''}`, `Phone: ${req.body.phone || ''}`, `Location: ${req.body.location || ''}`, `Vehicle: ${req.body.vehicle_type || ''}`, `Experience: ${req.body.experience || ''}`, `Time: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}`].join('\n')).catch(() => {});
    res.send(page('Rider Submitted', `<section class="card"><h1>Rider Submitted</h1><p>GOVO team info receive koreche.</p><a class="btn" href="https://rider.govoexpress.com/rider/register">Add Another</a></section>`));
  } catch (e) { next(e); }
});

app.get('/merchant/account/create', (req, res) => {
  res.send(accountCreatePage('merchant', String(req.query.phone || '').trim()));
});

app.post('/merchant/account/create', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const confirm = String(req.body.confirm_password || '');
    if (!phone) return res.status(400).send(accountCreatePage('merchant', phone, 'Phone required.'));
    if (password.length < 6) return res.status(400).send(accountCreatePage('merchant', phone, 'Password minimum 6 characters.'));
    if (password !== confirm) return res.status(400).send(accountCreatePage('merchant', phone, 'Confirm password did not match.'));
    const r = await pool.query(`SELECT id, shop_name, phone, whatsapp FROM govo_merchant_leads WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!r.rows.length) return res.status(404).send(accountCreatePage('merchant', phone, 'No registered merchant found for this phone. Please register first.'));
    const hp = hashPassword(password);
    await pool.query(`UPDATE govo_merchant_leads SET password_hash=$1, password_salt=$2, password_set_at=NOW(), updated_at=NOW() WHERE id=$3`, [hp.hash, hp.salt, r.rows[0].id]);
    res.send(accountCreateSuccessPage('merchant', r.rows[0].phone || phone));
  } catch (e) { next(e); }
});

app.post('/merchant/login', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    if (!phone || !password) return res.status(400).send(merchantLoginPage(phone, 'Phone and password required.'));
    const r = await pool.query(`SELECT id, shop_name, phone, whatsapp, password_hash, password_salt FROM govo_merchant_leads WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    const m = r.rows[0];
    if (!m) return res.status(404).send(merchantLoginPage(phone, 'No registered merchant found. Use Register or Create Account.'));
    if (!m.password_hash || !m.password_salt) return res.status(403).send(merchantLoginPage(phone, 'Password not set. Create account first.'));
    if (!verifyPassword(password, m.password_salt, m.password_hash)) return res.status(401).send(merchantLoginPage(phone, 'Wrong phone or password.'));
    await pool.query(`UPDATE govo_merchant_leads SET last_login_at=NOW(), updated_at=NOW() WHERE id=$1`, [m.id]);
    setPortalSession(req, res, 'merchant', m.id);
    res.redirect('/merchant/dashboard');
  } catch (e) { next(e); }
});

app.all('/merchant/logout', (req, res) => {
  clearPortalSession(req, res, 'merchant');
  res.redirect('/merchant/dashboard');
});

app.get('/merchant/forgot-password', (req, res) => {
  res.send(forgotPasswordPage('merchant', String(req.query.phone || '').trim()));
});

app.post('/merchant/forgot-password', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const note = String(req.body.reset_note || '').trim();
    const r = await pool.query(`UPDATE govo_merchant_leads SET reset_requested_at=NOW(), reset_note=$1, updated_at=NOW() WHERE id=(SELECT id FROM govo_merchant_leads WHERE phone=$2 OR whatsapp=$2 ORDER BY id DESC LIMIT 1) RETURNING id, shop_name, owner_name, phone`, [note, phone]);
    if (r.rows.length) {
      const m = r.rows[0];
      sendTelegram(['GOVO Merchant Password Reset Requested', '', `Merchant ID: #${m.id}`, `Shop: ${m.shop_name || ''}`, `Owner: ${m.owner_name || ''}`, `Phone: ${m.phone || phone}`, `Note: ${note || 'N/A'}`].join('\n')).catch(() => {});
    }
    res.send(forgotPasswordPage('merchant', '', 'Jodi account thake, admin reset request peye jabe.'));
  } catch (e) { next(e); }
});

app.get('/rider/account/create', (req, res) => {
  res.send(accountCreatePage('rider', String(req.query.phone || '').trim()));
});

app.post('/rider/account/create', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const confirm = String(req.body.confirm_password || '');
    if (!phone) return res.status(400).send(accountCreatePage('rider', phone, 'Phone required.'));
    if (password.length < 6) return res.status(400).send(accountCreatePage('rider', phone, 'Password minimum 6 characters.'));
    if (password !== confirm) return res.status(400).send(accountCreatePage('rider', phone, 'Confirm password did not match.'));
    const r = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!r.rows.length) return res.status(404).send(accountCreatePage('rider', phone, 'No registered rider found for this phone. Please register first.'));
    const hp = hashPassword(password);
    await pool.query(`UPDATE govo_rider_leads SET password_hash=$1, password_salt=$2, password_set_at=NOW(), updated_at=NOW() WHERE id=$3`, [hp.hash, hp.salt, r.rows[0].id]);
    res.send(accountCreateSuccessPage('rider', r.rows[0].phone || phone));
  } catch (e) { next(e); }
});

app.post('/rider/login', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    if (!phone || !password) return res.status(400).send(riderLoginPage(phone, 'Phone and password required.'));
    const r = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, password_hash, password_salt FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    const rd = r.rows[0];
    if (!rd) return res.status(404).send(riderLoginPage(phone, 'No registered rider found. Use Register or Create Account.'));
    if (!rd.password_hash || !rd.password_salt) return res.status(403).send(riderLoginPage(phone, 'Password not set. Create account first.'));
    if (!verifyPassword(password, rd.password_salt, rd.password_hash)) return res.status(401).send(riderLoginPage(phone, 'Wrong phone or password.'));
    await pool.query(`UPDATE govo_rider_leads SET last_login_at=NOW(), updated_at=NOW() WHERE id=$1`, [rd.id]);
    setPortalSession(req, res, 'rider', rd.id);
    res.redirect('/rider/dashboard');
  } catch (e) { next(e); }
});

app.all('/rider/logout', (req, res) => {
  clearPortalSession(req, res, 'rider');
  res.redirect('/rider');
});

app.get('/rider/forgot-password', (req, res) => {
  res.send(forgotPasswordPage('rider', String(req.query.phone || '').trim()));
});

app.post('/rider/forgot-password', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const note = String(req.body.reset_note || '').trim();
    const r = await pool.query(`UPDATE govo_rider_leads SET reset_requested_at=NOW(), reset_note=$1, updated_at=NOW() WHERE id=(SELECT id FROM govo_rider_leads WHERE phone=$2 ORDER BY id DESC LIMIT 1) RETURNING id, COALESCE(rider_name,name) AS rider_name, phone`, [note, phone]);
    if (r.rows.length) {
      const rd = r.rows[0];
      sendTelegram(['GOVO Rider Password Reset Requested', '', `Rider ID: #${rd.id}`, `Name: ${rd.rider_name || ''}`, `Phone: ${rd.phone || phone}`, `Note: ${note || 'N/A'}`].join('\n')).catch(() => {});
    }
    res.send(forgotPasswordPage('rider', '', 'Jodi account thake, admin reset request peye jabe.'));
  } catch (e) { next(e); }
});


app.use('/admin', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  const openPaths = ['/', '/login', '/logout'];
  if (openPaths.includes(req.path)) return next();
  if (hasAdminCookie(req)) return next();
  if (hasValidAdminPin(req)) {
    setAdminCookie(req, res);
    if (req.method === 'GET' && req.query && Object.prototype.hasOwnProperty.call(req.query, 'pin')) {
      const qs = new URLSearchParams(req.query);
      qs.delete('pin');
      const cleanUrl = `${req.path}${qs.toString() ? `?${qs.toString()}` : ''}`;
      return res.redirect(cleanUrl);
    }
    return next();
  }
  if (req.method === 'GET') return res.redirect('/admin/login');
  return res.status(403).send(page('Unauthorized', '<section class="card lock-card"><h1>Unauthorized</h1><p>Admin login required.</p><a class="btn" href="/admin/login">Admin Login</a></section>', 'admin'));
});

app.get('/admin', (req, res) => {
  if (hasAdminCookie(req)) return res.redirect('/admin/os');
  if (hasValidAdminPin(req)) {
    setAdminCookie(req, res);
    return res.redirect('/admin/os');
  }
  return res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
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
  res.redirect('/admin/login');
});

app.get('/admin/os', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [orders, merchants, riders, providers, serviceRequests, recentOrders, recentServiceRequests, recentMerchants, recentProviders] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('new','pending'))::int pending, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('confirmed','accepted','preparing','merchant_confirmed'))::int active_merchant, COUNT(*) FILTER (WHERE COALESCE(status,'new')='ready')::int ready, COUNT(*) FILTER (WHERE COALESCE(status,'new')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('picked_up','on_the_way'))::int picked_up, COUNT(*) FILTER (WHERE COALESCE(status,'new')='delivered')::int delivered FROM govo_orders`),
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
    const alertItems = [
      ['Pending merchant approvals', m.pending, '/admin/leads?status=pending'],
      ['Pending rider approvals', r.pending, '/admin/riders?status=pending'],
      ['Pending provider approvals', p.pending, '/admin/providers?status=pending'],
      ['Pending service requests', sr.pending, '/admin/service-requests?status=pending'],
      ['Pending orders', o.pending, '/admin/orders?status=pending'],
    ].filter((x) => Number(x[1] || 0) > 0);
    const alert = (label, count, href) => `<a class="card compact-card" href="${href}" style="text-decoration:none"><div class="section-head"><h2>${esc(label)}</h2>${badge('pending')}</div><p><b>${esc(count || 0)}</b> waiting for action</p></a>`;
    const alertSection = alertItems.length ? alertItems.map(([label, count, href]) => alert(label, count, href)).join('') : '<div class="card compact-card alert-clear"><h2>All clear — no pending action.</h2><p>No approval or operation is waiting right now.</p></div>';
    const recentSection = (title, rows, render) => `<section class="card"><h2>${esc(title)}</h2><div class="activity-list">${rows.length ? rows.map(render).join('') : '<div class="activity-row"><b>No recent activity</b><span>Nothing to show yet</span></div>'}</div></section>`;
    const recentCard = (title, status, details, href) => `<a class="activity-row" href="${href}"><span><b>${esc(title)}</b><span>${esc(details)}</span></span>${badge(status)}</a>`;
    res.send(page('Admin OS', `<section class="card hero"><h1>GOVO Admin OS</h1><p>Operations Control Center for orders, dispatch, providers and approvals.</p><div class="toolbar"><a class="btn" href="/admin/os">Refresh</a><a class="btn secondary" href="/admin/orders?status=pending">Pending Orders</a><a class="btn secondary" href="/admin/service-requests?status=pending">Pending Services</a></div></section><section class="grid">${stat('Pending Orders', o.pending, 'Need merchant/admin action')}${stat('Accepted / Preparing', o.active_merchant, 'Merchant working')}${stat('Ready Orders', o.ready, 'Ready for rider')}${stat('Assigned Orders', o.assigned, 'Rider assigned')}${stat('Picked Up Orders', o.picked_up, 'On the way')}${stat('Delivered Orders', o.delivered, 'Completed deliveries')}${stat('Pending Service Requests', sr.pending, 'Need provider/admin action')}${stat('Working Service Requests', sr.working, 'Provider working')}${stat('Completed Service Requests', sr.completed, 'Finished service jobs')}${stat('Pending Merchants', m.pending, 'Waiting approval')}${stat('Pending Riders', r.pending, 'Waiting approval')}${stat('Pending Providers', p.pending, 'Waiting approval')}${stat('Total Orders', o.total, 'All customer orders')}${stat('Total Merchants', m.total, 'Merchant registrations')}${stat('Approved Merchants', m.approved, 'Visible in shops')}${stat('Total Riders', r.total, 'Rider registrations')}${stat('Approved Riders', r.approved, 'Assignable riders')}${stat('Total Service Providers', p.total, 'Provider registrations')}${stat('Approved Providers', p.approved, 'Visible in services')}${stat('Emergency Providers', p.emergency_available, 'Urgent support')}</section><section class="card"><h2>Quick Actions</h2><div class="toolbar">${action('Partner CRM', '/admin/onboarding')}${action('Merchant, Provider, Rider detail + follow-up history', '/admin/onboarding')}${action('Daily Command Center', '/admin/command')}${action('Order Dispatch', '/admin/orders')}${action('Service Requests', '/admin/service-requests')}${action('Support Inbox', '/admin/support')}${action('Finance Ledger', '/admin/finance')}${action('WhatsApp Control', '/admin/whatsapp')}${action('QA Dashboard', '/admin/qa')}${action('Pilot Onboarding', '/admin/onboarding')}${action('Launch Task Board', '/admin/tasks')}${action('Pilot CRM', '/admin/pilot-crm')}${action('Manage Orders', '/admin/orders')}${action('Manage Merchants', '/admin/leads?filter=all')}${action('Manage Riders', '/admin/riders?filter=all')}${action('Manage Providers', '/admin/providers?filter=all')}${action('Manage Service Requests', '/admin/service-requests')}${action('Pilot Dashboard', '/admin/pilot')}${action('Public Pilot Page', '/pilot')}${action('Merchant Pilot Page', '/pilot/merchant')}${action('Provider Pilot Page', '/pilot/provider')}${action('Rider Pilot Page', '/pilot/rider')}${action('View Shops', '/shops')}${action('View Services', '/services')}${action('Track Order', '/track')}${action('Main Website', '/')}</div></section><section class="card"><h2>Alerts</h2><div class="cards compact">${alertSection}</div></section><section class="grid two">${recentSection('Last 5 Orders', recentOrders.rows, (x) => recentCard(`#${x.id} ${x.shop_name || 'Order'}`, x.status, `${x.customer_name || 'Customer'} - ${x.customer_phone || 'No phone'} - ${x.drop_location || 'No location'} - ${bdTime(x.created_at)}`, `/admin/orders?q=${encodeURIComponent(x.id)}`))}${recentSection('Last 5 Service Requests', recentServiceRequests.rows, (x) => recentCard(`#${x.id} ${x.service_type || 'Service'}`, x.status, `${x.customer_name || 'Customer'} - ${x.customer_phone || 'No phone'} - ${x.provider_name || 'Provider'} - ${bdTime(x.created_at)}`, `/admin/service-requests?q=${encodeURIComponent(x.id)}`))}${recentSection('Last 5 Merchant Leads', recentMerchants.rows, (x) => recentCard(`#${x.id} ${x.shop_name || 'Merchant'}`, x.status, `${x.owner_name || 'Owner'} - ${x.phone || 'No phone'} - ${x.category || 'No category'} - ${bdTime(x.created_at)}`, `/admin/leads?q=${encodeURIComponent(x.phone || x.shop_name || x.id)}`))}${recentSection('Last 5 Provider Leads', recentProviders.rows, (x) => recentCard(`#${x.id} ${x.provider_name || 'Provider'}`, x.status, `${x.phone || 'No phone'} - ${x.service_type || 'No service'} - ${x.area || 'No area'} - ${bdTime(x.created_at)}`, `/admin/providers?q=${encodeURIComponent(x.phone || x.provider_name || x.id)}`))}</section>`, 'admin'));
  } catch (e) { next(e); }
});


app.get('/admin/command', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const hasTable = async (name) => !!(await pool.query(`SELECT to_regclass($1) AS table_name`, [`public.${name}`])).rows[0].table_name;
    const exists = {
      orders: await hasTable('govo_orders'),
      services: await hasTable('govo_service_requests'),
      support: await hasTable('govo_support_tickets'),
      tasks: await hasTable('govo_launch_tasks'),
      merchants: await hasTable('govo_merchant_leads'),
      providers: await hasTable('govo_service_providers'),
      riders: await hasTable('govo_rider_leads'),
    };
    const one = async (enabled, sql, fallback = {}) => enabled ? ((await pool.query(sql)).rows[0] || fallback) : fallback;
    const rows = async (enabled, sql, fallback = []) => enabled ? (await pool.query(sql)).rows : fallback;
    const zero = {};
    const [orderKpi, serviceKpi, supportKpi, taskKpi, merchantKpi, providerKpi, riderKpi, orderQueue, serviceQueue, supportQueue, taskQueue] = await Promise.all([
      one(exists.orders, `SELECT COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE)::int total_today, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('new','pending'))::int new_orders, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('assigned','picked_up','on_the_way'))::int active_delivery, COUNT(*) FILTER (WHERE COALESCE(status,'new')='delivered' AND COALESCE(updated_at,created_at)::date=CURRENT_DATE)::int delivered_today, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('cancelled','rejected','failed') AND COALESCE(updated_at,created_at)::date=CURRENT_DATE)::int cancelled_today FROM govo_orders`, zero),
      one(exists.services, `SELECT COUNT(*) FILTER (WHERE created_at::date=CURRENT_DATE)::int total_today, COUNT(*) FILTER (WHERE COALESCE(status,'new')='new')::int new_requests, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('assigned','in_progress'))::int in_progress, COUNT(*) FILTER (WHERE COALESCE(status,'new')='completed' AND COALESCE(updated_at,created_at)::date=CURRENT_DATE)::int completed_today FROM govo_service_requests`, zero),
      one(exists.support, `SELECT COUNT(*) FILTER (WHERE COALESCE(status,'open')='open')::int open_tickets, COUNT(*) FILTER (WHERE COALESCE(status,'open') IN ('open','working') AND COALESCE(priority,'normal') IN ('urgent','high'))::int urgent_high, COUNT(*) FILTER (WHERE COALESCE(status,'open')='resolved' AND COALESCE(updated_at,created_at)::date=CURRENT_DATE)::int resolved_today FROM govo_support_tickets`, zero),
      one(exists.tasks, `SELECT COUNT(*) FILTER (WHERE COALESCE(status,'todo')='todo')::int todo, COUNT(*) FILTER (WHERE COALESCE(status,'todo')='doing')::int doing, COUNT(*) FILTER (WHERE COALESCE(status,'todo') IN ('todo','doing') AND LOWER(TRIM(COALESCE(due_date,''))) IN ('today', LOWER(TO_CHAR(CURRENT_DATE,'YYYY-MM-DD')), LOWER(TO_CHAR(CURRENT_DATE,'YYYY/MM/DD')), LOWER(TO_CHAR(CURRENT_DATE,'DD-MM-YYYY'))))::int due_today, COUNT(*) FILTER (WHERE COALESCE(status,'todo') IN ('todo','doing') AND COALESCE(priority,'normal')='urgent')::int urgent FROM govo_launch_tasks`, zero),
      one(exists.merchants, `SELECT COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved' AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false)::int approved_public FROM govo_merchant_leads`, zero),
      one(exists.providers, `SELECT COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved' AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false)::int approved_public FROM govo_service_providers`, zero),
      one(exists.riders, `SELECT COUNT(*) FILTER (WHERE COALESCE(status,'pending')='approved')::int approved FROM govo_rider_leads`, zero),
      rows(exists.orders, `SELECT id, order_code, customer_name, customer_phone, COALESCE(merchant_name,shop_name,provider_name,'GOVO Order') AS partner_name, COALESCE(status,'new') AS status, total_amount, created_at FROM govo_orders WHERE COALESCE(status,'new') IN ('new','pending','confirmed','accepted','preparing','ready') ORDER BY id DESC LIMIT 10`),
      rows(exists.services, `SELECT id, request_code, customer_name, customer_phone, service_type, COALESCE(status,'new') AS status, created_at FROM govo_service_requests WHERE COALESCE(status,'new') IN ('new','confirmed','in_progress') ORDER BY id DESC LIMIT 10`),
      rows(exists.support, `SELECT id, ticket_code, customer_name, customer_phone, subject, priority, COALESCE(status,'open') AS status, created_at FROM govo_support_tickets WHERE COALESCE(status,'open') IN ('open','working') ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, id DESC LIMIT 10`),
      rows(exists.tasks, `SELECT id, title, partner_type, partner_name, phone, priority, status, due_date, created_at FROM govo_launch_tasks WHERE COALESCE(status,'todo') IN ('todo','doing') ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, NULLIF(due_date,'') NULLS LAST, id DESC LIMIT 10`),
    ]);
    const stat = (label, value, hint = '') => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div>${hint ? `<p>${esc(hint)}</p>` : ''}</div>`;
    const quick = (label, href) => `<a class="btn secondary" href="${href}">${esc(label)}</a>`;
    const queueCard = ({ title, href, phone, name, status, priority, meta }) => `<div class="activity-row"><span><b>${esc(title || 'Untitled')}</b><span>${esc(meta || '')}</span></span><span>${status ? badge(status) : ''}${priority ? badge(priority) : ''}</span><div class="actions"><a class="btn secondary" href="${href}">Open</a></div>${customerContactActions(phone, name)}</div>`;
    const queueSection = (title, items, emptyText) => `<section class="card"><div class="section-head"><h2>${esc(title)}</h2><span class="pill">${items.length}</span></div><div class="activity-list">${items.length ? items.join('') : `<div class="activity-row"><b>${esc(emptyText || 'No urgent items right now.')}</b><span>Clear</span></div>`}</div></section>`;
    const orderItems = orderQueue.map((x) => queueCard({ title: x.order_code || orderCodeFromId(x.id), href: `/admin/orders?q=${encodeURIComponent(x.order_code || x.id)}`, phone: x.customer_phone, name: x.customer_name, status: x.status, meta: `${x.customer_phone || 'No phone'} - ${x.partner_name || 'No partner'} - ${safeAmount(x.total_amount) ? `৳${safeAmount(x.total_amount)}` : 'No total'} - ${bdTime(x.created_at)}` }));
    const serviceItems = serviceQueue.map((x) => queueCard({ title: x.request_code || serviceRequestCodeFromId(x.id, x.created_at), href: `/admin/service-requests?q=${encodeURIComponent(x.request_code || x.id)}`, phone: x.customer_phone, name: x.customer_name, status: x.status, meta: `${x.customer_phone || 'No phone'} - ${x.service_type || 'Service'} - ${bdTime(x.created_at)}` }));
    const supportItems = supportQueue.map((x) => queueCard({ title: x.ticket_code || supportTicketCodeFromId(x.id, x.created_at), href: `/admin/support?q=${encodeURIComponent(x.ticket_code || x.id)}`, phone: x.customer_phone, name: x.customer_name, status: x.status, priority: x.priority, meta: `${x.customer_phone || 'No phone'} - ${x.subject || 'Support'} - ${bdTime(x.created_at)}` }));
    const taskItems = taskQueue.map((x) => queueCard({ title: x.title || `Task #${x.id}`, href: `/admin/tasks`, phone: x.phone, name: x.partner_name, status: x.status, priority: x.priority, meta: `${x.partner_type || 'general'} - ${x.partner_name || 'No partner'} - ${x.due_date ? `Due ${x.due_date}` : 'No due date'}` }));
    const pass = (ok) => ok ? '<span class="badge available">PASS</span>' : '<span class="badge failed">NEED WORK</span>';
    const readiness = [
      ['5+ public approved merchants', Number(merchantKpi.approved_public || 0) >= 5, merchantKpi.approved_public || 0],
      ['3+ public approved providers', Number(providerKpi.approved_public || 0) >= 3, providerKpi.approved_public || 0],
      ['2+ approved riders', Number(riderKpi.approved || 0) >= 2, riderKpi.approved || 0],
      ['Support inbox active', exists.support, exists.support ? 'ready' : 'missing'],
      ['Order board active', exists.orders, exists.orders ? 'ready' : 'missing'],
      ['Service request board active', exists.services, exists.services ? 'ready' : 'missing'],
      ['Task board active', exists.tasks, exists.tasks ? 'ready' : 'missing'],
    ].map(([label, ok, value]) => `<div class="activity-row"><span><b>${esc(label)}</b><span>${esc(value)}</span></span>${pass(ok)}</div>`).join('');
    const hasUrgent = orderItems.length || serviceItems.length || supportItems.length || taskItems.length;
    res.send(page('Daily Command Center', `<section class="card app-hero"><span class="pill">Daily Operations</span><h1>Daily Command Center</h1><p>One control room for orders, service requests, support, launch tasks, and pilot readiness.</p><div class="actions"><a class="btn" href="/admin/command">Refresh</a>${quick('Order Dispatch','/admin/orders')}${quick('Service Requests','/admin/service-requests')}${quick('Support Inbox','/admin/support')}${quick('Finance Ledger','/admin/finance')}${quick('WhatsApp Control','/admin/whatsapp')}${quick('QA Dashboard','/admin/qa')}${quick('Launch Task Board','/admin/tasks')}${quick('Pilot Onboarding','/admin/onboarding')}</div></section><section class="card"><div class="section-head"><h2>Today Pulse</h2>${hasUrgent ? badge('active') : badge('clear')}</div></section><section class="grid">${stat('Total Orders Today', orderKpi.total_today)}${stat('New Orders', orderKpi.new_orders)}${stat('Assigned / On The Way', orderKpi.active_delivery)}${stat('Delivered Today', orderKpi.delivered_today)}${stat('Cancelled Today', orderKpi.cancelled_today)}${stat('Service Requests Today', serviceKpi.total_today)}${stat('New Service Requests', serviceKpi.new_requests)}${stat('In Progress', serviceKpi.in_progress)}${stat('Completed Today', serviceKpi.completed_today)}${stat('Open Support Tickets', supportKpi.open_tickets)}${stat('Urgent / High Tickets', supportKpi.urgent_high)}${stat('Resolved Today', supportKpi.resolved_today)}${stat('Todo Tasks', taskKpi.todo)}${stat('Doing Tasks', taskKpi.doing)}${stat('Due Today', taskKpi.due_today)}${stat('Urgent Tasks', taskKpi.urgent)}${stat('Public Merchants', merchantKpi.approved_public)}${stat('Public Providers', providerKpi.approved_public)}${stat('Approved Riders', riderKpi.approved)}</section><section class="card"><div class="section-head"><h2>Needs Action</h2>${hasUrgent ? badge('review') : badge('clear')}</div>${hasUrgent ? '' : '<p style="color:var(--muted);font-weight:900">No urgent items right now.</p>'}</section><section class="grid two">${queueSection('New Orders Queue', orderItems)}${queueSection('Service Requests Queue', serviceItems)}${queueSection('Support Queue', supportItems)}${queueSection('Task Queue', taskItems)}</section><section class="card"><div class="section-head"><h2>Launch Readiness</h2><span class="pill">Pilot checks</span></div><div class="activity-list">${readiness}</div></section><section class="card"><h2>Quick Control</h2><div class="toolbar">${quick('New Manual Order','/admin/orders')}${quick('New Service Request','/admin/service-requests')}${quick('New Support Ticket','/admin/support')}${quick('New Task','/admin/tasks')}${quick('Finance Ledger','/admin/finance')}${quick('WhatsApp Control','/admin/whatsapp')}${quick('QA Dashboard','/admin/qa')}${quick('Pilot Onboarding','/admin/onboarding')}</div></section>`, 'admin'));
  } catch (e) { next(e); }
});



function cleanFinancePaymentStatus(v) {
  const s = String(v || 'unpaid').trim().toLowerCase();
  return ['unpaid', 'paid', 'partial', 'refunded'].includes(s) ? s : 'unpaid';
}

function cleanFinanceSettlementStatus(v) {
  const s = String(v || 'pending').trim().toLowerCase();
  return ['pending', 'settled', 'partial', 'cancelled'].includes(s) ? s : 'pending';
}

function cleanFinanceDirection(v) {
  const s = String(v || 'in').trim().toLowerCase();
  return ['in', 'out'].includes(s) ? s : 'in';
}

function moneyValue(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

app.get('/admin/whatsapp', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const publicWhatsapp = String(process.env.GOVO_WHATSAPP_PUBLIC_URL || '').trim();
    const publicHref = publicWhatsapp ? (/^https?:\/\//i.test(publicWhatsapp) ? publicWhatsapp : `https://wa.me/${publicWhatsapp.replace(/\D/g, '')}`) : '';
    const [merchants, providers, riders] = await Promise.all([
      pool.query(`SELECT id, shop_name AS name, owner_name, phone, whatsapp, COALESCE(shop_address, location) AS area, status FROM govo_merchant_leads ORDER BY id DESC LIMIT 12`),
      pool.query(`SELECT id, provider_name AS name, phone, whatsapp, COALESCE(area, address) AS area, service_type AS category, status FROM govo_service_providers ORDER BY id DESC LIMIT 12`),
      pool.query(`SELECT id, COALESCE(rider_name,name) AS name, phone, whatsapp, COALESCE(area, location) AS area, vehicle_type AS category, status FROM govo_rider_leads ORDER BY id DESC LIMIT 12`),
    ]);
    const quick = (label, href) => `<a class="btn secondary" href="${href}">${esc(label)}</a>`;
    const partnerList = (title, rows, type) => `<section class="card"><div class="section-head"><h2>${esc(title)}</h2><span class="pill">${rows.length}</span></div><div class="activity-list">${rows.map((x) => `<div class="activity-row"><span><b>${esc(x.name || type)}</b><span>${esc(x.phone || x.whatsapp || 'No phone')} - ${esc(x.area || x.category || 'No area')} - ${esc(x.status || 'pending')}</span></span><a class="btn secondary" href="/admin/${type}/${encodeURIComponent(x.id)}">View</a>${customerContactActions(x.whatsapp || x.phone, x.name)}</div>`).join('') || '<div class="activity-row"><b>No partners found</b><span>Add partners from onboarding.</span></div>'}</div></section>`;
    res.send(page('WhatsApp Control', `<section class="card app-hero"><span class="pill">Communication</span><h1>GOVO WhatsApp / Call Control</h1><p>Manual communication hub for customers, merchants, providers, riders, and support follow-up.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a>${quick('Support Inbox','/admin/support')}${quick('Launch Task Board','/admin/tasks')}${quick('Pilot Onboarding','/admin/onboarding')}${quick('Order Dispatch','/admin/orders')}${quick('Service Requests','/admin/service-requests')}</div></section><section class="card"><div class="section-head"><h2>Public WhatsApp</h2>${publicHref ? badge('connected') : badge('manual')}</div>${publicHref ? `<p><a class="btn wa" href="${esc(publicHref)}">Open Public WhatsApp</a></p>` : '<p style="color:var(--muted);font-weight:900">WhatsApp automation is not connected yet. Use manual WhatsApp links for now.</p>'}</section><section class="grid two">${partnerList('Merchant Quick Communication', merchants.rows, 'merchant')}${partnerList('Provider Quick Communication', providers.rows, 'provider')}${partnerList('Rider Quick Communication', riders.rows, 'rider')}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.get('/admin/qa', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const routes = ['/app','/shops','/services','/order','/service-request','/support','/track','/admin/os','/admin/command','/admin/orders','/admin/service-requests','/admin/support','/admin/tasks','/admin/onboarding','/admin/finance','/admin/whatsapp'];
    const checks = ['Public pages','Admin pages','Order flow','Service request flow','Support flow','Merchant/Rider login','No demo data public','No PIN in URL'];
    const routeCards = routes.map((href) => `<a class="activity-row" href="${href}"><span><b>${esc(href)}</b><span>Open route for manual QA</span></span>${badge('check')}</a>`).join('');
    const checkCards = checks.map((x) => `<div class="activity-row"><span><b>${esc(x)}</b><span>Manual verification required</span></span>${badge('manual')}</div>`).join('');
    res.send(page('QA Dashboard', `<section class="card app-hero"><span class="pill">QA</span><h1>GOVO QA Dashboard</h1><p>Route checklist and manual launch QA controls. Status is manual until automated probes are connected.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/finance">Finance Ledger</a><a class="btn secondary" href="/admin/whatsapp">WhatsApp Control</a></div></section><section class="grid two"><section class="card"><div class="section-head"><h2>Route Checklist</h2><span class="pill">${routes.length}</span></div><div class="activity-list">${routeCards}</div></section><section class="card"><div class="section-head"><h2>Manual QA Checklist</h2><span class="pill">Launch</span></div><div class="activity-list">${checkCards}</div></section></section>`, 'admin'));
  } catch (e) { next(e); }
});

app.get('/admin/finance', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const [summary, entries] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(cash_collected) FILTER (WHERE created_at::date=CURRENT_DATE),0) AS today_cash_collected, COALESCE(SUM(delivery_fee) FILTER (WHERE created_at::date=CURRENT_DATE),0) AS today_delivery_fee, COALESCE(SUM(commission_amount) FILTER (WHERE created_at::date=CURRENT_DATE),0) AS today_commission, COALESCE(SUM(merchant_payable) FILTER (WHERE created_at::date=CURRENT_DATE),0) AS today_merchant_payable, COALESCE(SUM(rider_payout) FILTER (WHERE created_at::date=CURRENT_DATE),0) AS today_rider_payout, COALESCE(SUM(amount) FILTER (WHERE COALESCE(settlement_status,'pending') <> 'settled'),0) AS unsettled_amount FROM govo_finance_ledger`),
      pool.query(`SELECT id, ref_type, ref_code, partner_type, partner_name, phone, amount, delivery_fee, commission_amount, merchant_payable, rider_payout, cash_collected, payment_method, payment_status, settlement_status, direction, note, created_at FROM govo_finance_ledger ORDER BY id DESC LIMIT 120`),
    ]);
    const srow = summary.rows[0] || {};
    const stat = (label, value) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">৳${esc(moneyValue(value).toFixed(2).replace(/\.00$/, ''))}</div></div>`;
    const opts = (values, current) => values.map((v) => `<option value="${esc(v)}" ${String(current || '').toLowerCase() === v ? 'selected' : ''}>${esc(v)}</option>`).join('');
    const entryCards = entries.rows.map((x) => `<div class="activity-row"><span><b>#${esc(x.id)} ${esc(x.ref_code || x.ref_type || 'manual')}</b><span>${esc(x.partner_type || 'general')} - ${esc(x.partner_name || 'No partner')} - ৳${esc(moneyValue(x.amount).toFixed(2).replace(/\.00$/, ''))} - ${esc(bdTime(x.created_at))}</span></span><span>${badge(x.payment_status)}${badge(x.settlement_status)}${badge(x.direction)}</span>${customerContactActions(x.phone, x.partner_name)}<form class="filters" method="POST" action="/admin/finance/update"><input type="hidden" name="id" value="${esc(x.id)}"><select name="payment_status">${opts(['unpaid','paid','partial','refunded'], x.payment_status)}</select><select name="settlement_status">${opts(['pending','settled','partial','cancelled'], x.settlement_status)}</select><input name="note" value="${esc(x.note || '')}" placeholder="Note"><button>Update</button></form></div>`).join('') || '<div class="activity-row"><b>No ledger entries yet</b><span>Create the first manual entry.</span></div>';
    res.send(page('Finance Ledger', `<section class="card app-hero"><span class="pill">Finance</span><h1>Finance Ledger</h1><p>Cash, delivery fee, commission, payable, payout, and settlement tracking.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a><a class="btn secondary" href="/admin/support">Support Inbox</a></div></section><section class="grid">${stat('Today Cash Collected', srow.today_cash_collected)}${stat('Today Delivery Fee', srow.today_delivery_fee)}${stat('Today Commission', srow.today_commission)}${stat('Today Merchant Payable', srow.today_merchant_payable)}${stat('Today Rider Payout', srow.today_rider_payout)}${stat('Unsettled Amount', srow.unsettled_amount)}</section><section class="card"><h2>Manual Entry</h2><form method="POST" action="/admin/finance/create"><div class="filters"><input name="ref_type" placeholder="ref type" value="manual"><input name="ref_code" placeholder="ref code"><select name="partner_type"><option>merchant</option><option>provider</option><option>rider</option><option>customer</option><option>general</option></select><input name="partner_name" placeholder="partner name"><input name="phone" placeholder="phone"></div><div class="filters"><input name="amount" type="number" step="0.01" placeholder="amount"><input name="delivery_fee" type="number" step="0.01" placeholder="delivery fee"><input name="commission_amount" type="number" step="0.01" placeholder="commission"><input name="merchant_payable" type="number" step="0.01" placeholder="merchant payable"><input name="rider_payout" type="number" step="0.01" placeholder="rider payout"><input name="cash_collected" type="number" step="0.01" placeholder="cash collected"></div><div class="filters"><select name="payment_method"><option>cash</option><option>bKash</option><option>Nagad</option><option>card</option><option>bank</option></select><select name="payment_status"><option>unpaid</option><option>paid</option><option>partial</option><option>refunded</option></select><select name="settlement_status"><option>pending</option><option>settled</option><option>partial</option><option>cancelled</option></select><select name="direction"><option>in</option><option>out</option></select></div><label>Note</label><textarea name="note"></textarea><button>Create Ledger Entry</button></form></section><section class="card"><div class="section-head"><h2>Latest Ledger Entries</h2><span class="pill">${entries.rows.length}</span></div><div class="activity-list">${entryCards}</div></section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/finance/create', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await pool.query(`INSERT INTO govo_finance_ledger (ref_type, ref_code, partner_type, partner_name, phone, amount, delivery_fee, commission_amount, merchant_payable, rider_payout, cash_collected, payment_method, payment_status, settlement_status, direction, note, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`, [String(req.body.ref_type || 'manual').trim() || 'manual', String(req.body.ref_code || '').trim(), String(req.body.partner_type || 'general').trim().toLowerCase(), String(req.body.partner_name || '').trim(), String(req.body.phone || '').trim(), moneyValue(req.body.amount), moneyValue(req.body.delivery_fee), moneyValue(req.body.commission_amount), moneyValue(req.body.merchant_payable), moneyValue(req.body.rider_payout), moneyValue(req.body.cash_collected), String(req.body.payment_method || 'cash').trim(), cleanFinancePaymentStatus(req.body.payment_status), cleanFinanceSettlementStatus(req.body.settlement_status), cleanFinanceDirection(req.body.direction), String(req.body.note || '').trim()]);
    res.redirect('/admin/finance');
  } catch (e) { next(e); }
});

app.post('/admin/finance/update', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await pool.query(`UPDATE govo_finance_ledger SET payment_status=$1, settlement_status=$2, note=$3, updated_at=NOW() WHERE id=$4`, [cleanFinancePaymentStatus(req.body.payment_status), cleanFinanceSettlementStatus(req.body.settlement_status), String(req.body.note || '').trim(), String(req.body.id || '').replace(/\D/g, '')]);
    res.redirect('/admin/finance');
  } catch (e) { next(e); }
});

function cleanTaskPriority(v) {
  const s = String(v || 'normal').trim().toLowerCase();
  return ['low', 'normal', 'high', 'urgent'].includes(s) ? s : 'normal';
}

function cleanTaskStatus(v) {
  const s = String(v || 'todo').trim().toLowerCase();
  return ['todo', 'doing', 'done', 'cancelled'].includes(s) ? s : 'todo';
}

function cleanPartnerType(v) {
  const s = String(v || 'merchant').trim().toLowerCase();
  return ['merchant', 'provider', 'rider', 'general'].includes(s) ? s : 'merchant';
}


function cleanNoteType(v) {
  const s = String(v || 'followup').trim().toLowerCase();
  return ['call', 'whatsapp', 'meeting', 'task', 'followup', 'general'].includes(s) ? s : 'followup';
}

function cleanNoteStatus(v) {
  const s = String(v || 'open').trim().toLowerCase();
  return ['open', 'done', 'important'].includes(s) ? s : 'open';
}

function partnerDetailPath(type, id) {
  const t = ['merchant', 'provider', 'rider'].includes(String(type || '').toLowerCase()) ? String(type || '').toLowerCase() : 'merchant';
  return `/admin/${t}/${encodeURIComponent(id || '')}`;
}

async function fetchPartnerDetail(type, id) {
  if (type === 'merchant') {
    const r = await pool.query(`SELECT id, shop_name AS partner_name, owner_name, phone, whatsapp, COALESCE(shop_address, location) AS area, category, image_url, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo, admin_note, created_at FROM govo_merchant_leads WHERE id=$1 LIMIT 1`, [id]);
    return r.rows[0];
  }
  if (type === 'provider') {
    const r = await pool.query(`SELECT id, provider_name AS partner_name, phone, whatsapp, COALESCE(area, address) AS area, service_type AS category, image_url, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo, admin_note, created_at FROM govo_service_providers WHERE id=$1 LIMIT 1`, [id]);
    return r.rows[0];
  }
  const r = await pool.query(`SELECT id, COALESCE(rider_name, name) AS partner_name, phone, whatsapp, COALESCE(area, location) AS area, vehicle_type AS category, image_url, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo, admin_note, created_at FROM govo_rider_leads WHERE id=$1 LIMIT 1`, [id]);
  return r.rows[0];
}

async function renderPartnerDetail(req, res, next, type) {
  try {
    if (!requireAdmin(req, res)) return;
    const id = String(req.params.id || '').replace(/\D/g, '');
    if (!id) return res.status(404).send(page('Partner Not Found', `<section class="card"><h1>Partner not found</h1><a class="btn" href="/admin/onboarding">Back to onboarding</a></section>`, 'admin'));
    const partner = await fetchPartnerDetail(type, id);
    if (!partner) return res.status(404).send(page('Partner Not Found', `<section class="card"><h1>Partner not found</h1><a class="btn" href="/admin/onboarding">Back to onboarding</a></section>`, 'admin'));
    const tasks = await pool.query(`SELECT id, task_type, title, priority, status, due_date, note, created_at FROM govo_launch_tasks WHERE partner_type=$1 AND partner_id=$2 ORDER BY CASE status WHEN 'todo' THEN 1 WHEN 'doing' THEN 2 WHEN 'done' THEN 3 WHEN 'cancelled' THEN 4 ELSE 5 END, id DESC LIMIT 50`, [type, id]);
    const notes = await pool.query(`SELECT id, note_type, status, note, next_followup_at, created_at FROM govo_partner_notes WHERE partner_type=$1 AND partner_id=$2 ORDER BY id DESC LIMIT 80`, [type, id]);
    const name = partner.partner_name || `${type} #${id}`;
    const phone = partner.whatsapp || partner.phone || '';
    const visible = boolish(partner.public_visible);
    const waPhone = String(partner.whatsapp || partner.phone || '').replace(/\D/g, '');
    const callPhone = String(partner.phone || partner.whatsapp || '').trim();
    const contactHtml = `<div class="actions">${waPhone ? `<a class="btn secondary wa" href="https://wa.me/${esc(waPhone)}?text=${encodeURIComponent(`Assalamu alaikum ${name}, GOVO pilot follow-up.`)}">WhatsApp</a>` : ''}${callPhone ? `<a class="btn secondary" href="tel:${esc(callPhone)}">Call</a>` : ''}</div>`;
    const editHref = type === 'merchant' ? `/admin/leads?q=${encodeURIComponent(partner.phone || name || id)}&status=all&visibility=all` : type === 'provider' ? `/admin/providers?q=${encodeURIComponent(partner.phone || name || id)}&status=all&visibility=all` : `/admin/riders?q=${encodeURIComponent(partner.phone || name || id)}&status=all&visibility=all`;
    const taskCards = tasks.rows.map((x) => `<div class="activity-row"><b>#${esc(x.id)} ${esc(x.title || 'Task')}</b><span>${badge(x.status)} ${badge(x.priority)} ${esc(x.task_type || 'followup')} ${x.due_date ? `- Due: ${esc(x.due_date)}` : ''}</span>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div>`).join('') || '<p style="color:var(--muted)">No related launch tasks yet.</p>';
    const noteStatusButtons = (x) => `<form class="inline" method="POST" action="/admin/partner-notes/update-status"><input type="hidden" name="id" value="${esc(x.id)}"><input type="hidden" name="partner_type" value="${esc(type)}"><input type="hidden" name="partner_id" value="${esc(id)}"><button name="status" value="open" class="secondary">Open</button><button name="status" value="done">Done</button><button name="status" value="important" class="secondary">Important</button></form>`;
    const timeline = notes.rows.map((x) => `<div class="activity-row"><div class="section-head"><b>${esc(x.note_type || 'followup')}</b><span>${badge(x.status)}</span></div><p>${esc(x.note || '')}</p><small>${x.next_followup_at ? `Next: ${esc(x.next_followup_at)} - ` : ''}${bdTime(x.created_at)}</small>${noteStatusButtons(x)}</div>`).join('') || '<p style="color:var(--muted)">No follow-up history yet. Add first note.</p>';
    const statusAction = `<form method="POST" action="/admin/${type}/status"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="admin_note" value="Partner CRM quick approve"><button name="status" value="approved">Approve</button></form>`;
    const visibilityAction = `<form method="POST" action="/admin/${type}/visibility"><input type="hidden" name="id" value="${esc(id)}"><button class="secondary" name="action" value="${visible ? 'hide_public' : 'show_public'}">${visible ? 'Hide Public' : 'Show Public'}</button></form>`;
    const noteForm = `<form method="POST" action="/admin/partner-notes/create"><input type="hidden" name="partner_type" value="${esc(type)}"><input type="hidden" name="partner_id" value="${esc(id)}"><input type="hidden" name="partner_name" value="${esc(name)}"><input type="hidden" name="phone" value="${esc(partner.phone || '')}"><div class="filters"><select name="note_type">${['followup','call','whatsapp','meeting','task','general'].map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select><select name="status">${['open','important','done'].map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select><input name="next_followup_at" placeholder="Next follow-up"></div><label>Note</label><textarea name="note" required placeholder="Add follow-up note"></textarea><button>Add Note</button></form>`;
    const merchantProducts = type === 'merchant' ? (await pool.query(`SELECT id, name, category, price, stock_status, public_visible FROM govo_products WHERE merchant_id=$1 ORDER BY id DESC LIMIT 80`, [id])).rows : [];
    const productSection = type === 'merchant' ? `<section class="card"><div class="section-head"><h2>Products / Menu</h2><span class="pill">${merchantProducts.length}</span></div><div class="activity-list">${merchantProducts.map((p) => `<div class="activity-row"><span><b>${esc(p.name || 'Product')}</b><span>${esc(p.category || 'Menu')} - ৳${esc(p.price || 0)} - ${esc(p.stock_status || 'available')}</span></span><form class="inline" method="POST" action="/admin/products/visibility"><input type="hidden" name="id" value="${esc(p.id)}"><input type="hidden" name="merchant_id" value="${esc(id)}"><button name="action" value="show" class="secondary">Show</button><button name="action" value="hide" class="reject">Hide</button></form></div>`).join('') || '<p style="color:var(--muted)">No products/menu yet.</p>'}</div></section>` : '';
    res.send(page(`${name} CRM`, `<section class="card app-hero"><h1>${esc(name)}</h1><p>${esc(type)} partner detail and follow-up history.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a><a class="btn secondary" href="/admin/support">Support Inbox</a><a class="btn secondary" href="/admin/onboarding">Pilot Onboarding</a><a class="btn secondary" href="/admin/tasks">Launch Task Board</a></div></section><section class="grid two"><div class="card compact-card"><div class="section-head"><h2>Profile</h2>${badge(partner.status)}</div>${listingImage(partner.image_url, name, true)}<div class="actions trust-row"><span class="pill">${visible ? 'Public Visible' : 'Hidden'}</span>${boolish(partner.is_demo) ? '<span class="pill danger">Demo/Test</span>' : '<span class="pill">Real Partner</span>'}</div><div class="detail-grid"><div><b>Phone</b><span>${esc(partner.phone || 'No phone')}</span></div><div><b>Area</b><span>${esc(partner.area || 'No area')}</span></div><div><b>Category</b><span>${esc(partner.category || 'No category')}</span></div><div><b>Created</b><span>${bdTime(partner.created_at)}</span></div></div>${partner.admin_note ? `<p>${esc(partner.admin_note)}</p>` : ''}${contactHtml}<div class="actions"><a class="btn secondary" href="${editHref}">Edit / Manage</a>${statusAction}${visibilityAction}</div></div><div class="card"><h2>Add Follow-up Note</h2>${noteForm}</div></section><section class="grid two"><div class="card"><h2>Related Launch Tasks</h2><div class="activity-list">${taskCards}</div></div><div class="card"><h2>Follow-up History</h2><div class="activity-list">${timeline}</div></div></section>${productSection}`, 'admin'));
  } catch (e) { next(e); }
}

app.get('/admin/merchant/:id', (req, res, next) => renderPartnerDetail(req, res, next, 'merchant'));
app.get('/admin/provider/:id', (req, res, next) => renderPartnerDetail(req, res, next, 'provider'));
app.get('/admin/rider/:id', (req, res, next) => renderPartnerDetail(req, res, next, 'rider'));

app.post('/admin/partner-notes/create', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const type = cleanPartnerType(req.body.partner_type);
    const partnerId = String(req.body.partner_id || '').replace(/\D/g, '');
    const note = String(req.body.note || '').trim();
    if (!note) return res.redirect(partnerDetailPath(type, partnerId));
    await pool.query(`INSERT INTO govo_partner_notes (partner_type, partner_id, partner_name, phone, note_type, status, note, next_followup_at, created_at, updated_at) VALUES ($1,NULLIF($2,'')::int,$3,$4,$5,$6,$7,$8,NOW(),NOW())`, [type, partnerId, String(req.body.partner_name || '').trim(), String(req.body.phone || '').trim(), cleanNoteType(req.body.note_type), cleanNoteStatus(req.body.status), note, String(req.body.next_followup_at || '').trim()]);
    res.redirect(partnerDetailPath(type, partnerId));
  } catch (e) { next(e); }
});

app.post('/admin/partner-notes/update-status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const type = cleanPartnerType(req.body.partner_type);
    const partnerId = String(req.body.partner_id || '').replace(/\D/g, '');
    await pool.query(`UPDATE govo_partner_notes SET status=$1, updated_at=NOW() WHERE id=$2`, [cleanNoteStatus(req.body.status), String(req.body.id || '')]);
    res.redirect(partnerDetailPath(type, partnerId));
  } catch (e) { next(e); }
});


app.post('/admin/products/visibility', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const action = String(req.body.action || '').trim().toLowerCase();
    const show = action === 'show';
    await pool.query(`UPDATE govo_products SET stock_status=$1, public_visible=$2, updated_at=NOW() WHERE id=$3 AND merchant_id=$4`, [show ? 'available' : 'hidden', show, String(req.body.id || ''), String(req.body.merchant_id || '')]);
    res.redirect(`/admin/merchant/${encodeURIComponent(String(req.body.merchant_id || ''))}`);
  } catch (e) { next(e); }
});

app.get('/admin/tasks', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const tasks = await pool.query(`SELECT id, task_type, title, partner_type, partner_id, partner_name, phone, area, priority, status, due_date, note, created_at, updated_at FROM govo_launch_tasks ORDER BY CASE status WHEN 'todo' THEN 1 WHEN 'doing' THEN 2 WHEN 'done' THEN 3 WHEN 'cancelled' THEN 4 ELSE 5 END, CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, NULLIF(due_date,'') NULLS LAST, id DESC LIMIT 300`);
    const statuses = [['todo', 'Todo'], ['doing', 'Doing'], ['done', 'Done'], ['cancelled', 'Cancelled']];
    const priorityBadge = (p) => `<span class="badge ${p === 'urgent' ? 'emergency' : p === 'high' ? 'failed' : p === 'low' ? 'clear' : 'available'}">${esc(p || 'normal')}</span>`;
    const contactActions = (x) => {
      const phone = String(x.phone || '').trim();
      const wa = phone.replace(/\D/g, '');
      return `<div class="actions">${wa ? `<a class="btn secondary wa" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(`GOVO launch follow-up: ${x.title || ''}`)}">WhatsApp</a>` : ''}${phone ? `<a class="btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}</div>`;
    };
    const statusButtons = (x) => `<form method="POST" action="/admin/tasks/update-status"><input type="hidden" name="id" value="${esc(x.id)}"><div class="actions">${statuses.map(([value, label]) => `<button class="${x.status === value ? '' : 'secondary'}" name="status" value="${value}">${label}</button>`).join('')}</div></form>`;
    const detailLink = (x) => ['merchant', 'provider', 'rider'].includes(String(x.partner_type || '').toLowerCase()) && x.partner_id ? `<a class="btn secondary" href="/admin/${encodeURIComponent(String(x.partner_type).toLowerCase())}/${encodeURIComponent(x.partner_id)}">View Details</a>` : '';
    const taskCard = (x) => `<div class="card compact-card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.title || 'Untitled task')}</h2>${priorityBadge(x.priority)}</div><div class="compact-meta"><span>${esc(x.task_type || 'followup')}</span><span>${esc(x.partner_type || 'general')}</span>${x.due_date ? `<span>Due: ${esc(x.due_date)}</span>` : ''}</div><div class="detail-grid"><div><b>Partner</b><span>${esc(x.partner_name || 'General')}<br>${esc(x.phone || 'No phone')}</span></div><div><b>Area</b><span>${esc(x.area || 'No area')}</span></div><div><b>Note</b><span>${esc(x.note || 'No note')}</span></div></div>${contactActions(x)}<div class="actions">${detailLink(x)}</div>${statusButtons(x)}<form method="POST" action="/admin/tasks/delete-soft"><input type="hidden" name="id" value="${esc(x.id)}"><button class="reject">Cancel Task</button></form></div>`;
    const columns = statuses.map(([key, label]) => {
      const rows = tasks.rows.filter((x) => cleanTaskStatus(x.status) === key);
      return `<section class="card"><div class="section-head"><h2>${label}</h2><span class="pill">${rows.length}</span></div><div class="cards compact">${rows.map(taskCard).join('') || '<div class="card compact-card"><h2>No tasks</h2></div>'}</div></section>`;
    }).join('');
    const opt = (value, label) => `<option value="${value}">${label}</option>`;
    res.send(page('Launch Task Board', `<section class="card app-hero"><h1>Launch Task Board</h1><p>Daily GOVO pilot follow-up board for merchants, providers, riders and general launch work.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a><a class="btn secondary" href="/admin/support">Support Inbox</a><a class="btn secondary" href="/admin/onboarding">Pilot Onboarding</a></div></section><section class="card"><h2>Add Task</h2><form method="POST" action="/admin/tasks/create"><label>Title</label><input name="title" required placeholder="Call merchant about product photos"><div class="filters"><select name="task_type">${['followup','profile','products','approval','training','delivery','general'].map((v) => opt(v, v)).join('')}</select><select name="partner_type">${['merchant','provider','rider','general'].map((v) => opt(v, v)).join('')}</select><select name="priority">${['normal','high','urgent','low'].map((v) => opt(v, v)).join('')}</select></div><label>Partner Name</label><input name="partner_name"><label>Phone</label><input name="phone"><label>Area</label><input name="area"><label>Due Date</label><input name="due_date" placeholder="Today / 2026-06-21"><label>Note</label><textarea name="note"></textarea><button>Add Task</button></form></section><section class="grid two">${columns}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/tasks/create', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).send(page('Missing Task Title', '<section class="card"><h1>Missing task title</h1><a class="btn secondary" href="/admin/tasks">Back Tasks</a></section>', 'admin'));
    const partnerId = String(req.body.partner_id || '').replace(/\D/g, '');
    await pool.query(`INSERT INTO govo_launch_tasks (task_type, title, partner_type, partner_id, partner_name, phone, area, priority, status, due_date, note, created_at, updated_at) VALUES ($1,$2,$3,NULLIF($4,'')::int,$5,$6,$7,$8,'todo',$9,$10,NOW(),NOW())`, [String(req.body.task_type || 'followup').trim() || 'followup', title, cleanPartnerType(req.body.partner_type), partnerId, String(req.body.partner_name || '').trim(), String(req.body.phone || '').trim(), String(req.body.area || '').trim(), cleanTaskPriority(req.body.priority), String(req.body.due_date || '').trim(), String(req.body.note || '').trim()]);
    res.redirect('/admin/tasks');
  } catch (e) { next(e); }
});

app.post('/admin/tasks/update-status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await pool.query(`UPDATE govo_launch_tasks SET status=$1, updated_at=NOW() WHERE id=$2`, [cleanTaskStatus(req.body.status), String(req.body.id || '')]);
    res.redirect('/admin/tasks');
  } catch (e) { next(e); }
});

app.post('/admin/tasks/delete-soft', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await pool.query(`UPDATE govo_launch_tasks SET status='cancelled', updated_at=NOW() WHERE id=$1`, [String(req.body.id || '')]);
    res.redirect('/admin/tasks');
  } catch (e) { next(e); }
});


app.get('/admin/onboarding', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const realWhere = `COALESCE(is_demo,false)=false`;
    const publicWhere = `LOWER(TRIM(COALESCE(status,'')))='approved' AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false`;
    const productJoin = `LEFT JOIN govo_shop_products p ON (p.merchant_lead_id=m.id OR p.merchant_phone=m.phone OR p.merchant_phone=m.whatsapp) AND COALESCE(p.is_deleted,false)=false`;
    const [merchantCounts, merchantProductStats, providerCounts, riderCounts, merchants, providers, riders] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(status,'')))='approved')::int approved, COUNT(*) FILTER (WHERE ${publicWhere})::int visible, COUNT(*) FILTER (WHERE COALESCE(image_url,'')='' AND COALESCE(shop_name,'') <> '')::int missing_image FROM govo_merchant_leads WHERE ${realWhere}`),
      pool.query(`SELECT COUNT(*)::int missing_products FROM (SELECT m.id, COUNT(p.id)::int product_count FROM govo_merchant_leads m ${productJoin} WHERE COALESCE(m.is_demo,false)=false GROUP BY m.id) x WHERE x.product_count=0`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(status,'')))='approved')::int approved, COUNT(*) FILTER (WHERE ${publicWhere})::int visible FROM govo_service_providers WHERE ${realWhere}`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE LOWER(TRIM(COALESCE(status,'')))='approved')::int approved FROM govo_rider_leads WHERE ${realWhere}`),
      pool.query(`SELECT m.id, m.shop_name, m.owner_name, m.phone, m.whatsapp, m.location, m.shop_address, m.category, CASE WHEN m.status IS NULL OR TRIM(m.status)='' THEN 'pending' ELSE LOWER(TRIM(m.status)) END AS status, COALESCE(m.public_visible,true) AS public_visible, COALESCE(m.is_demo,false) AS is_demo, m.image_url, COUNT(p.id)::int AS product_count FROM govo_merchant_leads m ${productJoin} WHERE COALESCE(m.is_demo,false)=false GROUP BY m.id, m.shop_name, m.owner_name, m.phone, m.whatsapp, m.location, m.shop_address, m.category, m.status, m.public_visible, m.is_demo, m.image_url ORDER BY CASE WHEN LOWER(TRIM(COALESCE(m.status,'')))='approved' THEN 1 ELSE 0 END ASC, COALESCE(m.public_visible,true) ASC, COUNT(p.id) ASC, m.id DESC LIMIT 80`),
      pool.query(`SELECT id, provider_name, phone, whatsapp, service_type, area, address, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo, image_url FROM govo_service_providers WHERE ${realWhere} ORDER BY CASE WHEN LOWER(TRIM(COALESCE(status,'')))='approved' THEN 1 ELSE 0 END ASC, COALESCE(public_visible,true) ASC, id DESC LIMIT 80`),
      pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, whatsapp, location, area, vehicle_type, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo FROM govo_rider_leads WHERE ${realWhere} ORDER BY CASE WHEN LOWER(TRIM(COALESCE(status,'')))='approved' THEN 1 ELSE 0 END ASC, COALESCE(public_visible,true) ASC, id DESC LIMIT 80`),
    ]);
    const mc = merchantCounts.rows[0] || {};
    const pc = providerCounts.rows[0] || {};
    const rc = riderCounts.rows[0] || {};
    const missingProducts = Number((merchantProductStats.rows[0] || {}).missing_products || 0);
    const checklist = [
      ['At least 5 approved public merchants', Number(mc.visible || 0) >= 5],
      ['At least 3 approved service providers', Number(pc.visible || 0) >= 3],
      ['At least 2 approved riders', Number(rc.approved || 0) >= 2],
      ['Public pages clean', true],
      ['Contact links active', true],
      ['Admin can call/WhatsApp partners', true],
    ];
    const passCount = checklist.filter((x) => x[1]).length;
    const readyScore = Math.round((passCount / checklist.length) * 100);
    const stat = (label, value, hint = '') => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div><p>${esc(hint)}</p></div>`;
    const contactActions = (phone, whatsapp, label) => {
      const callPhone = String(phone || whatsapp || '').trim();
      const waPhone = String(whatsapp || phone || '').replace(/\D/g, '');
      return `<div class="actions">${waPhone ? `<a class="btn secondary wa" href="https://wa.me/${esc(waPhone)}?text=${encodeURIComponent(`Assalamu alaikum ${label || ''}, GOVO pilot onboarding update.`)}">WhatsApp</a>` : ''}${callPhone ? `<a class="btn secondary" href="tel:${esc(callPhone)}">Call</a>` : ''}</div>`;
    };
    const statusForm = (type, id, status = 'approved') => `<form method="POST" action="/admin/${type}/status"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="admin_note" value="Pilot onboarding quick action"><button name="status" value="${esc(status)}">Approve</button></form>`;
    const visibilityForm = (type, id, actionValue, label, secondary = true) => `<form method="POST" action="/admin/${type}/visibility"><input type="hidden" name="id" value="${esc(id)}"><button class="${secondary ? 'secondary' : ''}" name="action" value="${esc(actionValue)}">${esc(label)}</button></form>`;
    const imageStatus = (url) => `<span class="badge ${url ? 'available' : 'unavailable'}">${url ? 'Image OK' : 'Missing Image'}</span>`;
    const publicStatus = (x) => `<span class="badge ${boolish(x.public_visible) ? 'available' : 'unavailable'}">${boolish(x.public_visible) ? 'Public Visible' : 'Hidden'}</span>`;
    const editLink = (href, label = 'Edit Profile') => `<a class="btn secondary" href="${href}">${esc(label)}</a>`;
    const quickTaskForm = (type, x, name, phone, area) => `<form method="POST" action="/admin/tasks/create"><input type="hidden" name="title" value="Follow up: ${esc(name || type)}"><input type="hidden" name="task_type" value="followup"><input type="hidden" name="partner_type" value="${esc(type)}"><input type="hidden" name="partner_id" value="${esc(x.id || '')}"><input type="hidden" name="partner_name" value="${esc(name || '')}"><input type="hidden" name="phone" value="${esc(phone || '')}"><input type="hidden" name="area" value="${esc(area || '')}"><input type="hidden" name="priority" value="normal"><input type="hidden" name="note" value="Created from onboarding dashboard"><button class="secondary">Create Follow-up Task</button></form>`;
    const merchantCard = (x) => `<div class="card compact-card"><div class="section-head"><h2>${esc(x.shop_name || 'Unnamed Shop')}</h2>${badge(x.status)}</div><div class="actions trust-row">${publicStatus(x)}${imageStatus(x.image_url)}<span class="badge ${Number(x.product_count || 0) > 0 ? 'available' : 'unavailable'}">${esc(x.product_count || 0)} Products</span></div><div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name || 'Not set')}</span></div><div><b>Phone</b><span>${esc(x.whatsapp || x.phone || 'No phone')}</span></div><div><b>Area / Category</b><span>${esc(x.shop_address || x.location || 'No area')}<br>${esc(x.category || 'No category')}</span></div></div>${contactActions(x.phone, x.whatsapp, x.owner_name || x.shop_name)}<div class="actions">${statusForm('merchant', x.id)}${visibilityForm('merchant', x.id, boolish(x.public_visible) ? 'hide_public' : 'show_public', boolish(x.public_visible) ? 'Hide Public' : 'Show Public')}${visibilityForm('merchant', x.id, 'mark_demo', 'Mark Demo')}${editLink(`/admin/leads?q=${encodeURIComponent(x.phone || x.shop_name || x.id)}&status=all&visibility=all`)}${editLink(`/admin/merchant/${encodeURIComponent(x.id)}`, 'View Details')}${editLink(`/merchant/products?phone=${encodeURIComponent(x.phone || '')}`, 'Add Product')}${quickTaskForm('merchant', x, x.shop_name || x.owner_name, x.whatsapp || x.phone, x.shop_address || x.location)}</div></div>`;
    const providerCard = (x) => `<div class="card compact-card"><div class="section-head"><h2>${esc(x.provider_name || 'Unnamed Provider')}</h2>${badge(x.status)}</div><div class="actions trust-row">${publicStatus(x)}${imageStatus(x.image_url)}<span class="pill">${esc(x.service_type || 'Service')}</span></div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.whatsapp || x.phone || 'No phone')}</span></div><div><b>Area</b><span>${esc(x.area || x.address || 'No area')}</span></div></div>${contactActions(x.phone, x.whatsapp, x.provider_name)}<div class="actions">${statusForm('provider', x.id)}${visibilityForm('provider', x.id, boolish(x.public_visible) ? 'hide_public' : 'show_public', boolish(x.public_visible) ? 'Hide Public' : 'Show Public')}${visibilityForm('provider', x.id, 'mark_demo', 'Mark Demo')}${editLink(`/admin/providers?q=${encodeURIComponent(x.phone || x.provider_name || x.id)}&status=all&visibility=all`)}${editLink(`/admin/provider/${encodeURIComponent(x.id)}`, 'View Details')}${quickTaskForm('provider', x, x.provider_name, x.whatsapp || x.phone, x.area || x.address)}</div></div>`;
    const riderCard = (x) => `<div class="card compact-card"><div class="section-head"><h2>${esc(x.rider_name || 'Unnamed Rider')}</h2>${badge(x.status)}</div><div class="actions trust-row">${publicStatus(x)}<span class="pill">${esc(x.vehicle_type || 'Vehicle not set')}</span></div><div class="detail-grid"><div><b>Phone</b><span>${esc(x.whatsapp || x.phone || 'No phone')}</span></div><div><b>Area</b><span>${esc(x.area || x.location || 'No area')}</span></div></div>${contactActions(x.phone, x.whatsapp, x.rider_name)}<div class="actions">${statusForm('rider', x.id)}${visibilityForm('rider', x.id, boolish(x.public_visible) ? 'hide_public' : 'show_public', boolish(x.public_visible) ? 'Hide Public' : 'Show Public')}${visibilityForm('rider', x.id, 'mark_demo', 'Mark Demo')}${editLink(`/admin/riders?q=${encodeURIComponent(x.phone || x.rider_name || x.id)}&status=all&visibility=all`)}${editLink(`/admin/rider/${encodeURIComponent(x.id)}`, 'View Details')}${quickTaskForm('rider', x, x.rider_name, x.whatsapp || x.phone, x.area || x.location)}</div></div>`;
    const checklistHtml = checklist.map(([label, ok]) => `<div class="activity-row"><span><b>${esc(label)}</b><span>${ok ? 'Ready for pilot' : 'Needs attention before launch'}</span></span><span class="badge ${ok ? 'available' : 'emergency'}">${ok ? 'PASS' : 'NEED WORK'}</span></div>`).join('');
    res.send(page('Pilot Onboarding', `<section class="card app-hero"><h1>Real Pilot Onboarding</h1><p>Launch control for real merchants, providers and riders.</p><div class="actions"><a class="btn" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/tasks">Launch Task Board</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a><a class="btn secondary" href="/admin/onboarding">Partner CRM</a><a class="btn secondary" href="/admin/leads?filter=all">Merchants</a><a class="btn secondary" href="/admin/providers?filter=all">Providers</a><a class="btn secondary" href="/admin/riders?filter=all">Riders</a></div></section><section class="grid">${stat('Total Real Merchants', mc.total)}${stat('Approved Merchants', mc.approved)}${stat('Visible Public Merchants', mc.visible)}${stat('Merchants Missing Image', mc.missing_image)}${stat('Merchants Missing Products', missingProducts)}${stat('Total Service Providers', pc.total)}${stat('Approved Providers', pc.approved)}${stat('Visible Public Providers', pc.visible)}${stat('Total Riders', rc.total)}${stat('Approved Riders', rc.approved)}${stat('Launch Ready Score', `${readyScore}%`, `${passCount}/${checklist.length} checks passing`)}</section><section class="card"><h2>Launch Checklist</h2><div class="activity-list">${checklistHtml}</div></section><section class="card"><div class="section-head"><h2>Merchant Onboarding</h2><span class="pill">${merchants.rows.length} showing</span></div></section><section class="cards">${merchants.rows.map(merchantCard).join('') || '<div class="card"><h2>No real merchants found</h2></div>'}</section><section class="card"><div class="section-head"><h2>Provider Onboarding</h2><span class="pill">${providers.rows.length} showing</span></div></section><section class="cards">${providers.rows.map(providerCard).join('') || '<div class="card"><h2>No real providers found</h2></div>'}</section><section class="card"><div class="section-head"><h2>Rider Onboarding</h2><span class="pill">${riders.rows.length} showing</span></div></section><section class="cards">${riders.rows.map(riderCard).join('') || '<div class="card"><h2>No real riders found</h2></div>'}</section>`, 'admin'));
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
    res.send(page('Pilot Dashboard', `<section class="card app-hero"><h1>GOVO Pilot Dashboard</h1><p>Control panel for first merchants, providers, riders and customer pilot traffic.</p><div class="actions"><span class="badge ${ready ? 'available' : 'failed'}">${ready ? 'ready' : 'needs attention'}</span><a class="btn secondary" href="/pilot">Public Pilot Page</a></div><h2>${ready ? 'Pilot can start with internal users' : 'Approve at least one merchant, provider and rider first'}</h2></section><section class="grid">${stat('Total Merchants', m.total, 'Registered')}${stat('Approved Merchants', m.approved, 'Ready for pilot')}${stat('Pending Merchants', m.pending, 'Need approval')}${stat('Total Providers', p.total, 'Registered')}${stat('Approved Providers', p.approved, 'Ready for pilot')}${stat('Pending Providers', p.pending, 'Need approval')}${stat('Total Riders', r.total, 'Registered')}${stat('Approved Riders', r.approved, 'Ready for dispatch')}${stat('Pending Riders', r.pending, 'Need approval')}${stat('Orders Today', o.total_today, 'Today')}${stat('Pending Orders', o.pending, 'Need action')}${stat('Delivered Today', o.delivered, 'Completed today')}${stat('Service Requests Today', sr.total_today, 'Today')}${stat('Pending Service Requests', sr.pending, 'Need action')}${stat('Completed Service Requests', sr.completed, 'Completed today')}</section><section class="card"><h2>Pilot Links</h2><div class="toolbar">${link('Pilot CRM','/admin/pilot-crm')}${link('Launch Checklist','/admin/launch-checklist')}${link('QA Center','/admin/qa')}${link('Orders','/admin/orders')}${link('Service Requests','/admin/service-requests')}${link('Merchants','/admin/leads?filter=all')}${link('Providers','/admin/providers?filter=all')}${link('Riders','/admin/riders?filter=all')}${link('Public Pilot Page','/pilot')}</div></section>`, 'admin'));
  } catch (e) { next(e); }
});

app.get('/admin/leads', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const pin = getPin(req);
    const filterAll = String(req.query.filter || '').trim().toLowerCase() === 'all';
    const statusDefault = filterAll ? 'all' : 'pending';
    const visibilityDefault = 'all';
    const status = ['pending', 'approved', 'rejected', 'all'].includes(String(req.query.status || statusDefault).trim().toLowerCase()) ? String(req.query.status || statusDefault).trim().toLowerCase() : statusDefault;
    const visibility = ['visible', 'hidden', 'demo', 'all'].includes(String(req.query.visibility || visibilityDefault).trim().toLowerCase()) ? String(req.query.visibility || visibilityDefault).trim().toLowerCase() : visibilityDefault;
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { where.push(approvalStatusWhere()[status]); }
    if (visibility !== 'all') { where.push(visibilityWhere()[visibility]); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(shop_name,'') || ' ' || COALESCE(owner_name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(category,'') || ' ' || COALESCE(products,'')) LIKE $${params.length}`); }
    const merchants = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, delivery_needed, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, admin_note, shop_description, shop_address, products, image_url, COALESCE(is_verified,false) AS is_verified, COALESCE(is_trusted,false) AS is_trusted, COALESCE(is_available,true) AS is_available, COALESCE(emergency_available,false) AS emergency_available, COALESCE(rating_avg,0) AS rating_avg, COALESCE(rating_count,0) AS rating_count, opening_hours, COALESCE(delivery_available,true) AS delivery_available, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo, password_hash, reset_requested_at, reset_note, created_at FROM govo_merchant_leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalRejectedSql})::int rejected FROM govo_merchant_leads`);
    const cards = merchants.rows.map((x) => `<div class="card">${listingImage(x.image_url, x.shop_name)}<div class="actions" style="justify-content:space-between"><h2>${esc(x.shop_name || 'Unnamed Shop')}</h2>${badge(x.status)}</div>${accountBadges(x)}${visibilityBadges(x)}${trustBadges(x)}<div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name)}</span></div><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div><div><b>Category</b><span>${esc(x.category)}</span></div><div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/admin/merchant/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminMerchantEditForm(x)}${adminPasswordResetForm('merchant', x)}${adminTrustControls('merchant', x, pin)}${adminVisibilityControls('merchant', x)}<div class="actions"><a class="btn secondary" href="/admin/merchant/${encodeURIComponent(x.id)}">View Details</a><a class="btn secondary" href="/shop/${encodeURIComponent(x.id)}">View Shop</a><a class="btn secondary" href="/merchant/dashboard?phone=${encodeURIComponent(x.phone || '')}">Dashboard</a><a class="btn secondary" href="/merchant/products?phone=${encodeURIComponent(x.phone || '')}">Products</a></div></div>`).join('');
    res.send(page('Admin Merchants', `${statCards(counts.rows[0] || {})}<section class="card"><h1>Admin Merchants</h1>${approvalFilterLinks('/admin/leads', status)}${visibilityFilterLinks('/admin/leads', status, visibility)}<form class="filters" method="GET" action="/admin/leads"><input name="q" value="${esc(q)}" placeholder="Search merchants"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><select name="visibility"><option value="all" ${visibility === 'all' ? 'selected' : ''}>All Visibility</option><option value="visible" ${visibility === 'visible' ? 'selected' : ''}>Visible</option><option value="hidden" ${visibility === 'hidden' ? 'selected' : ''}>Hidden</option><option value="demo" ${visibility === 'demo' ? 'selected' : ''}>Demo/Test</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/riders">Riders</a><a class="btn secondary" href="/admin/orders">Orders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No merchant found</h2></div>'}</section>`, 'admin'));
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
    const filterAll = String(req.query.filter || '').trim().toLowerCase() === 'all';
    const statusDefault = filterAll ? 'all' : 'pending';
    const visibilityDefault = 'all';
    const status = ['pending', 'approved', 'rejected', 'all'].includes(String(req.query.status || statusDefault).trim().toLowerCase()) ? String(req.query.status || statusDefault).trim().toLowerCase() : statusDefault;
    const visibility = ['visible', 'hidden', 'demo', 'all'].includes(String(req.query.visibility || visibilityDefault).trim().toLowerCase()) ? String(req.query.visibility || visibilityDefault).trim().toLowerCase() : visibilityDefault;
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    if (status !== 'all') { where.push(approvalStatusWhere()[status]); }
    if (visibility !== 'all') { where.push(visibilityWhere()[visibility]); }
    if (q) { params.push(`%${q.toLowerCase()}%`); where.push(`LOWER(COALESCE(rider_name,'') || ' ' || COALESCE(name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(vehicle_type,'')) LIKE $${params.length}`); }
    const riders = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, whatsapp, location, area, address, vehicle_type, experience, nid, image_url, COALESCE(is_available,true) AS is_available, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status, admin_note, COALESCE(public_visible,true) AS public_visible, COALESCE(is_demo,false) AS is_demo, password_hash, reset_requested_at, reset_note, created_at FROM govo_rider_leads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const counts = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE ${approvalPendingSql})::int pending, COUNT(*) FILTER (WHERE ${approvalApprovedSql})::int approved, COUNT(*) FILTER (WHERE ${approvalRejectedSql})::int rejected FROM govo_rider_leads`);
    const cards = riders.rows.map((x) => `<div class="card">${listingImage(x.image_url, x.rider_name)}<div class="actions" style="justify-content:space-between"><h2>${esc(x.rider_name || 'Unnamed Rider')}</h2>${badge(x.status)}</div>${accountBadges(x)}${visibilityBadges(x)}<div class="detail-grid"><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>Location</b><span>${esc(x.location)}</span></div><div><b>Vehicle</b><span>${esc(x.vehicle_type)}</span></div><div><b>Experience</b><span>${esc(x.experience)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div><form method="POST" action="/admin/rider/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminRiderEditForm(x)}${adminPasswordResetForm('rider', x)}${adminVisibilityControls('rider', x)}<div class="actions"><a class="btn secondary" href="/admin/rider/${encodeURIComponent(x.id)}">View Details</a></div></div>`).join('');
    res.send(page('Admin Riders', `${statCards(counts.rows[0] || {})}<section class="card"><h1>Admin Riders</h1>${approvalFilterLinks('/admin/riders', status)}${visibilityFilterLinks('/admin/riders', status, visibility)}<form class="filters" method="GET" action="/admin/riders"><input name="q" value="${esc(q)}" placeholder="Search riders"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><select name="visibility"><option value="all" ${visibility === 'all' ? 'selected' : ''}>All Visibility</option><option value="visible" ${visibility === 'visible' ? 'selected' : ''}>Visible</option><option value="hidden" ${visibility === 'hidden' ? 'selected' : ''}>Hidden</option><option value="demo" ${visibility === 'demo' ? 'selected' : ''}>Demo/Test</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/leads">Merchants</a><a class="btn secondary" href="/admin/orders">Orders</a></div></section><section class="cards">${cards || '<div class="card"><h2>No rider found</h2></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});



app.post('/admin/merchant/update', imageUpload.single('profile_image'), async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const id = String(req.body.id || '').trim();
    if (!id) return res.status(400).send(page('Missing Merchant ID', '<section class="card"><h1>Missing merchant ID</h1></section>', 'admin'));
    const current = (await pool.query(`SELECT * FROM govo_merchant_leads WHERE id=$1 LIMIT 1`, [id])).rows[0];
    if (!current) return res.status(404).send(page('Merchant Not Found', '<section class="card"><h1>Merchant not found</h1></section>', 'admin'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : keepValue(req.body.image_url, current.image_url);
    await pool.query(`UPDATE govo_merchant_leads SET shop_name=$1, owner_name=$2, phone=$3, whatsapp=$4, location=$5, shop_address=$6, category=$7, shop_description=$8, image_url=$9, status=$10, is_verified=$11, is_trusted=$12, is_available=$13, emergency_available=$14, updated_at=NOW() WHERE id=$15`, [keepValue(req.body.shop_name, current.shop_name), keepValue(req.body.owner_name, current.owner_name), keepValue(req.body.phone, current.phone), keepValue(req.body.whatsapp, current.whatsapp), keepValue(req.body.location, current.location), keepValue(req.body.shop_address, current.shop_address), keepValue(req.body.category, current.category), keepValue(req.body.shop_description, current.shop_description), imageUrl, normalizeStatus(req.body.status), checkboxBool(req.body.is_verified), checkboxBool(req.body.is_trusted), checkboxBool(req.body.is_available), checkboxBool(req.body.emergency_available), id]);
    res.redirect('/admin/leads');
  } catch (e) { next(e); }
});

app.post('/admin/provider/update', imageUpload.single('profile_image'), async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const id = String(req.body.id || '').trim();
    const current = (await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 LIMIT 1`, [id])).rows[0];
    if (!current) return res.status(404).send(page('Provider Not Found', '<section class="card"><h1>Provider not found</h1></section>', 'admin'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : keepValue(req.body.image_url, current.image_url);
    await pool.query(`UPDATE govo_service_providers SET provider_name=$1, phone=$2, whatsapp=$3, service_type=$4, area=$5, address=$6, experience=$7, description=$8, working_hours=$9, image_url=$10, status=$11, is_verified=$12, is_trusted=$13, is_available=$14, emergency_available=$15, updated_at=NOW() WHERE id=$16`, [keepValue(req.body.provider_name, current.provider_name), keepValue(req.body.phone, current.phone), keepValue(req.body.whatsapp, current.whatsapp), keepValue(req.body.service_type, current.service_type), keepValue(req.body.area, current.area), keepValue(req.body.address, current.address), keepValue(req.body.experience, current.experience), keepValue(req.body.description, current.description), keepValue(req.body.working_hours, current.working_hours), imageUrl, normalizeStatus(req.body.status), checkboxBool(req.body.is_verified), checkboxBool(req.body.is_trusted), checkboxBool(req.body.is_available), checkboxBool(req.body.emergency_available), id]);
    res.redirect('/admin/providers');
  } catch (e) { next(e); }
});

app.post('/admin/rider/update', imageUpload.single('profile_image'), async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const id = String(req.body.id || '').trim();
    const current = (await pool.query(`SELECT * FROM govo_rider_leads WHERE id=$1 LIMIT 1`, [id])).rows[0];
    if (!current) return res.status(404).send(page('Rider Not Found', '<section class="card"><h1>Rider not found</h1></section>', 'admin'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : keepValue(req.body.image_url, current.image_url);
    await pool.query(`UPDATE govo_rider_leads SET rider_name=$1, name=$1, phone=$2, whatsapp=$3, area=$4, location=$4, address=$5, vehicle_type=$6, nid=$7, image_url=$8, status=$9, is_available=$10, updated_at=NOW() WHERE id=$11`, [keepValue(req.body.rider_name, current.rider_name || current.name), keepValue(req.body.phone, current.phone), keepValue(req.body.whatsapp, current.whatsapp), keepValue(req.body.area, current.area || current.location), keepValue(req.body.address, current.address), keepValue(req.body.vehicle_type, current.vehicle_type), keepValue(req.body.nid, current.nid), imageUrl, normalizeStatus(req.body.status), checkboxBool(req.body.is_available), id]);
    res.redirect('/admin/riders');
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


async function updateVisibilityRecord(req, res, table, type, returnFields, redirectPath) {
  if (!requireAdmin(req, res)) return null;
  const id = String(req.body.id || '').trim();
  const action = String(req.body.action || '').trim().toLowerCase();
  const map = {
    show_public: { public_visible: true },
    hide_public: { public_visible: false },
    mark_demo: { is_demo: true, public_visible: false },
    unmark_demo: { is_demo: false },
  };
  const nextState = map[action];
  if (!id || !nextState) {
    res.status(400).send(page('Invalid Visibility Action', '<section class="card"><h1>Invalid visibility action</h1></section>', 'admin'));
    return null;
  }
  const sets = Object.keys(nextState).map((key, i) => `${key}=$${i + 1}`);
  const values = Object.values(nextState);
  values.push(id);
  const r = await pool.query(`UPDATE ${table} SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${values.length} RETURNING ${returnFields}`, values);
  if (r.rows.length) {
    const x = r.rows[0];
    await sendTelegram([`GOVO ${type} Visibility Updated`, '', `ID: #${x.id}`, `Name: ${x.name || x.shop_name || x.provider_name || x.rider_name || ''}`, `Phone: ${x.phone || ''}`, `Action: ${action}`, `Public Visible: ${x.public_visible}`, `Demo/Test: ${x.is_demo}`].join('\n'));
  }
  res.redirect(redirectPath);
  return r.rows[0] || null;
}

app.post('/admin/merchant/visibility', async (req, res, next) => {
  try {
    await updateVisibilityRecord(req, res, 'govo_merchant_leads', 'Merchant', 'id, shop_name, phone, public_visible, is_demo', '/admin/leads');
  } catch (e) { next(e); }
});

app.post('/admin/provider/visibility', async (req, res, next) => {
  try {
    await updateVisibilityRecord(req, res, 'govo_service_providers', 'Provider', 'id, provider_name, phone, public_visible, is_demo', '/admin/providers');
  } catch (e) { next(e); }
});

app.post('/admin/rider/visibility', async (req, res, next) => {
  try {
    await updateVisibilityRecord(req, res, 'govo_rider_leads', 'Rider', 'id, COALESCE(rider_name,name) AS rider_name, phone, public_visible, is_demo', '/admin/riders');
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


app.post('/admin/merchant/password-reset', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const id = String(req.body.id || '').trim();
    const temporaryPassword = String(req.body.temporary_password || '');
    if (!id || temporaryPassword.length < 6) return res.status(400).send(page('Invalid Password Reset', '<section class="card"><h1>Invalid password reset</h1><p>Temporary password must be at least 6 characters.</p><a class="btn secondary" href="/admin/leads">Back Merchants</a></section>', 'admin'));
    const hp = hashPassword(temporaryPassword);
    const r = await pool.query(`UPDATE govo_merchant_leads SET password_hash=$1, password_salt=$2, password_set_at=NOW(), reset_requested_at=NULL, reset_note=NULL, updated_at=NOW() WHERE id=$3 RETURNING id, shop_name, owner_name, phone`, [hp.hash, hp.salt, id]);
    if (r.rows.length) {
      const m = r.rows[0];
      sendTelegram(['GOVO Admin Reset Merchant Password', '', `Merchant ID: #${m.id}`, `Shop: ${m.shop_name || ''}`, `Owner: ${m.owner_name || ''}`, `Phone: ${m.phone || ''}`].join('\n')).catch(() => {});
    }
    res.redirect('/admin/leads');
  } catch (e) { next(e); }
});

app.post('/admin/rider/password-reset', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const id = String(req.body.id || '').trim();
    const temporaryPassword = String(req.body.temporary_password || '');
    if (!id || temporaryPassword.length < 6) return res.status(400).send(page('Invalid Password Reset', '<section class="card"><h1>Invalid password reset</h1><p>Temporary password must be at least 6 characters.</p><a class="btn secondary" href="/admin/riders">Back Riders</a></section>', 'admin'));
    const hp = hashPassword(temporaryPassword);
    const r = await pool.query(`UPDATE govo_rider_leads SET password_hash=$1, password_salt=$2, password_set_at=NOW(), reset_requested_at=NULL, reset_note=NULL, updated_at=NOW() WHERE id=$3 RETURNING id, COALESCE(rider_name,name) AS rider_name, phone`, [hp.hash, hp.salt, id]);
    if (r.rows.length) {
      const rd = r.rows[0];
      sendTelegram(['GOVO Admin Reset Rider Password', '', `Rider ID: #${rd.id}`, `Name: ${rd.rider_name || ''}`, `Phone: ${rd.phone || ''}`].join('\n')).catch(() => {});
    }
    res.redirect('/admin/riders');
  } catch (e) { next(e); }
});


function cleanOrderStatus(v, fallback = 'new') {
  const s = String(v || fallback).trim().toLowerCase();
  return ['new', 'pending', 'confirmed', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled', 'rejected', 'failed'].includes(s) ? s : fallback;
}

function cleanOrderPriority(v) {
  const s = String(v || 'normal').trim().toLowerCase();
  return ['low', 'normal', 'high', 'urgent'].includes(s) ? s : 'normal';
}

function cleanPaymentStatus(v) {
  const s = String(v || 'unpaid').trim().toLowerCase();
  return ['unpaid', 'paid', 'partial', 'refunded'].includes(s) ? s : 'unpaid';
}

function orderCodeFromId(id) {
  return `GOVO-${String(id || '').padStart(6, '0')}`;
}

async function recordOrderEvent(orderId, eventType, status, note, actorType = 'admin', actorName = '') {
  if (!orderId) return;
  await pool.query(`INSERT INTO govo_order_events (order_id, event_type, status, note, actor_type, actor_name, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`, [orderId, eventType || 'status', status || '', note || '', actorType || 'admin', actorName || '']);
}

function orderBoardGroup(status) {
  const s = String(status || 'new').toLowerCase();
  if (['delivered', 'completed'].includes(s)) return 'delivered';
  if (['cancelled', 'rejected', 'failed'].includes(s)) return 'cancelled';
  if (['picked_up', 'on_the_way'].includes(s)) return 'on_the_way';
  if (s === 'assigned') return 'assigned';
  if (['confirmed', 'accepted', 'preparing', 'ready'].includes(s)) return 'confirmed';
  return 'new';
}

function safeAmount(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function customerContactActions(phone, label = '') {
  const raw = String(phone || '').trim();
  const wa = raw.replace(/\D/g, '');
  return `<div class="actions">${wa ? `<a class="btn secondary wa" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(`Assalamu alaikum ${label || ''}, GOVO order update.`)}">WhatsApp</a>` : ''}${raw ? `<a class="btn secondary" href="tel:${esc(raw)}">Call</a>` : ''}</div>`;
}

app.get('/admin/orders', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim();
    const params = [];
    const where = [];
    const allowedFilters = ['new', 'pending', 'confirmed', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled', 'rejected', 'failed'];
    if (status !== 'all' && allowedFilters.includes(status)) { params.push(status); where.push(`COALESCE(status,'new')=$${params.length}`); }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(`LOWER(COALESCE(order_code,'') || ' ' || CAST(id AS TEXT) || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(customer_phone,'') || ' ' || COALESCE(customer_area,'') || ' ' || COALESCE(customer_address,'') || ' ' || COALESCE(shop_name,'') || ' ' || COALESCE(merchant_name,'') || ' ' || COALESCE(provider_name,'') || ' ' || COALESCE(items,'') || ' ' || COALESCE(item_details,'') || ' ' || COALESCE(rider_name,'') || ' ' || COALESCE(rider_phone,'') || ' ' || COALESCE(assigned_rider_name,'') || ' ' || COALESCE(assigned_rider_phone,'')) LIKE $${params.length}`);
    }
    const [orders, riders, counts] = await Promise.all([
      pool.query(`SELECT id, order_code, customer_name, customer_phone, customer_area, customer_address, order_type, merchant_id, COALESCE(merchant_name, shop_name) AS merchant_name, shop_name, merchant_phone, provider_id, provider_name, rider_id, rider_name, rider_phone, assigned_rider_id, assigned_rider_name, assigned_rider_phone, COALESCE(items, item_details) AS items, item_details, note, customer_note, pickup_location, drop_location, delivery_fee, subtotal, total_amount, payment_method, payment_status, COALESCE(status,'new') AS status, priority, admin_note, rider_note, created_at, updated_at FROM govo_orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY CASE COALESCE(status,'new') WHEN 'new' THEN 1 WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'accepted' THEN 2 WHEN 'preparing' THEN 3 WHEN 'ready' THEN 3 WHEN 'assigned' THEN 4 WHEN 'picked_up' THEN 5 WHEN 'on_the_way' THEN 5 WHEN 'delivered' THEN 6 ELSE 7 END, id DESC LIMIT 250`, params),
      pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, COALESCE(area,location) AS area FROM govo_rider_leads WHERE COALESCE(status,'pending')='approved' ORDER BY id DESC LIMIT 150`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('new','pending'))::int new, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('confirmed','accepted','preparing','ready'))::int confirmed, COUNT(*) FILTER (WHERE COALESCE(status,'new')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('picked_up','on_the_way'))::int on_the_way, COUNT(*) FILTER (WHERE COALESCE(status,'new')='delivered')::int delivered, COUNT(*) FILTER (WHERE COALESCE(status,'new') IN ('cancelled','rejected','failed'))::int cancelled FROM govo_orders`),
    ]);
    const riderOptions = (selectedId) => riders.rows.map((r) => `<option value="${esc(r.id)}" ${String(selectedId || '') === String(r.id) ? 'selected' : ''}>${esc(r.rider_name || 'Rider')} - ${esc(r.phone || '')}${r.area ? ` (${esc(r.area)})` : ''}</option>`).join('');
    const statusOptions = (current) => ['new','confirmed','preparing','assigned','picked_up','on_the_way','delivered','cancelled'].map((v) => `<option value="${v}" ${String(current || '').toLowerCase() === v ? 'selected' : ''}>${v.replace(/_/g, ' ')}</option>`).join('');
    const eventForm = (x) => `<form method="POST" action="/admin/orders/add-event"><input type="hidden" name="order_id" value="${esc(x.id)}"><div class="filters"><select name="event_type"><option>note</option><option>call</option><option>whatsapp</option><option>dispatch</option><option>payment</option></select><input name="note" placeholder="Add dispatch note/event"></div><button class="secondary">Add Event</button></form>`;
    const assignForm = (x) => `<form method="POST" action="/admin/orders/assign-rider"><input type="hidden" name="order_id" value="${esc(x.id)}"><label>Assign approved rider</label><select name="rider_id" required><option value="">Select Rider</option>${riderOptions(x.assigned_rider_id || x.rider_id)}</select><button>Assign Rider</button></form>`;
    const updateForm = (x) => `<form method="POST" action="/admin/orders/update-status"><input type="hidden" name="id" value="${esc(x.id)}"><div class="filters"><select name="status">${statusOptions(x.status)}</select><input name="admin_note" value="${esc(x.admin_note || '')}" placeholder="Admin note"></div><button>Update Status</button></form>`;
    const orderCard = (x) => {
      const code = x.order_code || orderCodeFromId(x.id);
      const riderName = x.assigned_rider_name || x.rider_name || 'Not assigned';
      const riderPhone = x.assigned_rider_phone || x.rider_phone || '';
      const address = x.customer_address || x.drop_location || '';
      const merchant = x.provider_name || x.merchant_name || x.shop_name || 'GOVO Order';
      const total = safeAmount(x.total_amount);
      return `<div class="card compact-card"><div class="section-head"><h2>${esc(code)}</h2><div class="actions">${badge(x.status)}${badge(x.priority || 'normal')}</div></div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name || 'Customer')}<br>${esc(x.customer_phone || '')}<br>${esc(x.customer_area || '')}</span></div><div><b>Address</b><span>${esc(address || 'No address')}</span></div><div><b>Partner</b><span>${esc(merchant)}<br>${esc(x.order_type || 'delivery')}</span></div><div><b>Rider</b><span>${esc(riderName)}<br>${esc(riderPhone)}</span></div><div><b>Items</b><span>${esc(x.items || x.item_details || 'No items')}</span></div><div><b>Total / Payment</b><span>${esc(total ? `৳${total}` : 'Not set')}<br>${esc(x.payment_method || 'cash')} / ${esc(x.payment_status || 'unpaid')}</span></div><div><b>Note</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div>${customerContactActions(x.customer_phone, x.customer_name)}${customerContactActions(riderPhone, riderName)}${updateForm(x)}${assignForm(x)}${eventForm(x)}<div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(code)}">Tracking</a></div></div>`;
    };
    const groups = { new: [], confirmed: [], assigned: [], on_the_way: [], delivered: [], cancelled: [] };
    orders.rows.forEach((x) => groups[orderBoardGroup(x.status)].push(x));
    const column = (key, title) => `<section class="card"><div class="section-head"><h2>${esc(title)}</h2><span class="pill">${groups[key].length}</span></div><div class="cards compact">${groups[key].map(orderCard).join('') || '<div class="card compact-card"><h2>No orders</h2></div>'}</div></section>`;
    const c = counts.rows[0] || {};
    const stat = (label, value) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div></div>`;
    const opt = (v, label) => `<option value="${v}" ${status === v ? 'selected' : ''}>${label}</option>`;
    res.send(page('Order Dispatch', `<section class="card app-hero"><h1>Order Dispatch</h1><p>Review customer orders, assign riders, and monitor delivery progress.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a><a class="btn secondary" href="/admin/support">Support Inbox</a><a class="btn secondary" href="/admin/onboarding">Pilot Onboarding</a><a class="btn secondary" href="/admin/tasks">Launch Task Board</a></div></section><section class="grid">${stat('Total', c.total)}${stat('New', c.new)}${stat('Confirmed', c.confirmed)}${stat('Assigned', c.assigned)}${stat('On The Way', c.on_the_way)}${stat('Delivered', c.delivered)}${stat('Cancelled', c.cancelled)}</section><section class="card"><h2>Create Order</h2><form method="POST" action="/admin/orders/create"><div class="filters"><input name="customer_name" placeholder="Customer name"><input name="customer_phone" required placeholder="Customer phone"><input name="customer_area" placeholder="Area"><select name="order_type"><option>delivery</option><option>service</option><option>shop</option><option>general</option></select></div><label>Customer Address</label><input name="customer_address"><label>Merchant / Provider</label><div class="filters"><input name="merchant_name" placeholder="Merchant name"><input name="provider_name" placeholder="Provider name"></div><label>Items</label><textarea name="items" required></textarea><div class="filters"><input name="delivery_fee" placeholder="Delivery fee"><input name="subtotal" placeholder="Subtotal"><input name="total_amount" placeholder="Total"><select name="payment_method"><option>cash</option><option>bKash</option><option>Nagad</option><option>card</option></select><select name="priority"><option>normal</option><option>high</option><option>urgent</option><option>low</option></select></div><label>Note</label><textarea name="note"></textarea><button>Create Order</button></form></section><section class="card"><h2>Filters</h2><form class="filters" method="GET" action="/admin/orders"><input name="q" value="${esc(q)}" placeholder="Search code, customer, item, rider, merchant"><select name="status"><option value="all">All</option>${opt('new','New')}${opt('confirmed','Confirmed')}${opt('assigned','Assigned')}${opt('on_the_way','On The Way')}${opt('delivered','Delivered')}${opt('cancelled','Cancelled')}</select><button>Search</button></form></section><section class="grid two">${column('new','New')}${column('confirmed','Confirmed')}${column('assigned','Assigned')}${column('on_the_way','On The Way')}${column('delivered','Delivered')}${column('cancelled','Cancelled')}</section>`, 'admin'));
  } catch (e) { next(e); }
});

async function createDispatchOrder(data, actorType = 'admin') {
  const r = await pool.query(`INSERT INTO govo_orders (customer_name, customer_phone, customer_area, customer_address, order_type, merchant_id, merchant_name, shop_name, provider_id, provider_name, items, item_details, note, customer_note, pickup_location, drop_location, delivery_fee, subtotal, total_amount, payment_method, payment_status, status, priority, updated_at) VALUES ($1,$2,$3,$4,$5,NULLIF($6,'')::int,$7,$7,NULLIF($8,'')::int,$9,$10,$10,$11,$11,$12,$4,$13,$14,$15,$16,$17,$18,$19,NOW()) RETURNING id`, [data.customer_name || '', data.customer_phone || '', data.customer_area || '', data.customer_address || '', data.order_type || 'delivery', data.merchant_id || '', data.merchant_name || '', data.provider_id || '', data.provider_name || '', data.items || '', data.note || '', data.pickup_location || '', safeAmount(data.delivery_fee), safeAmount(data.subtotal), safeAmount(data.total_amount), data.payment_method || 'cash', data.payment_status || 'unpaid', data.status || 'new', cleanOrderPriority(data.priority)]);
  const id = r.rows[0].id;
  const code = orderCodeFromId(id);
  await pool.query(`UPDATE govo_orders SET order_code=$1 WHERE id=$2 AND order_code IS NULL`, [code, id]);
  await recordOrderEvent(id, 'created', data.status || 'new', data.note || 'Order created', actorType, actorType === 'admin' ? 'Admin' : 'Customer');
  return { id, code };
}

app.post('/admin/orders/create', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const phone = String(req.body.customer_phone || '').trim();
    const items = String(req.body.items || '').trim();
    if (!phone || !items) return res.status(400).send(page('Invalid Order', '<section class="card"><h1>Customer phone and items are required.</h1><a class="btn" href="/admin/orders">Back</a></section>', 'admin'));
    const created = await createDispatchOrder({ ...req.body, customer_phone: phone, items, status: cleanOrderStatus(req.body.status, 'new') }, 'admin');
    sendTelegram(['GOVO Admin Created Order', '', `Order: ${created.code}`, `Customer: ${req.body.customer_name || ''}`, `Phone: ${phone}`, `Items: ${items}`].join('\n')).catch(() => {});
    res.redirect('/admin/orders');
  } catch (e) { next(e); }
});

async function assignOrderRider(orderId, riderId) {
  const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone FROM govo_rider_leads WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [riderId]);
  if (!rider.rows.length) return null;
  const rd = rider.rows[0];
  const order = await pool.query(`UPDATE govo_orders SET rider_id=$1, rider_name=$2, rider_phone=$3, assigned_rider_id=$1, assigned_rider_name=$2, assigned_rider_phone=$3, status='assigned', updated_at=NOW() WHERE id=$4 RETURNING *`, [rd.id, rd.rider_name, rd.phone, orderId]);
  if (order.rows.length) await recordOrderEvent(orderId, 'assigned', 'assigned', `Assigned rider ${rd.rider_name || rd.phone || ''}`, 'admin', 'Admin');
  return order.rows[0] || null;
}

app.post(['/admin/orders/assign-rider', '/admin/order/assign'], async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const orderId = String(req.body.order_id || '').trim();
    const order = await assignOrderRider(orderId, String(req.body.rider_id || '').trim());
    if (order) sendTelegram(['GOVO Rider Assigned', '', `Order: ${order.order_code || orderCodeFromId(order.id)}`, `Rider: ${order.rider_name || ''} (${order.rider_phone || ''})`, `Customer: ${order.customer_name || ''} (${order.customer_phone || ''})`, `Address: ${order.customer_address || order.drop_location || ''}`].join('\n')).catch(() => {});
    res.redirect('/admin/orders');
  } catch (e) { next(e); }
});

app.post(['/admin/orders/update-status', '/admin/order/status'], async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = cleanOrderStatus(req.body.status, 'new');
    const r = await pool.query(`UPDATE govo_orders SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, String(req.body.admin_note || ''), String(req.body.id || '')]);
    if (r.rows.length) {
      const x = r.rows[0];
      await recordOrderEvent(x.id, 'status', status, String(req.body.admin_note || ''), 'admin', 'Admin');
      sendTelegram(['GOVO Order Status Updated', '', `Order: ${x.order_code || orderCodeFromId(x.id)}`, `Status: ${String(x.status || '').toUpperCase()}`, `Rider: ${x.rider_name || x.assigned_rider_name || 'Not assigned'}`, `Customer: ${x.customer_name || ''}`].join('\n')).catch(() => {});
    }
    res.redirect('/admin/orders');
  } catch (e) { next(e); }
});

app.post('/admin/orders/add-event', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const orderId = String(req.body.order_id || '').trim();
    const note = String(req.body.note || '').trim();
    if (orderId && note) await recordOrderEvent(orderId, String(req.body.event_type || 'note').trim() || 'note', '', note, 'admin', 'Admin');
    res.redirect('/admin/orders');
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
  return compactMerchantCard(x);
}

async function approvedMerchants() {
  return pool.query(`
    SELECT l.id, l.shop_name, l.owner_name, l.phone, l.whatsapp, l.location, l.category, l.delivery_needed,
           COALESCE(l.status,'pending') AS status, l.shop_description, l.shop_address, l.products, l.image_url,
           COALESCE(l.is_verified,false) AS is_verified, COALESCE(l.is_trusted,false) AS is_trusted, COALESCE(l.is_available,true) AS is_available,
           COALESCE(l.emergency_available,false) AS emergency_available, COALESCE(l.rating_avg,0) AS rating_avg, COALESCE(l.rating_count,0) AS rating_count, COALESCE(l.public_visible,true) AS public_visible, COALESCE(l.is_demo,false) AS is_demo, l.created_at,
           COALESCE(string_agg(COALESCE(p.product_name,'') || ' ' || COALESCE(p.category,'') || ' ' || COALESCE(p.description,''), ' '), '') AS product_search
    FROM govo_merchant_leads l
    LEFT JOIN govo_shop_products p ON (p.merchant_lead_id=l.id OR p.merchant_phone=l.phone) AND COALESCE(p.is_deleted,false)=false
    WHERE ${publicApprovedSql('l')}
    GROUP BY l.id, l.shop_name, l.owner_name, l.phone, l.whatsapp, l.location, l.category, l.delivery_needed, l.status, l.shop_description, l.shop_address, l.products, l.image_url, l.is_verified, l.is_trusted, l.is_available, l.emergency_available, l.rating_avg, l.rating_count, l.public_visible, l.is_demo, l.created_at
    ORDER BY l.id DESC
    LIMIT 500
  `);
}

app.get('/shops', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedMerchants();
    const uniqueRows = uniqueByIdentity(all.rows, 'merchant');
    const rows = q ? uniqueRows.filter((x) => merchantSearchText(x).includes(q)) : uniqueRows.slice(0, 30);
    const chips = superAppCategories.slice(0, 12).map((cat) => chip(`${cat.icon} ${cat.title.replace(' / Restaurant', '').replace(' / Mobile', '')}`, `/category/${encodeURIComponent(cat.slug)}`)).join('');
    const cards = rows.map(merchantCard).join('');
    res.send(page('GOVO Shops', `
      <section class="card app-hero">
        <span class="pill">GOVO Shops</span>
        <h1>Shop, order and discover local partners</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">Search approved GOVO merchants by shop, product, category, location or phone.</p>
        <form method="GET" action="/shops" style="margin-top:14px"><input name="q" value="${esc(q)}" placeholder="Search food, grocery, medicine, phone, location"><button>Search Shops</button></form>
        <div class="toolbar"><a class="btn secondary" href="https://app.govoexpress.com/app">Home</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/order">Order</a></div>
      </section>
      <section class="card"><div class="section-head"><h2>Categories</h2><span class="pill">${superAppCategories.length}</span></div><div class="chips">${chips}</div></section>
      <section class="card"><div class="section-head"><h2>${q ? 'Shop Search Results' : 'Featured Verified Shops'}</h2><span class="pill">${rows.length} showing</span></div></section>
      <section class="cards">${cards || pilotPartnerEmpty('merchant')}</section>
    `, 'shops'));
  } catch (e) { next(e); }
});

app.get('/category/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const cat = categoryForSlug(slug);
    if (!cat) return res.status(404).send(page('Category Not Found', `<section class="card"><h1>Category Not Found</h1><p>This GOVO category is not available.</p><a class="btn" href="https://app.govoexpress.com/shops">Back to Super App</a></section>`, 'shops'));
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedMerchants();
    let rows = all.rows.filter((x) => merchantMatchesCategory(x, cat));
    if (q) rows = rows.filter((x) => merchantSearchText(x).includes(q));
    const cards = rows.map(merchantCard).join('');
    res.send(page(cat.title, `
      <section class="card" style="background:linear-gradient(180deg,#102016,#111827)">
        <a class="btn secondary" href="https://app.govoexpress.com/shops">Back to Super App</a>
        <div style="font-size:38px;margin-top:14px">${cat.icon}</div>
        <h1>${esc(cat.title)}</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">${esc(cat.desc)}</p>
        <form method="GET" action="/category/${encodeURIComponent(cat.slug)}" style="margin-top:14px">
          <input name="q" value="${esc(q)}" placeholder="Search within ${esc(cat.title)} by name, product, location, phone">
          <button>Search Category</button>
        </form>
      </section>
      <section class="card"><div class="actions" style="justify-content:space-between"><h2>Approved ${esc(cat.title)}</h2><span class="pill">${rows.length}</span></div></section>
      <section class="cards">${cards || pilotPartnerEmpty('merchant')}</section>
    `, 'shops'));
  } catch (e) { next(e); }
});


async function visibleShopProducts(merchantId, merchantPhone = '') {
  const modern = await pool.query(`SELECT 'product' AS source, id, name, category, price::text AS price_text, description, image_url FROM govo_products WHERE merchant_id=$1 AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false AND stock_status='available' ORDER BY category NULLS LAST, id DESC LIMIT 160`, [merchantId]);
  const legacy = await pool.query(`SELECT 'legacy' AS source, id, product_name AS name, category, price AS price_text, description, image_url FROM govo_shop_products WHERE (merchant_lead_id=$1 OR merchant_phone=$2) AND COALESCE(is_available,true)=true AND COALESCE(is_deleted,false)=false ORDER BY category NULLS LAST, id DESC LIMIT 160`, [merchantId, merchantPhone]);
  return [...modern.rows, ...legacy.rows];
}

app.get('/shop/:id', async (req, res, next) => {
  try {
    const shop = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, delivery_needed, COALESCE(status,'pending') AS status, shop_description, shop_address, products, image_url, COALESCE(is_verified,false) AS is_verified, COALESCE(is_trusted,false) AS is_trusted, COALESCE(is_available,true) AS is_available, COALESCE(emergency_available,false) AS emergency_available, COALESCE(rating_avg,0) AS rating_avg, COALESCE(rating_count,0) AS rating_count, created_at FROM govo_merchant_leads WHERE id=$1 AND ${publicApprovedSql()} LIMIT 1`, [req.params.id]);
    const x = shop.rows[0];
    if (!x) return res.status(404).send(page('Shop Not Found', `<section class="card"><h1>Shop Not Found</h1><p>This shop is not public right now.</p></section>${pilotPartnerEmpty('merchant')}`, 'shops'));
    const products = await visibleShopProducts(x.id, x.phone || x.whatsapp || '');
    const productHtml = products.map((p) => {
      const key = `${p.source}-${p.id}`;
      const price = productPrice(p.price_text);
      return `<div class="card" style="padding:14px;margin:0"><div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between"><div style="min-width:0"><span class="pill">${esc(p.category || 'Menu')}</span><h2 style="font-size:22px;margin-top:10px">${esc(p.name || 'Product')}</h2><p style="font-weight:1000;color:#bbf7d0;margin:6px 0">${price ? `৳${esc(price)}` : esc(p.price_text || '')}</p></div>${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name || 'Product')}" style="width:86px;height:86px;object-fit:cover;border-radius:14px;border:1px solid rgba(34,197,94,.45)">` : ''}</div><p>${esc(p.description || '')}</p><label style="display:flex;align-items:center;gap:10px;margin-top:10px"><input type="checkbox" name="product_keys" value="${esc(key)}"> Add to order</label><label>Qty</label><input name="qty_${esc(key)}" type="number" min="1" max="50" value="1"></div>`;
    }).join('');
    const empty = '<div class="card"><h2>This shop is preparing its menu. Call or WhatsApp to order.</h2></div>';
    res.send(page(x.shop_name || 'GOVO Shop', `<section class="card"><a class="btn secondary" href="https://app.govoexpress.com/shops">Back Shops</a><h1>${esc(x.shop_name || '')}</h1>${listingImage(x.image_url, x.shop_name, true)}${trustBadges(x)}<div class="detail-grid"><div><b>Owner</b><span>${esc(x.owner_name)}</span></div><div><b>Phone</b><span>${esc(x.whatsapp || x.phone)}</span></div><div><b>Location</b><span>${esc(x.shop_address || x.location)}</span></div><div><b>Category</b><span>${esc(x.category)}</span></div><div><b>Delivery</b><span>${esc(x.delivery_needed)}</span></div><div><b>About</b><span>${esc(x.shop_description || '')}</span></div></div><div class="actions">${x.whatsapp || x.phone ? `<a class="btn secondary wa" href="https://wa.me/${esc(String(x.whatsapp || x.phone).replace(/\D/g,''))}">WhatsApp</a><a class="btn secondary" href="tel:${esc(x.whatsapp || x.phone)}">Call</a>` : ''}</div></section><form method="POST" action="/shop/${encodeURIComponent(x.id)}/order"><section class="card"><div class="section-head"><h2>Products / Menu</h2><span class="pill">${products.length}</span></div><p style="color:var(--muted);font-weight:900">Select items and place order</p><div class="item-grid">${productHtml || empty}</div></section><section class="card"><h2>Place Order</h2><label>Your Name</label><input name="customer_name" required><label>Your Phone</label><input name="customer_phone" required><label>Your Area</label><input name="customer_area" placeholder="Meherpur / Mujibnagar"><label>Delivery Address</label><input name="customer_address" required><label>Payment Method</label><select name="payment_method"><option>cash</option><option>bKash</option><option>Nagad</option><option>card</option></select><label>Note</label><textarea name="note"></textarea><button ${products.length ? '' : 'disabled'}>Submit Shop Order</button></section></form>`, 'shops'));
  } catch (e) { next(e); }
});

app.post('/shop/:id/order', async (req, res, next) => {
  try {
    const shop = await pool.query(`SELECT id, shop_name, phone, whatsapp, location, shop_address FROM govo_merchant_leads WHERE id=$1 AND ${publicApprovedSql()} LIMIT 1`, [req.params.id]);
    const m = shop.rows[0];
    if (!m) return res.status(404).send(page('Shop Not Found', '<section class="card"><h1>Shop not found</h1></section>', 'shops'));
    const selected = Array.isArray(req.body.product_keys) ? req.body.product_keys : req.body.product_keys ? [req.body.product_keys] : [];
    if (!selected.length) return res.status(400).send(page('Select Items', `<section class="card"><h1>Select at least one item</h1><a class="btn" href="/shop/${encodeURIComponent(m.id)}">Back to shop</a></section>`, 'shops'));
    const products = await visibleShopProducts(m.id, m.phone || m.whatsapp || '');
    const byKey = new Map(products.map((p) => [`${p.source}-${p.id}`, p]));
    const lines = [];
    let subtotal = 0;
    for (const key of selected) {
      const p = byKey.get(String(key));
      if (!p) continue;
      const qtyRaw = req.body[`qty_${key}`];
      const qty = Math.max(1, Math.min(50, Number.parseInt(String(qtyRaw || '1'), 10) || 1));
      const price = productPrice(p.price_text);
      subtotal += price * qty;
      lines.push(`${p.name || 'Product'} x${qty}${price ? ` @ ${price}` : ''}${price ? ` = ${price * qty}` : ''}`);
    }
    if (!lines.length) return res.status(400).send(page('Select Items', `<section class="card"><h1>Selected products are no longer available</h1><a class="btn" href="/shop/${encodeURIComponent(m.id)}">Back to shop</a></section>`, 'shops'));
    const created = await createDispatchOrder({ customer_name: req.body.customer_name || '', customer_phone: req.body.customer_phone || '', customer_area: req.body.customer_area || '', customer_address: req.body.customer_address || '', order_type: 'shop', merchant_id: m.id, merchant_name: m.shop_name || '', items: lines.join('\n'), note: String(req.body.note || '').trim(), pickup_location: m.shop_address || m.location || m.shop_name || '', subtotal, total_amount: subtotal, payment_method: req.body.payment_method || 'cash', payment_status: 'unpaid', status: 'new', priority: 'normal' }, 'customer');
    sendTelegram(['New GOVO Shop Order', '', `Order: ${created.code}`, `Shop: ${m.shop_name || ''}`, `Customer: ${req.body.customer_name || ''}`, `Phone: ${req.body.customer_phone || ''}`, `Address: ${req.body.customer_address || ''}`, `Items: ${lines.join('; ')}`, `Total: ${subtotal || 'N/A'}`].join('\n')).catch(() => {});
    res.send(page('Order Submitted', `<section class="card app-hero"><span class="pill">Order Received</span><h1>Shop Order Submitted</h1><p>Your order has been sent to GOVO dispatch.</p><h2>Tracking Code: ${esc(created.code)}</h2><div class="actions"><a class="btn" href="/track?code=${encodeURIComponent(created.code)}">Track Order</a><a class="btn secondary" href="/shop/${encodeURIComponent(m.id)}">Back to Shop</a><a class="btn secondary" href="https://app.govoexpress.com/shops">All Shops</a></div></section>`, 'track'));
  } catch (e) { next(e); }
});

function orderForm(data = {}, error = '') {
  const partner = data.merchant_name || data.provider_name || data.shop_name || '';
  return page('Place GOVO Order', `${error ? `<section class="card"><h1>Check order details</h1><p style="color:#fecaca;font-weight:900">${esc(error)}</p></section>` : ''}<section class="card app-hero"><span class="pill">Order Dispatch</span><h1>Place GOVO Order</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Submit a delivery, shop, service, or general request. GOVO admin will review and dispatch a rider when needed.</p><div class="actions"><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a><a class="btn secondary" href="https://app.govoexpress.com/shops">Shops</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track Order</a></div></section><section class="card"><h2>Order Details</h2><form method="POST" action="/order"><input type="hidden" name="shop_id" value="${esc(data.shop_id || '')}"><input type="hidden" name="merchant_id" value="${esc(data.merchant_id || data.shop_id || '')}"><label>Your Name</label><input name="customer_name" value="${esc(data.customer_name || '')}" required><label>Your Phone</label><input name="customer_phone" value="${esc(data.customer_phone || '')}" required><label>Your Area</label><input name="customer_area" value="${esc(data.customer_area || data.area || '')}" placeholder="Meherpur / Mujibnagar"><label>Delivery / Service Address</label><input name="customer_address" value="${esc(data.customer_address || data.delivery_address || data.drop_location || '')}" required><label>Order Type</label><select name="order_type"><option value="delivery" ${data.order_type === 'delivery' ? 'selected' : ''}>delivery</option><option value="shop" ${data.order_type === 'shop' ? 'selected' : ''}>shop</option><option value="service" ${data.order_type === 'service' ? 'selected' : ''}>service</option><option value="general" ${data.order_type === 'general' ? 'selected' : ''}>general</option></select><label>Merchant / Provider <span style="color:var(--muted)">(optional)</span></label><input name="merchant_name" value="${esc(partner)}" placeholder="Shop or provider name"><label>Items / Request Details</label><textarea name="items" required placeholder="Example: 2 burgers, 1 cola / AC repair request">${esc(data.items || data.item_details || data.item || '')}</textarea><label>Payment Method</label><select name="payment_method"><option value="cash">cash</option><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="card">card</option></select><label>Notes</label><textarea name="note" placeholder="Any extra instruction for GOVO">${esc(data.note || data.notes || '')}</textarea><input type="hidden" name="merchant_phone" value="${esc(data.merchant_phone || '')}"><input type="hidden" name="pickup_location" value="${esc(data.pickup_location || data.pickup_address || '')}"><button>Submit Order</button></form></section>`, 'track');
}

function normalizeOrderBody(body = {}) {
  const deliveryAddress = String(body.customer_address || body.delivery_address || body.drop_location || '').trim();
  const items = String(body.items || body.item_details || body.item || '').trim();
  return {
    shop_id: String(body.shop_id || '').trim(),
    merchant_id: String(body.merchant_id || body.shop_id || '').trim(),
    merchant_name: String(body.merchant_name || body.shop_name || body.shop || '').trim(),
    provider_id: String(body.provider_id || '').trim(),
    provider_name: String(body.provider_name || '').trim(),
    merchant_phone: String(body.merchant_phone || '').trim(),
    customer_name: String(body.customer_name || '').trim(),
    customer_phone: String(body.customer_phone || '').trim(),
    customer_area: String(body.customer_area || body.area || '').trim(),
    customer_address: deliveryAddress,
    order_type: String(body.order_type || 'delivery').trim().toLowerCase(),
    items,
    note: String(body.note || body.notes || '').trim(),
    pickup_location: String(body.pickup_location || body.pickup_address || '').trim(),
    payment_method: String(body.payment_method || 'cash').trim(),
  };
}

app.all('/order', async (req, res, next) => {
  try {
    if (req.method === 'POST') {
      const order = normalizeOrderBody(req.body);
      const missing = [];
      for (const [field, label] of [['customer_name', 'Your name'], ['customer_phone', 'Your phone'], ['customer_address', 'Address'], ['items', 'Items / request details']]) {
        if (!order[field]) missing.push(label);
      }
      if (missing.length) return res.status(400).send(orderForm(order, `Please fill: ${missing.join(', ')}`));
      const created = await createDispatchOrder({ ...order, status: 'new', payment_status: 'unpaid', priority: 'normal' }, 'customer');
      sendTelegram(['New GOVO Order', '', `Order: ${created.code}`, `Type: ${order.order_type}`, `Partner: ${order.merchant_name || order.provider_name || 'N/A'}`, `Customer: ${order.customer_name}`, `Customer Phone: ${order.customer_phone}`, `Address: ${order.customer_address}`, `Items: ${order.items}`, `Payment: ${order.payment_method}`, `Note: ${order.note || 'N/A'}`].join('\n')).catch(() => {});
      return res.redirect(`/order/success?code=${encodeURIComponent(created.code)}&phone=${encodeURIComponent(order.customer_phone)}`);
    }
    const q = req.query || {};
    let data = normalizeOrderBody({ ...q, items: q.item || q.items || q.item_details, customer_address: q.customer_address || q.delivery_address || q.drop_location, pickup_location: q.pickup_address || q.pickup_location });
    if (data.merchant_name && !data.merchant_phone) {
      const r = await pool.query(`SELECT id, shop_name, phone, whatsapp, location, shop_address FROM govo_merchant_leads WHERE shop_name=$1 ORDER BY id DESC LIMIT 1`, [data.merchant_name]);
      if (r.rows.length) {
        data.merchant_id = r.rows[0].id;
        data.merchant_phone = r.rows[0].whatsapp || r.rows[0].phone || '';
        data.pickup_location = data.pickup_location || r.rows[0].shop_address || r.rows[0].location || '';
      }
    }
    res.send(orderForm(data));
  } catch (e) { next(e); }
});

app.get('/order/success', (req, res) => {
  const code = String(req.query.code || req.query.id || '');
  const phone = String(req.query.phone || '');
  res.send(page('Order Submitted', `<section class="card app-hero"><span class="pill">Order Received</span><h1>Order Submitted Successfully</h1><p>Your order has been received by GOVO. Save your tracking code.</p><h2>Tracking Code: ${esc(code)}</h2><p style="color:var(--muted);font-weight:900">Customer phone: ${esc(phone || 'Not provided')}</p><div class="timeline"><div class="step done">Submitted</div><div class="step">Admin Review</div><div class="step">Rider Assigned</div><div class="step">Delivered</div></div><div class="actions"><a class="btn" href="/track?code=${encodeURIComponent(code)}">Track Order</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a><a class="btn secondary" href="https://app.govoexpress.com/shops">Shops</a></div></section>`, 'track'));
});

function statusMeaning(status) {
  const s = String(status || 'pending').toLowerCase();
  return {
    new: 'waiting for admin review',
    pending: 'waiting for review',
    confirmed: 'confirmed by GOVO',
    accepted: 'accepted and being processed',
    preparing: 'merchant preparing order',
    ready: 'merchant marked ready',
    assigned: 'assigned to rider/provider',
    picked_up: 'rider picked up',
    on_the_way: 'rider is on the way',
    confirmed: 'confirmed by GOVO',
    assigned: 'assigned to provider',
    in_progress: 'provider working',
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
    if (['picked_up', 'on_the_way'].includes(s)) return 5;
    if (s === 'assigned') return 4;
    if (['ready', 'preparing'].includes(s)) return 3;
    if (['confirmed', 'accepted', 'merchant_confirmed'].includes(s)) return 2;
    if (['rejected', 'failed', 'cancelled'].includes(s)) return 6;
    return 1;
  }
  if (['completed', 'delivered'].includes(s)) return 4;
  if (['in_progress', 'working'].includes(s)) return 3;
  if (['assigned', 'confirmed', 'accepted', 'ready'].includes(s)) return 2;
  if (['rejected', 'failed', 'cancelled'].includes(s)) return 4;
  return 1;
}

function timelineHtml(type, status) {
  const stage = progressStage(type, status);
  const labels = type === 'order' ? ['Submitted', 'Merchant Accepted', 'Preparing / Ready', 'Rider Assigned', 'Picked Up', 'Delivered'] : ['Submitted', 'Confirmed / Assigned', 'In Progress', 'Completed'];
  return `<div class="timeline">${labels.map((label, i) => `<div class="step ${i + 1 <= stage ? 'done' : ''}">${esc(label)}</div>`).join('')}</div>`;
}

function trackingOrderCard(x) {
  const code = x.order_code || orderCodeFromId(x.id);
  const riderName = x.assigned_rider_name || x.rider_name || 'Not assigned';
  const riderPhone = x.assigned_rider_phone || x.rider_phone || '';
  const merchantState = x.merchant_status || (['confirmed', 'accepted', 'preparing', 'ready', 'rejected'].includes(String(x.status || '').toLowerCase()) ? x.status : 'waiting');
  const events = Array.isArray(x._events) ? x._events : [];
  const eventHtml = events.length ? `<div class="activity-list">${events.map((e) => `<div class="activity-row"><b>${esc(e.event_type || 'status')}</b><span>${esc(e.status || '')} ${esc(bdTime(e.created_at))}</span>${e.note ? `<small>${esc(e.note)}</small>` : ''}</div>`).join('')}</div>` : '';
  return `<div class="card"><div class="section-head"><h2>Delivery Order ${esc(code)}</h2><span class="badge big-status ${esc(String(x.status || 'new').toLowerCase())}">${esc(x.status || 'new')}</span></div><p style="color:var(--muted);font-weight:900">${esc(statusMeaning(x.status))}</p>${timelineHtml('order', x.status)}<div class="detail-grid"><div><b>Tracking Code</b><span>${esc(code)}</span></div><div><b>Type</b><span>${esc(x.order_type || 'delivery')}</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Partner</b><span>${esc(x.provider_name || x.merchant_name || x.shop_name || 'GOVO Order')}</span></div><div><b>Partner Status</b><span>${esc(merchantState)}<br>${esc(x.merchant_note || 'No partner update')}</span></div><div><b>Delivery Address</b><span>${esc(x.customer_address || x.drop_location)}</span></div><div><b>Items / Details</b><span>${esc(x.items || x.item_details)}</span></div><div><b>Rider</b><span>${esc(riderName)}<br>${esc(riderPhone)}<br>${esc(x.rider_note || 'No rider update')}</span></div><div><b>Customer Note</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Payment</b><span>${esc(x.payment_method || 'cash')} / ${esc(x.payment_status || 'unpaid')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Updated</b><span>${esc(bdTime(x.updated_at || x.created_at))}</span></div></div>${eventHtml}<div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(code)}">Open Tracking Link</a></div></div>`;
}

function trackingServiceCard(x) {
  const code = x.request_code || serviceRequestCodeFromId(x.id, x.created_at);
  const events = Array.isArray(x._events) ? x._events : [];
  const eventHtml = events.length ? `<div class="activity-list">${events.map((e) => `<div class="activity-row"><b>${esc(e.event_type || 'status')}</b><span>${esc(e.status || '')} ${esc(bdTime(e.created_at))}</span>${e.note ? `<small>${esc(e.note)}</small>` : ''}</div>`).join('')}</div>` : '';
  return `<div class="card"><div class="section-head"><h2>Service Request ${esc(code)}</h2><span class="badge big-status ${esc(String(x.status || 'new').toLowerCase())}">${esc(x.status || 'new')}</span></div><p style="color:var(--muted);font-weight:900">${esc(statusMeaning(x.status))}</p>${timelineHtml('service', x.status)}<div class="detail-grid"><div><b>Request Code</b><span>${esc(code)}</span></div><div><b>Type</b><span>Service</span></div><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Provider</b><span>${esc(x.provider_name || 'GOVO Provider')}<br>${esc(x.provider_phone || '')}</span></div><div><b>Provider Status</b><span>${esc(x.status || 'new')}<br>${esc(x.provider_note || 'No provider update')}</span></div><div><b>Service Address</b><span>${esc(x.customer_address || x.service_address)}</span></div><div><b>Problem Details</b><span>${esc(x.problem_details)}</span></div><div><b>Customer Note</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Updated</b><span>${esc(bdTime(x.updated_at || x.created_at))}</span></div></div>${eventHtml}<div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(code)}">Open Tracking Link</a></div></div>`;
}

function trackingSupportCard(x) {
  const code = x.ticket_code || supportTicketCodeFromId(x.id, x.created_at);
  const events = Array.isArray(x._events) ? x._events : [];
  const eventHtml = events.length ? `<div class="activity-list">${events.map((e) => `<div class="activity-row"><b>${esc(e.event_type || 'status')}</b><span>${esc(e.status || '')} ${esc(bdTime(e.created_at))}</span></div>`).join('')}</div>` : '';
  return `<div class="card"><div class="section-head"><h2>Support Ticket ${esc(code)}</h2><span class="badge big-status ${esc(String(x.status || 'open').toLowerCase())}">${esc(x.status || 'open')}</span></div><p style="color:var(--muted);font-weight:900">GOVO support is reviewing this message.</p><div class="detail-grid"><div><b>Ticket Code</b><span>${esc(code)}</span></div><div><b>Customer</b><span>${esc(x.customer_name || 'Customer')}<br>${esc(x.customer_phone || '')}</span></div><div><b>Area</b><span>${esc(x.customer_area || 'Not provided')}</span></div><div><b>Subject</b><span>${esc(x.subject || 'Support')}</span></div><div><b>Message</b><span>${esc(x.message || '')}</span></div><div><b>Related</b><span>${esc(x.related_type || 'general')}<br>${esc(x.related_code || 'No related code')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Updated</b><span>${esc(bdTime(x.updated_at || x.created_at))}</span></div></div>${eventHtml}<div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(code)}">Open Tracking Link</a><a class="btn secondary" href="https://app.govoexpress.com/support">Contact Support</a></div></div>`;
}

async function fetchTrackingResults({ id = '', phone = '', type = '', code = '' }) {
  const out = { orders: [], services: [], support: [] };
  const attachOrderEvents = async () => {
    for (const o of out.orders) {
      o._events = (await pool.query(`SELECT event_type, status, note, created_at FROM govo_order_events WHERE order_id=$1 ORDER BY id ASC LIMIT 50`, [o.id])).rows;
    }
  };
  const attachServiceEvents = async () => {
    for (const sr of out.services) {
      sr._events = (await pool.query(`SELECT event_type, status, note, created_at FROM govo_service_events WHERE request_id=$1 ORDER BY id ASC LIMIT 50`, [sr.id])).rows;
    }
  };
  const attachSupportEvents = async () => {
    for (const t of out.support) {
      t._events = (await pool.query(`SELECT event_type, status, created_at FROM govo_support_events WHERE ticket_id=$1 ORDER BY id ASC LIMIT 50`, [t.id])).rows;
    }
  };
  if (type !== 'service' && type !== 'support') {
    if (code && !String(code).toUpperCase().startsWith('SRV-') && !String(code).toUpperCase().startsWith('SUP-')) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE order_code=$1 ORDER BY id DESC LIMIT 10`, [code])).rows;
    else if (!code && id && phone) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 10`, [id, phone])).rows;
    else if (!code && id) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE id=$1 ORDER BY id DESC LIMIT 10`, [id])).rows;
    else if (!code && phone) out.orders = (await pool.query(`SELECT * FROM govo_orders WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone])).rows;
    await attachOrderEvents();
  }
  if (type !== 'order' && type !== 'support') {
    if (code && !String(code).toUpperCase().startsWith('SUP-')) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE request_code=$1 ORDER BY id DESC LIMIT 10`, [code])).rows;
    else if (id && phone) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 10`, [id, phone])).rows;
    else if (id) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE id=$1 ORDER BY id DESC LIMIT 10`, [id])).rows;
    else if (phone) out.services = (await pool.query(`SELECT * FROM govo_service_requests WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone])).rows;
    await attachServiceEvents();
  }
  if (type !== 'order' && type !== 'service') {
    if (code && String(code).toUpperCase().startsWith('SUP-')) out.support = (await pool.query(`SELECT id, ticket_code, customer_name, customer_phone, customer_area, subject, message, related_type, related_code, priority, status, created_at, updated_at FROM govo_support_tickets WHERE ticket_code=$1 ORDER BY id DESC LIMIT 10`, [code])).rows;
    else if (!code && id && phone) out.support = (await pool.query(`SELECT id, ticket_code, customer_name, customer_phone, customer_area, subject, message, related_type, related_code, priority, status, created_at, updated_at FROM govo_support_tickets WHERE id=$1 AND customer_phone=$2 ORDER BY id DESC LIMIT 10`, [id, phone])).rows;
    else if (!code && id) out.support = (await pool.query(`SELECT id, ticket_code, customer_name, customer_phone, customer_area, subject, message, related_type, related_code, priority, status, created_at, updated_at FROM govo_support_tickets WHERE id=$1 ORDER BY id DESC LIMIT 10`, [id])).rows;
    else if (!code && phone) out.support = (await pool.query(`SELECT id, ticket_code, customer_name, customer_phone, customer_area, subject, message, related_type, related_code, priority, status, created_at, updated_at FROM govo_support_tickets WHERE customer_phone=$1 ORDER BY id DESC LIMIT 10`, [phone])).rows;
    await attachSupportEvents();
  }
  return out;
}

function renderTrackPage({ id = '', phone = '', code = '', orders = [], services = [], support = [], direct = false }) {
  const searched = !!(id || phone || code || direct);
  const orderHtml = orders.map(trackingOrderCard).join('');
  const serviceHtml = services.map(trackingServiceCard).join('');
  const supportHtml = support.map(trackingSupportCard).join('');
  const empty = searched && !orders.length && !services.length && !support.length ? `<section class="card"><h2>No tracking found</h2><p style="color:var(--muted)">Check your order/request/ticket ID or phone number. Contact GOVO if you need help.</p><div class="actions"><a class="btn" href="https://app.govoexpress.com/app">Home</a><a class="btn secondary" href="https://app.govoexpress.com/shops">Shops</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/support">Support</a></div></section>` : '';
  return page('Track GOVO', `<section class="card app-hero"><span class="pill">Unified Tracking</span><h1>Track order, service request or support ticket</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Search by tracking ID, request ID, support ticket code, or phone number.</p><form method="GET" action="/track"><label>Tracking Code</label><input name="code" value="${esc(code)}" placeholder="GOVO-000001 / SRV-YYYYMMDD-0001 / SUP-YYYYMMDD-0001"><label>Order / Request / Ticket ID</label><input name="id" value="${esc(id)}" placeholder="Example: 12"><label>Phone Number</label><input name="phone" value="${esc(phone)}" placeholder="017xxxxxxxx"><button>Check Status</button></form><div class="actions"><a class="btn secondary" href="https://app.govoexpress.com/app">Home</a><a class="btn secondary" href="https://app.govoexpress.com/shops">Shops</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/support">Support</a></div></section>${orderHtml ? `<section class="card"><div class="section-head"><h2>Delivery Orders</h2><span class="pill">${orders.length}</span></div></section><section class="cards">${orderHtml}</section>` : ''}${serviceHtml ? `<section class="card"><div class="section-head"><h2>Service Requests</h2><span class="pill">${services.length}</span></div></section><section class="cards">${serviceHtml}</section>` : ''}${supportHtml ? `<section class="card"><div class="section-head"><h2>Support Tickets</h2><span class="pill">${support.length}</span></div></section><section class="cards">${supportHtml}</section>` : ''}${empty}`, 'track');
}

app.get('/track', async (req, res, next) => {
  try {
    const code = String(req.query.code || '').trim();
    const id = String(req.query.id || '').trim();
    const phone = String(req.query.phone || '').trim();
    const results = await fetchTrackingResults({ id, phone, code });
    res.send(renderTrackPage({ id, phone, code, orders: results.orders, services: results.services, support: results.support }));
  } catch (e) { next(e); }
});

app.get('/track/:type/:id', async (req, res, next) => {
  try {
    const type = String(req.params.type || '').trim().toLowerCase();
    if (!['order', 'service', 'support'].includes(type)) return res.status(404).send(renderTrackPage({ direct: true }));
    const id = String(req.params.id || '').trim();
    const results = await fetchTrackingResults({ id, type });
    res.send(renderTrackPage({ id, orders: results.orders, services: results.services, support: results.support, direct: true }));
  } catch (e) { next(e); }
});

async function approvedMerchantByPhone(phone) {
  const r = await pool.query(`SELECT * FROM govo_merchant_leads WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
  const lead = r.rows[0];
  return { lead, approved: !!lead && String(lead.status || 'pending').toLowerCase() === 'approved' };
}

app.get('/merchant/dashboard', async (req, res, next) => {
  try {
    const prefill = String(req.query.phone || '').trim();
    const merchantSessionId = readPortalSession(req, 'merchant');
    if (!merchantSessionId) return res.send(merchantLoginPage(prefill));
    const merchantResult = await pool.query(`SELECT * FROM govo_merchant_leads WHERE id=$1 LIMIT 1`, [merchantSessionId]);
    const m = merchantResult.rows[0];
    if (!m) {
      clearPortalSession(req, res, 'merchant');
      return res.status(401).send(merchantLoginPage('', 'Session expired. Please login again.'));
    }
    const merchantStatus = String(m.status || 'pending').toLowerCase();
    if (merchantStatus !== 'approved') return res.send(page('Merchant Dashboard', `<section class="card"><h1>Merchant Pending</h1><p>Merchant status is ${esc(m.status || 'pending')}.</p><div class="actions"><a class="btn secondary" href="/merchant/logout">Logout</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'merchant'));
    const phone = String(m.phone || m.whatsapp || '').trim();
    const prof = (await pool.query(`SELECT * FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone])).rows[0] || {};
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE merchant_id=$1 OR merchant_lead_id=$1 OR merchant_phone=$2 OR merchant_phone=$3 OR shop_name=$4 OR merchant_name=$4 ORDER BY id DESC LIMIT 100`, [m.id, m.phone || '', m.whatsapp || '', m.shop_name || '']);
    const orderActions = (x) => `<form method="POST" action="/merchant/order/status"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="id" value="${esc(x.id)}"><input name="merchant_note" value="${esc(x.merchant_note || '')}" placeholder="Merchant note"><div class="three"><button name="status" value="accepted">Accept</button><button name="status" value="preparing">Preparing</button><button name="status" value="ready">Ready</button></div><div class="actions"><button class="reject" name="status" value="rejected">Reject</button></div></form>`;
    const orderCards = orders.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.customer_name || 'Customer')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Item Details</b><span>${esc(x.item_details)}</span></div><div><b>Pickup Address</b><span>${esc(x.pickup_location)}</span></div><div><b>Delivery Address</b><span>${esc(x.drop_location)}</span></div><div><b>Notes</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Merchant Status</b><span>${esc(x.merchant_status || 'No update')}<br>${esc(x.merchant_note || 'No merchant note')}</span></div><div><b>Status</b><span>${esc(x.status || 'pending')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div>${orderActions(x)}<div class="actions"><a class="btn secondary" href="/track/order/${encodeURIComponent(x.id)}">Track</a></div></div>`).join('');
    const items = await pool.query(`SELECT id, item_name, price, details FROM govo_shop_items WHERE merchant_phone=$1 AND COALESCE(is_active,true)=true ORDER BY id DESC LIMIT 50`, [phone]);
    const itemHtml = items.rows.map((i) => `<div class="item-box"><b>${esc(i.item_name || '')}</b><span>${esc(i.price || '')}</span><br><span>${esc(i.details || '')}</span><div class="actions"><a class="btn secondary" href="/merchant/item/${encodeURIComponent(i.id)}/delete?phone=${encodeURIComponent(phone)}">Remove</a></div></div>`).join('');
    const menuProducts = await pool.query(`SELECT id, name, category, price, stock_status, image_url FROM govo_products WHERE merchant_id=$1 ORDER BY CASE stock_status WHEN 'available' THEN 1 WHEN 'out_of_stock' THEN 2 ELSE 3 END, id DESC LIMIT 12`, [m.id]);
    const menuProductHtml = menuProducts.rows.map((p) => `<div class="item-box"><b>${esc(p.name || '')}</b><span>৳${esc(p.price || 0)} - ${esc(p.stock_status || 'available')}</span><br><span>${esc(p.category || 'Menu')}</span></div>`).join('');
    res.send(page('Merchant Dashboard', `<section class="card app-hero"><h1>Merchant Dashboard</h1>${listingImage(m.image_url || prof.logo_image, m.shop_name, true)}<div class="detail-grid"><div><b>Shop</b><span>${esc(m.shop_name || '')}</span></div><div><b>Phone</b><span>${esc(m.whatsapp || m.phone || phone)}</span></div><div><b>Category</b><span>${esc(m.category || '')}</span></div><div><b>Status</b><span>${badge(m.status)}</span></div><div><b>Trust</b><span>${trustBadges(m)}</span></div><div><b>Rating</b><span>${esc(ratingText(m))}</span></div></div><div class="actions"><a class="btn" href="/merchant/products">Products</a><a class="btn secondary" href="#orders">Orders</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track</a><a class="btn secondary" href="/merchant/logout">Logout</a></div></section><section class="card"><h2>Shop Profile</h2><form method="POST" action="/merchant/profile/update" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><label>Shop Name</label><input name="shop_name" value="${esc(prof.shop_name || m.shop_name || '')}" required><label>Owner Name</label><input name="owner_name" value="${esc(prof.owner_name || m.owner_name || '')}"><label>Area</label><input name="location" value="${esc(prof.location || m.location || '')}"><label>Address</label><textarea name="shop_address">${esc(m.shop_address || '')}</textarea><label>Category</label><input name="category" value="${esc(prof.category || m.category || '')}"><label>Opening Hours</label><input name="opening_hours" value="${esc(prof.opening_hours || '')}"><label>Delivery Area</label><input name="delivery_area" value="${esc(prof.delivery_area || '')}"><label><input type="checkbox" name="is_available" ${boolish(m.is_available) ? 'checked' : ''}> Shop Available</label><label><input type="checkbox" name="delivery_available" ${boolish(m.delivery_available) ? 'checked' : ''}> Delivery Available</label><label>WhatsApp</label><input name="whatsapp" value="${esc(prof.whatsapp || m.whatsapp || '')}"><label>Description</label><textarea name="description">${esc(prof.description || m.shop_description || '')}</textarea><label>Shop Image / Logo</label><input type="file" name="shop_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(m.image_url || prof.logo_image || '')}" placeholder="Optional existing image URL"><button>Save Shop Info</button></form></section><section class="card"><div class="section-head"><h2>Product / Menu</h2><span class="pill">${esc(menuProducts.rows.length)} shown</span></div><form method="POST" action="/merchant/products/create" enctype="multipart/form-data"><label>Product/Menu Name</label><input name="name" required><label>Price</label><input name="price" placeholder="120"><label>Category</label><input name="category"><label>Description</label><textarea name="description"></textarea><label>Upload Image</label><input type="file" name="product_image" accept="image/jpeg,image/png,image/webp,image/gif"><button>Add Product</button></form><div class="actions"><a class="btn secondary" href="/merchant/products">Open Full Product Manager</a><a class="btn secondary" href="/shop/${encodeURIComponent(m.id)}">View Public Shop</a></div><h2>Current Menu</h2><div class="item-grid">${menuProductHtml || '<p>No product added yet.</p>'}</div>${itemHtml ? `<details><summary>Legacy Items</summary><div class="item-grid">${itemHtml}</div></details>` : ''}</section><section class="card" id="orders"><div class="section-head"><h2>Incoming Orders</h2><span class="pill">${esc(orders.rows.length)} orders</span></div><p style="color:var(--muted);font-weight:900">Next action: accept, prepare, mark ready, or reject.</p></section><section class="cards">${orderCards || '<div class="card"><h2>No orders yet</h2><p style="color:var(--muted);font-weight:900">Customer orders from your shop will appear here.</p></div>'}</section>`, 'merchant'));
  } catch (e) { next(e); }
});

app.post(['/merchant/profile', '/merchant/profile/update'], imageUpload.single('shop_image'), async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const check = await approvedMerchantByPhone(phone);
    if (!check.lead) return res.status(404).send(page('Merchant Not Found', '<section class="card"><h1>Merchant not found</h1></section>', 'merchant'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || check.lead.image_url || '').trim();
    const existingProfile = await pool.query(`SELECT id FROM govo_merchant_profiles WHERE phone=$1 LIMIT 1`, [phone]);
    await pool.query(`UPDATE govo_merchant_leads SET shop_name=$1, owner_name=$2, location=$3, category=$4, shop_description=$5, whatsapp=$6, image_url=$7, shop_address=$8, is_available=$9, delivery_available=$10, opening_hours=$11, updated_at=NOW() WHERE id=$12`, [keepValue(req.body.shop_name, check.lead.shop_name), keepValue(req.body.owner_name, check.lead.owner_name), keepValue(req.body.location, check.lead.location), keepValue(req.body.category, check.lead.category), keepValue(req.body.description, check.lead.shop_description), keepValue(req.body.whatsapp, check.lead.whatsapp), imageUrl, keepValue(req.body.shop_address, check.lead.shop_address), checkboxBool(req.body.is_available), checkboxBool(req.body.delivery_available), keepValue(req.body.opening_hours, check.lead.opening_hours), check.lead.id]);
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
    if (!check.lead) return res.status(404).send(page('Merchant Not Found', '<section class="card"><h1>Merchant not found</h1></section>', 'merchant'));
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


async function loggedMerchant(req, res) {
  const merchantSessionId = readPortalSession(req, 'merchant');
  if (!merchantSessionId) return { error: res.send(merchantLoginPage(String(req.query.phone || '').trim())) };
  const merchant = await pool.query(`SELECT id, shop_name, owner_name, phone, whatsapp, location, category, image_url, COALESCE(status,'pending') AS status FROM govo_merchant_leads WHERE id=$1 LIMIT 1`, [merchantSessionId]);
  const m = merchant.rows[0];
  if (!m) {
    clearPortalSession(req, res, 'merchant');
    return { error: res.status(401).send(merchantLoginPage('', 'Session expired. Please login again.')) };
  }
  return { merchant: m };
}

function productStockStatus(v) {
  const s = String(v || 'available').trim().toLowerCase();
  return ['available', 'out_of_stock', 'hidden'].includes(s) ? s : 'available';
}

function productPrice(v) {
  const n = Number(String(v || '0').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

app.get('/merchant/products', async (req, res, next) => {
  try {
    const ctx = await loggedMerchant(req, res);
    if (ctx.error) return;
    const m = ctx.merchant;
    const selectedFilter = String(req.query.filter || 'all').trim().toLowerCase();
    const filter = ['available', 'out_of_stock', 'hidden'].includes(selectedFilter) ? selectedFilter : 'all';
    const where = ['merchant_id=$1'];
    const params = [m.id];
    if (filter !== 'all') { params.push(filter); where.push(`stock_status=$${params.length}`); }
    const [products, counts] = await Promise.all([
      pool.query(`SELECT id, merchant_id, merchant_name, name, category, price, description, image_url, stock_status, public_visible, is_demo, created_at, updated_at FROM govo_products WHERE ${where.join(' AND ')} ORDER BY CASE stock_status WHEN 'available' THEN 1 WHEN 'out_of_stock' THEN 2 ELSE 3 END, category NULLS LAST, id DESC LIMIT 200`, params),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE stock_status='available' AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false)::int available, COUNT(*) FILTER (WHERE stock_status='out_of_stock')::int out_of_stock, COUNT(*) FILTER (WHERE stock_status='hidden' OR COALESCE(public_visible,true)=false)::int hidden FROM govo_products WHERE merchant_id=$1`, [m.id]),
    ]);
    const c = counts.rows[0] || {};
    const filterLink = (label, value) => `<a class="btn ${filter === value ? '' : 'secondary'}" href="/merchant/products?filter=${encodeURIComponent(value)}">${esc(label)}</a>`;
    const stockSelect = (x) => ['available', 'out_of_stock', 'hidden'].map((v) => `<option value="${v}" ${x.stock_status === v ? 'selected' : ''}>${v.replace(/_/g, ' ')}</option>`).join('');
    const rows = products.rows.map((x) => `<div class="card" style="padding:14px"><div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start"><div style="min-width:0"><span class="pill">${esc(x.category || 'Menu')}</span><h2 style="font-size:22px;margin-top:10px">${esc(x.name || '')}</h2><p style="font-weight:1000;color:#bbf7d0;margin:6px 0">৳${esc(x.price || 0)}</p></div>${x.image_url ? `<img src="${esc(x.image_url)}" alt="${esc(x.name || 'Product')}" style="width:82px;height:82px;object-fit:cover;border-radius:14px;border:1px solid rgba(34,197,94,.45)">` : ''}</div><p>${esc(x.description || '')}</p><div class="actions trust-row">${badge(x.stock_status)}<span class="pill">${boolish(x.public_visible) ? 'Public Visible' : 'Hidden'}</span></div><form method="POST" action="/merchant/products/update" enctype="multipart/form-data" style="margin-top:12px"><input type="hidden" name="id" value="${esc(x.id)}"><label>Name</label><input name="name" value="${esc(x.name || '')}" required><label>Price</label><input name="price" value="${esc(x.price || 0)}"><label>Category</label><input name="category" value="${esc(x.category || '')}"><label>Description</label><textarea name="description">${esc(x.description || '')}</textarea><label>Status</label><select name="stock_status">${stockSelect(x)}</select><label>Current Image URL</label><input name="image_url" value="${esc(x.image_url || '')}"><label>Upload New Image</label><input type="file" name="product_image" accept="image/jpeg,image/png,image/webp,image/gif"><button>Save Product</button></form><form method="POST" action="/merchant/products/hide"><input type="hidden" name="id" value="${esc(x.id)}"><button class="reject">Hide Product</button></form></div>`).join('');
    res.send(page('Product / Menu Manager', `<section class="card app-hero"><h1>Product / Menu Manager</h1><p>Shop: ${esc(m.shop_name || '')}</p><div class="actions"><a class="btn secondary" href="https://merchant.govoexpress.com/merchant/dashboard">Dashboard</a><a class="btn secondary" href="/shop/${encodeURIComponent(m.id)}">View Public Shop</a><a class="btn secondary" href="/merchant/logout">Logout</a></div></section><section class="card"><h2>Add Product</h2><form method="POST" action="/merchant/products/create" enctype="multipart/form-data"><label>Product/Menu Name</label><input name="name" required><label>Price</label><input name="price" placeholder="120"><label>Category</label><input name="category" placeholder="Food / Grocery / Service"><label>Description</label><textarea name="description"></textarea><label>Status</label><select name="stock_status"><option>available</option><option>out_of_stock</option><option>hidden</option></select><label>Upload Image</label><input type="file" name="product_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Image URL</label><input name="image_url" placeholder="Optional image URL"><button>Add Product</button></form></section><section class="card"><div class="toolbar">${filterLink(`All ${c.total || 0}`, 'all')}${filterLink(`Available ${c.available || 0}`, 'available')}${filterLink(`Out ${c.out_of_stock || 0}`, 'out_of_stock')}${filterLink(`Hidden ${c.hidden || 0}`, 'hidden')}</div></section><section class="cards">${rows || '<div class="card"><h2>No product found</h2></div>'}</section>`, 'merchant'));
  } catch (e) { next(e); }
});

app.post('/merchant/products/create', productUpload.single('product_image'), async (req, res, next) => {
  try {
    const ctx = await loggedMerchant(req, res);
    if (ctx.error) return;
    const m = ctx.merchant;
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).send(page('Invalid Product', '<section class="card"><h1>Product name required</h1><a class="btn" href="/merchant/products">Back</a></section>', 'merchant'));
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || '').trim();
    await pool.query(`INSERT INTO govo_products (merchant_id, merchant_name, name, category, price, description, image_url, stock_status, public_visible, is_demo, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,NOW())`, [m.id, m.shop_name || '', name, String(req.body.category || '').trim(), productPrice(req.body.price), String(req.body.description || '').trim(), imageUrl, productStockStatus(req.body.stock_status), productStockStatus(req.body.stock_status) !== 'hidden']);
    res.redirect('/merchant/products');
  } catch (e) { next(e); }
});

app.post('/merchant/products/update', productUpload.single('product_image'), async (req, res, next) => {
  try {
    const ctx = await loggedMerchant(req, res);
    if (ctx.error) return;
    const m = ctx.merchant;
    const current = await pool.query(`SELECT image_url FROM govo_products WHERE id=$1 AND merchant_id=$2 LIMIT 1`, [String(req.body.id || ''), m.id]);
    if (!current.rows.length) return res.status(404).send(page('Product Not Found', '<section class="card"><h1>Product not found</h1><a class="btn" href="/merchant/products">Back</a></section>', 'merchant'));
    const stock = productStockStatus(req.body.stock_status);
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || current.rows[0].image_url || '').trim();
    await pool.query(`UPDATE govo_products SET name=$1, category=$2, price=$3, description=$4, image_url=$5, stock_status=$6, public_visible=$7, updated_at=NOW() WHERE id=$8 AND merchant_id=$9`, [String(req.body.name || '').trim(), String(req.body.category || '').trim(), productPrice(req.body.price), String(req.body.description || '').trim(), imageUrl, stock, stock !== 'hidden', String(req.body.id || ''), m.id]);
    res.redirect('/merchant/products');
  } catch (e) { next(e); }
});

app.post('/merchant/products/hide', async (req, res, next) => {
  try {
    const ctx = await loggedMerchant(req, res);
    if (ctx.error) return;
    await pool.query(`UPDATE govo_products SET stock_status='hidden', public_visible=false, updated_at=NOW() WHERE id=$1 AND merchant_id=$2`, [String(req.body.id || ''), ctx.merchant.id]);
    res.redirect('/merchant/products');
  } catch (e) { next(e); }
});

app.post('/merchant/products', productUpload.single('product_image'), async (req, res, next) => {
  try {
    const ctx = await loggedMerchant(req, res);
    if (ctx.error) return;
    const m = ctx.merchant;
    if (String(req.body.action || '') === 'add') {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || '').trim();
      await pool.query(`INSERT INTO govo_products (merchant_id, merchant_name, name, category, price, description, image_url, stock_status, public_visible, is_demo, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'available',true,false,NOW())`, [m.id, m.shop_name || '', String(req.body.product_name || req.body.name || '').trim(), String(req.body.category || '').trim(), productPrice(req.body.price), String(req.body.description || '').trim(), imageUrl]);
    }
    res.redirect('/merchant/products');
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
    const prefill = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    const riderSessionId = readPortalSession(req, 'rider');
    if (!riderSessionId) return res.send(riderLoginPage(prefill));
    const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, whatsapp, location, area, address, vehicle_type, nid, image_url, COALESCE(is_available,true) AS is_available, COALESCE(status,'pending') AS status FROM govo_rider_leads WHERE id=$1 LIMIT 1`, [riderSessionId]);
    if (!rider.rows.length) {
      clearPortalSession(req, res, 'rider');
      return res.status(401).send(riderLoginPage('', 'Session expired. Please login again.'));
    }
    const rd = rider.rows[0];
    const phone = String(rd.phone || '').trim();
    const riderStatus = String(rd.status || 'pending').toLowerCase();
    const isApproved = riderStatus === 'approved';
    if (req.method === 'POST') {
      const allowed = ['picked_up', 'on_the_way', 'delivered'];
      const status = String(req.body.status || '').trim().toLowerCase();
      if (!isApproved) return res.status(403).send(page('Rider Pending', `<section class="card"><h1>Approval Required</h1><p>Your rider profile is ${esc(rd.status)}. GOVO admin must approve the rider before order updates.</p><a class="btn secondary" href="/rider/dashboard?phone=${encodeURIComponent(phone)}">Back Dashboard</a></section>`, 'rider'));
      if (!allowed.includes(status)) return res.status(400).send(page('Invalid Status', `<section class="card"><h1>Invalid rider action</h1><a class="btn secondary" href="/rider/dashboard?phone=${encodeURIComponent(phone)}">Back Dashboard</a></section>`, 'rider'));
      const updated = await pool.query(`UPDATE govo_orders SET status=$1, rider_note=$2, updated_at=NOW() WHERE id=$3 AND (rider_id=$4 OR assigned_rider_id=$4 OR rider_phone=$5 OR assigned_rider_phone=$5) RETURNING *`, [status, String(req.body.rider_note || ''), String(req.body.id || ''), rd.id, phone]);
      if (updated.rows.length) {
        const o = updated.rows[0];
        await recordOrderEvent(o.id, 'rider_status', status, String(req.body.rider_note || ''), 'rider', rd.rider_name || rd.phone || 'Rider');
        await sendTelegram([`GOVO Rider Order Update`, `Order: ${o.order_code || orderCodeFromId(o.id)}`, `Status: ${status}`, `Rider: ${rd.rider_name || ''} (${rd.phone || ''})`, `Customer: ${o.customer_name || ''} (${o.customer_phone || ''})`, `Pickup: ${o.pickup_location || ''}`, `Delivery: ${o.drop_location || ''}`].join('\n'));
      }
      return res.redirect(`/rider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    const orders = await pool.query(`SELECT * FROM govo_orders WHERE rider_id=$1 OR assigned_rider_id=$1 OR rider_phone=$2 OR assigned_rider_phone=$2 ORDER BY CASE COALESCE(status,'new') WHEN 'assigned' THEN 1 WHEN 'picked_up' THEN 2 WHEN 'on_the_way' THEN 3 WHEN 'delivered' THEN 4 ELSE 5 END, id DESC LIMIT 100`, [rd.id, phone]);
    const actionButtons = (x) => `<form method="POST" action="/rider/orders/update-status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="rider_note" value="${esc(x.rider_note || '')}" placeholder="Rider note optional"><div class="three"><button name="status" value="picked_up">Picked Up</button><button name="status" value="on_the_way">On The Way</button><button name="status" value="delivered">Delivered</button></div></form>`;
    const cards = orders.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.shop_name || 'GOVO Order')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Pickup Address</b><span>${esc(x.pickup_location)}</span></div><div><b>Delivery Address</b><span>${esc(x.drop_location)}</span></div><div><b>Item Details</b><span>${esc(x.item_details)}</span></div><div><b>Customer Notes</b><span>${esc(x.customer_note || x.note || 'No note')}</span></div><div><b>Tracking</b><span>${esc(x.order_code || orderCodeFromId(x.id))}</span></div><div><b>Order Status</b><span>${esc(x.status || 'pending')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div><div><b>Rider Note</b><span>${esc(x.rider_note || 'No rider note')}</span></div></div>${isApproved ? actionButtons(x) : '<p style="color:var(--muted);font-weight:900">Rider actions unlock after admin approval.</p>'}<div class="actions"><a class="btn secondary" href="/track/order/${encodeURIComponent(x.id)}">Track Order</a></div></div>`).join('');
    res.send(page('Rider Dashboard', `<section class="card app-hero"><h1>Rider Dashboard</h1>${listingImage(rd.image_url, rd.rider_name, true)}<div class="detail-grid"><div><b>Name</b><span>${esc(rd.rider_name || 'Rider')}</span></div><div><b>Phone</b><span>${esc(rd.whatsapp || rd.phone)}</span></div><div><b>Area</b><span>${esc(rd.area || rd.location || 'Not set')}</span></div><div><b>Status</b><span>${badge(rd.status)}</span></div><div><b>Vehicle</b><span>${esc(rd.vehicle_type || 'Not set')}</span></div><div><b>Orders</b><span>${esc(orders.rows.length)}</span></div></div><div class="actions"><a class="btn secondary" href="/rider/logout">Logout</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section><section class="card"><h2>Rider Profile</h2><form method="POST" action="/rider/profile/update" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><label>Rider Name</label><input name="rider_name" value="${esc(rd.rider_name || '')}"><label>WhatsApp</label><input name="whatsapp" value="${esc(rd.whatsapp || '')}"><label>Area</label><input name="area" value="${esc(rd.area || rd.location || '')}"><label>Address</label><textarea name="address">${esc(rd.address || '')}</textarea><label>Vehicle Type</label><input name="vehicle_type" value="${esc(rd.vehicle_type || '')}"><label>NID</label><input name="nid" value="${esc(rd.nid || '')}"><label><input type="checkbox" name="is_available" ${boolish(rd.is_available) ? 'checked' : ''}> Available</label><label>Profile Image</label><input type="file" name="rider_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(rd.image_url || '')}"><button>Save Profile</button></form></section><section class="card"><h2>Assigned Orders</h2><p style="color:var(--muted);font-weight:900">Next action: accept, pick up, deliver, or mark failed.</p></section><section class="cards">${cards || '<div class="card"><h2>No assigned orders</h2><p style="color:var(--muted);font-weight:900">New orders will appear here after admin dispatch.</p></div>'}</section>`, 'rider'));
  } catch (e) { next(e); }
});


app.post('/rider/orders/update-status', async (req, res, next) => {
  try {
    const riderSessionId = readPortalSession(req, 'rider');
    if (!riderSessionId) return res.status(403).send(riderLoginPage('', 'Please login first.'));
    const rider = await pool.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone, COALESCE(status,'pending') AS status FROM govo_rider_leads WHERE id=$1 LIMIT 1`, [riderSessionId]);
    const rd = rider.rows[0];
    if (!rd) {
      clearPortalSession(req, res, 'rider');
      return res.status(401).send(riderLoginPage('', 'Session expired. Please login again.'));
    }
    if (String(rd.status || '').toLowerCase() !== 'approved') return res.status(403).send(page('Rider Pending', `<section class="card"><h1>Approval Required</h1><a class="btn secondary" href="/rider/dashboard">Back Dashboard</a></section>`, 'rider'));
    const status = cleanOrderStatus(req.body.status, 'picked_up');
    if (!['picked_up', 'on_the_way', 'delivered'].includes(status)) return res.status(400).send(page('Invalid Status', `<section class="card"><h1>Invalid rider action</h1><a class="btn secondary" href="/rider/dashboard">Back Dashboard</a></section>`, 'rider'));
    const updated = await pool.query(`UPDATE govo_orders SET status=$1, rider_note=$2, updated_at=NOW() WHERE id=$3 AND (rider_id=$4 OR assigned_rider_id=$4 OR rider_phone=$5 OR assigned_rider_phone=$5) RETURNING *`, [status, String(req.body.rider_note || ''), String(req.body.id || ''), rd.id, rd.phone || '']);
    if (updated.rows.length) {
      const o = updated.rows[0];
      await recordOrderEvent(o.id, 'rider_status', status, String(req.body.rider_note || ''), 'rider', rd.rider_name || rd.phone || 'Rider');
      sendTelegram([`GOVO Rider Order Update`, `Order: ${o.order_code || orderCodeFromId(o.id)}`, `Status: ${status}`, `Rider: ${rd.rider_name || ''} (${rd.phone || ''})`, `Customer: ${o.customer_name || ''} (${o.customer_phone || ''})`, `Address: ${o.customer_address || o.drop_location || ''}`].join('\n')).catch(() => {});
    }
    res.redirect('/rider/dashboard');
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


function cleanServiceStatus(v, fallback = 'new') {
  const s = String(v || fallback).trim().toLowerCase();
  const map = { pending: 'new', accepted: 'confirmed', working: 'in_progress', rejected: 'cancelled' };
  const normalized = map[s] || s;
  return ['new', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'].includes(normalized) ? normalized : fallback;
}

function serviceRequestCodeFromId(id, createdAt = new Date()) {
  const d = createdAt ? new Date(createdAt) : new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `SRV-${y}${m}${day}-${String(id || '').padStart(4, '0')}`;
}

async function recordServiceEvent(requestId, eventType, status, note, actorType = 'admin', actorName = '') {
  if (!requestId) return;
  await pool.query(`INSERT INTO govo_service_events (request_id, event_type, status, note, actor_type, actor_name, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`, [requestId, eventType || 'status', status || '', note || '', actorType || 'admin', actorName || '']);
}

async function createServiceRequest(data, actorType = 'customer') {
  const status = cleanServiceStatus(data.status, 'new');
  const r = await pool.query(`INSERT INTO govo_service_requests (customer_name, customer_phone, customer_area, customer_address, service_address, service_type, provider_id, provider_name, provider_phone, preferred_time, problem_details, note, customer_note, estimated_fee, status, priority, created_at, updated_at) VALUES ($1,$2,$3,$4,$4,$5,NULLIF($6,'')::int,$7,$8,$9,$10,$11,$11,$12,$13,$14,NOW(),NOW()) RETURNING id, created_at`, [data.customer_name || '', data.customer_phone || '', data.customer_area || '', data.customer_address || data.service_address || '', data.service_type || '', data.provider_id || '', data.provider_name || '', data.provider_phone || '', data.preferred_time || '', data.problem_details || '', data.note || '', safeAmount(data.estimated_fee), status, cleanOrderPriority(data.priority)]);
  const row = r.rows[0];
  const code = serviceRequestCodeFromId(row.id, row.created_at);
  await pool.query(`UPDATE govo_service_requests SET request_code=$1 WHERE id=$2 AND request_code IS NULL`, [code, row.id]);
  await recordServiceEvent(row.id, 'created', status, data.note || 'Service request created', actorType, actorType === 'admin' ? 'Admin' : 'Customer');
  return { id: row.id, code };
}


function cleanSupportStatus(v, fallback = 'open') {
  const s = String(v || fallback).trim().toLowerCase();
  return ['open', 'working', 'resolved', 'cancelled'].includes(s) ? s : fallback;
}

function cleanSupportPriority(v) {
  const s = String(v || 'normal').trim().toLowerCase();
  return ['low', 'normal', 'high', 'urgent'].includes(s) ? s : 'normal';
}

function cleanSupportRelatedType(v) {
  const s = String(v || 'general').trim().toLowerCase();
  return ['order', 'service', 'general', 'merchant', 'rider'].includes(s) ? s : 'general';
}

function supportTicketCodeFromId(id, createdAt = new Date()) {
  const d = createdAt ? new Date(createdAt) : new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `SUP-${y}${m}${day}-${String(id || '').padStart(4, '0')}`;
}

async function recordSupportEvent(ticketId, eventType, status, note, actorType = 'admin', actorName = '') {
  if (!ticketId) return;
  await pool.query(`INSERT INTO govo_support_events (ticket_id, event_type, status, note, actor_type, actor_name, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`, [ticketId, eventType || 'note', status || '', note || '', actorType || 'admin', actorName || '']);
}

async function createSupportTicket(data, actorType = 'customer') {
  const r = await pool.query(`INSERT INTO govo_support_tickets (customer_name, customer_phone, customer_area, subject, message, related_type, related_code, priority, status, note, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,NOW(),NOW()) RETURNING id, created_at`, [data.customer_name || '', data.customer_phone || '', data.customer_area || '', data.subject || '', data.message || '', cleanSupportRelatedType(data.related_type), data.related_code || '', cleanSupportPriority(data.priority), data.note || '']);
  const row = r.rows[0];
  const code = supportTicketCodeFromId(row.id, row.created_at);
  await pool.query(`UPDATE govo_support_tickets SET ticket_code=$1 WHERE id=$2 AND ticket_code IS NULL`, [code, row.id]);
  await recordSupportEvent(row.id, 'created', 'open', data.message || 'Support ticket created', actorType, actorType === 'admin' ? 'Admin' : 'Customer');
  return { id: row.id, code };
}

function supportContactActions() {
  const phone = String(process.env.GOVO_SUPPORT_PHONE || process.env.SUPPORT_PHONE || process.env.WHATSAPP_PHONE || '').trim();
  const wa = phone.replace(/\D/g, '');
  return `<div class="actions">${wa ? `<a class="btn secondary wa" href="https://wa.me/${esc(wa)}">WhatsApp Support</a>` : ''}${phone ? `<a class="btn secondary" href="tel:${esc(phone)}">Call Support</a>` : ''}</div>`;
}


function supportForm(data = {}, error = '') {
  const related = cleanSupportRelatedType(data.related_type || 'general');
  const opt = (v, label) => `<option value="${v}" ${related === v ? 'selected' : ''}>${label}</option>`;
  return page('GOVO Support', `${error ? `<section class="card"><h1>Check support details</h1><p style="color:#fecaca;font-weight:900">${esc(error)}</p></section>` : ''}<section class="card app-hero"><h1>GOVO Support</h1><p style="color:var(--muted)">Send order questions, service issues, complaints or follow-up messages to GOVO support.</p><form method="POST" action="/support"><label>Your Name</label><input name="customer_name" value="${esc(data.customer_name || '')}"><label>Your Phone</label><input name="customer_phone" value="${esc(data.customer_phone || '')}" required><label>Your Area</label><input name="customer_area" value="${esc(data.customer_area || '')}"><label>Subject</label><input name="subject" value="${esc(data.subject || '')}" placeholder="Order question / complaint / follow-up"><label>Message</label><textarea name="message" required>${esc(data.message || '')}</textarea><label>Related Type</label><select name="related_type">${opt('general','general')}${opt('order','order')}${opt('service','service')}${opt('merchant','merchant')}${opt('rider','rider')}</select><label>Related Code <span style="color:var(--muted)">(optional)</span></label><input name="related_code" value="${esc(data.related_code || '')}" placeholder="GOVO-000001 / SRV-YYYYMMDD-0001"><button>Submit Support Ticket</button></form><div class="actions"><a class="btn secondary" href="https://app.govoexpress.com/track">Track</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'track');
}

app.get('/support', (req, res) => res.send(supportForm(req.query || {})));

app.post('/support', async (req, res, next) => {
  try {
    const data = {
      customer_name: String(req.body.customer_name || '').trim(),
      customer_phone: String(req.body.customer_phone || '').trim(),
      customer_area: String(req.body.customer_area || '').trim(),
      subject: String(req.body.subject || '').trim(),
      message: String(req.body.message || '').trim(),
      related_type: cleanSupportRelatedType(req.body.related_type),
      related_code: String(req.body.related_code || '').trim(),
      priority: 'normal',
    };
    const missing = [];
    if (!data.customer_phone) missing.push('phone');
    if (!data.message) missing.push('message');
    if (missing.length) return res.status(400).send(supportForm(data, `Please fill: ${missing.join(', ')}`));
    const created = await createSupportTicket(data, 'customer');
    sendTelegram(['New GOVO Support Ticket', '', `Ticket: ${created.code}`, `Customer: ${data.customer_name || ''}`, `Phone: ${data.customer_phone}`, `Area: ${data.customer_area || ''}`, `Subject: ${data.subject || ''}`, `Related: ${data.related_type} ${data.related_code || ''}`, `Message: ${data.message}`].join('\n')).catch(() => {});
    res.send(page('Support Ticket Submitted', `<section class="card app-hero"><span class="pill">Ticket Received</span><h1>Support Ticket Submitted</h1><p>GOVO support has received your message.</p><h2>Ticket Code: ${esc(created.code)}</h2>${supportContactActions()}<div class="actions"><a class="btn" href="/track?code=${encodeURIComponent(created.code)}">Track Ticket</a><a class="btn secondary" href="https://app.govoexpress.com/support">Submit Another</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'track'));
  } catch (e) { next(e); }
});

app.get('/admin/support', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    if (status !== 'all' && ['open', 'working', 'resolved', 'cancelled'].includes(status)) { params.push(status); where.push(`COALESCE(status,'open')=$${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(ticket_code,'') || ' ' || CAST(id AS TEXT) || ' ' || COALESCE(customer_name,'') || ' ' || COALESCE(customer_phone,'') || ' ' || COALESCE(customer_area,'') || ' ' || COALESCE(subject,'') || ' ' || COALESCE(message,'') || ' ' || COALESCE(related_type,'') || ' ' || COALESCE(related_code,'')) LIKE $${params.length}`); }
    const [tickets, counts] = await Promise.all([
      pool.query(`SELECT * FROM govo_support_tickets ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY CASE COALESCE(status,'open') WHEN 'open' THEN 1 WHEN 'working' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END, CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, id DESC LIMIT 250`, params),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'open')='open')::int open, COUNT(*) FILTER (WHERE COALESCE(status,'open')='working')::int working, COUNT(*) FILTER (WHERE COALESCE(status,'open')='resolved')::int resolved, COUNT(*) FILTER (WHERE COALESCE(status,'open')='cancelled')::int cancelled FROM govo_support_tickets`),
    ]);
    const ids = tickets.rows.map((x) => x.id);
    const eventMap = new Map();
    if (ids.length) {
      const events = await pool.query(`SELECT * FROM govo_support_events WHERE ticket_id = ANY($1::int[]) ORDER BY id DESC LIMIT 500`, [ids]);
      events.rows.forEach((e) => { if (!eventMap.has(e.ticket_id)) eventMap.set(e.ticket_id, []); eventMap.get(e.ticket_id).push(e); });
    }
    const statusOptions = (current) => ['open','working','resolved','cancelled'].map((v) => `<option value="${v}" ${cleanSupportStatus(current) === v ? 'selected' : ''}>${v}</option>`).join('');
    const priorityOptions = (current) => ['normal','high','urgent','low'].map((v) => `<option value="${v}" ${cleanSupportPriority(current) === v ? 'selected' : ''}>${v}</option>`).join('');
    const ticketCard = (x) => {
      const code = x.ticket_code || supportTicketCodeFromId(x.id, x.created_at);
      const events = eventMap.get(x.id) || [];
      const timeline = events.map((e) => `<div class="activity-row"><b>${esc(e.event_type || 'note')}</b><span>${esc(e.status || '')} ${esc(bdTime(e.created_at))}</span>${e.note ? `<small>${esc(e.note)}</small>` : ''}</div>`).join('') || '<p style="color:var(--muted)">No support events yet.</p>';
      return `<div class="card compact-card"><div class="section-head"><h2>${esc(code)}</h2><div class="actions">${badge(x.status)}${badge(x.priority)}</div></div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name || 'Customer')}<br>${esc(x.customer_phone || '')}<br>${esc(x.customer_area || '')}</span></div><div><b>Subject</b><span>${esc(x.subject || 'Support')}</span></div><div><b>Message</b><span>${esc(x.message || '')}</span></div><div><b>Related</b><span>${esc(x.related_type || 'general')}<br>${esc(x.related_code || 'No code')}</span></div><div><b>Assigned</b><span>${esc(x.assigned_to || 'Unassigned')}</span></div><div><b>Note</b><span>${esc(x.note || 'No note')}</span></div></div>${customerContactActions(x.customer_phone, x.customer_name)}<form method="POST" action="/admin/support/update-status"><input type="hidden" name="id" value="${esc(x.id)}"><div class="filters"><select name="status">${statusOptions(x.status)}</select><select name="priority">${priorityOptions(x.priority)}</select><input name="assigned_to" value="${esc(x.assigned_to || '')}" placeholder="Assigned to"><input name="note" value="${esc(x.note || '')}" placeholder="Internal note"></div><button>Update Ticket</button></form><form method="POST" action="/admin/support/add-event"><input type="hidden" name="ticket_id" value="${esc(x.id)}"><div class="filters"><select name="event_type"><option>note</option><option>call</option><option>whatsapp</option><option>followup</option></select><input name="note" placeholder="Add support note/event"></div><button class="secondary">Add Event</button></form><form method="POST" action="/admin/support/create-task"><input type="hidden" name="ticket_id" value="${esc(x.id)}"><button class="secondary">Create Follow-up Task</button></form><details><summary>Ticket event timeline</summary><div class="activity-list">${timeline}</div></details><div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(code)}">Public Tracking</a></div></div>`;
    };
    const groups = { open: [], working: [], resolved: [], cancelled: [] };
    tickets.rows.forEach((x) => groups[cleanSupportStatus(x.status)].push(x));
    const column = (key, title) => `<section class="card"><div class="section-head"><h2>${esc(title)}</h2><span class="pill">${groups[key].length}</span></div><div class="cards compact">${groups[key].map(ticketCard).join('') || '<div class="card compact-card"><h2>No support tickets yet.</h2></div>'}</div></section>`;
    const c = counts.rows[0] || {};
    const stat = (label, value) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div></div>`;
    res.send(page('Support Inbox', `<section class="card app-hero"><h1>Support Inbox</h1><p>Customer issues, order questions, service requests, complaints and follow-ups.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a><a class="btn secondary" href="/admin/tasks">Task Board</a></div></section><section class="grid">${stat('Total', c.total)}${stat('Open', c.open)}${stat('Working', c.working)}${stat('Resolved', c.resolved)}${stat('Cancelled', c.cancelled)}</section><section class="card"><h2>Filters</h2><form class="filters" method="GET" action="/admin/support"><input name="q" value="${esc(q)}" placeholder="Search ticket, customer, phone, related code, message"><select name="status"><option value="all">All</option><option value="open" ${status === 'open' ? 'selected' : ''}>Open</option><option value="working" ${status === 'working' ? 'selected' : ''}>Working</option><option value="resolved" ${status === 'resolved' ? 'selected' : ''}>Resolved</option><option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option></select><button>Search</button></form></section><section class="grid two">${column('open','Open')}${column('working','Working')}${column('resolved','Resolved')}${column('cancelled','Cancelled')}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/support/update-status', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = cleanSupportStatus(req.body.status);
    const priority = cleanSupportPriority(req.body.priority);
    const r = await pool.query(`UPDATE govo_support_tickets SET status=$1, priority=$2, assigned_to=$3, note=$4, updated_at=NOW() WHERE id=$5 RETURNING *`, [status, priority, String(req.body.assigned_to || '').trim(), String(req.body.note || '').trim(), String(req.body.id || '')]);
    if (r.rows.length) await recordSupportEvent(r.rows[0].id, 'status', status, String(req.body.note || '').trim(), 'admin', 'Admin');
    res.redirect('/admin/support');
  } catch (e) { next(e); }
});

app.post('/admin/support/add-event', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const ticketId = String(req.body.ticket_id || '').trim();
    const note = String(req.body.note || '').trim();
    if (ticketId && note) await recordSupportEvent(ticketId, String(req.body.event_type || 'note').trim() || 'note', '', note, 'admin', 'Admin');
    res.redirect('/admin/support');
  } catch (e) { next(e); }
});

app.post('/admin/support/create-task', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const r = await pool.query(`SELECT * FROM govo_support_tickets WHERE id=$1 LIMIT 1`, [String(req.body.ticket_id || '')]);
    const x = r.rows[0];
    if (x) {
      await pool.query(`INSERT INTO govo_launch_tasks (task_type, title, partner_type, partner_name, phone, area, priority, status, due_date, note, created_at, updated_at) VALUES ('support',$1,'general',$2,$3,$4,$5,'todo','',$6,NOW(),NOW())`, [`Support follow-up: ${x.ticket_code || supportTicketCodeFromId(x.id, x.created_at)}`, x.customer_name || '', x.customer_phone || '', x.customer_area || '', cleanSupportPriority(x.priority), `${x.subject || ''}\n${x.message || ''}`.trim()]);
      await recordSupportEvent(x.id, 'task', 'open', 'Created follow-up task', 'admin', 'Admin');
    }
    res.redirect('/admin/support');
  } catch (e) { next(e); }
});

function providerSearchText(x) {
  return [x.provider_name, x.phone, x.whatsapp, x.service_type, x.area, x.address, x.experience, x.description].join(' ').toLowerCase();
}

function serviceCategoryMatches(x, cat) {
  const text = providerSearchText(x);
  return cat.keywords.some((k) => text.includes(k.toLowerCase()));
}

function providerCard(x) {
  return compactProviderCard(x);
}

async function approvedProviders() {
  return pool.query(`SELECT * FROM govo_service_providers WHERE ${publicApprovedSql()} ORDER BY id DESC LIMIT 500`);
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
  res.send(page('GOVO Pilot', `<section class="card app-hero"><span class="pill">Pilot Launch</span><h1>GOVO Express Pilot — Meherpur Super App</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Customers can order from shops, request services, and track status. Merchants can list products, providers can receive jobs, and riders can handle delivery.</p><div class="actions"><a class="btn" href="https://app.govoexpress.com/app">Open App</a><a class="btn secondary" href="https://merchant.govoexpress.com/merchant">Join Merchant</a><a class="btn secondary" href="https://merchant.govoexpress.com/provider">Join Provider</a><a class="btn secondary" href="https://rider.govoexpress.com/rider">Join Rider</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track Order</a>${pilotContact()}</div></section><section class="grid"><div class="card"><h2>Customers</h2><p>Order food/products, request services, and track delivery/service status from one GOVO app.</p></div><div class="card"><h2>Merchants</h2><p>Create shop profile, add products, receive orders, and update order status.</p></div><div class="card"><h2>Providers</h2><p>Show service profile, trust badges, emergency availability, and receive requests.</p></div><div class="card"><h2>Riders</h2><p>Get assigned orders and update accept, picked up, delivered or failed status.</p></div></section>${shareCards()}`, 'app'));
});

app.get('/pilot/merchant', (req, res) => {
  res.send(page('Merchant Pilot', `<section class="card app-hero"><h1>GOVO Merchant Pilot</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">More customers, online product list, delivery support, and order tracking for local shops.</p><div class="actions"><a class="btn" href="https://merchant.govoexpress.com/merchant">Register Merchant</a><a class="btn secondary" href="/pilot">Pilot Home</a></div></section><section class="card"><h2>Benefits</h2>${steps([['More Customers','Customers can find your shop from GOVO.'],['Online Product List','Add products, prices, photos and availability.'],['Delivery Support','GOVO can dispatch riders for delivery orders.'],['Order Tracking','Customer, merchant, admin and rider can follow status.']])}</section><section class="card"><h2>Required Info</h2><p>Shop name, owner name, phone, area, category, product photos.</p></section><section class="card"><h2>How It Works</h2>${steps([['Register','Submit shop information.'],['Admin Approve','GOVO verifies and approves the shop.'],['Add Products','Upload product/menu details.'],['Receive Orders','Accept, prepare, ready or reject orders.']])}</section>${shareCards()}`, 'merchant'));
});

app.get('/pilot/provider', (req, res) => {
  res.send(page('Provider Pilot', `<section class="card app-hero"><h1>GOVO Provider Pilot</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Get more service requests with a GOVO profile, trust badge, and emergency availability.</p><div class="actions"><a class="btn" href="https://merchant.govoexpress.com/provider">Register Provider</a><a class="btn secondary" href="/pilot">Pilot Home</a></div></section><section class="card"><h2>Benefits</h2>${steps([['More Requests','Customers can request your service directly.'],['Profile Page','Show service type, area, experience and photo.'],['Trust Badge','Verified/trusted badges help customers choose.'],['Emergency Availability','Show urgent availability when enabled.']])}</section><section class="card"><h2>Required Info</h2><p>Name, phone, service type, area, experience, photo.</p></section><section class="card"><h2>How It Works</h2>${steps([['Register','Submit provider information.'],['Admin Approve','GOVO verifies and approves profile.'],['Receive Request','Customer submits problem details.'],['Complete Job','Accept, work, complete or reject requests.']])}</section>${shareCards()}`, 'provider'));
});

app.get('/pilot/rider', (req, res) => {
  res.send(page('Rider Pilot', `<section class="card app-hero"><h1>GOVO Rider Pilot</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Earn from delivery work with assigned orders and simple mobile status updates.</p><div class="actions"><a class="btn" href="https://rider.govoexpress.com/rider">Register Rider</a><a class="btn secondary" href="/pilot">Pilot Home</a></div></section><section class="card"><h2>Benefits</h2>${steps([['Delivery Earning','Receive delivery assignments from GOVO admin.'],['Assigned Orders','See pickup, delivery, customer and item details.'],['Simple Updates','Accept, picked up, delivered or failed buttons.']])}</section><section class="card"><h2>Required Info</h2><p>Name, phone, area, vehicle type.</p></section><section class="card"><h2>How It Works</h2>${steps([['Register','Submit rider details.'],['Admin Approve','GOVO approves rider profile.'],['Receive Assigned Orders','Admin dispatches orders to rider.'],['Deliver','Update delivery status from mobile dashboard.']])}</section>${shareCards()}`, 'rider'));
});

app.get('/app', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const [merchantResult, providerResult] = await Promise.all([approvedMerchants(), approvedProviders()]);
    const merchants = uniqueByIdentity(merchantResult.rows, 'merchant');
    const providers = uniqueByIdentity(providerResult.rows, 'provider');
    const matchedMerchants = q ? merchants.filter((x) => merchantSearchText(x).includes(q)).slice(0, 8) : merchants.filter((x) => boolish(x.is_verified) || boolish(x.is_trusted)).slice(0, 5);
    const matchedProviders = q ? providers.filter((x) => providerSearchText(x).includes(q)).slice(0, 8) : providers.filter((x) => boolish(x.is_trusted) || boolish(x.is_verified)).slice(0, 5);
    const emergencyProviders = providers.filter((x) => boolish(x.emergency_available) && boolish(x.is_available)).slice(0, 5);
    const cats = ['food','grocery','pharmacy','electronics','fashion','agriculture','technician','home-service','doctor','transport','house-rent'].map((slug) => categoryForSlug(slug)).filter(Boolean);
    const categoryGrid = cats.map((cat) => `<a class="card" style="text-decoration:none;padding:14px" href="/category/${encodeURIComponent(cat.slug)}"><div style="font-size:28px">${cat.icon}</div><h2 style="font-size:18px;margin:8px 0 4px">${esc(cat.title.replace(' / Restaurant','').replace(' / Mobile',''))}</h2><p style="color:var(--muted);margin:0;font-size:13px">${esc(cat.desc)}</p></a>`).join('');
    const shopFeature = matchedMerchants.length ? `<section class="card"><div class="section-head"><h2>${q ? 'Search Results: Shops' : 'Featured Shops'}</h2><a class="btn secondary" href="/shops${q ? `?q=${encodeURIComponent(q)}` : ''}">View All</a></div></section><section class="cards">${matchedMerchants.map(compactMerchantCard).join('')}</section>` : '';
    const providerFeature = matchedProviders.length ? `<section class="card"><div class="section-head"><h2>${q ? 'Search Results: Services' : 'Trusted Providers'}</h2><a class="btn secondary" href="/services${q ? `?q=${encodeURIComponent(q)}` : ''}">View All</a></div></section><section class="cards">${matchedProviders.map(compactProviderCard).join('')}</section>` : '';
    const emergencyFeature = emergencyProviders.length ? `<section class="card"><div class="section-head"><h2>Emergency Available Services</h2><a class="btn secondary" href="/services?q=emergency">View</a></div></section><section class="cards">${emergencyProviders.map(compactProviderCard).join('')}</section>` : '';
    res.send(page('GOVO Customer App', `
      <section class="card app-hero">
        <span class="pill">Meherpur Super App</span>
        <h1>GOVO Express — Meherpur Super App</h1>
        <p style="color:var(--muted);font-size:16px;line-height:1.55">Order food, find local shops, book services, request emergency help and track deliveries from one place.</p>
        <form method="GET" action="/app" style="margin-top:14px"><input name="q" value="${esc(q)}" placeholder="Search shops, services, products, location"><button>Search GOVO</button></form>
      </section>
      <section class="card"><h2>Quick Actions</h2><div class="quick-grid">
        <a class="btn" href="https://app.govoexpress.com/shops">Shops</a><a class="btn" href="https://app.govoexpress.com/services">Request Service</a><a class="btn secondary" href="/services?q=emergency">Emergency Service</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track</a><a class="btn secondary" href="https://app.govoexpress.com/order">Order</a><a class="btn secondary" href="https://app.govoexpress.com/support">Support</a><a class="btn secondary" href="https://merchant.govoexpress.com/merchant">Join Merchant</a><a class="btn secondary" href="https://merchant.govoexpress.com/provider">Join Provider</a><a class="btn secondary" href="/category/food">Food</a>
      </div></section>
      <section class="card"><div class="section-head"><h2>Explore GOVO</h2><span class="pill">Popular</span></div><div class="item-grid">${categoryGrid}</div></section>
      ${shopFeature || (q ? '<section class="card compact-card"><h2>No matching shop</h2><p style="color:var(--muted)">Try product, shop, category or location.</p></section>' : (merchants.length ? '' : pilotPartnerEmpty('merchant')))}
      ${providerFeature || (q ? '<section class="card compact-card"><h2>No matching service</h2><p style="color:var(--muted)">Try service, area, provider name or phone.</p></section>' : (providers.length ? '' : pilotPartnerEmpty('provider')))}
      ${emergencyFeature}
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
      return res.send(page('Provider Submitted', `<section class="card"><h1>Provider Submitted</h1><p>GOVO team review kore approve korbe.</p><div class="actions"><a class="btn" href="https://merchant.govoexpress.com/provider">Add Another</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a></div></section>`, 'services'));
    }
    res.send(page('Provider Registration', `<section class="card"><h1>Service Provider Registration</h1><p class="form-hint">Join GOVO Super App as an approved service provider.</p><form method="POST" action="/provider" enctype="multipart/form-data"><label>Provider Name</label><input name="provider_name" required><label>Phone</label><input name="phone" required><label>WhatsApp</label><input name="whatsapp"><label>Service Type</label><input name="service_type" placeholder="Electrician / Doctor / Transport" required><label>Area</label><input name="area" required><label>Address</label><textarea name="address"></textarea><label>Experience</label><input name="experience" placeholder="5 years / 100+ jobs"><label>Description</label><textarea name="description"></textarea><label>Profile / Service Image</label><input type="file" name="provider_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" placeholder="Optional existing image URL"><button>Submit Provider</button></form></section>`, 'services'));
  } catch (e) { next(e); }
});


app.post('/provider/profile/update', imageUpload.single('provider_image'), async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!provider.rows.length) return res.status(404).send(page('Provider Not Found', '<section class="card"><h1>Provider Not Found</h1></section>', 'services'));
    const p = provider.rows[0];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : keepValue(req.body.image_url, p.image_url);
    await pool.query(`UPDATE govo_service_providers SET provider_name=$1, whatsapp=$2, service_type=$3, area=$4, address=$5, experience=$6, description=$7, image_url=$8, is_available=$9, emergency_available=$10, working_hours=$11, updated_at=NOW() WHERE id=$12`, [keepValue(req.body.provider_name, p.provider_name), keepValue(req.body.whatsapp, p.whatsapp), keepValue(req.body.service_type, p.service_type), keepValue(req.body.area, p.area), keepValue(req.body.address, p.address), keepValue(req.body.experience, p.experience), keepValue(req.body.description, p.description), imageUrl, checkboxBool(req.body.is_available), checkboxBool(req.body.emergency_available), keepValue(req.body.working_hours, p.working_hours), p.id]);
    res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}`);
  } catch (e) { next(e); }
});

app.post('/rider/profile/update', imageUpload.single('rider_image'), async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const rider = await pool.query(`SELECT * FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!rider.rows.length) return res.status(404).send(page('Rider Not Found', '<section class="card"><h1>Rider Not Found</h1></section>', 'rider'));
    const r = rider.rows[0];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : keepValue(req.body.image_url, r.image_url);
    await pool.query(`UPDATE govo_rider_leads SET rider_name=$1, name=$1, whatsapp=$2, area=$3, location=$3, address=$4, vehicle_type=$5, nid=$6, image_url=$7, is_available=$8, updated_at=NOW() WHERE id=$9`, [keepValue(req.body.rider_name, r.rider_name || r.name), keepValue(req.body.whatsapp, r.whatsapp), keepValue(req.body.area, r.area || r.location), keepValue(req.body.address, r.address), keepValue(req.body.vehicle_type, r.vehicle_type), keepValue(req.body.nid, r.nid), imageUrl, checkboxBool(req.body.is_available), r.id]);
    res.redirect(`/rider/dashboard?phone=${encodeURIComponent(phone)}`);
  } catch (e) { next(e); }
});

app.all('/provider/dashboard', imageUpload.single('provider_image'), async (req, res, next) => {
  try {
    const phone = String((req.query && req.query.phone) || (req.body && req.body.phone) || '').trim();
    if (!phone) return res.send(page('Provider Dashboard', `<section class="card app-hero"><h1>Provider Dashboard</h1><p>Login with your provider phone to manage service requests.</p><form method="GET" action="/provider/dashboard"><label>Provider Phone</label><input name="phone" required placeholder="01XXXXXXXXX"><button>Open Dashboard</button></form><div class="actions"><a class="btn secondary" href="https://merchant.govoexpress.com/provider">Register Provider</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'services'));
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!provider.rows.length) return res.send(page('Provider Not Found', '<section class="card"><h1>Provider Not Found</h1><a class="btn" href="https://merchant.govoexpress.com/provider">Register Provider</a></section>', 'services'));
    const p = provider.rows[0];
    if (req.method === 'POST' && req.body.action === 'profile') {
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.image_url || p.image_url || '').trim();
      await pool.query(`UPDATE govo_service_providers SET provider_name=$1, whatsapp=$2, service_type=$3, area=$4, address=$5, experience=$6, description=$7, image_url=$8, updated_at=NOW() WHERE id=$9`, [req.body.provider_name || '', req.body.whatsapp || '', req.body.service_type || '', req.body.area || '', req.body.address || '', req.body.experience || '', req.body.description || '', imageUrl, p.id]);
      return res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}`);
    }
    if (req.method === 'POST' && req.body.action === 'request_status') {
      const allowed = ['in_progress', 'completed'];
      const status = allowed.includes(String(req.body.status || '').toLowerCase()) ? String(req.body.status).toLowerCase() : 'in_progress';
      const updated = await pool.query(`UPDATE govo_service_requests SET status=$1, provider_note=$2, updated_at=NOW() WHERE id=$3 AND (provider_id=$4 OR provider_phone=$5) RETURNING *`, [status, req.body.provider_note || '', req.body.request_id || '', p.id, p.phone || '']);
      if (updated.rows.length) {
        const x = updated.rows[0];
        await recordServiceEvent(x.id, 'provider_status', status, String(req.body.provider_note || ''), 'provider', p.provider_name || p.phone || 'Provider');
        await sendTelegram(['GOVO Provider Request Update', '', `Request: ${x.request_code || serviceRequestCodeFromId(x.id, x.created_at)}`, `Provider: ${p.provider_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Customer: ${x.customer_name || ''}`, `Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`].join('\n'));
      }
      return res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}#requests`);
    }
    const fresh = (await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1`, [p.id])).rows[0] || p;
    const requests = await pool.query(`SELECT *, COALESCE(customer_note,note,'') AS display_note FROM govo_service_requests WHERE provider_id=$1 OR provider_phone=$2 ORDER BY id DESC LIMIT 100`, [fresh.id, fresh.phone || '']);
    const requestActions = (x) => `<form method="POST" action="/provider/request/status"><input type="hidden" name="phone" value="${esc(phone)}"><input type="hidden" name="request_id" value="${esc(x.id)}"><input name="provider_note" value="${esc(x.provider_note || '')}" placeholder="Provider note"><div class="three"><button name="status" value="in_progress">In Progress</button><button name="status" value="completed">Complete</button></div></form>`;
    const requestCards = requests.rows.map((x) => `<div class="card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.customer_name || 'Customer')}</h2>${badge(x.status)}</div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name)}<br>${esc(x.customer_phone)}</span></div><div><b>Service Address</b><span>${esc(x.service_address)}</span></div><div><b>Problem Details</b><span>${esc(x.problem_details)}</span></div><div><b>Preferred Time</b><span>${esc(x.preferred_time || 'Any time')}</span></div><div><b>Notes</b><span>${esc(x.display_note || 'No note')}</span></div><div><b>Provider Note</b><span>${esc(x.provider_note || 'No provider note')}</span></div><div><b>Status</b><span>${esc(x.status || 'pending')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div>${requestActions(x)}<div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(x.request_code || serviceRequestCodeFromId(x.id, x.created_at))}">Track Request</a></div></div>`).join('');
    res.send(page('Provider Dashboard', `<section class="card app-hero"><h1>Provider Dashboard</h1>${listingImage(fresh.image_url, fresh.provider_name, true)}<div class="detail-grid"><div><b>Name</b><span>${esc(fresh.provider_name || '')}</span></div><div><b>Phone</b><span>${esc(fresh.whatsapp || fresh.phone || phone)}</span></div><div><b>Service Type</b><span>${esc(fresh.service_type || '')}</span></div><div><b>Area</b><span>${esc(fresh.area || '')}</span></div><div><b>Status</b><span>${badge(fresh.status)}</span></div><div><b>Trust</b><span>${trustBadges(fresh)}</span></div><div><b>Rating</b><span>${esc(ratingText(fresh))}</span></div><div><b>Requests</b><span>${esc(requests.rows.length)}</span></div></div><div class="actions"><a class="btn" href="#requests">My Requests</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section><section class="card"><h2>Provider Profile</h2><form method="POST" action="/provider/profile/update" enctype="multipart/form-data"><input type="hidden" name="phone" value="${esc(phone)}"><label>Provider Name</label><input name="provider_name" value="${esc(fresh.provider_name || '')}" required><label>WhatsApp</label><input name="whatsapp" value="${esc(fresh.whatsapp || '')}"><label>Service Type</label><input name="service_type" value="${esc(fresh.service_type || '')}" required><label>Area</label><input name="area" value="${esc(fresh.area || '')}" required><label>Address</label><textarea name="address">${esc(fresh.address || '')}</textarea><label>Experience</label><input name="experience" value="${esc(fresh.experience || '')}"><label>Description</label><textarea name="description">${esc(fresh.description || '')}</textarea><label>Working Hours</label><input name="working_hours" value="${esc(fresh.working_hours || '')}"><label><input type="checkbox" name="is_available" ${boolish(fresh.is_available) ? 'checked' : ''}> Available</label><label><input type="checkbox" name="emergency_available" ${boolish(fresh.emergency_available) ? 'checked' : ''}> Emergency Available</label><label>Profile / Service Image</label><input type="file" name="provider_image" accept="image/jpeg,image/png,image/webp,image/gif"><label>Existing Image URL</label><input name="image_url" value="${esc(fresh.image_url || '')}"><button>Save Profile</button></form><div class="actions"><a class="btn secondary" href="/service/${encodeURIComponent(fresh.id)}">Public Page</a><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a></div></section><section class="card" id="requests"><div class="section-head"><h2>Service Requests</h2><span class="pill">${esc(requests.rows.length)} requests</span></div><p style="color:var(--muted);font-weight:900">Next action: accept, start working, complete, or reject.</p></section><section class="cards">${requestCards || '<div class="card"><h2>No requests yet</h2><p style="color:var(--muted);font-weight:900">Customer service requests will appear here.</p></div>'}</section>`, 'services'));
  } catch (e) { next(e); }
});

app.post('/provider/request/status', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const provider = await pool.query(`SELECT * FROM govo_service_providers WHERE phone=$1 OR whatsapp=$1 ORDER BY id DESC LIMIT 1`, [phone]);
    if (!provider.rows.length) return res.status(404).send(page('Provider Not Found', '<section class="card"><h1>Provider Not Found</h1></section>', 'services'));
    const p = provider.rows[0];
    const allowed = ['in_progress', 'completed'];
    const status = allowed.includes(String(req.body.status || '').toLowerCase()) ? String(req.body.status).toLowerCase() : 'in_progress';
    const updated = await pool.query(`UPDATE govo_service_requests SET status=$1, provider_note=$2, updated_at=NOW() WHERE id=$3 AND (provider_id=$4 OR provider_phone=$5) RETURNING *`, [status, req.body.provider_note || '', req.body.request_id || '', p.id, p.phone || '']);
    if (updated.rows.length) {
      const x = updated.rows[0];
      await recordServiceEvent(x.id, 'provider_status', status, String(req.body.provider_note || ''), 'provider', p.provider_name || p.phone || 'Provider');
      await sendTelegram(['GOVO Provider Request Update', '', `Request: ${x.request_code || serviceRequestCodeFromId(x.id, x.created_at)}`, `Provider: ${p.provider_name || ''}`, `Status: ${String(x.status || '').toUpperCase()}`, `Customer: ${x.customer_name || ''}`, `Phone: ${x.customer_phone || ''}`, `Problem: ${x.problem_details || ''}`].join('\n'));
    }
    res.redirect(`/provider/dashboard?phone=${encodeURIComponent(phone)}#requests`);
  } catch (e) { next(e); }
});

app.get('/services', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const all = await approvedProviders();
    const uniqueRows = uniqueByIdentity(all.rows, 'provider');
    let rows = q ? uniqueRows.filter((x) => providerSearchText(x).includes(q) || (q === 'emergency' && boolish(x.emergency_available))) : uniqueRows.slice(0, 30);
    const chips = serviceCategories.map((cat) => chip(`${cat.icon} ${cat.title}`, `/services?q=${encodeURIComponent(cat.title)}`)).join('');
    const cards = rows.map(providerCard).join('');
    res.send(page('GOVO Services', `
      <section class="card app-hero"><span class="pill">GOVO Services</span><h1>Book trusted local service providers</h1><p style="color:var(--muted);font-size:16px;line-height:1.55">Find approved providers for repair, health, agriculture, transport, rent and home support.</p><form method="GET" action="/services"><input name="q" value="${esc(q)}" placeholder="Search service, area, name, phone"><button>Search Services</button></form><div class="toolbar"><a class="btn secondary" href="https://app.govoexpress.com/app">Home</a><a class="btn secondary" href="https://app.govoexpress.com/shops">Shops</a><a class="btn secondary" href="https://merchant.govoexpress.com/provider">Become Provider</a></div></section>
      <section class="card"><div class="section-head"><h2>Service Categories</h2><span class="pill">${serviceCategories.length}</span></div><div class="chips">${chips}</div></section>
      <section class="card"><div class="section-head"><h2>${q ? 'Service Search Results' : 'Featured Trusted Providers'}</h2><span class="pill">${rows.length} showing</span></div></section>
      <section class="cards">${cards || pilotPartnerEmpty('provider')}</section>
    `, 'services'));
  } catch (e) { next(e); }
});

function normalizeServiceRequestBody(body = {}) {
  return {
    provider_id: String(body.provider_id || '').trim(),
    service_type: String(body.service_type || '').trim(),
    customer_name: String(body.customer_name || '').trim(),
    customer_phone: String(body.customer_phone || '').trim(),
    customer_area: String(body.customer_area || body.area || '').trim(),
    customer_address: String(body.customer_address || body.service_address || '').trim(),
    service_address: String(body.service_address || body.customer_address || '').trim(),
    problem_details: String(body.problem_details || '').trim(),
    preferred_time: String(body.preferred_time || '').trim(),
    notes: String(body.notes || body.note || '').trim(),
  };
}

function serviceRequestForm(provider, data = {}, error = '') {
  const action = provider.id ? `/service/${encodeURIComponent(provider.id)}/request` : '/service-request';
  return `${error ? `<section class="card"><h1>Check request details</h1><p style="color:#fecaca;font-weight:900">${esc(error)}</p></section>` : ''}<section class="card" id="request_form"><h2>Request This Service</h2><p style="color:var(--muted)">Problem ta short kore likhun. GOVO team/provider review kore status update dibe.</p><form method="POST" action="${action}"><input type="hidden" name="provider_id" value="${esc(provider.id || data.provider_id || '')}"><input type="hidden" name="service_type" value="${esc(provider.service_type || data.service_type || '')}"><label>Your Name</label><input name="customer_name" value="${esc(data.customer_name || '')}" required><label>Your Phone</label><input name="customer_phone" value="${esc(data.customer_phone || '')}" required><label>Your Area</label><input name="customer_area" value="${esc(data.customer_area || '')}"><label>Service Address</label><textarea name="customer_address" required>${esc(data.customer_address || data.service_address || '')}</textarea><label>Problem Details</label><textarea name="problem_details" required placeholder="Example: fan not working / pipe leakage / doctor appointment needed">${esc(data.problem_details || '')}</textarea><label>Preferred Time <span style="color:var(--muted)">(optional)</span></label><input name="preferred_time" value="${esc(data.preferred_time || '')}" placeholder="Today 5 PM / Tomorrow morning"><label>Notes</label><textarea name="note" placeholder="Any extra instruction">${esc(data.notes || data.note || '')}</textarea><button>Submit Service Request</button></form><div class="actions"><a class="btn secondary" href="https://app.govoexpress.com/services">Back to Services</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track Request</a></div></section>`;
}

function serviceDetailPage(provider, data = {}, error = '') {
  return page(provider.provider_name || 'GOVO Service', `<section class="card app-hero"><a class="btn secondary" href="https://app.govoexpress.com/services">Back to Services</a><h1>${esc(provider.provider_name || '')}</h1>${listingImage(provider.image_url, provider.provider_name, true)}${trustBadges(provider)}<div class="detail-grid"><div><b>Service Type</b><span>${esc(provider.service_type)}</span></div><div><b>Area</b><span>${esc(provider.area)}</span></div><div><b>Address</b><span>${esc(provider.address)}</span></div><div><b>Phone / WhatsApp</b><span>${esc(provider.whatsapp || provider.phone || 'Available after request')}</span></div><div><b>Experience</b><span>${esc(provider.experience)}</span></div><div><b>Rating</b><span>${esc(ratingText(provider))}</span></div><div><b>Description</b><span>${esc(provider.description || 'Details coming soon')}</span></div></div><div class="actions"><a class="btn" href="#request_form">Request Now</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track Request</a></div></section>${serviceRequestForm(provider, data, error)}`, 'services');
}

app.get('/service/:id', async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 AND ${publicApprovedSql()} LIMIT 1`, [req.params.id]);
    const provider = r.rows[0];
    if (!provider) return res.status(404).send(page('Service Not Found', `<section class="card"><h1>Service Not Found</h1><p>This provider is not public right now.</p><a class="btn" href="https://app.govoexpress.com/services">Back Services</a></section>${pilotPartnerEmpty('provider')}`, 'services'));
    res.send(serviceDetailPage(provider));
  } catch (e) { next(e); }
});


async function handleServiceRequestSubmit(req, res, providerId = '') {
  const data = normalizeServiceRequestBody({ ...req.body, provider_id: providerId || req.body.provider_id });
  let provider = { rows: [] };
  if (data.provider_id) provider = await pool.query(`SELECT * FROM govo_service_providers WHERE id=$1 AND ${publicApprovedSql()} LIMIT 1`, [data.provider_id]);
  const p = provider.rows[0] || {};
  if (data.provider_id && !p.id) return res.status(404).send(page('Provider Not Found', `<section class="card"><h1>Provider Not Found</h1><a class="btn" href="https://app.govoexpress.com/services">Back Services</a></section>${pilotPartnerEmpty('provider')}`, 'services'));
  const missing = [];
  for (const [field, label] of [['customer_name', 'Your name'], ['customer_phone', 'Your phone'], ['customer_address', 'Service address'], ['problem_details', 'Problem details']]) {
    if (!data[field]) missing.push(label);
  }
  if (!data.service_type && !p.service_type) missing.push('Service type');
  if (missing.length && p.id) return res.status(400).send(serviceDetailPage(p, data, `Please fill: ${missing.join(', ')}`));
  if (missing.length) return res.status(400).send(generalServiceRequestPage(data, `Please fill: ${missing.join(', ')}`));
  const created = await createServiceRequest({ ...data, service_type: data.service_type || p.service_type || '', provider_id: p.id || '', provider_name: p.provider_name || '', provider_phone: p.phone || '', status: 'new', priority: 'normal' }, 'customer');
  sendTelegram(['New GOVO Service Request', '', `Request: ${created.code}`, `Provider: ${p.provider_name || 'Unassigned'}`, `Provider Phone: ${p.phone || 'N/A'}`, `Service: ${data.service_type || p.service_type || ''}`, `Customer: ${data.customer_name || ''}`, `Customer Phone: ${data.customer_phone || ''}`, `Address: ${data.customer_address || ''}`, `Problem: ${data.problem_details || ''}`, `Preferred: ${data.preferred_time || ''}`, `Note: ${data.notes || data.note || 'N/A'}`].join('\n')).catch(() => {});
  res.send(page('Service Request Submitted', `<section class="card app-hero"><span class="pill">Request Received</span><h1>Service Request Submitted</h1><p>GOVO team and provider will review your request.</p><h2>Request Code: ${esc(created.code)}</h2><div class="timeline"><div class="step done">Submitted</div><div class="step">Admin Review</div><div class="step">In Progress</div><div class="step">Completed</div></div><div class="actions"><a class="btn" href="/track?code=${encodeURIComponent(created.code)}">Track Request</a><a class="btn secondary" href="https://app.govoexpress.com/services">Back to Services</a><a class="btn secondary" href="https://app.govoexpress.com/app">Back to App</a></div></section>`, 'services'));
}

app.post('/service/:id/request', async (req, res, next) => {
  try { await handleServiceRequestSubmit(req, res, String(req.params.id || '')); } catch (e) { next(e); }
});

app.post('/service/request', async (req, res, next) => {
  try { await handleServiceRequestSubmit(req, res, String(req.body.provider_id || '')); } catch (e) { next(e); }
});

function generalServiceRequestPage(data = {}, error = '') {
  return page('Service Request', `${error ? `<section class="card"><h1>Check request details</h1><p style="color:#fecaca;font-weight:900">${esc(error)}</p></section>` : ''}<section class="card app-hero"><h1>Request GOVO Service</h1><p style="color:var(--muted)">Tell GOVO what service you need. Admin will match the request with a provider.</p><form method="POST" action="/service-request"><label>Your Name</label><input name="customer_name" value="${esc(data.customer_name || '')}" required><label>Your Phone</label><input name="customer_phone" value="${esc(data.customer_phone || '')}" required><label>Your Area</label><input name="customer_area" value="${esc(data.customer_area || '')}"><label>Service Address</label><textarea name="customer_address" required>${esc(data.customer_address || data.service_address || '')}</textarea><label>Service Type</label><input name="service_type" value="${esc(data.service_type || '')}" required><label>Preferred Time</label><input name="preferred_time" value="${esc(data.preferred_time || '')}"><label>Problem Details</label><textarea name="problem_details" required>${esc(data.problem_details || '')}</textarea><label>Note</label><textarea name="note">${esc(data.note || data.notes || '')}</textarea><button>Submit Service Request</button></form><div class="actions"><a class="btn secondary" href="https://app.govoexpress.com/services">Services</a><a class="btn secondary" href="https://app.govoexpress.com/track">Track</a></div></section>`, 'services');
}

app.get('/service-request', (req, res) => res.send(generalServiceRequestPage(normalizeServiceRequestBody(req.query || {}))));
app.post('/service-request', async (req, res, next) => {
  try { await handleServiceRequestSubmit(req, res, ''); } catch (e) { next(e); }
});

app.get('/service/request/success', (req, res) => {
  const code = String(req.query.code || req.query.id || '');
  res.send(page('Service Request Submitted', `<section class="card app-hero"><span class="pill">Request Received</span><h1>Service Request Submitted</h1><p>GOVO team and provider will review your request.</p><h2>Request Code: ${esc(code)}</h2><div class="actions"><a class="btn" href="/track?code=${encodeURIComponent(code)}">Track Request</a><a class="btn secondary" href="https://app.govoexpress.com/services">Back to Services</a></div></section>`, 'services'));
});


function crmWhatsAppLink(phone, name = '') {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  let n = raw.replace(/\D/g, '');
  if (n.startsWith('0')) n = `88${n}`;
  if (!n.startsWith('880') && n.length === 10) n = `880${n}`;
  const msg = `Assalamu alaikum${name ? ' ' + name : ''}, GOVO Express pilot er bepare apnar sathe kotha bolte chai.`;
  return `https://wa.me/${n}?text=${encodeURIComponent(msg)}`;
}

function crmStatus(value) {
  const v = String(value || '').trim().toLowerCase();
  return ['new', 'contacted', 'interested', 'onboarded', 'follow_up', 'not_interested'].includes(v) ? v : 'new';
}

function crmPriority(value) {
  const v = String(value || '').trim().toLowerCase();
  return ['low', 'normal', 'high'].includes(v) ? v : 'normal';
}

function crmType(value) {
  const v = String(value || '').trim().toLowerCase();
  return ['merchant', 'provider', 'rider', 'customer', 'partner'].includes(v) ? v : 'merchant';
}

app.get('/admin/pilot-crm', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const type = ['all', 'merchant', 'provider', 'rider', 'customer', 'partner'].includes(String(req.query.type || 'all')) ? String(req.query.type || 'all') : 'all';
    const status = ['all', 'new', 'contacted', 'interested', 'onboarded', 'follow_up', 'not_interested'].includes(String(req.query.status || 'all')) ? String(req.query.status || 'all') : 'all';
    const priority = ['all', 'low', 'normal', 'high'].includes(String(req.query.priority || 'all')) ? String(req.query.priority || 'all') : 'all';
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    if (type !== 'all') { params.push(type); where.push(`lead_type=$${params.length}`); }
    if (status !== 'all') { params.push(status); where.push(`status=$${params.length}`); }
    if (priority !== 'all') { params.push(priority); where.push(`priority=$${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(whatsapp,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(category,'') || ' ' || COALESCE(note,'')) LIKE $${params.length}`); }
    const [counts, leads] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status='new')::int new, COUNT(*) FILTER (WHERE status='interested')::int interested, COUNT(*) FILTER (WHERE status='follow_up')::int follow_up, COUNT(*) FILTER (WHERE status='onboarded')::int onboarded, COUNT(*) FILTER (WHERE priority='high')::int high FROM govo_pilot_crm`),
      pool.query(`SELECT * FROM govo_pilot_crm ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY COALESCE(next_followup_at, created_at) ASC NULLS LAST, id DESC LIMIT 200`, params),
    ]);
    const c = counts.rows[0] || {};
    const stat = (label, value) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div></div>`;
    const opt = (current, value, label) => `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(label)}</option>`;
    const leadCards = leads.rows.map((x) => {
      const wa = crmWhatsAppLink(x.whatsapp || x.phone, x.name);
      return `<div class="card compact-card"><div class="section-head"><h2>#${esc(x.id)} ${esc(x.name || 'Unnamed lead')}</h2><div class="actions">${badge(x.lead_type)}${badge(x.status)}${badge(x.priority)}</div></div><div class="compact-meta"><span>${esc(x.phone || 'No phone')}</span><span>${esc(x.area || 'No area')}</span><span>${esc(x.category || 'No category')}</span>${x.next_followup_at ? `<span>Follow-up: ${esc(bdTime(x.next_followup_at))}</span>` : ''}</div><p style="color:var(--muted)">${esc(x.note || 'No note')}</p><div class="actions">${wa ? `<a class="btn secondary wa" href="${esc(wa)}">WhatsApp</a>` : ''}${x.phone ? `<a class="btn secondary" href="tel:${esc(x.phone)}">Call</a>` : ''}</div><form method="POST" action="/admin/pilot-crm/update"><input type="hidden" name="id" value="${esc(x.id)}"><div class="filters"><select name="status">${['new','contacted','interested','onboarded','follow_up','not_interested'].map(v => opt(x.status, v, v)).join('')}</select><select name="priority">${['low','normal','high'].map(v => opt(x.priority, v, v)).join('')}</select><input name="next_followup_at" type="datetime-local" value=""><input name="whatsapp" value="${esc(x.whatsapp || '')}" placeholder="WhatsApp"><input name="area" value="${esc(x.area || '')}" placeholder="Area"><input name="category" value="${esc(x.category || '')}" placeholder="Category"></div><textarea name="note" placeholder="Follow-up note">${esc(x.note || '')}</textarea><button>Update Lead</button></form></div>`;
    }).join('');
    res.send(page('Pilot CRM', `<section class="card app-hero"><h1>GOVO Pilot CRM</h1><p>Manage merchant, provider, rider, customer and partner follow-up during pilot testing.</p><div class="actions"><form method="POST" action="/admin/pilot-crm/quick-import"><button class="secondary">Quick Import Existing Leads</button></form><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/pilot">Pilot</a><a class="btn secondary" href="/admin/qa">QA</a></div></section><section class="grid">${stat('Total Leads', c.total)}${stat('New', c.new)}${stat('Interested', c.interested)}${stat('Follow Up', c.follow_up)}${stat('Onboarded', c.onboarded)}${stat('High Priority', c.high)}</section><section class="card"><h2>Add Lead</h2><form method="POST" action="/admin/pilot-crm"><div class="filters"><select name="lead_type">${['merchant','provider','rider','customer','partner'].map(v => `<option value="${v}">${v}</option>`).join('')}</select><input name="name" placeholder="Name"><input name="phone" placeholder="Phone"><input name="whatsapp" placeholder="WhatsApp"><input name="area" placeholder="Area"><input name="category" placeholder="Category"><input name="source" placeholder="Source"><select name="priority"><option>normal</option><option>high</option><option>low</option></select><input type="datetime-local" name="next_followup_at"></div><textarea name="note" placeholder="Note"></textarea><button>Add CRM Lead</button></form></section><section class="card"><h2>Filters</h2><form class="filters" method="GET" action="/admin/pilot-crm"><select name="type">${['all','merchant','provider','rider','customer','partner'].map(v => opt(type, v, v)).join('')}</select><select name="status">${['all','new','contacted','interested','onboarded','follow_up','not_interested'].map(v => opt(status, v, v)).join('')}</select><select name="priority">${['all','low','normal','high'].map(v => opt(priority, v, v)).join('')}</select><input name="q" value="${esc(q)}" placeholder="Search name, phone, area, category, note"><button>Filter</button></form></section><section class="cards">${leadCards || '<div class="card compact-card"><h2>No CRM leads found</h2><p style="color:var(--muted)">Add a lead or import existing pilot leads.</p></div>'}</section>`, 'admin'));
  } catch (e) { next(e); }
});

app.post('/admin/pilot-crm', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const data = [crmType(req.body.lead_type), req.body.name || '', req.body.phone || '', req.body.whatsapp || '', req.body.area || '', req.body.category || '', req.body.source || '', 'new', crmPriority(req.body.priority), req.body.note || '', req.body.next_followup_at || null];
    const r = await pool.query(`INSERT INTO govo_pilot_crm (lead_type,name,phone,whatsapp,area,category,source,status,priority,note,next_followup_at,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULLIF($11,'')::timestamptz,NOW(),NOW()) RETURNING *`, data);
    const x = r.rows[0];
    if (x.priority === 'high') sendTelegram(['GOVO High Priority CRM Lead', '', `Type: ${x.lead_type}`, `Name: ${x.name || ''}`, `Phone: ${x.phone || ''}`, `Area: ${x.area || ''}`, `Category: ${x.category || ''}`, `Note: ${x.note || ''}`].join('\n')).catch(() => {});
    res.redirect('/admin/pilot-crm');
  } catch (e) { next(e); }
});

app.post('/admin/pilot-crm/update', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    await pool.query(`UPDATE govo_pilot_crm SET status=$1, priority=$2, note=$3, next_followup_at=NULLIF($4,'')::timestamptz, whatsapp=$5, area=$6, category=$7, updated_at=NOW() WHERE id=$8`, [crmStatus(req.body.status), crmPriority(req.body.priority), req.body.note || '', req.body.next_followup_at || '', req.body.whatsapp || '', req.body.area || '', req.body.category || '', req.body.id || '']);
    res.redirect('/admin/pilot-crm');
  } catch (e) { next(e); }
});

app.post('/admin/pilot-crm/quick-import', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const importRows = async (leadType, rows) => {
      for (const x of rows) {
        const phone = String(x.phone || '').trim();
        if (!phone) continue;
        const existing = await pool.query(`SELECT id FROM govo_pilot_crm WHERE lead_type=$1 AND phone=$2 LIMIT 1`, [leadType, phone]);
        if (existing.rows.length) continue;
        await pool.query(`INSERT INTO govo_pilot_crm (lead_type,name,phone,whatsapp,area,category,source,status,priority,note,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'quick_import','new','normal',$7,NOW(),NOW())`, [leadType, x.name || '', phone, x.whatsapp || '', x.area || '', x.category || '', x.note || 'Imported from existing GOVO lead']);
      }
    };
    const [m, pvd, r] = await Promise.all([
      pool.query(`SELECT shop_name AS name, phone, whatsapp, COALESCE(shop_address,location) AS area, category, status AS note FROM govo_merchant_leads ORDER BY id DESC LIMIT 500`),
      pool.query(`SELECT provider_name AS name, phone, whatsapp, area, service_type AS category, status AS note FROM govo_service_providers ORDER BY id DESC LIMIT 500`),
      pool.query(`SELECT COALESCE(rider_name,name) AS name, phone, '' AS whatsapp, location AS area, vehicle_type AS category, status AS note FROM govo_rider_leads ORDER BY id DESC LIMIT 500`),
    ]);
    await importRows('merchant', m.rows);
    await importRows('provider', pvd.rows);
    await importRows('rider', r.rows);
    res.redirect('/admin/pilot-crm');
  } catch (e) { next(e); }
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
    const filterAll = String(req.query.filter || '').trim().toLowerCase() === 'all';
    const statusDefault = filterAll ? 'all' : 'pending';
    const visibilityDefault = 'all';
    const status = ['pending', 'approved', 'rejected', 'all'].includes(String(req.query.status || statusDefault).trim().toLowerCase()) ? String(req.query.status || statusDefault).trim().toLowerCase() : statusDefault;
    const visibility = ['visible', 'hidden', 'demo', 'all'].includes(String(req.query.visibility || visibilityDefault).trim().toLowerCase()) ? String(req.query.visibility || visibilityDefault).trim().toLowerCase() : visibilityDefault;
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    if (status !== 'all') { where.push(approvalStatusWhere()[status]); }
    if (visibility !== 'all') { where.push(visibilityWhere()[visibility]); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(provider_name,'') || ' ' || COALESCE(phone,'') || ' ' || COALESCE(whatsapp,'') || ' ' || COALESCE(service_type,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`); }
    const providers = await pool.query(`SELECT *, CASE WHEN status IS NULL OR TRIM(status)='' THEN 'pending' ELSE LOWER(TRIM(status)) END AS status FROM govo_service_providers ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC LIMIT 150`, params);
    const cards = providers.rows.map((x) => `<div class="card">${listingImage(x.image_url, x.provider_name)}<div class="actions" style="justify-content:space-between"><h2>#${esc(x.id)} ${esc(x.provider_name || '')}</h2>${badge(x.status)}</div>${visibilityBadges(x)}${trustBadges(x)}<div class="detail-grid"><div><b>Phone</b><span>${esc(x.phone)}</span></div><div><b>WhatsApp</b><span>${esc(x.whatsapp)}</span></div><div><b>Service</b><span>${esc(x.service_type)}</span></div><div><b>Area</b><span>${esc(x.area)}</span></div><div><b>Address</b><span>${esc(x.address)}</span></div><div><b>Admin Note</b><span>${esc(x.admin_note || 'No note')}</span></div></div><form method="POST" action="/admin/provider/status"><input type="hidden" name="id" value="${esc(x.id)}"><input name="admin_note" placeholder="Admin note"><div class="three"><button name="status" value="approved">Approve</button><button class="reject" name="status" value="rejected">Reject</button><button class="secondary" name="status" value="pending">Pending</button></div></form>${adminProviderEditForm(x)}${adminTrustControls('provider', x, pin)}${adminVisibilityControls('provider', x)}<div class="actions"><a class="btn secondary" href="/admin/provider/${encodeURIComponent(x.id)}">View Details</a><a class="btn secondary" href="/provider/dashboard?phone=${encodeURIComponent(x.phone || '')}">Dashboard</a><a class="btn secondary" href="/service/${encodeURIComponent(x.id)}">Service Page</a></div></div>`).join('');
    res.send(page('Admin Providers', `<section class="card"><h1>Admin Providers</h1>${approvalFilterLinks('/admin/providers', status)}${visibilityFilterLinks('/admin/providers', status, visibility)}<form class="filters" method="GET" action="/admin/providers"><input name="q" value="${esc(q)}" placeholder="Search provider, phone, service, area"><select name="status"><option value="all">All</option><option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option><option value="approved" ${status === 'approved' ? 'selected' : ''}>Approved</option><option value="rejected" ${status === 'rejected' ? 'selected' : ''}>Rejected</option></select><select name="visibility"><option value="all" ${visibility === 'all' ? 'selected' : ''}>All Visibility</option><option value="visible" ${visibility === 'visible' ? 'selected' : ''}>Visible</option><option value="hidden" ${visibility === 'hidden' ? 'selected' : ''}>Hidden</option><option value="demo" ${visibility === 'demo' ? 'selected' : ''}>Demo/Test</option></select><button>Search</button></form><div class="toolbar"><a class="btn secondary" href="/admin/os">Admin Home</a><a class="btn secondary" href="/admin/service-requests">Service Requests</a></div></section><section class="cards">${cards || '<div class="card"><h2>No provider found</h2></div>'}</section>`, 'admin'));
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


function serviceBoardGroup(status) {
  const s = cleanServiceStatus(status, 'new');
  return s;
}

app.get('/admin/service-requests', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const params = [];
    const where = [];
    const allowedFilters = ['new', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
    if (status !== 'all' && allowedFilters.includes(status)) { params.push(status); where.push(`COALESCE(sr.status,'new')=$${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(sr.request_code,'') || ' ' || CAST(sr.id AS TEXT) || ' ' || COALESCE(sr.provider_name,'') || ' ' || COALESCE(sr.provider_phone,'') || ' ' || COALESCE(sr.service_type,'') || ' ' || COALESCE(sr.customer_name,'') || ' ' || COALESCE(sr.customer_phone,'') || ' ' || COALESCE(sr.customer_address,'') || ' ' || COALESCE(sr.service_address,'') || ' ' || COALESCE(sr.problem_details,'') || ' ' || COALESCE(sp.area,'')) LIKE $${params.length}`); }
    const [requests, providers, counts] = await Promise.all([
      pool.query(`SELECT sr.*, COALESCE(sr.customer_note,sr.note,'') AS display_note, COALESCE(sr.customer_address,sr.service_address) AS display_address, sp.area AS provider_area FROM govo_service_requests sr LEFT JOIN govo_service_providers sp ON sp.id=sr.provider_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY CASE COALESCE(sr.status,'new') WHEN 'new' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'assigned' THEN 3 WHEN 'in_progress' THEN 4 WHEN 'completed' THEN 5 ELSE 6 END, sr.id DESC LIMIT 250`, params),
      pool.query(`SELECT id, provider_name, phone, whatsapp, service_type, area FROM govo_service_providers WHERE COALESCE(status,'pending')='approved' ORDER BY id DESC LIMIT 150`),
      pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'new')='new')::int new, COUNT(*) FILTER (WHERE COALESCE(status,'new')='confirmed')::int confirmed, COUNT(*) FILTER (WHERE COALESCE(status,'new')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'new')='in_progress')::int in_progress, COUNT(*) FILTER (WHERE COALESCE(status,'new')='completed')::int completed, COUNT(*) FILTER (WHERE COALESCE(status,'new')='cancelled')::int cancelled FROM govo_service_requests`),
    ]);
    const providerOptions = (selectedId) => providers.rows.map((p) => `<option value="${esc(p.id)}" ${String(selectedId || '') === String(p.id) ? 'selected' : ''}>${esc(p.provider_name || 'Provider')} - ${esc(p.phone || '')}${p.service_type ? ` (${esc(p.service_type)})` : ''}</option>`).join('');
    const statusOptions = (current) => ['new','confirmed','assigned','in_progress','completed','cancelled'].map((v) => `<option value="${v}" ${cleanServiceStatus(current, 'new') === v ? 'selected' : ''}>${v.replace(/_/g, ' ')}</option>`).join('');
    const updateForm = (x) => `<form method="POST" action="/admin/service-requests/update-status"><input type="hidden" name="id" value="${esc(x.id)}"><div class="filters"><select name="status">${statusOptions(x.status)}</select><input name="admin_note" value="${esc(x.admin_note || '')}" placeholder="Admin note"></div><button>Update Status</button></form>`;
    const assignForm = (x) => `<form method="POST" action="/admin/service-requests/assign-provider"><input type="hidden" name="request_id" value="${esc(x.id)}"><label>Assign approved provider</label><select name="provider_id" required><option value="">Select Provider</option>${providerOptions(x.provider_id)}</select><button>Assign Provider</button></form>`;
    const eventForm = (x) => `<form method="POST" action="/admin/service-requests/add-event"><input type="hidden" name="request_id" value="${esc(x.id)}"><div class="filters"><select name="event_type"><option>note</option><option>call</option><option>whatsapp</option><option>dispatch</option></select><input name="note" placeholder="Add service note/event"></div><button class="secondary">Add Event</button></form>`;
    const requestCard = (x) => {
      const code = x.request_code || serviceRequestCodeFromId(x.id, x.created_at);
      return `<div class="card compact-card"><div class="section-head"><h2>${esc(code)}</h2><div class="actions">${badge(cleanServiceStatus(x.status, 'new'))}${badge(x.priority || 'normal')}</div></div><div class="detail-grid"><div><b>Customer</b><span>${esc(x.customer_name || 'Customer')}<br>${esc(x.customer_phone || '')}<br>${esc(x.customer_area || '')}</span></div><div><b>Address</b><span>${esc(x.display_address || 'No address')}</span></div><div><b>Service</b><span>${esc(x.service_type || 'Service')}</span></div><div><b>Provider</b><span>${esc(x.provider_name || 'Unassigned')}<br>${esc(x.provider_phone || '')}</span></div><div><b>Preferred</b><span>${esc(x.preferred_time || 'Any time')}</span></div><div><b>Problem</b><span>${esc(x.problem_details || '')}</span></div><div><b>Note</b><span>${esc(x.display_note || 'No note')}</span></div><div><b>Created</b><span>${esc(bdTime(x.created_at))}</span></div></div>${customerContactActions(x.customer_phone, x.customer_name)}${customerContactActions(x.provider_phone, x.provider_name)}${updateForm(x)}${assignForm(x)}${eventForm(x)}<div class="actions"><a class="btn secondary" href="/track?code=${encodeURIComponent(code)}">Tracking</a></div></div>`;
    };
    const groups = { new: [], confirmed: [], assigned: [], in_progress: [], completed: [], cancelled: [] };
    requests.rows.forEach((x) => groups[serviceBoardGroup(x.status)].push(x));
    const column = (key, title) => `<section class="card"><div class="section-head"><h2>${esc(title)}</h2><span class="pill">${groups[key].length}</span></div><div class="cards compact">${groups[key].map(requestCard).join('') || '<div class="card compact-card"><h2>No requests</h2></div>'}</div></section>`;
    const c = counts.rows[0] || {};
    const stat = (label, value) => `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value || 0)}</div></div>`;
    const opt = (v, label) => `<option value="${v}" ${status === v ? 'selected' : ''}>${label}</option>`;
    res.send(page('Service Requests', `<section class="card app-hero"><h1>Service Requests</h1><p>Review bookings, assign providers, and monitor service progress.</p><div class="actions"><a class="btn secondary" href="/admin/os">Admin OS</a><a class="btn secondary" href="/admin/command">Daily Command Center</a><a class="btn secondary" href="/admin/orders">Order Dispatch</a><a class="btn secondary" href="/admin/support">Support Inbox</a><a class="btn secondary" href="/admin/providers">Providers</a></div></section><section class="grid">${stat('Total', c.total)}${stat('New', c.new)}${stat('Confirmed', c.confirmed)}${stat('Assigned', c.assigned)}${stat('In Progress', c.in_progress)}${stat('Completed', c.completed)}${stat('Cancelled', c.cancelled)}</section><section class="card"><h2>Filters</h2><form class="filters" method="GET" action="/admin/service-requests"><input name="q" value="${esc(q)}" placeholder="Search code, customer, provider, service, problem, area"><select name="status"><option value="all">All</option>${opt('new','New')}${opt('confirmed','Confirmed')}${opt('assigned','Assigned')}${opt('in_progress','In Progress')}${opt('completed','Completed')}${opt('cancelled','Cancelled')}</select><button>Search</button></form></section><section class="grid two">${column('new','New')}${column('confirmed','Confirmed')}${column('assigned','Assigned')}${column('in_progress','In Progress')}${column('completed','Completed')}${column('cancelled','Cancelled')}</section>`, 'admin'));
  } catch (e) { next(e); }
});

async function assignServiceProvider(requestId, providerId) {
  const provider = await pool.query(`SELECT id, provider_name, phone, whatsapp, service_type FROM govo_service_providers WHERE id=$1 AND COALESCE(status,'pending')='approved' LIMIT 1`, [providerId]);
  if (!provider.rows.length) return null;
  const p = provider.rows[0];
  const r = await pool.query(`UPDATE govo_service_requests SET provider_id=$1, provider_name=$2, provider_phone=$3, service_type=COALESCE(NULLIF(service_type,''),$4), status='assigned', updated_at=NOW() WHERE id=$5 RETURNING *`, [p.id, p.provider_name || '', p.phone || p.whatsapp || '', p.service_type || '', requestId]);
  if (r.rows.length) await recordServiceEvent(requestId, 'assigned', 'assigned', `Assigned provider ${p.provider_name || p.phone || ''}`, 'admin', 'Admin');
  return r.rows[0] || null;
}

app.post('/admin/service-requests/assign-provider', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const r = await assignServiceProvider(String(req.body.request_id || ''), String(req.body.provider_id || ''));
    if (r) sendTelegram(['GOVO Provider Assigned', '', `Request: ${r.request_code || serviceRequestCodeFromId(r.id, r.created_at)}`, `Provider: ${r.provider_name || ''}`, `Customer: ${r.customer_name || ''}`, `Problem: ${r.problem_details || ''}`].join('\n')).catch(() => {});
    res.redirect('/admin/service-requests');
  } catch (e) { next(e); }
});

app.post(['/admin/service-requests/update-status', '/admin/service-request/status'], async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const status = cleanServiceStatus(req.body.status, 'new');
    const r = await pool.query(`UPDATE govo_service_requests SET status=$1, admin_note=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [status, String(req.body.admin_note || ''), String(req.body.id || '')]);
    if (r.rows.length) {
      const x = r.rows[0];
      await recordServiceEvent(x.id, 'status', status, String(req.body.admin_note || ''), 'admin', 'Admin');
      sendTelegram(['GOVO Service Request Status Updated', '', `Request: ${x.request_code || serviceRequestCodeFromId(x.id, x.created_at)}`, `Status: ${String(x.status || '').toUpperCase()}`, `Provider: ${x.provider_name || ''}`, `Customer: ${x.customer_name || ''}`].join('\n')).catch(() => {});
    }
    res.redirect('/admin/service-requests');
  } catch (e) { next(e); }
});

app.post('/admin/service-requests/add-event', async (req, res, next) => {
  try {
    if (!requireAdmin(req, res)) return;
    const requestId = String(req.body.request_id || '').trim();
    const note = String(req.body.note || '').trim();
    if (requestId && note) await recordServiceEvent(requestId, String(req.body.event_type || 'note').trim() || 'note', '', note, 'admin', 'Admin');
    res.redirect('/admin/service-requests');
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
