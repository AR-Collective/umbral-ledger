// THE WICK-MOTHER: Hollowmere's climax, the giant that wakes at dawn.
// A towering scarecrow effigy: a stitched burlap sack stuffed with wax and
// wicks, an iron-caged face, a hanging jaw full of jagged teeth with fire in
// its throat, a mantle of black blades and candles jammed into her hump.
// Faces RIGHT (she chases the player from the left).

import { blob, grain, limb, mottle, rand, rimLight, shadeBottom, vgrad } from '../paint.js';
import { TAU, eyeGlint, placeLegs, rec } from '../rig.js';

const SACK = '#5e4a35', SACK_L = '#7d6649', SACK_D = '#33271b', PATCH = '#4b3d2b', PATCH2 = '#6a5034';
const IRON = '#120e0c', WOOD = '#20170f', WRAP = '#4a3a29', BONE = '#d8c9a0', BONE_D = '#8f7c5a';
const THREAD = '#1a120b', WAX = '#d6c497', WAX_D = '#9a8460';

// (x, y) in a rotated local frame -> world (canvas) coords
const frame = (ox, oy, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return (x, y) => [ox + x * c - y * s, oy + x * s + y * c];
};

// A blade/tooth/claw: leaves `b` along screen angle `ang`, hooks by `hook` radians at the tip.
function blade(ctx, bx, by, ang, len, w, hook = 0) {
  const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
  const tx = bx + Math.cos(ang + hook) * len, ty = by + Math.sin(ang + hook) * len;
  const cx = bx + dx * len * 0.62, cy = by + dy * len * 0.62;
  const side = hook >= 0 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(bx - px * w / 2, by - py * w / 2);
  ctx.quadraticCurveTo(cx - px * w * 0.45 * side, cy - py * w * 0.45 * side, tx, ty);
  ctx.quadraticCurveTo(cx + px * w * 0.2 * side, cy + py * w * 0.2 * side, bx + px * w / 2, by + py * w / 2);
  ctx.closePath();
  ctx.fill();
  return [tx, ty];
}

// A stitched seam: faint thread line with cross ticks.
function stitches(ctx, pts, every = 7, tick = 3.2) {
  ctx.save();
  ctx.strokeStyle = THREAD; ctx.lineCap = 'round';
  ctx.lineWidth = 1.1; ctx.globalAlpha = 0.85;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    for (let d = every / 2; d < len; d += every) {
      const x = x1 + (x2 - x1) * d / len, y = y1 + (y2 - y1) * d / len;
      ctx.beginPath(); ctx.moveTo(x - nx * tick - (x2 - x1) / len, y - ny * tick - (y2 - y1) / len);
      ctx.lineTo(x + nx * tick + (x2 - x1) / len, y + ny * tick + (y2 - y1) / len); ctx.stroke();
    }
  }
  ctx.restore();
}

// Burlap weave hatching inside the current clip.
function weave(ctx, x0, y0, x1, y1) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(20,12,6,0.22)';
  for (let x = x0; x < x1; x += 3) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(160,130,90,0.10)';
  for (let y = y0; y < y1; y += 3) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  ctx.restore();
}

// A rag-wrapped stick limb segment.
function wrapped(ctx, x1, y1, x2, y2, w1, w2, bands, seed) {
  ctx.fillStyle = WOOD;
  limb(ctx, x1, y1, x2, y2, w1, w2);
  const r = rand(seed);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  ctx.strokeStyle = WRAP; ctx.lineCap = 'butt';
  for (let i = 0; i < bands; i++) {
    const u = 0.12 + (i / bands) * 0.8 + r() * 0.06, w = w1 + (w2 - w1) * u + 2.5;
    const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u, sk = (r() - 0.5) * 6;
    ctx.lineWidth = 2.5 + r() * 2.5;
    ctx.beginPath();
    ctx.moveTo(x - nx * w / 2 - (x2 - x1) / len * sk, y - ny * w / 2 - (y2 - y1) / len * sk);
    ctx.lineTo(x + nx * w / 2 + (x2 - x1) / len * sk, y + ny * w / 2 + (y2 - y1) / len * sk);
    ctx.stroke();
  }
}

