/* Pouso — nova aba.
   Os dados do navegador passam por PousoPlatform: na extensão são reais,
   no protótipo são de exemplo. */
(function () {
  'use strict';
  performance.mark('pouso-app');
  const PP = window.PousoPalette, PW = window.PousoWalls, PG = window.PousoGL;
  const P = window.PousoPlatform, U = window.PousoUI, L = window.PousoI18n, t = L.t;
  const { $, $$, esc, ico, I, toast } = U;

  const EDITIONS = [
    { id: 'meia-noite', name: 'Meia-noite', style: 'brasa', wall: 'b-eclipse', color: 'rubi', clock: 'digital' },
    { id: 'farol', name: 'Farol', style: 'brasa', wall: 'b-fenda', color: 'ambar', clock: 'digital' },
    { id: 'magma', name: 'Magma', style: 'brasa', wall: 'b-liquido', color: 'orquidea', clock: 'analog' },
    { id: 'abissal', name: 'Abissal', style: 'brasa', wall: 'b-horizonte', color: 'gelo', clock: 'digital' },
    { id: 'atelie', name: 'Ateliê', style: 'bruma', wall: 's-camadas', color: 'rose', mode: 'light', clock: 'digital' },
    { id: 'domingo', name: 'Domingo', style: 'bruma', wall: 's-seda', color: 'lilas', mode: 'light', clock: 'digital' },
    { id: 'estufa', name: 'Estufa', style: 'bruma', wall: 's-vidro', color: 'salvia', mode: 'light', clock: 'analog' },
    { id: 'vigilia', name: 'Vigília', style: 'bruma', wall: 's-lua', color: 'champanhe', mode: 'dark', clock: 'analog' }
  ];
  const STYLE_INFO = {
    brasa: { name: 'Brasa', sub: () => t('Escuro, luz forte num ponto, movimento que pulsa') },
    bruma: { name: 'Bruma', sub: () => t('Claro e suave, serifa elegante, movimento que flutua') }
  };
  const FONTS = { firme: "'Archivo', system-ui, sans-serif", elegante: "'Newsreader', Georgia, serif", neutra: "'Geist', system-ui, sans-serif" };
  const CORNERS = { retos: 2, suaves: 12, redondos: 24 };
  const wallName = (w) => t(w.name);
  // no Edge, o texto fala do Edge
  const br = (x) => P.isEdge ? x.replace(/“Usar no Chrome”/g, '“Obter”').replace(/“Add to Chrome”/g, '“Get”').replace(/Chrome/g, 'Edge') : x;
  const colorName = (c) => L.lang === 'en' && c.en ? c.en : c.name;

  // ---------- estado ----------
  const DEFAULTS = {
    v: 2, onboarded: false, style: 'brasa', mode: 'light', layout: 'auto',
    wall: { brasa: 'b-eclipse', bruma: 's-camadas' }, color: { brasa: 'rubi', bruma: 'rose' },
    free: { brasa: { h: 40, c: 0.2 }, bruma: { h: 330, c: 0.09 } },
    clock: 'digital', name: '', greet: true, motion: 0.5, font: 'auto', corners: 'auto', glass: 0.62,
    density: 'completa', show: { greet: true, date: true, search: true, favs: true, clock: true },
    favGroup: '', favHidden: {},
    sleep: { on: true, min: 30, except: [] },
    sessions: P.isExt ? [] : [
      { name: 'Pesquisa da extensão', when: Date.now() - 864e5, tabs: Array.from({ length: 12 }, (_, i) => ({ title: 'Aba ' + (i + 1), url: 'https://example.com/' + i })) },
      { name: 'Trabalho — sexta', when: Date.now() - 2 * 864e5, tabs: Array.from({ length: 7 }, (_, i) => ({ title: 'Aba ' + (i + 1), url: 'https://example.com/' + i })) }
    ]
  };
  let S;
  try {
    const saved = JSON.parse(localStorage.getItem('pouso') || '{}');
    S = Object.assign(structuredClone(DEFAULTS), saved);
    ['wall', 'color', 'free', 'show', 'sleep'].forEach((k) => { S[k] = Object.assign(structuredClone(DEFAULTS[k]), saved[k] || {}); });
  } catch (e) { S = structuredClone(DEFAULTS); }
  const save = () => {
    try { localStorage.setItem('pouso', JSON.stringify(S)); } catch (e) { /* segue na memória */ }
    P.mirror({ sleep: S.sleep });
  };
  P.mirror({ sleep: S.sleep });

  const colorSpec = (style, id) => {
    id = id || S.color[style];
    if (id === 'free') return { id: 'free', name: t('Livre'), h: S.free[style].h, c: S.free[style].c };
    return PP.COLORS[style].find((c) => c.id === id) || PP.COLORS[style][0];
  };
  const modeFor = (style, wallId, mode) => style === 'brasa' ? 'dark' : (PW.byId(wallId).night ? 'dark' : (mode || S.mode));
  const paletteFor = (style, wallId, col, mode) => PP.build(style, modeFor(style, wallId, mode), col.h, col.c, col.h2);
  const wallColors = (Pa) => [Pa.w0.lin, Pa.w1.lin, Pa.w2.lin, Pa.w3.lin];
  const layoutOf = () => S.layout === 'auto' ? (S.style === 'brasa' ? 'canto' : 'centro') : S.layout;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const themeIdFor = (style) => window.PousoThemeId(style, S.color[style], modeFor(style, S.wall[style]), PP.nearest(style, S.free[style].h).id);

  // ---------- papel de parede ----------
  const wallCanvas = $('#wall'), fadeCanvas = $('#wall-fade');
  const R = new PG.Renderer(wallCanvas, { scale: 0.5, fps: 30 });
  let TRi = null;
  const TR = () => TRi || (TRi = new PG.Renderer(Object.assign(document.createElement('canvas'), { width: 400, height: 250 }), { fixed: true, preserve: true }));
  R.phase = PW.moonPhase();
  R.onfail = () => { document.body.classList.add('static-wall'); applyStaticWall(); };
  if (R.failed) document.body.classList.add('static-wall');
  let curWall = null, curP = null, colorTween = 0;

  function applyStaticWall() {
    if (!curP) return;
    const h = curP.hex;
    document.body.style.backgroundImage = `radial-gradient(60% 70% at 62% 35%, ${h.w2}, transparent 70%), radial-gradient(80% 80% at 20% 90%, ${h.w1}, transparent 70%)`;
    document.body.style.backgroundColor = h.w0;
  }
  function crossfade() {
    if (R.failed || !curWall) return;
    R.draw();
    fadeCanvas.width = wallCanvas.width; fadeCanvas.height = wallCanvas.height;
    fadeCanvas.getContext('2d').drawImage(wallCanvas, 0, 0);
    fadeCanvas.style.transition = 'none'; fadeCanvas.style.opacity = 1;
    requestAnimationFrame(() => requestAnimationFrame(() => { fadeCanvas.style.transition = ''; fadeCanvas.style.opacity = 0; }));
  }
  function tweenColors(target) {
    const from = R.colors.map((c) => c.slice());
    const t0 = performance.now(), dur = 700, id = ++colorTween;
    const step = (now) => {
      if (id !== colorTween) return;
      const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      R.colors = from.map((c, i) => c.map((v, j) => v + (target[i][j] - v) * e));
      if (!R.running) R.draw();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // miniaturas: uma vez por combinação
  const thumbs = new Map(); const queue = [];
  function thumbKey(style, wallId, colId, mode) { return [style, wallId, colId, modeFor(style, wallId, mode), colId === 'free' ? JSON.stringify(S.free[style]) : ''].join('|'); }
  function thumbSrc(style, wallId, colId, mode) {
    const k = thumbKey(style, wallId, colId, mode);
    if (thumbs.has(k)) return thumbs.get(k);
    if (!queue.find((q) => q.k === k)) queue.push({ k, style, wallId, colId, mode });
    pump(); return '';
  }
  let pumping = false;
  function pump() {
    if (pumping || !queue.length) return;
    pumping = true;
    setTimeout(() => {
      const q = queue.shift();
      let src = '';
      const tr = TR();
      if (!tr.failed) {
        const Pa = paletteFor(q.style, q.wallId, colorSpec(q.style, q.colId), q.mode);
        tr.layout = 0;
        src = tr.snapshot(PW.byId(q.wallId), wallColors(Pa), { energy: q.style === 'brasa' ? 1 : 0, phase: R.phase, t: 21 }) || '';
      }
      thumbs.set(q.k, src);
      $$(`img[data-thumb="${CSS.escape(q.k)}"]`).forEach((im) => { im.src = src; });
      pumping = false; pump();
    }, 0);
  }
  const thumbImg = (style, wallId, colId, mode) => {
    const k = thumbKey(style, wallId, colId, mode), src = thumbSrc(style, wallId, colId, mode);
    return `<img alt="" data-thumb="${esc(k)}"${src ? ` src="${src}"` : ''}>`;
  };

  // ---------- abertura rápida: guarda o visual para a próxima aba ----------
  let bootT;
  function saveBoot() {
    clearTimeout(bootT);
    bootT = setTimeout(() => {
      const b = document.body, root = document.documentElement.style, vars = {};
      ['--bg', '--surface', '--text', '--muted', '--accent', '--accent-hi', '--on-accent', '--glass-a', '--r'].forEach((k) => { vars[k] = root.getPropertyValue(k); });
      let snap = '';
      if (!R.failed && curWall && wallReady) { try { R.draw(); snap = wallCanvas.toDataURL('image/webp', 0.72); } catch (e) { snap = ''; } }
      const boot = { vars, style: b.dataset.style, layout: b.dataset.layout, density: b.dataset.density, light: b.hasAttribute('data-light'), cls: b.className.replace(/\b(reveal|sheet-open|onboarding|boot)\b/g, '').trim(), font: b.style.getPropertyValue('--f-display'), snap };
      try { localStorage.setItem('pouso-boot', JSON.stringify(boot)); } catch (e) { try { boot.snap = ''; localStorage.setItem('pouso-boot', JSON.stringify(boot)); } catch (e2) { /* sem espaço */ } }
    }, 1200);
  }

  // ---------- aplicar tudo ----------
  function apply(opt) {
    opt = opt || {};
    const style = S.style, wallId = S.wall[style], col = colorSpec(style);
    const Pa = paletteFor(style, wallId, col);
    curP = Pa;
    const root = document.documentElement.style, h = Pa.hex;
    root.setProperty('--bg', h.bg); root.setProperty('--surface', h.surface); root.setProperty('--text', h.text);
    root.setProperty('--muted', h.muted); root.setProperty('--accent', h.accent); root.setProperty('--accent-hi', h.accentHi);
    root.setProperty('--on-accent', h.onAccent);
    root.setProperty('--glass-a', S.glass);
    root.setProperty('--r', (S.corners === 'auto' ? (style === 'brasa' ? 6 : 20) : CORNERS[S.corners]) + 'px');
    const b = document.body;
    b.dataset.style = style; b.dataset.density = S.density; b.dataset.layout = layoutOf();
    b.toggleAttribute('data-light', Pa.isLight);
    if (S.font === 'auto') b.style.removeProperty('--f-display'); else b.style.setProperty('--f-display', FONTS[S.font]);
    b.classList.toggle('no-greet', !S.show.greet || !S.greet);
    b.classList.toggle('no-date', !S.show.date);
    b.classList.toggle('no-search', !S.show.search);
    b.classList.toggle('no-favs', !S.show.favs);
    b.classList.toggle('no-clock', !S.show.clock || S.clock === 'hidden');
    b.classList.toggle('calm', reduced.matches || S.motion === 0);

    if (wallReady) applyWall(Pa, wallId);
    else if (!wallQueued) { wallQueued = true; requestAnimationFrame(() => setTimeout(() => { wallReady = true; applyWall(curP, S.wall[S.style]); saveBoot(); }, 0)); }
    if (R.failed) applyStaticWall();
    renderClock(true); renderGreet(); renderFavs(opt.favEnter);
    if (wallReady) saveBoot();
  }
  let wallReady = false, wallQueued = false;
  // o papel de parede entra depois do primeiro quadro: a aba já aparece com a foto guardada
  function applyWall(Pa, wallId) {
    const w = PW.byId(wallId);
    R.energy = S.style === 'brasa' ? 1 : 0;
    R.layout = { canto: 0, centro: 1, coluna: 2 }[layoutOf()];
    R.speed = reduced.matches ? 0 : S.motion * 2;
    if (!R.failed) {
      if (!curWall) { colorTween++; R.set(w); R.colors = wallColors(Pa); curWall = w.id; R.draw(); }
      else if (curWall !== w.id) { colorTween++; crossfade(); R.set(w); R.colors = wallColors(Pa); curWall = w.id; R.draw(); }
      else tweenColors(wallColors(Pa));
      if (R.speed > 0 && !document.hidden) R.start(); else { R.stop(); R.draw(); }
    }
    if (R.failed) applyStaticWall();
    else { document.body.style.backgroundImage = ''; document.body.style.backgroundColor = ''; }
  }

  // ---------- relógio, saudação e data ----------
  const clockEl = $('#clock');
  let clockMode = null, lastMin = -1;
  const pad = (n) => String(n).padStart(2, '0');
  function analogSVG() {
    let ticks = '';
    for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180, r1 = i % 3 ? 88 : 82; ticks += `<line class="tick" x1="${100 + Math.sin(a) * r1}" y1="${100 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * 92}" y2="${100 - Math.cos(a) * 92}"/>`; }
    return `<svg class="analog" viewBox="0 0 200 200" aria-hidden="true"><circle class="face" cx="100" cy="100" r="96"/>${ticks}
      <g class="gh"><line class="hh" x1="100" y1="104" x2="100" y2="56"/></g><g class="gm"><line class="mh" x1="100" y1="108" x2="100" y2="24"/></g>
      <g class="gs"><circle class="sd" cx="100" cy="11" r="4.2"/></g><circle cx="100" cy="100" r="4" fill="var(--text)"/></svg>`;
  }
  function renderClock(force) {
    const d = new Date(), H = d.getHours(), M = d.getMinutes(), s = d.getSeconds();
    const mode = S.clock + S.style;
    clockEl.setAttribute('aria-label', d.toLocaleTimeString(L.locale, { hour: '2-digit', minute: '2-digit' }));
    if (S.clock === 'analog') {
      if (force || clockMode !== mode) { clockEl.innerHTML = analogSVG(); clockMode = mode; }
      const set = (sel, deg) => { const g = $(sel, clockEl); if (g) g.style.transform = `rotate(${deg}deg)`; };
      set('.gh', (H % 12) * 30 + M * .5); set('.gm', M * 6 + s * .1); set('.gs', s * 6);
    } else if (S.clock === 'digital') {
      if (force || clockMode !== mode || lastMin !== M) {
        const sep = S.style === 'bruma' ? (L.lang === 'pt' ? 'h' : ':') : ':';
        clockEl.innerHTML = S.style === 'brasa'
          ? `${pad(H)}<span class="colon">:</span>${pad(M)}<span class="sec" aria-hidden="true"><i></i></span>`
          : `${pad(H)}<span class="h">${sep}</span>${pad(M)}`;
        clockMode = mode; lastMin = M;
      }
      const bar = $('.sec i', clockEl); if (bar) bar.style.transform = `scaleX(${(s + 1) / 60})`;
    } else clockEl.innerHTML = '';
    if (force || s === 0) renderDate();
  }
  function renderDate() {
    const d = new Date();
    const wd = d.toLocaleDateString(L.locale, { weekday: 'short' }).replace('.', '');
    const mo = d.toLocaleDateString(L.locale, { month: 'short' }).replace('.', '');
    $('#date').textContent = `${wd} · ${d.getDate()} ${mo}`;
    $('#date-under').textContent = d.toLocaleDateString(L.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function greeting() { const h = new Date().getHours(); return t(h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'); }
  function renderGreet() {
    const g = greeting(), n = S.name.trim();
    $('#greet').innerHTML = S.style === 'bruma' ? (n ? `${esc(g)}, <em>${esc(n)}</em>.` : `${esc(g)}.`) : esc(n ? `${g}, ${n}` : g);
  }
  setInterval(() => { renderClock(false); if (new Date().getSeconds() === 0) renderGreet(); }, 1000);

  // ---------- favoritos ----------
  let favGroups = null; // null = sem permissão ainda
  async function loadFavs() { favGroups = await P.favorites(); renderFavs(true); if (sheet.classList.contains('open') && section === 'favoritos') renderPane(); }
  function renderFavs(enter) {
    const box = $('#favs');
    if (favGroups === null) {
      box.innerHTML = P.isExt ? `<button type="button" class="fav-ask" data-favask>${ico('favoritos')}<span>${esc(t('Mostrar meus favoritos aqui'))}</span></button>` : '';
      return;
    }
    const groups = favGroups.filter((g) => !S.favHidden[g.folder]);
    if (!groups.length) { box.innerHTML = ''; return; }
    if (!groups.find((g) => g.folder === S.favGroup)) S.favGroup = groups[0].folder;
    const cur = groups.find((g) => g.folder === S.favGroup);
    const tgt = P.isExt ? '' : ' target="_blank" rel="noopener"';
    box.innerHTML = `<div class="fav-groups">${groups.length > 1 ? groups.map((g) => `<button class="fav-group" type="button" data-fg="${esc(g.folder)}" aria-pressed="${g.folder === S.favGroup}">${esc(g.folder)}</button>`).join('') : ''}</div>
      <ul class="fav-list ${enter ? 'enter' : ''}">${cur.items.slice(0, layoutOf() === 'centro' ? 6 : 8).map((i) => `<li><a class="fav" href="${esc(i.url)}"${tgt}>${U.favIcon(i.title, i.url, S.style, curP && curP.isLight)}<span class="fav-name">${esc(i.title)}</span></a></li>`).join('')}</ul>`;
  }
  $('#favs').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fg]');
    if (b) { S.favGroup = b.dataset.fg; save(); renderFavs(true); return; }
    if (e.target.closest('[data-favask]')) {
      if (await P.request(['bookmarks'])) loadFavs(); else toast(t('Sem problema. Dá para ligar depois em Ajustes › Favoritos.'));
    }
  });

  // ---------- busca ----------
  $('#search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#q').value.trim(); if (!q) return;
    if (!P.search(q)) toast(t('Na extensão, “{q}” vai para o buscador padrão do seu navegador.', { q }));
    $('#q').value = '';
  });

  // ---------- painel de ajustes ----------
  const SECTIONS = [['edicoes', 'Edições'], ['aparencia', 'Aparência'], ['inicio', 'Tela inicial'], ['favoritos', 'Favoritos'], ['abas', 'Abas'], ['atalhos', 'Atalhos'], ['backup', 'Backup'], ['-', ''], ['sobre', 'Sobre']];
  let section = 'edicoes', lastFocus = null;
  const sheet = $('#sheet'), pane = $('#pane');
  $('#open-sheet').innerHTML = ico('sliders');
  $('#close-sheet').innerHTML = ico('close');
  $('.search-ico', $('#search')).innerHTML = ico('search');
  $('.search-go').innerHTML = ico('arrow');
  $('.search-ico', $('#palette')).innerHTML = ico('search');
  $('#rail').innerHTML = `<div class="rail-brand">${I.mark}Pouso</div>` + SECTIONS.map(([id, l]) => id === '-' ? '<div class="rail-sep"></div>' :
    `<button role="tab" id="tab-${id}" data-sec="${id}" aria-selected="false" aria-controls="pane">${ico(id)}<span>${esc(t(l))}</span></button>`).join('');

  function openSheet(sec) {
    if (sec) section = sec;
    lastFocus = document.activeElement;
    sheet.hidden = false; renderPane();
    requestAnimationFrame(() => { sheet.classList.add('open'); document.body.classList.add('sheet-open'); });
    setTimeout(() => $(`#tab-${section}`).focus(), 60);
  }
  function closeSheet() {
    sheet.classList.remove('open'); document.body.classList.remove('sheet-open');
    setTimeout(() => { if (!sheet.classList.contains('open')) sheet.hidden = true; }, 600);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#open-sheet').addEventListener('click', () => sheet.classList.contains('open') ? closeSheet() : openSheet());
  $('#close-sheet').addEventListener('click', closeSheet);
  $('#rail').addEventListener('click', (e) => { const b = e.target.closest('[data-sec]'); if (b) { section = b.dataset.sec; renderPane(true); } });
  $('#rail').addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const tabs = $$('[role=tab]', $('#rail')); const i = tabs.indexOf(document.activeElement);
    const n = tabs[(i + (e.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); section = n.dataset.sec; renderPane(true);
  });

  const pressed = (a, b) => `aria-pressed="${a === b}"`;
  const seg = (act, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-act="${act}" data-v="${v}" ${pressed(String(cur), String(v))}>${esc(l)}</button>`).join('')}</div>`;
  const sw = (act, on, extra) => `<button type="button" class="switch" role="switch" data-act="${act}" aria-checked="${!!on}" ${extra || ''}></button>`;
  const row = (title, sub, ctrl) => `<div class="row"><div class="txt"><b>${esc(title)}</b>${sub ? `<small>${sub}</small>` : ''}</div>${ctrl.replace('role="switch"', `role="switch" aria-label="${esc(title)}"`)}</div>`;
  const range = (act, val, min, max, step, label, cls) => `<input type="range"${cls ? ` class="${cls}"` : ''} data-input="${act}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${esc(label)}" style="--v:${((val - min) / (max - min)) * 100}%">`;
  const motionLabel = () => t(S.motion === 0 ? 'Parado' : S.motion < .4 ? 'Calmo' : S.motion < .75 ? 'Natural' : 'Vivo');
  const swatchColor = (st, c) => PP.hexFromOklch(st === 'brasa' ? .64 : .78, st === 'brasa' ? c.c : c.c * 1.3, c.h);
  const when = (ms) => {
    const d = new Date(ms), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
    const hm = d.toLocaleTimeString(L.locale, { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return t('hoje, {h}', { h: hm });
    if (d.toDateString() === y.toDateString()) return t('ontem, {h}', { h: hm });
    return d.toLocaleDateString(L.locale, { day: 'numeric', month: 'short' }) + ', ' + hm;
  };
  const LAYOUT_SVG = {
    centro: '<rect x="38" y="12" width="24" height="3" rx="1.5"/><rect x="32" y="18" width="36" height="10" rx="2"/><rect x="26" y="33" width="48" height="6" rx="3"/><rect x="33" y="43" width="7" height="7" rx="2"/><rect x="43" y="43" width="7" height="7" rx="2"/><rect x="53" y="43" width="7" height="7" rx="2"/><rect x="63" y="43" width="4" height="7" rx="2" opacity=".4"/>',
    canto: '<rect x="8" y="30" width="16" height="2.5" rx="1.25"/><rect x="8" y="35" width="38" height="13" rx="2"/><rect x="60" y="30" width="32" height="5" rx="2.5"/><rect x="60" y="39" width="14" height="3" rx="1.5"/><rect x="78" y="39" width="14" height="3" rx="1.5"/><rect x="60" y="45" width="14" height="3" rx="1.5"/><rect x="78" y="45" width="14" height="3" rx="1.5"/>',
    coluna: '<rect x="8" y="9" width="18" height="2.5" rx="1.25"/><rect x="8" y="14" width="36" height="12" rx="2"/><rect x="8" y="30" width="44" height="5" rx="2.5"/><rect x="8" y="39" width="12" height="3" rx="1.5"/><rect x="23" y="39" width="12" height="3" rx="1.5"/><rect x="38" y="39" width="12" height="3" rx="1.5"/><rect x="8" y="45" width="12" height="3" rx="1.5"/><rect x="23" y="45" width="12" height="3" rx="1.5"/>'
  };

  let asleepNow = null;
  const PANES = {
    edicoes() {
      const cur = EDITIONS.find((e) => e.style === S.style && e.wall === S.wall[S.style] && e.color === S.color[S.style] && (e.style === 'brasa' || e.mode === S.mode));
      const d = new Date(), hh = pad(d.getHours()), mm = pad(d.getMinutes());
      return `<h2>${esc(t('Edições'))}</h2><p class="lead">${esc(t('Visuais prontos. Um clique troca papel de parede, cor, fonte e relógio de uma vez.'))}</p>
      <div class="editions">${EDITIONS.map((e) => `<button type="button" class="edition" data-act="edition" data-v="${e.id}" ${pressed(cur && cur.id, e.id)}>
        <span class="pic">${thumbImg(e.style, e.wall, e.color, e.mode)}<span class="t ${e.style}" style="color:${e.style === 'bruma' && e.mode === 'light' ? '#2b2230' : '#fff'}">${e.style === 'brasa' ? `${hh}:${mm}` : `${hh}<i>${L.lang === 'pt' ? 'h' : ':'}</i>${mm}`}</span></span>
        <span><b>${esc(t(e.name))}</b><small>${STYLE_INFO[e.style].name} · ${esc(wallName(PW.byId(e.wall)))} · ${esc(colorName(colorSpec(e.style, e.color)))}</small></span></button>`).join('')}</div>
      <p class="hint">${esc(br(t('Cada edição também tem o tema do Chrome combinando. Depois de escolher, dá para mexer em tudo em Aparência.')))}</p>`;
    },
    aparencia() {
      const st = S.style, cols = PP.COLORS[st], freeOn = S.color[st] === 'free';
      return `<h2>${esc(t('Aparência'))}</h2><p class="lead">${esc(t('O clima da sua casa. Tudo muda na hora.'))}</p>
      <div class="group"><p class="label">${esc(t('Estilo'))}</p><div class="styles">${['brasa', 'bruma'].map((s) => `<button type="button" class="style-card ${s}" data-act="style" data-v="${s}" ${pressed(st, s)}>${thumbImg(s, S.wall[s], S.color[s])}<span><b>${STYLE_INFO[s].name}</b><small>${esc(STYLE_INFO[s].sub())}</small></span></button>`).join('')}</div></div>
      ${st === 'bruma' ? `<div class="group"><p class="label">${esc(t('Luz'))}</p>${seg('mode', S.mode, [['light', t('Dia')], ['dark', t('Noite')]])}${PW.byId(S.wall.bruma).night ? `<p class="hint">${esc(t('Lua é sempre noturna.'))}</p>` : ''}</div>` : ''}
      <div class="group"><p class="label">${esc(t('Papel de parede'))} <b>${esc(wallName(PW.byId(S.wall[st])))}</b></p><div class="walls">${PW.ofStyle(st).map((w) => `<button type="button" class="wall-opt" data-act="wall" data-v="${w.id}" ${pressed(S.wall[st], w.id)} aria-label="${esc(wallName(w))}">${thumbImg(st, w.id, S.color[st])}<span class="${modeFor(st, w.id) === 'light' ? 'on-light' : ''}">${esc(wallName(w))}</span></button>`).join('')}</div></div>
      <div class="group"><p class="label">${esc(t('Cor'))} <b>${esc(colorName(colorSpec(st)))}</b></p><div class="swatches">${cols.map((c) => `<button type="button" class="swatch" data-act="color" data-v="${c.id}" ${pressed(S.color[st], c.id)} style="--sw:${swatchColor(st, c)}"><i></i>${esc(colorName(c))}</button>`).join('')}
        <button type="button" class="swatch free" data-act="color" data-v="free" ${pressed(S.color[st], 'free')}><i></i>${esc(t('Outra'))}</button></div>
        <div class="free-row ${freeOn ? 'on' : ''}">${range('hue', S.free[st].h, 0, 359, 1, t('Matiz da cor livre'), 'hue')}</div>
        ${freeOn ? `<p class="hint">${esc(br(t('Tema do Chrome mais próximo: {c}.', { c: colorName(PP.nearest(st, S.free[st].h)) })))}</p>` : ''}</div>
      <div class="group"><p class="label">${esc(t('Relógio'))}</p>${seg('clock', S.clock, [['digital', t('Digital')], ['analog', t('Analógico')], ['hidden', t('Escondido')]])}</div>
      <div class="group"><p class="label">${esc(t('Saudação'))}</p><input class="field" data-input="name" type="text" maxlength="24" placeholder="${esc(t('Como podemos te chamar?'))}" value="${esc(S.name)}" aria-label="${esc(t('Seu nome para a saudação'))}"></div>
      <div class="group"><button type="button" class="btn primary block" data-act="match">${I.mark.replace('<svg', '<svg class="i"')}${esc(br(t('Combinar o Chrome')))}</button>
        <p class="hint">${esc(t('Deixa as abas e a barra do navegador na mesma cor.'))}</p></div>
      <details class="more" ${PANES._more ? 'open' : ''}><summary>${esc(t('Mais opções'))}</summary>
        <div class="group"><p class="label">${esc(t('Movimento'))} <b>${esc(motionLabel())}</b></p>${range('motion', S.motion, 0, 1, .05, t('Intensidade do movimento'))}<div class="range-ends"><span>${esc(t('Parado'))}</span><span>${esc(t('Vivo'))}</span></div>${reduced.matches ? `<p class="hint">${esc(t('Seu sistema pede menos movimento, então o papel fica parado.'))}</p>` : ''}</div>
        <div class="group"><p class="label">${esc(t('Fonte'))}</p>${seg('font', S.font, [['auto', t('Do estilo')], ['firme', t('Firme')], ['elegante', t('Elegante')], ['neutra', t('Neutra')]])}</div>
        <div class="group"><p class="label">${esc(t('Cantos'))}</p>${seg('corners', S.corners, [['auto', t('Do estilo')], ['retos', t('Retos')], ['suaves', t('Suaves')], ['redondos', t('Redondos')]])}</div>
        <div class="group"><p class="label">${esc(t('Vidro'))} <b>${Math.round(S.glass * 100)}%</b></p>${range('glass', S.glass, .2, .95, .01, t('Transparência do vidro'))}<div class="range-ends"><span>${esc(t('Transparente'))}</span><span>${esc(t('Sólido'))}</span></div></div>
      </details>`;
    },
    inicio() {
      const dens = [['minima', t('Mínima'), '<rect x="30" y="20" width="40" height="12" rx="2"/>'],
        ['normal', t('Normal'), '<rect x="34" y="10" width="32" height="3" rx="1.5"/><rect x="28" y="17" width="44" height="12" rx="2"/><rect x="22" y="36" width="56" height="7" rx="3.5"/>'],
        ['completa', t('Completa'), '<rect x="34" y="4" width="32" height="3" rx="1.5"/><rect x="28" y="10" width="44" height="12" rx="2"/><rect x="22" y="27" width="56" height="7" rx="3.5"/><rect x="24" y="40" width="9" height="9" rx="2"/><rect x="37" y="40" width="9" height="9" rx="2"/><rect x="50" y="40" width="9" height="9" rx="2"/><rect x="63" y="40" width="9" height="9" rx="2"/>']];
      const lay = [['centro', t('Centro')], ['canto', t('Canto')], ['coluna', t('Coluna')]];
      const autoL = S.style === 'brasa' ? 'canto' : 'centro';
      return `<h2>${esc(t('Tela inicial'))}</h2><p class="lead">${esc(t('O que aparece quando você abre uma aba, e onde.'))}</p>
      <div class="group"><p class="label">${esc(t('Disposição'))} <b>${S.layout === 'auto' ? esc(t('Do estilo')) : ''}</b></p><div class="dens">${lay.map(([v, l]) => `<button type="button" class="den" data-act="layout" data-v="${v}" ${pressed(layoutOf(), v)}><svg viewBox="0 0 100 54" aria-hidden="true">${LAYOUT_SVG[v]}</svg>${esc(l)}${S.layout === 'auto' && v === autoL ? ` <span class="tag">${esc(t('padrão'))}</span>` : ''}</button>`).join('')}</div>
        <p class="hint">${esc(t('Centro: relógio no meio e atalhos embaixo. Canto: relógio no canto e atalhos do lado. Coluna: tudo empilhado à esquerda.'))}</p></div>
      <div class="group"><p class="label">${esc(t('Quanto mostrar'))}</p><div class="dens">${dens.map(([v, l, svg]) => `<button type="button" class="den" data-act="density" data-v="${v}" ${pressed(S.density, v)}><svg viewBox="0 0 100 54" aria-hidden="true">${svg}</svg>${esc(l)}</button>`).join('')}</div></div>
      <div class="group"><p class="label">${esc(t('Itens'))}</p><div class="rows">
        ${row(t('Relógio'), '', sw('show', S.show.clock, 'data-v="clock"'))}
        ${row(t('Saudação'), S.name ? esc(`“${greeting()}, ${S.name}”`) : esc(t('Dica: coloque seu nome em Aparência')), sw('show', S.show.greet, 'data-v="greet"'))}
        ${row(t('Data'), '', sw('show', S.show.date, 'data-v="date"'))}
        ${row(t('Busca'), esc(t('Usa o buscador padrão do seu navegador')), sw('show', S.show.search, 'data-v="search"'))}
        ${row(t('Favoritos'), esc(t('Aparece na densidade Completa')), sw('show', S.show.favs, 'data-v="favs"'))}
      </div></div>`;
    },
    favoritos() {
      if (favGroups === null) {
        return `<h2>${esc(t('Favoritos'))}</h2><p class="lead">${esc(t('Usa os favoritos que você já tem no navegador. Sem outro cadastro e sem login.'))}</p>
        <div class="group"><div class="rows">${row(t('Mostrar meus favoritos'), esc(t('O Pouso pede acesso aos favoritos só agora, quando você liga. Nada sai do seu computador.')), sw('favperm', false))}</div></div>`;
      }
      return `<h2>${esc(t('Favoritos'))}</h2><p class="lead">${esc(t('Usa os favoritos que você já tem no navegador. Sem outro cadastro e sem login.'))}</p>
      <div class="group"><p class="label">${esc(t('Pastas na tela inicial'))}</p><div class="rows">
        ${favGroups.length ? favGroups.map((g) => row(g.folder, esc(t('{n} sites', { n: g.items.length })), sw('favfolder', !S.favHidden[g.folder], `data-v="${esc(g.folder)}"`))).join('') : row(t('Nenhum favorito ainda'), esc(t('Salve sites com Ctrl+D e eles aparecem aqui.')), '')}
      </div><p class="hint">${esc(t('Cada pasta vira um grupo. Os ícones vêm dos próprios sites.'))}</p></div>`;
    },
    abas() {
      const n = asleepNow == null ? '…' : asleepNow;
      return `<h2>${esc(t('Abas'))}</h2><p class="lead">${esc(t('Abas paradas dormem e devolvem memória. Quando você volta, ela acorda onde estava.'))}</p>
      <div class="stat"><div><b>${n}</b><small>${esc(t('abas dormindo agora'))}</small></div><div><b>${asleepNow == null ? '…' : asleepNow === 0 ? '—' : asleepNow * 110 < 1000 ? '≈ ' + asleepNow * 110 + ' MB' : '≈ ' + (asleepNow * 0.11).toLocaleString(L.locale, { maximumFractionDigits: 1 }) + ' GB'}</b><small>${esc(t('de memória liberada (estimativa)'))}</small></div></div>
      <div class="group"><div class="rows">
        ${row(t('Dormir abas paradas'), esc(t('Depois de {m} minutos sem uso', { m: S.sleep.min })), sw('sleep', S.sleep.on))}
        ${S.sleep.on ? `<div class="row"><div class="txt"><b>${esc(t('Tempo'))}</b></div><div style="width:230px">${seg('sleepmin', S.sleep.min, [[15, '15 min'], [30, '30'], [60, '1 h'], [120, '2 h']])}</div></div>` : ''}
        ${row(t('Abas fixadas'), esc(t('Nunca dormem')), sw('x', true, 'disabled'))}
        ${row(t('Abas tocando som'), esc(t('Nunca dormem')), sw('x', true, 'disabled'))}
      </div></div>
      <div class="group"><p class="label">${esc(t('Sites que nunca dormem'))}</p>
        <form class="inline-add" data-form="except"><input class="field" name="site" placeholder="${esc(t('ex.: meet.google.com'))}" aria-label="${esc(t('Adicionar site'))}"><button class="btn ghost" type="submit">${esc(t('Adicionar'))}</button></form>
        <div class="chips">${S.sleep.except.map((s, i) => `<span class="chip">${esc(s)}<button type="button" data-act="exdel" data-v="${i}" aria-label="${esc(t('Remover {s}', { s }))}">${ico('close', 'width:12px;height:12px')}</button></span>`).join('')}</div></div>
      <div class="group"><button type="button" class="btn ghost block" data-act="sleepall">${ico('abas')}${esc(t('Dormir todas agora'))}</button></div>
      <div class="group"><p class="label">${esc(t('Sessões salvas'))}</p>
        <button type="button" class="btn primary block" data-act="sessave">${ico('plus')}${esc(t('Salvar as abas desta janela'))}</button>
        <ul class="sessions">${S.sessions.map((s, i) => `<li><div class="txt"><b>${esc(s.name)}</b><small>${esc(t('{n} abas', { n: s.tabs.length }))} · ${esc(when(s.when))}</small></div><button type="button" class="mini" data-act="sesopen" data-v="${i}">${esc(t('Reabrir'))}</button><button type="button" class="mini" data-act="sesdel" data-v="${i}" aria-label="${esc(t('Apagar sessão'))}">${ico('close', 'width:14px;height:14px')}</button></li>`).join('')}</ul></div>`;
    },
    atalhos() {
      const k = (...ks) => ks.map((x) => `<kbd>${x}</kbd>`).join(' ');
      return `<h2>${esc(t('Atalhos'))}</h2><p class="lead">${esc(t('Para quem gosta de teclado.'))}</p>
      <table class="keys"><tbody>
        <tr><td>${esc(t('Busca rápida em abas, favoritos e histórico'))}</td><td>${k('Ctrl', 'K')}</td></tr>
        <tr><td>${esc(t('Busca rápida em qualquer site'))}</td><td>${k('Alt', 'K')}</td></tr>
        <tr><td>${esc(t('Abrir e fechar os ajustes'))}</td><td>${k('Ctrl', ',')}</td></tr>
        <tr><td>${esc(t('Ir para a busca na web'))}</td><td>${k('/')}</td></tr>
        <tr><td>${esc(t('Fechar o que estiver aberto'))}</td><td>${k('Esc')}</td></tr>
      </tbody></table>
      <p class="hint">${esc(t('Para trocar o Alt+K, abra chrome://extensions/shortcuts (no Edge: edge://extensions/shortcuts).'))}</p>`;
    },
    backup() {
      return `<h2>${esc(t('Backup'))}</h2><p class="lead">${esc(t('Seu visual cabe num código curto. Guarde, mande para um amigo ou use em outro computador.'))}</p>
      <div class="group"><p class="label">${esc(t('Seu código'))}</p><textarea class="field" id="code-out" readonly aria-label="${esc(t('Código do seu visual'))}">${esc(exportCode())}</textarea>
        <div class="btns" style="margin-top:10px"><button type="button" class="btn primary" data-act="copy">${esc(t('Copiar código'))}</button></div></div>
      <div class="group"><p class="label">${esc(t('Usar um código'))}</p><textarea class="field" id="code-in" placeholder="${esc(t('Cole aqui um código POUSO-…'))}" aria-label="${esc(t('Colar código'))}"></textarea>
        <div class="btns" style="margin-top:10px"><button type="button" class="btn ghost" data-act="import">${esc(t('Aplicar'))}</button></div></div>
      <details class="more"><summary>${esc(t('Começar do zero'))}</summary><button type="button" class="btn ghost" data-act="reset">${esc(t('Voltar ao padrão'))}</button></details>`;
    },
    sobre() {
      const v = P.isExt ? chrome.runtime.getManifest().version : '1.0';
      return `<div class="about-mark">${I.mark}</div><h2>Pouso</h2><p class="lead">${esc(t('A casa do seu navegador: única, bonita e leve.'))}</p>
      <ul class="promise"><li>${esc(t('Sem conta e sem login.'))}</li><li>${esc(t('Nenhum dado sai do seu computador.'))}</li><li>${esc(t('Sem propaganda, nunca.'))}</li><li>${esc(t('Código aberto (GPL-3.0).'))}</li></ul>
      <p class="sig">by <a href="https://www.instagram.com/zarpa.dev/" target="_blank" rel="noopener">Zarpa</a> · ${esc(t('feito por Kauã'))}, <a href="https://www.instagram.com/pessinkauaa/" target="_blank" rel="noopener">@pessinkauaa</a><br>${esc(t('Versão {v}', { v }))} · ${esc(t('lua de hoje: {m}', { m: moonName() }))}</p>
      <div class="btns" style="margin-top:22px"><button type="button" class="btn ghost" data-act="replay">${esc(t('Ver a primeira abertura de novo'))}</button></div>`;
    }
  };
  function moonName() { const p = R.phase; return t(p < .03 || p > .97 ? 'nova' : p < .22 ? 'crescente' : p < .28 ? 'quarto crescente' : p < .47 ? 'crescente gibosa' : p < .53 ? 'cheia' : p < .72 ? 'minguante gibosa' : p < .78 ? 'quarto minguante' : 'minguante'); }

  function renderPane(swap) {
    const a = document.activeElement;
    const keep = a && pane.contains(a) ? [a.dataset.act, a.dataset.v] : null;
    const st = pane.scrollTop;
    const more = $('details.more', pane); if (more && section === 'aparencia') PANES._more = more.open;
    pane.innerHTML = PANES[section]();
    pane.setAttribute('aria-labelledby', 'tab-' + section);
    $$('[role=tab]', $('#rail')).forEach((x) => { x.setAttribute('aria-selected', x.dataset.sec === section); x.tabIndex = x.dataset.sec === section ? 0 : -1; });
    if (swap === true) { pane.scrollTop = 0; pane.classList.remove('swap'); void pane.offsetWidth; pane.classList.add('swap'); } else pane.scrollTop = st;
    if (keep && keep[0]) { const el = pane.querySelector(`[data-act="${keep[0]}"]${keep[1] != null ? `[data-v="${CSS.escape(keep[1])}"]` : ''}`); if (el) el.focus(); }
    if (section === 'abas' && swap !== 'stat') P.asleep().then((n) => { if (n !== asleepNow) { asleepNow = n; if (section === 'abas') renderPane('stat'); } });
  }

  async function act(a, v) {
    const st = S.style;
    switch (a) {
      case 'edition': {
        const e = EDITIONS.find((x) => x.id === v);
        S.style = e.style; S.wall[e.style] = e.wall; S.color[e.style] = e.color; if (e.mode) S.mode = e.mode; S.clock = e.clock; S.font = 'auto'; S.corners = 'auto';
        toast(ownTheme(e.style) ? br(t('Edição {e}. O tema {c} do Chrome combina com ela.', { e: t(e.name), c: colorName(colorSpec(e.style)) })) : t('Edição {e}.', { e: t(e.name) })); break;
      }
      case 'style': S.style = v; break;
      case 'mode': S.mode = v; break;
      case 'wall': S.wall[st] = v; break;
      case 'color': S.color[st] = v; break;
      case 'clock': S.clock = v; break;
      case 'font': S.font = v; break;
      case 'corners': S.corners = v; break;
      case 'density': S.density = v; break;
      case 'layout': S.layout = (S.style === 'brasa' ? 'canto' : 'centro') === v && S.layout === 'auto' ? 'auto' : v; break;
      case 'show': S.show[v] = !S.show[v]; if (v === 'favs' && S.show.favs && S.density !== 'completa') S.density = 'completa'; break;
      case 'favfolder': S.favHidden[v] = !S.favHidden[v]; break;
      case 'favperm': if (await P.request(['bookmarks'])) { await loadFavs(); } return;
      case 'sleep': S.sleep.on = !S.sleep.on; break;
      case 'sleepmin': S.sleep.min = +v; break;
      case 'exdel': S.sleep.except.splice(+v, 1); break;
      case 'sleepall': { const n = await P.sleepAll(); asleepNow = await P.asleep(); toast(n ? t('{n} abas foram dormir. As fixadas e as que tocam som ficaram acordadas.', { n }) : t('Nenhuma aba para dormir agora.')); break; }
      case 'sessave': {
        if (!(await P.request(['tabs']))) { toast(t('Para salvar a sessão, o Pouso precisa ver os endereços das abas.')); return; }
        const tabs = await P.windowTabs();
        if (!tabs.length) { toast(t('Nenhuma aba de site nesta janela.')); return; }
        const d = new Date();
        S.sessions.unshift({ name: t('Janela de {d}', { d: d.toLocaleDateString(L.locale, { weekday: 'long' }) }), when: Date.now(), tabs });
        S.sessions = S.sessions.slice(0, 20);
        toast(t('Sessão salva. Dá para reabrir as {n} abas quando quiser.', { n: tabs.length })); break;
      }
      case 'sesopen': { const s = S.sessions[+v]; if (!(await P.openSession(s))) toast(t('Na extensão, isso reabre as {n} abas de “{s}” numa janela nova.', { n: s.tabs.length, s: s.name })); return; }
      case 'sesdel': S.sessions.splice(+v, 1); break;
      case 'match': openMatch(); return;
      case 'copy': copyCode(); return;
      case 'import': importCode($('#code-in').value); return;
      case 'reset': confirmBox(t('Voltar ao padrão?'), t('Seu visual e suas escolhas voltam ao começo. Favoritos e abas não são afetados.'), t('Voltar ao padrão'), () => { const ob = S.onboarded; S = structuredClone(DEFAULTS); S.onboarded = ob; save(); apply(); renderPane(); toast(t('Tudo como no primeiro dia.')); }); return;
      case 'replay': closeSheet(); setTimeout(startOnboard, 350); return;
      default: return;
    }
    save(); apply(); renderPane();
  }
  pane.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b.dataset.v); });
  pane.addEventListener('toggle', (e) => { if (e.target.matches('details.more') && section === 'aparencia') PANES._more = e.target.open; }, true);
  pane.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; if (f.dataset.form !== 'except') return;
    const v = f.site.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    if (!v || S.sleep.except.includes(v)) return;
    if (!(await P.request(['tabs']))) { toast(t('Para reconhecer o site, o Pouso precisa ver os endereços das abas.')); return; }
    S.sleep.except.push(v); save(); renderPane(); $('[name=site]', pane).focus();
  });
  pane.addEventListener('input', (e) => {
    const x = e.target, k = x.dataset.input; if (!k) return;
    if (x.type === 'range') x.style.setProperty('--v', ((x.value - x.min) / (x.max - x.min)) * 100 + '%');
    if (k === 'name') { S.name = x.value; save(); renderGreet(); return; }
    if (k === 'motion') S.motion = +x.value;
    if (k === 'glass') S.glass = +x.value;
    if (k === 'hue') { S.free[S.style].h = +x.value; S.color[S.style] = 'free'; }
    save(); apply();
    const lab = x.closest('.group') && $('.label b', x.closest('.group'));
    if (lab && k === 'motion') lab.textContent = motionLabel();
    if (lab && k === 'glass') lab.textContent = Math.round(S.glass * 100) + '%';
  });
  pane.addEventListener('change', (e) => { if (e.target.dataset.input === 'hue') renderPane(); });

  // ---------- backup ----------
  const EXPORT_KEYS = ['style', 'mode', 'layout', 'wall', 'color', 'free', 'clock', 'motion', 'font', 'corners', 'glass', 'density', 'show'];
  function exportCode() {
    const o = {}; EXPORT_KEYS.forEach((k) => { o[k] = S[k]; });
    return 'POUSO-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '');
  }
  function importCode(txt) {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob((txt || '').trim().replace(/^POUSO-/, '')))));
      const next = Object.assign({}, S);
      EXPORT_KEYS.forEach((k) => { if (o[k] !== undefined) next[k] = o[k]; });
      if (!PW.byId(next.wall.brasa) || !PW.byId(next.wall.bruma) || !['brasa', 'bruma'].includes(next.style)) throw new Error('código');
      S = next; save(); apply(); renderPane(); toast(t('Visual aplicado.'));
    } catch (e) { toast(t('Esse código não parece ser do Pouso. Confira se colou ele inteiro.')); }
  }
  function copyCode() {
    const ta = $('#code-out');
    const fallback = () => { ta.select(); toast(t('Selecionei o código: é só apertar Ctrl+C.')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => toast(t('Código copiado.')), fallback); else fallback();
  }

  // ---------- janelas ----------
  const modal = $('#modal');
  let modalBack = null;
  function openModal(html) {
    modalBack = document.activeElement;
    modal.innerHTML = `<div class="modal-box">${html}</div>`; modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    const f = $('[data-autofocus]', modal) || $('button', modal); if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() { modal.classList.remove('open'); setTimeout(() => { modal.hidden = true; }, 300); if (modalBack && modalBack.focus) modalBack.focus(); }
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  function confirmBox(title, text, okLabel, ok) {
    openModal(`<h3 id="modal-title">${esc(title)}</h3><p>${esc(text)}</p><div class="btns"><button class="btn ghost" data-close>${esc(t('Cancelar'))}</button><button class="btn primary" id="m-ok">${esc(okLabel)}</button></div>`);
    $('#m-ok').addEventListener('click', () => { closeModal(); ok(); });
  }
  function themeName(style) {
    const id = themeIdFor(style);
    if (id === 'bruma-noite') return t('Noite');
    return colorName(S.color[style] === 'free' ? PP.nearest(style, S.free[style].h) : colorSpec(style));
  }
  function chromeMock(style) {
    const colId = S.color[style], wallId = S.wall[style];
    const col = colId === 'free' ? PP.nearest(style, S.free[style].h) : colorSpec(style, colId);
    const Pa = paletteFor(style, wallId, col), h = Pa.hex;
    const frame = style === 'brasa' ? h.bg : PP.hexFromOklch(Pa.isLight ? .9 : .22, col.c * (Pa.isLight ? .5 : .4), col.h);
    return `<div class="chrome-mock" aria-hidden="true">
      <div class="cm-frame" style="background:${frame};color:${h.text}"><span class="cm-dots"><i></i><i></i><i></i></span>
        <span class="cm-tab" style="background:${h.surface};color:${h.text}">${I.mark.replace('<svg', `<svg style="width:12px;height:12px;color:${h.accent}"`)}${esc(t('Nova aba'))}</span><span class="cm-tab off">${esc(t('Caixa de entrada'))}</span></div>
      <div class="cm-bar" style="background:${h.surface}"><span class="cm-omni" style="background:${frame};color:${h.muted}">${esc(t('Pesquise ou digite um endereço'))}</span></div>
      <div class="cm-page">${thumbImg(style, wallId, colId === 'free' ? col.id : colId)}</div></div>`;
  }
  const ownTheme = (style) => P.hasTheme(themeIdFor(style));
  function goStore(style) { P.openStore(themeIdFor(style)); }
  const matchLabel = (style) => ownTheme(style) ? br(t('Combinar o Chrome com o tema {c}', { c: themeName(style) })) : br(t('Escolher uma cor para o Chrome'));
  function openMatch() {
    const st = S.style;
    openModal(`<h3 id="modal-title">${esc(br(t('Combinar o Chrome')))}</h3>
      <p>${esc(ownTheme(st) ? br(t('O Chrome não deixa extensões mudarem as cores dele. Por isso existe um tema oficial do Pouso para cada cor. O botão abre o tema na loja; lá é só clicar em “Usar no Chrome”.')) : br(t('O Chrome não deixa extensões mudarem as cores dele. O botão abre as cores oficiais do Chrome: escolha a mais parecida com {c} e clique em “Usar no Chrome”.', { c: themeName(st) })))}</p>
      ${chromeMock(st)}
      <div class="btns"><button class="btn ghost" data-close>${esc(t('Agora não'))}</button><button class="btn primary" id="m-store" data-autofocus>${esc(ownTheme(st) ? t('Abrir o tema {c}', { c: themeName(st) }) : br(t('Ver as cores do Chrome')))}</button></div>`);
    $('#m-store').addEventListener('click', () => { closeModal(); goStore(st); });
  }

  // ---------- busca rápida ----------
  const pal = $('#palette');
  let palBack = null;
  const quick = window.PousoQuick({
    input: $('#pq'), list: $('#presults'),
    look: () => ({ style: S.style, light: curP && curP.isLight }),
    close: (navigated) => closePalette(navigated),
    commands: () => [
      { t: t('Abrir os ajustes'), s: 'Ctrl + ,', icon: 'sliders', run: () => openSheet() },
      { t: S.style === 'brasa' ? t('Trocar para Bruma') : t('Trocar para Brasa'), s: t('Estilo'), icon: 'aparencia', run: () => { S.style = S.style === 'brasa' ? 'bruma' : 'brasa'; save(); apply(); } },
      { t: t('Próximo papel de parede'), s: t('Aparência'), icon: 'edicoes', run: () => { const l = PW.ofStyle(S.style); const i = l.findIndex((w) => w.id === S.wall[S.style]); S.wall[S.style] = l[(i + 1) % l.length].id; save(); apply(); } },
      { t: t('Dormir todas as abas'), s: t('Abas'), icon: 'abas', run: () => act('sleepall') },
      { t: t('Salvar as abas desta janela'), s: t('Sessões'), icon: 'plus', run: () => act('sessave') }
    ]
  });
  function openPalette() { palBack = document.activeElement; pal.hidden = false; quick.open(); requestAnimationFrame(() => pal.classList.add('open')); $('#pq').focus(); }
  function closePalette(navigated) { pal.classList.remove('open'); setTimeout(() => { pal.hidden = true; }, 250); if (!navigated && palBack && palBack.focus) palBack.focus(); }
  pal.addEventListener('click', (e) => { if (e.target === pal) closePalette(); });
  $('#open-palette').addEventListener('click', openPalette);

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); return; }
    if (mod && e.key === ',') { e.preventDefault(); sheet.classList.contains('open') ? closeSheet() : openSheet(); return; }
    if (e.key === 'Escape') { if (!modal.hidden) closeModal(); else if (!pal.hidden) closePalette(); else if (sheet.classList.contains('open')) closeSheet(); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '');
    if (e.key === '/' && !typing && pal.hidden && $('#onboard').hidden) { e.preventDefault(); $('#q').focus(); }
  });

  // ---------- primeira abertura ----------
  const ob = $('#onboard');
  let obStep = 0, obChosen = null;
  function startOnboard() { obStep = 0; obChosen = S.style; ob.hidden = false; document.body.classList.add('onboarding'); $('#home').setAttribute('aria-hidden', 'true'); renderOb(); }
  function renderOb() {
    const st = S.style;
    const steps = [
      () => `<p class="ob-step">${esc(t('1 de 3'))}</p><h1 class="ob-title">${t('Escolha o <em>clima</em> da sua casa.')}</h1>
        <p class="ob-sub">${esc(t('Passe o mouse para sentir cada um. Dá para trocar quando quiser.'))}</p>
        <div class="ob-styles">${['brasa', 'bruma'].map((s) => `<button type="button" class="style-card ${s}" data-ob="style" data-v="${s}" ${pressed(obChosen, s)}>${thumbImg(s, S.wall[s], S.color[s])}<span><b>${STYLE_INFO[s].name}</b><small>${esc(STYLE_INFO[s].sub())}</small></span></button>`).join('')}</div>`,
      () => `<p class="ob-step">${esc(t('2 de 3'))}</p><h1 class="ob-title">${t('Agora, o <em>papel de parede</em>.')}</h1>
        <p class="ob-sub">${esc(t('Todos se mexem devagar e param quando a aba não está na tela, para não pesar no computador.'))}</p>
        <div class="ob-walls"><div class="walls">${PW.ofStyle(st).map((w) => `<button type="button" class="wall-opt" data-ob="wall" data-v="${w.id}" ${pressed(S.wall[st], w.id)}>${thumbImg(st, w.id, S.color[st])}<span class="${modeFor(st, w.id) === 'light' ? 'on-light' : ''}">${esc(wallName(w))}</span></button>`).join('')}</div>
        <div class="ob-colors"><div class="swatches">${PP.COLORS[st].map((c) => `<button type="button" class="swatch" data-ob="color" data-v="${c.id}" ${pressed(S.color[st], c.id)} style="--sw:${swatchColor(st, c)}"><i></i>${esc(colorName(c))}</button>`).join('')}</div></div></div>`,
      () => `<p class="ob-step">${esc(t('3 de 3'))}</p><h1 class="ob-title">${br(t('Combine o <em>Chrome</em>.'))}</h1>
        <p class="ob-sub">${esc(t('Um tema oficial deixa as abas e a barra na mesma cor da sua casa. São dois cliques, e dá para pular.'))}</p>
        <div class="ob-match">${chromeMock(st)}<button type="button" class="btn primary block" data-ob="match">${esc(matchLabel(st))}</button>
        <div class="ob-name"><p class="label">${esc(t('Como podemos te chamar?'))} <b style="color:var(--muted);font-weight:400">${esc(t('opcional'))}</b></p><input class="field" id="ob-name" maxlength="24" placeholder="${esc(t('Seu nome'))}" value="${esc(S.name)}"></div></div>`
    ];
    ob.innerHTML = `<div class="ob-top"><div class="ob-brand">${I.mark}Pouso<small>by Zarpa</small></div><button type="button" class="ob-skip" data-ob="skip">${esc(t('Pular'))}</button></div>
      <div class="ob-body ob-anim">${steps[obStep]()}</div>
      <div class="ob-foot"><div class="ob-dots" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= obStep ? 'on' : ''}"></i>`).join('')}</div>
      <div class="btns">${obStep ? `<button type="button" class="btn ghost" data-ob="back">${esc(t('Voltar'))}</button>` : ''}<button type="button" class="btn primary" data-ob="next">${esc(obStep === 2 ? t('Entrar na minha casa') : t('Continuar'))}</button></div></div>`;
    setTimeout(() => { const f = obStep === 0 ? $('.style-card[aria-pressed=true]', ob) : $('[data-ob=next]', ob); if (f) f.focus({ preventScroll: true }); }, 40);
  }
  function finishOb() {
    const n = $('#ob-name'); if (n) S.name = n.value.trim();
    S.onboarded = true; save(); ob.hidden = true; document.body.classList.remove('onboarding'); $('#home').removeAttribute('aria-hidden');
    apply({ favEnter: true });
    document.body.classList.add('reveal'); setTimeout(() => document.body.classList.remove('reveal'), 1400);
    setTimeout(() => toast(t('Dica: Ctrl+K busca em abas, favoritos e histórico. Ctrl+, abre os ajustes.')), 1800);
  }
  ob.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ob]'); if (!b) return;
    const a = b.dataset.ob, v = b.dataset.v;
    if (a === 'style') { obChosen = v; S.style = v; apply(); obStep = 1; save(); renderOb(); return; }
    if (a === 'wall') { S.wall[S.style] = v; save(); apply(); $$('[data-ob=wall]', ob).forEach((x) => x.setAttribute('aria-pressed', x.dataset.v === v)); return; }
    if (a === 'color') { S.color[S.style] = v; save(); apply(); renderOb(); return; }
    if (a === 'match') { goStore(S.style); return; }
    if (a === 'skip') { finishOb(); return; }
    if (a === 'back') { obStep = Math.max(0, obStep - 1); renderOb(); return; }
    if (a === 'next') { if (obStep < 2) { if (obStep === 0) { S.style = obChosen; apply(); } obStep++; renderOb(); } else finishOb(); }
  });
  ob.addEventListener('mouseover', (e) => { const c = e.target.closest('[data-ob=style]'); if (c && S.style !== c.dataset.v) { S.style = c.dataset.v; apply(); } });
  ob.addEventListener('mouseleave', () => { if (obStep === 0 && obChosen && S.style !== obChosen) { S.style = obChosen; apply(); } });
  ob.addEventListener('focusin', (e) => {
    const c = e.target.closest('[data-ob=style]');
    if (c && S.style !== c.dataset.v) { S.style = c.dataset.v; obChosen = c.dataset.v; apply(); $$('[data-ob=style]', ob).forEach((x) => x.setAttribute('aria-pressed', x === c)); }
  });

  // ---------- economia: para quando a aba some ----------
  document.addEventListener('visibilitychange', () => { if (document.hidden) R.stop(); else if (R.speed > 0) R.start(); });
  reduced.addEventListener('change', () => apply());
  window.addEventListener('resize', () => { if (!R.running) R.draw(); });

  // ---------- começo ----------
  document.documentElement.lang = L.lang === 'pt' ? 'pt-BR' : 'en';
  $('#q').placeholder = t('Buscar na web'); $('label[for=q]').textContent = t('Buscar na web');
  $('#pq').placeholder = t('Abas, favoritos, histórico ou um comando');
  $('#open-palette span').textContent = t('Busca rápida');
  $('#open-sheet').setAttribute('aria-label', t('Ajustes (Ctrl+,)'));
  $('#close-sheet').setAttribute('aria-label', t('Fechar ajustes'));
  $('#open-palette').setAttribute('aria-label', t('Busca rápida (Ctrl+K)'));
  $('.palette-foot').innerHTML = `<span><kbd>↑</kbd><kbd>↓</kbd> ${esc(t('navegar'))}</span><span><kbd>Enter</kbd> ${esc(t('abrir'))}</span><span>${esc(t('Tudo fica no seu computador.'))}</span>`;
  apply();
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('boot')));
  P.favorites().then((g) => { favGroups = g; renderFavs(!S.onboarded ? false : true); });
  if (!S.onboarded) startOnboard();
  performance.mark('pouso-ready');
  window.Pouso = { get S() { return S; }, apply, openSheet, openPalette, startOnboard, act, setSection: (s) => { section = s; renderPane(true); } };
})();
