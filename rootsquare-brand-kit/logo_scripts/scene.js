// Logo scenes: one geometry description per variant x colour, serialised to SVG (RGB master)
// and to CMYK PDF (written directly, with DeviceCMYK shadings for the gradients).
const L = require('./lib');
const { C, FLAT, f2 } = L;
const { makeMesh, loadConfig } = require('./mesh');
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');

const VARIANTS = ['primary', 'mark', 'wordmark', 'lockup-horizontal', 'lockup-stacked'];
const COLOURS = ['colour', 'flat', 'black', 'white'];
const LOCK = { h: { cap: 0.40, gap: 0.24 }, s: { wmWidth: 2.10, gap: 0.20 } };

const primaryConfig = loadConfig('rootsquare-radical-window-gradient-mesh-square-1024x1024');
const primaryMesh = makeMesh(primaryConfig);

// Alternate primaries: the same wave field at other moments (ms after the saved still frame).
// They share one artboard, so any of them can replace another without the layout shifting.
const ALTS = [
  { name: 'primary-alt-1', dt: 1200 },
  { name: 'primary-alt-2', dt: 3600 },
  { name: 'primary-alt-3', dt: 6000 },
];
for (const a of ALTS) a.mesh = primaryMesh.paths(primaryConfig.stillPhase + a.dt);

// Half-side of the square artboard, centred on the window (320, 320), that encloses the meshes.
function squareRadius(meshSets) {
  const mb = L.bboxOfD(meshSets.flat());
  return Math.ceil(Math.max(320 - mb.x0, mb.x1 - 320, 320 - mb.y0, mb.y1 - 320)) + 2;
}
const ALT_R = squareRadius(ALTS.map((a) => a.mesh));
const lin = (x1, y1, x2, y2) => ({ type: 'linear', x1, y1, x2, y2, stops: [{ o: 0, hex: C.orange, a: 1 }, { o: 1, hex: C.red, a: 1 }] });
const SOLID = { flat: FLAT, black: C.black, white: C.white };
const paintFor = (mode, grad) => (mode === 'colour' ? grad : { solid: SOLID[mode] });

// ---------- variants ----------
const clear = {}; // clear-space unit x and artboard per variant

function markItem(mode, tx = 0, ty = 0, s = 1) {
  return { ds: [L.markD], rule: 'evenodd', tf: { tx, ty, s }, paint: paintFor(mode, lin(0, 0, L.MARK_S, L.MARK_S)) };
}
function wordItem(mode, tx, ty, s) {
  const b = L.wordmark().bb;
  return { ds: [L.wordmark().d], rule: 'nonzero', tf: { tx, ty, s }, paint: paintFor(mode, lin(b.x0, b.y0, b.x1, b.y1)) };
}
// Mesh + window, in the logo tool's 640 space, on a square artboard of half-side r.
function primaryScene(mode, mesh, r, title) {
  return {
    vb: [320 - r, 320 - r, 2 * r, 2 * r], title,
    items: [
      { ds: mesh, rule: 'nonzero', paint: paintFor(mode, primaryMesh.gradient(L.brandHex)) },
      { ds: [L.windowD(340, 3) + L.primaryRadicalD], rule: 'evenodd', tf: { tx: 150, ty: 150, s: 1 }, paint: paintFor(mode, lin(0, 0, 340, 340)) },
    ],
  };
}

