// THE SHADE: the player. A fragment of a dead man: his outline (spiky hair,
// high-collared trench coat, a trailing scarf) made of ink-black shadow with a
// violet rim, its edges coming apart into thorny wisps. It has no face.
// Faces RIGHT; Phaser flips it for facing left.

import { blob, limb, rimLight } from '../paint.js';
import { TAU, armChain, eyeGlint, foot, gait, placeLegs, rec, standing } from '../rig.js';

const INK = '#07050d';        // the body
const INK_FAR = '#130e22';    // far limbs, a hair lighter so they read as "behind"
const RIM = '#a58bff';
const RIM_DEEP = '#6b47d6';
const VEIN = '#9a6bff';

// ---------------------------------------------------------------
// local brushes
// ---------------------------------------------------------------

// A curved, tapering thorn: the flame-like shadow wisp. Base centred on (x,y),
// pointing along `ang` (canvas radians), bending sideways by `curl`.
function thorn(ctx, x, y, ang, len, w, curl = 0) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const tx = x + dx * len + nx * curl * len * 0.6, ty = y + dy * len + ny * curl * len * 0.6;
  const mx = x + dx * len * 0.5 + nx * curl * len * 0.12, my = y + dy * len * 0.5 + ny * curl * len * 0.12;
  ctx.beginPath();
  ctx.moveTo(x + nx * w / 2, y + ny * w / 2);
  ctx.quadraticCurveTo(mx + nx * w * 0.32, my + ny * w * 0.32, tx, ty);
  ctx.quadraticCurveTo(mx - nx * w * 0.32, my - ny * w * 0.32, x - nx * w / 2, y - ny * w / 2);
  ctx.closePath();
  ctx.fill();
}

// A filled strip along points, tapering from w0 to w1 (w1 = 0 ends in a point).
function ribbon(ctx, pts, w0, w1) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len, w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L.slice(1)) ctx.lineTo(p[0], p[1]);
  for (const p of R.reverse()) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fill();
}

// Tiny drifting shards that have come loose from the body.
function shards(ctx, x, y, t, n, spread, ang, seed) {
  for (let k = 0; k < n; k++) {
    const ph = ((t / TAU) * 1.5 + k * 0.37 + seed * 0.13) % 1;
    const px = x + Math.cos(ang) * ph * spread + Math.sin(k * 2.3 + seed) * 3;
    const py = y + Math.sin(ang) * ph * spread + Math.cos(k * 1.7 + seed) * 3 - ph * 4;
    ctx.globalAlpha = 0.85 * (1 - ph);
    thorn(ctx, px, py, ang + Math.sin(k * 3.1) * 0.8, 2.6 * (1 - ph * 0.5) + 1, 1.4, 0.3);
  }
  ctx.globalAlpha = 1;
}

