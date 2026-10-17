// =====================================================================
// TEXTURES: every image in the game is painted here with code.
//
// Why procedural art: no copyright risk (the jam disqualifies copied assets),
// nothing to download, and an artist can later replace any key below with a
// real PNG by loading it under the same key in BootScene. Nothing else changes.
//
// Palette (from the design doc): near-monochrome blues and blacks, warm colors
// are rare and mean danger or cost, gold means time and the Entity, violet is
// the player.
// =====================================================================

export const PALETTE = {
  ink: '#05040a',
  shadeBody: '#0c0915',
  violet: '#9a6bff',
  violetSoft: '#6b4bd8',
  ember: '#ff8a3d',
  fire: '#ff5a1f',
  gold: '#e8c372',
  cold: '#9fc6ff',
  stoneDark: '#14131c',
  stone: '#1e1d29',
  wood: '#1c1612',
  fogOrange: '#b98a62',
};

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
  return tex;
}

// Seeded value noise that tiles horizontally and vertically.
function makeNoise(seed) {
  let s = seed >>> 0;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lattices = new Map();
  return function noise(x, y, period) {
    let lat = lattices.get(period);
    if (!lat) {
      lat = [];
      for (let i = 0; i < period * period; i++) lat.push(rand());
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

function fbm(noise, x, y, basePeriod, octaves = 4) {
  let v = 0, amp = 0.5, total = 0, p = basePeriod, scale = 1;
  for (let o = 0; o < octaves; o++) {
    v += noise(x * scale, y * scale, p) * amp;
    total += amp;
    amp *= 0.5; scale *= 2; p *= 2;
  }
  return v / total;
}

function noiseTexture(scene, key, w, h, { seed = 1, cells = 8, octaves = 4, color = [255, 255, 255], contrast = 1, alphaMode = false, base = 0 }) {
  canvasTex(scene, key, w, h, (ctx) => {
    const img = ctx.createImageData(w, h);
    const noise = makeNoise(seed);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = fbm(noise, (x / w) * cells, (y / h) * cells, cells, octaves);
        v = Math.max(0, Math.min(1, (v - 0.5) * contrast + 0.5 + base));
        const i = (y * w + x) * 4;
        if (alphaMode) {
          img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2];
          img.data[i + 3] = Math.round(v * 255);
        } else {
          img.data[i] = Math.round(color[0] * v); img.data[i + 1] = Math.round(color[1] * v);
          img.data[i + 2] = Math.round(color[2] * v); img.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

function radial(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

// ------------------------------------------------------------------
// Character shapes. Each takes a ctx and draws a path; fill is applied later.
// All characters face RIGHT and stand with their feet on the bottom edge.
// ------------------------------------------------------------------

function shadePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(27, 3);
  ctx.quadraticCurveTo(43, 6, 42, 23);
  ctx.quadraticCurveTo(48, 29, 47, 40);
  ctx.quadraticCurveTo(46, 54, 42, 62);
  ctx.quadraticCurveTo(45, 72, 41, 82);
  ctx.quadraticCurveTo(37, 74, 34, 70);
  ctx.quadraticCurveTo(33, 78, 29, 84);
  ctx.quadraticCurveTo(26, 75, 25, 70);
  ctx.quadraticCurveTo(21, 78, 16, 81);
  ctx.quadraticCurveTo(19, 70, 18, 62);
  ctx.quadraticCurveTo(13, 54, 13, 40);
  ctx.quadraticCurveTo(13, 29, 19, 24);
  ctx.quadraticCurveTo(15, 9, 27, 3);
  ctx.closePath();
}

function lanternmanPath(ctx) {
  ctx.beginPath();
  // hat brim
  ctx.moveTo(10, 16); ctx.lineTo(44, 13); ctx.lineTo(42, 18);
  // face and neck jutting forward
  ctx.quadraticCurveTo(40, 26, 36, 30);
  // reaching arm toward the lantern
  ctx.lineTo(50, 40); ctx.lineTo(52, 44); ctx.lineTo(38, 42);
  // coat front
  ctx.quadraticCurveTo(40, 64, 44, 92);
  ctx.lineTo(36, 96); ctx.lineTo(32, 82); ctx.lineTo(26, 96); ctx.lineTo(10, 94);
  // coat back, hunched
  ctx.quadraticCurveTo(6, 64, 8, 40);
  ctx.quadraticCurveTo(6, 28, 16, 20);
  ctx.lineTo(18, 18);
  // hat crown
  ctx.lineTo(19, 6); ctx.lineTo(35, 5); ctx.lineTo(36, 14);
  ctx.closePath();
}

function guardianPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(30, 2); ctx.lineTo(36, 10); // crest
  ctx.quadraticCurveTo(44, 14, 43, 28);   // helm
  ctx.lineTo(48, 34); ctx.lineTo(58, 52); ctx.lineTo(60, 58); ctx.lineTo(50, 56); // lamp arm
  ctx.lineTo(46, 62);
  ctx.quadraticCurveTo(50, 90, 48, 120);
  ctx.lineTo(38, 124); ctx.lineTo(34, 104); ctx.lineTo(28, 124); ctx.lineTo(16, 122);
  ctx.quadraticCurveTo(14, 90, 16, 62);
  ctx.lineTo(10, 40);
  ctx.quadraticCurveTo(14, 30, 20, 28);
  ctx.quadraticCurveTo(18, 12, 30, 2);
  ctx.closePath();
}

function acolytePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(22, 6);
  ctx.quadraticCurveTo(36, 8, 34, 22);
  ctx.quadraticCurveTo(38, 30, 36, 44);
  ctx.quadraticCurveTo(38, 54, 36, 60);
  ctx.lineTo(6, 60);
  ctx.quadraticCurveTo(4, 40, 10, 26);
  ctx.quadraticCurveTo(10, 10, 22, 6);
  ctx.closePath();
}

function marenPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(18, 4);
  ctx.quadraticCurveTo(28, 4, 28, 16);
  ctx.quadraticCurveTo(32, 22, 30, 34);
  ctx.quadraticCurveTo(32, 50, 34, 70);
  ctx.lineTo(4, 70);
  ctx.quadraticCurveTo(6, 50, 6, 34);
  ctx.quadraticCurveTo(4, 22, 9, 16);
  ctx.quadraticCurveTo(8, 4, 18, 4);
  ctx.closePath();
}

function edrinPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(10, 8); ctx.lineTo(28, 6); ctx.lineTo(30, 11); // cap
  ctx.quadraticCurveTo(28, 20, 24, 22);
  ctx.quadraticCurveTo(34, 26, 32, 46); // coat
  ctx.lineTo(28, 48); ctx.lineTo(28, 74); ctx.lineTo(21, 74); ctx.lineTo(19, 52);
  ctx.lineTo(16, 74); ctx.lineTo(9, 74); ctx.lineTo(9, 48); ctx.lineTo(5, 46);
  ctx.quadraticCurveTo(4, 26, 13, 22);
  ctx.quadraticCurveTo(8, 18, 10, 8);
  ctx.closePath();
}

function robedFigurePath(ctx, w, h) {
  // Tall hooded figure used for both the Entity and the statues, so the only
  // difference a sharp player can spot is the missing shadow.
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 4, 4);
  ctx.quadraticCurveTo(cx + 18, 8, cx + 16, 34);
  ctx.quadraticCurveTo(cx + 28, 46, cx + 26, 72);
  ctx.lineTo(cx + 34, 80); ctx.lineTo(cx + 34, 88); ctx.lineTo(cx + 24, 86);
  ctx.quadraticCurveTo(cx + 28, 130, cx + 32, h);
  ctx.lineTo(cx - 32, h);
  ctx.quadraticCurveTo(cx - 28, 120, cx - 26, 70);
  ctx.quadraticCurveTo(cx - 28, 46, cx - 16, 34);
  ctx.quadraticCurveTo(cx - 20, 10, cx - 4, 4);
  ctx.closePath();
}

function wickMotherPath(ctx, w, h) {
  const cx = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 30, 70);
  ctx.quadraticCurveTo(cx, 40, cx + 34, 72);       // head under the crown
  ctx.quadraticCurveTo(cx + 40, 96, cx + 30, 108);
  ctx.quadraticCurveTo(cx + 70, 120, cx + 86, 160); // shoulder to long arm
  ctx.quadraticCurveTo(cx + 96, 240, cx + 108, 300);
  ctx.lineTo(cx + 116, 330); ctx.lineTo(cx + 100, 326); ctx.lineTo(cx + 92, 300);
  ctx.quadraticCurveTo(cx + 70, 220, cx + 56, 190);
  ctx.quadraticCurveTo(cx + 64, 300, cx + 80, h);
  ctx.lineTo(cx + 50, h - 10); ctx.lineTo(cx + 34, h); ctx.lineTo(cx + 10, h - 14); ctx.lineTo(cx - 14, h);
  ctx.lineTo(cx - 40, h - 8); ctx.lineTo(cx - 64, h);
  ctx.quadraticCurveTo(cx - 70, 300, cx - 58, 190);
  ctx.quadraticCurveTo(cx - 76, 230, cx - 96, 300);
  ctx.lineTo(cx - 108, 322); ctx.lineTo(cx - 96, 326); ctx.lineTo(cx - 84, 300);
  ctx.quadraticCurveTo(cx - 70, 200, cx - 60, 150);
  ctx.quadraticCurveTo(cx - 48, 114, cx - 30, 106);
  ctx.quadraticCurveTo(cx - 40, 90, cx - 30, 70);
  ctx.closePath();
}

