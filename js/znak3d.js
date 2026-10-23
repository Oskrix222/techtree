// Znak TechTree jako prawdziwa bryła 3D (WebGL, bez bibliotek, ~5 KB).
// Dwa klocki L z ikona.svg, wytłoczone, matowe światło. Tryby: "hero" (składanie, kursor, przewijanie) i "spin" (obrót).
(() => {
const L1 = [[4.37, 19.11], [17.72, 14.25], [27.61, 41.42], [38.66, 37.4], [43.52, 50.75], [19.11, 59.63]];
const L2 = [[59.63, 44.89], [46.28, 49.75], [36.39, 22.58], [25.34, 26.6], [20.48, 13.25], [44.89, 4.37]];
const hex = (h) => [1, 3, 5].map((i) => ((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))(parseInt(h.substr(i, 2), 16) / 255));

function piece(pts, depth) {
  const P = pts.map(([x, y]) => [x - 32, 32 - y]); // środek w 0, oś y w górę
  const c = P.reduce((a, p) => [a[0] + p[0] / 6, a[1] + p[1] / 6], [0, 0]);
  const v = [], z = depth / 2;
  const tri = (a, b, d, n) => { for (const q of [a, b, d]) v.push(q[0], q[1], q[2], n[0], n[1], n[2]); };
  // przód i tył: wachlarz z wierzchołka wklęsłego (indeks 2)
  for (let i = 3; i < 8; i++) {
    const a = P[2], b = P[i % 6], d = P[(i + 1) % 6];
    if ((i + 1) % 6 === 2) continue;
    tri([a[0], a[1], z], [b[0], b[1], z], [d[0], d[1], z], [0, 0, 1]);
    tri([a[0], a[1], -z], [d[0], d[1], -z], [b[0], b[1], -z], [0, 0, -1]);
  }
  // ścianki boczne
  for (let i = 0; i < 6; i++) {
    const a = P[i], b = P[(i + 1) % 6];
    const ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey), n = [-ey / l, ex / l, 0]; // wielokąt zgodny z ruchem wskazówek → normalna na zewnątrz
    tri([a[0], a[1], z], [a[0], a[1], -z], [b[0], b[1], -z], n);
    tri([a[0], a[1], z], [b[0], b[1], -z], [b[0], b[1], z], n);
  }
  return { data: new Float32Array(v), count: v.length / 6, c };
}

// macierze 4×4 (kolumnowe)
const M = {
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  persp(f, asp, n, fa) { const t = 1 / Math.tan(f / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (fa + n) / (n - fa); o[11] = -1; o[14] = (2 * fa * n) / (n - fa); return o; },
  tr(x, y, z) { const o = M.id(); o[12] = x; o[13] = y; o[14] = z; return o; },
  id() { const o = new Float32Array(16); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  rx(a) { const o = M.id(), c = Math.cos(a), s = Math.sin(a); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o; },
  ry(a) { const o = M.id(), c = Math.cos(a), s = Math.sin(a); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o; },
  rz(a) { const o = M.id(), c = Math.cos(a), s = Math.sin(a); o[0] = c; o[1] = s; o[4] = -s; o[5] = c; return o; },
};

const VS = `attribute vec3 p;attribute vec3 n;uniform mat4 uP,uMV;varying vec3 vN;void main(){vN=mat3(uMV)*n;gl_Position=uP*uMV*vec4(p,1.);}`;
const FS = `precision mediump float;varying vec3 vN;uniform vec3 uC;uniform float uA;
void main(){vec3 N=normalize(vN);
float k=max(dot(N,normalize(vec3(-.45,.78,.55))),0.);float f=max(dot(N,normalize(vec3(.75,.05,.45))),0.);float h=N.y*.5+.5;
vec3 c=uC*(.34+.72*k+.16*f+.07*h);c=c/(c+vec3(.9))*1.9;gl_FragColor=vec4(pow(c,vec3(1./2.2)),uA);}`;

function znak3d(canvas, opt = {}) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr); gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const loc = { p: gl.getAttribLocation(pr, "p"), n: gl.getAttribLocation(pr, "n"), P: gl.getUniformLocation(pr, "uP"), MV: gl.getUniformLocation(pr, "uMV"), C: gl.getUniformLocation(pr, "uC"), A: gl.getUniformLocation(pr, "uA") };
  const cols = (opt.colors || ["#0F4D37", "#C97E2C"]).map(hex);
  const parts = [L1, L2].map((pts, i) => { const g = piece(pts, opt.depth || 11), b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, g.data, gl.STATIC_DRAW); return { ...g, b, col: cols[i] }; });
  const dir = (() => { const a = parts[0].c, b = parts[1].c, l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; })();

  const st = { t0: performance.now(), intro: opt.intro !== false, px: 0, py: 0, tx: 0, ty: 0, scroll: 0, run: false, raf: 0, still: !!opt.still };
  function size() { const d = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== Math.round(w * d) || canvas.height !== Math.round(h * d)) { canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); } gl.viewport(0, 0, canvas.width, canvas.height); }
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4);

  function frame(now) {
    size();
    const t = (now - st.t0) / 1000;
    st.px += (st.tx - st.px) * 0.07; st.py += (st.ty - st.py) * 0.07;
    let sep, rx, ry, rz, spinA = 0, lift = 0, alpha = 1, prz = 0;
    if (opt.mode === "spin") {
      sep = 2.5 + Math.sin(t * 1.1) * 2.5; rx = -0.95; ry = 0; rz = 0; spinA = st.still ? 0.35 : t * 0.55; lift = Math.sin(t * 1.3) * 1.2;
    } else {
      const k = st.still || !st.intro ? 1 : ease((t - 0.15) / 1.7);
      sep = (1 - k) * 46 + st.scroll * 30; prz = (1 - k) * 0.9 + st.scroll * 0.35;
      rx = 0.36 - st.py * 0.2 + st.scroll * 0.25; ry = -0.4 + st.px * 0.3 - (1 - k) * 0.9; rz = -st.scroll * 0.25;
      lift = st.still ? 0 : Math.sin(t * 0.9) * 1.3; alpha = Math.min(1, k * 1.6 + 0.0001);
      if (opt.onLift) opt.onLift(lift);
    }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const asp = canvas.width / canvas.height, P = M.persp(0.5, asp, 10, 600);
    gl.uniformMatrix4fv(loc.P, false, P); gl.uniform1f(loc.A, alpha);
    const dist = opt.dist || 175;
    const base = M.mul(M.mul(M.mul(M.tr(0, lift, -dist), M.rx(rx)), M.ry(ry)), M.rz(rz + spinA));
    parts.forEach((pt, i) => {
      const s = i ? 1 : -1, c = pt.c;
      const m = M.mul(M.mul(M.mul(M.tr(dir[0] * sep * s / 2 + c[0], dir[1] * sep * s / 2 + c[1], s * sep * 0.12), M.rz(prz * s)), M.rx(prz * 0.5 * s)), M.tr(-c[0], -c[1], 0));
      gl.uniformMatrix4fv(loc.MV, false, M.mul(base, m)); gl.uniform3fv(loc.C, pt.col);
      gl.bindBuffer(gl.ARRAY_BUFFER, pt.b);
      gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 24, 12);
      gl.drawArrays(gl.TRIANGLES, 0, pt.count);
    });
    if (st.run && !st.still) st.raf = requestAnimationFrame(frame);
  }
  const api = {
    start() { if (st.run) return; st.run = true; st.raf = requestAnimationFrame(frame); },
    stop() { st.run = false; cancelAnimationFrame(st.raf); },
    draw() { requestAnimationFrame(frame); },
    pointer(x, y) { st.tx = x; st.ty = y; },
    scroll(p) { st.scroll = p; if (st.still) api.draw(); },
  };
  new ResizeObserver(() => api.draw()).observe(canvas);
  return api;
}
window.znak3d = znak3d;
})();
