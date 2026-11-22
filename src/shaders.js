/* Pouso — papéis de parede (versão aberta).
   Os 12 papéis animados do Pouso não fazem parte deste repositório.
   Este arquivo mantém a mesma interface com um gradiente simples,
   para o projeto montar e rodar a partir do código aberto. */
(function (W) {
  'use strict';
  const SRC = `
precision mediump float;
uniform vec2 R; uniform float T; uniform float E; uniform float PH; uniform float LY;
uniform vec3 C0; uniform vec3 C1; uniform vec3 C2; uniform vec3 C3;
void main(){
  vec2 uv = gl_FragCoord.xy / R;
  vec2 c = vec2(.65 + .05*sin(T*.1), .62 + .04*cos(T*.13));
  float d = length((uv - c) * vec2(R.x/R.y, 1.));
  vec3 col = mix(C2, C0, smoothstep(.0, .9, d));
  col = mix(col, C1, smoothstep(.6, 1.2, d) * .6);
  gl_FragColor = vec4(pow(max(col, vec3(0.)), vec3(1./2.2)), 1.);
}`;
  const names = [['b-vidro','brasa','Vidro'],['b-liquido','brasa','Líquido'],['b-camadas','brasa','Camadas'],['b-eclipse','brasa','Eclipse'],['b-fenda','brasa','Fenda'],['b-horizonte','brasa','Horizonte'],
    ['s-vidro','bruma','Vidro'],['s-seda','bruma','Seda'],['s-camadas','bruma','Camadas'],['s-perola','bruma','Pérola'],['s-entardecer','bruma','Entardecer'],['s-lua','bruma','Lua']];
  W.LIST = names.map(([id, style, name]) => ({ id, style, key: id.slice(2), name, src: SRC, night: id === 's-lua' }));
  W.byId = (id) => W.LIST.find((w) => w.id === id);
  W.ofStyle = (s) => W.LIST.filter((w) => w.style === s);
  W.moonPhase = function (date) {
    const days = ((date || new Date()).getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
    const ph = (days % 29.530588853) / 29.530588853; return ph < 0 ? ph + 1 : ph;
  };
})(window.PousoWalls = window.PousoWalls || {});
