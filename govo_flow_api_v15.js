'use strict';

module.exports = function installGovoFlowApiV15(app, deps = {}) {
  const pool = deps.pool;
  const sendTelegram = typeof deps.sendTelegram === 'function' ? deps.sendTelegram : async () => {};
  const requireAdmin = typeof deps.requireAdmin === 'function' ? deps.requireAdmin : null;

  const AREAS = ['Meherpur', 'Gangni', 'Bamundi', 'Mujibnagar', 'Amjhupi'];
  const CATEGORIES = [
    ['all-shops', 'All Shops', 'সব দোকান'],
    ['food-local-shop-delivery', 'Food and local shop delivery', 'খাবার ও লোকাল দোকান ডেলিভারি'],
    ['general-delivery-booking', 'General delivery booking', 'সাধারণ ডেলিভারি বুকিং'],
    ['bike-auto-transport', 'Bike/auto transport request', 'বাইক/অটো ট্রান্সপোর্ট'],
    ['doctor-appointment', 'Doctor appointment', 'ডাক্তার অ্যাপয়েন্টমেন্ট'],
    ['agriculture-products', 'Agriculture products', 'কৃষি পণ্য'],
    ['domestic-home-services', 'Domestic/home services', 'ঘরোয়া সার্ভিস'],
    ['house-rent', 'House rent', 'বাসা ভাড়া'],
    ['other-local-services', 'Other local services', 'অন্যান্য লোকাল সার্ভিস']
  ].map(([key, en, bn]) => ({ key, en, bn }));

  const STATUS = [
    ['phone_confirming', 'Phone Confirming', 'ফোন কনফার্মিং', [], ['confirmed', 'cancelled'], ['admin']],
    ['confirmed', 'Confirmed', 'কনফার্মড', ['phone_confirming'], ['assigned', 'cancelled'], ['admin']],
    ['assigned', 'Assigned', 'অ্যাসাইনড', ['confirmed'], ['on_the_way', 'cancelled'], ['admin']],
    ['on_the_way', 'On the way', 'রাস্তায় আছে', ['assigned'], ['working', 'completed', 'cancelled'], ['admin', 'rider']],
    ['working', 'Working', 'কাজ চলছে', ['on_the_way', 'assigned'], ['completed', 'cancelled'], ['admin', 'rider']],
    ['completed', 'Completed', 'সম্পন্ন', ['working', 'on_the_way'], ['paid', 'feedback'], ['admin', 'rider']],
    ['paid', 'Paid', 'পেইড', ['completed'], ['feedback'], ['admin']],
    ['feedback', 'Feedback', 'ফিডব্যাক', ['completed', 'paid'], [], ['admin', 'customer']],
    ['cancelled', 'Cancelled', 'বাতিল', ['phone_confirming', 'confirmed', 'assigned', 'on_the_way', 'working'], [], ['admin']]
  ].map(([key, en, bn, previous, next, roles]) => ({ key, en, bn, previous, next, roles }));

  const statusByKey = new Map(STATUS.map((s) => [s.key, s]));
  const normalizeStatus = (value) => {
    const v = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (statusByKey.has(v)) return v;
    const aliases = { new: 'phone_confirming', pending: 'phone_confirming', accepted: 'confirmed', ready: 'confirmed', picked_up: 'on_the_way', delivered: 'completed', resolved: 'completed', unpaid: 'completed' };
    return aliases[v] || 'phone_confirming';
  };
  const today = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safe = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
  const phone = (v) => safe(v, 30).replace(/[^0-9+]/g, '');
  const okPhone = (v) => /^(\+?88)?01[0-9]{9}$/.test(phone(v));
  const qlike = (v) => `%${safe(v, 80).toLowerCase()}%`;

  function jsonError(res, status, code, message, extra = {}) {
    return res.status(status).json({ ok: false, error: code, message, ...extra });
  }
  function publicShop(row) {
    return {
      id: row.id,
      name: row.shop_name || 'GOVO Shop',
      category: row.category || 'Local shop',
      area: row.location || '',
      address: row.shop_address || row.location || '',
      description: row.shop_description || row.products || '',
      open: row.is_available !== false,
      verified: !!row.is_verified,
      trusted: !!row.is_trusted,
      delivery: row.delivery_available !== false,
      rating: Number(row.rating_avg || 0),
      image: row.image_url || '',
      products: []
    };
  }
  function publicProduct(row) {
    return { id: `${row.source}-${row.id}`, name: row.name || 'Item', category: row.category || '', price: row.price_text || '', description: row.description || '', image: row.image_url || '', available: true };
  }
  function publicService(row) {
    return { id: row.id || row.key, key: row.key || String(row.id || ''), name: row.provider_name || row.name || row.service_type || 'Local service', serviceType: row.service_type || row.name || '', area: row.area || '', description: row.description || row.desc || '', available: row.is_available !== false, verified: !!row.is_verified, trusted: !!row.is_trusted, emergency: !!row.emergency_available };
  }
  function publicOrder(row, events = []) {
    const key = normalizeStatus(row.status);
    return {
      id: row.order_code || row.id,
      code: row.order_code || `GOVO-${String(row.id || '').padStart(6, '0')}`,
      status: key,
      label: (statusByKey.get(key) || {}).en || key,
      bangla: (statusByKey.get(key) || {}).bn || key,
      type: row.order_type || 'delivery',
      customerName: row.customer_name || '',
      customerArea: row.customer_area || '',
      address: row.customer_address || row.drop_location || '',
      items: row.items || row.item_details || '',
      merchantName: row.merchant_name || row.shop_name || '',
      riderName: row.assigned_rider_name || row.rider_name || '',
      riderPhone: row.assigned_rider_phone || row.rider_phone || '',
      paymentStatus: row.payment_status || 'unpaid',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      timeline: events.map((e) => ({ status: normalizeStatus(e.status), note: e.note || '', actor: e.actor_type || '', timestamp: e.created_at }))
    };
  }

  async function productsFor(shopId, merchantPhone = '') {
    const modern = await pool.query(`SELECT 'product' AS source, id, name, category, price::text AS price_text, description, image_url FROM govo_products WHERE merchant_id=$1 AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false AND stock_status='available' ORDER BY category NULLS LAST, id DESC LIMIT 120`, [shopId]);
    const legacy = await pool.query(`SELECT 'legacy' AS source, id, product_name AS name, category, price AS price_text, description, image_url FROM govo_shop_products WHERE (merchant_lead_id=$1 OR merchant_phone=$2) AND COALESCE(is_available,true)=true AND COALESCE(is_deleted,false)=false ORDER BY category NULLS LAST, id DESC LIMIT 120`, [shopId, merchantPhone]);
    return [...modern.rows, ...legacy.rows].map(publicProduct);
  }

  app.get('/api/govo-flow/registry', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, hosts: ['govoexpress.com', 'app.govoexpress.com', 'merchant.govoexpress.com', 'rider.govoexpress.com', 'add.govoexpress.com'], areas: AREAS, categories: CATEGORIES, statuses: STATUS, build: 'host-isolation-20260712-v15-flow-connect' });
  });

  app.get('/api/govo-flow/shops', async (req, res, next) => {
    try {
      const params = [];
      const where = [`COALESCE(public_visible,true)=true`, `COALESCE(is_demo,false)=false`, `LOWER(COALESCE(status,'pending')) IN ('approved','active','verified','trusted','confirmed')`];
      if (req.query.area) { params.push(qlike(req.query.area)); where.push(`LOWER(COALESCE(location,'') || ' ' || COALESCE(shop_address,'')) LIKE $${params.length}`); }
      if (req.query.category) { params.push(qlike(req.query.category)); where.push(`LOWER(COALESCE(category,'') || ' ' || COALESCE(products,'')) LIKE $${params.length}`); }
      if (req.query.q) { params.push(qlike(req.query.q)); where.push(`LOWER(COALESCE(shop_name,'') || ' ' || COALESCE(category,'') || ' ' || COALESCE(location,'') || ' ' || COALESCE(products,'') || ' ' || COALESCE(shop_description,'')) LIKE $${params.length}`); }
      const rows = await pool.query(`SELECT id, shop_name, location, category, shop_address, shop_description, products, image_url, is_verified, is_trusted, is_available, delivery_available, rating_avg FROM govo_merchant_leads WHERE ${where.join(' AND ')} ORDER BY is_trusted DESC, is_verified DESC, id DESC LIMIT 100`, params);
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, dataSource: 'postgres:govo_merchant_leads+govo_shop_products+govo_products', shops: rows.rows.map(publicShop), empty: rows.rows.length === 0 });
    } catch (e) { next(e); }
  });

  app.get('/api/govo-flow/shops/:id', async (req, res, next) => {
    try {
      const r = await pool.query(`SELECT id, shop_name, location, category, shop_address, shop_description, products, image_url, is_verified, is_trusted, is_available, delivery_available, rating_avg, phone, whatsapp FROM govo_merchant_leads WHERE id=$1 AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false LIMIT 1`, [req.params.id]);
      if (!r.rows[0]) return jsonError(res, 404, 'not_found', 'Shop not found');
      const shop = publicShop(r.rows[0]);
      shop.products = await productsFor(r.rows[0].id, r.rows[0].phone || r.rows[0].whatsapp || '');
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, dataSource: 'postgres:govo_merchant_leads+products', shop });
    } catch (e) { next(e); }
  });

  app.get('/api/govo-flow/services', async (req, res, next) => {
    try {
      const params = [];
      const where = [`COALESCE(public_visible,true)=true`, `COALESCE(is_demo,false)=false`, `LOWER(COALESCE(status,'pending')) IN ('approved','active','verified','trusted','confirmed')`];
      if (req.query.area) { params.push(qlike(req.query.area)); where.push(`LOWER(COALESCE(area,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`); }
      if (req.query.q) { params.push(qlike(req.query.q)); where.push(`LOWER(COALESCE(provider_name,'') || ' ' || COALESCE(service_type,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(description,'')) LIKE $${params.length}`); }
      const rows = await pool.query(`SELECT id, provider_name, service_type, area, description, is_available, is_verified, is_trusted, emergency_available FROM govo_service_providers WHERE ${where.join(' AND ')} ORDER BY emergency_available DESC, is_trusted DESC, id DESC LIMIT 100`, params);
      const fallback = CATEGORIES.filter((c) => c.key !== 'all-shops').map((c) => publicService({ key: c.key, name: c.en, service_type: c.en, desc: c.bn, area: AREAS.join(', '), is_available: true }));
      const services = rows.rows.length ? rows.rows.map(publicService) : fallback;
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, dataSource: rows.rows.length ? 'postgres:govo_service_providers' : 'static:canonical-categories', services, empty: rows.rows.length === 0 });
    } catch (e) { next(e); }
  });

  app.get('/api/govo-flow/services/:id', async (req, res, next) => {
    try {
      if (/^\d+$/.test(String(req.params.id))) {
        const r = await pool.query(`SELECT id, provider_name, service_type, area, address, description, is_available, is_verified, is_trusted, emergency_available FROM govo_service_providers WHERE id=$1 AND COALESCE(public_visible,true)=true AND COALESCE(is_demo,false)=false LIMIT 1`, [req.params.id]);
        if (r.rows[0]) return res.json({ ok: true, dataSource: 'postgres:govo_service_providers', service: publicService(r.rows[0]) });
      }
      const c = CATEGORIES.find((x) => x.key === req.params.id);
      if (!c) return jsonError(res, 404, 'not_found', 'Service not found');
      res.json({ ok: true, dataSource: 'static:canonical-categories', service: publicService({ key: c.key, name: c.en, service_type: c.en, desc: c.bn, area: AREAS.join(', '), is_available: true }) });
    } catch (e) { next(e); }
  });

  app.post('/api/govo-flow/orders', async (req, res, next) => {
    try {
      const b = req.body || {};
      const customerName = safe(b.customer_name || b.name, 120);
      const customerPhone = phone(b.customer_phone || b.phone);
      const customerAddress = safe(b.customer_address || b.address || b.drop_location, 300);
      const items = safe(b.items || b.item_details || b.details || b.message, 1200);
      if (!customerName || !customerPhone || !customerAddress || !items) return jsonError(res, 400, 'missing_fields', 'Name, phone, address and request details are required');
      if (!okPhone(customerPhone)) return jsonError(res, 400, 'invalid_phone', 'Enter a valid Bangladeshi phone number');
      const inserted = await pool.query(`INSERT INTO govo_orders (customer_name, customer_phone, customer_area, customer_address, order_type, merchant_id, merchant_name, shop_name, merchant_phone, provider_id, provider_name, items, item_details, note, pickup_location, drop_location, payment_method, payment_status, status, priority, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$4,$15,'unpaid','phone_confirming','normal',NOW(),NOW()) RETURNING *`, [customerName, customerPhone, safe(b.customer_area || b.area, 80), customerAddress, safe(b.order_type || 'delivery', 40), b.merchant_id || null, safe(b.merchant_name || b.shop_name, 160), safe(b.shop_name || b.merchant_name, 160), safe(b.merchant_phone, 40), b.provider_id || null, safe(b.provider_name, 160), items, safe(b.note, 800), safe(b.pickup_location, 240), safe(b.payment_method || 'cash', 40)]);
      const code = `GOVO-${today()}-${String(inserted.rows[0].id).padStart(5, '0')}`;
      const updated = await pool.query(`UPDATE govo_orders SET order_code=$1 WHERE id=$2 RETURNING *`, [code, inserted.rows[0].id]);
      await pool.query(`INSERT INTO govo_order_events (order_id, event_type, status, note, actor_type, actor_name) VALUES ($1,'created','phone_confirming','Customer request submitted','customer','Customer')`, [inserted.rows[0].id]);
      sendTelegram(['New GOVO Order', `Order: ${code}`, `Type: ${safe(b.order_type || 'delivery')}`, `Area: ${safe(b.customer_area || b.area)}`].join('\n')).catch(() => {});
      res.status(201).json({ ok: true, dataSource: 'postgres:govo_orders+govo_order_events', order: publicOrder(updated.rows[0], [{ status: 'phone_confirming', note: 'Customer request submitted', actor_type: 'customer', created_at: new Date().toISOString() }]), trackingUrl: `/orders/${encodeURIComponent(code)}` });
    } catch (e) { next(e); }
  });

  app.get('/api/govo-flow/orders', async (req, res, next) => {
    try {
      const p = phone(req.query.phone || '');
      if (!p) return jsonError(res, 400, 'missing_phone', 'Phone is required');
      const rows = await pool.query(`SELECT * FROM govo_orders WHERE customer_phone=$1 ORDER BY id DESC LIMIT 50`, [p]);
      res.json({ ok: true, dataSource: 'postgres:govo_orders', orders: rows.rows.map((x) => publicOrder(x)) });
    } catch (e) { next(e); }
  });

  app.get('/api/govo-flow/orders/:id', async (req, res, next) => {
    try {
      const value = safe(req.params.id, 80);
      const r = await pool.query(/^GOVO-/i.test(value) ? `SELECT * FROM govo_orders WHERE order_code=$1 LIMIT 1` : `SELECT * FROM govo_orders WHERE id::text=$1 LIMIT 1`, [value]);
      if (!r.rows[0]) return jsonError(res, 404, 'not_found', 'Order not found');
      const events = await pool.query(`SELECT event_type, status, note, actor_type, actor_name, created_at FROM govo_order_events WHERE order_id=$1 ORDER BY id ASC LIMIT 100`, [r.rows[0].id]);
      res.json({ ok: true, dataSource: 'postgres:govo_orders+govo_order_events', order: publicOrder(r.rows[0], events.rows) });
    } catch (e) { next(e); }
  });

  app.post('/api/govo-flow/service-requests', async (req, res, next) => {
    try {
      const b = req.body || {};
      const customerName = safe(b.customer_name || b.name, 120);
      const customerPhone = phone(b.customer_phone || b.phone);
      const address = safe(b.customer_address || b.service_address || b.address, 300);
      const serviceType = safe(b.service_type || b.service || b.need, 160);
      const problem = safe(b.problem_details || b.details || b.message, 1200);
      if (!customerName || !customerPhone || !address || !serviceType || !problem) return jsonError(res, 400, 'missing_fields', 'Name, phone, address, service and details are required');
      if (!okPhone(customerPhone)) return jsonError(res, 400, 'invalid_phone', 'Enter a valid Bangladeshi phone number');
      const inserted = await pool.query(`INSERT INTO govo_service_requests (customer_name, customer_phone, customer_area, customer_address, service_address, service_type, provider_id, provider_name, provider_phone, preferred_time, problem_details, note, customer_note, status, priority, created_at, updated_at) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$11,'phone_confirming','normal',NOW(),NOW()) RETURNING *`, [customerName, customerPhone, safe(b.customer_area || b.area, 80), address, serviceType, b.provider_id || null, safe(b.provider_name, 160), safe(b.provider_phone, 40), safe(b.preferred_time || b.schedule, 160), problem, safe(b.note, 800)]);
      const code = `SRV-${today()}-${String(inserted.rows[0].id).padStart(5, '0')}`;
      const updated = await pool.query(`UPDATE govo_service_requests SET request_code=$1 WHERE id=$2 RETURNING *`, [code, inserted.rows[0].id]);
      await pool.query(`INSERT INTO govo_service_events (request_id, event_type, status, note, actor_type, actor_name) VALUES ($1,'created','phone_confirming','Customer service request submitted','customer','Customer')`, [inserted.rows[0].id]);
      sendTelegram(['New GOVO Service Request', `Request: ${code}`, `Service: ${serviceType}`, `Area: ${safe(b.customer_area || b.area)}`].join('\n')).catch(() => {});
      res.status(201).json({ ok: true, dataSource: 'postgres:govo_service_requests+govo_service_events', request: { code, status: 'phone_confirming' }, trackingUrl: `/orders/${encodeURIComponent(code)}` });
    } catch (e) { next(e); }
  });

  app.post('/api/govo-flow/support', async (req, res, next) => {
    try {
      const b = req.body || {};
      const customerPhone = phone(b.customer_phone || b.phone);
      const message = safe(b.message || b.details, 1200);
      if (!customerPhone || !message) return jsonError(res, 400, 'missing_fields', 'Phone and message are required');
      if (!okPhone(customerPhone)) return jsonError(res, 400, 'invalid_phone', 'Enter a valid Bangladeshi phone number');
      const inserted = await pool.query(`INSERT INTO govo_support_tickets (customer_name, customer_phone, customer_area, subject, message, related_type, related_code, priority, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'normal','open',NOW(),NOW()) RETURNING *`, [safe(b.customer_name || b.name, 120), customerPhone, safe(b.customer_area || b.area, 80), safe(b.subject || 'Support request', 160), message, safe(b.related_type || 'general', 40), safe(b.related_code || '', 80)]);
      const code = `SUP-${today()}-${String(inserted.rows[0].id).padStart(5, '0')}`;
      const updated = await pool.query(`UPDATE govo_support_tickets SET ticket_code=$1 WHERE id=$2 RETURNING *`, [code, inserted.rows[0].id]);
      await pool.query(`INSERT INTO govo_support_events (ticket_id, event_type, status, note, actor_type, actor_name) VALUES ($1,'created','open','Customer support ticket submitted','customer','Customer')`, [inserted.rows[0].id]);
      sendTelegram(['New GOVO Support Ticket', `Ticket: ${code}`, `Subject: ${safe(b.subject || 'Support request')}`].join('\n')).catch(() => {});
      res.status(201).json({ ok: true, dataSource: 'postgres:govo_support_tickets+govo_support_events', ticket: { code: updated.rows[0].ticket_code, status: updated.rows[0].status }, trackingUrl: `/orders/${encodeURIComponent(code)}` });
    } catch (e) { next(e); }
  });


  app.post('/api/govo-flow/system-test/e2e', async (req, res, next) => {
    const token = String(req.get('x-govo-system-test') || '').trim();
    if (token !== 'full-flow-connect') return jsonError(res, 403, 'forbidden', 'System test header required');
    const client = await pool.connect();
    const history = [];
    try {
      await client.query('BEGIN');
      let rider = await client.query(`SELECT id, COALESCE(rider_name,name) AS rider_name, phone FROM govo_rider_leads WHERE LOWER(COALESCE(status,'pending'))='approved' ORDER BY id DESC LIMIT 1`);
      let rollbackTestRiderCreated = false;
      if (!rider.rows.length) {
        rider = await client.query(`INSERT INTO govo_rider_leads (rider_name, phone, location, vehicle_type, experience, status, is_available, public_visible, is_demo, created_at, updated_at) VALUES ('SYSTEM_TEST Approved Rider','01900000001','Meherpur','Bike','Rollback-only e2e rider','approved',true,false,true,NOW(),NOW()) RETURNING id, rider_name, phone`);
        rollbackTestRiderCreated = true;
      }
      const rd = rider.rows[0];
      const inserted = await client.query(`INSERT INTO govo_orders (customer_name, customer_phone, customer_area, customer_address, order_type, merchant_name, shop_name, items, item_details, note, pickup_location, drop_location, payment_method, payment_status, status, priority, created_at, updated_at) VALUES ('SYSTEM_TEST GOVO Flow','01900000000','Meherpur','Rollback test address','system_test','SYSTEM_TEST Merchant','SYSTEM_TEST Shop','Rollback test request','Rollback test request','SYSTEM_TEST rollback-only e2e','Meherpur','Meherpur','cash','unpaid','phone_confirming','normal',NOW(),NOW()) RETURNING *`);
      const id = inserted.rows[0].id;
      const code = `SYSTEM-TEST-${today()}-${String(id).padStart(5, '0')}`;
      await client.query(`UPDATE govo_orders SET order_code=$1 WHERE id=$2`, [code, id]);
      await client.query(`INSERT INTO govo_order_events (order_id, event_type, status, note, actor_type, actor_name) VALUES ($1,'created','phone_confirming','Rollback-only customer request created','system_test','GOVO System Test')`, [id]);
      history.push({ status: 'phone_confirming', actor: 'customer', timestamp: new Date().toISOString() });

      const canTransition = (from, to, role) => {
        const target = statusByKey.get(to);
        if (!target) return false;
        if (role && !target.roles.includes(role)) return false;
        return target.previous.includes(from);
      };
      const invalidJumpRejected = !canTransition('phone_confirming', 'paid', 'admin');
      if (!invalidJumpRejected) throw new Error('Invalid status jump unexpectedly allowed');

      async function transition(from, to, role, note) {
        if (!canTransition(from, to, role)) throw new Error(`Invalid transition ${from} -> ${to}`);
        const fields = [`status=$1`, `updated_at=NOW()`];
        const params = [to];
        if (to === 'assigned') {
          params.push(rd.id, rd.rider_name || '', rd.phone || '');
          fields.push(`assigned_rider_id=$${params.length - 2}`, `rider_id=$${params.length - 2}`, `assigned_rider_name=$${params.length - 1}`, `rider_name=$${params.length - 1}`, `assigned_rider_phone=$${params.length}`, `rider_phone=$${params.length}`);
        }
        if (to === 'paid') fields.push(`payment_status='paid'`);
        params.push(id);
        await client.query(`UPDATE govo_orders SET ${fields.join(', ')} WHERE id=$${params.length}`, params);
        await client.query(`INSERT INTO govo_order_events (order_id, event_type, status, note, actor_type, actor_name) VALUES ($1,'status',$2,$3,$4,$5)`, [id, to, note, role, role === 'rider' ? rd.rider_name || 'Rider' : 'Admin']);
        history.push({ status: to, actor: role, note, timestamp: new Date().toISOString() });
        return to;
      }

      let current = 'phone_confirming';
      current = await transition(current, 'confirmed', 'admin', 'Phone confirming completed');
      current = await transition(current, 'assigned', 'admin', 'Approved rider assigned');
      current = await transition(current, 'on_the_way', 'rider', 'Rider started');
      current = await transition(current, 'working', 'rider', 'Work in progress');
      current = await transition(current, 'completed', 'rider', 'Work completed');
      current = await transition(current, 'paid', 'admin', 'Payment marked paid');
      current = await transition(current, 'feedback', 'customer', 'Feedback received');
      const events = await client.query(`SELECT COUNT(*)::int AS total FROM govo_order_events WHERE order_id=$1`, [id]);
      await client.query('ROLLBACK');
      res.json({ ok: true, rolledBack: true, notificationsSent: false, dataSource: 'postgres:transaction-rollback', orderCode: code, rollbackTestRiderCreated, riderAssigned: { id: rd.id, name: rd.rider_name || '', phone: rd.phone || '' }, invalidJumpRejected, history, eventCount: events.rows[0].total });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      next(e);
    } finally {
      client.release();
    }
  });

  app.get('/api/govo-flow/admin/summary', async (req, res, next) => {
    try {
      if (requireAdmin && !requireAdmin(req, res)) return;
      const [orders, merchants, riders, services, support, finance] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'phone_confirming')='phone_confirming')::int phone_confirming, COUNT(*) FILTER (WHERE COALESCE(status,'')='assigned')::int assigned, COUNT(*) FILTER (WHERE COALESCE(status,'')='completed')::int completed FROM govo_orders`),
        pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'pending')) IN ('pending','new'))::int pending FROM govo_merchant_leads`),
        pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'pending')) IN ('pending','new'))::int pending FROM govo_rider_leads`),
        pool.query(`SELECT COUNT(*)::int total FROM govo_service_requests`),
        pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE COALESCE(status,'open')='open')::int open FROM govo_support_tickets`),
        pool.query(`SELECT COUNT(*)::int total FROM govo_finance_ledger`)
      ]);
      res.json({ ok: true, dataSource: 'postgres:admin-summary', orders: orders.rows[0], merchants: merchants.rows[0], riders: riders.rows[0], serviceRequests: services.rows[0], support: support.rows[0], payments: finance.rows[0] });
    } catch (e) { next(e); }
  });
};
