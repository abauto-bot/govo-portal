// GOVO V20 support page — rendered on the shared V20 shell so header,
// bottom navigation, theme tokens, spacing and buttons match /app exactly.
// POST contract preserved: same field names, same action (/support).

const { shell } = require('./govo_v20_pages');
const { icon } = require('./govo_v20_icons');

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function opt(v, current) {
  return `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(v)}</option>`;
}

// data: optional prefill (POST 400 re-render), error: optional inline message
function renderSupportPage(data, error) {
  const d = data || {};
  const related = String(d.related_type || 'general');
  const contact = String(process.env.GOVO_SUPPORT_PHONE || process.env.SUPPORT_PHONE || process.env.WHATSAPP_PHONE || '').trim();
  const wa = contact.replace(/\D/g, '');
  const topics = [
    ['Delivery Help', 'Orders, parcels and delivery', '/order', 'delivery'],
    ['Service Help', 'Technicians and local services', '/service-request', 'services'],
    ['Merchant Help', 'Shop registration and products', '/merchant', 'shops'],
    ['Rider Help', 'Rider onboarding and trips', '/rider', 'account']
  ];
  const body = `
<section class="v20-hero">
  <span class="v20-kicker">Support</span>
  <h1>Need Help?</h1>
  <p>We are here to help with orders, services and anything GOVO.</p>
</section>
${error ? `<section class="v20-card" style="border-color:rgba(248,113,113,.5)"><h3 style="margin:0 0 4px">Check support details</h3><p style="color:#fecaca;margin:0">${esc(error)}</p></section>` : ''}
<section class="v20-cta" style="margin-top:14px">
  <div style="min-width:0">
    <h3 style="margin:0 0 6px">Talk to GOVO Support</h3>
    <p style="color:var(--muted);margin:0 0 12px">Call, WhatsApp or send a ticket — we route it to the right team.</p>
    <div class="v20-actions" style="margin-top:0">
      ${contact ? `<a class="v20-btn" href="tel:${esc(contact)}">Call Now</a>` : ''}
      ${wa ? `<a class="v20-btn secondary" href="https://wa.me/${esc(wa)}">WhatsApp</a>` : ''}
      <a class="v20-btn secondary" href="#ticket-form">Send a Ticket</a>
    </div>
  </div>
  <span class="v20-cta-art"><img src="/uploads/govo-logo.png" alt="GOVO"></span>
</section>
<div class="v20-section"><h2>Help topics</h2></div>
<div class="v20-grid">
  ${topics.map((t) => `<a class="v20-card" href="${esc(t[2])}">${icon(t[3])}<b>${esc(t[0])}</b><span>${esc(t[1])}</span></a>`).join('')}
</div>
<section class="v20-card v20-form" id="ticket-form" style="margin-top:14px">
  <h3 style="margin:0 0 4px">Submit a support ticket</h3>
  <p style="color:var(--muted);margin:0 0 6px">Order questions, service issues, complaints or follow-ups.</p>
  <form method="POST" action="/support">
    <label>Your Name</label><input name="customer_name" value="${esc(d.customer_name || '')}">
    <label>Your Phone</label><input name="customer_phone" value="${esc(d.customer_phone || '')}" required>
    <label>Your Area</label><input name="customer_area" value="${esc(d.customer_area || '')}">
    <label>Subject</label><input name="subject" value="${esc(d.subject || '')}" placeholder="Order question / complaint / follow-up">
    <label>Message</label><textarea name="message" rows="4" required>${esc(d.message || '')}</textarea>
    <label>Related Type</label><select name="related_type">${['general', 'order', 'service', 'merchant', 'rider'].map((v) => opt(v, related)).join('')}</select>
    <label>Related Code (optional)</label><input name="related_code" value="${esc(d.related_code || '')}" placeholder="GOVO-000001 / SRV-YYYYMMDD-0001">
    <div class="v20-actions"><button class="v20-btn" type="submit">Submit Ticket</button><a class="v20-btn secondary" href="/track">Track Ticket</a></div>
  </form>
</section>`;
  return shell('Support', '', body);
}

function renderSupportSuccess(code) {
  const body = `
<section class="v20-hero">
  <span class="v20-kicker">Ticket Received</span>
  <h1>Support Ticket Submitted</h1>
  <p>GOVO support has received your message and will follow up shortly.</p>
</section>
<section class="v20-cta" style="margin-top:14px">
  <div style="min-width:0">
    <h3 style="margin:0 0 6px">Ticket Code</h3>
    <p style="font-size:20px;font-weight:900;margin:0 0 12px">${esc(code || '')}</p>
    <div class="v20-actions" style="margin-top:0">
      <a class="v20-btn" href="/track?code=${encodeURIComponent(code || '')}">Track Ticket</a>
      <a class="v20-btn secondary" href="/support">Submit Another</a>
      <a class="v20-btn secondary" href="/app">Back to App</a>
    </div>
  </div>
  <span class="v20-cta-art"><img src="/uploads/govo-logo.png" alt="GOVO"></span>
</section>`;
  return shell('Support Ticket Submitted', '', body);
}

module.exports = { renderSupportPage, renderSupportSuccess };
