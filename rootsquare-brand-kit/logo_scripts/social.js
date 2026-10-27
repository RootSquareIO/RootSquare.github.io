// 04_social (LinkedIn avatar + banner, Open Graph) and 05_motion (5 s loop).
const { execFileSync } = require('child_process');
const L = require('./lib');
const { fs, path, KIT, C, f2 } = L;
const S = require('./scene');
const D = require('./docs');
const { makeMesh, loadConfig } = require('./mesh');
const { Batch } = require('./ink');

const TMP = path.join(__dirname, '.tmp', 'social');
const svgDoc = (vb, body, defs = '') => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>
`;
const gradDefs = (id, g) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f2(g.cx)}" cy="${f2(g.cy)}" r="${f2(g.r)}">${g.stops.map((s) => `<stop offset="${s.o}" stop-color="${s.hex}"${s.a < 1 ? ` stop-opacity="${s.a}"` : ''}/>`).join('')}</radialGradient>`;

function social(b) {
  const out = path.join(KIT, '04_social');
  fs.mkdirSync(out, { recursive: true });

  // LinkedIn avatar: the mark full-bleed on white (the radical cut-out shows the white ground).
  const avatar = path.join(TMP, 'avatar.svg');
  fs.writeFileSync(avatar, S.toSVG(S.build('mark', 'colour'), { background: C.white }));
  b.png(avatar, path.join(out, 'rootsquare_linkedin-avatar_colour_rgb_400.png'), 400, C.white);

  // LinkedIn banner: the mesh band from rootsquare-gradient-mesh-banner-2256x382, regenerated at 1584x396.
  const cfg = { ...loadConfig('rootsquare-gradient-mesh-banner-2256x382'), canvasW: 1584, canvasH: 396 };
  const m = makeMesh(cfg, { noWindow: true });
  const banner = path.join(TMP, 'banner.svg');
  fs.writeFileSync(banner, svgDoc([0, 0, f2(m.LW), f2(m.LH)],
    `<rect width="${f2(m.LW)}" height="${f2(m.LH)}" fill="${C.white}"/><g fill="url(#mg)">${m.paths(cfg.stillPhase).map((d) => `<path d="${d}"/>`).join('')}</g>`,
    gradDefs('mg', m.gradient(L.brandHex))));
  if (/#f55d23|#f53d27/i.test(fs.readFileSync(banner, 'utf8'))) throw new Error('banner uses the logo tool colours, not the palette');
  b.png(banner, path.join(out, 'rootsquare_linkedin-banner_colour_rgb_1584x396.png'), 1584, C.white);

  // Open Graph: horizontal lockup centred on white.
  const og = path.join(TMP, 'og.svg');
  const lock = D.embed(S.toSVG(S.build('lockup-horizontal', 'colour')), 0, 0, 760);
  const e = D.embed(S.toSVG(S.build('lockup-horizontal', 'colour')), (1200 - 760) / 2, (630 - lock.h) / 2, 760);
  fs.writeFileSync(og, svgDoc([0, 0, 1200, 630], `<rect width="1200" height="630" fill="${C.white}"/>${e.svg}`));
  b.png(og, path.join(out, 'rootsquare_og-image_colour_rgb_1200x630.png'), 1200, C.white);
  return { avatar, banner, og };
}

// Motion: the primary composition with the mesh drifting, 5 s, 30 fps, seamless.
const LOOP_MS = 5000, FPS = 30, PX = 1080;
function motionFrames(b) {
  const m = makeMesh(loadConfig('rootsquare-radical-window-gradient-mesh-square-1024x1024'), { loopMs: LOOP_MS });
  const dir = path.join(TMP, 'frames');
  fs.mkdirSync(dir, { recursive: true });
  const vb = [72, 72, 496, 496]; // margin box (80..560) plus room for line weight
  const win = S.build('primary', 'colour').items[1];
  const N = (LOOP_MS / 1000) * FPS;
  const winSvg = `<g transform="translate(150 150)"><path fill="url(#wg)" fill-rule="evenodd" d="${win.ds[0]}"/></g>`;
  const defs = gradDefs('mg', m.gradient(L.brandHex)) +
    `<linearGradient id="wg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="340" y2="340"><stop offset="0" stop-color="${C.orange}"/><stop offset="1" stop-color="${C.red}"/></linearGradient>`;
  const frames = [];
  for (let i = 0; i < N; i++) {
    const t = (i * LOOP_MS) / N;
    const f = path.join(dir, `f_${String(i).padStart(3, '0')}.svg`);
    fs.writeFileSync(f, svgDoc(vb, `<g fill="url(#mg)">${m.paths(t).map((d) => `<path d="${d}"/>`).join('')}</g>${winSvg}`, defs));
    b.png(f, f.replace('.svg', '.png'), PX);
    frames.push(f);
  }
  // seamless check: the frame after the last one is frame 0
  if (m.paths(LOOP_MS).join() !== m.paths(0).join()) throw new Error('loop does not close');
  if (/#f55d23|#f53d27/i.test(fs.readFileSync(frames[0], 'utf8'))) throw new Error('motion frames use the logo tool colours, not the palette');
  return { dir, frames };
}

// Video stores colour as YUV. Untagged HD video is decoded by browsers with the BT.709 matrix,
// but ffmpeg converts with BT.601 unless told otherwise, which shifted the oranges by about
// dE 3. So: convert with BT.709 explicitly, and tag the files (sRGB transfer, as the frames are sRGB).
const TO_709 = 'scale=out_color_matrix=bt709:out_range=tv';
const TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv'];

function encode(dir) {
  const out = path.join(KIT, '05_motion');
  fs.mkdirSync(out, { recursive: true });
  const base = path.join(out, `rootsquare_primary-loop_colour_rgb_${PX}`);
  const inp = ['-framerate', String(FPS), '-i', path.join(dir, 'f_%03d.png')];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inp, '-f', 'lavfi', '-i', `color=c=white:s=${PX}x${PX}:r=${FPS}`,
    // composite onto white in RGB, so the only RGB->YUV conversion is the BT.709 one
    '-filter_complex', `[1]format=gbrp[bg];[0]format=gbrap[fg];[bg][fg]overlay=shortest=1:format=gbrp,${TO_709},format=yuv420p`, '-c:v', 'libx264', '-profile:v', 'high', '-crf', '16', '-preset', 'slow',
    ...TAGS, '-movflags', '+faststart', '-r', String(FPS), base + '.mp4']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inp, '-vf', `${TO_709},format=yuva420p`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
    '-b:v', '0', '-crf', '24', '-row-mt', '1', '-auto-alt-ref', '0', ...TAGS, '-r', String(FPS), base + '.webm']);
  return base;
}