const builders = {
  primary(mode) {
    clear.primary = { x: 340 / 4, box: [0, 0, 2 * squareRadius([L.meshPaths]), 2 * squareRadius([L.meshPaths])] };
    return primaryScene(mode, L.meshPaths, squareRadius([L.meshPaths]), 'RootSquare primary logo');
  },
  mark(mode) {
    clear.mark = { x: L.MARK_S / 4, box: [0, 0, L.MARK_S, L.MARK_S] };
    return { vb: [0, 0, L.MARK_S, L.MARK_S], title: 'RootSquare mark', items: [markItem(mode)] };
  },
  wordmark(mode) {
    const wm = L.wordmark(), b = wm.bb;
    clear.wordmark = { x: wm.cap / 2, box: [0, 0, b.w, b.h] };
    return { vb: [0, 0, b.w, b.h], title: 'RootSquare wordmark', items: [wordItem(mode, -b.x0, -b.y0, 1)] };
  },
  'lockup-horizontal'(mode) {
    const wm = L.wordmark(), H = 1000, k = (LOCK.h.cap * H) / wm.cap;
    const baseline = H / 2 + (wm.cap * k) / 2;
    const wx = H + LOCK.h.gap * H - wm.bb.x0 * k;
    const right = wx + wm.bb.x1 * k;
    const top = Math.min(0, baseline + wm.bb.y0 * k), bottom = Math.max(H, baseline + wm.bb.y1 * k);
    clear['lockup-horizontal'] = { x: H / 4, box: [0, 0, right, bottom - top] };
    return { vb: [0, top, right, bottom - top], title: 'RootSquare horizontal lockup',
      items: [markItem(mode, 0, 0, H / L.MARK_S), wordItem(mode, wx, baseline, k)] };
  },
  'lockup-stacked'(mode) {
    const wm = L.wordmark(), H = 1000, k = (LOCK.s.wmWidth * H) / wm.bb.w, W = wm.bb.w * k;
    const baseline = H + LOCK.s.gap * H + wm.cap * k;
    const bottom = baseline + wm.bb.y1 * k;
    clear['lockup-stacked'] = { x: H / 4, box: [0, 0, W, bottom] };
    return { vb: [0, 0, W, bottom], title: 'RootSquare stacked lockup',
      items: [markItem(mode, (W - H) / 2, 0, H / L.MARK_S), wordItem(mode, -wm.bb.x0 * k, baseline, k)] };
  },
};
for (const a of ALTS) {
  builders[a.name] = (mode) => {
    clear[a.name] = { x: 340 / 4, box: [0, 0, 2 * ALT_R, 2 * ALT_R] };
    return primaryScene(mode, a.mesh, ALT_R, `RootSquare primary logo, alternate ${a.name.slice(-1)} (wave field +${(a.dt / 1000).toFixed(1)} s)`);
  };
}

function build(variant, mode) {
  const sc = builders[variant](mode);
  sc.title += ` (${mode})`;
  return sc;
}

// ---------- SVG ----------
const stopEl = (s) => `<stop offset="${s.o}" stop-color="${s.hex}"${s.a < 1 ? ` stop-opacity="${s.a}"` : ''}/>`;
function gradEl(id, g) {
  if (g.type === 'radial') return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f2(g.cx)}" cy="${f2(g.cy)}" r="${f2(g.r)}">${g.stops.map(stopEl).join('')}</radialGradient>`;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f2(g.x1)}" y1="${f2(g.y1)}" x2="${f2(g.x2)}" y2="${f2(g.y2)}">${g.stops.map(stopEl).join('')}</linearGradient>`;
}
const tfAttr = (tf) => (tf ? ` transform="translate(${f2(tf.tx)} ${f2(tf.ty)})${tf.s !== 1 ? ` scale(${+tf.s.toFixed(6)})` : ''}"` : '');

// opts.size: [w, h] attribute strings (e.g. '100mm'); opts.background: hex drawn under everything
function toSVG(sc, opts = {}) {
  const [x, y, w, h] = sc.vb.map(f2);
  let defs = '', body = '';
  if (opts.background) body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${opts.background}"/>\n`;
  sc.items.forEach((it, i) => {
    let fill;
    if (it.paint.solid) fill = it.paint.solid;
    else { defs += gradEl(`rs-g${i}`, it.paint); fill = `url(#rs-g${i})`; }
    const rule = it.rule === 'evenodd' ? ' fill-rule="evenodd"' : '';
    const inner = it.ds.length === 1
      ? `<path fill="${fill}"${rule} d="${it.ds[0]}"/>`
      : `<g fill="${fill}"${rule}>${it.ds.map((d) => `<path d="${d}"/>`).join('')}</g>`;
    body += it.tf ? `<g${tfAttr(it.tf)}>${inner}</g>\n` : inner + '\n';
  });
  const [sw, sh] = opts.size || [w, h];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${sw}" height="${sh}">
