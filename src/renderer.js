/* Pouso — renderizador leve.
   Um programa por vez, resolução reduzida, no máximo 30 quadros por segundo,
   pausa quando a aba sai de vista e respeita "reduzir movimento". */
(function (G) {
  'use strict';
  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  function Renderer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.scale = this.baseScale = opts.scale || 0.5;          // fração dos pixels reais (o papel é suave, não precisa de mais)
    this.maxPixels = opts.maxPixels || 1600 * 900;
    this.fps = opts.fps || 30;
    this.fixed = !!opts.fixed;
    this.progs = {};
    this.t = 8 + Math.random() * 40;          // cada abertura começa num momento diferente
    this.speed = 1; this.energy = 1; this.phase = 0.5; this.layout = 0;
    this.colors = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    this.running = false; this.last = 0; this.acc = 0;
    this.slow = 0; this.frames = 0; this.span = 0; this.minScale = 0.3;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false,
      preserveDrawingBuffer: !!opts.preserve, powerPreference: 'low-power' });
    this.gl = gl;
    if (!gl) { this.failed = true; return; }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.failed = true; this.stop(); if (this.onfail) this.onfail(); });
    this._tick = this._tick.bind(this);
  }

  Renderer.prototype.program = function (w) {
    if (this.progs[w.id]) return this.progs[w.id];
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(w.id + ': ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, w.src));
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(w.id + ': ' + gl.getProgramInfoLog(p));
    const loc = {};
    ['R', 'T', 'E', 'PH', 'LY', 'C0', 'C1', 'C2', 'C3'].forEach((n) => { loc[n] = gl.getUniformLocation(p, n); });
    return (this.progs[w.id] = { p, loc });
  };

  Renderer.prototype.set = function (w) {
    if (this.failed) return false;
    try { this.cur = this.program(w); this.wall = w; if (!this.fixed) this.scale = Math.min(w.scale || this.baseScale, this.capped ? this.scale : 9); return true; }
    catch (e) { console.warn('[Pouso]', e.message); this.failed = true; if (this.onfail) this.onfail(); return false; }
  };

  Renderer.prototype.resize = function (force) {
    const c = this.canvas;
    if (this.fixed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = Math.max(1, c.clientWidth * dpr * this.scale), h = Math.max(1, c.clientHeight * dpr * this.scale);
    const k = Math.sqrt(Math.min(1, this.maxPixels / (w * h)));
    w = Math.round(w * k); h = Math.round(h * k);
    if (force || c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  };

  Renderer.prototype.draw = function () {
    if (this.failed || !this.cur) return;
    const gl = this.gl, L = this.cur.loc, c = this.colors;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.cur.p);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(L.R, this.canvas.width, this.canvas.height);
    gl.uniform1f(L.T, this.t);
    gl.uniform1f(L.E, this.energy);
    gl.uniform1f(L.PH, this.phase);
    if (L.LY) gl.uniform1f(L.LY, this.layout);
    gl.uniform3fv(L.C0, c[0]); gl.uniform3fv(L.C1, c[1]); gl.uniform3fv(L.C2, c[2]); gl.uniform3fv(L.C3, c[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  Renderer.prototype._tick = function (now) {
    if (!this.running) return;
    requestAnimationFrame(this._tick);
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    // computador sofrendo (menos de 20 quadros/s por 3 s seguidos)? baixa a resolução do papel
    this.frames++; this.span += dt;
    if (this.span > 3) {
      const fps = this.frames / this.span; this.frames = 0; this.span = 0;
      if (fps < 20 && this.scale > this.minScale) { this.scale = Math.max(this.minScale, this.scale * 0.75); this.capped = true; }
    }
    this.acc += dt;
    if (this.acc < 1 / this.fps - 0.002) return;
    this.t += this.acc * this.speed;
    this.acc = 0;
    this.draw();
  };

  Renderer.prototype.start = function () {
    if (this.failed || this.running) return;
    if (this.speed <= 0) { this.draw(); return; }   // movimento parado: um quadro só
    this.running = true; this.last = 0; requestAnimationFrame(this._tick);
  };
  Renderer.prototype.stop = function () { this.running = false; };

  // foto do papel numa resolução pequena (miniaturas e reserva estática)
  Renderer.prototype.snapshot = function (w, colors, opts) {
    if (!this.set(w)) return null;
    this.colors = colors; this.energy = opts.energy; this.phase = opts.phase; this.t = opts.t || 18;
    this.draw();
    return this.canvas.toDataURL('image/jpeg', 0.86);
  };

  G.Renderer = Renderer;
})(window.PousoGL = window.PousoGL || {});
