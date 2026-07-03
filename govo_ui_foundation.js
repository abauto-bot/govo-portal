const BRAND = {
  emerald50: "#F0F7F4",
  emerald100: "#DCECE5",
  emerald600: "#0B6646",
  emerald700: "#094F39",
  emerald800: "#063B2B",
  emerald900: "#03241B",
  charcoal800: "#1E2221",
  charcoal900: "#121414",
  ivory50: "#FDFDF9",
  ivory100: "#F5F5EE",
  ivory200: "#EBEBE0",
  gold100: "#FDF8EB",
  gold500: "#D4AF37",
  gold600: "#A8791A"
};

const COPY = {
  trust: {
    verified: { emoji: "✓", label: "ভেরিফাইড এজেন্ট" },
    secure: { emoji: "🛡️", label: "১০০% নিরাপদ" },
    fast: { emoji: "⚡", label: "দ্রুত সার্ভিস" }
  },
  status: {
    pending: "অপেক্ষমান",
    processing: "চলমান",
    completed: "সম্পন্ন",
    cancelled: "বাতিল"
  }
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attrs(input = {}) {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== false)
    .map(([key, value]) => value === true ? esc(key) : `${esc(key)}="${esc(value)}"`)
    .join(" ");
}

function css() {
  return `
:root{
  --govo-emerald-50:${BRAND.emerald50};
  --govo-emerald-100:${BRAND.emerald100};
  --govo-emerald-600:${BRAND.emerald600};
  --govo-emerald-700:${BRAND.emerald700};
  --govo-emerald-800:${BRAND.emerald800};
  --govo-emerald-900:${BRAND.emerald900};
  --govo-charcoal-800:${BRAND.charcoal800};
  --govo-charcoal-900:${BRAND.charcoal900};
  --govo-ivory-50:${BRAND.ivory50};
  --govo-ivory-100:${BRAND.ivory100};
  --govo-ivory-200:${BRAND.ivory200};
  --govo-gold-100:${BRAND.gold100};
  --govo-gold-500:${BRAND.gold500};
  --govo-gold-600:${BRAND.gold600};
  --govo-shadow-sm:0 2px 8px rgba(9,79,57,.04);
  --govo-shadow-md:0 8px 24px rgba(9,79,57,.08);
  --govo-shadow-lg:0 18px 42px rgba(9,79,57,.14);
  --govo-font-bangla:"Hind Siliguri","Noto Sans Bengali",Inter,system-ui,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;background:var(--govo-charcoal-900)}
body{
  margin:0;
  min-height:100svh;
  background:
    radial-gradient(circle at 50% -20%,rgba(11,102,70,.24),transparent 34%),
    linear-gradient(180deg,var(--govo-charcoal-900),#08110f 58%,var(--govo-charcoal-900));
  color:var(--govo-charcoal-800);
  font-family:var(--govo-font-bangla);
  -webkit-font-smoothing:antialiased;
  -webkit-tap-highlight-color:transparent;
}
body,input,button,select,textarea{font-family:var(--govo-font-bangla)}
a{color:inherit;text-decoration:none}
button,a{touch-action:manipulation}
.govo-app-frame{
  width:100%;
  max-width:480px;
  min-height:100svh;
  margin:0 auto;
  background:linear-gradient(180deg,var(--govo-ivory-50),var(--govo-ivory-100));
  box-shadow:0 0 0 1px rgba(245,245,238,.08),0 28px 80px rgba(0,0,0,.32);
  position:relative;
  overflow:hidden;
}
.govo-mobile-shell{
  min-height:100svh;
  padding:calc(14px + env(safe-area-inset-top)) 14px calc(112px + env(safe-area-inset-bottom));
}
.govo-content{display:grid;gap:16px}
.govo-header{
  position:sticky;
  top:0;
  z-index:20;
  margin:-14px -14px 12px;
  padding:calc(12px + env(safe-area-inset-top)) 14px 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  background:rgba(253,253,249,.9);
  border-bottom:1px solid rgba(235,235,224,.92);
  backdrop-filter:blur(16px);
}
.govo-brand{display:flex;align-items:center;gap:10px;min-width:0}
.govo-logo{
  width:44px;
  height:44px;
  border-radius:16px;
  display:grid;
  place-items:center;
  flex:0 0 auto;
  background:linear-gradient(145deg,var(--govo-emerald-700),var(--govo-emerald-600));
  color:var(--govo-gold-100);
  font-weight:900;
  box-shadow:0 10px 22px rgba(9,79,57,.18);
}
.govo-brand-title{min-width:0}
.govo-brand-title b{display:block;font-size:17px;line-height:1.1;color:var(--govo-charcoal-800)}
.govo-brand-title span{display:block;font-size:12px;line-height:1.2;color:#64756c;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.govo-header-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}
.govo-icon-btn,.govo-lang{
  min-width:44px;
  height:44px;
  border:1px solid var(--govo-ivory-200);
  border-radius:999px;
  display:inline-grid;
  place-items:center;
  background:#fffef8;
  color:var(--govo-emerald-800);
  font-weight:800;
  box-shadow:var(--govo-shadow-sm);
  position:relative;
}
.govo-lang{font-size:13px;padding:0 11px}
.govo-notify-dot{
  position:absolute;
  top:9px;
  right:10px;
  width:8px;
  height:8px;
  border-radius:99px;
  background:var(--govo-gold-500);
  box-shadow:0 0 0 2px #fffef8;
}
.govo-avatar-dot{
  width:12px;
  height:12px;
  border-radius:99px;
  background:var(--govo-emerald-600);
  box-shadow:0 0 0 5px var(--govo-emerald-100);
}
.govo-hero{
  display:grid;
  gap:14px;
  padding:16px 2px 2px;
}
.govo-kicker{font-size:13px;color:var(--govo-emerald-700);font-weight:800}
.govo-title{margin:0;color:var(--govo-charcoal-900);font-size:34px;line-height:1.09;letter-spacing:0;font-weight:800}
.govo-copy{margin:0;color:#5d6b64;font-size:16px;line-height:1.6}
.govo-section-title{margin:0;color:var(--govo-charcoal-900);font-size:20px;line-height:1.25}
.govo-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px}
.govo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.govo-card{
  background:#fffef8;
  border:1px solid var(--govo-ivory-200);
  border-radius:20px;
  box-shadow:var(--govo-shadow-md);
}
.govo-category-card{
  min-height:116px;
  padding:14px;
  display:grid;
  align-content:space-between;
  text-align:left;
  cursor:pointer;
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
}
.govo-category-card:hover,.govo-category-card:focus-visible{transform:translateY(-1px);box-shadow:var(--govo-shadow-lg)}
.govo-category-card.active{border-color:rgba(212,175,55,.7);background:linear-gradient(180deg,#fffef8,var(--govo-gold-100))}
.govo-category-emoji{font-size:30px;line-height:1}
.govo-category-card b{font-size:16px;line-height:1.2;color:var(--govo-charcoal-900)}
.govo-category-card span{font-size:12px;color:#738079;margin-top:3px}
.govo-trust-row,.govo-chip-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.govo-trust-badge{
  display:inline-flex;
  min-height:32px;
  align-items:center;
  gap:6px;
  padding:6px 10px;
  border-radius:999px;
  background:var(--govo-emerald-50);
  border:1px solid var(--govo-emerald-100);
  color:var(--govo-emerald-800);
  font-size:12px;
  font-weight:800;
}
.govo-trust-badge.gold{background:var(--govo-gold-100);border-color:rgba(212,175,55,.36);color:#6f5213}
.govo-status-chip{
  display:inline-flex;
  min-height:30px;
  align-items:center;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid transparent;
  font-size:12px;
  font-weight:900;
}
.govo-status-pending{background:#fff7df;color:#8b5e00;border-color:#f3dfab}
.govo-status-processing{background:var(--govo-emerald-50);color:var(--govo-emerald-800);border-color:var(--govo-emerald-100)}
.govo-status-completed{background:#e9f8ee;color:#176638;border-color:#ccebd7}
.govo-status-cancelled{background:#fff0ee;color:#9f2c1e;border-color:#ffd3cc}
.govo-request-card{padding:14px;display:grid;gap:12px}
.govo-request-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.govo-request-id{font-size:12px;font-weight:900;color:var(--govo-emerald-700)}
.govo-request-title{margin:3px 0 0;font-size:18px;line-height:1.28;color:var(--govo-charcoal-900)}
.govo-request-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#6e7a74;font-size:13px}
.govo-btn{
  min-height:48px;
  border:0;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:12px 18px;
  cursor:pointer;
  font-size:15px;
  font-weight:900;
  line-height:1.15;
  box-shadow:var(--govo-shadow-sm);
  transition:transform .16s ease,box-shadow .16s ease,filter .16s ease;
}
.govo-btn:active{transform:scale(.98)}
.govo-btn-lg{min-height:56px;width:100%;font-size:17px}
.govo-btn-primary{background:linear-gradient(135deg,var(--govo-emerald-700),var(--govo-emerald-600));color:#fffef8}
.govo-btn-secondary{background:var(--govo-emerald-50);color:var(--govo-emerald-800);border:1px solid var(--govo-emerald-100)}
.govo-btn-gold{background:linear-gradient(135deg,var(--govo-gold-500),#efd989);color:#2a210e}
.govo-btn-loading{opacity:.78;pointer-events:none}

.govo-action-stack{display:grid;gap:10px}
.govo-action-card{
  min-height:74px;
  padding:14px;
  border-radius:22px;
  display:flex;
  align-items:center;
  gap:12px;
  border:1px solid var(--govo-ivory-200);
  background:#fffef8;
  box-shadow:var(--govo-shadow-md);
  text-align:left;
  font-weight:900;
}
.govo-action-card.primary{background:linear-gradient(135deg,var(--govo-emerald-800),var(--govo-emerald-600));color:#fffef8;border-color:transparent}
.govo-action-card.gold{background:linear-gradient(135deg,var(--govo-gold-100),#fffef8);border-color:rgba(212,175,55,.52);color:#2a210e}
.govo-action-card .emoji{width:46px;height:46px;border-radius:18px;display:grid;place-items:center;background:rgba(255,255,255,.58);font-size:24px;flex:0 0 auto}
.govo-action-card.primary .emoji{background:rgba(255,255,255,.13)}
.govo-action-card b{display:block;font-size:17px;line-height:1.15}
.govo-action-card span:last-child{display:block;margin-top:3px;font-size:12px;font-weight:700;opacity:.75}
.govo-form{display:grid;gap:12px}
.govo-field{display:grid;gap:6px}
.govo-field label{font-size:14px;font-weight:900;color:var(--govo-charcoal-900)}
.govo-field input,.govo-field select,.govo-field textarea{
  width:100%;
  min-height:52px;
  border:1px solid var(--govo-ivory-200);
  border-radius:18px;
  background:#fffef8;
  color:var(--govo-charcoal-900);
  padding:13px 14px;
  font-size:16px;
  outline:none;
  box-shadow:var(--govo-shadow-sm);
}
.govo-field textarea{min-height:108px;resize:vertical;line-height:1.45}
.govo-toggle-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.govo-radio-pill{min-height:52px;border-radius:999px;border:1px solid var(--govo-ivory-200);background:#fffef8;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:900;color:var(--govo-charcoal-800)}
.govo-radio-pill input{accent-color:var(--govo-emerald-700)}
.govo-voice-card{padding:16px;display:grid;gap:12px;text-align:center}
.govo-record-circle{
  width:94px;
  height:94px;
  margin:0 auto;
  border:0;
  border-radius:999px;
  display:grid;
  place-items:center;
  font-size:38px;
  background:linear-gradient(135deg,var(--govo-gold-500),#f1d987);
  color:#2a210e;
  box-shadow:0 0 0 10px rgba(212,175,55,.12),0 18px 36px rgba(9,79,57,.13);
  animation:govo-pulse 1.25s ease-in-out infinite;
}
.govo-wave{height:42px;display:flex;align-items:center;justify-content:center;gap:5px}
.govo-wave i{display:block;width:6px;border-radius:99px;background:var(--govo-emerald-700);animation:govo-wave 1s ease-in-out infinite}
.govo-wave i:nth-child(1){height:16px}.govo-wave i:nth-child(2){height:28px;animation-delay:.08s}.govo-wave i:nth-child(3){height:38px;animation-delay:.16s}.govo-wave i:nth-child(4){height:24px;animation-delay:.24s}.govo-wave i:nth-child(5){height:32px;animation-delay:.32s}
@keyframes govo-wave{50%{transform:scaleY(.45);opacity:.62}}
.govo-mini-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.govo-mini-actions .govo-btn{min-height:44px;padding:9px 10px;font-size:13px}
.govo-timeline{display:grid;gap:0;margin-top:4px}
.govo-step{display:grid;grid-template-columns:36px 1fr;gap:10px;position:relative;padding:0 0 18px}
.govo-step:before{content:"";position:absolute;left:17px;top:36px;bottom:0;width:2px;background:var(--govo-ivory-200)}
.govo-step:last-child{padding-bottom:0}.govo-step:last-child:before{display:none}
.govo-step-node{width:36px;height:36px;border-radius:999px;display:grid;place-items:center;border:2px solid var(--govo-ivory-200);background:#fffef8;color:#7a857f;font-weight:900}
.govo-step.done .govo-step-node{background:var(--govo-emerald-700);border-color:var(--govo-emerald-700);color:#fffef8}
.govo-step.active .govo-step-node{background:var(--govo-gold-500);border-color:var(--govo-gold-500);color:#2a210e;animation:govo-pulse 1.2s ease-in-out infinite}
.govo-step b{display:block;color:var(--govo-charcoal-900);font-size:15px;line-height:1.2}
.govo-step span{display:block;color:#6b7771;font-size:12px;margin-top:3px}
.govo-support-card{padding:18px;text-align:center;display:grid;gap:14px;justify-items:center}
.govo-operator-avatar{width:96px;height:96px;border-radius:32px;display:grid;place-items:center;background:linear-gradient(135deg,var(--govo-emerald-800),var(--govo-emerald-600));color:#fffef8;font-size:42px;box-shadow:var(--govo-shadow-lg)}
.govo-sticky-help{
  position:sticky;
  bottom:88px;
  z-index:12;
  padding:10px;
  border-radius:24px;
  background:rgba(253,253,249,.92);
  border:1px solid var(--govo-ivory-200);
  box-shadow:var(--govo-shadow-lg);
  backdrop-filter:blur(14px);
}
.govo-spinner{
  width:18px;
  height:18px;
  border-radius:99px;
  border:2px solid currentColor;
  border-right-color:transparent;
  animation:govo-spin .75s linear infinite;
}
@keyframes govo-spin{to{transform:rotate(360deg)}}
.govo-empty,.govo-error{padding:22px;text-align:center;display:grid;gap:10px;justify-items:center}
.govo-empty-emoji,.govo-error-emoji{font-size:34px}
.govo-empty h3,.govo-error h3{margin:0;color:var(--govo-charcoal-900);font-size:20px}
.govo-empty p,.govo-error p{margin:0;color:#68756f;line-height:1.55}
.govo-error{border-color:#ffd3cc;background:#fffaf8}
.govo-skeleton{display:grid;gap:10px}
.govo-skeleton-line,.govo-skeleton-box{
  border-radius:999px;
  background:linear-gradient(90deg,var(--govo-ivory-200),#fffef8,var(--govo-ivory-200));
  background-size:220% 100%;
  animation:govo-shimmer 1.2s ease-in-out infinite;
}
.govo-skeleton-box{height:86px;border-radius:20px}
.govo-skeleton-line{height:14px}
.govo-skeleton-line.short{width:46%}
@keyframes govo-shimmer{0%{background-position:0 0}100%{background-position:-220% 0}}
.govo-voice-shell{
  position:fixed;
  left:50%;
  bottom:calc(74px + env(safe-area-inset-bottom));
  width:min(452px,calc(100vw - 28px));
  transform:translateX(-50%);
  z-index:25;
  padding:10px;
  border-radius:28px;
  background:rgba(253,253,249,.94);
  border:1px solid rgba(235,235,224,.96);
  box-shadow:0 18px 48px rgba(9,79,57,.18);
  backdrop-filter:blur(18px);
}
.govo-voice-btn{
  min-height:62px;
  width:100%;
  border:0;
  border-radius:999px;
  background:linear-gradient(135deg,var(--govo-emerald-700),var(--govo-emerald-600));
  color:#fffef8;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  font-size:17px;
  font-weight:900;
  cursor:pointer;
}
.govo-voice-btn.recording{
  background:linear-gradient(135deg,var(--govo-gold-500),#e8cd74);
  color:#241b08;
  animation:govo-pulse 1.15s ease-in-out infinite;
}
@keyframes govo-pulse{50%{box-shadow:0 0 0 8px rgba(212,175,55,.16)}}
.govo-bottom-nav{
  position:fixed;
  left:50%;
  bottom:calc(10px + env(safe-area-inset-bottom));
  width:min(452px,calc(100vw - 28px));
  transform:translateX(-50%);
  z-index:30;
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:6px;
  padding:8px;
  border-radius:28px;
  background:rgba(3,36,27,.94);
  border:1px solid rgba(245,245,238,.12);
  box-shadow:0 18px 48px rgba(0,0,0,.24);
  backdrop-filter:blur(18px);
}
.govo-bottom-nav a,.govo-bottom-nav button{
  min-height:54px;
  border:0;
  border-radius:20px;
  background:transparent;
  color:#dcece5;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  font-size:11px;
  font-weight:800;
}
.govo-bottom-nav b{font-size:19px;line-height:1}
.govo-bottom-nav .active{background:rgba(253,248,235,.13);color:#fffef8}
.govo-admin-link{display:none}
.govo-page-footer{padding:8px 4px 2px;color:#74817a;font-size:12px;text-align:center}
@media(max-width:360px){
  .govo-mobile-shell{padding-left:10px;padding-right:10px}
  .govo-title{font-size:30px}
  .govo-grid{gap:8px}
  .govo-category-card{padding:12px;min-height:108px}
  .govo-action-card{padding:12px}
  .govo-mini-actions{grid-template-columns:1fr}
  .govo-bottom-nav{width:calc(100vw - 18px)}
  .govo-voice-shell{width:calc(100vw - 18px)}
}
@media(min-width:760px){
  .govo-app-frame{min-height:calc(100svh - 24px);margin-top:12px;margin-bottom:12px;border-radius:28px}
}
`;
}

