// Ember Circuitry — "the tool, possessed"
// Renders layered artwork at 2x (2160x2700). Post-processing happens in post.py.
(async function () {
  const Q = new URLSearchParams(location.search);
  const S = parseFloat(Q.get('S') || '2'), W = 1080, H = 1350;
  const LAYER = Q.get('layer') || 'art';
  const NOTEXT = LAYER === 'screen' || Q.get('notext') === '1';
  let EYE_TEX = false;

  const fonts = [
    ['JBM', 'fonts/JetBrainsMono-300.ttf', '300'],
    ['JBM', 'fonts/JetBrainsMono-500.ttf', '500'],
    ['Inst', 'fonts/InstrumentSans-Regular.ttf', '400'],
    ['Inst', 'fonts/InstrumentSans-Bold.ttf', '700'],
    ['Alex', 'fonts/Alexandria-300.ttf', '300'],
    ['Alex', 'fonts/Alexandria-500.ttf', '500'],
    ['Alex', 'fonts/Alexandria-800.ttf', '800'],
    ['Alex', 'fonts/Alexandria-900.ttf', '900'],
    ['Readex', 'fonts/ReadexPro-300.ttf', '300'],
    ['Readex', 'fonts/ReadexPro-700.ttf', '700'],
  ];
  for (const [fam, url, w] of fonts) {
    const f = new FontFace(fam, `url(${url})`, { weight: w });
    await f.load(); document.fonts.add(f);
  }

  const T0=performance.now(); const LOG=(m)=>console.log(m, Math.round(performance.now()-T0)+'ms');
  LOG('fonts');
  // ---------------------------------------------------------------- utils
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const perm = new Uint8Array(512);
  { const p = [...Array(256).keys()]; const r = rng(1337); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
  const G3 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  function snoise(xin, yin) {
    const s = (xin + yin) * F2; const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2; const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255; let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { t0 *= t0; const g = G3[perm[ii + perm[jj]] & 7]; n += t0 * t0 * (g[0] * x0 + g[1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { t1 *= t1; const g = G3[perm[ii + i1 + perm[jj + j1]] & 7]; n += t1 * t1 * (g[0] * x1 + g[1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { t2 *= t2; const g = G3[perm[ii + 1 + perm[jj + 1]] & 7]; n += t2 * t2 * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }
  function fbm(x, y, o) { let a = 0, amp = 0.5, f = 1; for (let k = 0; k < o; k++) { a += amp * snoise(x * f, y * f); f *= 2.03; amp *= 0.5; } return a; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  function mk() { const c = document.createElement('canvas'); c.width = W * S; c.height = H * S; const x = c.getContext('2d'); x.setTransform(S, 0, 0, S, 0, 0); return [c, x]; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function glow(ctx, color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur * ctx.getTransform().a; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  function noGlow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }

  // ---------------------------------------------------------------- geometry
  const WX = 110, WY = 470, WW = 860, WH = 760, WR = 16;
  const TB = 44, SB = 28, TL = 54;              // titlebar, statusbar, toolbar
  const VPR = 560, BPT = 520;                    // viewport right edge, bottom panel top (local)
  const EX = WX + 307, EY = WY + 282;            // the eye
  const L = (x, y) => [WX + x, WY + y];

  // ---------------------------------------------------------------- the front
  const smin = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
  const FA = LAYER === 'screen' ? [WX + 530, WY - 20] : [WX + 405, WY - 20], FB = LAYER === 'screen' ? [WX + 810, WY + WH + 20] : [WX + 745, WY + WH + 20];
  const FT = (() => { const dx = FB[0] - FA[0], dy = FB[1] - FA[1]; const l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
  const FN = [FT[1], -FT[0]];
  function fieldRaw(x, y) {
    const wx = x + 70 * fbm(x / 330 + 3.1, y / 330 + 7.7, 3);
    const wy = y + 70 * fbm(x / 330 - 5.3, y / 330 + 1.9, 3);
    let d = (wx - FA[0]) * FN[0] + (wy - FA[1]) * FN[1];
    const s_ = (wx - FA[0]) * FT[0] + (wy - FA[1]) * FT[1];
    const ph = s_ / 54 + 1.5 * fbm(x / 170 + 9, y / 170, 2);
    d -= 26 * Math.pow(Math.abs(Math.sin(ph)), 0.55);
    d += 13 * fbm(x / 90 + 11, y / 90 - 4, 3) + 2.2 * fbm(x / 22, y / 22, 2);
    const de = Math.hypot(x - EX, y - EY) - 248 + 8 * fbm(x / 60, y / 60, 2);
    return smin(d, de, 46);
  }
  const FW = W, FH = H; const FIELD = new Float32Array(FW * FH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) FIELD[y * FW + x] = fieldRaw(x + 0.5, y + 0.5);
  LOG('field');
  function field(x, y) { // bilinear, logical coords
    const fx = clamp(x - 0.5, 0, FW - 1.001), fy = clamp(y - 0.5, 0, FH - 1.001);
    const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
    const a = FIELD[iy * FW + ix], b = FIELD[iy * FW + ix + 1], c = FIELD[(iy + 1) * FW + ix], d = FIELD[(iy + 1) * FW + ix + 1];
    return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
  }
  function inWin(x, y, inset = 0) { return x > WX + inset && x < WX + WW - inset && y > WY + inset && y < WY + WH - inset; }
  function distToWin(x, y) { const dx = Math.max(WX - x, 0, x - (WX + WW)); const dy = Math.max(WY - y, 0, y - (WY + WH)); return Math.hypot(dx, dy); }

  // ================================================================ TEXT LAYER
  if (LAYER === 'text') {
    const [c, ctx] = mk();
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    const RX = 970;
    // series tag
    ctx.font = '300 17px Readex'; ctx.fillStyle = '#8E949B'; ctx.textAlign = 'right';
    ctx.fillText('الذكاء الاصطناعي في خدمة العلم', RX - 18, 101);
    ctx.fillStyle = '#FF7A1A'; ctx.beginPath(); ctx.arc(RX - 4, 95, 4, 0, Math.PI * 2); ctx.fill();
    // headline
    const HS = 102;
    ctx.font = `900 ${HS}px Alex`;
    ctx.fillStyle = '#F4EEE8';
    ctx.fillText('لمّا الـ AI', RX, 222);
    const w1 = ctx.measureText('يتلبّس').width;
    ctx.save(); ctx.fillStyle = '#FF7A1A'; glow(ctx, 'rgba(255,110,20,.55)', 22); ctx.fillText('يتلبّس', RX, 334); ctx.restore();
    ctx.fillStyle = '#F4EEE8';
    ctx.fillText('الأداة', RX - w1 - 28, 334);
    // sub line
    ctx.font = '300 25px Readex'; ctx.fillStyle = '#A7ADB3';
    ctx.fillText('مبقاش بيتكلّم عن العلم… بقى بيعمله بإيده.', RX, 393);
    // english term
    ctx.direction = 'ltr'; ctx.textAlign = 'right';
    ctx.font = '500 12.5px JBM'; ctx.letterSpacing = '3.2px'; ctx.fillStyle = 'rgba(255,138,52,.92)';
    ctx.fillText('TOOL-AUGMENTED SCIENTIFIC AGENTS', RX + 3, 433);
    ctx.letterSpacing = '0px';
    const tw = (() => { ctx.letterSpacing = '3.2px'; const m = ctx.measureText('TOOL-AUGMENTED SCIENTIFIC AGENTS').width; ctx.letterSpacing = '0px'; return m; })();
    ctx.strokeStyle = 'rgba(255,122,26,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(RX - tw - 18, 428.5); ctx.lineTo(RX - tw - 88, 428.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(RX - tw - 92, 428.5, 3, 0, Math.PI * 2); ctx.stroke();
    window.__out = c.toDataURL('image/png'); window.__done = true; return;
  }

  // ================================================================ THEMES
  const DEAD = { alive: false, bg: '#0A0B0D', win: '#111316', title: '#16191C', tool: '#131518', vp: '#0E1013', panel: '#121417', bottom: '#101215', status: '#15181B', div: '#22262B', border: '#2A2F35',
    text: '#5A626B', dim: '#383E45', bright: '#858D96', chart: '#353B43', chart2: '#454C55', acc: '#6B737C', hot: '#8C949D', grid: 'rgba(170,180,195,0.035)', kw: '#6E767F', fn: '#7D858E', cm: '#3F454C' };
  const LIVE = { alive: true, bg: '#0B0706', win: '#0A0605', title: '#110905', tool: '#0C0705', vp: '#070403', panel: '#0B0605', bottom: '#090504', status: '#140A05', div: 'rgba(255,112,24,0.20)', border: 'rgba(255,122,26,0.75)',
    text: '#E4803E', dim: '#7E3F19', bright: '#FFE3C4', chart: '#FF7A1A', chart2: '#FFAA5C', acc: '#FF7A1A', hot: '#FFE9D0', grid: 'rgba(255,120,30,0.05)', kw: '#FFB064', fn: '#FFE3C4', cm: '#94501F' };

  // ================================================================ BACKGROUND + SURFACES
  function drawBG(ctx, T) {
    ctx.fillStyle = DEAD.bg; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.72, 240, 0, W * 0.72, 240, 900);
    g.addColorStop(0, 'rgba(150,165,190,0.05)'); g.addColorStop(1, 'rgba(150,165,190,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sp = 18;
    ctx.fillStyle = 'rgba(165,175,190,0.085)';
    for (let y = 9; y < H; y += sp) for (let x = 9; x < W; x += sp) { ctx.beginPath(); ctx.arc(x, y, (x / sp + y / sp) % 5 === 0 ? 1.15 : 0.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(165,175,190,0.10)'; ctx.lineWidth = 0.8;
    for (let y = 9 + sp * 2; y < H; y += sp * 5) for (let x = 9 + sp * 2; x < W; x += sp * 5) { ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); }
    if (T.alive) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      g = ctx.createRadialGradient(WX + 60, WY + WH - 20, 0, WX + 60, WY + WH - 20, 720);
      g.addColorStop(0, 'rgba(255,96,16,0.16)'); g.addColorStop(0.45, 'rgba(255,80,10,0.05)'); g.addColorStop(1, 'rgba(255,80,10,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let y = 9; y < H; y += sp) for (let x = 9; x < W; x += sp) {
        const d = Math.hypot(x - (WX + 40), y - (WY + WH - 40));
        const a = 0.05 + 0.55 * Math.exp(-d / 260);
        ctx.fillStyle = `rgba(255,${Math.round(100 + 40 * Math.exp(-d / 200))},30,${a})`;
        ctx.beginPath(); ctx.arc(x, y, (x / sp + y / sp) % 5 === 0 ? 1.15 : 0.8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.save();
    rr(ctx, WX, WY, WW, WH, WR);
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 70 * S; ctx.shadowOffsetY = 34 * S; ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
    if (T.alive) { ctx.save(); rr(ctx, WX, WY, WW, WH, WR); glow(ctx, 'rgba(255,92,12,0.55)', 90); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore(); }
  }

  function drawSurface(ctx, T) {
    ctx.save();
    rr(ctx, WX, WY, WW, WH, WR); ctx.clip();
    ctx.fillStyle = T.win; ctx.fillRect(WX, WY, WW, WH);
    // regions
    const [x0, y0] = L(0, 0);
    ctx.fillStyle = T.title; ctx.fillRect(x0, y0, WW, TB);
    ctx.fillStyle = T.tool; ctx.fillRect(x0, y0 + TB, TL, WH - TB - SB);
    ctx.fillStyle = T.vp; ctx.fillRect(x0 + TL, y0 + TB, VPR - TL, BPT - TB);
    ctx.fillStyle = T.panel; ctx.fillRect(x0 + VPR, y0 + TB, WW - VPR, BPT - TB);
    ctx.fillStyle = T.bottom; ctx.fillRect(x0 + TL, y0 + BPT, WW - TL, WH - BPT - SB);
    ctx.fillStyle = T.status; ctx.fillRect(x0, y0 + WH - SB, WW, SB);
    // viewport grid
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + TL, y0 + TB, VPR - TL, BPT - TB); ctx.clip();
    ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
    for (let gx = EX % 24; gx < W; gx += 24) { ctx.beginPath(); ctx.moveTo(gx + 0.5, y0 + TB); ctx.lineTo(gx + 0.5, y0 + BPT); ctx.stroke(); }
    for (let gy = EY % 24; gy < H; gy += 24) { ctx.beginPath(); ctx.moveTo(x0 + TL, gy + 0.5); ctx.lineTo(x0 + VPR, gy + 0.5); ctx.stroke(); }
    if (T.alive) { // reactor light under the eye
      const g = ctx.createRadialGradient(EX, EY, 0, EX, EY, 300);
      g.addColorStop(0, 'rgba(255,100,20,0.20)'); g.addColorStop(0.6, 'rgba(255,90,10,0.05)'); g.addColorStop(1, 'rgba(255,90,10,0)');
      ctx.fillStyle = g; ctx.fillRect(x0 + TL, y0 + TB, VPR - TL, BPT - TB);
    }
    ctx.restore();
    // code block + chat bubble backgrounds
    ctx.fillStyle = T.alive ? 'rgba(255,110,20,0.05)' : 'rgba(255,255,255,0.022)';
    rr(ctx, x0 + 576, y0 + 246, 272, 160, 8); ctx.fill();
    ctx.fillStyle = T.alive ? 'rgba(255,110,20,0.06)' : 'rgba(255,255,255,0.03)';
    rr(ctx, x0 + 600, y0 + 92, 248, 104, [12, 12, 12, 3]); ctx.fill();
    // dividers
    ctx.strokeStyle = T.div; ctx.lineWidth = 1;
    const hl = (ax, ay, bx, by) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
    hl(x0, y0 + TB + 0.5, x0 + WW, y0 + TB + 0.5);
    hl(x0 + TL + 0.5, y0 + TB, x0 + TL + 0.5, y0 + WH - SB);
    hl(x0 + VPR + 0.5, y0 + TB, x0 + VPR + 0.5, y0 + BPT);
    hl(x0 + TL, y0 + BPT + 0.5, x0 + WW, y0 + BPT + 0.5);
    hl(x0, y0 + WH - SB + 0.5, x0 + WW, y0 + WH - SB + 0.5);
    hl(x0 + VPR, y0 + 78.5, x0 + WW, y0 + 78.5);
    hl(x0 + 576, y0 + 214.5, x0 + 848, y0 + 214.5);
    hl(x0 + TL, y0 + 556.5, x0 + WW, y0 + 556.5);
    if (T.alive) {
      // liquid gloss: broad soft sheen + edge specular
      let g = ctx.createLinearGradient(WX, WY, WX + 520, WY + 560);
      g.addColorStop(0, 'rgba(255,236,214,0.075)'); g.addColorStop(0.35, 'rgba(255,236,214,0.018)'); g.addColorStop(1, 'rgba(255,236,214,0)');
      ctx.fillStyle = g; ctx.fillRect(WX, WY, WW, WH);
      g = ctx.createLinearGradient(0, WY, 0, WY + 10);
      g.addColorStop(0, 'rgba(255,220,190,0.16)'); g.addColorStop(1, 'rgba(255,220,190,0)');
      ctx.fillStyle = g; ctx.fillRect(WX, WY, WW, 10);
    } else {
      const g = ctx.createLinearGradient(0, WY, 0, WY + 8);
      g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(WX, WY, WW, 8);
    }
    ctx.restore();
    // border
    ctx.save(); rr(ctx, WX + 0.5, WY + 0.5, WW - 1, WH - 1, WR); ctx.strokeStyle = T.border; ctx.lineWidth = 1;
    if (T.alive) glow(ctx, 'rgba(255,110,20,0.8)', 10);
    ctx.stroke(); ctx.restore();
  }

  // ================================================================ CONTENT
  function greek(ctx, s, x, y, w, fs, color, align) {
    // text replaced by an abstract bar of the same measure
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const h = Math.max(1.6, fs * 0.40);
    ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= 0.85;
    ctx.beginPath(); ctx.roundRect(x0, y - fs * 0.36 - h / 2, w, h, h / 2); ctx.fill(); ctx.restore();
  }
  function txt(ctx, s, x, y, font, color, align = 'left', ls = 0) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.letterSpacing = ls + 'px';
    if (NOTEXT) { const fs = parseFloat(font.split(' ')[1]); const w = ctx.measureText(s).width; ctx.letterSpacing = '0px'; if (s.trim().length > 0) greek(ctx, s, x, y, w, fs, color, align); return; }
    ctx.fillText(s, x, y); ctx.letterSpacing = '0px';
  }

  // radial data (shared by both states)
  const BARS = 216; const barV = [];
  for (let i = 0; i < BARS; i++) { const a = i / BARS * Math.PI * 2; const v = 0.5 + 0.5 * fbm(Math.cos(a) * 1.6 + 4, Math.sin(a) * 1.6 + 9, 4) * 1.6; barV.push(clamp(v + (i % 7 === 0 ? 0.18 : 0), 0.08, 1)); }
  const SEGS = [0, 38, 71, 112, 140, 178, 214, 251, 288, 322, 360];

  function drawChart(ctx, T) {
    const cx = EX, cy = EY;
    ctx.save();
    // crosshair
    if (!EYE_TEX) {
    ctx.setLineDash([2, 4]); ctx.strokeStyle = T.alive ? 'rgba(255,120,30,0.22)' : 'rgba(170,180,195,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(WX + TL + 10, cy + 0.5); ctx.lineTo(WX + VPR - 10, cy + 0.5); ctx.moveTo(cx + 0.5, WY + TB + 10); ctx.lineTo(cx + 0.5, WY + BPT - 10); ctx.stroke();
    ctx.setLineDash([]);
    }
    // clear disc
    ctx.fillStyle = T.vp; ctx.beginPath(); ctx.arc(cx, cy, 216, 0, Math.PI * 2); ctx.fill();
    // outer bars
    for (let i = 0; i < BARS; i++) {
      const a = i / BARS * Math.PI * 2 - Math.PI / 2, v = barV[i];
      const r0 = 171, r1 = 171 + 5 + v * 35;
      const ca = Math.cos(a), sa = Math.sin(a);
      if (T.alive) {
        const g = ctx.createLinearGradient(cx + ca * r0, cy + sa * r0, cx + ca * r1, cy + sa * r1);
        g.addColorStop(0, 'rgba(150,50,8,0.9)'); g.addColorStop(0.55, '#FF6E14'); g.addColorStop(1, v > 0.78 ? '#FFE2BF' : '#FFA24E');
        ctx.strokeStyle = g;
      } else ctx.strokeStyle = v > 0.78 ? T.chart2 : T.chart;
      ctx.lineWidth = 1.9; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(cx + ca * r0, cy + sa * r0); ctx.lineTo(cx + ca * r1, cy + sa * r1); ctx.stroke();
    }
    // tick ring
    ctx.strokeStyle = T.alive ? 'rgba(255,150,80,0.55)' : T.dim; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, 163, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 180; k++) {
      const a = k / 180 * Math.PI * 2; const len = k % 15 === 0 ? 7 : k % 5 === 0 ? 4 : 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 163, cy + Math.sin(a) * 163); ctx.lineTo(cx + Math.cos(a) * (163 - len), cy + Math.sin(a) * (163 - len)); ctx.stroke();
    }
    // ideogram segments
    for (let s = 0; s < SEGS.length - 1; s++) {
      const a0 = (SEGS[s] + 1.6) / 180 * Math.PI - Math.PI / 2, a1 = (SEGS[s + 1] - 1.6) / 180 * Math.PI - Math.PI / 2;
      ctx.beginPath(); ctx.arc(cx, cy, 151, a0, a1); ctx.arc(cx, cy, 139, a1, a0, true); ctx.closePath();
      if (T.alive) { ctx.fillStyle = ['#FF7A1A', '#3A1507', '#C2440C', '#FFA24E', '#5A1F08', '#FF5E0E', '#2A0F05', '#E8661A', '#FFB570', '#4A1A07'][s]; ctx.fill(); }
      else { ctx.fillStyle = s % 2 ? '#1A1D21' : '#23272C'; ctx.fill(); }
      ctx.strokeStyle = T.alive ? 'rgba(255,170,100,0.35)' : 'rgba(170,180,195,0.10)'; ctx.lineWidth = 0.6; ctx.stroke();
    }
    if (!T.alive) {
      // circos ribbons
      const rr_ = rng(42);
      ctx.lineWidth = 1;
      for (let k = 0; k < 22; k++) {
        const a = rr_() * Math.PI * 2, b = a + Math.PI * (0.4 + rr_() * 1.2);
        ctx.strokeStyle = `rgba(150,160,175,${0.06 + rr_() * 0.12})`;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 134, cy + Math.sin(a) * 134);
        ctx.quadraticCurveTo(cx, cy, cx + Math.cos(b) * 134, cy + Math.sin(b) * 134); ctx.stroke();
      }
      txt(ctx, 'NO SIGNAL', cx, cy + 4, '500 9px JBM', T.text, 'center', 2.5);
      ctx.restore(); return;
    }
    // ---- THE EYE (alive only)
    ctx.strokeStyle = 'rgba(255,130,50,0.30)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, 222, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,130,50,0.14)'; ctx.setLineDash([1, 3]);
    ctx.beginPath(); ctx.arc(cx, cy, 216, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const ir = rng(99);
    // iris fibrils
    for (let k = 0; k < 540; k++) {
      const a = ir() * Math.PI * 2; const r0 = 94 + ir() * 6, r1 = r0 + 8 + ir() * 28;
      ctx.strokeStyle = `rgba(255,${120 + Math.floor(ir() * 80)},40,${0.05 + ir() * 0.22})`; ctx.lineWidth = 0.6 + ir() * 0.6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,140,60,0.30)'; ctx.lineWidth = 0.7;
    for (const r of [101, 117, 131]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    // gaze offset for the inner assembly: looking up-right, toward the headline
    const gx = cx + 7, gy = cy - 6;
    // hero ring
    ctx.save();
    glow(ctx, 'rgba(255,100,15,0.95)', 34);
    let g = ctx.createRadialGradient(gx, gy, 70, gx, gy, 94);
    g.addColorStop(0, '#FFB060'); g.addColorStop(0.28, '#FF7A1A'); g.addColorStop(0.75, '#E4520C'); g.addColorStop(1, '#FF8A2A');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 93, 0, Math.PI * 2); ctx.arc(gx, gy, 71, 0, Math.PI * 2, true); ctx.fill();
    ctx.restore();
    // inner dark
    g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 71);
    g.addColorStop(0, '#030101'); g.addColorStop(0.8, '#0C0503'); g.addColorStop(1, '#2A0E04');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 71, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 220; k++) {
      const a = ir() * Math.PI * 2; const r0 = 46 + ir() * 4, r1 = r0 + 6 + ir() * 16;
      ctx.strokeStyle = `rgba(255,130,50,${0.04 + ir() * 0.12})`; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0); ctx.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1); ctx.stroke();
    }
    // inner bright ring
    ctx.save(); glow(ctx, 'rgba(255,170,90,1)', 18);
    ctx.strokeStyle = '#FFD7A8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(gx, gy, 39, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#FFF3E4'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(gx, gy, 39, 0, Math.PI * 2); ctx.stroke();
    // pupil
    g = ctx.createRadialGradient(gx - 6, gy - 6, 2, gx, gy, 34);
    g.addColorStop(0, '#1A0A04'); g.addColorStop(1, '#020100');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 34, 0, Math.PI * 2); ctx.fill();
    // catchlights
    if (!EYE_TEX) {
    ctx.save(); glow(ctx, 'rgba(255,240,220,0.9)', 8);
    ctx.fillStyle = '#FFF6EA'; ctx.beginPath(); ctx.ellipse(gx - 12, gy - 13, 7.5, 5, -0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,234,0.8)'; ctx.beginPath(); ctx.arc(gx + 11, gy + 10, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // specular crescent on hero ring
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,240,220,0.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(gx, gy, 88, Math.PI * 1.08, Math.PI * 1.36); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,220,0.25)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(gx, gy, 88, Math.PI * 1.40, Math.PI * 1.46); ctx.stroke();
    ctx.restore();
    }
    ctx.restore();
  }

  // spectrum data
  const PEAKS = [[3350, 0.50, 150], [2958, 0.42, 18], [2931, 0.66, 20], [2860, 0.44, 18], [1742, 1.0, 16], [1605, 0.30, 16], [1462, 0.38, 14], [1375, 0.30, 11], [1240, 0.62, 22], [1162, 0.48, 18], [1045, 0.74, 24], [880, 0.20, 10], [722, 0.28, 12]];
  function spec(wn) { let v = 0.035 + 0.02 * Math.sin(wn / 520); for (const [c, h, w] of PEAKS) v += h / (1 + ((wn - c) / w) ** 2); return v + 0.006 * snoise(wn / 9, 3.3); }
  const PX0 = WX + 100, PX1 = WX + 836, PY0 = WY + 574, PY1 = WY + 700;
  const wnX = wn => PX0 + (4000 - wn) / 3500 * (PX1 - PX0);
  const vY = v => PY1 - v / 1.1 * (PY1 - PY0);

  function icon(ctx, k, x, y, col) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (k === 0) { ctx.moveTo(x - 5, y - 7); ctx.lineTo(x + 6, y + 1); ctx.lineTo(x + 1, y + 2); ctx.lineTo(x - 1, y + 7); ctx.closePath(); ctx.stroke(); }
    if (k === 1) { ctx.ellipse(x, y, 9, 3.6, 0.6, 0, 7); ctx.moveTo(x + 9, y); ctx.ellipse(x, y, 9, 3.6, -0.6, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); }
    if (k === 2) { ctx.arc(x, y, 8, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 5); ctx.stroke(); }
    if (k === 3) { ctx.moveTo(x - 9, y + 4); for (let i = 0; i <= 18; i++) ctx.lineTo(x - 9 + i, y + 4 - Math.exp(-((i - 11) ** 2) / 4) * 11 - Math.exp(-((i - 4) ** 2) / 3) * 5); ctx.stroke(); }
    if (k === 4) { ctx.moveTo(x - 3, y - 8); ctx.lineTo(x - 3, y - 2); ctx.lineTo(x - 8, y + 7); ctx.lineTo(x + 8, y + 7); ctx.lineTo(x + 3, y - 2); ctx.lineTo(x + 3, y - 8); ctx.moveTo(x - 5, y - 8); ctx.lineTo(x + 5, y - 8); ctx.stroke(); }
    if (k === 5) { ctx.moveTo(x - 4, y - 6); ctx.lineTo(x - 9, y); ctx.lineTo(x - 4, y + 6); ctx.moveTo(x + 4, y - 6); ctx.lineTo(x + 9, y); ctx.lineTo(x + 4, y + 6); ctx.moveTo(x + 2, y - 8); ctx.lineTo(x - 2, y + 8); ctx.stroke(); }
    if (k === 6) { ctx.arc(x, y, 3, 0, 7); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.moveTo(x + Math.cos(a) * 5.5, y + Math.sin(a) * 5.5); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); } ctx.stroke(); }
  }

  function drawContent(ctx, T) {
    const A = T.alive;
    const [x0, y0] = L(0, 0);
    ctx.textBaseline = 'alphabetic';
    // ---- title bar
    const lights = A ? ['#FF5A1F', '#FF8A2A', '#FFB85C'] : ['#3A3F45', '#3A3F45', '#3A3F45'];
    lights.forEach((c, i) => { ctx.save(); if (A) glow(ctx, c, 8); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x0 + 24 + i * 20, y0 + 22, 6, 0, 7); ctx.fill(); ctx.restore(); });
    txt(ctx, 'spectra.lab', x0 + 330, y0 + 26.5, '700 12.5px Inst', A ? T.bright : T.bright, 'left');
    txt(ctx, '—  molecular_screen.ipynb', x0 + 404, y0 + 26.5, '400 12.5px Inst', T.text, 'left');
    ctx.strokeStyle = T.text; ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) { const bx = x0 + WW - 84 + i * 26; ctx.strokeRect(bx, y0 + 16, 12, 12); }
    // ---- toolbar
    for (let k = 0; k < 6; k++) {
      const iy = y0 + TB + 34 + k * 44, ix = x0 + TL / 2;
      if (k === 2) { ctx.fillStyle = A ? 'rgba(255,122,26,0.16)' : 'rgba(255,255,255,0.05)'; rr(ctx, ix - 17, iy - 17, 34, 34, 8); ctx.fill(); }
      ctx.save(); if (A && k === 2) glow(ctx, 'rgba(255,120,20,0.9)', 10);
      icon(ctx, k, ix, iy, k === 2 ? (A ? '#FFB064' : T.bright) : T.text); ctx.restore();
    }
    ctx.save(); icon(ctx, 6, x0 + TL / 2, y0 + WH - SB - 30, T.dim); ctx.restore();
    // ---- viewport labels
    txt(ctx, 'RADIAL SPECTRAL MAP', x0 + TL + 16, y0 + TB + 24, '500 9px JBM', T.text, 'left', 2);
    txt(ctx, A ? 'live · agent-driven' : 'static · no input', x0 + TL + 16, y0 + TB + 38, '300 9px JBM', T.dim, 'left', 0.5);
    txt(ctx, A ? 'ρ 0.982   θ 042.7°' : 'ρ 0.000   θ 000.0°', x0 + VPR - 16, y0 + TB + 24, '500 9px JBM', T.text, 'right', 1);
    txt(ctx, 'fig. 07', x0 + TL + 16, y0 + BPT - 14, '300 9px JBM', T.dim, 'left', 1);
    txt(ctx, A ? '● REC' : '○ —', x0 + VPR - 16, y0 + BPT - 14, '500 9px JBM', A ? '#FF7A1A' : T.dim, 'right', 1.5);
    // corner brackets
    ctx.strokeStyle = A ? 'rgba(255,140,60,0.5)' : T.dim; ctx.lineWidth = 1;
    const br = (bx, by, sx, sy) => { ctx.beginPath(); ctx.moveTo(bx, by + sy * 10); ctx.lineTo(bx, by); ctx.lineTo(bx + sx * 10, by); ctx.stroke(); };
    br(x0 + TL + 8.5, y0 + TB + 8.5, 1, 1); br(x0 + VPR - 8.5, y0 + TB + 8.5, -1, 1); br(x0 + TL + 8.5, y0 + BPT - 8.5, 1, -1); br(x0 + VPR - 8.5, y0 + BPT - 8.5, -1, -1);
    drawChart(ctx, T);
    // ---- right panel
    txt(ctx, 'ASSISTANT', x0 + VPR + 18, y0 + TB + 22, '700 10px Inst', T.bright, 'left', 1.6);
    txt(ctx, 'NOTEBOOK', x0 + VPR + 104, y0 + TB + 22, '700 10px Inst', T.dim, 'left', 1.6);
    ctx.fillStyle = A ? '#FF7A1A' : T.acc; ctx.fillRect(x0 + VPR + 18, y0 + 76, 70, 2);
    // chat
    ctx.fillStyle = A ? 'rgba(255,122,26,0.25)' : '#262A30'; ctx.beginPath(); ctx.arc(x0 + 584, y0 + 106, 10, 0, 7); ctx.fill();
    txt(ctx, 'AI', x0 + 584, y0 + 109.5, '700 8.5px Inst', T.bright, 'center');
    const chat = ['Based on the literature, this', 'compound could be interesting.', 'In theory, it might be worth', 'testing it someday…'];
    chat.forEach((s, i) => txt(ctx, s, x0 + 614, y0 + 114 + i * 17, '400 11.5px Inst', i < 3 ? T.text : T.dim));
    for (let i = 0; i < 3; i++) { ctx.fillStyle = T.dim; ctx.beginPath(); ctx.arc(x0 + 618 + i * 9, y0 + 184, 2.2, 0, 7); ctx.fill(); }
    // code cell
    txt(ctx, 'In [7]:', x0 + 578, y0 + 236, '500 9.5px JBM', T.dim, 'left');
    ctx.save(); if (A) glow(ctx, 'rgba(255,120,20,0.9)', 8);
    ctx.fillStyle = A ? '#FF7A1A' : T.dim; ctx.beginPath(); ctx.moveTo(x0 + 838, y0 + 227); ctx.lineTo(x0 + 846, y0 + 232); ctx.lineTo(x0 + 838, y0 + 237); ctx.closePath(); ctx.fill(); ctx.restore();
    const code = [
      [['agent', 'v'], ['.merge', 'f'], ['(spectra)', 'v'], ['  # upgrade', 'c']],
      [['for', 'k'], [' s ', 'v'], ['in', 'k'], [' library:', 'v']],
      [['    spec = spectra', 'v'], ['.scan', 'f'], ['(s)', 'v']],
      [['    peaks = spec', 'v'], ['.find_peaks', 'f'], ['()', 'v']],
      [['    if', 'k'], [' model', 'v'], ['.is_novel', 'f'], ['(peaks):', 'v']],
      [['        report', 'f'], ['(s, peaks)', 'v']],
    ];
    const CL = 20;
    if (A) { ctx.fillStyle = 'rgba(255,122,26,0.13)'; ctx.fillRect(x0 + 578, y0 + 266 + 2 * CL - 14, 268, 19); ctx.fillStyle = '#FF7A1A'; ctx.fillRect(x0 + 578, y0 + 266 + 2 * CL - 14, 2, 19); }
    code.forEach((line, i) => {
      const ly = y0 + 270 + i * CL;
      txt(ctx, String(i + 1), x0 + 596, ly, '300 9.5px JBM', T.dim, 'right');
      ctx.font = '500 10.3px JBM'; let cx_ = x0 + 606;
      for (const [s, t] of line) {
        ctx.fillStyle = t === 'k' ? T.kw : t === 'f' ? T.fn : t === 'c' ? T.cm : T.text;
        ctx.textAlign = 'left'; const mw = ctx.measureText(s).width;
        if (NOTEXT) { const lead = s.length - s.trimStart().length; const lw = ctx.measureText(' '.repeat(lead)).width; if (s.trim()) greek(ctx, s, cx_ + lw, ly, mw - lw - (s.length - s.trimEnd().length) * 6.2, 10.3, ctx.fillStyle, 'left'); }
        else ctx.fillText(s, cx_, ly);
        cx_ += mw;
      }
    });
    if (A) { ctx.save(); glow(ctx, 'rgba(255,200,150,1)', 8); ctx.fillStyle = '#FFE3C4'; ctx.fillRect(x0 + 742, y0 + 306 - 1, 6.5, 13); ctx.restore(); }
    // output
    txt(ctx, 'Out[7]:', x0 + 578, y0 + 426, '500 9.5px JBM', T.dim, 'left');
    txt(ctx, A ? '▸ 3 novel peaks · 1742 cm⁻¹' : '▸ —', x0 + 578, y0 + 448, '500 10.5px JBM', A ? T.bright : T.text, 'left');
    txt(ctx, A ? 'screened 1,204 / 1,650' : 'screened 0,000 / 1,650', x0 + 578, y0 + 466, '300 9.5px JBM', T.dim, 'left');
    ctx.fillStyle = A ? 'rgba(255,122,26,0.18)' : 'rgba(255,255,255,0.05)'; rr(ctx, x0 + 578, y0 + 482, 268, 4, 2); ctx.fill();
    if (A) { ctx.save(); glow(ctx, 'rgba(255,120,20,1)', 8); const g = ctx.createLinearGradient(x0 + 578, 0, x0 + 774, 0); g.addColorStop(0, '#C2440C'); g.addColorStop(1, '#FFD29A'); ctx.fillStyle = g; rr(ctx, x0 + 578, y0 + 482, 196, 4, 2); ctx.fill(); ctx.restore(); }
    txt(ctx, A ? '73%' : '0%', x0 + 846, y0 + 466, '500 9.5px JBM', A ? T.kw : T.dim, 'right');
    // ---- bottom panel
    txt(ctx, 'SPECTRUM  ·  FT-IR', x0 + TL + 16, y0 + BPT + 23, '500 9px JBM', T.text, 'left', 2);
    txt(ctx, 'sample_0412', x0 + TL + 178, y0 + BPT + 23, '300 9px JBM', T.dim, 'left', 0.5);
    txt(ctx, A ? 'AUTO-ANALYSIS  ON' : 'AUTO-ANALYSIS  OFF', x0 + WW - 18, y0 + BPT + 23, '500 9px JBM', A ? '#FF8A34' : T.dim, 'right', 1.5);
    // axes
    ctx.strokeStyle = A ? 'rgba(255,130,50,0.45)' : T.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX0, PY1 + 6.5); ctx.lineTo(PX1, PY1 + 6.5); ctx.stroke();
    for (let wn = 4000; wn >= 500; wn -= 250) {
      const x = Math.round(wnX(wn)) + 0.5; const major = wn % 500 === 0;
      ctx.beginPath(); ctx.moveTo(x, PY1 + 6.5); ctx.lineTo(x, PY1 + (major ? 11 : 9)); ctx.stroke();
      if (major) txt(ctx, String(wn), x, PY1 + 22, '300 8.5px JBM', T.dim, 'center');
    }
    txt(ctx, 'cm⁻¹', PX1, PY1 + 22 + 0, '300 8.5px JBM', T.dim, 'left');
    txt(ctx, 'A', PX0 - 20, PY0 + 6, '500 9px JBM', T.dim, 'left');
    ctx.setLineDash([1, 5]); ctx.strokeStyle = A ? 'rgba(255,130,50,0.18)' : 'rgba(170,180,195,0.08)';
    for (const v of [0.25, 0.5, 0.75, 1.0]) { ctx.beginPath(); ctx.moveTo(PX0, Math.round(vY(v)) + 0.5); ctx.lineTo(PX1, Math.round(vY(v)) + 0.5); ctx.stroke(); }
    ctx.setLineDash([]);
    // curve
    const pts = []; for (let wn = 4000; wn >= 500; wn -= 3) pts.push([wnX(wn), vY(spec(wn))]);
    if (A) {
      const g = ctx.createLinearGradient(0, PY0, 0, PY1);
      g.addColorStop(0, 'rgba(255,110,20,0.42)'); g.addColorStop(1, 'rgba(255,110,20,0.0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(pts[0][0], PY1); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(pts[pts.length - 1][0], PY1); ctx.closePath(); ctx.fill();
    }
    ctx.save(); if (A) glow(ctx, 'rgba(255,110,20,1)', 10);
    ctx.strokeStyle = A ? '#FF8A2A' : '#4C535C'; ctx.lineWidth = A ? 1.8 : 1.1; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
    if (A) {
      ctx.strokeStyle = 'rgba(255,236,214,0.8)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      // peak markers
      for (const wn of [2931, 1742, 1045]) {
        const x = wnX(wn), y = vY(spec(wn));
        ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(255,170,100,0.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y + 7); ctx.lineTo(x, PY1 + 4); ctx.stroke(); ctx.setLineDash([]);
        ctx.save(); glow(ctx, 'rgba(255,150,60,1)', 8); ctx.strokeStyle = '#FFE0BC'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.stroke(); ctx.restore();
        if (wn !== 1742) txt(ctx, String(wn), x + 9, y + 3, '500 8.5px JBM', '#FFB064', 'left');
      }
      // novel chip
      const nx = wnX(1742), ny = vY(spec(1742));
      const cx0 = nx - 142;
      ctx.save(); glow(ctx, 'rgba(255,120,20,0.8)', 10); ctx.fillStyle = '#1A0B04'; rr(ctx, cx0, ny - 9, 124, 20, 10); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#FF7A1A'; ctx.lineWidth = 1; rr(ctx, cx0 + 0.5, ny - 8.5, 123, 19, 9.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,150,70,0.7)'; ctx.beginPath(); ctx.moveTo(cx0 + 124, ny + 1); ctx.lineTo(nx - 6, ny + 1); ctx.stroke();
      ctx.fillStyle = '#FF7A1A'; ctx.beginPath(); ctx.arc(cx0 + 11, ny + 1, 3, 0, 7); ctx.fill();
      txt(ctx, 'NOVEL · 1742 cm⁻¹', cx0 + 19, ny + 4.5, '500 8.8px JBM', '#FFE3C4', 'left', 0.4);
      // scan head
      const sx = wnX(1300);
      const sg = ctx.createLinearGradient(0, PY0 - 6, 0, PY1 + 6); sg.addColorStop(0, 'rgba(255,220,180,0.9)'); sg.addColorStop(1, 'rgba(255,120,30,0.05)');
      ctx.save(); glow(ctx, 'rgba(255,140,40,1)', 10); ctx.strokeStyle = sg; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx, PY0 - 10); ctx.lineTo(sx, PY1 + 6); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#FFE3C4'; ctx.beginPath(); ctx.moveTo(sx - 4, PY0 - 16); ctx.lineTo(sx + 4, PY0 - 16); ctx.lineTo(sx, PY0 - 10); ctx.closePath(); ctx.fill();
    } else {
      txt(ctx, 'no analysis', PX1, PY0 + 2, '300 9px JBM', T.dim, 'right', 1);
    }
    // ---- status bar
    const sy = y0 + WH - SB / 2 + 3.5;
    if (A) { ctx.save(); glow(ctx, '#FF7A1A', 8); ctx.fillStyle = '#FF7A1A'; ctx.beginPath(); ctx.arc(x0 + 20, sy - 3.5, 3.5, 0, 7); ctx.fill(); ctx.restore(); }
    else { ctx.strokeStyle = T.text; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x0 + 20, sy - 3.5, 3.2, 0, 7); ctx.stroke(); }
    txt(ctx, A ? 'AGENT ACTIVE   ·   agent.merge(spectra)   ·   1,204 samples/s' : 'idle   ·   waiting for prompt', x0 + 32, sy, '500 9.5px JBM', A ? '#FF9A4A' : T.text, 'left', 0.6);
    txt(ctx, 'Python 3.12   ·   Ln 3, Col 18   ·   UTF-8', x0 + WW - 18, sy, '300 9.5px JBM', T.dim, 'right', 0.4);
  }

  // ================================================================ TRACES
  const CELL = 2, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  let occ = new Uint8Array(GW * GH);
  function markDisc(x, y, r) {
    const a0 = Math.max(0, Math.floor((x - r) / CELL)), a1 = Math.min(GW - 1, Math.ceil((x + r) / CELL));
    const b0 = Math.max(0, Math.floor((y - r) / CELL)), b1 = Math.min(GH - 1, Math.ceil((y + r) / CELL));
    for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) { const cx = a * CELL + CELL / 2 - x, cy = b * CELL + CELL / 2 - y; if (cx * cx + cy * cy <= r * r) occ[b * GW + a] = 1; }
  }
  function freeDisc(x, y, r) {
    const a0 = Math.max(0, Math.floor((x - r) / CELL)), a1 = Math.min(GW - 1, Math.ceil((x + r) / CELL));
    const b0 = Math.max(0, Math.floor((y - r) / CELL)), b1 = Math.min(GH - 1, Math.ceil((y + r) / CELL));
    for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) { const cx = a * CELL + CELL / 2 - x, cy = b * CELL + CELL / 2 - y; if (cx * cx + cy * cy <= r * r && occ[b * GW + a]) return false; }
    return true;
  }
  function markRect(x, y, w, h) { for (let b = Math.floor(y / CELL); b <= Math.ceil((y + h) / CELL); b++) for (let a = Math.floor(x / CELL); a <= Math.ceil((x + w) / CELL); a++) if (a >= 0 && b >= 0 && a < GW && b < GH) occ[b * GW + a] = 1; }
  // keep-outs: the eye, every piece of text, the plot curve, the headline zone
  const lx = (x) => WX + x, ly = (y) => WY + y;
  markDisc(EX, EY, 224);
  markRect(lx(572), ly(88), 282, 114);     // chat bubble
  markRect(lx(572), ly(222), 282, 20);     // In[7] + run
  markRect(lx(572), ly(254), 282, 132);    // code
  markRect(lx(572), ly(412), 282, 80);     // output
  markRect(lx(VPR + 8), ly(TB + 6), 290, 30);   // tabs
  markRect(lx(0), ly(0), WW, TB + 3);      // title bar
  markRect(lx(TL + 8), ly(TB + 8), 180, 38);   // vp label
  markRect(lx(VPR - 140), ly(TB + 8), 132, 22);
  markRect(lx(TL + 8), ly(BPT - 30), 70, 24);
  markRect(lx(VPR - 70), ly(BPT - 30), 62, 24);
  markRect(lx(TL + 6), ly(BPT + 6), 300, 26);   // bottom header
  markRect(lx(WW - 190), ly(BPT + 6), 184, 26);
  markRect(lx(0), ly(WH - SB), 470, SB);          // status text L
  markRect(lx(WW - 300), ly(WH - SB), 300, SB);   // status text R
  markRect(PX0 - 30, PY1 + 2, PX1 - PX0 + 70, 26); // axis + labels
  markRect(PX0 - 26, PY0 - 4, 20, 20);
  markRect(PX0 - 10, PY0 - 26, PX1 - PX0 + 20, PY1 - PY0 + 34);   // plot
  for (const wn of [2931, 1045]) { markRect(wnX(wn) - 8, vY(spec(wn)) - 10, 48, 20); }
  { const sx = wnX(1300); markRect(sx - 6, PY0 - 20, 12, PY1 - PY0 + 30); }
  for (let k = 0; k < 7; k++) markDisc(WX + TL / 2, WY + TB + 34 + k * 44, 19);
  markDisc(WX + TL / 2, WY + WH - SB - 30, 14);
  markRect(0, 0, W, 438);                          // headline zone stays clean

  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; });
  const TR = rng(2024);
  const traces = [];

  function routeFree(p, q, rad, skip) {
    const L_ = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.max(1, Math.ceil(L_ / 1.5));
    for (let i = 0; i <= n; i++) { const t = i / n; if (t * L_ < skip) continue; if (!freeDisc(lerp(p[0], q[0], t), lerp(p[1], q[1], t), rad)) return false; }
    return true;
  }
  function markPath(pts, rad) { for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i]; const L_ = Math.hypot(q[0] - p[0], q[1] - p[1]); const n = Math.ceil(L_ / 1.5); for (let k = 0; k <= n; k++) markDisc(lerp(p[0], q[0], k / n), lerp(p[1], q[1], k / n), rad); } }

  function grow(start, dirIdx, o) {
    const pts = [start.slice()]; let p = start.slice(), d = dirIdx, len = 0, straight = 0;
    const half = (o.n - 1) * o.sp / 2, rad = half + o.clear;
    let guard = 0;
    while (len < o.max && guard++ < 80) {
      let seg = o.segMin + TR() * (o.segMax - o.segMin);
      let pref = 0;
      if (straight >= 1) {
        if (d % 2 === 1 && TR() < o.axisPull) pref = TR() < 0.5 ? 1 : -1;     // diagonals relax back to axis
        else if (TR() < o.turn) pref = TR() < 0.5 ? 1 : -1;
        if (o.bias !== undefined && TR() < 0.6) { const diff = ((o.bias - d + 12) % 8) - 4; if (diff !== 0) pref = Math.sign(diff); }
      }
      const cands = pref === 0 ? [d, (d + 1) % 8, (d + 7) % 8] : [(d + pref + 8) % 8, d, (d - pref + 8) % 8];
      let ok = false;
      for (let attempt = 0; attempt < 4 && !ok; attempt++) {
        for (const c of cands) {
          if (pts.length > 1 && straight < 1 && c !== d) continue;
          const q = [p[0] + DIRS[c][0] * seg, p[1] + DIRS[c][1] * seg];
          let allOk = true; for (let t = 0.2; t <= 1.0001; t += 0.2) if (!o.allowed(p[0] + DIRS[c][0] * seg * t, p[1] + DIRS[c][1] * seg * t)) { allOk = false; break; }
          if (!allOk) continue;
          if (!routeFree(p, q, rad, pts.length === 1 ? (o.skip0 || 0) : rad + 3)) continue;
          if (c !== d) straight = 0; else straight++;
          d = c; pts.push(q); p = q; len += seg; ok = true; break;
        }
        seg *= 0.6; if (seg < 7) break;
      }
      if (!ok) break;
    }
    if (len < o.minLen) return null;
    markPath(pts, rad);
    return pts;
  }
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  function offsetPath(pts, off, R) {
    const out = [], rad = [];
    for (let i = 0; i < pts.length; i++) {
      let n, r = R;
      if (i === 0) { const u = unit(pts[0], pts[1]); n = [-u[1], u[0]]; }
      else if (i === pts.length - 1) { const u = unit(pts[i - 1], pts[i]); n = [-u[1], u[0]]; }
      else {
        const u1 = unit(pts[i - 1], pts[i]), u2 = unit(pts[i], pts[i + 1]);
        const n1 = [-u1[1], u1[0]], n2 = [-u2[1], u2[0]]; const dot = n1[0] * n2[0] + n1[1] * n2[1];
        n = [(n1[0] + n2[0]) / (1 + dot), (n1[1] + n2[1]) / (1 + dot)];
        const s = Math.sign(u2[0] * n1[0] + u2[1] * n1[1]);
        r = Math.max(1.5, R - off * s);
      }
      out.push([pts[i][0] + n[0] * off, pts[i][1] + n[1] * off]); rad.push(r);
    }
    return [out, rad];
  }
  function trimEnd(pts, rad, cut) {
    const p = pts.map(q => q.slice()), r = rad.slice();
    while (cut > 0 && p.length > 2) {
      const a = p[p.length - 2], b = p[p.length - 1]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l - cut > 10) { const u = unit(a, b); p[p.length - 1] = [b[0] - u[0] * cut, b[1] - u[1] * cut]; cut = 0; }
      else { p.pop(); r.pop(); cut -= l; }
    }
    return [p, r];
  }
  function addBundle(start, dirIdx, o) {
    const spine = grow(start, dirIdx, o); if (!spine) return false;
    if (o.prefix) spine.unshift(o.prefix);
    const R = o.R || 12;
    for (let k = 0; k < o.n; k++) {
      const off = (k - (o.n - 1) / 2) * o.sp;
      let [p, r] = offsetPath(spine, off, R);
      if (o.n > 1 && o.stagger) [p, r] = trimEnd(p, r, TR() * o.stagger);
      traces.push({ pts: p, rad: r, w: o.w, cls: o.cls, pad: o.pad, pin: o.pin, via: o.via && TR() < 0.35, startDot: o.startDot, bright: o.bright || 1 });
    }
    return true;
  }
  const allowWin = ext => (x, y) => inWin(x, y, 8) && field(x, y) < ext;
  const allowOut = (x, y) => !inWin(x, y, -7) && x > 40 && x < W - 40 && y > 452 && y < H - 40 && field(x, y) < 10;

  // 1. roots: the leading edge reaching into the dormant zone
  const roots = [];
  for (let k = 0; k < 8000 && roots.length < 60; k++) {
    const x = WX + 10 + TR() * (WW - 20), y = WY + TB + 10 + TR() * (WH - TB - SB - 20);
    const f = field(x, y); if (!inWin(x, y, 12) || f > -3 || f < -22 || !freeDisc(x, y, 5)) continue;
    const gx = field(x + 3, y) - field(x - 3, y), gy = field(x, y + 3) - field(x, y - 3);
    const di = ((Math.round(Math.atan2(gy, gx) / (Math.PI / 4)) % 8) + 8) % 8;
    if (addBundle([x, y], di, { n: 1, sp: 4, clear: 3.4, R: 8, segMin: 8, segMax: 30, turn: 0.5, axisPull: 0.4, max: 30 + TR() * 100, minLen: 24, allowed: allowWin(35 + TR() * 85), w: 0.9, cls: 'root', pad: false, via: false, bias: di })) roots.push(traces.pop());
  }
  // 2. the eye plugs into the tool: buses leaving the socket
  const NB = 26;
  for (let k = 0; k < NB; k++) {
    const a = (k + 0.5) / NB * Math.PI * 2 + (TR() - 0.5) * 0.06;
    const di = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
    const n = [2, 3, 3, 4, 5][Math.floor(TR() * 5)];
    const st = [EX + Math.cos(a) * 229, EY + Math.sin(a) * 229];
    addBundle(st, di, { n, sp: 4.4, clear: 3.0, R: 16, segMin: 18, segMax: 120, turn: 0.3, axisPull: 0.9, max: 160 + TR() * 460, minLen: 80, allowed: allowWin(26), w: 1.0, cls: 'bus', pad: true, pin: true, via: true, skip0: 14, stagger: 40 });
  }
  // 3. roots leaving the window onto the desk (left edge + bottom edge)
  for (let y = WY + 230; y < WY + WH - 10; y += 40 + TR() * 50) {
    if (field(WX + 2, y) > -20) continue;
    const n = [2, 3, 4][Math.floor(TR() * 3)];
    addBundle([WX - 9, y], 4, { prefix: [WX + 0.5, y], pin: true, n, sp: 4.4, clear: 5, R: 14, segMin: 12, segMax: 70, turn: 0.25, axisPull: 0.9, max: 70 + TR() * 220, minLen: 30, allowed: allowOut, w: 1.0, cls: 'escape', pad: true, via: false, bias: TR() < 0.8 ? 2 : 6, stagger: 30 });
  }
  for (let x = WX + 40; x < WX + WW - 30; x += 44 + TR() * 60) {
    if (field(x, WY + WH + 2) > -30) continue;
    const n = [2, 3, 4][Math.floor(TR() * 3)];
    addBundle([x, WY + WH + 9], 2, { prefix: [x, WY + WH - 0.5], pin: true, n, sp: 4.4, clear: 5, R: 14, segMin: 10, segMax: 50, turn: 0.3, axisPull: 0.9, max: 40 + TR() * 170, minLen: 24, allowed: allowOut, w: 1.0, cls: 'escape', pad: true, via: false, bias: TR() < 0.75 ? 4 : 2, stagger: 26 });
  }
  // 4. the skin: calmer, finer traces on the possessed surfaces
  for (let k = 0; k < 5000 && traces.length < 360; k++) {
    const x = WX + 10 + TR() * (WW - 20), y = WY + 10 + TR() * (WH - 20);
    if (!inWin(x, y, 10) || field(x, y) > -12 || !freeDisc(x, y, 6)) continue;
    const di = [0, 2, 4, 6][Math.floor(TR() * 4)];
    const n = TR() < 0.4 ? 2 : TR() < 0.3 ? 3 : 1;
    addBundle([x, y], di, { n, sp: 4.2, clear: 3.2, R: 12, segMin: 24, segMax: 100, turn: 0.22, axisPull: 1.0, max: 60 + TR() * 240, minLen: 56, allowed: allowWin(8), w: 0.85, cls: 'skin', pad: true, via: true, startDot: true, stagger: 16 });
  }
  // 5. etch: a faint circuit engraving across the whole living surface (reward for a long look)
  const mainOcc = occ; occ = new Uint8Array(GW * GH); markDisc(EX, EY, 222); markRect(0, 0, W, 438);
  const nMain = traces.length;
  for (let k = 0; k < 9000 && traces.length < nMain + 700; k++) {
    const x = WX + 6 + TR() * (WW - 12), y = WY + 6 + TR() * (WH - 12);
    if (!inWin(x, y, 6) || field(x, y) > -2 || !freeDisc(x, y, 4)) continue;
    const di = TR() < 0.8 ? [0, 2, 4, 6][Math.floor(TR() * 4)] : Math.floor(TR() * 8);
    addBundle([x, y], di, { n: TR() < 0.3 ? 2 : 1, sp: 3.6, clear: 2.4, R: 8, segMin: 10, segMax: 60, turn: 0.35, axisPull: 0.85, max: 30 + TR() * 160, minLen: 20, allowed: allowWin(4), w: 0.7, cls: 'etch', pad: TR() < 0.6, via: false, stagger: 10 });
  }
  occ = mainOcc;
  LOG('traces ' + traces.length + ' roots ' + roots.length);

  function tracePath(ctx, pts, rad) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      const r = Math.min(rad[i], Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, Math.hypot(c[0] - b[0], c[1] - b[1]) / 2);
      ctx.arcTo(b[0], b[1], c[0], c[1], r);
    }
    const e = pts[pts.length - 1]; ctx.lineTo(e[0], e[1]);
  }
  const STY = {
    bus: { glow: 'rgba(255,96,12,0.6)', gb: 6, col: 'rgba(255,122,30,0.82)', core: 'rgba(255,214,170,0.45)', pr: 2.3 },
    escape: { glow: 'rgba(255,96,12,0.75)', gb: 6, col: 'rgba(255,122,30,0.92)', core: 'rgba(255,214,170,0.65)', pr: 2.3 },
    skin: { glow: 'rgba(255,90,10,0.45)', gb: 4, col: 'rgba(255,112,26,0.50)', core: null, pr: 1.8 },
    etch: { glow: null, gb: 0, col: 'rgba(255,120,40,0.13)', core: null, pr: 1.5 },
  };
  function drawTraces(ctx, list) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of ['etch', 'skin', 'escape', 'bus']) {
      const st = STY[pass];
      ctx.save(); if (st.glow) glow(ctx, st.glow, st.gb);
      for (const t of list) { if (t.cls !== pass) continue; ctx.strokeStyle = st.col; ctx.lineWidth = t.w; tracePath(ctx, t.pts, t.rad); ctx.stroke(); }
      ctx.restore();
      if (st.core) for (const t of list) { if (t.cls !== pass) continue; ctx.strokeStyle = st.core; ctx.lineWidth = t.w * 0.4; tracePath(ctx, t.pts, t.rad); ctx.stroke(); }
      for (const t of list) {
        if (t.cls !== pass) continue;
        const e = t.pts[t.pts.length - 1], s = t.pts[0];
        if (t.pad) {
          ctx.fillStyle = '#0B0605'; ctx.beginPath(); ctx.arc(e[0], e[1], st.pr, 0, 7); if (pass !== 'etch') ctx.fill();
          ctx.save(); if (pass !== 'etch') glow(ctx, 'rgba(255,120,30,0.9)', 5); ctx.strokeStyle = pass === 'etch' ? 'rgba(255,130,50,0.16)' : pass === 'skin' ? 'rgba(255,140,60,0.7)' : '#FFA04C'; ctx.lineWidth = pass === 'etch' ? 0.7 : 1.05; ctx.stroke(); ctx.restore();
        }
        if (t.pin) { const u = unit(t.pts[0], t.pts[1]); ctx.save(); ctx.translate(s[0], s[1]); ctx.rotate(Math.atan2(u[1], u[0])); glow(ctx, 'rgba(255,140,50,0.9)', 4); ctx.fillStyle = '#FFC285'; ctx.fillRect(-1.5, -1.4, pass === 'escape' ? 7 : 5, 2.8); ctx.restore(); }
        if (t.startDot) { ctx.fillStyle = 'rgba(255,170,100,0.8)'; ctx.beginPath(); ctx.arc(s[0], s[1], 1.4, 0, 7); ctx.fill(); }
        if (t.via && t.pts.length > 2) {
          const v = t.pts[1 + Math.floor(TR() * (t.pts.length - 2))];
          ctx.fillStyle = '#0B0605'; ctx.strokeStyle = 'rgba(255,150,70,0.8)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(v[0], v[1], 2.0, 0, 7); ctx.fill(); ctx.stroke();
        }
      }
    }
  }
  function drawRoots(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const t of roots) {
      const s = t.pts[0], e = t.pts[t.pts.length - 1];
      const g = ctx.createLinearGradient(s[0], s[1], e[0], e[1]);
      g.addColorStop(0, 'rgba(255,110,24,0.0)'); g.addColorStop(0.35, 'rgba(255,120,30,0.55)'); g.addColorStop(1, 'rgba(255,200,140,0.95)');
      ctx.save(); glow(ctx, 'rgba(255,100,16,0.9)', 5); ctx.strokeStyle = g; ctx.lineWidth = t.w; tracePath(ctx, t.pts, t.rad); ctx.stroke(); ctx.restore();
      ctx.save(); glow(ctx, 'rgba(255,190,120,1)', 7); ctx.fillStyle = '#FFE9D2'; ctx.beginPath(); ctx.arc(e[0], e[1], 1.5, 0, 7); ctx.fill(); ctx.restore();
    }
  }

  // ================================================================ 3D TEXTURE MODES
  if (LAYER === 'eye') {
    const N = 2048, c = document.createElement('canvas'); c.width = c.height = N; const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, N, N);
    const sc = N / (2 * 224);
    ctx.setTransform(sc, 0, 0, sc, N / 2 - EX * sc, N / 2 - EY * sc);
    EYE_TEX = true; drawChart(ctx, Object.assign({}, LIVE, { vp: '#000' }));
    window.__out = c.toDataURL('image/png'); window.__done = true; return;
  }
  if (LAYER === 'circuits') {
    // skin pattern for the creature, laid out in the texture space used by the 3D projection
    traces.length = 0; occ = new Uint8Array(GW * GH);
    const CX = 588, CY = 518; markDisc(CX, CY, 150);
    const allowC = (x, y) => x > 8 && x < W - 8 && y > 8 && y < H - 8;
    for (let k = 0; k < 44; k++) {
      const a = (k + 0.5) / 44 * Math.PI * 2 + (TR() - 0.5) * 0.05;
      const di = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
      addBundle([CX + Math.cos(a) * 158, CY + Math.sin(a) * 158], di, { n: [2, 3, 3, 4, 5][Math.floor(TR() * 5)], sp: 5, clear: 3.4, R: 18, segMin: 30, segMax: 150, turn: 0.35, axisPull: 0.85, max: 250 + TR() * 700, minLen: 60, allowed: allowC, w: 1.4, cls: 'bus', pad: true, pin: true, via: true, skip0: 14, stagger: 60 });
    }
    for (let k = 0; k < 20000 && traces.length < 520; k++) {
      const x = 10 + TR() * (W - 20), y = 10 + TR() * (H - 20);
      if (!freeDisc(x, y, 16)) continue;
      const di = TR() < 0.75 ? [0, 2, 4, 6][Math.floor(TR() * 4)] : Math.floor(TR() * 8);
      addBundle([x, y], di, { n: TR() < 0.35 ? 2 : TR() < 0.3 ? 3 : 1, sp: 5, clear: 9, R: 16, segMin: 24, segMax: 120, turn: 0.35, axisPull: 0.85, max: 50 + TR() * 260, minLen: 30, allowed: allowC, w: TR() < 0.3 ? 1.2 : 0.95, cls: TR() < 0.35 ? 'bus' : 'skin', pad: true, via: true, startDot: true, stagger: 18 });
    }
    LOG('circuit traces ' + traces.length);
    const [c, ctx] = mk(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    STY.skin.col = 'rgba(255,112,26,0.75)';
    drawTraces(ctx, traces);
    window.__out = c.toDataURL('image/png'); window.__done = true; return;
  }

  // ================================================================ COMPOSE
  const [bgD, cBgD] = mk(); drawBG(cBgD, DEAD); drawSurface(cBgD, DEAD);
  const [bgA, cBgA] = mk(); drawBG(cBgA, LIVE); drawSurface(cBgA, LIVE);
  const [ctD, cCtD] = mk(); drawContent(cCtD, DEAD);
  const [ctA, cCtA] = mk(); drawContent(cCtA, LIVE);
  const [trC, cTr] = mk(); drawTraces(cTr, traces);
  const [rtC, cRt] = mk(); drawRoots(cRt);
  LOG('layers drawn');

  const DW = W * S, DH = H * S;
  const mAlive = new ImageData(DW, DH), mTrace = new ImageData(DW, DH), fx = new ImageData(DW, DH), dark = new ImageData(DW, DH);
  for (let py = 0; py < DH; py++) for (let px = 0; px < DW; px++) {
    const x = (px + 0.5) / S, y = (py + 0.5) / S; const f = field(x, y); const i = (py * DW + px) * 4;
    const inside = inWin(x, y, 0);
    let m = clamp(0.5 - f / 1.0, 0, 1);
    if (!inside) { const dw = distToWin(x, y); m = clamp(0.5 - f / 110, 0, 1) * Math.exp(-dw / 60) * smooth(420, 470, y); }
    mAlive.data[i + 3] = Math.round(m * 255);
    const tm = inside ? 1 - smooth(-6, 26, f) : 1;
    mTrace.data[i + 3] = Math.round(tm * 255);
    if (inside) {
      const vary = 0.55 + 0.75 * clamp(0.5 + fbm(x / 70 + 40, y / 70 - 13, 3), 0, 1);
      const lip = Math.exp(-(((f + 0.25) / 0.7) ** 2)) * 0.5 * vary;          // specular lip of the advancing liquid
      const vein = Math.exp(-(((f + 3.4) / 1.5) ** 2)) * 0.95 * vary;        // hot vein just behind the lip
      const band = f < 0 ? Math.exp(f / 20) * 0.20 * vary : 0;               // freshly possessed heat
      const spill = f > 0 ? Math.exp(-f / 24) * 0.06 : 0;                     // light spilling onto the dormant side
      fx.data[i] = clamp((lip + vein + band + spill) * 255, 0, 255);
      fx.data[i + 1] = clamp(lip * 226 + vein * 118 + band * 76 + spill * 92, 0, 255);
      fx.data[i + 2] = clamp(lip * 196 + vein * 26 + band * 12 + spill * 34, 0, 255);
      fx.data[i + 3] = 255;
      dark.data[i + 3] = Math.round((f > 0 ? Math.exp(-f / 7) * 0.6 : 0) * 255);
    } else fx.data[i + 3] = 255;
  }
  LOG('masks');
  const toCanvas = (img) => { const c = document.createElement('canvas'); c.width = DW; c.height = DH; c.getContext('2d').putImageData(img, 0, 0); return c; };
  const MA = toCanvas(mAlive), MT = toCanvas(mTrace), FX = toCanvas(fx), DK = toCanvas(dark);
  function masked(src, mask, invert) { const c = document.createElement('canvas'); c.width = DW; c.height = DH; const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = invert ? 'destination-out' : 'destination-in'; x.drawImage(mask, 0, 0); return c; }

  const out = document.getElementById('c'); out.width = DW; out.height = DH; const o = out.getContext('2d');
  o.drawImage(bgD, 0, 0); o.drawImage(masked(bgA, MA), 0, 0);
  o.drawImage(DK, 0, 0);
  o.drawImage(masked(trC, MT), 0, 0);
  const cm = document.createElement('canvas'); cm.width = DW; cm.height = DH; const cmx = cm.getContext('2d');
  cmx.drawImage(masked(ctD, MA, true), 0, 0); cmx.globalCompositeOperation = 'lighter'; cmx.drawImage(masked(ctA, MA), 0, 0);
  o.drawImage(cm, 0, 0);
  o.drawImage(rtC, 0, 0);
  o.save(); o.globalCompositeOperation = 'lighter'; o.drawImage(FX, 0, 0);
  o.filter = `blur(${7 * S}px)`; o.globalAlpha = 0.8; o.drawImage(FX, 0, 0); o.filter = 'none'; o.globalAlpha = 1; o.restore();

  // embers + digital fragments drifting into the dormant zone
  const ER = rng(77);
  o.save(); o.setTransform(S, 0, 0, S, 0, 0); o.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 8000; k++) {
    const x = WX + 6 + ER() * (WW - 12), y = WY + 6 + ER() * (WH - 12); const f = field(x, y);
    if (f < 2 || f > 90) continue; if (ER() > Math.exp(-f / 14) * 0.5) continue;
    const a = 0.2 + ER() * 0.8 * Math.exp(-f / 28);
    if (ER() < 0.62) {
      const s = [1, 1.5, 1.5, 2, 3][Math.floor(ER() * 5)]; const qx = Math.round(x / 3) * 3, qy = Math.round(y / 3) * 3;
      o.fillStyle = ER() < 0.22 ? `rgba(255,232,205,${a})` : `rgba(255,${100 + Math.floor(ER() * 90)},30,${a})`;
      o.fillRect(qx, qy, s, s);
    } else {
      o.fillStyle = `rgba(255,${150 + Math.floor(ER() * 80)},90,${a})`;
      o.beginPath(); o.arc(x, y, 0.45 + ER() * 0.9, 0, 7); o.fill();
    }
  }
  o.restore();

  LOG('composed');
  if (LAYER === 'screen') {
    const c = document.createElement('canvas'); c.width = Math.round(WW * S); c.height = Math.round(WH * S);
    c.getContext('2d').drawImage(out, WX * S, WY * S, WW * S, WH * S, 0, 0, c.width, c.height);
    window.__out = c.toDataURL('image/png'); window.__done = true; return;
  }
  window.__out = out.toDataURL('image/png'); window.__done = true;
})().catch(e => { console.log('ERR', e.stack || e); window.__err = String(e); window.__done = true; });