// A painted candle flame with its own halo.
function candleFlame(ctx, x, y, h, lean) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x, y - h * 0.4, 0, x, y - h * 0.4, h * 1.4);
  halo.addColorStop(0, 'rgba(255,170,70,0.45)'); halo.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - h * 1.5, y - h * 2, h * 3, h * 3);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y); ctx.rotate(lean);
  ctx.fillStyle = '#ff7a24';
  ctx.beginPath(); ctx.moveTo(0, -h); ctx.quadraticCurveTo(h * 0.42, -h * 0.25, 0, 1); ctx.quadraticCurveTo(-h * 0.42, -h * 0.25, 0, -h); ctx.fill();
  ctx.fillStyle = '#ffe9b0';
  ctx.beginPath(); ctx.moveTo(0, -h * 0.6); ctx.quadraticCurveTo(h * 0.2, -h * 0.15, 0, 0); ctx.quadraticCurveTo(-h * 0.2, -h * 0.15, 0, -h * 0.6); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------
// THE WICK-MOTHER
// ---------------------------------------------------------------
function drawWickMother(cv, pose, frameIndex) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 8;
  const t = (pose.t ?? 0) * TAU;
  const { lean, jawA, headA, cx } = pose;
  const legs = placeLegs(pose.g, cx, base, 104, 100, 8);
  const { hx, hy } = legs;
  const B = frame(hx, hy, lean);                      // body frame: up is -y, belly is +x
  const [sx, sy] = B(16, -110);                        // near shoulder
  const hX = sx + 48, hY = sy + 20;                    // head hangs low and forward
  const Hd = frame(hX, hY, headA);
  const LJ = 74;                                       // lower jaw length
  const jawTip = [-22 + Math.cos(jawA) * LJ, 14 + Math.sin(jawA) * LJ];

  // back curve of the hump (body frame), and its outward normal
  const backAt = (u) => {
    const p0 = [-26, 8], c = [-70, -96], p2 = [16, -138];
    const x = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p2[0];
    const y = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p2[1];
    const tx = 2 * (1 - u) * (c[0] - p0[0]) + 2 * u * (p2[0] - c[0]);
    const ty = 2 * (1 - u) * (c[1] - p0[1]) + 2 * u * (p2[1] - c[1]);
    const l = Math.hypot(tx, ty);
    return { x, y, nx: ty / l, ny: -tx / l };
  };

  // ---- far arm (behind everything) ----
  const arm = (shx, shy, up, lo, L1, L2, seed, dark) => {
    const ex = shx + Math.sin(up) * L1, ey = shy + Math.cos(up) * L1;
    const ax = ex + Math.sin(lo) * L2, ay = ey + Math.cos(lo) * L2;
    wrapped(ctx, shx, shy, ex, ey, 13, 9, 3, seed);
    wrapped(ctx, ex, ey, ax, ay, 9, 7, 3, seed + 1);
    ctx.fillStyle = IRON;
    ctx.beginPath(); ctx.ellipse(ex, ey, 7, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ax, ay, 8, 7, lo, 0, TAU); ctx.fill();
    // scythe claws, sweeping forward and hooking down
    const dir = Math.atan2(Math.cos(lo), Math.sin(lo)) - 0.3;
    const tips = [];
    const claws = [[-0.45, 40, 6], [-0.08, 54, 7.5], [0.32, 46, 6.5]];
    for (const [da, len, w] of claws) {
      ctx.fillStyle = IRON;
      tips.push(blade(ctx, ax, ay, dir + da, len, w, 0.95));
      if (!dark) {
        ctx.save(); ctx.strokeStyle = 'rgba(190,170,140,0.55)'; ctx.lineWidth = 1.1;
        const a = dir + da, mx = ax + Math.cos(a) * len * 0.6, my = ay + Math.sin(a) * len * 0.6;
        const [tx, ty] = tips[tips.length - 1];
        ctx.beginPath(); ctx.moveTo(ax + Math.cos(a) * 8, ay + Math.sin(a) * 8);
        ctx.quadraticCurveTo(mx - Math.sin(a) * w * 0.3, my + Math.cos(a) * w * 0.3, tx, ty); ctx.stroke();
        ctx.restore();
      }
    }
    return { ax, ay, tips };
  };
  const [fsx, fsy] = B(16, -72);
  arm(fsx, fsy, pose.armFar.up, pose.armFar.lo, 70, 70, 41, true);

  // ---- far leg ----
  const leg = (l, seed) => {
    wrapped(ctx, hx, hy, l.kx, l.ky, 17, 11, 4, seed);
    wrapped(ctx, l.kx, l.ky, l.ax, l.ay, 11, 7, 4, seed + 1);
    ctx.fillStyle = IRON;
    ctx.beginPath(); ctx.ellipse(l.kx, l.ky, 8, 7, 0, 0, TAU); ctx.fill();
    // hooked talons
    blade(ctx, l.ax, l.ay, 0.12, 30, 7, 0.5);
    blade(ctx, l.ax, l.ay, 0.55, 22, 6, 0.4);
    blade(ctx, l.ax, l.ay, Math.PI - 0.2, 14, 5, -0.3);
  };
  leg(legs.far, 51);

  // ---- mantle of black blades along the back ----
  const rs = rand(7);
  const NS = 11;
  for (let i = 0; i < NS; i++) {
    const u = 0.06 + (i / (NS - 1)) * 0.92 + (rs() - 0.5) * 0.04;
    const p = backAt(u);
    const len = 46 + Math.sin(u * Math.PI) * 62 + rs() * 22;
    const sway = Math.sin(t + i * 0.8) * 0.06;
    // normal, swept up and back
    const la = Math.atan2(p.ny - 0.55, p.nx - 0.25) + (rs() - 0.5) * 0.35 + sway;
    const [wx, wy] = B(p.x + 6, p.y + 4);
    const ang = la + lean;
    const bw = 22 + rs() * 12, hk = i % 2 ? 0.22 : -0.16;
    ctx.fillStyle = i % 3 === 1 ? '#1b1210' : IRON;
    blade(ctx, wx, wy, ang, len, bw, hk);
    ctx.fillStyle = 'rgba(120,26,10,0.75)';
    blade(ctx, wx, wy, ang + hk * 0.3, len * 0.62, bw * 0.3, hk * 0.5);
  }

  // ---- ragged strips hanging from the sack ----
  const rr = rand(19);
  for (let i = 0; i < 8; i++) {
    const u = i / 7;
    const [tx, ty] = B(-30 + u * 56, 14 + Math.sin(u * Math.PI) * 10);
    const len = 70 + rr() * 70, w = 10 + rr() * 9;
    const sw = Math.sin(t + i * 1.3) * 9 - 12;
    const bx = tx + sw - 8, by = Math.min(base - 40, ty + len);
    ctx.fillStyle = i % 2 ? SACK_D : '#2a2017';
    ctx.beginPath();
    ctx.moveTo(tx - w / 2, ty);
    ctx.quadraticCurveTo(tx - w / 2 + sw * 0.3, (ty + by) / 2, bx - w * 0.45, by);
    ctx.lineTo(bx - w * 0.15, by + 10 + rr() * 8);
    ctx.lineTo(bx + w * 0.1, by + 2);
    ctx.lineTo(bx + w * 0.4, by + 8 + rr() * 6);
    ctx.quadraticCurveTo(tx + w / 2 + sw * 0.3, (ty + by) / 2, tx + w / 2, ty);
    ctx.closePath(); ctx.fill();
  }

  // ---- near leg ----
  leg(legs.near, 61);

  // ---- the sack body (body frame) ----
  const bodyPts = [[-22, 28], [-50, -14], [-60, -66], [-44, -112], [-12, -140], [22, -132], [40, -104], [42, -56], [34, -10], [16, 26]];
  ctx.save();
  ctx.translate(hx, hy); ctx.rotate(lean);
  blob(ctx, bodyPts, 0.9);
  ctx.fillStyle = vgrad(ctx, -140, 30, [[0, SACK_L], [0.45, SACK], [1, SACK_D]]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  weave(ctx, -70, -150, 50, 40);
  // patches
  ctx.fillStyle = PATCH;
  ctx.save(); ctx.translate(-30, -64); ctx.rotate(-0.2); ctx.fillRect(-14, -12, 28, 24); ctx.restore();
  ctx.fillStyle = PATCH2;
  ctx.save(); ctx.translate(18, -38); ctx.rotate(0.15); ctx.fillRect(-11, -14, 22, 26); ctx.restore();
  // belly shadow
  ctx.fillStyle = 'rgba(10,6,3,0.35)';
  ctx.beginPath(); ctx.ellipse(36, -40, 18, 60, 0, 0, TAU); ctx.fill();
  ctx.restore();
  stitches(ctx, [[-44, -76], [-16, -78], [-13, -52], [-42, -48], [-44, -76]]);
  stitches(ctx, [[8, -52], [29, -50], [26, -24], [6, -26], [8, -52]]);
  stitches(ctx, [[-8, -138], [-20, -100], [-14, -60], [-2, -20], [4, 24]], 8, 3.6);
  stitches(ctx, [[-48, -18], [-20, -6], [14, -4], [36, -14]], 8, 3.6);
  ctx.restore();

  // ---- neck fold ----
  const [nb1x, nb1y] = B(24, -118);
  ctx.fillStyle = SACK;
  limb(ctx, nb1x, nb1y, ...Hd(-12, -2), 40, 34);
  ctx.fillStyle = SACK_D;
  limb(ctx, ...B(30, -100), ...Hd(-14, 10), 18, 16);

  // ---- head: burlap sack with an iron cage over the face (head frame) ----
  const headPts = [[-30, 14], [-38, -10], [-26, -34], [2, -42], [28, -34], [46, -16], [54, 4], [50, 14], [10, 16]];
  ctx.save();
  ctx.translate(hX, hY); ctx.rotate(headA);
  // lower jaw, hanging from the hinge
  ctx.save();
  ctx.translate(-22, 14); ctx.rotate(jawA);
  ctx.fillStyle = SACK;
  ctx.beginPath();
  ctx.moveTo(-8, -6); ctx.lineTo(LJ + 6, -1);
  ctx.quadraticCurveTo(LJ - 4, 18, LJ * 0.45, 24);
  ctx.quadraticCurveTo(-6, 22, -8, -6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(10,6,3,0.4)';
  ctx.beginPath(); ctx.moveTo(-4, 10); ctx.quadraticCurveTo(LJ * 0.5, 26, LJ - 2, 8); ctx.lineTo(LJ - 6, 16); ctx.quadraticCurveTo(LJ * 0.4, 30, -4, 18); ctx.fill();
  stitches(ctx, [[2, 12], [LJ * 0.5, 16], [LJ - 4, 6]], 7, 3);
  ctx.restore();
  // mouth cavity
  ctx.fillStyle = '#1a0604';
  ctx.beginPath(); ctx.moveTo(-24, 12); ctx.lineTo(52, 12); ctx.lineTo(jawTip[0] + 4, jawTip[1] - 2); ctx.closePath(); ctx.fill();
  // cranium
  blob(ctx, headPts, 0.8);
  ctx.fillStyle = vgrad(ctx, -42, 16, [[0, SACK_L], [0.6, SACK], [1, SACK_D]]);
  ctx.fill();
  ctx.save(); ctx.clip(); weave(ctx, -40, -46, 60, 20);
  ctx.fillStyle = PATCH2;
  ctx.save(); ctx.translate(-14, -24); ctx.rotate(0.3); ctx.fillRect(-9, -8, 18, 15); ctx.restore();
  ctx.restore();
  stitches(ctx, [[-20, -30], [-14, -22], [-23, -15], [-5, -16]], 6, 2.6);
  stitches(ctx, [[-2, -42], [-10, -18], [-6, 12]], 6, 3);
  // iron cage mask over the face
  ctx.strokeStyle = IRON; ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(4, -38); ctx.quadraticCurveTo(44, -32, 54, 4); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(4, 8); ctx.quadraticCurveTo(30, 4, 54, 8); ctx.stroke();
  ctx.lineWidth = 3.5;
  for (const [x0, y0, cx0, x1] of [[14, -37, 10, 12], [31, -33, 33, 30]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx0, -12, x1, 10); ctx.stroke();
  }
  ctx.fillStyle = '#3a2e26';
  for (const [x, y] of [[12, 7], [30, 5], [46, 6], [14, -36], [31, -32]]) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill(); }
  ctx.restore();

  // ---- texture pass: blotchy burlap + grain over everything painted so far ----
  mottle(ctx, 0, 0, W, H, '#140d08', 0.6, { seed: 11, cells: 16, contrast: 2 });
  grain(ctx, 0, 0, W, H, 0.09, 5 + frameIndex);
  shadeBottom(cv, 0.55, 0.55);

  // ---- ember glow in the throat, then the teeth ----
  ctx.save();
  ctx.translate(hX, hY); ctx.rotate(headA);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-24, 12); ctx.lineTo(52, 12); ctx.lineTo(jawTip[0] + 4, jawTip[1] - 2); ctx.closePath();
  ctx.clip();
  const mg = ctx.createRadialGradient(-12, 22, 0, -12, 22, 78);
  mg.addColorStop(0, '#fff2b8'); mg.addColorStop(0.18, '#ffb04a'); mg.addColorStop(0.45, '#e2481a');
  mg.addColorStop(0.8, '#6a1208'); mg.addColorStop(1, '#2a0604');
  ctx.fillStyle = mg;
  ctx.fillRect(-40, 0, 120, 100);
  ctx.restore();
  const rt = rand(23);
  // upper teeth hang from the snout line
  for (let i = 0; i < 9; i++) {
    const x = -12 + i * 7.6 + (rt() - 0.5) * 2;
    const len = 12 + rt() * 14 + (i > 5 ? 6 : 0), w = 5 + rt() * 3;
    ctx.fillStyle = BONE_D; blade(ctx, x, 10, Math.PI / 2 + (rt() - 0.5) * 0.5 - 0.15, len, w + 1.5, (rt() - 0.5) * 0.3);
    ctx.fillStyle = BONE; blade(ctx, x - 0.5, 10, Math.PI / 2 + (rt() - 0.5) * 0.2 - 0.15, len - 2, w, 0);
  }
  // lower teeth stand up from the hanging jaw
  const ja = jawA, jdx = Math.cos(ja), jdy = Math.sin(ja);
  for (let i = 0; i < 8; i++) {
    const u = 0.22 + i * 0.105;
    const x = -22 + jdx * LJ * u, y = 14 + jdy * LJ * u;
    const len = 12 + rt() * 14, w = 5 + rt() * 3;
    const up = ja - Math.PI / 2 + (rt() - 0.5) * 0.45 + 0.1;
    ctx.fillStyle = BONE_D; blade(ctx, x, y, up, len, w + 1.5, (rt() - 0.5) * 0.3);
    ctx.fillStyle = BONE; blade(ctx, x, y, up, len - 2, w, 0);
  }
  ctx.restore();

  // ---- near arm, scythes reaching forward ----
  const near = arm(...B(30, -66), pose.armNear.up, pose.armNear.lo, 70, 70, 71, false);

  // ---- candles jammed into the hump ----
  const rc = rand(31);
  const wicks = [];
  const candleU = [0.42, 0.56, 0.68, 0.8, 0.92];
  candleU.forEach((u, i) => {
    const p = backAt(u);
    const [bx, by] = B(p.x + 16 + rc() * 4, p.y + 18);
    const h = 18 + rc() * 18 + (i === 2 ? 10 : 0), w = 7 + rc() * 3;
    const tilt = (rc() - 0.5) * 0.4 - 0.1;
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(tilt);
    ctx.fillStyle = WAX_D; ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = WAX; ctx.fillRect(-w / 2 + 1, -h, w * 0.55, h);
    ctx.fillStyle = WAX_D;
    ctx.beginPath(); ctx.ellipse(0, -h, w / 2, 2, 0, 0, TAU); ctx.fill();
    // drips running down the candle and onto the sack
    ctx.fillStyle = WAX;
    for (let k = 0; k < 2; k++) { const dxp = -w / 2 + rc() * w; ctx.fillRect(dxp, -h, 2, 6 + rc() * 14); }
    ctx.fillRect(-w / 2 - 2, -3, w + 5, 4);
    ctx.fillStyle = '#1a120c'; ctx.fillRect(-0.7, -h - 4, 1.4, 4);
    ctx.restore();
    const wx = bx + Math.sin(tilt) * (h + 4), wy = by - Math.cos(tilt) * (h + 4);
    wicks.push([wx, wy]);
  });
  // wax trails down the back
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.strokeStyle = WAX; ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const p = backAt(0.45 + k * 0.13);
    const [x, y] = B(p.x + 16, p.y + 18);
    ctx.lineWidth = 2.5 - k * 0.3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4, y + 14, x - 2 + k, y + 22 + k * 5); ctx.stroke();
  }
  ctx.restore();

  // ---- ember light leaking through tears in the sack ----
  ctx.save();
  ctx.translate(hx, hy); ctx.rotate(lean);
  ctx.shadowColor = '#ff4a12'; ctx.shadowBlur = 9;
  for (const [x, y, a, s] of [[-26, -36, -0.6, 1], [6, -88, 0.4, 0.8], [-38, -96, 0.9, 0.7], [24, -10, -0.2, 0.7]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    ctx.fillStyle = '#d43c12';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-4, -3); ctx.lineTo(0, -1); ctx.lineTo(5, -4); ctx.lineTo(10, 0); ctx.lineTo(4, 3); ctx.lineTo(-2, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffc46a';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -1); ctx.lineTo(6, -1); ctx.lineTo(0, 1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // ---- warm rim from her own fire (top) and the maw (front) ----
  rimLight(cv, '#ffae5a', 0.8, 0, 3, 1.2);
  rimLight(cv, '#ff6a2a', 0.45, -2, 0, 1);

  // ---- candle flames, eyes (painted last so they stay bright) ----
  wicks.forEach(([x, y], i) => candleFlame(ctx, x, y + 1, 10 + Math.sin(t * 2 + i * 1.7) * 2, Math.sin(t + i) * 0.15));
  const [e1x, e1y] = Hd(23, -15), [e2x, e2y] = Hd(41, -11);
  eyeGlint(ctx, e1x, e1y, '#ffd2a0', '#ff2a10', 2.6, 1.15);
  eyeGlint(ctx, e2x, e2y, '#ffe0b0', '#ff2a10', 3.0, 1.15);

  // anchors (x from frame centre, y from feet; up is negative)
  const fireX = wicks.reduce((s, w) => s + w[0], 0) / wicks.length;
  const fireY = Math.min(...wicks.map((w) => w[1]));
  const [mx, my] = Hd(4, 26);
  const rel = ([x, y]) => ({ x: x - W / 2, y: y - base });
  rec('wickmother', frameIndex, {
    head: rel([fireX, fireY]),                       // the candle cluster: fire source
    hand: rel(near.tips[1]),
    eye: rel([e2x, e2y]),
    maw: rel([mx, my]),
    wicks: wicks.map(rel),
  });
}

function walkPose(p) {
  const s = Math.sin(p * TAU), c = Math.cos(p * TAU), s2 = Math.sin(p * TAU * 2);
  return {
    t: p, cx: 104,
    g: {
      near: { th: 0.3 * s, bend: 0.12 + 0.55 * Math.max(0, c) },
      far: { th: -0.3 * s, bend: 0.12 + 0.55 * Math.max(0, -c) },
    },
    lean: 0.6 + 0.05 * s2,
    headA: 0.14 - 0.05 * s2,
    jawA: 0.72 + 0.07 * Math.sin(p * TAU * 2 + 1),
    armNear: { up: 0.78 + 0.18 * s, lo: 0.55 + 0.22 * Math.sin(p * TAU + 0.6) },
    armFar: { up: 0.55 - 0.18 * s, lo: 0.35 - 0.2 * Math.sin(p * TAU + 0.6) },
  };
}

function lungePose(p) {
  const k = p * 2; // 0, 1
  return {
    t: p, cx: 90,
    g: { near: { th: 0.5, bend: 0.3 }, far: { th: -0.45, bend: 0.2 } },
    lean: 0.82 + 0.06 * k,
    headA: 0.04 - 0.06 * k,
    jawA: 1.0 + 0.14 * k,
    armNear: { up: 1.2 + 0.12 * k, lo: 0.6 + 0.25 * k },
    armFar: { up: 1.0 + 0.1 * k, lo: 0.45 + 0.2 * k },
  };
}

export const DEFS = {
  wickmother: {
    w: 320, h: 470, base: 8,
    anims: {
      walk: { n: 12, rate: 8, pose: walkPose },
      lunge: { n: 2, rate: 6, pose: lungePose },
    },
    draw: (cv, pose, i) => drawWickMother(cv, pose, i),
  },
};

// Extra single textures for the Wick-Mother. The old candle-ring 'wick_crown'
// is no longer used: her candles are painted into the sheet itself.
export function buildWickTextures(scene) {}
