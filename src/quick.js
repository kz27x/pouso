/* Pouso — busca rápida (Ctrl+K na nova aba, Alt+K em qualquer site).
   Abas, favoritos e histórico só entram depois que a pessoa deixa. */
(function (G) {
  'use strict';
  const U = G.PousoUI, P = G.PousoPlatform, t = G.PousoI18n.t;
  const { esc, norm, ico } = U;
  const PERMS = ['tabs', 'bookmarks', 'history'];

  G.PousoQuick = function (opts) {
    const input = opts.input, list = opts.list;
    let items = [], sel = 0, data = { tabs: [], favs: [], allowed: true }, histTimer = 0, hist = [], lastQ = '';

    async function load() {
      data.allowed = await P.has(PERMS);
      const [tabs, groups] = await Promise.all([P.tabs(), P.favorites()]);
      data.tabs = tabs || [];
      data.favs = (groups || []).flatMap((g) => g.items.map((i) => ({ title: i.title, url: i.url, folder: g.folder })));
      render();
    }
    function hl(text, toks) {
      let out = esc(text);
      toks.forEach((k) => { const i = norm(text).indexOf(k); if (k && i >= 0) { const s = text.slice(i, i + k.length); out = out.replace(esc(s), `<mark>${esc(s)}</mark>`); } });
      return out;
    }
    function render() {
      const raw = input.value.trim(), q = norm(raw), toks = q.split(/\s+/).filter(Boolean);
      const match = (a, b) => toks.every((k) => norm(a + ' ' + b).includes(k));
      const groups = [];
      const permRow = P.isExt && !data.allowed ? [t('Busca completa'), [{ t: t('Buscar também nas suas abas, favoritos e histórico'), s: t('O Pouso pede sua permissão uma vez. Nada sai do seu computador.'), kind: t('Permitir'), icon: 'key', run: allow, keep: true }]] : null;
      if (permRow && !q) groups.push(permRow);
      const tabs = data.tabs.filter((x) => match(x.title, x.url)).slice(0, 5).map((x) => ({ t: x.title, s: P.host(x.url), fav: x, kind: t('Aba aberta'), run: () => goTab(x) }));
      const favs = q ? data.favs.filter((x) => match(x.title, x.folder + ' ' + x.url)).slice(0, 5).map((x) => ({ t: x.title, s: `${x.folder} · ${P.host(x.url)}`, fav: x, kind: t('Favorito'), run: () => go(x.url) })) : [];
      const seen = new Set(data.favs.map((f) => f.url));
      const hs = q ? hist.filter((x) => !seen.has(x.url) && match(x.title, x.url)).slice(0, 5).map((x) => ({ t: x.title, s: P.host(x.url), icon: 'clock', kind: t('Histórico'), run: () => go(x.url) })) : [];
      const cmds = (opts.commands ? opts.commands() : []).filter((c) => !q || match(c.t, c.s || '')).slice(0, q ? 3 : 6).map((c) => Object.assign({ kind: t('Comando') }, c));
      if (tabs.length) groups.push([t('Abas abertas'), tabs]);
      if (favs.length) groups.push([t('Favoritos'), favs]);
      if (hs.length) groups.push([t('Histórico'), hs]);
      if (cmds.length) groups.push([t('Comandos'), cmds]);
      if (raw) groups.push([t('Na web'), [{ t: t('Buscar “{q}”', { q: raw }), s: t('No buscador padrão do navegador'), icon: 'globe', kind: 'Enter', run: () => web(raw) }]]);
      if (permRow && q) groups.push(permRow);
      items = groups.flatMap((g) => g[1]);
      sel = Math.min(sel, Math.max(0, items.length - 1));
      let n = 0;
      const look = opts.look ? opts.look() : { style: 'brasa', light: false };
      list.innerHTML = items.length ? groups.map(([title, its]) => `<li class="sec" role="presentation">${esc(title)}</li>` + its.map((it) => {
        const i = n++;
        const icon = it.fav ? U.favIcon(it.fav.title, it.fav.url, look.style, look.light) : `<span class="fav-ico" aria-hidden="true">${ico(it.icon || 'bolt', 'width:15px;height:15px')}</span>`;
        return `<li class="opt" role="option" id="po-${i}" data-i="${i}" aria-selected="${i === sel}">${icon}<span class="txt"><b>${hl(it.t, toks)}</b><small>${esc(it.s || '')}</small></span><span class="kind">${esc(it.kind)}</span></li>`;
      }).join('')).join('') : `<li class="empty">${esc(t('Digite para buscar em tudo.'))}</li>`;
      input.setAttribute('aria-activedescendant', items.length ? 'po-' + sel : '');
      const el = U.$('#po-' + sel, list); if (el) el.scrollIntoView({ block: 'nearest' });
    }
    async function allow() {
      const ok = await P.request(PERMS);
      if (ok) { U.toast(t('Pronto. Agora a busca vê suas abas, favoritos e histórico.')); await load(); fetchHist(); }
      else U.toast(t('Tudo bem. A busca continua funcionando com comandos e a web.'));
    }
    function fetchHist() {
      clearTimeout(histTimer);
      const q = input.value.trim();
      if (!q) { hist = []; return; }
      histTimer = setTimeout(async () => { hist = await P.history(q); if (input.value.trim() === q) render(); }, 90);
    }
    async function goTab(x) { if (!(await P.focusTab(x))) U.toast(t('Na extensão, isso pula direto para a aba “{t}”.', { t: x.title })); else opts.close(true); }
    function go(url) { if (P.open(url, opts.newTab)) opts.close(true); else { U.toast(t('Abriria {u}.', { u: P.host(url) })); opts.close(); } }
    function web(q) { if (P.search(q, opts.newTab)) opts.close(true); else { U.toast(t('Na extensão, “{q}” vai para o buscador padrão do seu navegador.', { q })); opts.close(); } }
    function run() {
      const it = items[sel]; if (!it) return;
      if (!it.keep) opts.close(); it.run();
    }

    input.addEventListener('input', () => { sel = 0; render(); fetchHist(); lastQ = input.value; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(); }
    });
    list.addEventListener('mousemove', (e) => { const o = e.target.closest('.opt'); if (o && +o.dataset.i !== sel) { sel = +o.dataset.i; U.$$('.opt', list).forEach((x) => x.setAttribute('aria-selected', +x.dataset.i === sel)); } });
    list.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o) { sel = +o.dataset.i; run(); } });

    return { open() { input.value = ''; sel = 0; hist = []; render(); load(); }, render };
  };
})(window);