// Violet light on the painted silhouette: a bright rim from behind-above, a
// deeper one on the front edge, then faint veins inside the ink.
function light(cv, veins) {
  rimLight(cv, RIM, 0.75, 1, 1.2, 0.6);
  rimLight(cv, RIM_DEEP, 0.4, -1, 0.4, 0.5);
  if (!veins.length) return;
  const ctx = cv.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = VEIN;
  ctx.lineCap = 'round';
  for (const [pts, a, w] of veins) {
    ctx.globalAlpha = a;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------
// the pool (merged into the floor)
// ---------------------------------------------------------------
function drawPool(cv, pose, frameIndex) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2;
  const t = pose.t * TAU;
  const w = 32 + Math.sin(t) * 2, hgt = 6 + Math.sin(t * 2) * 1;
  const lean = pose.move ? 5 : 0;
  ctx.fillStyle = INK;

  // the puddle, thin and flat with a low mound where the head sinks in
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    const wave = Math.sin(i * 1.9 + t * 2) * 1.2;
    const bump = Math.exp(-(((i - 10) / 2.4) ** 2)) * (5 + Math.sin(t) * 1);
    pts.push([cx + lean + Math.cos(a) * w, base + Math.sin(a) * (hgt + bump) + wave * 0.5]);
  }
  pts.push([cx + w + 6, base + 2], [cx - w - 8, base + 2]);
  blob(ctx, pts, 0.6);
  ctx.fill();

  // the crown of spiky hair breaking the surface
  const hx = cx + lean + 7, hy = base - hgt - 4 + Math.sin(t) * 0.8;
  ctx.beginPath();
  ctx.ellipse(hx, hy + 2, 7, 4.5, 0, 0, TAU);
  ctx.fill();
  const back = pose.move ? 0.5 : 0;
  for (const [deg, len, wd, cu] of [[195, 8, 4, 0.3], [222, 9, 4.5, 0.2], [250, 8, 4, 0.1], [278, 6, 3.5, -0.2], [312, 5, 3, -0.3]]) {
    const a = (deg * Math.PI) / 180 - back * (deg < 260 ? 0.25 : 0.4);
    thorn(ctx, hx + Math.cos(a) * 4, hy + 1 + Math.sin(a) * 3, a, len, wd, cu + Math.sin(t + deg) * 0.12);
  }

  // edges flicker: little flames rising off the rim, or streaming back when moving
  for (let k = 0; k < 6; k++) {
    const u = (k + 0.5) / 6, x = cx + lean - w + u * w * 2, y = base - 1.5 - Math.sin(u * Math.PI) * (hgt - 1);
    const a = pose.move ? Math.PI + 0.35 + Math.sin(t + k) * 0.15 : -Math.PI / 2 - 0.4 + Math.sin(t * 2 + k) * 0.25;
    const len = (pose.move ? 7 : 4) + ((k * 5) % 3) * 2 + Math.sin(t * 2 + k * 1.3) * 1.5;
    ctx.globalAlpha = 0.9;
    thorn(ctx, x, y, a, len, 2.4, 0.35);
  }
  ctx.globalAlpha = 1;
  if (pose.move) {
    for (let k = 0; k < 3; k++) thorn(ctx, cx - w + 6, base - 1 - k * 2.5, Math.PI + 0.06 * k + Math.sin(t + k) * 0.08, 14 + k * 5, 3 - k * 0.6, 0.25);
    shards(ctx, cx - w - 8, base - 6, t, 4, 16, Math.PI + 0.3, 5);
  } else {
    shards(ctx, cx + lean, base - hgt - 2, t, 3, 12, -Math.PI / 2 - 0.3, 2);
  }

  light(cv, []);
  const ex = hx + 4.5, ey = hy + 3.5;
  ctx.globalAlpha = 0.75;
  eyeGlint(ctx, ex, ey, '#e6dcff', '#9a6bff', 0.9, 1.7);
  ctx.globalAlpha = 0.35;
  eyeGlint(ctx, ex - 4, ey + 0.3, '#cdb8ff', '#9a6bff', 0.7, 1.5);
  ctx.globalAlpha = 1;
  rec('shade', frameIndex, { eye: { x: ex - cx, y: ey - base }, head: { x: hx - cx, y: hy - base } });
}

