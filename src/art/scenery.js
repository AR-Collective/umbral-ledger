// =====================================================================
// SCENERY: skies, parallax layers, houses, ground, props and the Hall.
//
// Art direction: "ink and ember". Night is cold blue and violet; warm colour
// appears only where there is fire or lamplight, which is also where danger
// is. Distance is shown with atmosphere: each layer further back is paler and
// closer to the fog colour. Everything nearby is lit from the upper left by
// the moon, so silhouettes get a cool rim along their top edges.
//
// Every painter returns a canvas; buildScenery() turns them into textures.
// =====================================================================

import {
  makeCanvas, makeNoise, fbm, rand, vgrad, radial, rgba, mix, hex, blob, curve, limb,
  rimLight, shadeBottom, grain, mottle, addCanvasTexture,
} from './paint.js';

const TAU = Math.PI * 2;

export const PAL = {
  inkFar: '#0b1026',
  moonRim: '#9fb4ff',
  warm: '#ffb062',
  fog: '#c79a74',
};

// ---------------------------------------------------------------
// Sky, stars, moon, clouds
// ---------------------------------------------------------------
export function paintSky(stops, h = 720) {
  const c = makeCanvas(8, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = vgrad(ctx, 0, h, stops);
  ctx.fillRect(0, 0, 8, h);
  return c;
}

export const SKY_NIGHT = [[0, '#060a1a'], [0.32, '#101a3c'], [0.56, '#23285a'], [0.74, '#433762'], [0.88, '#7c5260'], [1, '#b8744e']];
export const SKY_DAWN = [[0, '#2f4f8c'], [0.35, '#7d7fae'], [0.6, '#d99a86'], [0.82, '#ffc684'], [1, '#fff0c4']];
export const SKY_HALL = [[0, '#07060d'], [0.5, '#120f1d'], [1, '#1d1828']];

export function paintStars(w = 1024, h = 380, seed = 7) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const r = rand(seed);
  for (let i = 0; i < 260; i++) {
    const x = r() * w, y = r() * h * (0.3 + 0.7 * r());
    const a = 0.15 + r() * 0.7 * (1 - y / h);
    const big = r() < 0.05;
    ctx.fillStyle = `rgba(${210 + r() * 45},${215 + r() * 40},255,${a})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), big ? 2 : 1, big ? 2 : 1);
    if (big) {
      ctx.fillStyle = radial(ctx, x + 1, y + 1, 6, [[0, `rgba(220,230,255,${a * 0.5})`], [1, 'rgba(220,230,255,0)']]);
      ctx.fillRect(x - 6, y - 6, 14, 14);
    }
  }
  return c;
}

export function paintMoon(size = 240) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const R = size * 0.3, m = size / 2;
  ctx.fillStyle = radial(ctx, m - R * 0.25, m - R * 0.3, R * 1.3, [[0, '#fffaf0'], [0.6, '#efe2c8'], [1, '#c9b89c']]);
  ctx.beginPath(); ctx.arc(m, m, R, 0, TAU); ctx.fill();
  // maria: soft darker blotches
  const n = makeNoise(11);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = (y * size + x) * 4;
      if (d[k + 3] === 0) continue;
      const v = fbm(n, x / 22, y / 22, 64, 4);
      const dark = Math.max(0, v - 0.52) * 1.8;
      d[k] -= dark * 70; d[k + 1] -= dark * 66; d[k + 2] -= dark * 52;
    }
  }
  ctx.putImageData(img, 0, 0);
  // limb darkening
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = radial(ctx, m, m, R, [[0.7, 'rgba(40,30,50,0)'], [1, 'rgba(40,30,50,0.35)']]);
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

export function paintClouds(w, h, { seed = 3, color = '#1b2148', light = '#5c6a9e', cover = 0.5, band = [0.25, 0.75] } = {}) {
  // painted at half size and scaled up: clouds are soft anyway
  const sw = w / 2, sh = h / 2;
  const small = makeCanvas(sw, sh);
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(sw, sh);
  const d = img.data;
  const n = makeNoise(seed);
  const [cr, cg, cb] = hex(color), [lr, lg, lb] = hex(light);
  const dens = (x, y) => {
    const v = fbm(n, (x / sw) * 6, (y / sh) * 2.2, 6, 5);
    const yy = y / sh;
    const env = Math.max(0, 1 - Math.abs((yy - (band[0] + band[1]) / 2) / ((band[1] - band[0]) / 2)));
    return v * (0.55 + env * 0.6) - (1 - cover) * 0.5;
  };
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const v = dens(x, y);
      const a = Math.max(0, Math.min(1, (v - 0.18) * 4));
      if (a <= 0) continue;
      const up = dens(x - 1, y - 3);
      const lit = Math.max(0, Math.min(1, (v - up) * 9 + 0.15));
      const k = (y * sw + x) * 4;
      d[k] = cr + (lr - cr) * lit; d[k + 1] = cg + (lg - cg) * lit; d[k + 2] = cb + (lb - cb) * lit;
      d[k + 3] = a * 235;
    }
  }
  sctx.putImageData(img, 0, 0);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, w, h);
  return c;
}

// ---------------------------------------------------------------
// Distant layers
// ---------------------------------------------------------------
function fogFade(ctx, w, h, fogColor, from = 0.45, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = vgrad(ctx, h * from, h, [[0, rgba(fogColor, 0)], [1, rgba(fogColor, alpha)]]);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function pine(ctx, x, groundY, h, r) {
  const tiers = 4 + Math.floor(r() * 3);
  ctx.beginPath();
  ctx.moveTo(x, groundY - h);
  for (let i = 1; i <= tiers; i++) {
    const y = groundY - h + (h * i) / tiers;
    const half = (h * 0.32 * i) / tiers + 2;
    ctx.lineTo(x + half, y);
    ctx.lineTo(x + half * 0.45, y - 1);
  }
  for (let i = tiers; i >= 1; i--) {
    const y = groundY - h + (h * i) / tiers;
    const half = (h * 0.32 * i) / tiers + 2;
    ctx.lineTo(x - half * 0.45, y - 1);
    ctx.lineTo(x - half, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 1.5, groundY - 4, 3, 6);
}

// A ridge of hills, optionally topped with a line of pines. Tiles horizontally.
export function paintRidge(w, h, { seed = 1, top = 0.4, amp = 0.25, cells = 6, color = '#1d2654', fog = PAL.fog, fogFrom = 0.4, fogAlpha = 0.55, trees = 0, treeH = [20, 46] } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const n = makeNoise(seed);
  const yAt = (x) => h * top + (fbm(n, (x / w) * cells, 0.5, cells, 4) - 0.5) * 2 * h * amp;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) ctx.lineTo(x, yAt(x));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  if (trees) {
    const r = rand(seed + 9);
    for (let i = 0; i < trees; i++) {
      const x = r() * w;
      const th = treeH[0] + r() * (treeH[1] - treeH[0]);
      for (const xx of [x, x - w, x + w]) pine(ctx, xx, yAt(Math.max(0, Math.min(w, x))) + 6, th, r);
    }
  }
  rimLight(c, '#8a9ad0', 0.25, 0, 2, 1);
  fogFade(ctx, w, h, fog, fogFrom, fogAlpha);
  return c;
}

function house(ctx, x, groundY, w, hgt, roofH, r, { windows = true, chimney = true, warm = PAL.warm, windowChance = 0.3 } = {}) {
  ctx.fillRect(x, groundY - hgt, w, hgt + 2);
  ctx.beginPath();
  ctx.moveTo(x - 6, groundY - hgt + 1);
  ctx.lineTo(x + w / 2, groundY - hgt - roofH);
  ctx.lineTo(x + w + 6, groundY - hgt + 1);
  ctx.closePath();
  ctx.fill();
  if (chimney && r() < 0.7) ctx.fillRect(x + w * (0.6 + r() * 0.2), groundY - hgt - roofH * 0.8, Math.max(5, w * 0.1), roofH * 0.6);
  if (windows) {
    const fill = ctx.fillStyle;
    const rows = Math.max(1, Math.floor(hgt / 34));
    const cols = Math.max(1, Math.floor(w / 26));
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (r() > windowChance) continue;
        const wx = x + 8 + i * ((w - 16) / cols), wy = groundY - hgt + 10 + j * 30;
        ctx.fillStyle = radial(ctx, wx + 3, wy + 4, 12, [[0, rgba(warm, 0.35)], [1, rgba(warm, 0)]]);
        ctx.fillRect(wx - 10, wy - 8, 26, 26);
        ctx.fillStyle = rgba(warm, 0.9);
        ctx.fillRect(wx, wy, 6, 8);
      }
    }
    ctx.fillStyle = fill;
  }
}

// Village roofs, a church spire and a windmill. Tiles horizontally.
export function paintSkyline(w, h, { seed = 5, color = '#121834', fog = PAL.fog, fogAlpha = 0.5, scale = 1, windowChance = 0.3, spire = true, mill = true } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const r = rand(seed);
  ctx.fillStyle = color;
  const ground = h - 8;
  let x = 0;
  const items = [];
  while (x < w) {
    const bw = (46 + r() * 70) * scale;
    const bh = (50 + r() * 70) * scale;
    items.push({ x, bw, bh, roof: bw * (0.35 + r() * 0.3) });
    x += bw + r() * 14 * scale;
  }
  for (const it of items) for (const xx of [it.x, it.x - w]) house(ctx, xx, ground, it.bw, it.bh, it.roof, r, { windowChance });
  if (spire) {
    const sx = w * 0.62;
    ctx.fillRect(sx, ground - 170 * scale, 34 * scale, 170 * scale);
    ctx.beginPath(); ctx.moveTo(sx - 4, ground - 170 * scale); ctx.lineTo(sx + 17 * scale, ground - 250 * scale); ctx.lineTo(sx + 38 * scale, ground - 170 * scale); ctx.fill();
    ctx.fillStyle = rgba(PAL.warm, 0.7); ctx.fillRect(sx + 13 * scale, ground - 140 * scale, 7 * scale, 12 * scale); ctx.fillStyle = color;
  }
  if (mill) {
    const mx = w * 0.18, mt = ground - 150 * scale;
    ctx.beginPath(); ctx.moveTo(mx - 22 * scale, ground); ctx.lineTo(mx - 12 * scale, mt); ctx.lineTo(mx + 12 * scale, mt); ctx.lineTo(mx + 22 * scale, ground); ctx.fill();
    ctx.lineWidth = 4 * scale; ctx.strokeStyle = color;
    for (let k = 0; k < 4; k++) {
      const a = 0.4 + (k * Math.PI) / 2;
      ctx.beginPath(); ctx.moveTo(mx, mt + 6 * scale); ctx.lineTo(mx + Math.cos(a) * 70 * scale, mt + 6 * scale + Math.sin(a) * 70 * scale); ctx.stroke();
    }
  }
  ctx.fillRect(0, ground, w, h - ground);
  rimLight(c, '#7f8fc8', 0.3, 0, 2, 1);
  fogFade(ctx, w, h, fog, 0.5, fogAlpha);
  return c;
}

function branchTree(ctx, x, y, len, angle, width, depth, r) {
  const x2 = x + Math.sin(angle) * len, y2 = y - Math.cos(angle) * len;
  limb(ctx, x, y, x2, y2, width, width * 0.68);
  if (depth <= 0 || width < 1.2) return;
  const n = 2 + (r() < 0.35 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const a = angle + (r() - 0.5) * 1.4 + (i - (n - 1) / 2) * 0.45;
    branchTree(ctx, x2, y2, len * (0.62 + r() * 0.22), a, width * 0.66, depth - 1, r);
  }
}

// Bare, crooked trees and low shrubs. Tiles horizontally.
export function paintTreeLine(w, h, { seed = 13, color = '#0a0d22', fog = PAL.fog, fogAlpha = 0.45, count = 7, size = 1 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const r = rand(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = (i + 0.2 + r() * 0.6) * (w / count);
    const len = (70 + r() * 60) * size;
    for (const xx of [x, x - w, x + w]) {
      const rr = rand(seed * 31 + i);
      branchTree(ctx, xx, h, len, (rr() - 0.5) * 0.2, 12 * size, 6, rr);
    }
  }
  // shrubs and grass along the bottom
  for (let x = -20; x < w + 20; x += 6) {
    const hh = 6 + r() * 22;
    ctx.beginPath(); ctx.ellipse(x, h, 10 + r() * 14, hh, 0, Math.PI, TAU); ctx.fill();
  }
  rimLight(c, '#8a9ad0', 0.22, 0, 2, 0.8);
  fogFade(ctx, w, h, fog, 0.55, fogAlpha);
  return c;
}

// A soft horizontal band of fog (white; tinted where it is used).
export function paintFogBand(w = 1024, h = 220, seed = 21) {
  const c = makeCanvas(w / 2, h / 2);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w / 2, h / 2);
  const n = makeNoise(seed);
  for (let y = 0; y < h / 2; y++) {
    const env = Math.sin((y / (h / 2)) * Math.PI) ** 1.4;
    for (let x = 0; x < w / 2; x++) {
      const v = fbm(n, (x / (w / 2)) * 5, (y / (h / 2)) * 1.6, 5, 4);
      const a = Math.max(0, Math.min(1, (v - 0.3) * 1.8)) * env;
      const k = (y * (w / 2) + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = makeCanvas(w, h);
  out.getContext('2d').drawImage(c, 0, 0, w, h);
  return out;
}

// Foreground grass, reeds and weeds, near-black (closest to the camera).
export function paintForegroundGrass(w = 1024, h = 130, seed = 17) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const r = rand(seed);
  ctx.fillStyle = '#030208';
  ctx.strokeStyle = '#030208';
  for (let i = 0; i < 260; i++) {
    const x = r() * w;
    const hh = 18 + r() ** 2 * (h - 24);
    const lean = (r() - 0.5) * 30;
    const bw = 2 + r() * 4;
    for (const xx of [x, x - w, x + w]) {
      ctx.beginPath();
      ctx.moveTo(xx - bw, h);
      ctx.quadraticCurveTo(xx + lean * 0.3, h - hh * 0.6, xx + lean, h - hh);
      ctx.quadraticCurveTo(xx + lean * 0.35 + 1, h - hh * 0.55, xx + bw, h);
      ctx.fill();
    }
  }
  // a few cattails
  for (let i = 0; i < 8; i++) {
    const x = r() * w, hh = h - 10 - r() * 30;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, h); ctx.quadraticCurveTo(x + 4, h - hh * 0.5, x + 6, h - hh); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 6, h - hh + 8, 3, 9, 0.1, 0, TAU); ctx.fill();
  }
  ctx.fillRect(0, h - 6, w, 6);
  return c;
}

// ---------------------------------------------------------------
// Gameplay-layer materials
// ---------------------------------------------------------------
function stoneBlocks(ctx, x, y, w, h, { base = '#24222f', mortar = '#121019', bw = 34, bh = 18, seed = 1, jitter = 0.12 } = {}) {
  const r = rand(seed);
  ctx.fillStyle = mortar;
  ctx.fillRect(x, y, w, h);
  for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
    const off = row % 2 ? bw / 2 : 0;
    for (let xx = x - off; xx < x + w; xx += bw) {
      const shade = (r() - 0.5) * jitter;
      ctx.fillStyle = mix(base, shade > 0 ? '#3a3850' : '#14121c', Math.abs(shade) * 3);
      const bx = Math.max(x, xx + 1.5), bx2 = Math.min(x + w, xx + bw - 1.5);
      if (bx2 <= bx) continue;
      ctx.fillRect(bx, yy + 1.5, bx2 - bx, Math.min(bh - 3, y + h - yy - 1.5));
      ctx.fillStyle = 'rgba(160,170,220,0.06)';
      ctx.fillRect(bx, yy + 1.5, bx2 - bx, 2);
    }
  }
}

export function paintGroundBody(w = 512, h = 512, { base = '#141120', blotch = '#1e1a2c', seed = 4 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  mottle(ctx, 0, 0, w, h, blotch, 0.6, { seed, cells: 6 });
  const r = rand(seed + 3);
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = r() * h, rr = 2 + r() * 6;
    ctx.fillStyle = r() < 0.5 ? '#0c0a14' : '#211d30';
    ctx.beginPath(); ctx.ellipse(x, y, rr * 1.4, rr, r(), 0, TAU); ctx.fill();
  }
  ctx.fillStyle = vgrad(ctx, 0, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]);
  ctx.fillRect(0, 0, w, h);
  grain(ctx, 0, 0, w, h, 0.05, seed);
  return c;
}

export function paintStoneBody(w = 512, h = 512, seed = 6, base = '#24222f') {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  stoneBlocks(ctx, 0, 0, w, h, { base, bw: 46, bh: 24, seed });
  mottle(ctx, 0, 0, w, h, '#0e0c15', 0.45, { seed, cells: 5 });
  grain(ctx, 0, 0, w, h, 0.05, seed);
  return c;
}

export function paintWoodBody(w = 256, h = 256, seed = 9) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1e1714';
  ctx.fillRect(0, 0, w, h);
  const r = rand(seed);
  for (let x = 0; x < w; x += 18) {
    ctx.fillStyle = mix('#1e1714', '#2c221b', r());
    ctx.fillRect(x + 1, 0, 16, h);
    ctx.fillStyle = '#0e0a09';
    ctx.fillRect(x, 0, 1.5, h);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + 3 + r() * 10, r() * h, 1, 20 + r() * 40);
    }
  }
  grain(ctx, 0, 0, w, h, 0.06, seed);
  return c;
}

// Top strip of a floor: cobbles, dirt or grass. Sits over the top of a ground body.
export function paintGroundTop(w = 512, h = 44, kind = 'cobble', seed = 2) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const r = rand(seed);
  if (kind === 'cobble') {
    ctx.fillStyle = '#100e18';
    ctx.fillRect(0, 6, w, h - 6);
    let x = -10;
    while (x < w + 10) {
      const sw = 14 + r() * 14, sh = 9 + r() * 5;
      for (const xx of [x, x - w, x + w]) {
        ctx.fillStyle = mix('#2a2838', '#3a3850', r());
        ctx.beginPath(); ctx.ellipse(xx + sw / 2, 10, sw / 2, sh / 2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(170,180,235,0.14)';
        ctx.beginPath(); ctx.ellipse(xx + sw / 2 - 1, 8, sw / 2 - 3, 2, 0, 0, TAU); ctx.fill();
      }
      x += sw + 1;
    }
    for (let k = 0; k < 2; k++) {
      let x2 = -10 + k * 9;
      while (x2 < w + 10) {
        const sw = 12 + r() * 12;
        ctx.fillStyle = mix('#1a1826', '#24222f', r());
        ctx.beginPath(); ctx.ellipse(x2 + sw / 2, 22 + k * 11, sw / 2, 4.5, 0, 0, TAU); ctx.fill();
        x2 += sw + 2;
      }
    }
  } else if (kind === 'grass' || kind === 'dirt') {
    ctx.fillStyle = vgrad(ctx, 4, h, [[0, '#211c2a'], [1, '#141120']]);
    ctx.fillRect(0, 4, w, h - 4);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = mix('#2a2534', '#3a3446', r());
      ctx.beginPath(); ctx.ellipse(r() * w, 8 + r() * (h - 14), 2 + r() * 4, 1.5 + r() * 2, 0, 0, TAU); ctx.fill();
    }
    if (kind === 'grass') {
      ctx.fillStyle = '#161a24';
      for (let i = 0; i < 220; i++) {
        const x = r() * w, hh = 4 + r() * 12, lean = (r() - 0.5) * 6;
        for (const xx of [x, x - w, x + w]) {
          ctx.beginPath(); ctx.moveTo(xx - 1.4, 6); ctx.quadraticCurveTo(xx + lean * 0.4, 6 - hh * 0.5, xx + lean, 6 - hh); ctx.lineTo(xx + 1.4, 6); ctx.fill();
        }
      }
    }
  } else if (kind === 'flag') {
    // flagstones (cellars, the Hall's side passages)
    stoneBlocks(ctx, 0, 4, w, h - 4, { base: '#22202c', bw: 40, bh: 14, seed });
  } else if (kind === 'marble') {
    for (let x = 0, i = 0; x < w; x += 64, i++) {
      ctx.fillStyle = i % 2 ? '#2c2838' : '#1a1724';
      ctx.fillRect(x, 4, 64, h - 4);
      ctx.fillStyle = 'rgba(200,200,255,0.06)';
      ctx.fillRect(x, 4, 64, 3);
    }
    ctx.fillStyle = vgrad(ctx, 4, h, [[0, 'rgba(255,255,255,0.05)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.3)']]);
    ctx.fillRect(0, 4, w, h - 4);
  }
  // moonlit lip on the very top
  ctx.fillStyle = 'rgba(170,185,255,0.35)';
  ctx.fillRect(0, kind === 'grass' ? 5 : 3, w, 1.5);
  return c;
}

// ---------------------------------------------------------------
// Houses (sized per level, so painted on demand)
// ---------------------------------------------------------------
// opts: { windows: [[x, y, lit, w?, h?]], door: [x, w], roof: 'gable'|'flat', seed, chimney }
export function paintHouse(w, h, opts = {}) {
  const roofH = opts.roof === 'flat' ? 16 : Math.min(120, w * 0.44);
  const pad = 22;
  const c = makeCanvas(w + pad * 2, h + roofH + 46);
  const ctx = c.getContext('2d');
  const top = c.height - h;           // top of the walls
  const left = pad;
  const r = rand(opts.seed ?? 1);

  // walls: plaster with moonlight from the upper left
  ctx.fillStyle = vgrad(ctx, top, c.height, [[0, '#2d2b3c'], [1, '#1b1a26']]);
  ctx.fillRect(left, top, w, h);
  mottle(ctx, left, top, w, h, '#3c3a52', 0.32, { seed: (opts.seed ?? 1) + 2, cells: 7 });
  // stone plinth
  const plinth = 30;
  stoneBlocks(ctx, left, c.height - plinth, w, plinth, { base: '#24222e', bw: 30, bh: 15, seed: opts.seed ?? 1 });
  // timber frame
  ctx.fillStyle = '#110e17';
  const beam = 7;
  const floorY = top + Math.round(h * 0.46);
  ctx.fillRect(left, top, w, beam);
  ctx.fillRect(left, floorY, w, beam);
  ctx.fillRect(left, c.height - plinth - beam, w, beam);
  const posts = Math.max(2, Math.round(w / 62));
  for (let i = 0; i <= posts; i++) {
    const x = left + Math.round((i * (w - beam)) / posts);
    ctx.fillRect(x, top, beam, h - plinth);
    if (i < posts && r() < 0.6) {
      const x2 = left + Math.round(((i + 1) * (w - beam)) / posts);
      ctx.save();
      ctx.lineWidth = 5; ctx.strokeStyle = '#110e17';
      ctx.beginPath();
      if (r() < 0.5) { ctx.moveTo(x + beam, floorY + beam); ctx.lineTo(x2, c.height - plinth - beam); }
      else { ctx.moveTo(x + beam, top + beam); ctx.lineTo(x2, floorY); }
      ctx.stroke();
      ctx.restore();
    }
  }
  // windows
  for (const win of opts.windows ?? []) {
    const [wx, wy, lit] = win;
    const ww = win[3] ?? 26, wh = win[4] ?? 32;
    const x = left + wx, y = top + wy;
    if (lit) {
      ctx.fillStyle = radial(ctx, x + ww / 2, y + wh / 2, ww * 1.6, [[0, 'rgba(255,170,90,0.28)'], [1, 'rgba(255,170,90,0)']]);
      ctx.fillRect(x - ww, y - wh, ww * 3, wh * 3);
    }
    ctx.fillStyle = '#08070c';
    ctx.fillRect(x - 3, y - 3, ww + 6, wh + 6);
    if (lit) {
      ctx.fillStyle = vgrad(ctx, y, y + wh, [[0, '#ffd890'], [0.6, '#f09a48'], [1, '#b85a26']]);
    } else {
      ctx.fillStyle = vgrad(ctx, y, y + wh, [[0, '#2a3456'], [1, '#121628']]);
    }
    ctx.fillRect(x, y, ww, wh);
    if (!lit) {
      ctx.fillStyle = 'rgba(170,190,255,0.16)';
      ctx.beginPath(); ctx.moveTo(x + 3, y + wh); ctx.lineTo(x + ww * 0.55, y); ctx.lineTo(x + ww * 0.75, y); ctx.lineTo(x + 8, y + wh); ctx.fill();
    }
    ctx.fillStyle = '#110e17';
    ctx.fillRect(x + ww / 2 - 1.5, y, 3, wh);
    ctx.fillRect(x, y + wh / 2 - 1.5, ww, 3);
    ctx.fillStyle = '#3a3546';
    ctx.fillRect(x - 5, y + wh + 3, ww + 10, 4);
    if (!lit && r() < 0.5) {
      ctx.fillStyle = '#1c1520';
      ctx.fillRect(x - 13, y - 2, 9, wh + 4);
      ctx.fillRect(x + ww + 4, y - 2, 9, wh + 4);
    }
  }
  // door
  if (opts.door) {
    const [dx, dw] = opts.door;
    const x = left + dx, dh = 74, y = c.height - dh;
    ctx.fillStyle = '#08070b';
    ctx.beginPath(); ctx.moveTo(x - 4, c.height); ctx.lineTo(x - 4, y + dw / 2); ctx.arc(x + dw / 2, y + dw / 2, dw / 2 + 4, Math.PI, TAU); ctx.lineTo(x + dw + 4, c.height); ctx.fill();
    ctx.fillStyle = '#21170f';
    ctx.beginPath(); ctx.moveTo(x, c.height); ctx.lineTo(x, y + dw / 2); ctx.arc(x + dw / 2, y + dw / 2, dw / 2, Math.PI, TAU); ctx.lineTo(x + dw, c.height); ctx.fill();
    ctx.fillStyle = '#120c08';
    for (let k = 1; k < 4; k++) ctx.fillRect(x + (k * dw) / 4, y + 4, 1.5, dh);
    ctx.fillStyle = '#3a3036';
    ctx.fillRect(x, y + 22, dw * 0.6, 3); ctx.fillRect(x, y + 52, dw * 0.6, 3);
    ctx.beginPath(); ctx.arc(x + dw - 7, y + 40, 2, 0, TAU); ctx.fill();
  }
  // roof
  if (opts.roof === 'flat') {
    ctx.fillStyle = '#16131d';
    ctx.fillRect(left - 8, top - roofH, w + 16, roofH);
    ctx.fillStyle = '#262234';
    for (let x = left - 8; x < left + w + 8; x += 14) ctx.fillRect(x, top - roofH, 12, 4);
  } else {
    const peakX = left + w / 2, peakY = top - roofH;
    ctx.fillStyle = '#15121c';
    ctx.beginPath(); ctx.moveTo(left - 14, top + 4); ctx.lineTo(peakX, peakY); ctx.lineTo(left + w + 14, top + 4); ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.clip();
    for (let y = peakY + 6, row = 0; y < top + 6; y += 8, row++) {
      const off = row % 2 ? 6 : 0;
      for (let x = left - 20 - off; x < left + w + 20; x += 12) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(x + 6, y + 4, 6.5, 0, Math.PI); ctx.fill();
        ctx.fillStyle = mix('#211d2c', '#2e2a3e', r());
        ctx.beginPath(); ctx.arc(x + 6, y + 2, 6, 0, Math.PI); ctx.fill();
      }
    }
    // moonlight across the left slope
    ctx.fillStyle = 'rgba(150,165,230,0.10)';
    ctx.beginPath(); ctx.moveTo(left - 14, top + 4); ctx.lineTo(peakX, peakY); ctx.lineTo(peakX, top + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0c0a10';
    ctx.fillRect(left - 14, top, w + 28, 5);
    // chimney
    if (opts.chimney !== false) {
      const cx = left + w * 0.7, cw = 18;
      const cy = peakY + roofH * 0.25;
      stoneBlocks(ctx, cx, cy - 26, cw, top - cy + 26, { base: '#2a2432', bw: 9, bh: 6, seed: (opts.seed ?? 1) + 7 });
      ctx.fillStyle = '#0f0d14';
      ctx.fillRect(cx - 3, cy - 30, cw + 6, 5);
    }
  }
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 1);
  shadeBottom(c, 0.75, 0.35);
  return { canvas: c, pad, roofH, top };
}

// ---------------------------------------------------------------
// Props
// ---------------------------------------------------------------
export function paintLamppost() {
  const c = makeCanvas(64, 210);
  const ctx = c.getContext('2d');
  const IRON = '#0e0d13';
  ctx.fillStyle = IRON;
  ctx.fillRect(28, 46, 8, 160);
  ctx.beginPath(); ctx.moveTo(18, 210); ctx.lineTo(22, 192); ctx.lineTo(42, 192); ctx.lineTo(46, 210); ctx.fill();
  ctx.fillRect(24, 178, 16, 6);
  ctx.strokeStyle = IRON; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(22, 56, 8, -0.5, 2.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(42, 56, 8, 0.9, 3.6); ctx.stroke();
  // lantern head: cage and warm glass
  ctx.fillStyle = vgrad(ctx, 14, 44, [[0, '#fff0c0'], [0.5, '#ffb45a'], [1, '#d0702a']]);
  ctx.beginPath(); ctx.moveTo(20, 16); ctx.lineTo(44, 16); ctx.lineTo(40, 44); ctx.lineTo(24, 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = IRON;
  ctx.fillRect(31, 16, 2.5, 28);
  ctx.beginPath(); ctx.moveTo(16, 18); ctx.lineTo(32, 4); ctx.lineTo(48, 18); ctx.closePath(); ctx.fill();
  ctx.fillRect(22, 43, 20, 4);
  ctx.fillRect(30, 0, 4, 6);
  rimLight(c, '#9fb4ff', 0.4, 1, 2, 0.6);
  return c;
}

export function paintCrate() {
  const c = makeCanvas(56, 56);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#211813';
  ctx.fillRect(2, 2, 52, 52);
  for (let y = 2; y < 54; y += 13) { ctx.fillStyle = '#120c09'; ctx.fillRect(2, y, 52, 1.5); }
  ctx.strokeStyle = '#2f231b'; ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 46, 46);
  ctx.beginPath(); ctx.moveTo(7, 49); ctx.lineTo(49, 7); ctx.stroke();
  grain(ctx, 0, 0, 56, 56, 0.08, 4);
  rimLight(c, '#9fb4ff', 0.45, 1, 2, 0.6);
  return c;
}

export function paintBarrel() {
  const c = makeCanvas(44, 56);
  const ctx = c.getContext('2d');
  ctx.fillStyle = vgrad(ctx, 0, 56, [[0, '#2a1f18'], [1, '#160f0c']]);
  ctx.beginPath(); ctx.ellipse(22, 28, 20, 27, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0d0a0a';
  for (const y of [12, 42]) ctx.fillRect(2, y, 40, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let x = 8; x < 40; x += 7) ctx.fillRect(x, 4, 1.2, 48);
  rimLight(c, '#9fb4ff', 0.45, 1, 2, 0.6);
  return c;
}

export function paintCart() {
  const c = makeCanvas(180, 100);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c1511';
  ctx.fillRect(12, 38, 132, 26);
  ctx.fillStyle = '#100b08';
  for (let x = 12; x < 144; x += 22) ctx.fillRect(x, 38, 2, 26);
  ctx.fillRect(140, 54, 40, 5);
  // sacks
  ctx.fillStyle = '#2a2420';
  blob(ctx, [[22, 40], [30, 18], [52, 14], [62, 30], [60, 40]], 0.6); ctx.fill();
  blob(ctx, [[56, 40], [66, 22], [90, 20], [98, 34], [96, 40]], 0.6); ctx.fill();
  // wheels with spokes
  for (const wx of [46, 112]) {
    ctx.strokeStyle = '#140e0b'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(wx, 72, 24, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      ctx.beginPath(); ctx.moveTo(wx, 72); ctx.lineTo(wx + Math.cos(a) * 22, 72 + Math.sin(a) * 22); ctx.stroke();
    }
    ctx.fillStyle = '#140e0b'; ctx.beginPath(); ctx.arc(wx, 72, 5, 0, TAU); ctx.fill();
  }
  rimLight(c, '#9fb4ff', 0.45, 1, 2, 0.7);
  return c;
}

export function paintHaystack() {
  const c = makeCanvas(150, 100);
  const ctx = c.getContext('2d');
  ctx.fillStyle = vgrad(ctx, 0, 100, [[0, '#2c2516'], [1, '#141008']]);
  blob(ctx, [[4, 100], [10, 50], [40, 14], [78, 6], [116, 18], [142, 54], [146, 100]], 0.55);
  ctx.fill();
  const r = rand(3);
  ctx.strokeStyle = 'rgba(120,100,60,0.25)'; ctx.lineWidth = 1;
  for (let i = 0; i < 160; i++) {
    const x = 14 + r() * 122, y = 14 + r() * 80;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 12, y + 4 + r() * 8); ctx.stroke();
  }
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 0.8);
  return c;
}

export function paintFence() {
  const c = makeCanvas(140, 66);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16110f';
  const r = rand(5);
  for (let x = 6; x < 140; x += 30) {
    const lean = (r() - 0.5) * 4;
    ctx.beginPath(); ctx.moveTo(x, 66); ctx.lineTo(x + lean, 6); ctx.lineTo(x + 4 + lean, 2); ctx.lineTo(x + 8 + lean, 6); ctx.lineTo(x + 8, 66); ctx.fill();
  }
  ctx.save(); ctx.translate(0, 22); ctx.rotate(0.02); ctx.fillRect(0, 0, 140, 6); ctx.restore();
  ctx.save(); ctx.translate(0, 44); ctx.rotate(-0.015); ctx.fillRect(0, 0, 140, 6); ctx.restore();
  rimLight(c, '#9fb4ff', 0.45, 1, 2, 0.6);
  return c;
}

export function paintSignpost() {
  const c = makeCanvas(100, 130);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#18120f';
  ctx.save(); ctx.translate(48, 130); ctx.rotate(-0.05); ctx.fillRect(-4, -120, 8, 120); ctx.restore();
  ctx.beginPath(); ctx.moveTo(48, 22); ctx.lineTo(90, 18); ctx.lineTo(98, 28); ctx.lineTo(90, 36); ctx.lineTo(48, 36); ctx.fill();
  ctx.beginPath(); ctx.moveTo(46, 48); ctx.lineTo(10, 52); ctx.lineTo(2, 61); ctx.lineTo(10, 68); ctx.lineTo(46, 64); ctx.fill();
  rimLight(c, '#9fb4ff', 0.45, 1, 2, 0.6);
  return c;
}

export function paintWell() {
  const c = makeCanvas(130, 140);
  const ctx = c.getContext('2d');
  stoneBlocks(ctx, 12, 92, 106, 48, { base: '#2a2834', bw: 22, bh: 12, seed: 3 });
  ctx.fillStyle = '#18120f';
  ctx.fillRect(20, 28, 7, 66); ctx.fillRect(103, 28, 7, 66);
  ctx.fillRect(20, 44, 90, 4);
  ctx.fillStyle = '#15121c';
  ctx.beginPath(); ctx.moveTo(6, 34); ctx.lineTo(65, 4); ctx.lineTo(124, 34); ctx.lineTo(116, 38); ctx.lineTo(65, 12); ctx.lineTo(14, 38); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#3a3036'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(66, 48); ctx.lineTo(66, 72); ctx.stroke();
  ctx.fillStyle = '#1e1612'; ctx.fillRect(58, 72, 16, 14);
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 0.7);
  return c;
}

export function paintLampFrame() {
  const c = makeCanvas(250, 220);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16110f';
  ctx.fillRect(14, 12, 12, 208); ctx.fillRect(224, 12, 12, 208);
  ctx.fillRect(0, 8, 250, 12);
  ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = '#16110f';
  ctx.beginPath(); ctx.moveTo(26, 60); ctx.lineTo(60, 20); ctx.moveTo(224, 60); ctx.lineTo(190, 20); ctx.stroke();
  ctx.restore();
  rimLight(c, '#9fb4ff', 0.45, 1, 2, 0.6);
  return c;
}

export function paintBellTower() {
  const c = makeCanvas(160, 500);
  const ctx = c.getContext('2d');
  stoneBlocks(ctx, 20, 120, 120, 380, { base: '#272532', bw: 30, bh: 16, seed: 8 });
  mottle(ctx, 20, 120, 120, 380, '#0f0d16', 0.45, { seed: 9, cells: 5 });
  // belfry with arches, the bell inside
  ctx.fillStyle = '#0a0910';
  for (const ax of [36, 86]) {
    ctx.beginPath(); ctx.moveTo(ax, 210); ctx.lineTo(ax, 160); ctx.arc(ax + 19, 160, 19, Math.PI, TAU); ctx.lineTo(ax + 38, 210); ctx.fill();
  }
  ctx.fillStyle = vgrad(ctx, 150, 205, [[0, '#6a5434'], [1, '#2c2216']]);
  ctx.beginPath(); ctx.moveTo(72, 156); ctx.quadraticCurveTo(80, 150, 88, 156); ctx.quadraticCurveTo(100, 168, 104, 200); ctx.lineTo(56, 200); ctx.quadraticCurveTo(60, 168, 72, 156); ctx.fill();
  // slit windows and the door recess
  ctx.fillStyle = '#08070c';
  ctx.fillRect(74, 260, 10, 34); ctx.fillRect(74, 340, 10, 34);
  ctx.beginPath(); ctx.moveTo(52, 500); ctx.lineTo(52, 436); ctx.arc(80, 436, 28, Math.PI, TAU); ctx.lineTo(108, 500); ctx.fill();
  // pyramid roof
  ctx.fillStyle = '#14111b';
  ctx.beginPath(); ctx.moveTo(10, 124); ctx.lineTo(80, 10); ctx.lineTo(150, 124); ctx.closePath(); ctx.fill();
  ctx.fillRect(78, 0, 4, 14);
  ctx.fillRect(14, 118, 132, 8);
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 0.8);
  shadeBottom(c, 0.75, 0.4);
  return c;
}

export function paintChapel() {
  const c = makeCanvas(300, 330);
  const ctx = c.getContext('2d');
  stoneBlocks(ctx, 20, 110, 260, 220, { base: '#2a2834', bw: 32, bh: 17, seed: 12 });
  mottle(ctx, 20, 110, 260, 220, '#0f0d16', 0.45, { seed: 13, cells: 6 });
  ctx.fillStyle = '#15121c';
  ctx.beginPath(); ctx.moveTo(6, 116); ctx.lineTo(150, 20); ctx.lineTo(294, 116); ctx.closePath(); ctx.fill();
  // rose window (cold, dark)
  ctx.fillStyle = '#0b0a12'; ctx.beginPath(); ctx.arc(150, 160, 30, 0, TAU); ctx.fill();
  ctx.fillStyle = vgrad(ctx, 132, 190, [[0, '#3a4470'], [1, '#1a1e36']]); ctx.beginPath(); ctx.arc(150, 160, 25, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#0b0a12'; ctx.lineWidth = 2.5;
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(150, 160); ctx.lineTo(150 + Math.cos(a) * 25, 160 + Math.sin(a) * 25); ctx.stroke(); }
  // doorway
  ctx.fillStyle = '#06050a';
  ctx.beginPath(); ctx.moveTo(118, 330); ctx.lineTo(118, 250); ctx.arc(150, 250, 32, Math.PI, TAU); ctx.lineTo(182, 330); ctx.fill();
  ctx.fillStyle = '#1e150f';
  ctx.fillRect(124, 252, 52, 78);
  ctx.fillStyle = '#06050a'; ctx.fillRect(149, 252, 2, 78);
  // little bell-cote
  ctx.fillStyle = '#15121c';
  ctx.fillRect(138, 0, 24, 30);
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 0.8);
  shadeBottom(c, 0.75, 0.4);
  return c;
}

export function paintWindmill() {
  const c = makeCanvas(200, 340);
  const ctx = c.getContext('2d');
  ctx.fillStyle = vgrad(ctx, 60, 340, [[0, '#2a2632'], [1, '#18161f']]);
  ctx.beginPath(); ctx.moveTo(30, 340); ctx.lineTo(60, 70); ctx.lineTo(140, 70); ctx.lineTo(170, 340); ctx.closePath(); ctx.fill();
  mottle(ctx, 0, 60, 200, 280, '#0f0d16', 0.5, { seed: 15, cells: 5 });
  ctx.fillStyle = '#14111b';
  ctx.beginPath(); ctx.moveTo(48, 76); ctx.quadraticCurveTo(100, 20, 152, 76); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#08070c';
  ctx.beginPath(); ctx.moveTo(84, 340); ctx.lineTo(84, 296); ctx.arc(100, 296, 16, Math.PI, TAU); ctx.lineTo(116, 340); ctx.fill();
  ctx.fillStyle = '#ffb062';
  ctx.globalAlpha = 0.85; ctx.fillRect(94, 180, 12, 16); ctx.globalAlpha = 1;
  ctx.fillStyle = '#08070c'; ctx.fillRect(99, 180, 2, 16);
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 0.8);
  return c;
}

export function paintGate() {
  const c = makeCanvas(260, 320);
  const ctx = c.getContext('2d');
  stoneBlocks(ctx, 10, 40, 240, 280, { base: '#2a2834', bw: 30, bh: 16, seed: 18 });
  mottle(ctx, 10, 40, 240, 280, '#0f0d16', 0.4, { seed: 19, cells: 5 });
  for (let x = 10; x < 250; x += 30) { ctx.fillStyle = '#2a2834'; ctx.fillRect(x, 22, 18, 20); }
  // the arch opening (punched out so the sky shows through)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.moveTo(70, 320); ctx.lineTo(70, 170); ctx.arc(130, 170, 60, Math.PI, TAU); ctx.lineTo(190, 320); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // raised portcullis teeth
  ctx.strokeStyle = '#0d0b12'; ctx.lineWidth = 4;
  for (let x = 80; x < 182; x += 14) { ctx.beginPath(); ctx.moveTo(x, 118); ctx.lineTo(x, 146); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(74, 140); ctx.lineTo(186, 140); ctx.stroke();
  // ivy
  const r = rand(7);
  ctx.fillStyle = '#121a16';
  for (let i = 0; i < 70; i++) { const x = 14 + r() * 60, y = 60 + r() * 250; ctx.beginPath(); ctx.ellipse(x, y, 5, 3, r() * 3, 0, TAU); ctx.fill(); }
  rimLight(c, '#9fb4ff', 0.5, 1, 2, 0.8);
  shadeBottom(c, 0.8, 0.35);
  return c;
}

export function paintBigTree(seed = 21) {
  const c = makeCanvas(420, 520);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0911';
  branchTree(ctx, 210, 520, 100, -0.05, 26, 7, rand(seed));
  ctx.beginPath(); ctx.ellipse(210, 520, 40, 12, 0, Math.PI, TAU); ctx.fill();
  rimLight(c, '#9fb4ff', 0.35, 1, 2, 0.8);
  return c;
}

// ---------------------------------------------------------------
// The Hourglass Hall
// ---------------------------------------------------------------
export function paintHallWall(w = 512, h = 720) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  stoneBlocks(ctx, 0, 0, w, h, { base: '#1e1b2a', mortar: '#0d0b13', bw: 64, bh: 32, seed: 31, jitter: 0.18 });
  mottle(ctx, 0, 0, w, h, '#0b0a12', 0.5, { seed: 32, cells: 5 });
  // engaged column at the tile seam
  for (const x of [0, w]) {
    ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#14121d'], [1, '#262234']]);
    ctx.fillRect(x - 26, 0, 52, h);
    ctx.fillStyle = 'rgba(160,170,230,0.08)';
    ctx.fillRect(x - 26, 0, 6, h);
    ctx.fillStyle = '#0c0a12';
    for (let k = -2; k <= 2; k++) ctx.fillRect(x + k * 9, 0, 1.5, h);
  }
  // string course and dado mouldings
  for (const y of [200, 560]) {
    ctx.fillStyle = '#2a2638'; ctx.fillRect(0, y, w, 12);
    ctx.fillStyle = 'rgba(180,190,240,0.12)'; ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = '#0b0a10'; ctx.fillRect(0, y + 12, w, 4);
  }
  // the vault above is lost in darkness
  ctx.fillStyle = vgrad(ctx, 0, h, [[0, 'rgba(4,3,8,0.92)'], [0.3, 'rgba(4,3,8,0.4)'], [0.7, 'rgba(4,3,8,0.1)'], [1, 'rgba(4,3,8,0.35)']]);
  ctx.fillRect(0, 0, w, h);
  grain(ctx, 0, 0, w, h, 0.04, 33);
  return c;
}

export function paintHallBack(w = 1024, h = 720) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0c0a14';
  ctx.fillRect(0, 0, w, h);
  // receding arcade of arches
  for (let i = 0; i < 6; i++) {
    const x = i * (w / 6) + 20, aw = w / 6 - 40;
    ctx.fillStyle = '#06050b';
    ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x, 300); ctx.quadraticCurveTo(x + aw / 2, 170, x + aw, 300); ctx.lineTo(x + aw, h); ctx.fill();
    ctx.fillStyle = 'rgba(120,140,220,0.05)';
    ctx.fillRect(x + aw * 0.2, 330, aw * 0.6, 260);
  }
  ctx.fillStyle = vgrad(ctx, 0, h, [[0, 'rgba(0,0,0,0.85)'], [0.5, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0.5)']]);
  ctx.fillRect(0, 0, w, h);
  return c;
}

export function paintHallWindow() {
  const c = makeCanvas(150, 340);
  const ctx = c.getContext('2d');
  const arch = (inset) => {
    ctx.beginPath();
    ctx.moveTo(10 + inset, 340);
    ctx.lineTo(10 + inset, 120);
    ctx.quadraticCurveTo(10 + inset, 20 + inset, 75, 6 + inset);
    ctx.quadraticCurveTo(140 - inset, 20 + inset, 140 - inset, 120);
    ctx.lineTo(140 - inset, 340);
    ctx.closePath();
  };
  ctx.fillStyle = '#2a2638'; arch(0); ctx.fill();
  ctx.fillStyle = '#0b0a12'; arch(8); ctx.fill();
  ctx.fillStyle = vgrad(ctx, 20, 330, [[0, '#d6e0ff'], [0.4, '#8fa2e0'], [1, '#3e4a86']]);
  arch(14); ctx.fill();
  // tracery
  ctx.strokeStyle = '#0d0b14'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(75, 110); ctx.lineTo(75, 330); ctx.stroke();
  for (const y of [170, 240, 300]) { ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(126, y); ctx.stroke(); }
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(75, 78, 26, 0, TAU); ctx.stroke();
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(75, 78); ctx.lineTo(75 + Math.cos(a) * 26, 78 + Math.sin(a) * 26); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(24, 130); ctx.quadraticCurveTo(50, 100, 75, 110); ctx.quadraticCurveTo(100, 100, 126, 130); ctx.stroke();
  ctx.fillStyle = '#2a2638'; ctx.fillRect(0, 330, 150, 10);
  return c;
}

export function paintBanner() {
  const c = makeCanvas(76, 270);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1116';
  ctx.fillRect(4, 0, 68, 6);
  ctx.fillStyle = vgrad(ctx, 0, 270, [[0, '#3a1420'], [1, '#1e0b12']]);
  ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(68, 6); ctx.lineTo(68, 230); ctx.lineTo(56, 252); ctx.lineTo(44, 236); ctx.lineTo(32, 262); ctx.lineTo(20, 238); ctx.lineTo(8, 250); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#a6843e'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(24, 70); ctx.lineTo(52, 70); ctx.lineTo(38, 100); ctx.lineTo(52, 130); ctx.lineTo(24, 130); ctx.lineTo(38, 100); ctx.closePath(); ctx.stroke();
  ctx.strokeRect(14, 20, 48, 190);
  rimLight(c, '#9fb4ff', 0.3, 1, 2, 0.6);
  return c;
}

export function paintChandelier() {
  const c = makeCanvas(170, 140);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#18141c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(85, 0); ctx.lineTo(85, 60); ctx.stroke();
  for (const x of [20, 150]) { ctx.beginPath(); ctx.moveTo(85, 30); ctx.lineTo(x, 96); ctx.stroke(); }
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(85, 100, 70, 10, 0, 0, TAU); ctx.stroke();
  for (let k = 0; k < 7; k++) {
    const x = 22 + k * 21;
    ctx.fillStyle = '#cbbd9e'; ctx.fillRect(x - 2.5, 76, 5, 20);
  }
  return c;
}

export function paintHourglass() {
  const c = makeCanvas(270, 440);
  const ctx = c.getContext('2d');
  const GOLD1 = '#e2c37a', GOLD2 = '#8a6a32', GOLD3 = '#4a3618';
  const plate = (y) => {
    ctx.fillStyle = vgrad(ctx, y, y + 30, [[0, GOLD1], [0.5, GOLD2], [1, GOLD3]]);
    ctx.beginPath(); ctx.moveTo(10, y + 30); ctx.lineTo(24, y); ctx.lineTo(246, y); ctx.lineTo(260, y + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = GOLD3; ctx.fillRect(18, y + 26, 234, 6);
  };
  // glass bulbs
  const glass = new Path2D();
  glass.moveTo(52, 36);
  glass.bezierCurveTo(52, 150, 126, 186, 130, 220);
  glass.bezierCurveTo(126, 254, 52, 290, 52, 404);
  glass.lineTo(218, 404);
  glass.bezierCurveTo(218, 290, 144, 254, 140, 220);
  glass.bezierCurveTo(144, 186, 218, 150, 218, 36);
  glass.closePath();
  ctx.fillStyle = 'rgba(150,175,230,0.10)';
  ctx.fill(glass);
  // sand: a little left above, a heap below
  ctx.save();
  ctx.clip(glass);
  ctx.fillStyle = vgrad(ctx, 120, 404, [[0, '#e8c372'], [1, '#a07a38']]);
  ctx.beginPath(); ctx.moveTo(60, 170); ctx.quadraticCurveTo(135, 150, 210, 170); ctx.lineTo(210, 200); ctx.lineTo(60, 200); ctx.fill();
  ctx.beginPath(); ctx.moveTo(52, 404); ctx.lineTo(52, 380); ctx.quadraticCurveTo(135, 300, 218, 380); ctx.lineTo(218, 404); ctx.fill();
  ctx.restore();
  // highlights on the glass
  ctx.strokeStyle = 'rgba(220,235,255,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(66, 50); ctx.bezierCurveTo(66, 130, 110, 170, 118, 196); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(66, 390); ctx.bezierCurveTo(66, 320, 100, 280, 116, 252); ctx.stroke();
  ctx.strokeStyle = 'rgba(232,195,114,0.6)'; ctx.lineWidth = 2;
  ctx.stroke(glass);
  // twisted columns
  for (const x of [28, 242]) {
    ctx.fillStyle = vgrad(ctx, 30, 410, [[0, GOLD2], [0.5, GOLD1], [1, GOLD3]]);
    ctx.fillRect(x - 5, 30, 10, 380);
    ctx.strokeStyle = GOLD3; ctx.lineWidth = 1.5;
    for (let y = 40; y < 404; y += 14) { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y + 7); ctx.stroke(); }
  }
  plate(4);
  plate(406);
  return c;
}

export function paintCandelabra() {
  const c = makeCanvas(60, 100);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a4524';
  ctx.fillRect(28, 30, 4, 66);
  ctx.beginPath(); ctx.moveTo(14, 100); ctx.lineTo(30, 86); ctx.lineTo(46, 100); ctx.fill();
  ctx.strokeStyle = '#5a4524'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(10, 30); ctx.quadraticCurveTo(10, 50, 30, 50); ctx.quadraticCurveTo(50, 50, 50, 30); ctx.stroke();
  ctx.fillStyle = '#d8ccb0';
  for (const x of [10, 30, 50]) ctx.fillRect(x - 3, 12, 6, 18);
  return c;
}

// ---------------------------------------------------------------
// Register everything as Phaser textures
// ---------------------------------------------------------------
export function buildScenery(scene) {
  const add = (key, canvas) => addCanvasTexture(scene, key, canvas);
  add('sky_night', paintSky(SKY_NIGHT));
  add('sky_dawn', paintSky(SKY_DAWN));
  add('sky_hall', paintSky(SKY_HALL));
  add('stars', paintStars());
  add('moon', paintMoon());
  add('clouds_a', paintClouds(1024, 300, { seed: 3, cover: 0.55, band: [0.15, 0.7] }));
  add('clouds_b', paintClouds(1024, 240, { seed: 8, color: '#161b3c', light: '#47538a', cover: 0.45, band: [0.3, 0.8] }));
  add('hills_far', paintRidge(2048, 330, { seed: 41, top: 0.42, amp: 0.22, cells: 5, color: '#262f60', fogAlpha: 0.5, trees: 60, treeH: [12, 26] }));
  add('forest_far', paintRidge(2048, 320, { seed: 43, top: 0.6, amp: 0.12, cells: 8, color: '#1a2150', fogAlpha: 0.45, trees: 160, treeH: [26, 60] }));
  add('skyline_far', paintSkyline(2048, 360, { seed: 5, color: '#151b3e', fogAlpha: 0.5, scale: 0.85, windowChance: 0.22 }));
  add('skyline_near', paintSkyline(2048, 420, { seed: 9, color: '#0e1330', fogAlpha: 0.4, scale: 1.3, windowChance: 0.18, spire: false, mill: false }));
  add('trees_mid', paintTreeLine(2048, 480, { seed: 13, color: '#090c20', fogAlpha: 0.38, count: 6, size: 1.2 }));
  add('fog_band', paintFogBand());
  add('fg_grass', paintForegroundGrass());
  add('ground_body', paintGroundBody());
  add('stone_body', paintStoneBody());
  add('hall_stone', paintStoneBody(512, 512, 26, '#1e1b2a'));
  add('wood_body', paintWoodBody());
  add('top_cobble', paintGroundTop(512, 44, 'cobble', 2));
  add('top_grass', paintGroundTop(512, 44, 'grass', 3));
  add('top_flag', paintGroundTop(512, 44, 'flag', 4));
  add('top_marble', paintGroundTop(512, 44, 'marble', 5));
  add('lamppost', paintLamppost());
  add('crate', paintCrate());
  add('barrel', paintBarrel());
  add('cart', paintCart());
  add('haystack', paintHaystack());
  add('fence', paintFence());
  add('signpost', paintSignpost());
  add('well', paintWell());
  add('lampframe', paintLampFrame());
  add('belltower', paintBellTower());
  add('chapel', paintChapel());
  add('windmill', paintWindmill());
  add('gate_arch', paintGate());
  add('tree_big', paintBigTree());
  add('hall_wall', paintHallWall());
  add('hall_back', paintHallBack());
  add('hall_window', paintHallWindow());
  add('banner', paintBanner());
  add('chandelier', paintChandelier());
  add('hourglass', paintHourglass());
  add('candelabra', paintCandelabra());
  add('pillar_fg', paintPillar(90, 980));
}

// Dev preview page
export function previewScenery() {
  const wrap = (c, max = 1440) => {
    if (c.width <= max) return c;
    const s = max / c.width;
    const o = makeCanvas(max, c.height * s);
    o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
    return o;
  };
  // A composed night: sky + layers, to judge how they sit together.
  const W = 1280, H = 720;
  const comp = makeCanvas(W, H);
  const ctx = comp.getContext('2d');
  ctx.drawImage(paintSky(SKY_NIGHT), 0, 0, W, H);
  ctx.drawImage(paintStars(), 0, 0);
  const moon = paintMoon();
  ctx.fillStyle = radial(ctx, 960, 140, 260, [[0, 'rgba(255,220,180,0.25)'], [1, 'rgba(255,220,180,0)']]);
  ctx.fillRect(700, 0, 520, 420);
  ctx.drawImage(moon, 840, 20);
  ctx.drawImage(paintClouds(1024, 300, { seed: 3, cover: 0.55, band: [0.15, 0.7] }), 0, 40, W, 300);
  ctx.drawImage(paintRidge(2048, 330, { seed: 41, top: 0.42, amp: 0.22, cells: 5, color: '#262f60', fogAlpha: 0.5, trees: 60, treeH: [12, 26] }), 0, 250);
  const fog = paintFogBand();
  ctx.globalAlpha = 0.25; ctx.filter = 'none';
  ctx.drawImage(fog, 0, 420, W, 200);
  ctx.globalAlpha = 1;
  ctx.drawImage(paintRidge(2048, 320, { seed: 43, top: 0.6, amp: 0.12, cells: 8, color: '#1a2150', fogAlpha: 0.45, trees: 160, treeH: [26, 60] }), -300, 300);
  ctx.drawImage(paintSkyline(2048, 360, { seed: 5, color: '#151b3e', fogAlpha: 0.5, scale: 0.85, windowChance: 0.22 }), -200, 300);
  ctx.drawImage(paintSkyline(2048, 420, { seed: 9, color: '#0e1330', fogAlpha: 0.4, scale: 1.3, windowChance: 0.18, spire: false, mill: false }), -500, 290);
  ctx.drawImage(paintTreeLine(2048, 480, { seed: 13, color: '#090c20', fogAlpha: 0.38, count: 6, size: 1.2 }), -100, 200);
  const h1 = paintHouse(220, 190, { windows: [[30, 40, false], [150, 40, true], [40, 120, true]], door: [100, 46], seed: 1 });
  const h2 = paintHouse(260, 230, { windows: [[40, 50, false], [190, 50, false], [190, 140, true]], door: [100, 52], seed: 2 });
  ctx.drawImage(paintGroundBody(512, 512), 0, 600, 1280, 160);
  ctx.drawImage(h1.canvas, 120, 600 - h1.canvas.height);
  ctx.drawImage(h2.canvas, 760, 600 - h2.canvas.height);
  ctx.drawImage(paintLamppost(), 560, 600 - 210);
  ctx.drawImage(paintCart(), 400, 600 - 100);
  const top = paintGroundTop(512, 44, 'cobble', 2);
  for (let x = 0; x < W; x += 512) ctx.drawImage(top, x, 596);
  ctx.drawImage(paintForegroundGrass(), 0, H - 130);
  ctx.drawImage(paintForegroundGrass(1024, 130, 19), 1024, H - 130);
  return [
    ['Composed night (static mock-up)', [comp]],
    ['Houses', [h1.canvas, h2.canvas, paintHouse(300, 180, { roof: 'flat', windows: [[60, 50, false], [200, 50, true]], seed: 6 }).canvas]],
    ['Props', [paintLamppost(), paintCrate(), paintBarrel(), paintCart(), paintHaystack(), paintFence(), paintSignpost(), paintWell(), paintLampFrame(), paintBellTower(), paintChapel(), paintWindmill(), paintGate(), paintBigTree()]],
    ['Hall', [wrap(paintHallWall()), paintHallWindow(), paintBanner(), paintChandelier(), paintHourglass(), paintCandelabra(), wrap(paintHallBack(), 700)]],
    ['Ground', [paintGroundTop(512, 44, 'cobble'), paintGroundTop(512, 44, 'grass'), paintGroundTop(512, 44, 'flag'), paintGroundTop(512, 44, 'marble'), wrap(paintGroundBody(512, 256), 512), paintStoneBody(256, 256)]],
    ['Far layers', [wrap(paintRidge(2048, 330, { seed: 41, trees: 60 })), wrap(paintSkyline(2048, 360, { seed: 5 })), wrap(paintTreeLine(2048, 480, { seed: 13 }))]],
  ];
}

// A Hall pillar of any height: base, fluted shaft, capital. Painted on demand.
export function paintPillar(w, h) {
  const c = makeCanvas(w + 28, h);
  const ctx = c.getContext('2d');
  const x0 = 14;
  ctx.fillStyle = '#1c1a28';
  ctx.fillRect(x0 - 12, h - 26, w + 24, 26);
  ctx.fillRect(x0 - 6, h - 40, w + 12, 16);
  ctx.fillStyle = vgrad(ctx, 0, h, [[0, '#211e2e'], [1, '#2a2638']]);
  ctx.fillRect(x0, 50, w, h - 90);
  // fluting: alternating light and dark grooves, lit from the left
  for (let i = 0; i < 5; i++) {
    const fx = x0 + 4 + i * ((w - 8) / 5);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(fx + 3, 54, 3, h - 98);
    ctx.fillStyle = 'rgba(170,180,240,0.07)';
    ctx.fillRect(fx, 54, 2, h - 98);
  }
  ctx.fillStyle = hgradLocal(ctx, x0, x0 + w);
  ctx.fillRect(x0, 50, w, h - 90);
  // capital
  ctx.fillStyle = '#26223a';
  ctx.fillRect(x0 - 10, 30, w + 20, 22);
  ctx.fillStyle = '#1a1726';
  ctx.fillRect(x0 - 14, 18, w + 28, 14);
  ctx.fillRect(x0 - 4, 50, w + 8, 6);
  rimLight(c, '#a8b4ff', 0.35, 1, 2, 0.8);
  grain(ctx, 0, 0, c.width, c.height, 0.04, w + h);
  return c;
}

function hgradLocal(ctx, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, 'rgba(150,160,230,0.10)');
  g.addColorStop(0.35, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  return g;
}