function ctaButton(options = {}) {
  const variant = options.variant || "primary";
  const size = options.size === "lg" ? "govo-btn-lg" : "";
  const tag = options.href ? "a" : "button";
  const label = options.label || options.children || "চালিয়ে যান";
  const loading = options.isLoading ? `<span class="govo-spinner" aria-hidden="true"></span>` : "";
  const leftIcon = options.leftIcon ? `<span aria-hidden="true">${esc(options.leftIcon)}</span>` : "";
  return `<${tag} class="govo-btn govo-btn-${esc(variant)} ${size} ${options.isLoading ? "govo-btn-loading" : ""}" ${attrs({ href: options.href, type: tag === "button" ? "button" : undefined })}>${loading || leftIcon}<span>${esc(label)}</span></${tag}>`;
}

function trustBadge(type = "secure") {
  const item = COPY.trust[type] || COPY.trust.secure;
  const tone = type === "fast" ? "gold" : "";
  return `<span class="govo-trust-badge ${tone}"><span aria-hidden="true">${esc(item.emoji)}</span>${esc(item.label)}</span>`;
}

function statusChip(status = "pending") {
  const safe = COPY.status[status] ? status : "pending";
  return `<span class="govo-status-chip govo-status-${safe}">${esc(COPY.status[safe])}</span>`;
}

