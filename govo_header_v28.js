'use strict';

const ROLE_CONFIG = Object.freeze({
  customer: {
    subtitle: 'OPERATION • TRUST • SPEED • EASY',
    home: 'https://app.govoexpress.com/app'
  },
  merchant: {
    subtitle: 'MERCHANT PORTAL',
    home: '/merchant/dashboard'
  },
  rider: {
    subtitle: 'RIDER PORTAL',
    home: '/rider/dashboard'
  },
  provider: {
    subtitle: 'SERVICE PROVIDER',
    home: '/provider/dashboard'
  },
  admin: {
    subtitle: 'ADMIN OS',
    home: '/admin/os'
  }
});

function renderBrand(role, logo) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.customer;
  return `<a class="govo-v28-brand govo-master-brand" href="${config.home}" aria-label="GOVO Express ${config.subtitle}">
    ${logo}
    <span class="govo-master-copy">
      <strong>GOVO EXPRESS</strong>
      <small>${config.subtitle}</small>
    </span>
  </a>`;
}

function roleLinks(role) {
  if (role === 'merchant') {
    return '<a href="/merchant/dashboard">Dashboard</a><a href="/merchant/products">Products</a><a href="/merchant/dashboard#orders">Orders</a><a href="/merchant/logout">Logout</a>';
  }
  if (role === 'rider') {
    return '<a href="/rider/dashboard">Dashboard</a><a href="/rider/jobs">Jobs</a><a href="/rider/active">Active</a><a href="/rider/history">History</a><a href="/rider/support">Support</a>';
  }
  if (role === 'provider') {
    return '<a href="/provider/dashboard">Dashboard</a><a href="/provider/dashboard#requests">Requests</a><a href="/services">Public Services</a><a href="/support">Support</a>';
  }
  return '';
}

function renderPortalHeader({ role, logo, adminNav = '', themeToggle = '' }) {
  const isAdmin = role === 'admin';
  return `<header class="govo-role-topbar govo-v28-header govo-v28-header-${role}">
    <div class="govo-v28-header-row">
      ${renderBrand(role, logo)}
      <div class="govo-role-actions">
        ${isAdmin ? themeToggle : '<a href="/support" aria-label="Support">?</a>'}
        <button type="button" onclick="document.body.classList.toggle('govo-role-menu-open')" aria-label="Menu">☰</button>
      </div>
    </div>
    ${isAdmin ? adminNav : `<nav class="govo-role-menu">${roleLinks(role)}</nav>`}
  </header>`;
}

function renderCustomerHeader({ logo }) {
  return `<header class="govo-final-topbar govo-v28-header govo-v28-header-customer">
    <div class="govo-final-row">
      ${renderBrand('customer', logo)}
      <button type="button" class="govo-final-menu-btn" aria-label="Open GOVO menu" onclick="event.stopPropagation();document.body.classList.toggle('govo-final-open')">
        <i></i><i></i><i></i>
      </button>
    </div>
    <nav class="govo-final-panel">
      <button type="button" onclick="event.stopPropagation(); if(window.govoToggleTheme){window.govoToggleTheme()}">☀️ / 🌙 Theme</button>
      <a href="https://app.govoexpress.com/app">🏠 App</a>
      <a href="https://app.govoexpress.com/shops">🏪 Shops</a>
      <a href="https://app.govoexpress.com/services">🛠️ Services</a>
      <a href="https://app.govoexpress.com/track">🔎 Track</a>
      <a href="https://app.govoexpress.com/support">☎️ Support</a>
      <a href="https://merchant.govoexpress.com/merchant/dashboard">🏬 Merchant Login</a>
      <a href="https://merchant.govoexpress.com/merchant">➕ Merchant Join</a>
      <a href="https://rider.govoexpress.com/rider">🏍️ Rider</a>
    </nav>
  </header>`;
}

function renderV20CustomerHeader({ logo, actions = '' }) {
  return `<header class="v20-top govo-v28-header govo-v28-header-customer">
    <a class="v20-brand govo-v28-brand" href="/app">
      ${logo}
      <div><strong>GOVO EXPRESS</strong><small>${ROLE_CONFIG.customer.subtitle}</small></div>
    </a>
    <div class="v20-top-actions">${actions}</div>
  </header>`;
}

function renderHeader(options) {
  const role = ROLE_CONFIG[options.role] ? options.role : 'customer';
  if (role === 'customer' && options.surface === 'v20') {
    return renderV20CustomerHeader(options);
  }
  return role === 'customer'
    ? renderCustomerHeader(options)
    : renderPortalHeader({ ...options, role });
}

module.exports = {
  ROLE_CONFIG,
  renderHeader
};
