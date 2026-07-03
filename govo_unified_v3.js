const fs = require("fs");
const path = require("path");
const UI = require("./govo_ui_foundation");

function links(isStatic = false) {
  const app = isStatic ? "https://app.govoexpress.com" : "";
  return {
    home: isStatic ? "/" : "/",
    shops: app + "/shops",
    services: app + "/services",
    track: app + "/track",
    merchant: app + "/merchant",
    rider: app + "/rider",
    admin: app + "/admin/login",
    notify: app + "/notify",
    classic: "?classic=1"
  };
}

function categories(page = "home", isStatic = false) {
  const L = links(isStatic);
  return [
    { title: "Delivery", banglaTitle: "পার্সেল ডেলিভারি", emoji: "📦", href: L.shops, isActive: page === "shops" },
    { title: "Market", banglaTitle: "বাজার-সদাই", emoji: "🛒", href: L.shops, isActive: page === "home" },
    { title: "Services", banglaTitle: "লোকাল সার্ভিস", emoji: "🛠️", href: L.services, isActive: page === "services" },
    { title: "Track", banglaTitle: "অর্ডার ট্র্যাক", emoji: "📍", href: L.track, isActive: page === "track" }
  ];
}

function categoryGrid(page, isStatic = false) {
  return `<section class="govo-grid">${categories(page, isStatic).map(UI.categoryCard).join("")}</section>`;
}

function home(isStatic = false) {
  const L = links(isStatic);
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.trustBadge("fast")}</div>
  <div class="govo-kicker">মেহেরপুর-ফার্স্ট লোকাল ডেলিভারি</div>
  <h1 class="govo-title">বিশ্বাসযোগ্য লোকাল সার্ভিস, এক GOVO অ্যাপে</h1>
  <p class="govo-copy">Customer, merchant, rider আর support flow এক জায়গায় রেখে GOVO Express দ্রুত, সহজ আর premium local delivery experience দেয়।</p>
  ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "📦", label: "ডেলিভারি বুক করুন", href: L.shops })}
</section>
<div class="govo-section-head"><h2 class="govo-section-title">সার্ভিস বাছাই করুন</h2>${UI.trustBadge("verified")}</div>
${categoryGrid("home", isStatic)}
${UI.requestCard({ id: "#GV-9082", title: "ধানমন্ডি ৩২ এ জরুরি পার্সেল", date: "আজ · ২৫-৩৫ মিনিট", status: "processing", price: "৳৮০", href: L.track })}
${UI.emptyState({ title: "নতুন রিকোয়েস্ট তৈরি করুন", description: "ভয়েস দিয়ে বলুন বা category থেকে শুরু করুন।", emoji: "🎙️", actionLabel: "ভয়েস রিকোয়েস্ট", href: "#voice" })}`;
}

function shops(isStatic = false) {
  const L = links(isStatic);
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("verified")}${UI.trustBadge("secure")}</div>
  <div class="govo-kicker">GOVO Shops</div>
  <h1 class="govo-title">দোকান, বাজার আর ডেলিভারি একসাথে</h1>
  <p class="govo-copy">Food, grocery, pharmacy এবং local merchant order flow premium GOVO shell-এ রাখা হয়েছে। Classic form আগের মতই available।</p>
  ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "🛒", label: "অর্ডার শুরু করুন", href: "/order?classic=1" })}
</section>
<div class="govo-section-head"><h2 class="govo-section-title">ক্যাটাগরি</h2>${UI.statusChip("pending")}</div>
${categoryGrid("shops", isStatic)}
${UI.requestCard({ id: "#SHOP-120", title: "ভেরিফাইড মার্চেন্ট অর্ডার", date: "Merchant onboarding live", status: "pending", price: "Partner", href: L.merchant, actionLabel: "দোকান যুক্ত করুন" })}`;
}

function services(isStatic = false) {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.trustBadge("fast")}</div>
  <div class="govo-kicker">GOVO Services</div>
  <h1 class="govo-title">লোকাল সার্ভিস, GOVO trust সহ</h1>
  <p class="govo-copy">Technician, household support, agriculture support এবং future service request flow-এর জন্য shared premium foundation।</p>
  ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "🛠️", label: "সার্ভিস রিকোয়েস্ট", href: "/service-request?classic=1" })}
