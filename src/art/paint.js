// =====================================================================
// PAINT: small shared tools for painting textures with code.
//
// Everything visual in the game is painted onto canvases at boot, then handed
// to Phaser as textures. These helpers are the brushes: seeded noise,
// gradients, tapered limbs, moonlit rims and material grain.
// =====================================================================

// ---------------- seeded randomness ----------------
export function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Value noise that tiles over `period` cells.
export function makeNoise(seed) {
  const r = rand(seed);
  const lattices = new Map();
  return function noise(x, y, period = 256) {
    let lat = lattices.get(period);
    if (!lat) {
      lat = new Float32Array(period * period);
      for (let i = 0; i < period * period; i++) lat[i] = r();
      lattices.set(period, lat);
    }
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const g = (a, b) => lat[((((b % period) + period) % period) * period) + (((a % period) + period) % period)];
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const a = g(xi, yi) + (g(xi + 1, yi) - g(xi, yi)) * sx;
    const b = g(xi, yi + 1) + (g(xi + 1, yi + 1) - g(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export function fbm(noise, x, y, period, octaves = 4) {
  let v = 0, amp = 0.5, total = 0, p = period, scale = 1;
  for (let o = 0; o < octaves; o++) {
    v += noise(x * scale, y * scale, p) * amp;
    total += amp;
    amp *= 0.5; scale *= 2; p *= 2;
  }
  return v / total;
}

// ---------------- canvases and textures ----------------
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
  return tex;
}

export function addCanvasTexture(scene, key, canvas) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  return scene.textures.addCanvas(key, canvas);
}

// ---------------- colours ----------------
export function hex(c) {
  if (typeof c !== 'string') return c;
  const v = parseInt(c.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function rgba(c, a = 1) {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(c1, c2, t) {
  const a = hex(c1), b = hex(c2);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

export function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

export function radial(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

// ---------------- shapes ----------------

// A tapered limb from (x1,y1) width w1 to (x2,y2) width w2, with round ends.
export function limb(ctx, x1, y1, x2, y2, w1, w2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
  ctx.arc(x2, y2, w2 / 2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI);
  ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  ctx.arc(x1, y1, w1 / 2, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI);
  ctx.closePath();
  ctx.fill();
}

// A smooth closed shape through points [[x,y], ...] (Catmull-Rom to Bezier).
export function blob(ctx, pts, tension = 0.5) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1[0] + ((p2[0] - p0[0]) * tension) / 3, c1y = p1[1] + ((p2[1] - p0[1]) * tension) / 3;
    const c2x = p2[0] - ((p3[0] - p1[0]) * tension) / 3, c2y = p2[1] - ((p3[1] - p1[1]) * tension) / 3;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  ctx.closePath();
}

// An open smooth path (for ropes, tails, branches).
export function curve(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
}

// ---------------- light on painted things ----------------

// A solid outline `r` px thick around whatever is painted on `canvas`, padded
// by `r` on every side. Used to mark things you can collide with or burn on.
export function outline(canvas, color, r = 3) {
  const w = canvas.width + r * 2, h = canvas.height + r * 2;
  const o = makeCanvas(w, h);
  const ctx = o.getContext('2d');
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    ctx.drawImage(canvas, r + Math.cos(t) * r, r + Math.sin(t) * r);
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(canvas, r, r);
  return o;
}

// Adds a thin moonlit rim along the top (and a little to the left) of whatever
// is already painted on `canvas`. Works on any silhouette.
export function rimLight(canvas, color, alpha = 0.6, dx = 1, dy = 2, blur = 0.8) {
  const w = canvas.width, h = canvas.height;
  const rim = makeCanvas(w, h);
  const r = rim.getContext('2d');
  r.drawImage(canvas, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = color;
  r.fillRect(0, 0, w, h);
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(canvas, dx, dy);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(rim, 0, 0);
  ctx.restore();
}

// Darkens the bottom of whatever is painted (ground contact, ambient occlusion).
export function shadeBottom(canvas, from = 0.6, alpha = 0.5, color = '#000') {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = vgrad(ctx, canvas.height * from, canvas.height, [[0, rgba(color, 0)], [1, rgba(color, alpha)]]);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Adds fine noise grain to painted pixels (keeps alpha). amount ~ 0.05 - 0.2
export function grain(ctx, x, y, w, h, amount = 0.08, seed = 1) {
  const img = ctx.getImageData(x, y, w, h);
  const r = rand(seed);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (r() - 0.5) * 255 * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, x, y);
}

// Mottled material: blotches of a second colour from fbm noise (stone, plaster, wood).
export function mottle(ctx, x, y, w, h, color, alpha, { seed = 3, cells = 8, contrast = 1.6 } = {}) {
  const img = ctx.getImageData(x, y, w, h);
  const noise = makeNoise(seed);
  const [cr, cg, cb] = hex(color);
  const d = img.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (d[k + 3] === 0) continue;
      let v = fbm(noise, (i / w) * cells, (j / h) * cells * (h / w), cells, 4);
      v = Math.max(0, Math.min(1, (v - 0.5) * contrast + 0.5));
      const a = v * alpha;
      d[k] = d[k] + (cr - d[k]) * a;
      d[k + 1] = d[k + 1] + (cg - d[k + 1]) * a;
      d[k + 2] = d[k + 2] + (cb - d[k + 2]) * a;
    }
  }
  ctx.putImageData(img, x, y);
}

// Packs equally sized frames into one sheet canvas. draw(ctx, index) paints frame i
// into a w x h area at the origin.
export function buildSheet(frameW, frameH, count, draw) {
  const cols = Math.max(1, Math.min(count, Math.floor(4096 / frameW)));
  const rows = Math.ceil(count / cols);
  const sheet = makeCanvas(cols * frameW, rows * frameH);
  const sctx = sheet.getContext('2d');
  for (let i = 0; i < count; i++) {
    const fc = makeCanvas(frameW, frameH);
    draw(fc, i);
    sctx.drawImage(fc, (i % cols) * frameW, Math.floor(i / cols) * frameH);
  }
  return { sheet, cols, rows };
}
