// Isolated GOVO V20 support page module

// Existing V20 theme/icon imports would be here if available and safe to reuse.
// For now, we rely on general V20 styling principles.

function renderSupportPage() {
  // Preserving existing support links/actions identified previously:
  // /order, /service-request, /merchant, /rider
  return `
    <div class="v20-container v20-support-page">
      <header class="v20-header">
        <img src="/uploads/govo-logo.png" alt="GOVO Logo" class="govo-logo"/>
        <span class="v20-kicker">Support</span>
        <h1>Need Help?</h1>
        <p class="v20-lead">Customer, merchant, rider—all help requests are routed here.</p>
      </header>
      <main class="v20-main">
        <div class="v20-grid">
          <a class="v20-card v20-link" href="/order">
            <div class="v20-icon"></div>
            <h3>Delivery Help</h3>
            <p>Order/delivery issue</p>
          </a>
          <a class="v20-card v20-link" href="/service-request">
            <div class="v20-icon"></div>
            <h3>Service Help</h3>
            <p>Technician/local service</p>
          </a>
          <a class="v20-card v20-link" href="/merchant">
            <div class="v20-icon"></div>
            <h3>Merchant Help</h3>
            <p>Shop registration</p>
          </a>
          <a class="v20-card v20-link" href="/rider">
            <div class="v20-icon"></div>
            <h3>Rider Help</h3>
            <p>Rider registration</p>
          </a>
        </div>
      </main>
      <footer class="v20-footer"></footer>
    </div>
  `;
}

module.exports = { renderSupportPage };
