function icon(name){
  const base='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const m={
    home:`<svg ${base}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    shops:`<svg ${base}><path d="M4 10h16l-1-5H5l-1 5Z"/><path d="M6 10v9h12v-9"/><path d="M9 19v-5h6v5"/></svg>`,
    services:`<svg ${base}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4"/><path d="M15 5l4 4"/></svg>`,
    delivery:`<svg ${base}><path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`,
    account:`<svg ${base}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    ai:`<svg ${base}><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z"/></svg>`,
    menu:`<svg ${base}><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    search:`<svg ${base}><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`
  };
  return m[name]||m.services;
}
module.exports={icon};