</section>
${categoryGrid("services", isStatic)}
${UI.loadingState()}`;
}

function merchant() {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("verified")}${UI.trustBadge("secure")}</div>
  <div class="govo-kicker">Merchant Partner</div>
  <h1 class="govo-title">আপনার দোকান GOVO-তে যুক্ত করুন</h1>
  <p class="govo-copy">Local customer reach, delivery booking, notification আর support coordination একই trusted merchant flow-এ থাকবে।</p>
  ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "🏪", label: "Merchant form খুলুন", href: "/merchant?classic=1" })}
</section>
${UI.requestCard({ id: "#MER-ONBOARD", title: "Merchant verification flow", date: "Register → Verify → Receive orders", status: "processing", price: "Partner", href: "/notify", actionLabel: "Notify Center" })}
${UI.emptyState({ title: "Partner dashboard", description: "Business logic unchanged. Existing classic merchant workflow ব্যবহার হবে।", emoji: "🏪", actionLabel: "Classic Merchant", href: "/merchant?classic=1" })}`;
}

function rider() {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("fast")}${UI.trustBadge("verified")}</div>
  <div class="govo-kicker">Rider Fleet</div>
  <h1 class="govo-title">GOVO Rider হয়ে delivery income শুরু করুন</h1>
  <p class="govo-copy">Pickup, drop, rider task এবং WhatsApp coordination existing rider flow-এর সাথে safe link করা হয়েছে।</p>
  ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "🏍️", label: "Rider form খুলুন", href: "/rider?classic=1" })}
</section>
${UI.requestCard({ id: "#RIDER-QUEUE", title: "Rider task preview", date: "Admin verify প্রয়োজন", status: "pending", href: "/rider?classic=1", actionLabel: "Apply now" })}`;
}

function track() {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.statusChip("processing")}</div>
  <div class="govo-kicker">Track Order</div>
  <h1 class="govo-title">অর্ডারের অবস্থান সহজে দেখুন</h1>
  <p class="govo-copy">Customer SMS, rider assignment এবং delivery status flow classic tracking system-এ connected থাকবে।</p>
  ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "📍", label: "Classic track খুলুন", href: "/track?classic=1" })}
</section>
${UI.requestCard({ id: "#GV-9082", title: "Pickup → Delivery চলমান", date: "শেষ আপডেট: আজ", status: "processing", price: "৳৮০", href: "/track?classic=1" })}
${UI.errorState({ message: "লাইভ tracking data না থাকলে classic tracking form ব্যবহার করুন।", href: "/track?classic=1" })}`;
}

function admin() {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.statusChip("pending")}</div>
  <div class="govo-kicker">Operator shell preview</div>
  <h1 class="govo-title">Admin flow hidden এবং protected থাকবে</h1>
  <p class="govo-copy">Phase 1 শুধু shared UI foundation দেখায়। Existing admin login এবং authorization business logic unchanged।</p>
  ${UI.ctaButton({ variant: "secondary", size: "lg", leftIcon: "⚙", label: "Classic admin login", href: "/admin/login?classic=1" })}
</section>
${UI.emptyState({ title: "Operator UI foundation", description: "Role-based nav supports operator tabs, but hidden admin access is not exposed publicly.", emoji: "⚙", actionLabel: "Notify Center", href: "/notify" })}`;
}

function body(page, isStatic = false) {
  if (page === "shops") return shops(isStatic);
  if (page === "services") return services(isStatic);
  if (page === "merchant") return merchant();
  if (page === "rider") return rider();
  if (page === "track") return track();
  if (page === "admin") return admin();
  return home(isStatic);
}

function activeTab(page) {
  if (page === "track") return "orders";
  if (page === "merchant" || page === "rider") return "profile";
  return "home";
}

function renderPage(page = "home", opts = {}) {
  const isStatic = !!opts.isStatic;
  const role = page === "admin" ? "operator" : "user";
  return UI.mobileShell({
    title: "GOVO Express",
    description: "GOVO Express Local Premium Trust OS shared UI foundation.",
    body: body(page, isStatic),
    role,
    activeTab: role === "operator" ? "queue" : activeTab(page),
    voice: role === "operator" ? false : { isRecording: false }
  });
}

function mount(app) {
  app.get("/govo-ui-v3.css", (req, res) => {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.send(UI.css());
  });

  const routes = {
    "/": "home",
    "/shops": "shops",
    "/services": "services",
    "/merchant": "merchant",
    "/rider": "rider",
    "/track": "track",
    "/admin/login": "admin"
  };

  Object.entries(routes).forEach(([route, page]) => {
    app.get(route, (req, res, next) => {
      if (req.query && req.query.classic === "1") return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderPage(page, { isStatic: false }));
    });
  });

  console.log("✅ GOVO Local Premium Trust OS Phase 1 UI foundation mounted");
}

function writeStatic(root) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), renderPage("home", { isStatic: true }));
}

if (require.main === module && process.argv[2] === "write-static") {
  writeStatic(process.argv[3] || "/var/www/govo-main");
  console.log("✅ static homepage written");
}

module.exports = { mount, renderPage, writeStatic };
