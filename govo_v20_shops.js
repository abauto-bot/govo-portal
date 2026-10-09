// GOVO V20 browse family: Shops / Category / Shop detail / Services
// Renders on the shared V20 shell (govo_v20_pages.shell) with shared design
// tokens (govo_v20_theme). Server-rendered; data supplied by server.js
// handlers (real DB queries stay in server.js).

const { shell } = require('./govo_v20_pages');
const { icon } = require('./govo_v20_icons');

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function imgThumb(src, alt, iconName) {
  const safe = String(src || '').trim();
  if (!/^\/uploads\/[A-Za-z0-9._-]+$/i.test(safe) && !/^https?:\/\//i.test(safe)) {
    return `<span class="v20-thumb">${icon(iconName || 'shops')}</span>`;
  }
  return `<img class="v20-thumb" src="${esc(safe)}" alt="${esc(alt || 'GOVO')}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'v20-thumb',textContent:'GOVO'}))">`;
}

function trustLine(x) {
  const bits = [];
  if (x && x.is_verified) bits.push('Verified');
  if (x && x.is_trusted) bits.push('Trusted');
  const rating = Number((x && x.rating_avg) || 0);
  if (rating > 0) bits.push(`★ ${rating.toFixed(1)}`);
  return bits.length ? `<div class="v20-trust">${esc(bits.join(' · '))}</div>` : '';
}

function loadingScript() {
  return `<script>(function(){document.querySelectorAll('form[method="GET"][data-v20-loading]').forEach(function(f){var button=f.querySelector('button[type="submit"],button:not([type])');var text=button&&button.textContent;addEventListener('pageshow',function(){if(button){button.disabled=false;button.textContent=text;}});f.addEventListener('submit',function(){var b=f.querySelector('button[type="submit"],button:not([type])');if(b){b.disabled=true;b.textContent='Searching…';}});});})();</script>`;
}

function searchHero(kicker, title, sub, action, q, placeholder, extraButtons) {
  return `
<section class="v20-hero">
  <span class="v20-kicker">${esc(kicker)}</span>
  <h1>${esc(title)}</h1>
  <p>${esc(sub)}</p>
  <form method="GET" action="${esc(action)}" data-v20-loading>
    <div class="v20-search">${icon('search')}<input name="q" value="${esc(q || '')}" placeholder="${esc(placeholder)}" autocomplete="off"></div>
    <div class="v20-actions">
      <button class="v20-btn" type="submit">Search</button>
      ${extraButtons || ''}
    </div>
  </form>
</section>`;
}

function chipRow(items) {
  return `<div class="v20-chips">${items.map((c) => `<a class="v20-chip${c[2] ? ' active' : ''}" href="${esc(c[1])}">${esc(c[0])}</a>`).join('')}</div>`;
}

