/* Pouso — endereços dos temas companheiros nas lojas.
   Preenchidos na etapa 4, depois que cada tema for aprovado.
   Chave: <estilo>-<cor>, e "bruma-noite" para o modo Noite. */
window.PousoTemas = {
  chrome: {},
  edge: {}
};
window.PousoThemeId = function (style, colorId, mode, nearestId) {
  if (style === 'bruma' && mode === 'dark') return 'bruma-noite';
  return style + '-' + (colorId === 'free' ? nearestId : colorId);
};