// ---------------------------------------------------------------
// the standing / moving shadow
// ---------------------------------------------------------------
function drawShade(cv, pose, frameIndex) {
  if (pose.mode === 'merge') { drawPool(cv, pose, frameIndex); return; }
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2;
  const lean = pose.lean ?? 0.06;
  const L1 = 20, L2 = 21, TOR = 26;
  const g = pose.g;
  const legs = placeLegs(g, cx + (pose.dx ?? 0), base, L1, L2, 2, pose.lift ?? 0);
  const { hx, hy } = legs;
  const sx = hx + Math.sin(lean) * TOR, sy = hy - Math.cos(lean) * TOR;
  const headX = sx + Math.sin(lean) * 9 + 1.5, headY = sy - 11;
  const t = (pose.t ?? 0) * TAU;
  const trail = pose.trail ?? 0;          // how far the coat streams back (running, falling)
  const lift = pose.cloakLift ?? 0;       // coat hem raised (falling)
  const veins = [];

  // ---- scarf end, trailing from the back of the collar ----
  ctx.fillStyle = INK;
  {
    const dx0 = -0.42 - trail * 0.6, dy0 = 1 - trail * 0.95 - lift * 0.6;
    const n = Math.hypot(dx0, dy0);
    const sc = [[sx - 3, sy - 5]];
    for (let k = 1; k <= 5; k++) {
      const p = sc[k - 1], seg = 5 + trail * 1.5;
      const wob = Math.sin(t * 1.5 + k * 1.1) * (0.8 + trail * 1.4) * (k / 5);
      sc.push([p[0] + (dx0 / n) * seg - wob * 0.3, p[1] + (dy0 / n) * seg + wob]);
    }
    ribbon(ctx, sc, 5, 0);
    const e = sc[5], e2 = sc[3];
    thorn(ctx, e2[0], e2[1], Math.atan2(dy0, dx0) + 0.5, 7 + trail * 3, 2.4, 0.3);
    shards(ctx, e[0], e[1], t, 2, 10, Math.atan2(dy0, dx0) - 0.2, 1);
  }

  // ---- far arm and far leg ----
  ctx.fillStyle = INK_FAR;
  const af = armChain(sx - 4, sy + 3, g.armFar.up, g.armFar.lo, 14, 13);
  limb(ctx, sx - 4, sy + 3, af.ex, af.ey, 4, 3.2);
  limb(ctx, af.ex, af.ey, af.hx, af.hy, 3.2, 2.2);
  claws(ctx, af.hx, af.hy, g.armFar.lo, 4, t, 0);
  limb(ctx, hx - 1, hy, legs.far.kx, legs.far.ky, 5.6, 4);
  limb(ctx, legs.far.kx, legs.far.ky, legs.far.ax, legs.far.ay, 4, 2.6);
  foot(ctx, legs.far.ax, legs.far.ay, 8, 2.8, legs.far.sh * 0.3);

  // ---- the long coat: back panel flaring at a tattered hem ----
  ctx.fillStyle = INK;
  const hemY = hy + 26 - lift * 12;
  const backX = hx - 13 - trail * 22;
  const tipY = hemY - trail * 13 - lift * 9;
  const frontX = hx + 10 - trail * 3, frontY = hemY - 3 + lift * 2;
  ctx.beginPath();
  ctx.moveTo(sx - 6, sy);
  ctx.quadraticCurveTo(hx - 6 - trail * 4, hy - 8, hx - 5 - trail * 5, hy);
  ctx.quadraticCurveTo(hx - 7 - trail * 12, hy + 14 - lift * 4, backX, tipY);
  const N = 7, hem = [];
  let px = backX, py = tipY;
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    const x = backX + (frontX - backX) * u;
    const y = tipY + (frontY - tipY) * u + Math.sin(t * 1.3 + i * 1.7) * (1 + trail * 2) * (1 - u);
    const tooth = 3 + ((i * 7) % 3) * 1.8 + lift * 2;
    const mx = (px + x) / 2 - trail * 4 - 1, my = Math.max(py, y) + tooth * (1 - trail * 0.4);
    ctx.lineTo(mx, my);
    ctx.lineTo(x, y);
    hem.push([mx, my]);
    px = x; py = y;
  }
  ctx.quadraticCurveTo(hx + 7, hy + 8, hx + 5, hy - 1);
  ctx.lineTo(sx + 5, sy + 3);
  ctx.closePath();
  ctx.fill();
  // the hem tears into wisps
  for (let i = 0; i < hem.length; i += 1) {
    const [x, y] = hem[i];
    if (i % 2 && i < hem.length - 1) continue;
    const a = Math.PI / 2 + 0.45 + trail * 0.95 + lift * 0.6 + Math.sin(t + i * 1.9) * 0.2;
    thorn(ctx, x + 1, y - 1.5, a, 5 + ((i * 3) % 4) * 1.5 + trail * 7, 2.6, 0.35 + Math.sin(t * 1.4 + i) * 0.2);
  }
  // and the flared back corner streams off in curling flames
  for (let k = 0; k < 3; k++) {
    const a = Math.PI - 0.15 - (1 - trail) * 0.9 + k * 0.32 - lift * 0.5 + Math.sin(t * 1.2 + k * 2) * 0.15;
    thorn(ctx, backX + 2, tipY + k * 2.5, a, 8 + trail * 9 + k * 2, 3.2 - k * 0.5, 0.4 - k * 0.25);
  }
  for (let k = 0; k < 2; k++) {
    const u = 0.4 + k * 0.3, bx = hx - 5 - trail * 5 + (backX - hx + 5 + trail * 5) * u, by = hy + (tipY - hy) * u;
    thorn(ctx, bx + 1, by, Math.PI * 0.78 + trail * 0.3 - lift * 0.4 + Math.sin(t + k * 2) * 0.12, 5 + k * 2 + trail * 5, 2.6, 0.45);
  }
  shards(ctx, backX - 3, tipY + 2, t, 4, 16 + trail * 10, Math.PI + 0.35 - lift * 0.6, 3);
  veins.push([[[hx - 4, hy + 4], [hx - 6 - trail * 8, hemY - 4 - trail * 6]], 0.22, 1]);

  // ---- slim torso, coat closed over the chest ----
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(lean);
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.quadraticCurveTo(-4.5, -11, -9.5, -TOR + 2);
  ctx.quadraticCurveTo(0, -TOR - 3, 9, -TOR + 2);
  ctx.quadraticCurveTo(8.5, -TOR + 11, 4.5, -10);
  ctx.quadraticCurveTo(5.5, -3, 5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ---- near leg ----
  limb(ctx, hx + 1, hy, legs.near.kx, legs.near.ky, 6, 4.3);
  limb(ctx, legs.near.kx, legs.near.ky, legs.near.ax, legs.near.ay, 4.3, 2.8);
  foot(ctx, legs.near.ax, legs.near.ay, 8.5, 2.9, legs.near.sh * 0.3);
  thorn(ctx, (legs.near.kx + legs.near.ax) / 2 - 1.5, (legs.near.ky + legs.near.ay) / 2, Math.PI * 0.85 + trail * 0.25, 4 + trail * 3, 2, 0.3);

  // ---- the front panel of the coat, open over the near thigh ----
  ctx.beginPath();
  ctx.moveTo(sx + 5, sy + 4);
  ctx.quadraticCurveTo(hx + 6, hy - 5, hx + 6.5 + trail * 2, hy + 4);
  ctx.lineTo(frontX + 3 + trail * 2, frontY + 2);
  ctx.lineTo(frontX - 1, frontY + 6 - trail * 2);
  ctx.lineTo(frontX - 3, frontY + 1);
  ctx.lineTo(hx + 2, hy + 4);
  ctx.closePath();
  ctx.fill();
  veins.push([[[sx + 4.5, sy + 4], [hx + 6.5, hy + 1], [frontX + 1, frontY + 1]], 0.4, 0.9]);

  // ---- neck and a high, sharp standing collar ----
  limb(ctx, sx + 1, sy - 1, headX - 0.5, headY + 5, 4.5, 4);
  ctx.beginPath();
  ctx.moveTo(sx - 7.5, sy + 2);
  ctx.lineTo(sx - 9.5 - trail * 2, headY - 0.5);
  ctx.quadraticCurveTo(sx - 4, sy - 5, sx - 1, headY + 7);
  ctx.lineTo(sx + 2, headY + 8);
  ctx.quadraticCurveTo(sx + 4.5, sy - 4, sx + 7.5 + Math.sin(lean) * 4, headY + 3.5);
  ctx.quadraticCurveTo(sx + 8.5, sy - 1, sx + 7.5, sy + 4);
  ctx.closePath();
  ctx.fill();
  veins.push([[[sx - 8.5 - trail * 2, headY + 0.5], [sx - 4.5, sy - 2]], 0.35, 0.8]);

  // ---- head: a plain shape, no features, under a mess of spiky hair ----
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(lean * 0.45);
  ctx.beginPath();
  ctx.moveTo(-5.5, -1);
  ctx.quadraticCurveTo(-6, -7.5, 0, -7.5);
  ctx.quadraticCurveTo(5.8, -7.2, 5.6, -1);
  ctx.quadraticCurveTo(5.4, 3.5, 3.5, 6.2);       // jaw
  ctx.quadraticCurveTo(1, 7.6, -2, 6.2);
  ctx.quadraticCurveTo(-5.2, 4, -5.5, -1);
  ctx.closePath();
  ctx.fill();
  // hair: cap + thorny locks; the back ones swept further by wind
  ctx.beginPath();
  ctx.ellipse(-2.2, -3.4, 7.4, 5.6, -0.2, 0, TAU);
  ctx.fill();
  // [direction deg, length, width, curl]; long locks swept back, a short fringe falling forward
  const HAIR = [
    [128, 6, 5, 0.5], [150, 10, 6, 0.4], [172, 12, 6.4, 0.28], [194, 11, 6, 0.2],
    [216, 9, 5.6, 0.05], [240, 6.5, 5, -0.2], [296, 5, 4.6, 0.9], [326, 7, 4.6, 1.0], [352, 7, 4, 0.95], [16, 5, 3.2, 0.7],
  ];
  for (let i = 0; i < HAIR.length; i++) {
    const [deg, len, wd, cu] = HAIR[i];
    const a0 = (deg * Math.PI) / 180;
    const toBack = Math.atan2(Math.sin(Math.PI - a0), Math.cos(Math.PI - a0));   // shortest turn toward "behind"
    const a = a0 + toBack * trail * 0.28;
    const backness = Math.max(0, -Math.cos(a0));
    const r = 4.6;
    thorn(ctx, -1.8 + Math.cos(a) * r, -3.6 + Math.sin(a) * r * 0.8, a, len * (1 + trail * 0.12 * backness), wd, cu + Math.sin(t + i * 1.3) * 0.1);
  }
  ctx.restore();
  shards(ctx, headX - 12 - trail * 4, headY - 6, t, 2, 9, Math.PI + 0.4, 7);
  veins.push([[[headX - 6, headY - 7], [headX - 1, headY - 9.5], [headX + 3, headY - 8.5]], 0.35, 0.9]);

  // ---- near arm, clawed fingertips ----
  ctx.fillStyle = INK;
  const an = armChain(sx + 4, sy + 3.5, g.armNear.up, g.armNear.lo, 14, 13);
  limb(ctx, sx + 4, sy + 3.5, an.ex, an.ey, 4.5, 3.5);
  limb(ctx, an.ex, an.ey, an.hx, an.hy, 3.5, 2.5);
  thorn(ctx, (an.ex + an.hx) / 2 - 1, (an.ey + an.hy) / 2, Math.atan2(Math.cos(g.armNear.lo), Math.sin(g.armNear.lo)) + 2.2, 4.5 + trail * 2, 2, 0.3);
  claws(ctx, an.hx, an.hy, g.armNear.lo, pose.mode === 'strike' ? 9 : 4.5, t, 1);

  light(cv, veins);

  // faint eye glints: the only light in the head, no face
  const eyeX = headX + 3.3, eyeY = headY - 0.6;
  ctx.globalAlpha = 0.6;
  eyeGlint(ctx, eyeX, eyeY, '#d9cbff', '#9a6bff', 0.8, 1.6);
  ctx.globalAlpha = 0.22;
  eyeGlint(ctx, eyeX - 3.4, eyeY + 0.2, '#cdb8ff', '#9a6bff', 0.7, 1.4);
  ctx.globalAlpha = 1;

  if (pose.mode === 'strike') slash(ctx, sx + 4, sy + 3.5, pose.t, an);

  rec('shade', frameIndex, {
    hand: { x: an.hx - cx, y: an.hy - base },
    eye: { x: eyeX - cx, y: eyeY - base },
    head: { x: headX - cx, y: headY - base },
  });
}

