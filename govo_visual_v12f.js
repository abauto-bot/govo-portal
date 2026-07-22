function css() {
  return `
  .govo-logo-premium{
    display:flex;align-items:center;justify-content:center;gap:2px;
    height:46px;min-width:145px;color:#f8fff9;font-weight:1000;letter-spacing:0;
    transform:translateZ(0);
  }
  .govo-logo-premium .speed{
    width:30px;height:20px;position:relative;margin-right:-3px;
  }
  .govo-logo-premium .speed:before,
  .govo-logo-premium .speed:after{
    content:"";position:absolute;right:0;height:4px;border-radius:999px;
    background:linear-gradient(90deg,transparent,#39e59b);
  }
  .govo-logo-premium .speed:before{top:4px;width:30px}
  .govo-logo-premium .speed:after{bottom:4px;width:22px}
  .govo-logo-premium .g{
    font-size:34px;line-height:1;font-weight:1000;
  }
  .govo-logo-premium .o-clock{
    width:36px;height:36px;border-radius:50%;margin-left:1px;
    border:6px solid #39e59b;position:relative;background:#f7fff9;
    box-shadow:inset 0 0 0 2px rgba(0,0,0,.06),0 10px 24px rgba(57,229,155,.30);
  }
  .govo-logo-premium .o-clock:before{
    content:"";position:absolute;left:50%;top:6px;width:2px;height:12px;
    background:#03120d;border-radius:99px;transform:translateX(-50%);
  }
  .govo-logo-premium .o-clock:after{
    content:"";position:absolute;left:50%;top:50%;width:11px;height:2px;
    background:#03120d;border-radius:99px;transform-origin:left center;transform:rotate(42deg);
  }
  .govo-logo-premium .tick{
    position:absolute;left:50%;top:50%;width:5px;height:5px;background:#03120d;border-radius:50%;
    transform:translate(-50%,-50%);
  }

  .govo-hero-v12f{
    position:relative;overflow:hidden;border-radius:28px;margin:2px 0 0;
    min-height:292px;padding:27px 22px;color:#fff;
    background:
      radial-gradient(circle at 84% 22%,rgba(88,242,173,.44),transparent 29%),
      radial-gradient(circle at 17% 0%,rgba(232,198,109,.24),transparent 32%),
      linear-gradient(145deg,#000503 0%,#042219 43%,#08704e 100%);
    border:1px solid rgba(207,255,232,.40);
    box-shadow:0 42px 115px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.20);
    backdrop-filter:blur(24px) saturate(1.08);
  }
  .govo-hero-v12f:before{
    content:"";position:absolute;right:-54px;top:-60px;width:220px;height:220px;
    border:18px solid rgba(255,255,255,.20);border-radius:50%;
  }
  .govo-hero-v12f:after{
    content:"";position:absolute;inset:0;
    background:
      linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px),
      linear-gradient(120deg,rgba(255,255,255,.20),transparent 34%,rgba(255,255,255,.07));
    background-size:34px 34px,34px 34px,auto;
    pointer-events:none;
    opacity:.92;
  }
  .govo-hero-v12f .govo-hero-cta{position:relative;z-index:4}
  .govo-hero-content{position:relative;z-index:3;max-width:58%}
  .govo-hero-kicker{
    display:inline-flex;padding:7px 10px;border-radius:999px;
    border:1px solid rgba(173,255,216,.54);background:rgba(255,255,255,.13);
    font-size:12px;font-weight:950;letter-spacing:0;
    margin-bottom:12px;color:#dfffee;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.13);
  }
  .govo-hero-title{
    margin:0;font-size:38px;line-height:1.02;letter-spacing:0;font-weight:1000;
    text-shadow:0 3px 18px rgba(0,0,0,.25);
  }
  .govo-hero-sub{
    margin:12px 0 18px;color:rgba(237,255,246,.96);font-weight:750;font-size:15.5px;line-height:1.48;
  }
  .govo-hero-cta{
    display:inline-flex;align-items:center;gap:10px;border-radius:16px;padding:13px 16px;
    background:linear-gradient(135deg,#d6ffea,#39e59b 46%,#0ca66c);color:#02110a;font-weight:1000;
    box-shadow:0 18px 40px rgba(12,166,108,.36), inset 0 1px 0 rgba(255,255,255,.55);
  }
  .govo-hero-cta:hover{filter:saturate(1.08) brightness(1.03)}
  .govo-hero-proof{
    position:relative;z-index:4;display:flex;gap:7px;flex-wrap:wrap;margin-top:13px;
  }
  .govo-hero-proof span{
    display:inline-flex;align-items:center;min-height:28px;padding:6px 9px;border-radius:999px;
    color:#eafff5;background:rgba(1,16,12,.40);border:1px solid rgba(207,255,232,.28);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.10);font-size:11px;font-weight:900;
    backdrop-filter:blur(14px);
  }

  .govo-quick-actions{
    display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:12px 0;
  }
  .govo-quick-action{
    min-height:68px;border-radius:20px;padding:11px 10px;
    border:1px solid rgba(207,255,232,.30);
    background:
      linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.030)),
      linear-gradient(180deg,rgba(18,86,67,.88),rgba(3,21,17,.82));
    color:#f8fff9;display:flex;flex-direction:column;justify-content:center;gap:4px;
    box-shadow:0 24px 64px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.15);
    backdrop-filter:blur(22px) saturate(1.08);
  }
  .govo-quick-action b{font-size:12px;line-height:1.2}
  .govo-quick-action span{font-size:10px;line-height:1.25;color:#cfeadd;font-weight:750}
  .govo-quick-action:hover{border-color:rgba(88,242,173,.46);transform:translateY(-1px)}

  .govo-rider-art{
    position:absolute;right:7px;bottom:10px;width:178px;height:168px;z-index:2;
  }
  .govo-rider-art .clock{
    position:absolute;right:18px;top:0;width:92px;height:92px;border-radius:50%;
    background:#f8fff9;border:7px solid rgba(255,255,255,.35);
    box-shadow:0 16px 30px rgba(0,0,0,.20),inset 0 0 0 2px rgba(4,122,61,.14);
  }
  .govo-rider-art .clock:before{
    content:"";position:absolute;left:50%;top:18px;width:3px;height:27px;background:#07140d;border-radius:20px;
    transform:translateX(-50%);
  }
  .govo-rider-art .clock:after{
    content:"";position:absolute;left:50%;top:50%;width:25px;height:3px;background:#07140d;border-radius:20px;
    transform-origin:left center;transform:rotate(45deg);
  }
  .govo-rider-art .dot{
    position:absolute;left:50%;top:50%;width:8px;height:8px;background:#07140d;border-radius:50%;
    transform:translate(-50%,-50%);
  }
  .govo-rider-art .box{
    position:absolute;right:0;bottom:47px;width:72px;height:62px;border-radius:16px;
    background:linear-gradient(135deg,#39e59b,#087234);box-shadow:0 18px 32px rgba(0,0,0,.26);
  }
  .govo-rider-art .box:after{
    content:"GOVO";position:absolute;left:12px;top:20px;color:#fff;font-weight:950;font-size:13px;
  }
  .govo-rider-art .body{
    position:absolute;right:82px;bottom:62px;width:44px;height:54px;border-radius:22px 22px 12px 12px;
    background:#18b979;box-shadow:0 12px 25px rgba(0,0,0,.22);
  }
  .govo-rider-art .head{
    position:absolute;right:91px;bottom:111px;width:34px;height:34px;border-radius:50%;
    background:#ffd2a3;border:5px solid #087234;
  }
  .govo-rider-art .bike{
    position:absolute;right:44px;bottom:12px;width:118px;height:62px;border-radius:70px 70px 22px 22px;
    background:linear-gradient(135deg,#39e59b,#087234);box-shadow:0 18px 30px rgba(0,0,0,.26);
  }
  .govo-rider-art .bike:before,
  .govo-rider-art .bike:after{
    content:"";position:absolute;bottom:-18px;width:38px;height:38px;border-radius:50%;
    border:8px solid #06170d;background:#fff;
  }
  .govo-rider-art .bike:before{left:8px}
  .govo-rider-art .bike:after{right:6px}
  .govo-rider-art .light{
    position:absolute;right:36px;bottom:62px;width:27px;height:27px;border-radius:50%;
    background:#d9ff86;box-shadow:0 0 24px rgba(217,255,134,.9);
  }

  .govo-banner{
    position:relative;overflow:hidden;
    background:
      radial-gradient(circle at 86% 18%,rgba(57,229,155,.25),transparent 24%),
      radial-gradient(circle at 8% 8%,rgba(232,198,109,.14),transparent 24%),
      linear-gradient(135deg,#010c08,#063326 58%,#086348)!important;
    border:1px solid rgba(207,255,232,.32)!important;
    box-shadow:0 32px 88px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.14)!important;
    backdrop-filter:blur(22px) saturate(1.08);
  }
  .govo-banner:after{
    content:"";position:absolute;right:18px;bottom:18px;width:96px;height:70px;border-radius:18px;
    background:
      linear-gradient(90deg,#fff 0 24%,#16A34A 24% 42%,#fff 42% 60%,#16A34A 60% 78%,#fff 78%),
      linear-gradient(135deg,#19c967,#087234);
    box-shadow:0 14px 26px rgba(0,0,0,.18);
    opacity:.92;
  }
  .govo-banner h3,.govo-banner p,.govo-banner a{position:relative;z-index:2}

  .flow-svg svg{stroke:#58f2ad}
  .govo-service-card{
    transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;
  }
  .govo-service-card:active{transform:scale(.97)}
  .govo-service-card:hover{border-color:rgba(88,242,173,.42);box-shadow:0 24px 58px rgba(0,0,0,.30)}

  .govo-logo-premium{
    filter:drop-shadow(0 16px 26px rgba(0,0,0,.32));
  }

  @media(max-width:420px){
    .govo-logo-premium{min-width:132px}
    .govo-logo-premium .g{font-size:31px}
    .govo-logo-premium .o-clock{width:33px;height:33px;border-width:5px}
    .govo-hero-v12f{min-height:248px;padding:21px 17px}
    .govo-hero-content{max-width:64%}
    .govo-hero-title{font-size:31px}
    .govo-hero-sub{font-size:14px}
    .govo-rider-art{right:-6px;bottom:6px;transform:scale(.88);transform-origin:right bottom}
    .govo-quick-actions{gap:8px}
    .govo-quick-action{min-height:64px;padding:10px 8px}
    .govo-hero-proof span{font-size:10.5px;min-height:26px;padding:5px 8px}
  }
  @media(max-width:360px){
    .govo-quick-actions{grid-template-columns:1fr 1fr}
    .govo-hero-content{max-width:68%}
    .govo-hero-title{font-size:29px}
  }
  `;
}