function categoryCard(options = {}) {
  const active = options.isActive ? "active" : "";
  const tag = options.href ? "a" : "button";
  return `<${tag} class="govo-card govo-category-card ${active}" ${attrs({ href: options.href, type: tag === "button" ? "button" : undefined })}>
    <span class="govo-category-emoji" aria-hidden="true">${esc(options.emoji || "📦")}</span>
    <span><b>${esc(options.banglaTitle || options.title || "সার্ভিস")}</b><span>${esc(options.title || "")}</span></span>
  </${tag}>`;
}

function requestCard(options = {}) {
  return `<article class="govo-card govo-request-card">
    <div class="govo-request-top">
      <div><div class="govo-request-id">ID: ${esc(options.id || "#GV-0001")}</div><h3 class="govo-request-title">${esc(options.title || "ডেলিভারি রিকোয়েস্ট")}</h3></div>
      ${statusChip(options.status || "processing")}
    </div>
    <div class="govo-trust-row">${trustBadge("secure")}${trustBadge("verified")}</div>
    <div class="govo-request-meta"><span>${esc(options.date || "আজ")}</span>${options.price ? `<b>${esc(options.price)}</b>` : ""}</div>
    ${ctaButton({ variant: "secondary", label: options.actionLabel || "বিস্তারিত দেখুন", href: options.href || "/track?classic=1" })}
  </article>`;
}

