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


function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function publicSupportPhone() {
  return String(process.env.GOVO_SUPPORT_PHONE || process.env.SUPPORT_PHONE || process.env.GOVO_OPERATOR_PHONE || process.env.OPERATOR_PHONE || process.env.WHATSAPP_PHONE || '').trim();
}

function supportCallButton() {
  const phone = publicSupportPhone();
  return UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "📞", label: phone ? "সরাসরি কল করুন" : "Support request করুন", href: phone ? "tel:" + phone : "/support?classic=1" });
}

function customerCategories(selected = "") {
  const items = [
    ["market", "Need Groceries", "বাজার লাগবে", "🛒"],
    ["parcel", "Send Products", "পণ্য পাঠাতে চাই", "📦"],
    ["home-help", "Home Work", "বাসায় কাজ লাগবে", "🧹"],
    ["doctor", "Doctor Support", "ডাক্তারের support", "🩺"],
    ["medicine", "Need Medicine", "ঔষধ লাগবে", "💊"],
    ["family", "Family Work", "ঘরের/পরিবারের কাজ", "🏠"],
    ["agriculture", "Field Work", "কৃষি/মাঠের কাজ", "🌾"],
    ["emergency", "Emergency Help", "জরুরি সাহায্য", "🚨"]
  ];
  return items.map(([slug, title, banglaTitle, emoji]) => ({
    title,
    banglaTitle,
    emoji,
    href: `/service-request?service_type=${encodeURIComponent(banglaTitle)}&category=${encodeURIComponent(slug)}`,
    isActive: selected === slug || selected === banglaTitle || selected === title
  }));
}

function customerCategoryGrid(selected = "") {
  return `<section class="govo-grid">${customerCategories(selected).map(UI.categoryCard).join("")}</section>`;
}

function actionCard({ href, tone = "", emoji, title, sub }) {
  return `<a class="govo-action-card ${esc(tone)}" href="${esc(href)}">
    <span class="emoji" aria-hidden="true">${esc(emoji)}</span>
    <span><b>${esc(title)}</b><span>${esc(sub)}</span></span>
  </a>`;
}

function voiceRecorderShell(compact = false) {
  return `<section class="govo-card govo-voice-card" id="voice-request">
    <button class="govo-record-circle" type="button" aria-label="ভয়েস রেকর্ড করুন">🎙️</button>
    <div><h2 class="govo-section-title">ভয়েসে বলুন</h2><p class="govo-copy">আপনি কী চান সহজ করে বলুন। ভয়েস না হলে নিচের note field-এ লিখুন।</p></div>
    <div class="govo-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    ${compact ? "" : `<div class="govo-mini-actions">
      ${UI.ctaButton({ variant: "secondary", label: "শুনুন", href: "#voice-request" })}
      ${UI.ctaButton({ variant: "secondary", label: "মুছুন", href: "#voice-request" })}
      ${UI.ctaButton({ variant: "gold", label: "নিশ্চিত করুন", href: "/service-request#request-form" })}
    </div>`}
  </section>`;
}

function customerHome() {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.trustBadge("verified")}</div>
  <div class="govo-kicker">GOVO Customer App</div>
  <h1 class="govo-title">কি লাগবে আপনার?</h1>
  <p class="govo-copy">ভয়েস, লেখা বা সরাসরি operator call দিয়ে রিকোয়েস্ট শুরু করুন।</p>
</section>
<section class="govo-action-stack" aria-label="Customer quick actions">
  ${actionCard({ href: "/service-request?mode=voice#voice-request", tone: "gold", emoji: "🎙️", title: "ভয়েসে বলুন", sub: "Speak your request" })}
  ${actionCard({ href: "/service-request#request-form", tone: "primary", emoji: "✍️", title: "লিখে request দিন", sub: "Write your request" })}
  ${actionCard({ href: "/support", emoji: "📞", title: "Operator-কে call করুন", sub: "Call our Operator" })}