function logo() {
  return `
    <a class="govo-master-live-logo" href="/app" aria-label="GOVO Express">
      <img src="/uploads/govo-logo.png" alt="GOVO"/>
      <span class="govo-master-live-copy">
        <strong>GOVO EXPRESS</strong>
        <small>OPERATION • TRUST • SPEED • EASY</small>
      </span>
    </a>
  `;
}

function hero(base, href) {
  return `
  <section class="govo-hero-v12f">
    <div class="govo-hero-content">
      <div class="govo-hero-kicker">GOVO Express</div>
      <h2 class="govo-hero-title">GOVO at<br/>your door.</h2>
      <p class="govo-hero-sub">Delivery, shops and home services with quick local support.</p>
      <a class="govo-hero-cta" href="${href(base,"order")}">Book now →</a>
      <div class="govo-hero-proof"><span>Fast pickup</span><span>Trusted local help</span></div>
    </div>
    <div class="govo-rider-art" aria-hidden="true">
      <div class="clock"><span class="dot"></span></div>
      <div class="box"></div>
      <div class="head"></div>
      <div class="body"></div>
      <div class="bike"></div>
      <div class="light"></div>
    </div>
  </section>`;
}


/* GOVO_MASTER_LIVE_LOGO_V1 */
const GOVO_MASTER_LIVE_LOGO_CSS = `
.govo-master-live-logo{
  display:flex;
  align-items:center;
  gap:9px;
  color:inherit;
  text-decoration:none;
  min-width:0;
}
.govo-master-live-logo img{
  width:46px;
  height:46px;
  object-fit:contain;
  display:block;
  flex:0 0 46px;
}
.govo-master-live-copy{
  display:flex;
  flex-direction:column;
  line-height:1;
  min-width:0;
}
.govo-master-live-copy strong{
  color:#f7fff9;
  font-size:14px;
  font-weight:950;
  white-space:nowrap;
  letter-spacing:.01em;
}
.govo-master-live-copy small{
  color:#a8e82f;
  font-size:5.5px;
  font-weight:900;
  letter-spacing:.07em;
  white-space:nowrap;
  margin-top:5px;
}
@media(max-width:420px){
  .govo-master-live-logo img{width:40px;height:40px;flex-basis:40px}
  .govo-master-live-copy strong{font-size:12px}
  .govo-master-live-copy small{font-size:4.8px;letter-spacing:.04em}
}
`;

module.exports = { css: () => css() + GOVO_MASTER_LIVE_LOGO_CSS, logo, hero };