function emptyState(options = {}) {
  return `<section class="govo-card govo-empty">
    <div class="govo-empty-emoji" aria-hidden="true">${esc(options.emoji || "📭")}</div>
    <h3>${esc(options.title || "এখনো কিছু নেই")}</h3>
    <p>${esc(options.description || "নতুন তথ্য এলে এখানে দেখা যাবে।")}</p>
    ${options.actionLabel ? ctaButton({ variant: "secondary", label: options.actionLabel, href: options.href || "#" }) : ""}
  </section>`;
}

function loadingState() {
  return `<section class="govo-skeleton" aria-label="লোড হচ্ছে">
    <div class="govo-skeleton-box"></div>
    <div class="govo-card govo-request-card">
      <div class="govo-skeleton-line short"></div>
      <div class="govo-skeleton-line"></div>
      <div class="govo-skeleton-line"></div>
    </div>
  </section>`;
}

function errorState(options = {}) {
  return `<section class="govo-card govo-error">
    <div class="govo-error-emoji" aria-hidden="true">!</div>
    <h3>সমস্যা হয়েছে</h3>
    <p>${esc(options.message || "ডাটা লোড করা যায়নি। আবার চেষ্টা করুন।")}</p>
    ${ctaButton({ variant: "secondary", label: options.actionLabel || "আবার চেষ্টা করুন", href: options.href || "#" })}
  </section>`;
}

