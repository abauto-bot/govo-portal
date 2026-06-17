
// --- GOVO ENV LOADER ---
try {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
  }
} catch(e) {
  console.log("ENV load skipped:", e.message);
}
// --- /GOVO ENV LOADER ---


// --- GOVO_ENV_LOADER ---
try {
  const __fs = require("fs");
  const __path = require("path");
  const __envPath = __path.join(__dirname, ".env");
  if (__fs.existsSync(__envPath)) {
    __fs.readFileSync(__envPath, "utf8").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    });
  }
} catch(e) {
  console.log("ENV loader skipped:", e.message);
}
// --- /GOVO_ENV_LOADER ---

const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || "govo1234";
const N8N_WEBHOOK = process.env.N8N_WEBHOOK || "http://127.0.0.1:3000/health";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const pool = new Pool({
  host: process.env.PGHOST || "abu_postgres",
  port: 5432,
  database: process.env.PGDATABASE || "n8n",
  user: process.env.PGUSER || "n8n",
  password: process.env.PGPASSWORD || "AbuStrongPass123"
});

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

function page(title, body) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Arial}
.wrap{max-width:950px;margin:auto;padding:20px}
.card{background:#111827;border:1px solid #263244;border-radius:16px;padding:18px;margin:14px 0}
h1{color:#22c55e;margin-top:0} h2{color:#93c5fd}
a{color:#93c5fd;margin-right:10px;text-decoration:none}
input,select,textarea{width:100%;padding:12px;margin:7px 0 14px;border-radius:10px;border:1px solid #334155;background:#020617;color:white;box-sizing:border-box}
button,.btn{background:#22c55e;color:#052e16;padding:12px 15px;border:0;border-radius:10px;font-weight:bold;text-decoration:none;display:inline-block}
table{width:100%;border-collapse:collapse} th,td{border-bottom:1px solid #334155;padding:9px;text-align:left;font-size:14px}
.ok{border-color:#16a34a;background:#052e16}
</style></head><body><div class="wrap">
<div class="card">
<a href="/merchant">Merchant</a>
<a href="/rider">Rider</a>
<a href="/admin/leads?pin=${ADMIN_PIN}">Admin Leads</a>
<a href="/admin/riders?pin=${ADMIN_PIN}">Admin Riders</a>
<a href="/dashboard/merchant">Merchant Dashboard</a>
<a href="/dashboard/rider">Rider Dashboard</a>
</div>
${body}
</div></body></html>`;
}

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS govo_merchant_leads (
    id SERIAL PRIMARY KEY,
    shop_name TEXT, owner_name TEXT, phone TEXT, location TEXT,
    category TEXT, delivery_needed TEXT, ai_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS govo_rider_leads (
    id SERIAL PRIMARY KEY,
    rider_name TEXT, phone TEXT, location TEXT, vehicle_type TEXT,
    experience TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

function pinOk(req, res) {
  if (req.query.pin !== ADMIN_PIN) {
    res.status(401).send(page("Admin PIN", `<div class="card"><h1>Admin PIN Required</h1><p>Use ?pin=YOUR_PIN</p></div>`));
    return false;
  }
  return true;
}


async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log("Telegram skipped: token/chat id missing");
    return;
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    });

    if (!resp.ok) {
      console.log("Telegram failed:", await resp.text());
    }
  } catch(e) {
    console.log("Telegram error:", e.message);
  }
}



function pinok(req,res){
  const pin = (req.query && req.query.pin) || (req.body && req.body.pin) || "";
  if (!ADMIN_PIN || pin === ADMIN_PIN) return true;

  res.status(403).send(page("Admin Locked", `
    <div class="card">
      <h1>Admin Locked</h1>
      <p>Invalid or missing admin pin.</p>
    </div>
  `));
  return false;
}

app.get("/", (req,res)=>res.redirect("/merchant"));
app.get("/health", (req,res)=>res.json({ok:true, service:"govo-portal"}));

app.get("/merchant", (req,res)=>{
  res.send(page("Merchant Registration", `
  <div class="card">
  <h1>GOVO Merchant Registration</h1>
  <form method="POST" action="/merchant">
    <label>Shop Name</label><input name="shop_name" required>
    <label>Owner Name</label><input name="owner_name" required>
    <label>Phone</label><input name="phone" required>
    <label>Location</label><input name="location" required>
    <label>Category</label>
    <select name="category"><option>Restaurant</option><option>Grocery</option><option>Pharmacy</option><option>Fashion</option><option>Electronics</option><option>Service Provider</option><option>Other</option></select>
    <label>Delivery Needed?</label>
    <select name="delivery_needed"><option>Yes</option><option>No</option><option>Later</option></select>
    <button>Submit Merchant Info</button>
  </form>
  </div>`));
});

app.post("/merchant", async (req,res)=>{
  const lead = {
    shop_name:req.body.shop_name, owner_name:req.body.owner_name,
    phone:req.body.phone, location:req.body.location,
    category:req.body.category, delivery_needed:req.body.delivery_needed
  };


  await pool.query(`INSERT INTO govo_merchant_leads (shop_name,owner_name,phone,location,category,delivery_needed) VALUES ($1,$2,$3,$4,$5,$6)`, [
    lead.shop_name,
    lead.owner_name,
    lead.phone,
    lead.location,
    lead.category,
    lead.delivery_needed
  ]);

  console.log("N8N webhook disabled for merchant lead");

  
  sendTelegram([
    "🟢 New GOVO Merchant Lead",
    "",
    `Shop: ${lead.shop_name || ""}`,
    `Owner: ${lead.owner_name || ""}`,
    `Phone: ${lead.phone || ""}`,
    `Location: ${lead.location || ""}`,
    `Category: ${lead.category || ""}`,
    `Delivery: ${lead.delivery_needed || ""}`,
    `Time: ${new Date().toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}`
  ].join("\n")).catch(()=>{});

  res.send(page("Submitted", `<div class="card ok"><h1>✅ Merchant Submitted</h1><p>GOVO team info receive koreche.</p><a class="btn" href="/merchant">Add Another</a></div>`));
});

app.get("/admin/leads", async (req,res)=>{
  if(!pinok(req,res)) return;
  try {
    const pin = encodeURIComponent((req.query && req.query.pin) || ADMIN_PIN || "");
    const r = await pool.query(`SELECT id,shop_name,owner_name,phone,location,category,delivery_needed,COALESCE(status,'pending') AS status,created_at FROM govo_merchant_leads ORDER BY id DESC LIMIT 100`);
    const rows = r.rows.map(x=>{
      const actions = `<a class="btn" href="/admin/merchant/${x.id}/approve?pin=${pin}">Approve</a> <a class="btn" href="/admin/merchant/${x.id}/reject?pin=${pin}">Reject</a>`;
      return `<tr>
        <td>${esc(String(x.id || ""))}</td>
        <td>${esc(String(x.shop_name || ""))}</td>
        <td>${esc(String(x.owner_name || ""))}</td>
        <td>${esc(String(x.phone || ""))}</td>
        <td>${esc(String(x.location || ""))}</td>
        <td>${esc(String(x.category || ""))}</td>
        <td>${esc(String(x.delivery_needed || ""))}</td>
        <td><b>${esc(String(x.status || "pending"))}</b></td>
        <td>${actions}</td>
        <td>${esc(String(x.created_at || ""))}</td>
      </tr>`;
    }).join("");
    res.send(page("Admin Leads", `<div class="card"><h1>Merchant Leads</h1><table><tr><th>ID</th><th>Shop</th><th>Owner</th><th>Phone</th><th>Location</th><th>Category</th><th>Delivery</th><th>Status</th><th>Action</th><th>Time</th></tr>${rows}</table></div>`));
  } catch(e) {
    console.log("Admin leads error:", e.message);
    res.status(500).send(page("Admin Leads Error", `<div class="card"><h1>Admin Leads Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/rider", (req,res)=>{
  res.send(page("Rider Registration", `
  <div class="card">
  <h1>GOVO Rider Registration</h1>
  <form method="POST" action="/rider">
    <label>Rider Name</label><input name="rider_name" required>
    <label>Phone</label><input name="phone" required>
    <label>Location</label><input name="location" required>
    <label>Vehicle Type</label><select name="vehicle_type"><option>Bike</option><option>Bicycle</option><option>Auto</option><option>Van</option><option>Other</option></select>
    <label>Experience</label><textarea name="experience"></textarea>
    <button>Submit Rider Info</button>
  </form>
  </div>`));
});

app.post("/rider", async (req,res)=>{
  await pool.query(`INSERT INTO govo_rider_leads (rider_name,phone,location,vehicle_type,experience) VALUES ($1,$2,$3,$4,$5)`, [
    req.body.rider_name, req.body.phone, req.body.location, req.body.vehicle_type, req.body.experience
  ]);
  
  sendTelegram([
    "🛵 New GOVO Rider Lead",
    "",
    `Name: ${req.body.rider_name || ""}`,
    `Phone: ${req.body.phone || ""}`,
    `Location: ${req.body.location || ""}`,
    `Vehicle: ${req.body.vehicle_type || ""}`,
    `Experience: ${req.body.experience || ""}`,
    `Time: ${new Date().toLocaleString("en-GB", {timeZone:"Asia/Dhaka"})}`
  ].join("\n")).catch(()=>{});

  res.send(page("Rider Submitted", `<div class="card ok"><h1>✅ Rider Submitted</h1><p>Rider info receive hoyeche.</p><a class="btn" href="/rider">Add Another</a></div>`));
});

app.get("/admin/riders", async (req,res)=>{
  if(!pinok(req,res)) return;
  try {
    const pin = encodeURIComponent((req.query && req.query.pin) || ADMIN_PIN || "");
    const r = await pool.query(`SELECT id,rider_name,phone,location,vehicle_type,experience,COALESCE(status,'pending') AS status,created_at FROM govo_rider_leads ORDER BY id DESC LIMIT 100`);
    const rows = r.rows.map(x=>{
      const actions = `<a class="btn" href="/admin/rider/${x.id}/approve?pin=${pin}">Approve</a> <a class="btn" href="/admin/rider/${x.id}/reject?pin=${pin}">Reject</a>`;
      return `<tr>
        <td>${esc(String(x.id || ""))}</td>
        <td>${esc(String(x.rider_name || ""))}</td>
        <td>${esc(String(x.phone || ""))}</td>
        <td>${esc(String(x.location || ""))}</td>
        <td>${esc(String(x.vehicle_type || ""))}</td>
        <td>${esc(String(x.experience || ""))}</td>
        <td><b>${esc(String(x.status || "pending"))}</b></td>
        <td>${actions}</td>
        <td>${esc(String(x.created_at || ""))}</td>
      </tr>`;
    }).join("");
    res.send(page("Admin Riders", `<div class="card"><h1>Rider Leads</h1><table><tr><th>ID</th><th>Name</th><th>Phone</th><th>Location</th><th>Vehicle</th><th>Experience</th><th>Status</th><th>Action</th><th>Time</th></tr>${rows}</table></div>`));
  } catch(e) {
    console.log("Admin riders error:", e.message);
    res.status(500).send(page("Admin Riders Error", `<div class="card"><h1>Admin Riders Error</h1><p>${esc(String(e.message))}</p></div>`));
  }
});

app.get("/dashboard/merchant", async (req,res)=>{
  const phone = req.query.phone || "";
  let body = `<div class="card"><h1>Merchant Dashboard</h1><form><label>Phone</label><input name="phone" value="${esc(phone)}"><button>Check</button></form></div>`;
  if(phone){
    const r = await pool.query(`SELECT * FROM govo_merchant_leads WHERE phone=$1 ORDER BY id DESC LIMIT 5`, [phone]);
    body += `<div class="card"><h2>Merchant Records</h2>${r.rows.map(x=>`<p><b>${esc(x.shop_name)}</b><br>Status: Received / Pending Review</p>`).join("") || "No record found"}</div>`;
  }
  res.send(page("Merchant Dashboard", body));
});

app.get("/dashboard/rider", async (req,res)=>{
  const phone = req.query.phone || "";
  let body = `<div class="card"><h1>Rider Dashboard</h1><form><label>Phone</label><input name="phone" value="${esc(phone)}"><button>Check</button></form></div>`;
  if(phone){
    const r = await pool.query(`SELECT * FROM govo_rider_leads WHERE phone=$1 ORDER BY id DESC LIMIT 5`, [phone]);
    body += `<div class="card"><h2>Rider Records</h2>${r.rows.map(x=>`<p><b>${esc(x.rider_name)}</b><br>Status: Received / Pending Review</p>`).join("") || "No record found"}</div>`;
  }
  res.send(page("Rider Dashboard", body));
});


async function ensureLeadStatusColumns() {
  try {
    await pool.query("ALTER TABLE govo_merchant_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
    await pool.query("ALTER TABLE govo_rider_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'");
    console.log("Lead status columns ready");
  } catch(e) {
    console.log("Status column setup skipped:", e.message);
  }
}



app.get("/admin/merchant/:id/:action", async (req,res)=>{
  if(!pinok(req,res)) return;
  const action = req.params.action;
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
  await pool.query("UPDATE govo_merchant_leads SET status=$1 WHERE id=$2", [status, req.params.id]);
  sendTelegram(`✅ GOVO Merchant ${status.toUpperCase()}\nID: ${req.params.id}`).catch(()=>{});
  res.redirect("/admin/leads?pin=" + encodeURIComponent(ADMIN_PIN));
});

app.get("/admin/rider/:id/:action", async (req,res)=>{
  if(!pinok(req,res)) return;
  const action = req.params.action;
  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
  await pool.query("UPDATE govo_rider_leads SET status=$1 WHERE id=$2", [status, req.params.id]);
  sendTelegram(`✅ GOVO Rider ${status.toUpperCase()}\nID: ${req.params.id}`).catch(()=>{});
  res.redirect("/admin/riders?pin=" + encodeURIComponent(ADMIN_PIN));
});


initDb().then(ensureLeadStatusColumns).then(()=>app.listen(PORT, ()=>console.log("GOVO Portal running on", PORT)));
