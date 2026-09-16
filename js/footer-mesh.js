// Footer wordmark: a trimmed, fixed-configuration port of the "Radical
// Window" canvas engine (see /radicalwindow.html for the full tool with its
// parameter panel). Only the pieces this exact look needs are kept — no
// sweep (axis is permanently "none", window parked at centre), no SVG/PNG/
// video export, no UI. Rendering natively like this avoids the loop-seam
// flash a baked video has, since the wave field never actually repeats.
//
// The window itself is hidden (showWindow:false), so the wordmark "RootSquare"
// is drawn as a positive gradient-filled mark rather than a hole, and the
// mesh's calming follows the cut-out's own silhouette (dampShape:'cutout').
// Motion runs continuously (not gated on hover).
(function(){
  const canvas = document.getElementById('footerMeshCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== CONFIG — the exact parameter set requested for the footer mark ===
  const CONFIG = {
    canvasW: 1200, canvasH: 400,
    showMesh: true, showWindow: false, showCutout: true, showBorder: false,
    cutout: 'text', cutoutText: 'RootSquare', cutoutFont: 'outfit', cutoutWeight: 800,
    cutoutScale: 1.8, cutoutStretch: 1, cutoutX: 0, cutoutY: 0,
    strokeWeight: 0.1125, cutoutRounding: 0, cutoutSoftness: 0,
    windowShape: 'square', cornerRadius: 0, windowW: 1385, windowH: 640,
    windowRounding: 60, windowSoftness: 0, feather: 6,
    interior: 'rest', dampShape: 'cutout', transition: 1,
    waveCount: 4, wavelength: 430, amplitude: 450, driftPeriod: 3000, falloff: 0.95,
    fieldSeed: 339024,
    spacing: 19, lineWeight: 3.1, lineStyle: 'solid', thickVary: 0,
    raggedV: 0, raggedH: 0,
    cutoutBold: 'ramp', cutoutBoldAmount: 2.2, boldShape: 'cutout', alignEnds: true,
    edgeMargin: 160, edgeGrip: 0,
    lineColour: '#f53d27', lineAlpha: 0.55,
    meshColour: 'gradient', gradientStops: 2, gradientAxis: 'radial',
    gradientColour: '#f55d23', gradientEnd: 0.45, gradientColour3: '#f55d23',
    gradientColour4: '#1d1a27', gradientMix: 0.62,
    windowFill: 'gradient', squareColour2: '#f53d27', windowGradDir: 'radial',
    squareColour: '#f55d23', squareAlpha: 1,
    borderColour: '#f51d1f', borderAlpha: 1
  };

  const RADICAL = [
    [0.220, 0.470], [0.330, 0.720], [0.605, 0.255], [0.815, 0.255]
  ];
  const FONTS = {
    plex:   "'IBM Plex Sans', system-ui, sans-serif",
    outfit: "'Outfit', system-ui, sans-serif",
    mono:   "'IBM Plex Mono', ui-monospace, monospace"
  };
  const REF = 640; // design units along the shorter edge of the canvas

  function mulberry32(a){
    return function(){
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function toHex(c){
    if (/^#[0-9a-f]{6}$/i.test(c)) return c;
    if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map(ch => ch+ch).join('');
    return '#000000';
  }
  function rgba(colour, alpha){
    const hex = toHex(colour);
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }
  function paint(key, alphaKey){ return rgba(CONFIG[key], CONFIG[alphaKey]); }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function smoothstep(a, b, v){
    if (b === a) return v < a ? 0 : 1;
    const u = clamp((v - a) / (b - a), 0, 1);
    return u*u*(3 - 2*u);
  }

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let LW = REF, LH = REF, viewScale = 1;

  // ---- geometry -----------------------------------------------------------
  let sw = 0, sh = 0, s = 0, centre = { x: 0, y: 0 };
  function rebuildGeometry(){
    sw = CONFIG.windowW; sh = CONFIG.windowH; s = Math.min(sw, sh);
    centre = { x: (LW - sw)/2, y: (LH - sh)/2 };
  }

  let over = 0, sampleStep = 5;
  const vLines = [], hLines = [];
  function gridStart(){ return CONFIG.edgeMargin > 0 ? CONFIG.edgeMargin : -over; }
  function gridEnd(dim){ return CONFIG.edgeMargin > 0 ? dim - CONFIG.edgeMargin : dim + over; }

  function rebuildGrid(){
    const rnd = mulberry32((((CONFIG.fieldSeed | 0) || 1) ^ 0x9E3779B9) | 0);
    over = Math.max(CONFIG.spacing * 2, 20);
    vLines.length = 0; hLines.length = 0;
    function fill(into, from, to){
      if (CONFIG.edgeMargin > 0){
        const gaps = Math.max(1, Math.round((to - from) / CONFIG.spacing));
        const step = (to - from) / gaps;
        for (let i = 0; i <= gaps; i++) into.push({ pos: from + i*step, t0: rnd(), t1: rnd() });
      } else {
        for (let v = from; v <= to; v += CONFIG.spacing) into.push({ pos: v, t0: rnd(), t1: rnd() });
      }
    }
    fill(vLines, gridStart(), gridEnd(LW));
    fill(hLines, gridStart(), gridEnd(LH));
    const total = vLines.length + hLines.length;
    sampleStep = clamp(Math.round(total / 110) * 2 + 4, 4, 16);
  }

  // ---- warp field: superposition of randomly-oriented plane waves --------
  let waves = [], phaseBase, phaseInc, waveReach = 0;
  function seedField(){
    const rnd = mulberry32((CONFIG.fieldSeed | 0) || 1);
    waves = [];
    for (let i = 0; i < CONFIG.waveCount; i++){
      const n = 1 + i*0.66 + rnd()*0.35;
      const k = (2*Math.PI*n) / CONFIG.wavelength;
      const theta = rnd()*Math.PI*2;
      const drift = (2*Math.PI*n) / CONFIG.driftPeriod * (0.75 + rnd()*0.5);
      const a = 1 / Math.pow(n, CONFIG.falloff);
      waves.push({
        k, cx: Math.cos(theta), cy: Math.sin(theta),
        omega: rnd() < 0.5 ? -drift : drift, phi: rnd()*Math.PI*2,
        gx: a * k * Math.cos(theta), gy: a * k * Math.sin(theta)
      });
    }
    phaseBase = new Float64Array(waves.length);
    phaseInc = new Float64Array(waves.length);
    waveReach = waves.reduce((sum, w) => sum + Math.hypot(w.gx, w.gy), 0);
  }
  function maxDisplacement(){ return CONFIG.amplitude * waveReach; }
  function meshInset(){
    return (CONFIG.edgeMargin > 0 && CONFIG.edgeGrip <= 0)
      ? maxDisplacement() + CONFIG.lineWeight : 0;
  }

  // window sits fixed at centre — this embed never sweeps
  function windowOrigin(){ return centre; }

  // ---- damping ------------------------------------------------------------
  // dampShape is 'cutout' here: the field calms in a band around the
  // wordmark's own silhouette (via a blurred alpha field), not the whole
  // window rectangle — so the mesh keeps waving elsewhere inside the window
  let shapeField = null, shapeW = 0, shapeH = 0, shapeK = 1, shapePad = 0;
  function rebuildShapeField(){
    const band = Math.max(CONFIG.feather, 1);
    const shift = Math.max(Math.abs(CONFIG.cutoutX) * sw, Math.abs(CONFIG.cutoutY) * sh);
    shapePad = band * 2 + 12 + shift;
    const boxW = sw + shapePad*2, boxH = sh + shapePad*2;
    shapeK = 192 / Math.max(boxW, boxH);
    shapeW = Math.max(2, Math.ceil(boxW * shapeK));
    shapeH = Math.max(2, Math.ceil(boxH * shapeK));
    const c = scratch(shapeW, shapeH);
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.setTransform(shapeK, 0, 0, shapeK, 0, 0);
    cx.translate(shapePad - stampPad, shapePad - stampPad);
    cx.filter = 'blur(' + (band * shapeK) + 'px)';
    drawCutoutShape(cx);
    cx.filter = 'none';
    drawCutoutShape(cx);
    try {
      const data = cx.getImageData(0, 0, shapeW, shapeH).data;
      shapeField = new Uint8Array(shapeW * shapeH);
      for (let i = 0, j = 3; i < shapeField.length; i++, j += 4) shapeField[i] = data[j];
    } catch (e){ shapeField = null; }
  }
  function dampByShape(x, y, o){
    const fx = ((x - o.x) + shapePad) * shapeK;
    const fy = ((y - o.y) + shapePad) * shapeK;
    if (fx < 0 || fy < 0 || fx >= shapeW || fy >= shapeH) return 1;
    const a = shapeField[(fy | 0) * shapeW + (fx | 0)] / 255;
    const mid = 0.5 - CONFIG.transition * 0.4;
    return 1 - smoothstep(mid - 0.18, mid + 0.18, a);
  }
  // rectangle-distance fallback, used only if dampShape is ever 'window'
  function dampByWindow(x, y, o){
    const d = Math.min(x - o.x, o.x + sw - x, y - o.y, o.y + sh - y);
    const band = CONFIG.feather;
    if (band <= 0) return d <= 0 ? 1 : 0;
    const start = -band * (CONFIG.transition + 1) / 2;
    if (d <= start) return 1;
    if (d >= start + band) return 0;
    const u = (d - start) / band;
    return 1 - u*u*(3 - 2*u);
  }
  function damp(x, y, o){
    if (CONFIG.dampShape === 'cutout' && shapeField) return dampByShape(x, y, o);
    return dampByWindow(x, y, o);
  }

  function edgeEnvelope(){ return CONFIG.edgeMargin > 0 && CONFIG.edgeGrip > 0 ? 0 : 1; }

  // interior is 'rest', so the interior always straightens to zero
  const target = { x: 0, y: 0 };

  let ptX = new Float64Array(1024), ptY = new Float64Array(1024), ptW = new Float64Array(1024);

  function strokeLines(lines, vertical, t, o, extent, across, stroke){
    const step = sampleStep;
    const lo = extent.lo, hi = extent.hi;
    const acrossLo = across.lo, acrossHi = across.hi;
    const n = waves.length;
    const amp = CONFIG.amplitude;
    const bold = CONFIG.cutoutBold !== 'off';

    if (bold) ctx.fillStyle = stroke;
    else { ctx.strokeStyle = stroke; ctx.lineWidth = CONFIG.lineWeight; }

    for (let i = 0; i < lines.length; i++){
      const line = lines[i];
      const fixed = line.pos;
      if (fixed < acrossLo - 0.01 || fixed > acrossHi + 0.01) continue;
      const from = lo, to = hi;

      for (let m = 0; m < n; m++){
        const wv = waves[m];
        phaseBase[m] = (vertical ? wv.k*wv.cx*fixed : wv.k*wv.cy*fixed) + wv.omega*t + wv.phi;
        phaseInc[m] = vertical ? wv.k*wv.cy : wv.k*wv.cx;
      }

      let np = 0;
      const count = Math.floor((to - from) / step) + 2;
      if (bold && count > ptX.length){
        ptX = new Float64Array(count * 2); ptY = new Float64Array(count * 2); ptW = new Float64Array(count * 2);
      }

      if (!bold) ctx.beginPath();
      const steps = Math.max(1, Math.ceil((to - from) / step));
      for (let i2 = 0; i2 <= steps; i2++){
        const u = from + (to - from) * (i2 / steps);
        let gx = 0, gy = 0;
        for (let m = 0; m < n; m++){
          const c = Math.cos(phaseBase[m] + phaseInc[m]*u);
          gx += waves[m].gx * c; gy += waves[m].gy * c;
        }
        const x = vertical ? fixed : u;
        const y = vertical ? u : fixed;
        const w = damp(x, y, o);
        let dx = target.x + (amp*gx - target.x)*w;
        let dy = target.y + (amp*gy - target.y)*w;
        const e = edgeEnvelope();
        if (e < 1){ dx *= e; dy *= e; }
        const px = x + dx, py = y + dy;

        if (bold){
          const inside = 1 - w;
          const b = CONFIG.cutoutBold === 'step'
            ? (inside > 0.5 ? CONFIG.cutoutBoldAmount : 1)
            : 1 + (CONFIG.cutoutBoldAmount - 1) * inside;
          ptX[np] = px; ptY[np] = py; ptW[np] = b; np++;
        } else if (i2 === 0){
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }

      if (bold){
        if (np < 2) continue;
        ctx.beginPath();
        for (let k = 0; k < np; k++) ribbonPoint(k, np, CONFIG.lineWeight, 1, k === 0);
        for (let k = np - 1; k >= 0; k--) ribbonPoint(k, np, CONFIG.lineWeight, -1, false);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  }

  function ribbonPoint(k, np, weight, side, moveTo){
    const k0 = k > 0 ? k - 1 : k;
    const k1 = k < np - 1 ? k + 1 : k;
    const tx = ptX[k1] - ptX[k0], ty = ptY[k1] - ptY[k0];
    const L = Math.hypot(tx, ty) || 1;
    const nx = -ty / L, ny = tx / L;
    const h = Math.max(0.1, weight * ptW[k] / 2);
    const x = ptX[k] + nx * h * side;
    const y = ptY[k] + ny * h * side;
    if (moveTo) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }

  function baseStroke(o){
    const flat = paint('lineColour', 'lineAlpha');
    if (CONFIG.meshColour !== 'gradient') return flat;
    const a = CONFIG.lineAlpha * CONFIG.gradientEnd;
    const cols = [flat, rgba(CONFIG.gradientColour, a)];
    if (CONFIG.gradientStops >= 3) cols.push(rgba(CONFIG.gradientColour3, a));
    if (CONFIG.gradientStops >= 4) cols.push(rgba(CONFIG.gradientColour4, a));
    const cx = o.x + sw/2, cy = o.y + sh/2;
    const g = ctx.createRadialGradient(cx, cy, s*0.25, cx, cy, Math.max(LW, LH)*0.75);
    let p0 = clamp(CONFIG.gradientMix - 0.4, 0, 1);
    let p1 = clamp(CONFIG.gradientMix + 0.4, 0, 1);
    if (p1 <= p0) p1 = Math.min(1, p0 + 0.01);
    cols.forEach((col, i) => g.addColorStop(p0 + (p1 - p0) * (i / (cols.length - 1)), col));
    return g;
  }

  function lineExtent(lines, box){
    let lo = null, hi = null;
    for (let i = 0; i < lines.length; i++){
      const p = lines[i].pos;
      if (p < box.lo - 0.01 || p > box.hi + 0.01) continue;
      if (lo === null) lo = p;
      hi = p;
    }
    return lo === null ? box : { lo, hi };
  }

  function drawGrid(t, o){
    const base = baseStroke(o);
    const inset = meshInset();
    const xBox = { lo: gridStart() + inset, hi: gridEnd(LW) - inset };
    const yBox = { lo: gridStart() + inset, hi: gridEnd(LH) - inset };
    const xr = CONFIG.alignEnds ? lineExtent(vLines, xBox) : xBox;
    const yr = CONFIG.alignEnds ? lineExtent(hLines, yBox) : yBox;
    strokeLines(vLines, true,  t, o, yr, xBox, base);
    strokeLines(hLines, false, t, o, xr, yBox, base);
  }

  // ---- the window and its cut-out hole ------------------------------------
  function scratch(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function roundAlpha(c, radius){
    if (radius <= 0) return c;
    const blurred = scratch(c.width, c.height);
    const bx = blurred.getContext('2d');
    bx.filter = 'blur(' + (radius * viewScale) + 'px)';
    bx.drawImage(c, 0, 0);
    bx.filter = 'none';
    let data;
    try { data = bx.getImageData(0, 0, c.width, c.height); }
    catch (e){ return blurred; }
    const px = data.data;
    const k = Math.max(8, 1.5 * radius * viewScale);
    for (let i = 3; i < px.length; i += 4){
      const a = px[i] / 255;
      px[i] = clamp((a - 0.5) * k + 0.5, 0, 1) * 255;
    }
    bx.putImageData(data, 0, 0);
    return blurred;
  }

  function drawWindowShape(c){
    c.beginPath();
    c.roundRect(stampPad, stampPad, sw, sh, CONFIG.windowShape === 'rounded' ? CONFIG.cornerRadius : 3);
  }

  function drawCutoutShape(c){
    const cx = stampPad + sw/2, cy = stampPad + sh/2;
    const mx = stampPad + (sw - s)/2, my = stampPad + (sh - s)/2;
    c.save();
    c.translate(cx + CONFIG.cutoutX * sw, cy + CONFIG.cutoutY * sh);
    c.scale(CONFIG.cutoutScale * CONFIG.cutoutStretch, CONFIG.cutoutScale);
    c.translate(-cx, -cy);
    c.fillStyle = '#000'; c.strokeStyle = '#000';

    if (CONFIG.cutout === 'text'){
      const str = CONFIG.cutoutText || '√';
      const face = 'px ' + (FONTS[CONFIG.cutoutFont] || FONTS.plex);
      const wt = CONFIG.cutoutWeight + ' ';
      let size = s * 0.62;
      c.font = wt + size + face;
      const room = Math.min(sw, s * 1.4) * 0.9;
      const measured = c.measureText(str).width;
      if (measured > room) size *= room / measured;
      c.font = wt + size + face;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(str, cx, cy);
    } else {
      c.lineJoin = 'miter'; c.miterLimit = 10; c.lineCap = 'butt';
      c.lineWidth = s * CONFIG.strokeWeight;
      c.beginPath();
      RADICAL.forEach(([fx, fy], i) => {
        const x = mx + fx*s, y = my + fy*s;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.stroke();
    }
    c.restore();
  }

  let stamp = document.createElement('canvas');
  let stampPad = 0;

  function rebuildStamp(){
    // matches the source engine's own stampPad formula exactly — grow always
    // includes windowRounding, which is what gives cutoutScale's enlarged
    // text enough headroom before hitting the stamp canvas edge
    const grow = Math.max(CONFIG.windowSoftness, CONFIG.windowRounding, CONFIG.cutoutSoftness, CONFIG.cutoutRounding);
    stampPad = Math.ceil(grow * 3 + 10);
    const pw = Math.ceil((sw + stampPad*2) * viewScale);
    const ph = Math.ceil((sh + stampPad*2) * viewScale);
    if (pw <= 0 || ph <= 0 || !isFinite(pw) || !isFinite(ph)) return;

    stamp = scratch(pw, ph);
    const sc = stamp.getContext('2d');

    const rounding = CONFIG.showWindow ? CONFIG.windowRounding : CONFIG.cutoutRounding;

    // 1. the silhouette that carries the colour
    let winCanvas = scratch(pw, ph);
    const wc = winCanvas.getContext('2d');
    wc.setTransform(viewScale, 0, 0, viewScale, 0, 0);
    wc.fillStyle = '#000'; wc.strokeStyle = '#000';
    if (CONFIG.showWindow){ drawWindowShape(wc); wc.fill(); }
    else drawCutoutShape(wc);
    winCanvas = roundAlpha(winCanvas, rounding);

    // 2. the cut-out silhouette, punched only when the window itself is shown
    let cutCanvas = null;
    if (CONFIG.showWindow && CONFIG.showCutout){
      cutCanvas = scratch(pw, ph);
      const cc = cutCanvas.getContext('2d');
      cc.setTransform(viewScale, 0, 0, viewScale, 0, 0);
      drawCutoutShape(cc);
      cutCanvas = roundAlpha(cutCanvas, CONFIG.cutoutRounding);
    }

    // 3. flood the colour through the silhouette, then punch the hole
    sc.save();
    sc.drawImage(winCanvas, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    if (CONFIG.windowFill === 'gradient'){
      const dir = CONFIG.windowGradDir;
      let g;
      if (dir === 'radial'){
        const cx = (stampPad + sw/2) * viewScale;
        const cy = (stampPad + sh/2) * viewScale;
        g = sc.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(sw, sh)/2 * viewScale);
      } else {
        g = sc.createLinearGradient(0, 0, dir === 'y' ? 0 : pw, dir === 'x' ? 0 : ph);
      }
      g.addColorStop(0, paint('squareColour', 'squareAlpha'));
      g.addColorStop(1, rgba(CONFIG.squareColour2, CONFIG.squareAlpha));
      sc.fillStyle = g;
    } else {
      sc.fillStyle = paint('squareColour', 'squareAlpha');
    }
    sc.fillRect(0, 0, pw, ph);
    sc.restore();

    if (CONFIG.showWindow && CONFIG.showBorder && CONFIG.borderAlpha > 0
        && CONFIG.windowSoftness === 0 && CONFIG.windowRounding === 0){
      sc.save();
      sc.setTransform(viewScale, 0, 0, viewScale, 0, 0);
      sc.lineWidth = 2.5;
      sc.strokeStyle = paint('borderColour', 'borderAlpha');
      drawWindowShape(sc);
      sc.stroke();
      sc.restore();
    }

    if (cutCanvas){
      sc.save();
      sc.globalCompositeOperation = 'destination-out';
      sc.filter = CONFIG.cutoutSoftness > 0 ? 'blur(' + (CONFIG.cutoutSoftness * viewScale) + 'px)' : 'none';
      sc.drawImage(cutCanvas, 0, 0);
      sc.restore();
    }

    rebuildShapeField();
  }

  function withFont(then){
    const stack = FONTS[CONFIG.cutoutFont] || FONTS.plex;
    if (!document.fonts || !document.fonts.load){ then(); return; }
    document.fonts.load(CONFIG.cutoutWeight + ' 100px ' + stack).then(then).catch(then);
  }

  // ---- canvas sizing --------------------------------------------------------
  function applyScale(scale){
    viewScale = scale;
    canvas.width = Math.round(LW * scale);
    canvas.height = Math.round(LH * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    rebuildStamp();
  }
  function rebuildCanvas(){
    const k = REF / Math.min(CONFIG.canvasW, CONFIG.canvasH);
    LW = CONFIG.canvasW * k;
    LH = CONFIG.canvasH * k;
    rebuildGeometry();
    rebuildGrid();
    applyScale(dpr);
  }
  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    applyScale(dpr);
  }
  window.addEventListener('resize', resize);

  // ---- frame ----------------------------------------------------------------
  let visible = !document.hidden;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function drawScene(t){
    ctx.clearRect(0, 0, LW, LH);
    const o = windowOrigin();
    if (CONFIG.showMesh) drawGrid(reduceMotion ? 0 : t, o);
    if (CONFIG.showWindow || CONFIG.showCutout){
      ctx.drawImage(stamp, o.x - stampPad, o.y - stampPad, sw + stampPad*2, sh + stampPad*2);
    }
  }
  function frame(t){
    if (visible) drawScene(t);
    requestAnimationFrame(frame);
  }

  seedField();
  rebuildCanvas();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => withFont(rebuildStamp));
  requestAnimationFrame(frame);
})();
