/* Pouso — peças comuns da interface (nova aba e busca rápida). */
(function (G) {
  'use strict';
  const U = {};
  U.$ = (s, el) => (el || document).querySelector(s);
  U.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  U.I = {
    mark: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9.2" r="4.3" fill="currentColor"/><path d="M3.5 17.5h17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
    sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
    search: '<circle cx="11" cy="11" r="6.2"/><path d="M20 20l-4.4-4.4"/>',
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    edicoes: '<rect x="4" y="7.5" width="12.5" height="12.5" rx="2.2"/><path d="M8 4h9.8A2.2 2.2 0 0 1 20 6.2V16"/>',
    aparencia: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
    inicio: '<rect x="4" y="4" width="16" height="16" rx="2.4"/><path d="M4 10h16M10 10v10"/>',
    favoritos: '<path d="M12 4.3l2.35 4.9 5.35.65-3.95 3.7 1.05 5.3L12 16.25l-4.8 2.6 1.05-5.3-3.95-3.7 5.35-.65z"/>',
    abas: '<path d="M19 14.6A7.6 7.6 0 1 1 9.4 5a6 6 0 0 0 9.6 9.6z"/>',
    atalhos: '<rect x="3" y="6.5" width="18" height="11.5" rx="2.2"/><path d="M7 10.5h.01M10.5 10.5h.01M14 10.5h.01M17 10.5h.01M8 14.5h8"/>',
    backup: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L19.5 9M19.5 4.5V9H15M19.5 12a7.5 7.5 0 0 1-13 5.1L4.5 15M4.5 19.5V15H9"/>',
    sobre: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    bolt: '<path d="M13 3.5L5.5 13.5H12l-1 7 7.5-10H12z"/>',
    key: '<circle cx="8" cy="14" r="3.5"/><path d="M10.5 11.5L19 3M16 6l2 2M14 8l1.5 1.5"/>',
    globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/>'
  };
  U.ico = (n, style) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${style ? ` style="${style}"` : ''}>${U.I[n]}</svg>`;

  // ícone de site: favicon real quando existe, inicial colorida por baixo como reserva
  U.favIcon = (title, url, style, isLight) => {
    const P = G.PousoPlatform, PP = G.PousoPalette;
    const host = P.host(url);
    const bg = PP.iconColor(host, style, isLight);
    const src = P.favicon(url);
    return `<span class="fav-ico" style="background:${bg}" aria-hidden="true"><b>${U.esc((title || host || '?').trim()[0] || '?')}</b>${src ? `<img alt="" loading="lazy" src="${U.esc(src)}">` : ''}</span>`;
  };
  // favicon que falhou some e deixa a inicial
  document.addEventListener('error', (e) => { const t = e.target; if (t.tagName === 'IMG' && t.parentElement && t.parentElement.classList.contains('fav-ico')) t.remove(); }, true);

  let toastT;
  U.toast = (msg) => {
    const t = U.$('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 3600);
  };

  G.PousoUI = U;
})(window);