// Three pointed fingers continuing the forearm direction.
function claws(ctx, x, y, lo, len, t, seed) {
  const a = Math.atan2(Math.cos(lo), Math.sin(lo));
  ctx.beginPath();
  ctx.ellipse(x, y, 2, 1.6, a, 0, TAU);
  ctx.fill();
  for (let k = -1; k <= 1; k++) thorn(ctx, x, y, a + k * 0.32, len - Math.abs(k) * 1.2 + Math.sin(t + k + seed) * 0.5, 1.6, -k * 0.25);
}

// The violet crescent left by the strike, swept around the shoulder.
function slash(ctx, sx, sy, p, an) {
  const a1 = Math.atan2(an.hy - sy, an.hx - sx);
  const a0 = Math.min(a1 - 0.5, -1.2);
  const R = Math.hypot(an.hx - sx, an.hy - sy) + 8;
  const S = 18;
  const outer = [], inner = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S, a = a0 + (a1 - a0) * u;
    const th = 10 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.8) * (0.4 + u * 0.6) * (1 - p * 0.35);
    outer.push([sx + Math.cos(a) * (R + th * 0.5), sy + Math.sin(a) * (R + th * 0.5)]);
    inner.push([sx + Math.cos(a) * (R - th * 0.5), sy + Math.sin(a) * (R - th * 0.5)]);
  }
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(outer[0][0], outer[0][1]);
    for (const q of outer) ctx.lineTo(q[0], q[1]);
    for (const q of inner.slice().reverse()) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = '#9a6bff';
  ctx.shadowBlur = 8;
  ctx.globalAlpha = 0.85 - p * 0.4;
  ctx.fillStyle = '#7f52ff';
  path();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.9 - p * 0.4;
  ctx.strokeStyle = '#efe6ff';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 4; i <= S; i++) {
    const a = a0 + (a1 - a0) * (i / S);
    const q = [sx + Math.cos(a) * (R + 1.5), sy + Math.sin(a) * (R + 1.5)];
    if (i === 4) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
  }
  ctx.stroke();
  ctx.restore();
}

