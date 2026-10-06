(() => {
  const btn = document.querySelector('[data-menu]');
  const menu = document.querySelector('#mobileMenu');
  if (btn && menu) {
    const close=()=>{menu.classList.remove('open');btn.setAttribute('aria-expanded','false')};
    btn.addEventListener('click', () => btn.setAttribute('aria-expanded',String(menu.classList.toggle('open'))));
    menu.addEventListener('click',e=>{if(e.target.closest('a')) close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') close()});
    document.addEventListener('click', e => {
      if (!e.target.closest('[data-menu]') && !e.target.closest('#mobileMenu')) menu.classList.remove('open');
    });
  }
  const q = document.querySelector('#govoSearch');
  const go = document.querySelector('#govoSearchGo');
  const send = () => {
    const v = (q?.value || '').trim();
    const url = v ? `https://app.govoexpress.com/shops?q=${encodeURIComponent(v)}` : 'https://app.govoexpress.com/shops';
    location.href = url;
  };
  go?.addEventListener('click', send);
  q?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
})();
;(()=>{const GOVO_MAIN_THEME_SYNC_2026_10_02=true,r=document.documentElement,m=matchMedia("(prefers-color-scheme: light)"),get=()=>localStorage.getItem("govo_theme")||"system",res=v=>v==="system"?(m.matches?"light":"dark"):v,apply=v=>{const t=res(v);r.dataset.theme=t;r.dataset.themeMode=v;const b=document.querySelector(".theme-switch");if(b){b.textContent=t==="light"?"☀":"☾";b.setAttribute("aria-label","থিম বদলান")}};apply(get());addEventListener("DOMContentLoaded",()=>{const h=document.querySelector(".nav-actions");if(h&&!h.querySelector(".theme-switch")){const b=document.createElement("button");b.type="button";b.className="theme-switch";b.onclick=()=>{const n=r.dataset.theme==="light"?"dark":"light";localStorage.setItem("govo_theme",n);apply(n)};h.insertBefore(b,h.querySelector(".hamb")||null);apply(get())}});m.addEventListener&&m.addEventListener("change",()=>{if(get()==="system")apply("system")})})();

;(() => {
  const B='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons={
    Food:`<svg ${B}><path d="M7 3v7M4.5 3v4a2.5 2.5 0 0 0 5 0V3M7 10v11"/><path d="M16 3v18M16 3c3 2 4 5 4 8h-4"/></svg>`,
    Groceries:`<svg ${B}><path d="M4 5h2l2 10h9l2-7H7"/><circle cx="10" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>`,
    Parcel:`<svg ${B}><path d="m4 7 8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>`,
    Ride:`<svg ${B}><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 18 9.5 9h4l4.5 9M8 13h8M9.5 9 8 6h-2"/></svg>`,
    'Home Services':`<svg ${B}><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.8V21h13V9.8"/><path d="M9.2 21v-6.4h5.6V21"/></svg>`,
    Health:`<svg ${B}><path d="M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.7-7 10-7 10z"/><path d="M9 12h6M12 9v6"/></svg>`,
    More:`<svg ${B}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`
  };
  addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.service').forEach(a=>{
      const key=a.dataset.serviceKey||(a.querySelector('b')?.textContent||'').trim();
      const box=a.querySelector('.ico');
      if(box&&icons[key]) box.innerHTML=icons[key];
    });
    const phoneKeys=['Food','Groceries','Ride','Parcel','Home Services','More'];
    document.querySelectorAll('.phone-grid span').forEach((box,i)=>{
      const key=phoneKeys[i];
      if(icons[key]) box.innerHTML=icons[key];
    });
  });
})();