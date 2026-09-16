(function(){
  const canvas = document.getElementById('meshCanvas');
  const frameEl = document.getElementById('meshFrame');
  if (!canvas || !frameEl) return;
  const ctx = canvas.getContext('2d');
  const reseedBtn = document.getElementById('meshReseed');
  const toggleBtn = document.getElementById('meshToggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // just the moving mesh — no window/cutout/sweep. Lines run their full
  // length (like a normal grid) but only ever draw the portion of
  // themselves that falls inside the border band — so the interior, where
  // the page text lives, never gets touched, and both directions cross
  // properly everywhere along the band instead of only at the corners.
  const REF = 1024;             // reference width the size-scaled values below assume
  // field, grid and colour values below are ported from radicalwindow.html's
  // CONFIG — only the parameters that still mean something without that
  // tool's window/cutout/sweep (which this frame doesn't have) are kept
  const CONFIG = {
    bandWidth: 60,               // border band thickness, in REF-scale px
    waveCount: 6, wavelength: 430, amplitude: 320, driftPeriod: 5200, falloff: 1.6,
    spacing: 11, lineWeight: 1.5,
    lineAlpha: 0.55,
    lineColour: '#f53d27',
    gradientColour: '#f55d23', gradientColour3: '#f55d23',
    gradientEnd: 0.25, gradientMix: 0.62
  };

  function hexToRgba(hex, alpha){
    const h = hex.length === 4 ? '#' + hex.slice(1).split('').map(c => c+c).join('') : hex;
    const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  let dpr = 1, LW = 0, LH = 0, scale = 1, bandPx = 0, amp = 0;
  let spacingPx = 0, over = 20, sampleStep = 14;
  const vLines = [], hLines = [];
  let waveSeeds = [], waves = [], phaseBase, phaseInc;
  let lineGradient = null;
  let paused = reduceMotion;
  let initialized = false;
  let visible = !document.hidden;

  function rebuildGeometry(){
    scale = LW / REF;
    bandPx = CONFIG.bandWidth * scale;
    // wave displacement is capped to a fraction of the band itself, so the
    // mesh can never swing out into the page's text no matter what
    // amplitude is configured
    amp = Math.min(CONFIG.amplitude * scale, bandPx * 0.85);
    document.documentElement.style.setProperty('--frame-band', bandPx.toFixed(1) + 'px');
  }

  // a full grid's worth of lines (every spacing across the whole width /
  // whole height) — which one is drawn inside the band is decided per-point
  // in strokeSet, not by restricting where lines are generated
  function rebuildGrid(){
    spacingPx = CONFIG.spacing * scale;
    over = Math.max(spacingPx * 2, 20);
    vLines.length = 0; hLines.length = 0;
    for (let x = -over; x <= LW+over; x += spacingPx) vLines.push(x);
    for (let y = -over; y <= LH+over; y += spacingPx) hLines.push(y);
  }

  // 3-stop radial gradient, same formula as baseStroke() in radicalwindow.html:
  // near stop is the flat line colour at full strength, the two far stops are
  // gradientColour/gradientColour3 held at gradientEnd's share of it — overall
  // strength still comes from lineAlpha via ctx.globalAlpha in strokeSet
  function rebuildGradient(){
    const cx = LW/2, cy = LH/2;
    const outer = Math.max(1, Math.max(LW, LH) * 0.75);
    lineGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
    const p0 = Math.min(Math.max(CONFIG.gradientMix - 0.4, 0), 1);
    let p1 = Math.min(Math.max(CONFIG.gradientMix + 0.4, 0), 1);
    if (p1 <= p0) p1 = Math.min(1, p0 + 0.01);
    const cols = [
      hexToRgba(CONFIG.lineColour, 1),
      hexToRgba(CONFIG.gradientColour, CONFIG.gradientEnd),
      hexToRgba(CONFIG.gradientColour3, CONFIG.gradientEnd)
    ];
    cols.forEach((col, i) => {
      lineGradient.addColorStop(p0 + (p1 - p0) * (i / (cols.length - 1)), col);
    });
  }

  function rescaleField(){
    waves = waveSeeds.map(s => {
      const k = (2*Math.PI*s.n) / (CONFIG.wavelength*scale);
      const drift = (2*Math.PI*s.n) / CONFIG.driftPeriod * s.driftJitter;
      const a = 1 / Math.pow(s.n, CONFIG.falloff);
      return {
        k, cx: Math.cos(s.theta), cy: Math.sin(s.theta),
        omega: s.sign*drift, phi: s.phi,
        gx: a*k*Math.cos(s.theta), gy: a*k*Math.sin(s.theta)
      };
    });
    phaseBase = new Float64Array(waves.length);
    phaseInc = new Float64Array(waves.length);
  }

  function seedField(){
    waveSeeds = [];
    for (let i = 0; i < CONFIG.waveCount; i++){
      waveSeeds.push({
        n: 1 + i*0.66 + Math.random()*0.35,
        theta: Math.random()*Math.PI*2,
        phi: Math.random()*Math.PI*2,
        sign: Math.random() < 0.5 ? -1 : 1,
        driftJitter: 0.75 + Math.random()*0.5
      });
    }
    rescaleField();
  }

  function pageHeight(){
    return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
  }

  function applyCanvasSize(){
    LW = document.documentElement.clientWidth;
    LH = pageHeight();
    if (LW <= 0 || LH <= 0) return;
    frameEl.style.height = LH + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(LW*dpr);
    canvas.height = Math.round(LH*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildGeometry();
    if (!initialized){ seedField(); initialized = true; } else { rescaleField(); }
    rebuildGrid();
    rebuildGradient();
  }

  let resizeQueued = false;
  function queueResize(){
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; applyCanvasSize(); });
  }
  new ResizeObserver(queueResize).observe(document.body);
  window.addEventListener('resize', queueResize);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  // true once (x,y) is within the band along the left, right, or bottom
  // page edge — no top band, since the sticky header always covers that
  // area anyway. Tested on the DISPLACED point so a wave can never carry a
  // line out past the band.
  function inBand(x, y){
    return x < bandPx || x > LW-bandPx || y > LH-bandPx;
  }

  function strokeSet(lines, vertical, t){
    const lo = -over, hi = (vertical ? LH : LW) + over, step = sampleStep;
    const n = waves.length;
    ctx.beginPath();
    for (let i = 0; i < lines.length; i++){
      const fixed = lines[i];
      for (let m = 0; m < n; m++){
        const w = waves[m];
        phaseBase[m] = (vertical ? w.k*w.cx*fixed : w.k*w.cy*fixed) + w.omega*t + w.phi;
        phaseInc[m] = vertical ? w.k*w.cy : w.k*w.cx;
      }
      let drawing = false;
      for (let u = lo; u <= hi; u += step){
        let gx = 0, gy = 0;
        for (let m = 0; m < n; m++){
          const c = Math.cos(phaseBase[m] + phaseInc[m]*u);
          gx += waves[m].gx*c; gy += waves[m].gy*c;
        }
        const x = vertical ? fixed : u, y = vertical ? u : fixed;
        const px = x + amp*gx, py = y + amp*gy;
        if (inBand(px, py)){
          if (!drawing){ ctx.moveTo(px, py); drawing = true; } else ctx.lineTo(px, py);
        } else {
          drawing = false;
        }
      }
    }
    ctx.lineWidth = CONFIG.lineWeight*scale;
    ctx.globalAlpha = CONFIG.lineAlpha;
    ctx.stroke();
  }

  function drawScene(t){
    ctx.clearRect(0, 0, LW, LH);
    ctx.strokeStyle = lineGradient;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    strokeSet(vLines, true, t);
    strokeSet(hLines, false, t);
    ctx.globalAlpha = 1;
  }

  function frame(t){
    if (!paused && visible) drawScene(reduceMotion ? 0 : t);
    requestAnimationFrame(frame);
  }

  reseedBtn && reseedBtn.addEventListener('click', seedField);
  toggleBtn && toggleBtn.addEventListener('click', () => {
    paused = !paused;
    toggleBtn.textContent = paused ? 'Resume' : 'Pause';
    toggleBtn.setAttribute('aria-pressed', String(paused));
  });
  if (toggleBtn && reduceMotion){
    toggleBtn.textContent = 'Resume';
    toggleBtn.setAttribute('aria-pressed', 'true');
  }

  applyCanvasSize();
  requestAnimationFrame(frame);
})();
