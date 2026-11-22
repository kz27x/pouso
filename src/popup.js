/* Pouso — busca rápida em qualquer site (Alt+K ou o ícone da extensão). */
(function () {
  'use strict';
  const U = window.PousoUI, P = window.PousoPlatform, t = window.PousoI18n.t;
  const { $, esc, ico } = U;
  document.body.style.backgroundImage = '';
  document.documentElement.lang = window.PousoI18n.lang === 'pt' ? 'pt-BR' : 'en';
  $('.search-ico').innerHTML = ico('search');
  $('#pq').placeholder = t('Abas, favoritos, histórico ou um comando');
  $('.palette-foot').innerHTML = `<span><kbd>↑</kbd><kbd>↓</kbd> ${esc(t('navegar'))}</span><span><kbd>Enter</kbd> ${esc(t('abrir'))}</span><span>${esc(t('Tudo fica no seu computador.'))}</span>`;
  const light = document.body.hasAttribute('data-light');
  const quick = window.PousoQuick({
    input: $('#pq'), list: $('#presults'), newTab: true,
    look: () => ({ style: document.body.dataset.style || 'brasa', light }),
    close: (navigated) => { if (navigated) window.close(); },
    commands: () => [
      { t: t('Abrir o Pouso numa aba nova'), s: t('Nova aba do Pouso'), icon: 'sliders', run: () => { chrome.tabs.create({}); window.close(); } },
      { t: t('Dormir todas as abas'), s: t('Abas'), icon: 'abas', run: async () => { const n = await P.sleepAll(); U.toast(n ? t('{n} abas foram dormir. As fixadas e as que tocam som ficaram acordadas.', { n }) : t('Nenhuma aba para dormir agora.')); } }
    ]
  });
  quick.open();
  $('#pq').focus();
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.close(); });
  requestAnimationFrame(() => document.documentElement.classList.remove('boot'));
})();
