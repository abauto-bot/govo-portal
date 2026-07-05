const GOVO_BRAND = {
  name: "GOVO Express",
  shortName: "GOVO",
  tagline: "SAVE TIME • FAST DONE",
  promise: "All services in one place",

  colors: {
    primary: "#16A34A",
    deep: "#047A3D",
    dark: "#0D0D0D",
    slate: "#64748B",
    soft: "#F3F5F9",
    white: "#FFFFFF",
    danger: "#EF4444",
    warning: "#F59E0B"
  },

  ui: {
    maxMobileWidth: "430px",
    radius: "16px",
    bigRadius: "24px",
    shadow: "0 14px 35px rgba(15, 23, 42, 0.10)",
    fastTransition: "180ms ease",
    normalTransition: "260ms ease",
    slowTransition: "420ms ease"
  },

  logo: {
    wordmark: "GOVO",
    submark: "EXPRESS",
    clockO: true,
    speedLines: true,
    editable: true
  },

  hero: {
    eyebrow: "GOVO EXPRESS",
    titleLine1: "SAVE TIME",
    titleLine2: "FAST DONE",
    subtitle: "All services in one place",
    primaryCta: "Book a Service",
    secondaryCta: "Explore Services"
  },

  bottomNav: [
    { key: "home", label: "Home", href: "/app" },
    { key: "orders", label: "Orders", href: "/orders" },
    { key: "go", label: "GO", href: "/app" },
    { key: "support", label: "Support", href: "/support" },
    { key: "account", label: "Account", href: "/account" }
  ],

  services: [
    { key: "delivery", label: "Delivery", icon: "delivery", href: "/order" },
    { key: "shops", label: "Shops", icon: "shops", href: "/shops" },
    { key: "services", label: "Services", icon: "services", href: "/services" },
    { key: "ride", label: "Ride", icon: "ride", href: "/ride" },
    { key: "doctor", label: "Doctor", icon: "doctor", href: "/services?cat=doctor" },
    { key: "home", label: "Home Service", icon: "home", href: "/services?cat=home" },
    { key: "agri", label: "Agri Service", icon: "agri", href: "/services?cat=agri" },
    { key: "more", label: "More", icon: "more", href: "/services" }
  ],

  merchant: {
    title: "Become a Merchant",
    subtitle: "Grow your business with GOVO",
    cta: "Join Now",
    href: "/merchant"
  },

  rider: {
    title: "Become a Rider",
    subtitle: "Earn more with GOVO Express",
    cta: "Join as Rider",
    href: "/rider"
  },

  trustCards: [
    { title: "All Services", subtitle: "In One Place", icon: "grid" },
    { title: "Save Time", subtitle: "Everytime", icon: "clock" },
    { title: "Fast & Reliable", subtitle: "Quick Service", icon: "bolt" },
    { title: "Trusted Network", subtitle: "Verified Partners", icon: "shield" }
  ]
};

if (typeof module !== "undefined") {
  module.exports = GOVO_BRAND;
}

if (typeof window !== "undefined") {
  window.GOVO_BRAND = GOVO_BRAND;
}