</section>
<div class="govo-section-head"><h2 class="govo-section-title">ক্যাটাগরি বাছাই করুন</h2>${UI.trustBadge("fast")}</div>
${customerCategoryGrid()}
${voiceRecorderShell(true)}
${UI.requestCard({ id: "#GV-MOCK", title: "রিকোয়েস্ট tracking preview", date: "Received → Assigned → Completed", status: "processing", href: "/app/track/mock-id-123", actionLabel: "Track দেখুন" })}`;
}

function requestPage(query = {}) {
  const category = String(query.category || "");
  const serviceType = String(query.service_type || "");
  const mode = String(query.mode || "");
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.statusChip("pending")}</div>
  <div class="govo-kicker">Request Entry</div>
  <h1 class="govo-title">রিকোয়েস্ট দিন</h1>
  <p class="govo-copy">নাম, মোবাইল, এলাকা আর কী দরকার লিখুন। দরকার হলে ভয়েস note যোগ করুন।</p>
</section>
${mode === "voice" ? voiceRecorderShell(false) : ""}
<div class="govo-section-head"><h2 class="govo-section-title">ক্যাটাগরি</h2><a class="govo-trust-badge gold" href="/app">হোম</a></div>
${customerCategoryGrid(category || serviceType)}
<section class="govo-card govo-request-card" id="request-form">
  <form class="govo-form" method="POST" action="/service-request">
    <input type="hidden" name="service_type" value="${esc(serviceType || "GOVO Customer Request")}">
    <div class="govo-field"><label for="customer_name">নাম</label><input id="customer_name" name="customer_name" autocomplete="name" required placeholder="আপনার নাম"></div>
    <div class="govo-field"><label for="customer_phone">মোবাইল</label><input id="customer_phone" name="customer_phone" type="tel" inputmode="numeric" pattern="01[0-9]{9}" autocomplete="tel" required placeholder="01XXXXXXXXX"></div>
    <div class="govo-field"><label for="customer_area">এলাকা</label><input id="customer_area" name="customer_area" required placeholder="যেমন: মেহেরপুর সদর"></div>
    <div class="govo-field"><label for="problem_details">কী দরকার</label><textarea id="problem_details" name="problem_details" required placeholder="আপনার দরকারটা লিখুন">${esc(serviceType)}</textarea></div>
    ${voiceRecorderShell(true)}
    <div class="govo-field"><label for="note">voice/note</label><textarea id="note" name="note" placeholder="ভয়েস থাকলে সংক্ষেপে note লিখুন"></textarea></div>
    <div class="govo-field"><label for="customer_address">address/location</label><textarea id="customer_address" name="customer_address" required placeholder="বাসা/দোকান/লোকেশন লিখুন"></textarea></div>
    <div class="govo-field"><label>urgent/normal</label><div class="govo-toggle-row">
      <label class="govo-radio-pill"><input type="radio" name="priority" value="urgent"> জরুরি</label>
      <label class="govo-radio-pill"><input type="radio" name="priority" value="normal" checked> স্বাভাবিক</label>
    </div></div>
    ${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "✓", label: "রিকোয়েস্ট পাঠান" }).replace('type="button"', 'type="submit"')}
  </form>
</section>`;
}

const TRACKING_STEPS = [
  ["Received", "গৃহীত হয়েছে"],
  ["Phone Confirming", "ফোনে নিশ্চিত করা হচ্ছে"],
  ["Confirmed", "নিশ্চিত করা হয়েছে"],
  ["Assigned", "কর্মী নিয়োজিত করা হয়েছে"],
  ["On the way", "কর্মী রওনা দিয়েছে"],
  ["Working", "কাজ চলছে"],
  ["Completed", "কাজ সম্পন্ন"],
  ["Paid", "পেমেন্ট সম্পন্ন"],
  ["Feedback", "মতামত দিন"]
];

function statusStepper(activeIndex = 3) {
  return `<div class="govo-timeline">${TRACKING_STEPS.map(([en, bn], index) => {
    const state = index < activeIndex ? "done" : (index === activeIndex ? "active" : "");
    const mark = index < activeIndex ? "✓" : (index + 1);
    return `<div class="govo-step ${state}"><span class="govo-step-node">${esc(mark)}</span><span><b>${esc(bn)}</b><span>${esc(en)}</span></span></div>`;
  }).join("")}</div>`;
}

function trackCustomer(id = "mock-id-123") {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("secure")}${UI.statusChip("processing")}</div>
  <div class="govo-kicker">Tracking</div>
  <h1 class="govo-title">রিকোয়েস্ট status</h1>
  <p class="govo-copy">Request ID: ${esc(id || "mock-id-123")}</p>