export const DEFS = {
  shade: {
    w: 104, h: 116, base: 6,
    anims: {
      idle: { n: 8, rate: 7, pose: (t) => ({ g: standing(Math.sin(t * TAU)), t, lean: 0.05 + Math.sin(t * TAU) * 0.015, trail: 0.08 + Math.sin(t * TAU) * 0.04 }) },
      run: { n: 10, rate: 15, pose: (t) => ({ g: gait(t, { amp: 0.72, bend: [0.25, 1.15], armAmp: 0.6, elbow: 0.9 }), t: t * 2, lean: 0.22, trail: 0.85 }) },
      rise: { n: 2, rate: 8, pose: (t) => ({ g: { near: { th: 0.7, bend: 1.3 }, far: { th: -0.1, bend: 0.9 }, armNear: { up: 0.5, lo: 1 }, armFar: { up: -0.5, lo: 0 } }, t, lean: 0.1, trail: 0.4, cloakLift: -0.3, lift: 6 }) },
      fall: { n: 2, rate: 8, pose: (t) => ({ g: { near: { th: 0.25, bend: 0.4 }, far: { th: -0.25, bend: 0.25 }, armNear: { up: 1.0, lo: 1.4 }, armFar: { up: -0.9, lo: -0.6 } }, t, lean: 0.05, trail: 0.5, cloakLift: 1 }) },
      merge: { n: 6, rate: 8, pose: (t) => ({ mode: 'merge', t, move: false }) },
      mergeMove: { n: 6, rate: 12, pose: (t) => ({ mode: 'merge', t, move: true }) },
      // a downward sweep of the clawed hand, leaving a violet crescent
      strike: { n: 5, rate: 26, repeat: 0, pose: (t) => ({ mode: 'strike', g: { near: { th: 0.6, bend: 0.5 }, far: { th: -0.5, bend: 0.2 }, armNear: { up: 2.5 - t * 1.9, lo: 2.3 - t * 1.6 }, armFar: { up: -0.7, lo: -0.4 } }, t, lean: 0.25 + t * 0.15, trail: 0.7 }) },
      dash: { n: 2, rate: 20, smear: true, pose: (t) => ({ g: gait(0.25, { amp: 0.8, bend: [0.3, 1.0], armAmp: 0.7, elbow: 0.8 }), t, lean: 0.35, trail: 1.2 }) },
    },
    draw: (cv, pose, i) => drawShade(cv, pose, i),
  },
};
