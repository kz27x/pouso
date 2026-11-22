/* Pouso — primeiro quadro. Roda antes de tudo e repete o visual da última aba
   (cores, disposição e uma foto do papel de parede), para a aba nascer pronta. */
(function () {
  try {
    var b = JSON.parse(localStorage.getItem('pouso-boot') || 'null');
    if (!b) return;
    var r = document.documentElement.style, d = document.body;
    for (var k in b.vars) if (b.vars[k]) r.setProperty(k, b.vars[k]);
    if (b.style) d.setAttribute('data-style', b.style);
    if (b.layout) d.setAttribute('data-layout', b.layout);
    if (b.density) d.setAttribute('data-density', b.density);
    if (b.light) d.setAttribute('data-light', '');
    if (b.cls) d.className = b.cls;
    if (b.font) d.style.setProperty('--f-display', b.font);
    if (b.snap) { d.style.backgroundImage = 'url(' + b.snap + ')'; d.style.backgroundSize = 'cover'; d.style.backgroundPosition = 'center'; }
    else if (b.vars && b.vars['--bg']) d.style.backgroundColor = b.vars['--bg'];
  } catch (e) { /* primeira abertura: segue o padrão */ }
})();
