const fs = require("fs");
const { Pool } = require("pg");

function loadEnv() {
  if (!fs.existsSync(".env")) return;
  const lines = fs.readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

function pick(row, keys) {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

function boolish(v) {
  return v === true || v === "true" || v === "1" || v === 1 || String(v || "").toLowerCase() === "approved";
}

function iconFor(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("doctor") || t.includes("health") || t.includes("medicine") || t.includes("pharmacy")) return "doctor";
  if (t.includes("agri") || t.includes("farm") || t.includes("seed") || t.includes("fertilizer")) return "agri";
  if (t.includes("home") || t.includes("house")) return "home";
  if (t.includes("delivery") || t.includes("parcel")) return "delivery";
  if (t.includes("ride") || t.includes("bike") || t.includes("auto")) return "ride";
  if (t.includes("shop") || t.includes("store") || t.includes("grocery")) return "shops";
  if (t.includes("electric")) return "bolt";
  if (t.includes("security") || t.includes("pest")) return "shield";
  return "services";
}

async function main() {
  loadEnv();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined,
    host: process.env.PGHOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
    database: process.env.PGDATABASE || process.env.DB_NAME || process.env.POSTGRES_DB || "postgres",
    user: process.env.PGUSER || process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || undefined,
  });

  const tableRes = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
    ORDER BY table_name
  `);

  const tables = tableRes.rows.map(r => r.table_name);
  const interesting = tables.filter(t => /govo|merchant|shop|service|provider|rider|order|lead|request/i.test(t));

  async function readTable(name) {
    if (!tables.includes(name)) return [];
    try {
      const r = await pool.query(`SELECT * FROM ${JSON.stringify(name)} LIMIT 300`);
      return r.rows || [];
    } catch (e) {
      return [];
    }
  }

  const raw = {};
  for (const t of interesting) raw[t] = await readTable(t);

  const merchantRows = [
    ...(raw.govo_merchant_leads || []),
    ...(raw.govo_merchants || []),
    ...(raw.merchants || []),
    ...(raw.shops || []),
    ...(raw.govo_shops || [])
  ];

  const providerRows = [
    ...(raw.govo_service_providers || []),
    ...(raw.service_providers || []),
    ...(raw.govo_service_requests || []),
    ...(raw.service_requests || [])
  ];

  const riderRows = [
    ...(raw.govo_rider_leads || []),
    ...(raw.riders || []),
    ...(raw.govo_riders || [])
  ];

  const orderRows = [
    ...(raw.govo_orders || []),
    ...(raw.orders || []),
    ...(raw.govo_delivery_orders || [])
  ];

  const shops = merchantRows.map((r, i) => {
    const name = pick(r, ["shop_name","business_name","merchant_name","store_name","name","full_name","owner_name"]) || `Local Shop ${i + 1}`;
    const cat = pick(r, ["category","business_type","shop_type","type","service_type"]) || "Local Shop";
    const area = pick(r, ["area","location","address","union_name","upazila"]) || "Meherpur";
    const phone = pick(r, ["phone","mobile","whatsapp","contact","contact_number"]);
    const status = boolish(r.approved) || boolish(r.public_visible) || boolish(r.status) ? "Open" : "Pending";
    return {
      id: pick(r, ["id","lead_id","merchant_id"]) || `shop_${i+1}`,
      name,
      subtitle: `${cat}${area ? " · " + area : ""}`,
      category: cat,
      area,
      address: pick(r, ["address","location"]) || area,
      phone,
      whatsapp: pick(r, ["whatsapp","phone","mobile"]),
      status,
      rating: "4." + ((i % 5) + 4),
      distance: area
    };
  });

  const services = providerRows.map((r, i) => {
    const serviceName = pick(r, ["service_name","service_type","category","provider_type","business_type"]) ||
      pick(r, ["provider_name","name","full_name"]) ||
      `Local Service ${i + 1}`;
    const provider = pick(r, ["provider_name","name","full_name","business_name"]) || serviceName;
    const area = pick(r, ["area","location","address","union_name","upazila"]) || "Meherpur";
    return {
      id: pick(r, ["id","provider_id","request_id"]) || `service_${i+1}`,
      name: serviceName,
      provider,
      subtitle: `${provider}${area ? " · " + area : ""}`,
      category: serviceName,
      area,
      phone: pick(r, ["phone","mobile","whatsapp","contact","contact_number"]),
      whatsapp: pick(r, ["whatsapp","phone","mobile"]),
      status: boolish(r.approved) || boolish(r.public_visible) || boolish(r.status) ? "Available" : "Pending",
      icon: iconFor(serviceName + " " + provider)
    };
  });

  const riders = riderRows.map((r, i) => ({
    id: pick(r, ["id","rider_id"]) || `rider_${i+1}`,
    name: pick(r, ["rider_name","name","full_name"]) || `Rider ${i + 1}`,
    vehicle: pick(r, ["vehicle_type","vehicle"]) || "Bike",
    area: pick(r, ["area","location","address"]) || "Meherpur",
    phone: pick(r, ["phone","mobile","whatsapp"]),
    status: boolish(r.approved) || boolish(r.public_visible) || boolish(r.status) ? "Active" : "Pending"
  }));

  const orders = orderRows.map((r, i) => ({
    id: pick(r, ["order_id","id","tracking_id"]) || `GOVO${String(i + 1).padStart(6, "0")}`,
    title: pick(r, ["title","type","order_type"]) || "Delivery Order",
    status: pick(r, ["status","order_status"]) || "Pending",
    amount: pick(r, ["amount","price","fare","total"]) || "৳120",
    pickup: pick(r, ["pickup","pickup_location","from_address"]) || "Pickup location",
    dropoff: pick(r, ["dropoff","drop_location","to_address"]) || "Drop-off location"
  }));

  const fallbackServices = [
    { name:"Cleaning", subtitle:"Home cleaning & helper", icon:"services", area:"Meherpur", status:"Available" },
    { name:"Plumbing", subtitle:"Pipe, tap, bathroom repair", icon:"services", area:"Meherpur", status:"Available" },
    { name:"Electrician", subtitle:"Light, fan, wiring support", icon:"bolt", area:"Meherpur", status:"Available" },
    { name:"AC Repair", subtitle:"AC service & technician", icon:"services", area:"Meherpur", status:"Available" },
    { name:"Doctor Appointment", subtitle:"Doctor & health support", icon:"doctor", area:"Meherpur", status:"Available" },
    { name:"Agri Service", subtitle:"Farm support & advice", icon:"agri", area:"Meherpur", status:"Available" },
    { name:"Home Service", subtitle:"Local home help", icon:"home", area:"Meherpur", status:"Available" }
  ];

  const fallbackShops = [
    { name:"Meherpur Super Shop", subtitle:"Grocery, Daily Needs · Meherpur", category:"Grocery", area:"Meherpur", status:"Open", rating:"4.8", distance:"Meherpur" },
    { name:"Fresh Mart", subtitle:"Grocery, Fruits, Vegetables · Meherpur", category:"Grocery", area:"Meherpur", status:"Open", rating:"4.7", distance:"Meherpur" },
    { name:"Rafiq Pharmacy", subtitle:"Medicine, Healthcare · Meherpur", category:"Pharmacy", area:"Meherpur", status:"Open", rating:"4.9", distance:"Meherpur" },
    { name:"Food Plaza", subtitle:"Restaurant, Fast Food · Meherpur", category:"Restaurant", area:"Meherpur", status:"Open", rating:"4.6", distance:"Meherpur" }
  ];

  const data = {
    generatedAt: new Date().toISOString(),
    dbTables: interesting,
    counts: {
      dbShops: shops.length,
      dbServices: services.length,
      dbRiders: riders.length,
      dbOrders: orders.length
    },
    areas: ["Meherpur", "Gangni", "Bamundi", "Mujibnagar", "Amjhupi"],
    shops: shops.length ? shops : fallbackShops,
    services: services.length ? services : fallbackServices,
    riders,
    orders
  };

  fs.writeFileSync("govo_data_v12c.js", "module.exports = " + JSON.stringify(data, null, 2) + ";\n");
  fs.writeFileSync("docs/phase12c_v12c_data_export.json", JSON.stringify(data, null, 2));

  console.log("DB tables:", interesting.join(", "));
  console.log("Shops:", data.shops.length, "DB:", shops.length);
  console.log("Services:", data.services.length, "DB:", services.length);
  console.log("Riders:", data.riders.length);
  console.log("Orders:", data.orders.length);
  console.log("Generated: govo_data_v12c.js");
  await pool.end();
}

main().catch(e => {
  console.error("EXPORT_FAILED:", e.message);
  process.exit(1);
});
