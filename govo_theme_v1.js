module.exports = function mountGovoThemeV2(app) {
  const css = `
:root{
  --bg:#061411;--bg2:#0a1f1a;--card:#0d241f;--card2:#102e27;
  --line:#1f5146;--text:#f6fff9;--muted:#a8cabe;
  --green:#22c77a;--green2:#8fffd1;--gold:#ffd166;--nav:#06100e;
  --shadow:0 18px 50px rgba(0,0,0,.34);
}
*{box-sizing:border-box}
html,body{
  margin:0!important;background:
  radial-gradient(circle at 20% 0%,rgba(34,199,122,.18),transparent 32%),
  linear-gradient(180deg,var(--bg),var(--bg2))!important;
  color:var(--text)!important;
  font-family:Inter,Arial,Roboto,Noto Sans Bengali,Noto Sans,system-ui,sans-serif!important;
  overflow-x:hidden!important;
}
body{padding-top:76px!important;padding-bottom:96px!important}
body *{font-family:Inter,Arial,Roboto,Noto Sans Bengali,Noto Sans,system-ui,sans-serif!important}
a{color:inherit}
button,input,select,textarea{font-family:inherit!important}
.govo-v2-top{
  position:fixed;top:0;left:0;right:0;z-index:99999;height:72px;
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:0 16px;background:rgba(6,20,17,.96);backdrop-filter:blur(16px);
  border-bottom:1px solid var(--line);
}
.govo-v2-brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--text)}
.govo-v2-logo{
  width:44px;height:44px;border-radius:16px;display:grid;place-items:center;
  color:#03120d;font-weight:950;background:linear-gradient(135deg,var(--green),var(--green2));
  box-shadow:0 0 28px rgba(34,199,122,.24)
}
.govo-v2-title b{display:block;font-size:18px;line-height:1.05}
.govo-v2-title span{display:block;font-size:11px;color:var(--muted);margin-top:2px}
.govo-v2-actions{display:flex;gap:8px;align-items:center}
.govo-v2-pill{
  border:1px solid var(--line);background:rgba(16,46,39,.68);color:var(--text);
  border-radius:999px;padding:10px 12px;font-size:13px;text-decoration:none;
  display:inline-flex;gap:7px;align-items:center;cursor:pointer
}
.govo-v2-drawer{
  position:fixed;right:14px;top:82px;width:min(360px,calc(100vw - 28px));z-index:99999;
  background:rgba(8,24,20,.98);border:1px solid var(--line);border-radius:24px;
  box-shadow:var(--shadow);padding:14px;display:none
}
.govo-v2-drawer.open{display:block}
.govo-v2-drawer a{
  display:flex;justify-content:space-between;align-items:center;text-decoration:none;
  border:1px solid var(--line);border-radius:16px;padding:13px;margin:8px 0;
  background:rgba(255,255,255,.035);color:var(--text);font-weight:800
}
.govo-v2-bottom{
  position:fixed;left:14px;right:14px;bottom:12px;z-index:99999;height:64px;
  display:grid;grid-template-columns:repeat(5,1fr);overflow:hidden;
  background:rgba(5,10,15,.96);border:1px solid var(--line);border-radius:24px;
  box-shadow:var(--shadow);backdrop-filter:blur(16px)
}
.govo-v2-bottom a{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  color:var(--muted);text-decoration:none;font-size:11px;font-weight:750
}
.govo-v2-bottom a b{font-size:18px}
.govo-v2-bottom a.active,.govo-v2-bottom a:hover{color:var(--green2);background:rgba(34,199,122,.08)}
.govo-v2-wa{
  position:fixed;right:18px;bottom:90px;z-index:99998;width:52px;height:52px;
  border-radius:18px;background:linear-gradient(135deg,var(--green),var(--green2));
  color:#03120d;display:grid;place-items:center;font-weight:950;text-decoration:none;
  box-shadow:0 14px 36px rgba(34,199,122,.25)
}
.govo-shell-top:not(.govo-v2-top), body > nav.govo-bottom:not(.govo-v2-bottom){display:none!important}
.card,.panel,.hero-card,.role,section,main .box{
  border-radius:24px!important;
}
main,section,.container,.wrap{
  max-width:100%!important;
}
h1{font-size:clamp(38px,7vw,64px)!important;line-height:1.03!important;letter-spacing:-1.6px!important}
h2{font-size:clamp(28px,5vw,42px)!important;line-height:1.08!important}
h3{font-size:22px!important}
p{line-height:1.58!important}
input,select,textarea{
  border-radius:18px!important;background:#070b1d!important;color:var(--text)!important;
  border:1px solid rgba(143,255,209,.18)!important;
}
button,.btn,input[type=submit]{
  border-radius:18px!important;font-weight:850!important;
}
@media(max-width:640px){
  body{padding-top:72px!important;padding-bottom:96px!important}
  .govo-v2-top{height:72px;padding:0 14px}
  .govo-v2-logo{width:42px;height:42px}
  .govo-v2-title b{font-size:17px}
  .govo-v2-title span{display:none}
  .govo-v2-pill{font-size:0;padding:10px}
  .govo-v2-pill span{font-size:18px}
  .govo-v2-bottom{left:10px;right:10px;bottom:10px;height:62px;border-radius:22px}
  .govo-v2-bottom a{font-size:10px}
  h1{font-size:40px!important;line-height:1.04!important;letter-spacing:-1px!important}
  h2{font-size:30px!important}
  p{font-size:15px!important}
}
  `;

  const shell = `
<header class="govo-v2-top" data-govo-shell-v2="1">
  <a class="govo-v2-brand" href="/">
    <div class="govo-v2-logo">G</div>
    <div class="govo-v2-title"><b>GOVO Express</b><span>Local premium trust delivery OS</span></div>
  </a>
  <div class="govo-v2-actions">
    <a class="govo-v2-pill" href="/notify"><span>🔔</span> Notify</a>
    <a class="govo-v2-pill" href="https://wa.me/" target="_blank"><span>💬</span> Help</a>
    <button class="govo-v2-pill" onclick="window.govoV2Menu&&window.govoV2Menu()"><span>☰</span></button>
  </div>
</header>
<div class="govo-v2-drawer" id="govoV2Drawer" data-govo-shell-v2="1">
  <a href="/">Customer App <span>→</span></a>
  <a href="/shops">Shops & Delivery <span>→</span></a>
  <a href="/services">Services <span>→</span></a>
  <a href="/merchant">Merchant Partner <span>→</span></a>
  <a href="/rider">Rider Fleet <span>→</span></a>
  <a href="/admin/login">Admin OS <span>→</span></a>
  <a href="/notify">Notification Center <span>→</span></a>
</div>
<nav class="govo-v2-bottom" data-govo-shell-v2="1">
  <a href="/"><b>⌂</b><span>Home</span></a>
  <a href="/shops"><b>🏪</b><span>Shops</span></a>
  <a href="/services"><b>🛠</b><span>Services</span></a>
  <a href="/track"><b>📍</b><span>Track</span></a>
  <a href="/merchant"><b>➕</b><span>Join</span></a>
</nav>
<a class="govo-v2-wa" href="https://wa.me/" target="_blank" data-govo-shell-v2="1">WA</a>
<script data-govo-shell-v2="1">
window.govoV2Menu=function(){var d=document.getElementById('govoV2Drawer'); if(d)d.classList.toggle('open');};
</script>
`;

  app.get("/govo-theme-v1.css", (req, res) => {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.send(css);
  });

  app.use((req, res, next) => {
    const oldSend = res.send.bind(res);
    res.send = function patchedSend(body) {
      try {
        if (typeof body === "string" && body.toLowerCase().includes("<html") && !body.includes("data-govo-shell-v2")) {
          body = body.replace(/<\/head>/i, `<link rel="stylesheet" href="/govo-theme-v1.css"></head>`);
          body = body.replace(/<body([^>]*)>/i, "<body$1>" + shell);
        }
      } catch(e){}
      return oldSend(body);
    };
    next();
  });

  console.log("✅ GOVO UI Merge v2 mounted");
};
