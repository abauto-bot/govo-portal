'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderHeader, ROLE_CONFIG } = require('../govo_header_v28');

const expected = {
  customer: 'OPERATION • TRUST • SPEED • EASY',
  merchant: 'MERCHANT PORTAL',
  rider: 'RIDER PORTAL',
  provider: 'SERVICE PROVIDER',
  admin: 'ADMIN OS'
};

for (const [role, subtitle] of Object.entries(expected)) {
  assert.equal(ROLE_CONFIG[role].subtitle, subtitle);
  const html = renderHeader({
    role,
    logo: '<svg data-test-logo></svg>',
    adminNav: '<nav data-test-admin-nav></nav>',
    themeToggle: '<button data-test-theme></button>'
  });
  assert.match(html, /GOVO EXPRESS/);
  assert.ok(html.includes(subtitle), `${role} subtitle missing`);
  assert.match(html, /data-test-logo/);
  assert.match(html, new RegExp(`govo-v28-header-${role}`));
}

const v20Customer = renderHeader({
  role: 'customer',
  surface: 'v20',
  logo: '<img data-test-v20-logo>',
  actions: '<a data-test-v20-action></a>'
});
assert.match(v20Customer, /v20-top/);
assert.match(v20Customer, /OPERATION • TRUST • SPEED • EASY/);
assert.match(v20Customer, /data-test-v20-logo/);
assert.match(v20Customer, /data-test-v20-action/);

const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const v20Pages = fs.readFileSync(path.join(root, 'govo_v20_pages.js'), 'utf8');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');

assert.match(server, /renderHeader: renderV28Header/);
assert.match(server, /Admin approval required before account creation/);
assert.match(server, /merchant application is not approved yet/);
assert.match(server, /rider application is not approved yet/);
assert.match(v20Pages, /surface:'v20'/);
assert.match(dockerfile, /COPY govo_header_v28\.js/);

console.log('GOVO V28 source smoke passed');
