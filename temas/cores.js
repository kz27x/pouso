// Gera as cores dos 12 temas companheiros a partir do mesmo motor OKLCH da extensão.
global.window = {};
require('../src/palette.js');
const PP = window.PousoPalette;
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const out = [];
const mk = (id, name, en, style, mode, c) => {
  const P = PP.build(style, mode, c.h, c.c, c.h2);
  const H = (L, C, h) => hexToRgb(PP.hexFromOklch(L, C, h));
  let frame, frameIn, toolbar, omni, tabText, bgText, icon, ntp;
  if (style === 'brasa') {
    frame = H(0.15, Math.min(0.03, c.c * 0.14), c.h); frameIn = H(0.12, Math.min(0.02, c.c * 0.1), c.h);
    toolbar = H(0.21, Math.min(0.035, c.c * 0.17), c.h); omni = H(0.13, Math.min(0.025, c.c * 0.12), c.h);
    tabText = hexToRgb(P.hex.text); bgText = hexToRgb(P.hex.muted); icon = H(0.72, c.c * 0.85, c.h); ntp = frameIn;
  } else if (mode === 'dark') {
    const nh = 285;
    frame = H(0.2, 0.04, nh); frameIn = H(0.17, 0.03, nh); toolbar = H(0.26, 0.045, nh); omni = H(0.17, 0.035, nh);
    tabText = hexToRgb(P.hex.text); bgText = hexToRgb(P.hex.muted); icon = H(0.82, 0.08, c.h); ntp = frameIn;
  } else {
    frame = H(0.885, c.c * 0.55, c.h); frameIn = H(0.92, c.c * 0.35, c.h);
    toolbar = H(0.975, c.c * 0.16, c.h); omni = H(0.93, c.c * 0.3, c.h);
    tabText = hexToRgb(P.hex.text); bgText = H(0.42, c.c * 0.4, c.h); icon = H(0.5, c.c * 1.3, c.h); ntp = toolbar;
  }
  out.push({ id, name, en, style, mode, accent: P.hex.accent, wall: [P.w0, P.w1, P.w2, P.w3].map((x) => x.lin), h: c.h, c: c.c, h2: c.h2,
    colors: { frame, frame_inactive: frameIn, frame_incognito: frameIn, frame_incognito_inactive: frameIn, toolbar, tab_text: tabText,
      tab_background_text: bgText, tab_background_text_inactive: bgText, bookmark_text: tabText, toolbar_button_icon: icon, toolbar_text: tabText,
      omnibox_background: omni, omnibox_text: tabText, ntp_background: ntp, ntp_text: tabText, ntp_link: icon, button_background: toolbar } });
};
PP.COLORS.brasa.forEach((c) => mk('brasa-' + c.id, c.name, c.en, 'brasa', 'dark', c));
PP.COLORS.bruma.forEach((c) => mk('bruma-' + c.id, c.name, c.en, 'bruma', 'light', c));
const ch = PP.COLORS.bruma.find((c) => c.id === 'champanhe');
mk('bruma-noite', 'Noite', 'Night', 'bruma', 'dark', ch);
require('fs').writeFileSync(__dirname + '/cores.json', JSON.stringify(out, null, 1));
console.log(out.map((o) => o.id + ' ' + JSON.stringify(o.colors.frame)).join('\n'));
