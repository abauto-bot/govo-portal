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
  return `<script>(function(){document.querySelectorAll('form[data-v20-loading]').forEach(function(f){f.addEventListener('submit',function(){var b=f.querySelector('button[type="submit"],button:not([type])');if(b){b.disabled=true;b.textContent='Searching…';}});});})();</script>`;
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
  const body = `
<section class="v20-hero">
  <span class="v20-kicker">GOVO Marketplace</span>
  <h1>Shops & Services</h1>
  <p>Find every approved local shop, product and trusted service provider from one public marketplace.</p>
  <form method="GET" action="/shops" data-v20-loading>
    <div class="v20-search">${icon('search')}<input name="q" value="${esc(q)}" placeholder="Search shops, products, services or areas" autocomplete="off"></div>
    <input type="hidden" name="type" value="${esc(type)}">
    <div class="v20-actions"><button class="v20-btn" type="submit">Search Marketplace</button><a class="v20-btn secondary" href="/service-request">Request Anything</a></div>
  </form>
</section>
<section class="v20-market-stats">
  <a href="${esc(marketplaceQuery(filters,{type:'shops'}))}"><b>${rows.length}</b><span>Shops</span></a>
  <a href="${esc(marketplaceQuery(filters,{type:'services'}))}"><b>${providers.length}</b><span>Services</span></a>
  <a href="${esc(marketplaceQuery(filters,{type:'all'}))}"><b>${rows.length + providers.length}</b><span>All listings</span></a>
</section>
<div class="v20-tabs">
  <a class="${type === 'all' ? 'active' : ''}" href="${esc(marketplaceQuery(filters,{type:'all'}))}">All</a>
  <a class="${type === 'shops' ? 'active' : ''}" href="${esc(marketplaceQuery(filters,{type:'shops'}))}">Shops</a>
  <a class="${type === 'services' ? 'active' : ''}" href="${esc(marketplaceQuery(filters,{type:'services'}))}">Services</a>
</div>
<form class="v20-filter-panel" method="GET" action="/shops" data-v20-loading>
  <input type="hidden" name="q" value="${esc(q)}">
  ${filterSelect('type','Listing type',type,[['all','All listings'],['shops','Shops only'],['services','Services only']])}
  ${filterSelect('category','Category',category,categoryOptions)}
  ${filterSelect('area','Area',area,areaOptions)}
  ${filterSelect('availability','Status',availability,[['','Any status'],['available','Available now'],['verified','Verified / trusted'],['emergency','Emergency available']])}
  ${filterSelect('sort','Sort by',sort,[['newest','Newest first'],['name','Name A–Z'],['rating','Highest rating']])}
  <div class="v20-filter-actions"><button class="v20-btn" type="submit">Apply Filters</button><a class="v20-btn secondary" href="/shops">Clear</a></div>
</form>
${(type === 'all' || type === 'shops') ? `
<div class="v20-section"><h2>Approved shops</h2><span class="v20-count">${rows.length}</span></div>
<div class="v20-list">${rows.map(merchantRow).join('')}</div>
${rows.length ? '' : emptyState('No shops matched', 'Change the search or filters to see more approved shops.', 'Clear Filters', '/shops')}` : ''}
${(type === 'all' || type === 'services') ? `
<div class="v20-section"><h2>Trusted services</h2><span class="v20-count">${providers.length}</span></div>
<div class="v20-list">${providers.map(providerRow).join('')}</div>
${providers.length ? '' : emptyState('No services matched', 'Change the search or filters, or request the service directly.', 'Request a Service', '/service-request')}` : ''}
<section class="v20-card v20-market-cta"><h2>Cannot find what you need?</h2><p>Send one request and GOVO will match a local shop or service provider.</p><div class="v20-actions"><a class="v20-btn" href="/service-request">Request Anything</a><a class="v20-btn secondary" href="/support">Contact Support</a></div></section>
${(opts && opts.error) ? errorState() : ''}
${loadingScript()}`;
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