function header(options = {}) {
  return `<header class="govo-header">
    <a class="govo-brand" href="/">
      <span class="govo-logo" aria-hidden="true">G</span>
      <span class="govo-brand-title"><b>GOVO Express</b><span>${esc(options.subtitle || "লোকাল প্রিমিয়াম ট্রাস্ট OS")}</span></span>
    </a>
    <div class="govo-header-actions">
      <button class="govo-lang" type="button" aria-label="Language">বাং</button>
      <a class="govo-icon-btn" href="/notify" aria-label="Notifications">🔔<span class="govo-notify-dot"></span></a>
      <span class="govo-icon-btn" aria-label="Online"><span class="govo-avatar-dot"></span></span>
    </div>
  </header>`;
}

function bottomNav(options = {}) {
  const role = options.role === "operator" ? "operator" : "user";
  const active = options.activeTab || "home";
  const tabs = role === "operator" ? [
    { id: "queue", label: "ডিউটি", icon: "☑", href: "/admin/orders?classic=1" },
    { id: "map", label: "ম্যাপ", icon: "⌖", href: "/track?classic=1" },
    { id: "scanner", label: "স্ক্যানার", icon: "▣", href: "/notify" },
    { id: "admin", label: "অ্যাডমিন", icon: "⚙", href: "/admin/login?classic=1", hidden: true }
  ] : [
    { id: "home", label: "হোম", icon: "⌂", href: "/" },
    { id: "orders", label: "অর্ডার", icon: "□", href: "/track" },
    { id: "voice", label: "ভয়েস", icon: "🎙️", href: "#voice" },
    { id: "profile", label: "প্রোফাইল", icon: "◯", href: "/merchant" }
  ];
  return `<nav class="govo-bottom-nav" aria-label="${role === "operator" ? "Operator navigation" : "User navigation"}">
    ${tabs.map((tab) => `<a class="${tab.id === active ? "active" : ""} ${tab.hidden ? "govo-admin-link" : ""}" href="${esc(tab.href)}"><b>${esc(tab.icon)}</b><span>${esc(tab.label)}</span></a>`).join("")}
  </nav>`;
}