function merchantRow(x) {
  const phone = String(x.whatsapp || x.phone || '').trim();
  return `
<div class="v20-rowcard">
  ${imgThumb(x.image_url, x.shop_name, 'shops')}
  <div class="v20-rowbody">
    <div class="v20-rowtitle"><h3>${esc(x.shop_name || 'GOVO Shop')}</h3><span class="v20-pill">${esc(x.category || 'Shop')}</span></div>
    <div class="v20-meta">${esc(x.shop_address || x.location || 'Meherpur')}${phone ? ` · ${esc(phone)}` : ''}</div>
    ${trustLine(x)}
    <div class="v20-actions">
      <a class="v20-btn" href="/shop/${encodeURIComponent(x.id)}">View Shop</a>
      <a class="v20-btn secondary" href="/order?shop=${encodeURIComponent(x.shop_name || '')}">Order</a>
      ${phone ? `<a class="v20-btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}
    </div>
  </div>
</div>`;
}

function providerRow(x) {
  const phone = String(x.whatsapp || x.phone || '').trim();
  return `
<div class="v20-rowcard">
  ${imgThumb(x.image_url, x.provider_name, 'services')}
  <div class="v20-rowbody">
    <div class="v20-rowtitle"><h3>${esc(x.provider_name || 'GOVO Provider')}</h3><span class="v20-pill">${esc(x.service_type || 'Service')}</span></div>
    <div class="v20-meta">${esc(x.area || x.address || 'Meherpur')}${phone ? ` · ${esc(phone)}` : ''}</div>
    ${trustLine(x)}
    <div class="v20-actions">
      <a class="v20-btn" href="/service/${encodeURIComponent(x.id)}">View Service</a>
      <a class="v20-btn secondary" href="/service/${encodeURIComponent(x.id)}#request_form">Request</a>
      ${phone ? `<a class="v20-btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}
    </div>
  </div>
</div>`;
}

function emptyState(title, sub, actionLabel, actionHref) {
  return `
<section class="v20-card" style="text-align:center;margin-top:4px">
  <h3 style="margin:0 0 6px">${esc(title)}</h3>
  <p style="color:var(--muted);margin:0 0 14px">${esc(sub)}</p>
  <a class="v20-btn secondary" href="${esc(actionHref)}">${esc(actionLabel)}</a>
</section>`;
}

function errorState() {
  return `
<section class="v20-card" style="text-align:center;margin-top:4px">
  <h3 style="margin:0 0 6px">Something went wrong</h3>
  <p style="color:var(--muted);margin:0 0 14px">We could not load this list right now. Please try again in a moment.</p>
  <a class="v20-btn secondary" href="/support">Contact Support</a>
</section>`;
}

function marketplaceQuery(filters, changes) {
  const f = Object.assign({}, filters || {}, changes || {});
  const params = new URLSearchParams();
  ['q','type','category','area','availability','sort'].forEach((k) => {
    const v = String(f[k] || '').trim();
    if (v && !((k === 'type' && v === 'all') || (k === 'sort' && v === 'newest'))) params.set(k, v);
  });
  const qs = params.toString();
  return `/shops${qs ? `?${qs}` : ''}`;
}

function filterSelect(name, label, value, options) {
  return `<label class="v20-filter-field"><span>${esc(label)}</span><select name="${esc(name)}">${options.map(([v,t]) => `<option value="${esc(v)}"${String(value) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
}

const SHOPS_FIRST_CSS = "html body.govo-v32-ui .v33-marketplace.v33-marketplace .v33-market-head.v20-hero{padding:16px!important;margin-bottom:12px;border-radius:22px!important}\nhtml body.govo-v32-ui .v33-marketplace.v33-marketplace .v33-market-head.v20-hero h1{font-size:28px!important;line-height:1.2!important;margin:0 0 5px!important;letter-spacing:-.025em!important}\nhtml body.govo-v32-ui .v33-marketplace .v33-market-head p{font-size:14px;margin:0 0 12px;line-height:1.45;color:var(--muted)}\n.v33-market-head .v33-search-line{display:flex;gap:8px;align-items:stretch}.v33-market-head .v20-search{flex:1;min-width:0;margin:0!important;padding:9px 12px!important;border-radius:14px!important;gap:9px!important}.v33-market-head .v20-search input{min-height:26px!important;padding:0!important;border:0!important;background:transparent!important;width:100%;font-size:14px!important}.v33-market-head .v20-search svg{width:23px;height:23px;flex:none}.v33-search-line .v20-btn{padding:10px 14px!important;min-width:74px}\n.v33-market-tools{display:flex;justify-content:space-between;align-items:center;gap:8px;position:relative;margin:0 0 10px}.v33-market-tools .v20-tabs{gap:6px;padding:0;overflow:visible}.v33-market-tools .v20-tabs a{padding:10px 13px;font-size:13px;min-height:42px;display:flex;align-items:center}\n.v33-filters>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;min-height:42px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--card);font-weight:800;font-size:13px;white-space:nowrap}.v33-filters>summary::-webkit-details-marker{display:none}.v33-filters>summary svg{width:20px;height:20px}.v33-filter-count{min-width:18px;height:18px;padding:0 4px;border-radius:6px;background:#39E75F;color:#073525;display:grid;place-items:center;font-size:11px}\nhtml body.govo-v32-ui .v33-marketplace .v33-filters .v20-filter-panel{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:45;grid-template-columns:repeat(2,minmax(0,1fr))!important;padding:16px;margin:0;background:#102b34!important;border:1px solid var(--line);box-shadow:0 14px 32px #0006;border-radius:20px;gap:12px}.v33-filter-actions{grid-column:1/-1;display:flex;gap:8px}.v33-filters label span{font-size:12px}.v33-filters select{width:100%;padding:10px 8px}.v33-filters summary:focus-visible{outline:3px solid #19CFF0;outline-offset:3px}\n.v33-marketplace>.v20-section{margin:12px 0 10px}.v33-marketplace .v20-section h2{font-size:18px}\n.v33-shop-grid{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:20px}\nhtml body.govo-v32-ui .v33-marketplace .v33-shop-card.v20-rowcard{display:flex;flex-direction:column;gap:0!important;padding:0!important;overflow:hidden;border-radius:22px!important;align-items:stretch}\n.v33-shop-cover{display:flex;flex-direction:column;justify-content:center;align-items:center;height:180px;position:relative;background:linear-gradient(135deg,#164b40,#0d354b);border-bottom:1px solid var(--line);text-decoration:none;overflow:hidden}\nhtml body.govo-v32-ui .v33-marketplace .v33-shop-cover .v20-thumb{width:100%!important;height:180px!important;min-height:180px;border:0!important;border-radius:0!important;object-fit:cover!important;background:transparent!important;margin:0!important}\nhtml body.govo-v32-ui .v33-marketplace .v33-shop-cover span.v20-thumb{height:126px!important;min-height:126px;font-size:24px;font-weight:850;color:var(--text)}\n.v33-shop-cover .v20-thumb svg{width:82px!important;height:82px!important}.v33-photo-empty{color:#a8c8c9;font-size:12px;position:absolute;bottom:16px;pointer-events:none}\n.v33-shop-card .v20-rowbody{padding:14px 16px 16px;width:100%;min-width:0}.v33-shop-card .v20-rowtitle{align-items:flex-start;gap:8px}.v33-shop-card .v20-rowtitle h3{white-space:normal;overflow:visible;overflow-wrap:anywhere;font-size:18px!important;line-height:1.3;margin:0}.v33-shop-card .v20-pill{flex:none;max-width:42%;white-space:normal;text-align:center;font-size:11px}\n.v33-shop-card .v20-meta{font-size:13px;line-height:1.5;overflow-wrap:anywhere;margin-top:5px}.v33-shop-card .v20-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v33-shop-card .v20-actions .v20-btn{min-height:44px;font-size:13px!important;padding:9px 13px!important}.v33-shop-card .v20-actions .v20-btn:first-child{flex:1}.v33-marketplace .v20-market-stats{margin:18px 0}.v33-marketplace .v20-market-stats a{min-height:60px}.v33-marketplace .v20-market-stats b{font-size:20px}\nhtml[data-theme=light] body.govo-v32-ui .v33-marketplace .v33-filters .v20-filter-panel{background:#fafffd!important;box-shadow:0 12px 28px #245b4226}\nhtml[data-theme=light] .v33-shop-cover{background:linear-gradient(135deg,#d6f4e8,#d9eef5)}html[data-theme=light] .v33-photo-empty{color:#56706c}\n@media(max-width:350px){html body.govo-v32-ui .v33-marketplace.v33-marketplace .v33-market-head.v20-hero h1{font-size:26px!important}.v33-market-tools .v20-tabs a{padding:10px 10px;font-size:12px}.v33-filters>summary{padding:10px 9px;gap:4px}.v33-search-line .v20-btn{padding:10px 12px!important;min-width:68px}}\n@media(min-width:600px){.v33-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v33-shop-cover,html body.govo-v32-ui .v33-marketplace .v33-shop-cover .v20-thumb{height:210px!important;min-height:210px}.v33-market-tools .v20-tabs a{padding:10px 18px}}\n@media(min-width:1000px){.v33-shop-grid{grid-template-columns:repeat(3,minmax(0,1fr))}html body.govo-v32-ui .v33-marketplace .v33-filters .v20-filter-panel{grid-template-columns:repeat(5,minmax(0,1fr))!important}.v33-shop-cover,html body.govo-v32-ui .v33-marketplace .v33-shop-cover .v20-thumb{height:190px!important;min-height:190px}}\n";

function marketplaceMerchantCard(x, index) {
  const phone = String(x.whatsapp || x.phone || '').trim();
  const detail = '/shop/' + encodeURIComponent(x.id);
  let photo = imgThumb(x.image_url, x.shop_name, 'shops');
  const noPhoto = photo.startsWith('<span');
  if(index === 0) photo = photo.replace('loading="lazy"', 'loading="eager" fetchpriority="high"');
  return `<article class="v20-rowcard v33-shop-card"><a class="v33-shop-cover" href="${detail}" aria-label="View ${esc(x.shop_name || 'GOVO Shop')}">${photo}${noPhoto ? '<small class="v33-photo-empty">Shop photo coming soon</small>' : ''}</a><div class="v20-rowbody"><div class="v20-rowtitle"><h3>${esc(x.shop_name || 'GOVO Shop')}</h3><span class="v20-pill">${esc(x.category || 'Shop')}</span></div><div class="v20-meta">${esc(x.shop_address || x.location || 'Meherpur')}${phone ? ` · ${esc(phone)}` : ''}</div>${trustLine(x)}<div class="v20-actions"><a class="v20-btn" href="${detail}">View Shop</a><a class="v20-btn secondary" href="/order?shop=${encodeURIComponent(x.shop_name || '')}">Order</a>${phone ? `<a class="v20-btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}</div></div></article>`;
}

function shopsPage(opts) {
  const q = String((opts && opts.q) || '');
  const type = String((opts && opts.type) || 'all');
  const category = String((opts && opts.category) || '');
  const area = String((opts && opts.area) || '');
  const availability = String((opts && opts.availability) || '');
  const sort = String((opts && opts.sort) || 'newest');
  const cats = (opts && opts.cats) || [];
  const serviceCats = (opts && opts.serviceCats) || [];
  const areas = (opts && opts.areas) || [];
  const rows = (opts && opts.rows) || [];
  const providers = (opts && opts.providers) || [];
  const filters = { q, type, category, area, availability, sort };
  const categoryOptions = [['','All categories']]
    .concat(cats.map((c) => [String(c.title || ''), `${c.icon || ''} ${c.title || ''}`]))
    .concat(serviceCats.map((c) => [String(c.title || ''), `${c.icon || ''} ${c.title || ''}`]));
  const areaOptions = [['','All areas']].concat(areas.map((x) => [x,x]));
  const activeFilters = [category, area, availability, sort !== 'newest' ? sort : ''].filter(Boolean).length;
  const body = `<style>${SHOPS_FIRST_CSS}</style><div class="v33-marketplace">
<section class="v20-hero v33-market-head">
  <h1>Shops & Services</h1>
  <p>Browse approved local shops and trusted services.</p>
  <form method="GET" action="/shops" data-v20-loading>
    <div class="v33-search-line"><div class="v20-search">${icon('search')}<input name="q" value="${esc(q)}" placeholder="Search shops" autocomplete="off"></div>
    <input type="hidden" name="type" value="${esc(type)}">
    <button class="v20-btn" type="submit">Search</button></div>
  </form>
</section>

<div class="v33-market-tools"><div class="v20-tabs">
  <a class="${type === 'all' ? 'active' : ''}" href="${esc(marketplaceQuery(filters,{type:'all'}))}">All</a>
  <a class="${type === 'shops' ? 'active' : ''}" href="${esc(marketplaceQuery(filters,{type:'shops'}))}">Shops</a>
  <a class="${type === 'services' ? 'active' : ''}" href="${esc(marketplaceQuery(filters,{type:'services'}))}">Services</a>
</div>
<details class="v33-filters" id="marketplace-filters"><summary>${icon('menu')}<span>Filters</span>${activeFilters ? `<span class="v33-filter-count">${activeFilters}</span>` : ''}</summary><form class="v20-filter-panel" method="GET" action="/shops" data-v20-loading>
  <input type="hidden" name="q" value="${esc(q)}">
  ${filterSelect('type','Listing type',type,[['all','All listings'],['shops','Shops only'],['services','Services only']])}
  ${filterSelect('category','Category',category,categoryOptions)}
  ${filterSelect('area','Area',area,areaOptions)}
  ${filterSelect('availability','Status',availability,[['','Any status'],['available','Available now'],['verified','Verified / trusted'],['emergency','Emergency available']])}
  ${filterSelect('sort','Sort by',sort,[['newest','Newest first'],['name','Name A–Z'],['rating','Highest rating']])}
  <div class="v20-filter-actions v33-filter-actions"><button class="v20-btn" type="submit">Apply Filters</button><a class="v20-btn secondary" href="/shops">Clear</a></div>
</form></details></div>
${(type === 'all' || type === 'shops') ? `
<div class="v20-section"><h2>Approved shops</h2><span class="v20-count">${rows.length}</span></div>
<div class="v33-shop-grid">${rows.map(marketplaceMerchantCard).join('')}</div>
${rows.length ? '' : emptyState('No shops matched', 'Change the search or filters to see more approved shops.', 'Clear Filters', '/shops')}` : ''}
${(type === 'all' || type === 'services') ? `
<div class="v20-section"><h2>Trusted services</h2><span class="v20-count">${providers.length}</span></div>
<div class="v20-list">${providers.map(providerRow).join('')}</div>
${providers.length ? '' : emptyState('No services matched', 'Change the search or filters, or request the service directly.', 'Request a Service', '/service-request')}` : ''}
<section class="v20-market-stats">
  <a href="${esc(marketplaceQuery(filters,{type:'shops'}))}"><b>${rows.length}</b><span>Shops</span></a>
  <a href="${esc(marketplaceQuery(filters,{type:'services'}))}"><b>${providers.length}</b><span>Services</span></a>
  <a href="${esc(marketplaceQuery(filters,{type:'all'}))}"><b>${rows.length + providers.length}</b><span>All listings</span></a>
</section>
<section class="v20-card v20-market-cta"><h2>Cannot find what you need?</h2><p>Send one request and GOVO will match a local shop or service provider.</p><div class="v20-actions"><a class="v20-btn" href="/service-request">Request Anything</a><a class="v20-btn secondary" href="/support">Contact Support</a></div></section>
${(opts && opts.error) ? errorState() : ''}
${loadingScript()}</div>`;
  return shell('GOVO Marketplace', 'shops', body);
}

function categoryPage(opts) {
  const cat = (opts && opts.cat) || {};
  const q = String((opts && opts.q) || '');
  const rows = (opts && opts.rows) || [];
  const body = `
<a class="v20-back" href="/shops">← Back to Shops</a>
<section class="v20-hero">
  <span class="v20-kicker">${esc(cat.icon || '')} Category</span>
  <h1>${esc(cat.title || 'Category')}</h1>
  <p>${esc(cat.desc || '')}</p>
  <form method="GET" action="/category/${encodeURIComponent(cat.slug || '')}" data-v20-loading>
    <div class="v20-search">${icon('search')}<input name="q" value="${esc(q)}" placeholder="Search in ${esc(cat.title || 'category')}" autocomplete="off"></div>
    <div class="v20-actions"><button class="v20-btn" type="submit">Search</button><a class="v20-btn secondary" href="/shops">All Shops</a></div>
  </form>
</section>
<div class="v20-section"><h2>${q ? 'Search results' : 'Approved partners'}</h2><span class="v20-count">${rows.length}</span></div>
<div class="v20-list">${rows.map(merchantRow).join('')}</div>
${rows.length ? '' : emptyState('Nothing here yet', 'GOVO is adding partners in this category. You can request what you need instead.', 'Request this Service', '/service-request')}
${(opts && opts.error) ? errorState() : ''}
${loadingScript()}`;
  return shell(cat.title || 'Category', 'shops', body);
}

function shopDetailPage(opts) {
  const x = (opts && opts.shop) || {};
  const products = (opts && opts.products) || [];
  const phone = String(x.whatsapp || x.phone || '').trim();
  const wa = phone.replace(/\D/g, '');
  const productCards = products.map((p) => {
    const key = `${p.source}-${p.id}`;
    const price = String(p.price_display || p.price_text || '').trim();
    return `
<div class="v20-rowcard">
  ${imgThumb(p.image_url, p.name, 'shops')}
  <div class="v20-rowbody">
    <div class="v20-rowtitle"><h3>${esc(p.name || 'Product')}</h3><span class="v20-pill">${esc(p.category || 'Menu')}</span></div>
    <div class="v20-meta">${price ? `৳${esc(price)}` : ''}</div>
    ${p.description ? `<div class="v20-meta">${esc(p.description)}</div>` : ''}
    <div class="v20-check"><input type="checkbox" name="product_keys" value="${esc(key)}" id="pk_${esc(key)}"><label for="pk_${esc(key)}" style="margin:0">Add to order</label><input class="v20-qty" name="qty_${esc(key)}" type="number" min="1" max="50" value="1" aria-label="Quantity"></div>
  </div>
</div>`;
  }).join('');
  const body = `
<a class="v20-back" href="/shops">← Back to Shops</a>
<section class="v20-hero">
  <span class="v20-kicker">${esc(x.category || 'GOVO Shop')}</span>
  <h1>${esc(x.shop_name || 'GOVO Shop')}</h1>
  ${trustLine(x)}
  <div class="v20-detail">
    <div><b>Owner</b><span>${esc(x.owner_name || '')}</span></div>
    <div><b>Phone</b><span>${esc(phone)}</span></div>
    <div><b>Location</b><span>${esc(x.shop_address || x.location || '')}</span></div>
    <div><b>Delivery</b><span>${esc(x.delivery_needed || '')}</span></div>
  </div>
  ${x.shop_description ? `<p style="margin-top:12px">${esc(x.shop_description)}</p>` : ''}
  <div class="v20-actions">
    ${wa ? `<a class="v20-btn" href="https://wa.me/${esc(wa)}">WhatsApp</a>` : ''}
    ${phone ? `<a class="v20-btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}
  </div>
</section>
<form method="POST" action="/shop/${encodeURIComponent(x.id)}/order" class="v20-form">
  <div class="v20-section"><h2>Products / Menu</h2><span class="v20-count">${products.length}</span></div>
  <div class="v20-list">${productCards}</div>
  ${products.length ? '' : emptyState('Menu coming soon', 'This shop is preparing its menu. Call or WhatsApp to order.', 'Back to Shops', '/shops')}
  <section class="v20-card" style="margin-top:14px">
    <h3 style="margin:0 0 4px">Place Order</h3>
    <label>Your Name</label><input name="customer_name" required>
    <label>Your Phone</label><input name="customer_phone" required>
    <label>Your Area</label><input name="customer_area" placeholder="Meherpur / Mujibnagar">
    <label>Delivery Address</label><input name="customer_address" required>
    <label>Payment Method</label><select name="payment_method"><option>cash</option><option>bKash</option><option>Nagad</option><option>card</option></select>
    <label>Note</label><textarea name="note" rows="3"></textarea>
    <div class="v20-actions"><button class="v20-btn" type="submit" ${products.length ? '' : 'disabled'}>Submit Shop Order</button></div>
  </section>
</form>
${(opts && opts.error) ? errorState() : ''}`;
  return shell(x.shop_name || 'Shop', 'shops', body);
}

function servicesPage(opts) {
  const q = String((opts && opts.q) || '');
  const cats = (opts && opts.cats) || [];
  const rows = (opts && opts.rows) || [];
  const chips = [['All', '/services', !q]].concat(cats.map((c) => [`${c.icon} ${c.title}`, `/services?q=${encodeURIComponent(c.title)}`, q === String(c.title).toLowerCase()]));
  const body = `
${searchHero('GOVO Services', 'Services', 'Trusted local help — repairs, health, agriculture, transport and home support.', '/services', q, 'Search services, areas, names', `<a class="v20-btn secondary" href="/service-request">Request a Service</a>`)}
<div class="v20-section"><h2>Categories</h2><span class="v20-count">${cats.length}</span></div>
${chipRow(chips)}
<div class="v20-section"><h2>${q ? 'Search results' : 'Trusted providers'}</h2><span class="v20-count">${rows.length}</span></div>
<div class="v20-list">${rows.map(providerRow).join('')}</div>
${rows.length ? '' : emptyState(q ? 'No providers matched your search' : 'Providers are being verified', q ? 'Try a different service, area or name.' : 'Tell GOVO what you need and we will match a trusted local provider.', 'Request a Service', '/service-request')}
${(opts && opts.error) ? errorState() : ''}
${loadingScript()}`;
  return shell('Services', 'services', body);
}


function serviceRequestFields(provider, data) {
  const p = provider || {};
  const d = data || {};
  return `
<input type="hidden" name="provider_id" value="${esc(p.id || d.provider_id || '')}">
<label>Your Name</label><input name="customer_name" value="${esc(d.customer_name || '')}" required>
<label>Your Phone</label><input name="customer_phone" value="${esc(d.customer_phone || '')}" required inputmode="tel">
<label>Your Area</label><input name="customer_area" value="${esc(d.customer_area || '')}" placeholder="Meherpur / Mujibnagar">
<label>Service Address</label><textarea name="customer_address" rows="3" required>${esc(d.customer_address || d.service_address || '')}</textarea>
<label>Service Type</label><input name="service_type" value="${esc(p.service_type || d.service_type || '')}" required>
<label>Preferred Time</label><input name="preferred_time" value="${esc(d.preferred_time || '')}" placeholder="Today 5 PM / Tomorrow morning">
<label>Problem Details</label><textarea name="problem_details" rows="4" required placeholder="Describe what you need">${esc(d.problem_details || '')}</textarea>
<label>Priority</label><select name="priority"><option value="normal"${d.priority === 'urgent' ? '' : ' selected'}>Normal</option><option value="urgent"${d.priority === 'urgent' ? ' selected' : ''}>Urgent</option></select>
<label>Note</label><textarea name="note" rows="3">${esc(d.note || d.notes || '')}</textarea>`;
}

function serviceDetailPage(opts) {
  const p = (opts && opts.provider) || {};
  const data = (opts && opts.data) || {};
  const error = String((opts && opts.error) || '');
  const phone = String(p.whatsapp || p.phone || '').trim();
  const wa = phone.replace(/\D/g, '');
  const action = `/service/${encodeURIComponent(p.id || '')}/request`;
  const body = `
<a class="v20-back" href="/services">← Back to Services</a>
<section class="v20-hero">
  <span class="v20-kicker">${esc(p.service_type || 'GOVO Service')}</span>
  <h1>${esc(p.provider_name || 'Service Provider')}</h1>
  ${trustLine(p)}
  <div class="v20-detail">
    <div><b>Area</b><span>${esc(p.area || '')}</span></div>
    <div><b>Experience</b><span>${esc(p.experience || 'Available')}</span></div>
    <div><b>Address</b><span>${esc(p.address || p.area || '')}</span></div>
    <div><b>Contact</b><span>${esc(phone || 'Available after request')}</span></div>
  </div>
  ${p.description ? `<p style="margin-top:12px">${esc(p.description)}</p>` : ''}
  <div class="v20-actions">
    <a class="v20-btn" href="#request_form">Request Now</a>
    ${wa ? `<a class="v20-btn secondary" href="https://wa.me/${esc(wa)}">WhatsApp</a>` : ''}
    ${phone ? `<a class="v20-btn secondary" href="tel:${esc(phone)}">Call</a>` : ''}
  </div>
</section>
${error ? `<section class="v20-alert"><b>Check request details</b><span>${esc(error)}</span></section>` : ''}
<form id="request_form" method="POST" action="${esc(action)}" class="v20-form" data-v20-loading>
  <section class="v20-card" style="margin-top:14px">
    <h2 style="margin:0 0 6px">Request This Service</h2>
    <p class="v20-meta">GOVO will review your request and phone-confirm the details.</p>
    ${serviceRequestFields(p, data)}
    <div class="v20-actions"><button class="v20-btn" type="submit">Submit Service Request</button><a class="v20-btn secondary" href="/track">Track Request</a></div>
  </section>
</form>${loadingScript()}`;
  return shell(p.provider_name || 'Service', 'services', body);
}

function generalServiceRequestPage(opts) {
  const data = (opts && opts.data) || {};
  const error = String((opts && opts.error) || '');
  const body = `
<a class="v20-back" href="/services">← Back to Services</a>
<section class="v20-hero">
  <span class="v20-kicker">GOVO Request</span><h1>Request a Service</h1>
  <p>Tell GOVO what you need. We will review it and match the right local provider.</p>
</section>
${error ? `<section class="v20-alert"><b>Check request details</b><span>${esc(error)}</span></section>` : ''}
<form method="POST" action="/service-request" class="v20-form" data-v20-loading>
  <section class="v20-card" style="margin-top:14px">
    ${serviceRequestFields({}, data)}
    <div class="v20-actions"><button class="v20-btn" type="submit">Submit Service Request</button><a class="v20-btn secondary" href="/services">Browse Providers</a></div>
  </section>
</form>${loadingScript()}`;
  return shell('Service Request', 'services', body);
}

function requestSuccessPage(opts) {
  const code = String((opts && opts.code) || '').trim();
  const kind = String((opts && opts.kind) || 'service');
  const title = kind === 'shop' ? 'Shop Order Submitted' : 'Service Request Submitted';
  const label = kind === 'shop' ? 'Order Received' : 'Request Received';
  const back = kind === 'shop' ? '/shops' : '/services';
  const body = `
<section class="v20-hero" style="text-align:center">
  <span class="v20-kicker">${esc(label)}</span><h1>${esc(title)}</h1>
  <p>GOVO will phone-confirm the details and update the tracking status.</p>
  <section class="v20-code"><small>Tracking Code</small><strong>${esc(code || 'Pending')}</strong></section>
  <div class="v20-actions" style="justify-content:center"><a class="v20-btn" href="/track?code=${encodeURIComponent(code)}">Track Now</a><a class="v20-btn secondary" href="${back}">Continue Browsing</a><a class="v20-btn secondary" href="/support">Support</a></div>
</section>`;
  return shell(title, kind === 'shop' ? 'shops' : 'services', body);
}

function messagePage(opts) {
  const title = String((opts && opts.title) || 'GOVO');
  const message = String((opts && opts.message) || 'Please try again.');
  const backHref = String((opts && opts.backHref) || '/app');
  const backLabel = String((opts && opts.backLabel) || 'Back');
  const active = String((opts && opts.active) || 'home');
  return shell(title, active, `<section class="v20-card" style="text-align:center"><h1>${esc(title)}</h1><p class="v20-meta">${esc(message)}</p><div class="v20-actions" style="justify-content:center"><a class="v20-btn" href="${esc(backHref)}">${esc(backLabel)}</a><a class="v20-btn secondary" href="/support">Support</a></div></section>`);
}

module.exports = { shopsPage, categoryPage, shopDetailPage, servicesPage, serviceDetailPage, generalServiceRequestPage, requestSuccessPage, messagePage };
