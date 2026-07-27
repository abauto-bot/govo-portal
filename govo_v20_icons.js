function icon(name){
  const b='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const m={
    home:`<svg ${b}><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.8V21h13V9.8"/><path d="M9.2 21v-6.4h5.6V21"/></svg>`,
    shops:`<svg ${b}><path d="M4 9.5h16l-1.3-5H5.3z"/><path d="M5.5 9.5V20h13V9.5"/><path d="M8.5 20v-6h7v6"/><path d="M4 9.5c0 1.6 1 2.7 2.4 2.7s2.4-1.1 2.4-2.7c0 1.6 1 2.7 2.4 2.7s2.4-1.1 2.4-2.7c0 1.6 1 2.7 2.4 2.7s2.4-1.1 2.4-2.7"/></svg>`,
    services:`<svg ${b}><path d="M14.5 5.2a4.4 4.4 0 0 0-5.8 5.8L3.8 16l4.2 4.2 4.9-4.9a4.4 4.4 0 0 0 5.8-5.8l-3 3-3-3z"/></svg>`,
    delivery:`<svg ${b}><path d="M2.5 6.5h11.5v10H2.5z"/><path d="M14 9h4.2l3.3 3.6v3.9H14z"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/></svg>`,
    account:`<svg ${b}><circle cx="12" cy="7.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>`,
    ai:`<svg ${b}><path d="M12 2.8l1.9 4.4L18.2 9l-4.3 1.8L12 15.2l-1.9-4.4L5.8 9l4.3-1.8z"/><path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></svg>`,
    menu:`<svg ${b}><path d="M5 7h14M5 12h14M5 17h14"/><circle cx="3" cy="7" r=".7" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r=".7" fill="currentColor" stroke="none"/><circle cx="3" cy="17" r=".7" fill="currentColor" stroke="none"/></svg>`,
    search:`<svg ${b}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>`,
    track:`<svg ${b}><path d="M12 21s7-5 7-11a7 7 0 1 0-14 0c0 6 7 11 7 11z"/><circle cx="12" cy="10" r="2.3"/></svg>`,
    ride:`<svg ${b}><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 18 9.5 9h4l4.5 9M8 13h8M9.5 9 8 6h-2"/></svg>`,
    doctor:`<svg ${b}><path d="M8 3v6a4 4 0 0 0 8 0V3"/><path d="M5 3h6M13 3h6M12 13v2a4 4 0 0 0 8 0v-1"/><circle cx="20" cy="12" r="1.3"/></svg>`,
    support:`<svg ${b}><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2zM20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2z"/><path d="M17 19c0 1.1-.9 2-2 2h-3"/></svg>`,
    bell:`<svg ${b}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 19h4"/></svg>`,
    location:`<svg ${b}><path d="M12 21s7-5 7-11a7 7 0 1 0-14 0c0 6 7 11 7 11z"/><circle cx="12" cy="10" r="2"/></svg>`,
    orders:`<svg ${b}><path d="M7 3h10v4H7z"/><path d="M5 5h14v16H5z"/><path d="M8 11h8M8 15h8"/></svg>`,
    requests:`<svg ${b}><path d="M8 3h8l4 4v14H4V3z"/><path d="M16 3v5h5M8 13h8M8 17h5"/></svg>`,
    payment:`<svg ${b}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>`,
    language:`<svg ${b}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>`,
    theme:`<svg ${b}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    shield:`<svg ${b}><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    gift:`<svg ${b}><path d="M3 9h18v12H3zM2 5h20v4H2zM12 5v16"/><path d="M12 5H8.5A2.5 2.5 0 1 1 11 2.5c0 1.5 1 2.5 1 2.5zM12 5h3.5A2.5 2.5 0 1 0 13 2.5c0 1.5-1 2.5-1 2.5z"/></svg>`,
    logout:`<svg ${b}><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h6v18h-6"/></svg>`,
    more:`<svg ${b}><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`
  };
  return m[name]||m.services;
}
module.exports={icon};