<title>${L.esc(sc.title)}</title>
${defs ? `<defs>${defs}</defs>\n` : ''}${body}</svg>
`;
}

// EPS cannot carry transparency (cairo would rasterise it), so partial alpha is
// flattened against white: the result matches the SVG on white grounds only.
function flattenAlpha(sc) {
  const mix = (hex, a) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(hex.slice(1 + i, 3 + i), 16) * a + 255 * (1 - a)).toString(16).padStart(2, '0')).join('');
  const copy = JSON.parse(JSON.stringify(sc));
  let changed = false;
  for (const it of copy.items) if (it.paint.stops) for (const s of it.paint.stops) if (s.a < 1) { s.hex = mix(s.hex, s.a); s.a = 1; changed = true; }
  return { scene: copy, changed };
}

// ---------- SVG path -> PDF operators ----------
function arcToBeziers(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  const phi = (phiDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / (rx * rx * y1p * y1p + ry * ry * x1p * x1p)));
  if (fa === fs) coef = -coef;
  const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.ceil(Math.abs(dt) / (Math.PI / 2)), seg = dt / n, out = [];
  const pt = (t) => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const der = (t) => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  const k = (4 / 3) * Math.tan(seg / 4);
  for (let i = 0; i < n; i++) {
    const a = t1 + i * seg, b = a + seg, p0 = pt(a), p3 = pt(b), d0 = der(a), d3 = der(b);
    out.push([p0[0] + k * d0[0], p0[1] + k * d0[1], p3[0] - k * d3[0], p3[1] - k * d3[1], p3[0], p3[1]]);
  }
  return out;
}
function pdfPath(d) {
  const toks = d.match(/[MLHVCQAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const n = (v) => +(+v).toFixed(3);
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const ops = [];
  const num = () => +toks[i++];
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    if (cmd !== cmd.toUpperCase()) throw new Error('relative path commands not supported: ' + cmd);
    switch (cmd) {
      case 'M': x = num(); y = num(); sx = x; sy = y; ops.push(`${n(x)} ${n(y)} m`); cmd = 'L'; break;
      case 'L': x = num(); y = num(); ops.push(`${n(x)} ${n(y)} l`); break;
      case 'H': x = num(); ops.push(`${n(x)} ${n(y)} l`); break;
      case 'V': y = num(); ops.push(`${n(x)} ${n(y)} l`); break;
      case 'C': { const a = [num(), num(), num(), num(), num(), num()]; ops.push(`${a.map(n).join(' ')} c`); x = a[4]; y = a[5]; break; }
      case 'Q': { const qx = num(), qy = num(), ex = num(), ey = num();
        ops.push(`${n(x + (2 / 3) * (qx - x))} ${n(y + (2 / 3) * (qy - y))} ${n(ex + (2 / 3) * (qx - ex))} ${n(ey + (2 / 3) * (qy - ey))} ${n(ex)} ${n(ey)} c`);
        x = ex; y = ey; break; }
      case 'A': { const rx = num(), ry = num(), rot = num(), fa = num(), fs = num(), ex = num(), ey = num();
        for (const b of arcToBeziers(x, y, rx, ry, rot, fa, fs, ex, ey)) ops.push(`${b.map(n).join(' ')} c`);
        x = ex; y = ey; break; }
      case 'Z': ops.push('h'); x = sx; y = sy; break;
      default: throw new Error('unsupported path command ' + cmd);
    }
  }
  return ops.join('\n');
}

// ---------- CMYK PDF ----------
// cmyk: { hex -> [c,m,y,k] in % }. Partial alpha becomes a tint of the ink (exact on white paper).
// profile (profiles.js) names the press standard in an OutputIntent, so preflight tools can see
// which condition the numbers target; the profile itself is not embedded.
async function toCMYKPdf(sc, cmyk, meta, longMM = 100, profile = null) {
  const doc = await PDFDocument.create();
  const [vx, vy, vw, vh] = sc.vb;
  const k = ((longMM / 25.4) * 72) / Math.max(vw, vh);
  const W = vw * k, H = vh * k;
  const page = doc.addPage([W, H]);
  const ctx = doc.context;
  const col = (hex, a = 1) => { const v = cmyk[hex]; if (!v) throw new Error('no CMYK for ' + hex); return v.map((p) => +((p / 100) * a).toFixed(4)); };
  const shadings = {};
  // full precision on the scale: rounding it to 2 dp mis-sized wide artwork by several percent
  const ops = [`${+k.toFixed(8)} 0 0 ${-k.toFixed(8)} ${+(-vx * k).toFixed(4)} ${+(H + vy * k).toFixed(4)} cm`];
  sc.items.forEach((it, i) => {
    ops.push('q');
    if (it.tf) ops.push(`${it.tf.s} 0 0 ${it.tf.s} ${f2(it.tf.tx)} ${f2(it.tf.ty)} cm`);
    const pathOps = it.ds.map(pdfPath).join('\n');
    const eo = it.rule === 'evenodd';
    if (it.paint.solid) {
      ops.push(`${col(it.paint.solid).join(' ')} k`, pathOps, eo ? 'f*' : 'f');
    } else {
      const g = it.paint, st = g.stops;
      const fns = [];
      for (let s = 0; s < st.length - 1; s++) fns.push(ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: col(st[s].hex, st[s].a), C1: col(st[s + 1].hex, st[s + 1].a), N: 1 }));
      const fn = fns.length === 1 ? fns[0] : ctx.obj({ FunctionType: 3, Domain: [st[0].o, st[st.length - 1].o], Functions: fns,
        Bounds: st.slice(1, -1).map((s) => s.o), Encode: fns.flatMap(() => [0, 1]) });
      const coords = g.type === 'radial' ? [g.cx, g.cy, 0, g.cx, g.cy, g.r] : [g.x1, g.y1, g.x2, g.y2];
      // stop offsets may not span 0..1: map the shading's t range onto the outermost stops
      const t0 = st[0].o, t1 = st[st.length - 1].o;
      let co = coords;
      if (g.type === 'radial') co = [g.cx, g.cy, g.r * t0, g.cx, g.cy, g.r * t1];
      else if (t0 !== 0 || t1 !== 1) { const ip = (u) => [g.x1 + (g.x2 - g.x1) * u, g.y1 + (g.y2 - g.y1) * u]; co = [...ip(t0), ...ip(t1)]; }
      const sh = ctx.obj({ ShadingType: g.type === 'radial' ? 3 : 2, ColorSpace: 'DeviceCMYK', Coords: co.map(f2), Function: fn,
        Domain: [t0, t1], Extend: [true, true] });
      shadings[`Sh${i}`] = ctx.register(sh);
      ops.push(pathOps, eo ? 'W* n' : 'W n', `/Sh${i} sh`);
    }
    ops.push('Q');
  });
  const content = ctx.flateStream(ops.join('\n'));
  page.node.set(PDFName.of('Contents'), ctx.register(content));
  if (Object.keys(shadings).length) {
    const res = page.node.Resources();
    res.set(PDFName.of('Shading'), ctx.obj(shadings));
  }
  if (profile) {
    doc.catalog.set(PDFName.of('OutputIntents'), ctx.obj([ctx.obj({
      Type: 'OutputIntent', S: 'GTS_PDFX',
      OutputConditionIdentifier: PDFString.of(profile.outputCondition),
      OutputCondition: PDFString.of(profile.label),
      RegistryName: PDFString.of('http://www.color.org'),
      Info: PDFString.of(profile.info),
    })]));
  }
  doc.setTitle(meta.title);
  doc.setSubject(meta.subject);
  doc.setKeywords(meta.keywords);
  doc.setAuthor('RootSquare');
  doc.setCreator('RootSquare brand kit build');
  doc.setProducer('RootSquare brand kit build (pdf-lib)');
  doc.setCreationDate(new Date(`${L.DATE}T12:00:00Z`));
  doc.setModificationDate(new Date(`${L.DATE}T12:00:00Z`));
  return doc.save({ useObjectStreams: false }); // classic xref: inspectable, friendlier to older RIPs
}

module.exports = { VARIANTS, ALTS, COLOURS, LOCK, clear, build, builders, toSVG, flattenAlpha, toCMYKPdf, pdfPath, primaryMesh, lin };