function voiceRequest(options = {}) {
  const recording = !!options.isRecording;
  return `<div class="govo-voice-shell" id="voice">
    <button class="govo-voice-btn ${recording ? "recording" : ""}" type="button" aria-pressed="${recording ? "true" : "false"}">
      <span aria-hidden="true">🎙️</span><span>${recording ? "শুনছি, বলুন..." : "ট্যাপ করে বলুন"}</span>
    </button>
  </div>`;
}

function mobileShell(options = {}) {
  return `<!doctype html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(options.title || "GOVO Express")}</title>
  <meta name="description" content="${esc(options.description || "GOVO Express local premium trust delivery operating system.")}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>${css()}</style>
</head>
<body data-govo-ui-foundation="phase1">
  <div class="govo-app-frame">
    <div class="govo-mobile-shell">
      ${header(options)}
      <main class="govo-content">${options.body || ""}</main>
      <div class="govo-page-footer">GOVO Express · Local Premium Trust OS</div>
    </div>
  </div>
  ${options.voice === false ? "" : voiceRequest(options.voice || {})}
  ${bottomNav({ role: options.role, activeTab: options.activeTab })}
</body>
</html>`;
}

module.exports = {
  BRAND,
  COPY,
  css,
  ctaButton,
  trustBadge,
  statusChip,
  categoryCard,
  requestCard,
  emptyState,
  loadingState,
  errorState,
  header,
  bottomNav,
  voiceRequest,
  mobileShell
};