function figure(scene, key, w, h, pathFn, { fill, rimColor = null, rimSide = 1, rimAlpha = 0.35, grad = null }) {
  canvasTex(scene, key, w, h, (ctx) => {
    pathFn(ctx, w, h);
    if (grad) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      for (const [t, c] of grad) g.addColorStop(t, c);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = fill;
    }
    ctx.fill();
    if (rimColor) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const g = rimSide > 0 ? ctx.createLinearGradient(w, 0, w * 0.45, 0) : ctx.createLinearGradient(0, 0, w * 0.55, 0);
      g.addColorStop(0, rimColor.replace('A', String(rimAlpha)));
      g.addColorStop(1, rimColor.replace('A', '0'));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  });
}

// A blurred copy of a silhouette, padded so the blur is not cut off.
// The padding is stored so sprites can line the glow up with the body.
export const GLOW_PAD = {};
function glowOf(scene, key, w, h, pathFn, color, blur) {
  const p = blur * 3;
  GLOW_PAD[key] = p;
  canvasTex(scene, key, w + p * 2, h + p * 2, (ctx) => {
    ctx.filter = `blur(${blur}px)`;
    ctx.translate(p, p);
    pathFn(ctx, w, h);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

// ------------------------------------------------------------------
// Public: build everything. Called once by BootScene.
// ------------------------------------------------------------------
export function generateTextures(scene) {
  // Basic particles
  canvasTex(scene, 'px', 2, 2, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); });
  canvasTex(scene, 'dot', 32, 32, (ctx) => {
    ctx.fillStyle = radial(ctx, 16, 16, 16, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 32, 32);
  });
  canvasTex(scene, 'spark', 8, 8, (ctx) => {
    ctx.fillStyle = radial(ctx, 4, 4, 4, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 8, 8);
  });
  canvasTex(scene, 'smoke', 48, 48, (ctx) => {
    ctx.fillStyle = radial(ctx, 24, 24, 24, [[0, 'rgba(255,255,255,0.55)'], [0.5, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 48, 48);
  });
  canvasTex(scene, 'softglow', 128, 128, (ctx) => {
    ctx.fillStyle = radial(ctx, 64, 64, 64, [[0, 'rgba(255,255,255,0.9)'], [0.25, 'rgba(255,255,255,0.45)'], [0.6, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 128, 128);
  });

  // ---------------- the player: a shadow ----------------
  figure(scene, 'shade', 60, 84, shadePath, {
    grad: [[0, '#120d1f'], [0.55, 'rgba(10,7,18,0.97)'], [0.85, 'rgba(10,7,18,0.75)'], [1, 'rgba(10,7,18,0.25)']],
  });
  glowOf(scene, 'shade_rim', 60, 84, shadePath, '#ffffff', 3);
  canvasTex(scene, 'shade_eyes', 20, 8, (ctx) => {
    ctx.shadowColor = '#c7a8ff'; ctx.shadowBlur = 4;
    ctx.fillStyle = '#efe4ff';
    ctx.beginPath(); ctx.ellipse(5, 4, 3, 1.3, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14, 4, 3, 1.3, 0.2, 0, Math.PI * 2); ctx.fill();
  });

  // ---------------- watchers ----------------
  figure(scene, 'lanternman', 56, 96, lanternmanPath, { fill: '#0d0a0c', rimColor: 'rgba(255,140,60,A)', rimAlpha: 0.45 });
  figure(scene, 'guardian', 64, 124, guardianPath, { fill: '#0c0e14', rimColor: 'rgba(232,195,114,A)', rimAlpha: 0.4 });
  figure(scene, 'acolyte', 42, 60, acolytePath, { fill: '#0e0c12', rimColor: 'rgba(255,140,60,A)', rimAlpha: 0.25 });
  canvasTex(scene, 'lantern', 18, 28, (ctx) => {
    ctx.fillStyle = '#1a1310'; ctx.fillRect(7, 0, 4, 4);
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(2, 4, 14, 3); ctx.fillRect(2, 24, 14, 3);
    ctx.fillStyle = radial(ctx, 9, 15, 9, [[0, '#fff3c8'], [0.4, '#ffb85a'], [1, 'rgba(255,120,40,0.2)']]);
    ctx.fillRect(3, 7, 12, 17);
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(2, 7, 2, 17); ctx.fillRect(14, 7, 2, 17); ctx.fillRect(8, 7, 2, 17);
  });
  canvasTex(scene, 'glint', 12, 6, (ctx) => {
    ctx.shadowColor = '#ffb060'; ctx.shadowBlur = 3; ctx.fillStyle = '#ffe0a0';
    ctx.fillRect(2, 2, 3, 2); ctx.fillRect(7, 2, 3, 2);
  });
  canvasTex(scene, 'glint_cold', 12, 6, (ctx) => {
    ctx.shadowColor = '#e8c372'; ctx.shadowBlur = 3; ctx.fillStyle = '#fff2c8';
    ctx.fillRect(2, 2, 3, 2); ctx.fillRect(7, 2, 3, 2);
  });

  // ---------------- survivors ----------------
  figure(scene, 'maren', 36, 70, marenPath, { grad: [[0, '#4d3d33'], [0.25, '#3a2c2c'], [1, '#2a1f24']] });
  figure(scene, 'edrin', 36, 74, edrinPath, { grad: [[0, '#2c2a26'], [0.3, '#34402f'], [1, '#22261f']] });
  glowOf(scene, 'maren_rim', 36, 70, marenPath, '#ffffff', 3);
  glowOf(scene, 'edrin_rim', 36, 74, edrinPath, '#ffffff', 3);

  // ---------------- the Wick-Mother ----------------
  figure(scene, 'wickmother', 240, 400, wickMotherPath, { fill: '#0b0807', rimColor: 'rgba(255,120,50,A)', rimAlpha: 0.4 });
  canvasTex(scene, 'wick_crown', 120, 70, (ctx) => {
    ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(60, 52, 50, 14, 0, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const x = 16 + i * 14.5, top = 18 + Math.abs(3 - i) * 4;
      ctx.fillStyle = '#d9c7a4'; ctx.fillRect(x - 3, top, 6, 50 - top);
      ctx.fillStyle = radial(ctx, x, top - 6, 9, [[0, '#fff6d0'], [0.4, '#ffb04a'], [1, 'rgba(255,90,30,0)']]);
      ctx.fillRect(x - 9, top - 16, 18, 20);
    }
  });

  // ---------------- the Entity and the statues ----------------
  figure(scene, 'entity', 90, 180, robedFigurePath, {
    grad: [[0, '#2b2117'], [0.5, '#1a140f'], [1, 'rgba(20,15,11,0.6)']],
    rimColor: 'rgba(232,195,114,A)', rimSide: 1, rimAlpha: 0.5,
  });
  glowOf(scene, 'entity_rim', 90, 180, robedFigurePath, '#e8c372', 6);
  figure(scene, 'statue', 90, 180, robedFigurePath, { grad: [[0, '#3a3842'], [1, '#22212a']] });

  // ---------------- props ----------------
  canvasTex(scene, 'stillpoint', 40, 64, (ctx) => {
    ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 10;
    const g = ctx.createLinearGradient(0, 0, 40, 64);
    g.addColorStop(0, '#f2f8ff'); g.addColorStop(0.5, '#9fc6ff'); g.addColorStop(1, '#5a7fc4');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(34, 30); ctx.lineTo(20, 60); ctx.lineTo(6, 30); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(20, 8); ctx.lineTo(26, 30); ctx.lineTo(20, 34); ctx.closePath(); ctx.fill();
  });
  canvasTex(scene, 'sand', 16, 16, (ctx) => {
    ctx.fillStyle = radial(ctx, 8, 8, 8, [[0, '#fff4cf'], [0.35, '#e8c372'], [1, 'rgba(232,195,114,0)']]);
    ctx.fillRect(0, 0, 16, 16);
  });
  canvasTex(scene, 'hourshard', 26, 40, (ctx) => {
    ctx.shadowColor = '#ffe6a8'; ctx.shadowBlur = 8;
    const g = ctx.createLinearGradient(0, 0, 26, 40);
    g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#c9953f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(13, 3); ctx.lineTo(22, 14); ctx.lineTo(13, 37); ctx.lineTo(4, 14); ctx.closePath(); ctx.fill();
  });
  canvasTex(scene, 'portal', 140, 200, (ctx) => {
    const flame = (s, color) => {
      ctx.beginPath();
      ctx.moveTo(70, 200 - 196 * s);
      ctx.bezierCurveTo(70 + 70 * s, 200 - 120 * s, 70 + 60 * s, 200 - 20 * s, 70, 198);
      ctx.bezierCurveTo(70 - 60 * s, 200 - 20 * s, 70 - 70 * s, 200 - 120 * s, 70, 200 - 196 * s);
      ctx.fillStyle = color; ctx.fill();
    };
    ctx.filter = 'blur(6px)'; flame(0.95, 'rgba(232,195,114,0.5)');
    ctx.filter = 'blur(2px)'; flame(0.8, 'rgba(255,214,140,0.65)');
    ctx.filter = 'none'; flame(0.62, 'rgba(30,18,40,0.95)');
    flame(0.45, 'rgba(10,6,16,1)');
  });
  canvasTex(scene, 'gate_arch', 200, 260, (ctx) => {
    ctx.fillStyle = '#16151d';
    ctx.fillRect(0, 60, 36, 200); ctx.fillRect(164, 60, 36, 200);
    ctx.beginPath(); ctx.moveTo(0, 70); ctx.quadraticCurveTo(100, -30, 200, 70); ctx.lineTo(200, 90);
    ctx.quadraticCurveTo(100, 0, 0, 90); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23222c'; ctx.fillRect(4, 100, 4, 160); ctx.fillRect(192, 100, 4, 160);
  });
  canvasTex(scene, 'bell', 64, 72, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, '#3c2f1e'); g.addColorStop(0.5, '#7a6242'); g.addColorStop(1, '#2c2216');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(26, 6); ctx.quadraticCurveTo(32, 0, 38, 6); ctx.quadraticCurveTo(52, 12, 52, 40);
    ctx.quadraticCurveTo(54, 56, 62, 62); ctx.lineTo(2, 62); ctx.quadraticCurveTo(10, 56, 12, 40);
    ctx.quadraticCurveTo(12, 12, 26, 6); ctx.fill();
    ctx.fillStyle = '#1a140d'; ctx.beginPath(); ctx.arc(32, 64, 6, 0, Math.PI * 2); ctx.fill();
  });
  canvasTex(scene, 'hourglass', 220, 360, (ctx) => {
    ctx.fillStyle = '#3a2c18';
    ctx.fillRect(10, 0, 200, 22); ctx.fillRect(10, 338, 200, 22);
    ctx.fillRect(18, 22, 12, 316); ctx.fillRect(190, 22, 12, 316);
    const glass = ctx.createLinearGradient(40, 0, 180, 0);
    glass.addColorStop(0, 'rgba(160,190,230,0.10)'); glass.addColorStop(0.5, 'rgba(200,220,255,0.22)'); glass.addColorStop(1, 'rgba(160,190,230,0.08)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(40, 24); ctx.bezierCurveTo(40, 120, 100, 150, 104, 180); ctx.bezierCurveTo(100, 210, 40, 240, 40, 336);
    ctx.lineTo(180, 336); ctx.bezierCurveTo(180, 240, 120, 210, 116, 180); ctx.bezierCurveTo(120, 150, 180, 120, 180, 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(232,195,114,0.5)'; ctx.lineWidth = 2; ctx.stroke();
  });

  // Lamp post, crate, barrel, cart, haystack, fence, signpost, well
  canvasTex(scene, 'lamppost', 40, 180, (ctx) => {
    ctx.fillStyle = '#121016';
    ctx.fillRect(17, 20, 6, 160); ctx.fillRect(10, 174, 20, 6);
    ctx.fillRect(10, 18, 20, 4); ctx.fillRect(12, 8, 16, 12);
  });
  canvasTex(scene, 'crate', 48, 48, (ctx) => {
    ctx.fillStyle = '#1d1712'; ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#2c231a'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, 44, 44);
    ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(44, 44); ctx.stroke();
  });
  canvasTex(scene, 'barrel', 36, 48, (ctx) => {
    ctx.fillStyle = '#1c1611';
    ctx.beginPath(); ctx.ellipse(18, 24, 17, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2219'; ctx.fillRect(1, 12, 34, 3); ctx.fillRect(1, 33, 34, 3);
  });
  canvasTex(scene, 'cart', 150, 80, (ctx) => {
    ctx.fillStyle = '#17120e'; ctx.fillRect(10, 14, 120, 34);
    ctx.fillRect(126, 30, 24, 4);
    ctx.strokeStyle = '#17120e'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(40, 56, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(100, 56, 20, 0, Math.PI * 2); ctx.stroke();
  });
  canvasTex(scene, 'haystack', 130, 90, (ctx) => {
    ctx.fillStyle = '#1d1810';
    ctx.beginPath(); ctx.moveTo(0, 90); ctx.quadraticCurveTo(10, 10, 65, 4); ctx.quadraticCurveTo(122, 10, 130, 90); ctx.closePath(); ctx.fill();
  });
  canvasTex(scene, 'fence', 120, 60, (ctx) => {
    ctx.fillStyle = '#141116';
    for (let x = 4; x < 120; x += 28) { ctx.fillRect(x, 4, 7, 56); ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 3.5, 0); ctx.lineTo(x + 7, 4); ctx.fill(); }
    ctx.fillRect(0, 18, 120, 5); ctx.fillRect(0, 40, 120, 5);
  });
  canvasTex(scene, 'signpost', 80, 110, (ctx) => {
    ctx.fillStyle = '#17120e'; ctx.fillRect(36, 10, 8, 100);
    ctx.beginPath(); ctx.moveTo(40, 18); ctx.lineTo(78, 18); ctx.lineTo(70, 30); ctx.lineTo(40, 30); ctx.fill();
    ctx.beginPath(); ctx.moveTo(40, 44); ctx.lineTo(2, 44); ctx.lineTo(10, 56); ctx.lineTo(40, 56); ctx.fill();
  });
  canvasTex(scene, 'well', 110, 110, (ctx) => {
    ctx.fillStyle = '#16141b'; ctx.fillRect(10, 60, 90, 50);
    ctx.fillRect(14, 10, 6, 52); ctx.fillRect(90, 10, 6, 52);
    ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(55, 0); ctx.lineTo(106, 14); ctx.lineTo(100, 18); ctx.lineTo(55, 6); ctx.lineTo(10, 18); ctx.fill();
  });
  canvasTex(scene, 'gallows', 220, 200, (ctx) => {
    ctx.fillStyle = '#141015';
    ctx.fillRect(10, 10, 10, 190); ctx.fillRect(200, 10, 10, 190); ctx.fillRect(0, 6, 220, 10);
  });
  canvasTex(scene, 'chain_lamp', 16, 24, (ctx) => {
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(1, 2, 14, 3); ctx.fillRect(1, 20, 14, 3);
    ctx.fillStyle = radial(ctx, 8, 12, 8, [[0, '#fff3c8'], [0.5, '#ffb85a'], [1, 'rgba(255,120,40,0.3)']]);
    ctx.fillRect(2, 5, 12, 15);
  });
  canvasTex(scene, 'wheel_hub', 40, 40, (ctx) => {
    ctx.fillStyle = '#18130f'; ctx.beginPath(); ctx.arc(20, 20, 18, 0, Math.PI * 2); ctx.fill();
  });
  canvasTex(scene, 'candle', 10, 24, (ctx) => {
    ctx.fillStyle = '#cbbd9e'; ctx.fillRect(3, 8, 4, 16);
    ctx.fillStyle = radial(ctx, 5, 5, 5, [[0, '#fff7d6'], [0.5, '#ffb04a'], [1, 'rgba(255,100,30,0)']]);
    ctx.fillRect(0, 0, 10, 10);
  });

  // HUD icons
  // A Thread: a taut strand with a knot at the top. A cut one hangs in two pieces.
  canvasTex(scene, 'icon_thread', 20, 34, (ctx) => {
    ctx.strokeStyle = '#efe2c6'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(13, 19, 10, 32); ctx.stroke();
    ctx.fillStyle = '#e8c372'; ctx.beginPath(); ctx.arc(10, 5, 3.5, 0, Math.PI * 2); ctx.fill();
  });
  canvasTex(scene, 'icon_thread_cut', 20, 34, (ctx) => {
    ctx.strokeStyle = 'rgba(239,226,198,0.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(12, 11, 9, 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, 22); ctx.quadraticCurveTo(12, 28, 9, 32); ctx.stroke();
    ctx.fillStyle = 'rgba(232,195,114,0.3)'; ctx.beginPath(); ctx.arc(10, 5, 3.5, 0, Math.PI * 2); ctx.fill();
  });
  canvasTex(scene, 'icon_sand', 18, 26, (ctx) => {
    ctx.strokeStyle = '#e8c372'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(16, 2); ctx.lineTo(9, 13); ctx.lineTo(16, 24); ctx.lineTo(2, 24); ctx.lineTo(9, 13); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#e8c372'; ctx.beginPath(); ctx.moveTo(5, 23); ctx.lineTo(13, 23); ctx.lineTo(9, 17); ctx.fill();
  });
  canvasTex(scene, 'icon_sand_empty', 18, 26, (ctx) => {
    ctx.strokeStyle = 'rgba(232,195,114,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(16, 2); ctx.lineTo(9, 13); ctx.lineTo(16, 24); ctx.lineTo(2, 24); ctx.lineTo(9, 13); ctx.closePath(); ctx.stroke();
  });
  // Light state glyphs: shape, not just color (accessibility rule from the doc).
  canvasTex(scene, 'glyph_shade', 28, 28, (ctx) => {
    ctx.fillStyle = '#9a6bff';
    ctx.beginPath(); ctx.arc(14, 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(19, 11, 9, 0, Math.PI * 2); ctx.fill();
  });
  canvasTex(scene, 'glyph_dim', 28, 28, (ctx) => {
    ctx.strokeStyle = '#c8b8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(14, 14, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#c8b8ff'; ctx.beginPath(); ctx.arc(14, 14, 9, -Math.PI / 2, Math.PI / 2); ctx.fill();
  });
  canvasTex(scene, 'glyph_light', 28, 28, (ctx) => {
    ctx.fillStyle = '#ff8a3d'; ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(14, 14, 6, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath(); ctx.moveTo(14 + Math.cos(a) * 9, 14 + Math.sin(a) * 9); ctx.lineTo(14 + Math.cos(a) * 13, 14 + Math.sin(a) * 13); ctx.stroke();
    }
  });

  // ---------------- surfaces ----------------
  noiseTexture(scene, 'tex_stone', 256, 256, { seed: 3, cells: 6, color: [40, 38, 54], contrast: 1.6 });
  noiseTexture(scene, 'tex_earth', 256, 256, { seed: 5, cells: 5, color: [34, 28, 30], contrast: 1.4 });
  noiseTexture(scene, 'tex_wood', 256, 128, { seed: 9, cells: 4, color: [40, 30, 24], contrast: 1.3 });
  noiseTexture(scene, 'fog', 512, 256, { seed: 21, cells: 4, octaves: 5, color: [255, 255, 255], contrast: 2.0, alphaMode: true, base: -0.05 });
  noiseTexture(scene, 'fog2', 512, 256, { seed: 33, cells: 3, octaves: 4, color: [255, 255, 255], contrast: 2.2, alphaMode: true, base: -0.1 });

  // ---------------- skies and parallax ----------------
  canvasTex(scene, 'sky_night', 64, 720, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#2c3c78'); g.addColorStop(0.45, '#3e4a86'); g.addColorStop(0.75, '#8a6478'); g.addColorStop(1, '#e8a676');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 720);
  });
  canvasTex(scene, 'sky_dawn', 64, 720, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#5c7fb8'); g.addColorStop(0.55, '#e0a37a'); g.addColorStop(0.85, '#ffd49a'); g.addColorStop(1, '#fff0c8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 720);
  });
  canvasTex(scene, 'sky_hall', 64, 720, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 720);
    g.addColorStop(0, '#1c1830'); g.addColorStop(0.6, '#2e2842'); g.addColorStop(1, '#3a3046');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 720);
  });
  canvasTex(scene, 'moon', 160, 160, (ctx) => {
    ctx.fillStyle = radial(ctx, 80, 80, 80, [[0, 'rgba(255,240,220,0.9)'], [0.22, 'rgba(255,230,200,0.85)'], [0.26, 'rgba(255,210,170,0.25)'], [1, 'rgba(255,200,150,0)']]);
    ctx.fillRect(0, 0, 160, 160);
  });
  canvasTex(scene, 'stars', 512, 300, (ctx) => {
    let s = 77;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = `rgba(220,230,255,${0.2 + r() * 0.6})`;
      const z = r() < 0.9 ? 1 : 2;
      ctx.fillRect(Math.floor(r() * 512), Math.floor(r() * 300), z, z);
    }
  });
  // Distant hills with a soft top edge
  canvasTex(scene, 'para_hills', 1024, 300, (ctx) => {
    const noise = makeNoise(41);
    ctx.fillStyle = '#2a3260';
    ctx.beginPath(); ctx.moveTo(0, 300);
    for (let x = 0; x <= 1024; x += 8) ctx.lineTo(x, 120 + fbm(noise, (x / 1024) * 4, 0.5, 4, 3) * 140);
    ctx.lineTo(1024, 300); ctx.closePath(); ctx.fill();
  });
  // Far village rooftops with a few lit windows
  canvasTex(scene, 'para_village', 1024, 300, (ctx) => {
    let s = 5;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = '#1a1d38';
    let x = 0;
    while (x < 1024) {
      const w = 50 + r() * 70, h = 60 + r() * 90;
      const top = 300 - h;
      ctx.fillRect(x, top, w, h);
      ctx.beginPath(); ctx.moveTo(x - 6, top); ctx.lineTo(x + w / 2, top - 30 - r() * 20); ctx.lineTo(x + w + 6, top); ctx.fill();
      if (r() < 0.5) { ctx.fillRect(x + w * 0.7, top - 40, 8, 30); }
      if (r() < 0.35) {
        ctx.fillStyle = 'rgba(255,170,90,0.85)'; ctx.fillRect(x + w * 0.3, top + 20, 6, 8); ctx.fillStyle = '#1a1d38';
      }
      x += w + r() * 30;
    }
    // church spire
    ctx.fillRect(600, 60, 30, 240); ctx.beginPath(); ctx.moveTo(596, 60); ctx.lineTo(615, 0); ctx.lineTo(634, 60); ctx.fill();
  });
  canvasTex(scene, 'para_trees', 1024, 300, (ctx) => {
    let s = 13;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = '#0f1224';
    for (let i = 0; i < 26; i++) {
      const x = r() * 1024, h = 120 + r() * 150, w = 30 + r() * 40;
      ctx.beginPath(); ctx.moveTo(x - w, 300); ctx.lineTo(x, 300 - h); ctx.lineTo(x + w, 300); ctx.fill();
      ctx.fillRect(x - 3, 280, 6, 20);
    }
    ctx.fillRect(0, 285, 1024, 15);
  });
  // The Hourglass Hall's back wall: tall arches
  canvasTex(scene, 'para_hall', 512, 720, (ctx) => {
    ctx.fillStyle = '#2a2640'; ctx.fillRect(0, 0, 512, 720);
    for (let i = 0; i < 2; i++) {
      const x = 60 + i * 256;
      ctx.fillStyle = '#16131f';
      ctx.fillRect(x, 230, 136, 490);
      ctx.beginPath(); ctx.arc(x + 68, 230, 68, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#3a3454';
      ctx.fillRect(x - 24, 150, 18, 570); ctx.fillRect(x + 142, 150, 18, 570);
    }
    ctx.fillStyle = '#3e3858'; ctx.fillRect(0, 140, 512, 14);
  });
}

// House facades are sized per level, so they are generated on demand.
// opts: { windows: [[x, y, lit]], door: [x, w], roof: 'gable'|'flat', seed }
export function houseTexture(scene, w, h, opts = {}) {
  const key = `house_${w}x${h}_${opts.roof ?? 'gable'}_${opts.seed ?? 0}`;
  if (scene.textures.exists(key)) return key;
  const roofH = opts.roof === 'flat' ? 0 : Math.min(90, w * 0.35);
  canvasTex(scene, key, w + 20, h + roofH + 10, (ctx) => {
    const top = roofH + 10;
    const wall = ctx.createLinearGradient(0, top, 0, top + h);
    wall.addColorStop(0, '#1a1824'); wall.addColorStop(1, '#121019');
    ctx.fillStyle = wall;
    ctx.fillRect(10, top, w, h);
    // timber frame
    ctx.strokeStyle = '#0c0b10'; ctx.lineWidth = 5;
    ctx.strokeRect(12, top + 2, w - 4, h - 4);
    ctx.beginPath(); ctx.moveTo(10, top + h * 0.45); ctx.lineTo(10 + w, top + h * 0.45); ctx.stroke();
    if (opts.roof !== 'flat') {
      ctx.fillStyle = '#0d0c13';
      ctx.beginPath(); ctx.moveTo(0, top + 6); ctx.lineTo(10 + w / 2, 10); ctx.lineTo(w + 20, top + 6); ctx.closePath(); ctx.fill();
      ctx.fillRect(10 + w * 0.72, 4, 16, top * 0.7);
    } else {
      ctx.fillStyle = '#0d0c13'; ctx.fillRect(4, top - 8, w + 12, 12);
    }
    for (const [wx, wy, lit] of opts.windows ?? []) {
      ctx.fillStyle = lit ? '#ffb46a' : '#07070b';
      ctx.fillRect(10 + wx, top + wy, 22, 28);
      ctx.fillStyle = '#0c0b10'; ctx.fillRect(10 + wx + 10, top + wy, 2, 28); ctx.fillRect(10 + wx, top + wy + 13, 22, 2);
    }
    if (opts.door) {
      ctx.fillStyle = '#060509';
      ctx.fillRect(10 + opts.door[0], top + h - 70, opts.door[1], 70);
    }
  });
  return key;
}