// Decode frame 1 the way a browser does (BT.709) and compare flat areas of the window with the
// source frame. Compression alone stays well under dE 1.5; a matrix mismatch is about dE 3.
function verifyColour(dir, base) {
  const K = require('./colour');
  const raw = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', ...args, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const src = raw(['-i', path.join(dir, 'f_000.png'), '-vf', 'format=rgb24']);
  const pts = [[250, 250], [880, 250], [250, 850], [850, 850]]; // window corners, clear of the radical and mesh
  const px = (b, [x, y]) => [0, 1, 2].map((i) => b[(y * PX + x) * 3 + i]);
  let worst = 0;
  for (const [ext, pre] of [['mp4', []], ['webm', ['-c:v', 'libvpx-vp9']]]) {
    const dec = raw([...pre, '-i', `${base}.${ext}`, '-vf', 'scale=in_color_matrix=bt709:in_range=tv,format=rgb24']);
    for (const p of pts) worst = Math.max(worst, K.dE2000(K.rgbToLab(px(src, p)), K.rgbToLab(px(dec, p))));
  }
  if (worst > 1.5) throw new Error(`video colour drifts from the frames by dE ${worst.toFixed(2)}`);
  console.log(`motion colour check: worst dE ${worst.toFixed(2)} against the source frames (decoded as BT.709)`);
}

if (require.main === module) {
  fs.mkdirSync(TMP, { recursive: true });
  const b = new Batch();
  social(b);
  const { dir } = motionFrames(b);
  b.run('social + motion frames', 60);
  // social images are opaque: store them as plain RGB, not RGBA
  for (const f of fs.readdirSync(path.join(KIT, '04_social'))) {
    const p = path.join(KIT, '04_social', f), t = path.join(TMP, 'rgb_' + f);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', p, '-pix_fmt', 'rgb24', t]);
    fs.copyFileSync(t, p);
  }
  const base = encode(dir);
  for (const ext of ['mp4', 'webm']) console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,pix_fmt,color_space,color_primaries,color_transfer,color_range,r_frame_rate:stream_tags=alpha_mode:format=duration', '-of', 'compact', `${base}.${ext}`]).toString().trim());
  verifyColour(dir, base);
}
module.exports = { social, motionFrames, encode, TMP };
