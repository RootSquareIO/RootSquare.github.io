// Port of the mesh generator in radical-window_public.html (rebuildGrid, seedField,
// strokeLines in ribbon mode, window damping, meshGradientSpec), so any saved parameter
// set can be regenerated at any time t. makeMesh(cfg, opts).paths(t) returns the mesh as
// filled ribbon path strings in the tool's logical space (shorter side = 640).
const SRC = require('path').join(__dirname, '..', 'Logo Material');
const REF = 640;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const svgn = (v) => (isFinite(v) ? String(Math.round(v * 100) / 100) : '0');
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hexA = (hex, a) => ({ hex, a });

// opts.noWindow: no calm zone (the banner hides its window and cut-out)
// opts.loopMs:   snap drift speeds to whole cycles per loop so frame 0 == frame N
function makeMesh(CONFIG, opts = {}) {
  const k0 = REF / Math.min(CONFIG.canvasW, CONFIG.canvasH);
  const LW = CONFIG.canvasW * k0, LH = CONFIG.canvasH * k0;
  const sw = CONFIG.windowW, sh = CONFIG.windowH, s = Math.min(sw, sh);
  const o = { x: (LW - sw) / 2, y: (LH - sh) / 2 };

  const vLines = [], hLines = [];
  const over = Math.max(CONFIG.spacing * 2, 20);
  const gridStart = () => (CONFIG.edgeMargin > 0 ? CONFIG.edgeMargin : -over);
  const gridEnd = (dim) => (CONFIG.edgeMargin > 0 ? dim - CONFIG.edgeMargin : dim + over);
  {
    const rnd = mulberry32((((CONFIG.fieldSeed | 0) || 1) ^ 0x9E3779B9) | 0);
    const fill = (into, from, to) => {
      if (CONFIG.edgeMargin > 0) {
        const gaps = Math.max(1, Math.round((to - from) / CONFIG.spacing));
        const step = (to - from) / gaps;
        for (let i = 0; i <= gaps; i++) into.push({ pos: from + i * step, t0: rnd(), t1: rnd(), c0: rnd() });
      } else for (let v = from; v <= to; v += CONFIG.spacing) into.push({ pos: v, t0: rnd(), t1: rnd(), c0: rnd() });
    };
    fill(vLines, gridStart(), gridEnd(LW));
    fill(hLines, gridStart(), gridEnd(LH));
  }
  const sampleStep = clamp(Math.round((vLines.length + hLines.length) / 110) * 2 + 4, 4, 16);

  const waves = [];
  {
    const rnd = mulberry32((CONFIG.fieldSeed | 0) || 1);
    for (let i = 0; i < CONFIG.waveCount; i++) {
      const n = 1 + i * 0.66 + rnd() * 0.35;
      const k = (2 * Math.PI * n) / CONFIG.wavelength;
      const theta = rnd() * Math.PI * 2;
      let drift = ((2 * Math.PI * n) / CONFIG.driftPeriod) * (0.75 + rnd() * 0.5);
      if (opts.loopMs) { const unit = (2 * Math.PI) / opts.loopMs; drift = Math.max(1, Math.round(drift / unit)) * unit; }
      const a = 1 / Math.pow(n, CONFIG.falloff);
      waves.push({ k, cx: Math.cos(theta), cy: Math.sin(theta), omega: rnd() < 0.5 ? -drift : drift, phi: rnd() * Math.PI * 2,
        gx: a * k * Math.cos(theta), gy: a * k * Math.sin(theta) });
    }
  }
  const reach = waves.reduce((sum, w) => sum + Math.hypot(w.gx, w.gy), 0);

  function damp(x, y) {
    if (opts.noWindow) return 1;
    const d = Math.min(x - o.x, o.x + sw - x, y - o.y, o.y + sh - y);
    const band = CONFIG.feather;
    if (band <= 0) return d <= 0 ? 1 : 0;
    const start = (-band * (CONFIG.transition + 1)) / 2;
    if (d <= start) return 1;
    if (d >= start + band) return 0;
    const u = (d - start) / band;
    return 1 - u * u * (3 - 2 * u);
  }
  function edgeEnvelope(x, y) {
    const m = CONFIG.edgeMargin, grip = CONFIG.edgeGrip;
    if (m <= 0 || grip <= 0) return 1;
    const d = Math.min(x - m, LW - m - x, y - m, LH - m - y);
    if (d <= 0) return 0;
    if (d >= grip) return 1;
    const u = d / grip;
    return u * u * (3 - 2 * u);
  }
  function lineExtent(lines, box) {
    let lo = null, hi = null;
    for (const l of lines) { if (l.pos < box.lo - 0.01 || l.pos > box.hi + 0.01) continue; if (lo === null) lo = l.pos; hi = l.pos; }
    return lo === null ? box : { lo, hi };
  }

  function paths(t) {
    if (CONFIG.interior !== 'rest' && !opts.noWindow) throw new Error('only interior "rest" is ported');
    if (CONFIG.lineStyle !== 'solid' || CONFIG.raggedV > 0 || CONFIG.raggedH > 0) throw new Error('only solid, non-ragged meshes are ported');
    const inset = CONFIG.edgeMargin > 0 && CONFIG.edgeGrip <= 0 ? CONFIG.amplitude * reach + CONFIG.lineWeight : 0;
    const xBox = { lo: gridStart() + inset, hi: gridEnd(LW) - inset };
    const yBox = { lo: gridStart() + inset, hi: gridEnd(LH) - inset };
    const xr = CONFIG.alignEnds ? lineExtent(vLines, xBox) : xBox;
    const yr = CONFIG.alignEnds ? lineExtent(hLines, yBox) : yBox;
    const out = [], amp = CONFIG.amplitude, weight = CONFIG.lineWeight;
    const bold = CONFIG.cutoutBold !== 'off' && !opts.noWindow;

    function stroke(lines, vertical, extent, across) {
      for (const line of lines) {
        const fixed = line.pos;
        if (fixed < across.lo - 0.01 || fixed > across.hi + 0.01) continue;
        const from = extent.lo, to = extent.hi;
        const pB = waves.map((wv) => (vertical ? wv.k * wv.cx * fixed : wv.k * wv.cy * fixed) + wv.omega * t + wv.phi);
        const pI = waves.map((wv) => (vertical ? wv.k * wv.cy : wv.k * wv.cx));
        const P = [];
        const steps = Math.max(1, Math.ceil((to - from) / sampleStep));
        for (let i = 0; i <= steps; i++) {
          const u = from + (to - from) * (i / steps);
          let gx = 0, gy = 0;
          for (let m = 0; m < waves.length; m++) { const c = Math.cos(pB[m] + pI[m] * u); gx += waves[m].gx * c; gy += waves[m].gy * c; }
          const x = vertical ? fixed : u, y = vertical ? u : fixed;
          const w = damp(x, y);
          let dx = amp * gx * w, dy = amp * gy * w;
          const e = edgeEnvelope(x, y);
          if (e < 1) { dx *= e; dy *= e; }
          const inside = 1 - w;
          const b = !bold ? 1 : CONFIG.cutoutBold === 'step' ? (inside > 0.5 ? CONFIG.cutoutBoldAmount : 1) : 1 + (CONFIG.cutoutBoldAmount - 1) * inside;
          P.push([x + dx, y + dy, b]);
        }
        if (P.length < 2) continue;
        const pt = (k, side) => {
          const ka = k > 0 ? k - 1 : k, kb = k < P.length - 1 ? k + 1 : k;
          const tx = P[kb][0] - P[ka][0], ty = P[kb][1] - P[ka][1];
          const L = Math.hypot(tx, ty) || 1;
          const h = Math.max(0.1, (weight * P[k][2]) / 2);
          return svgn(P[k][0] + (-ty / L) * h * side) + ' ' + svgn(P[k][1] + (tx / L) * h * side);
        };
        let d = '';
        for (let k = 0; k < P.length; k++) d += (k ? 'L' : 'M') + pt(k, 1);
        for (let k = P.length - 1; k >= 0; k--) d += 'L' + pt(k, -1);
        out.push(d + 'Z');
      }
    }
    stroke(vLines, true, yr, xBox);
    stroke(hLines, false, xr, yBox);
    return out;
  }

  // meshGradientSpec + gradientDef, radial case, as plain stops ({o, hex, a}).
  // remap swaps the tool's saved colours for others (the brand palette's, in this kit).
  function gradient(remap = (hex) => hex) {
    const a = CONFIG.lineAlpha * CONFIG.gradientEnd;
    const col = (hex, alpha) => hexA(remap(hex), alpha);
    const cols = [col(CONFIG.lineColour, CONFIG.lineAlpha), col(CONFIG.gradientColour, a)];
    if (CONFIG.gradientStops >= 3) cols.push(col(CONFIG.gradientColour3, a));
    if (CONFIG.gradientStops >= 4) cols.push(col(CONFIG.gradientColour4, a));
    const p0 = clamp(CONFIG.gradientMix - 0.4, 0, 1);
    let p1 = clamp(CONFIG.gradientMix + 0.4, 0, 1);
    if (p1 <= p0) p1 = Math.min(1, p0 + 0.01);
    const r0 = s * 0.25, r1 = Math.max(LW, LH) * 0.75;
    const stops = [{ o: 0, ...cols[0] }].concat(cols.map((c, i) => {
      const off = p0 + (p1 - p0) * (i / (cols.length - 1));
      return { o: Math.round(clamp((r0 + off * (r1 - r0)) / r1, 0, 1) * 100) / 100, ...c }; // svgn() rounding
    }));
    return { type: 'radial', cx: o.x + sw / 2, cy: o.y + sh / 2, r: r1, stops };
  }

  return { paths, gradient, LW, LH, o, sw, sh, CONFIG, margin: CONFIG.edgeMargin, inset: CONFIG.amplitude * reach + CONFIG.lineWeight };
}

const loadConfig = (name) => JSON.parse(require('fs').readFileSync(`${SRC}/${name}.json`, 'utf8'));
module.exports = { makeMesh, loadConfig };