</section>
${UI.requestCard({ id: `#${id || "GV-MOCK"}`, title: "আপনার রিকোয়েস্ট confirm করা হচ্ছে", date: "শেষ আপডেট: আজ", status: "processing", href: "/support", actionLabel: "Support" })}
<section class="govo-card govo-request-card">
  <div class="govo-section-head"><h2 class="govo-section-title">Status timeline</h2>${UI.trustBadge("fast")}</div>
  ${statusStepper(3)}
</section>
<div class="govo-sticky-help">${UI.ctaButton({ variant: "primary", size: "lg", leftIcon: "📞", label: "কোনো সমস্যা? অপারেটরকে কল দিন", href: "/support" })}</div>`;
}

function supportPage() {
  return `
<section class="govo-hero">
  <div class="govo-trust-row">${UI.trustBadge("verified")}${UI.trustBadge("secure")}</div>
  <div class="govo-kicker">Customer Support</div>
  <h1 class="govo-title">Operator support</h1>
  <p class="govo-copy">আপনার সেবা নিশ্চিত করতে আমাদের অপারেটর আপনাকে ২ মিনিটের মধ্যে call করবেন।</p>
</section>
<section class="govo-card govo-support-card">
  <div class="govo-operator-avatar" aria-hidden="true">👨‍💼</div>
  <div><h2 class="govo-section-title">রহমান ভাই</h2><p class="govo-copy">সিনিয়র অপারেটর · GOVO Express</p></div>
  ${supportCallButton()}
  ${UI.ctaButton({ variant: "gold", size: "lg", leftIcon: "✍️", label: "Request লিখুন", href: "/service-request" })}
</section>
${UI.emptyState({ title: "অপারেটর flow", description: "এটি customer-facing support screen. Admin/operator hidden route publicly expose করা হয়নি।", emoji: "🛡️", actionLabel: "Track status", href: "/app/track/mock-id-123" })}`;
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
  return trackCustomer("mock-id-123");
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

function body(page, opts = {}) {
  const isStatic = !!(opts && opts.isStatic);
  const query = (opts && opts.query) || {};
  if (page === "shops") return shops(isStatic);
  if (page === "services") return services(isStatic);
  if (page === "merchant") return merchant();
  if (page === "rider") return rider();
  if (page === "track") return track();
  if (page === "request") return requestPage(query);
  if (page === "support") return supportPage();
  if (page === "customerApp") return customerHome();
  if (page === "admin") return admin();
  return home(isStatic);
}

function activeTab(page) {
  if (page === "track") return "orders";
  if (page === "request") return "voice";
  if (page === "support" || page === "merchant" || page === "rider") return "profile";
  return "home";
}

function renderPage(page = "home", opts = {}) {
  const isStatic = !!opts.isStatic;
  const role = page === "admin" ? "operator" : "user";
  return UI.mobileShell({
    title: "GOVO Express",
    description: "GOVO Express Local Premium Trust OS customer app UI.",
    body: body(page, opts),
    role,
    activeTab: role === "operator" ? "queue" : activeTab(page),
    voice: role === "operator" || page === "request" || page === "track" || page === "support" ? false : { isRecording: false }
  });
}

function mount(app) {
  app.get("/govo-ui-v3.css", (req, res) => {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.send(UI.css());
  });

  const routes = {
    "/": "home",
    "/app": "customerApp",
    "/app/request": "request",
    "/service-request": "request",
    "/support": "support",
    "/app/support": "support",
    "/shops": "shops",
    "/services": "services",
    "/merchant": "merchant",
    "/rider": "rider",
    "/admin/login": "admin"
  };

  Object.entries(routes).forEach(([route, page]) => {
    app.get(route, (req, res, next) => {
      if (req.query && req.query.classic === "1") return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderPage(page, { isStatic: false, query: req.query || {} }));
    });
  });

  app.get(["/app/track/:id"], (req, res, next) => {
    if (req.query && req.query.classic === "1") return next();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(UI.mobileShell({
      title: "GOVO Track",
      description: "GOVO Express customer tracking status UI.",
      body: trackCustomer(req.params.id),
      role: "user",
      activeTab: "orders",
      voice: false
    }));
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
