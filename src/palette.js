/* Pouso — motor de cor.
   Uma cor (matiz + vivacidade) vira a paleta inteira da interface e do papel de parede,
   calculada em OKLCH e conferida por contraste (WCAG). */
(function (P) {
  'use strict';

  // ---------- conversões ----------
  function oklchToLinear(L, C, h) {
    const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  const inGamut = (c) => c.every((v) => v >= -0.0005 && v <= 1.0005);
  // mantém L e h; reduz o croma até caber no sRGB (evita cor "estourada")
  function toLinear(L, C, h) {
    let lin = oklchToLinear(L, C, h);
    if (inGamut(lin)) return lin;
    let lo = 0, hi = C;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(L, mid, h))) lo = mid; else hi = mid;
    }
    return oklchToLinear(L, lo, h).map((v) => Math.min(1, Math.max(0, v)));
  }
  const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const toHex = (lin) => '#' + lin.map((v) => Math.round(Math.min(1, Math.max(0, enc(v))) * 255).toString(16).padStart(2, '0')).join('');
  const lum = (lin) => 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  // Ajusta a luminosidade de uma cor até atingir o contraste mínimo contra o fundo.
  function ensure(L, C, h, bgLin, min) {
    const dark = lum(bgLin) > 0.18;            // fundo claro → empurra a cor para o escuro
    let l = L;
    for (let i = 0; i < 40 && contrast(toLinear(l, C, h), bgLin) < min; i++) l += dark ? -0.02 : 0.02;
    return { L: Math.min(1, Math.max(0, l)), C, h };
  }

  // ---------- cores sugeridas ----------
  P.COLORS = {
    brasa: [
      { id: 'rubi', name: 'Rubi', en: 'Ruby', h: 25, c: 0.23 },
      { id: 'ambar', name: 'Âmbar', en: 'Amber', h: 62, c: 0.18 },
      { id: 'absinto', name: 'Absinto', en: 'Absinthe', h: 135, c: 0.19 },
      { id: 'gelo', name: 'Gelo', en: 'Ice', h: 212, c: 0.13 },
      { id: 'cobalto', name: 'Cobalto', en: 'Cobalt', h: 264, c: 0.21 },
      { id: 'orquidea', name: 'Orquídea', en: 'Orchid', h: 332, c: 0.21 }
    ],
    bruma: [
      { id: 'rose', name: 'Rosé', en: 'Rosé', h: 12, h2: 318, c: 0.085 },
      { id: 'lilas', name: 'Lilás', en: 'Lilac', h: 300, h2: 352, c: 0.095 },
      { id: 'pessego', name: 'Pêssego', en: 'Peach', h: 52, h2: 8, c: 0.09 },
      { id: 'champanhe', name: 'Champanhe', en: 'Champagne', h: 84, h2: 40, c: 0.065 },
      { id: 'salvia', name: 'Sálvia', en: 'Sage', h: 150, h2: 215, c: 0.06 }
    ]
  };

  // ---------- paleta completa ----------
  // style: 'brasa' | 'bruma'; mode: 'dark' | 'light'; h: matiz; c: vivacidade (croma de referência)
  P.build = function (style, mode, h, c, h2) {
    const T = {};
    if (h2 == null) h2 = h - 45;
    const set = (k, L, C, hh) => { T[k] = { L, C, h: hh, lin: toLinear(L, C, hh) }; };
    if (style === 'brasa') {
      // Brasa é sempre escura: luz forte num ponto, o resto quase preto
      set('bg', 0.12, Math.min(0.02, c * 0.1), h);
      set('surface', 0.18, Math.min(0.025, c * 0.12), h);
      set('accent', 0.64, c, h);
      set('accentHi', 0.8, c * 0.7, h + 12);
      // papel de parede: preto → brasa → núcleo quente
      set('w0', 0.07, Math.min(0.015, c * 0.08), h);
      set('w1', 0.3, c * 0.62, h - 4);
      set('w2', 0.6, c, h);
      set('w3', 0.88, c * 0.42, h + 18);
    } else if (mode === 'dark') {
      // noite: o fundo puxa para um anil fundo, a cor escolhida fica no destaque
      const nh = 285 + ((((h2 - 285) % 360) + 540) % 360 - 180) * 0.25;
      set('bg', 0.19, 0.035, nh);
      set('surface', 0.25, 0.04, nh);
      set('accent', 0.8, c * 1.05, h);
      set('accentHi', 0.9, c * 0.6, h + 30);
      set('w0', 0.14, 0.035, nh);
      set('w1', 0.25, 0.05, nh);
      set('w2', 0.5, c * 0.95, h);
      set('w3', 0.86, c * 0.55, h2);
    } else {
      set('bg', 0.965, c * 0.12, h);
      set('surface', 0.99, c * 0.06, h);
      set('accent', 0.56, c * 1.35, h);
      set('accentHi', 0.7, c, h + 25);
      set('w0', 0.975, c * 0.14, h + 15);
      set('w1', 0.9, c * 0.55, h);
      set('w2', 0.78, c * 1.05, h - 8);
      set('w3', 0.86, c * 0.95, h2);
    }
    const bg = T.bg.lin;
    const light = lum(bg) > 0.18;
    // texto: forte, contraste AAA garantido; secundário: AA garantido
    const tx = ensure(light ? 0.24 : 0.96, c * (light ? 0.35 : 0.06), h, bg, 7);
    const mu = ensure(light ? 0.46 : 0.74, c * (light ? 0.3 : 0.08), h, bg, 4.6);
    set('text', tx.L, tx.C, tx.h);
    set('muted', mu.L, mu.C, mu.h);
    // texto em cima da cor de destaque
    const onA = contrast(T.accent.lin, [1, 1, 1]) >= contrast(T.accent.lin, [0, 0, 0]) ? [0.99, 0.004] : [0.16, 0.02];
    set('onAccent', onA[0], onA[1], h);
    T.isLight = light;
    T.hex = {}; Object.keys(T).forEach((k) => { if (T[k] && T[k].lin) T.hex[k] = toHex(T[k].lin); });
    T.contrastText = contrast(T.text.lin, bg);
    return T;
  };

  // cor de ícone harmonizada (mesma luz e croma, matiz vindo do nome do site)
  P.iconColor = function (seed, style, isLight) {
    let n = 0; for (let i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
    const h = n % 360;
    const lin = style === 'brasa' ? toLinear(0.32, 0.09, h) : isLight ? toLinear(0.92, 0.035, h) : toLinear(0.34, 0.06, h);
    return toHex(lin);
  };

  // tema companheiro mais próximo de uma cor livre
  P.nearest = function (style, h) {
    let best = null, d = 1e9;
    P.COLORS[style].forEach((col) => { const dd = Math.min(Math.abs(col.h - h), 360 - Math.abs(col.h - h)); if (dd < d) { d = dd; best = col; } });
    return best;
  };

  P.hexFromOklch = (L, C, h) => toHex(toLinear(L, C, h));
  P.contrast = contrast;
})(window.PousoPalette = window.PousoPalette || {});
