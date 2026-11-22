/* Pouso — ponte com o navegador.
   Na extensão usa as APIs oficiais (chrome.*). Fora dela (protótipo), responde com
   dados de exemplo, para a mesma interface funcionar nos dois lugares. */
(function (G) {
  'use strict';
  const C = typeof chrome !== 'undefined' ? chrome : null;
  const isExt = !!(C && C.runtime && C.runtime.id);
  const isEdge = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some((b) => /Edge/i.test(b.brand))) || /Edg\//.test(navigator.userAgent);

  // ---------- dados de exemplo (protótipo) ----------
  const MOCK_FAVS = [
    { folder: 'Barra de favoritos', items: [['Gmail', 'https://mail.google.com'], ['Agenda', 'https://calendar.google.com'], ['Drive', 'https://drive.google.com'], ['Notion', 'https://notion.so'], ['Figma', 'https://figma.com'], ['WhatsApp', 'https://web.whatsapp.com']] },
    { folder: 'Estudo', items: [['YouTube', 'https://youtube.com'], ['Wikipédia', 'https://pt.wikipedia.org'], ['Duolingo', 'https://duolingo.com'], ['MDN', 'https://developer.mozilla.org']] },
    { folder: 'Lazer', items: [['Spotify', 'https://open.spotify.com'], ['Letterboxd', 'https://letterboxd.com'], ['Netflix', 'https://netflix.com'], ['Steam', 'https://store.steampowered.com']] }
  ];
  const MOCK_TABS = [
    ['Caixa de entrada (3) — Gmail', 'https://mail.google.com'], ['Pouso · Interface — Figma', 'https://figma.com/design/pouso'],
    ['lofi hip hop radio — YouTube', 'https://youtube.com/watch'], ['Orçamento 2027 — Planilhas Google', 'https://docs.google.com/spreadsheets']
  ];
  const MOCK_HIST = [
    ['Painel do desenvolvedor — Chrome Web Store', 'https://chrome.google.com/webstore/devconsole'], ['OKLCH Color Picker & Converter', 'https://oklch.com'],
    ['Awwwards — Site of the Day', 'https://awwwards.com'], ['Shopify Editions — Winter ’26', 'https://shopify.com/editions/winter2026'],
    ['utsubo — creative studio', 'https://utsubo.com'], ['Active Theory', 'https://activetheory.net'], ['Previsão para Vitória, ES', 'https://climatempo.com.br']
  ];
  let mockAsleep = 7;

  const P = { isExt, isEdge };

  // ---------- permissões opcionais ----------
  // Pedidas só quando a pessoa liga o recurso (precisa vir de um clique).
  P.has = async (perms) => {
    if (!isExt) return true;
    try { return await C.permissions.contains({ permissions: perms }); } catch (e) { return false; }
  };
  P.request = async (perms) => {
    if (!isExt) return true;
    if (await P.has(perms)) return true;
    try { return await C.permissions.request({ permissions: perms }); } catch (e) { return false; }
  };

  // ---------- armazenamento ----------
  // A interface lê do localStorage (síncrono, abre rápido). O service worker lê do chrome.storage.
  P.mirror = (obj) => { if (isExt) C.storage.local.set(obj).catch(() => {}); };
  P.local = async (key) => {
    if (isExt) { const r = await C.storage.local.get(key); return r[key]; }
    try { return JSON.parse(localStorage.getItem('pouso-' + key) || 'null'); } catch (e) { return null; }
  };
  P.setLocal = async (key, val) => {
    if (isExt) return C.storage.local.set({ [key]: val });
    try { localStorage.setItem('pouso-' + key, JSON.stringify(val)); } catch (e) { /* sem armazenamento */ }
  };

  // ---------- favoritos ----------
  P.favorites = async () => {
    if (!isExt) return MOCK_FAVS.map((g) => ({ folder: g.folder, items: g.items.map(([title, url]) => ({ title, url })) }));
    if (!(await P.has(['bookmarks']))) return null;
    const tree = await C.bookmarks.getTree();
    const groups = [];
    const links = (nodes) => nodes.filter((n) => n.url && /^https?:/.test(n.url)).map((n) => ({ title: n.title || hostOf(n.url), url: n.url }));
    const roots = (tree[0] && tree[0].children) || [];
    roots.forEach((root) => {
      const kids = root.children || [];
      const loose = links(kids);
      if (loose.length) groups.push({ folder: root.title, items: loose.slice(0, 12) });
      kids.filter((n) => !n.url).forEach((f) => {
        const items = links(f.children || []);
        if (items.length) groups.push({ folder: f.title, items: items.slice(0, 12) });
      });
    });
    return groups.slice(0, 8);
  };

  // ---------- abas e histórico (Ctrl+K) ----------
  P.tabs = async () => {
    if (!isExt) return MOCK_TABS.map(([title, url], i) => ({ id: i, title, url }));
    if (!(await P.has(['tabs']))) return [];
    const self = await C.tabs.getCurrent().catch(() => null);
    return (await C.tabs.query({})).filter((t) => !self || t.id !== self.id).map((t) => ({ id: t.id, windowId: t.windowId, title: t.title || hostOf(t.url || ''), url: t.url || '' }));
  };
  P.history = async (text) => {
    if (!isExt) return MOCK_HIST.map(([title, url]) => ({ title, url }));
    if (!text || !(await P.has(['history']))) return [];
    const r = await C.history.search({ text, maxResults: 12, startTime: 0 });
    return r.filter((h) => /^https?:/.test(h.url)).map((h) => ({ title: h.title || hostOf(h.url), url: h.url }));
  };
  P.focusTab = async (t) => {
    if (!isExt) return false;
    await C.tabs.update(t.id, { active: true });
    await C.windows.update(t.windowId, { focused: true });
    return true;
  };

  // ---------- abrir e buscar ----------
  P.open = (url, newTab) => {
    if (!isExt) return false;
    if (newTab) C.tabs.create({ url }); else C.tabs.update({ url });
    return true;
  };
  P.search = (text, newTab) => {
    if (!isExt) return false;
    C.search.query({ text, disposition: newTab ? 'NEW_TAB' : 'CURRENT_TAB' });
    return true;
  };
  P.favicon = (url) => isExt ? `${C.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=64` : '';

  // ---------- abas que dormem ----------
  const ask = (msg) => C.runtime.sendMessage(msg);
  P.asleep = async () => {
    if (!isExt) return mockAsleep;
    return (await C.tabs.query({ discarded: true })).length;
  };
  P.sleepAll = async () => {
    if (!isExt) { mockAsleep += 11; return 11; }
    const r = await ask({ type: 'sleepAll' });
    return r ? r.count : 0;
  };
  P.windowTabs = async () => {
    if (!isExt) return MOCK_TABS.map(([title, url]) => ({ title, url })).concat([{ title: 'Pouso', url: 'https://pouso.app' }]);
    const w = await C.windows.getCurrent();
    return (await C.tabs.query({ windowId: w.id })).filter((t) => /^https?:/.test(t.url || '')).map((t) => ({ title: t.title, url: t.url, pinned: t.pinned }));
  };
  P.openSession = async (s) => {
    if (!isExt) return false;
    await C.windows.create({ url: s.tabs.map((t) => t.url) });
    return true;
  };

  // ---------- temas companheiros ----------
  // tema Pouso na loja quando o endereço já existe em temas.js; senão, as cores oficiais do navegador
  const OFFICIAL = isEdge ? 'https://microsoftedge.microsoft.com/addons/microsoft-edge-themes' : 'https://chromewebstore.google.com/collection/chrome_color_themes';
  P.hasTheme = (themeId) => { const T = G.PousoTemas || {}; return !!(((isEdge ? T.edge : T.chrome) || {})[themeId]); };
  P.openStore = (themeId) => {
    const T = G.PousoTemas || {};
    const url = ((isEdge ? T.edge : T.chrome) || {})[themeId] || OFFICIAL;
    if (isExt) C.tabs.create({ url }); else window.open(url, '_blank', 'noopener');
    return true;
  };

  P.lang = (() => {
    const l = (isExt && C.i18n && C.i18n.getUILanguage ? C.i18n.getUILanguage() : navigator.language) || 'pt-BR';
    return /^pt/i.test(l) ? 'pt' : 'en';
  })();

  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  P.host = hostOf;

  G.PousoPlatform = P;
})(window);
