module.exports = `
:root{
  --bg:#06110d;
  --bg2:#0a1f17;
  --card:#0f2b20;
  --card2:#12382a;
  --text:#f7fff9;
  --muted:#b8d7c6;
  --line:rgba(180,255,214,.18);
  --brand:#b7ff2a;
  --brand2:#22c55e;
  --brandDeep:#0f7a3f;
}
*{box-sizing:border-box}
html,body{margin:0;background:linear-gradient(180deg,var(--bg),#020806);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}
a{text-decoration:none;color:inherit}
button,input,textarea,select{font:inherit}
.v20-shell{max-width:980px;margin:0 auto;min-height:100vh;padding:14px 14px 100px}
.v20-top{display:flex;align-items:center;justify-content:space-between;padding:8px 0 16px;position:sticky;top:0;z-index:30;background:linear-gradient(180deg,rgba(6,17,13,.96),rgba(6,17,13,.70),transparent);backdrop-filter:blur(14px)}
.v20-brand{display:flex;align-items:center;gap:10px}
.v20-brand img{width:48px;height:48px;object-fit:contain}
.v20-brand strong{display:block;font-size:18px;letter-spacing:.02em}
.v20-brand small{display:block;color:var(--muted);font-size:10px;margin-top:2px}
.v20-icon-btn{width:46px;height:46px;border-radius:15px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:#fff;display:grid;place-items:center}
.v20-hero{border:1px solid var(--line);border-radius:28px;padding:24px;background:
radial-gradient(circle at 88% 18%,rgba(183,255,42,.16),transparent 28%),
linear-gradient(145deg,#0a1b14,#0d3426 55%,#0f5839);box-shadow:0 24px 70px rgba(0,0,0,.36)}
.v20-kicker{display:inline-flex;padding:7px 11px;border-radius:999px;border:1px solid rgba(183,255,42,.35);color:var(--brand);font-size:12px;font-weight:800}
.v20-hero h1{font-size:clamp(36px,8vw,62px);line-height:.98;margin:14px 0 12px}
.v20-hero p{color:var(--muted);font-size:15px;line-height:1.6;max-width:620px}
.v20-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.v20-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 16px;border-radius:16px;background:linear-gradient(135deg,var(--brand),#70e52d);color:#102006;font-weight:900;border:0}
.v20-btn.secondary{background:rgba(255,255,255,.06);color:#fff;border:1px solid var(--line)}
.v20-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
.v20-card{border:1px solid var(--line);border-radius:20px;padding:16px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)),var(--card);min-height:116px}
.v20-card svg{width:30px;height:30px;color:#70f3a8}
.v20-card b{display:block;margin-top:14px;font-size:15px}
.v20-card span{display:block;color:var(--muted);font-size:12px;margin-top:4px}
.v20-search{margin-top:14px;border:1px solid var(--line);border-radius:18px;padding:12px 14px;background:#0b241a;display:flex;gap:10px;align-items:center}
.v20-search input{flex:1;background:transparent;border:0;outline:0;color:#fff}
.v20-bottom{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:min(720px,calc(100% - 20px));display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:8px;border:1px solid var(--line);border-radius:24px;background:rgba(5,20,14,.94);backdrop-filter:blur(18px);z-index:40}
.v20-nav{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:54px;border-radius:16px;color:#cbe8d7;font-size:11px;font-weight:800}
.v20-nav svg{width:20px;height:20px}
.v20-nav.active{background:rgba(183,255,42,.10);color:var(--brand)}
.v20-ai{position:relative}
.v20-ai-orb{width:58px;height:58px;border-radius:20px;background:#07110d;border:1px solid rgba(183,255,42,.55);display:grid;place-items:center;margin-top:-20px;box-shadow:0 14px 34px rgba(0,0,0,.4)}
.v20-ai-orb img{width:44px;height:44px;object-fit:contain}
@media(max-width:700px){
  .v20-shell{padding:10px 10px 94px}
  .v20-grid{grid-template-columns:repeat(2,1fr)}
  .v20-hero{padding:18px;border-radius:24px}
  .v20-card{min-height:100px;padding:14px}
}
`;
