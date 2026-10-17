// WATCHERS: Lanternmen (Hollowmere), the Hall guardians and the acolyte (Prologue).
// Face RIGHT; Phaser flips them for facing left.

import { blob, curve, hgrad, limb, radial, rimLight } from '../paint.js';
import { TAU, armChain, eyeGlint, foot, gait, placeLegs, rec, standing } from '../rig.js';

// Shared helpers for the watchers' cloth.

// A ragged hem from (x0,y0) to (x1,y1): uneven teeth that sway a little.
function raggedTo(ctx, x0, y0, x1, y1, n, depth, t, seed = 1) {
  for (let i = 1; i <= n; i++) {
    const v = i / n;
    const x = x0 + (x1 - x0) * v, y = y0 + (y1 - y0) * v;
    const j = Math.sin(seed * 12.9898 + i * 78.233) * 0.5 + 0.5;          // stable per tooth
    const mx = x0 + (x1 - x0) * (v - 0.5 / n) + Math.sin(t + i) * 1.2;
    ctx.lineTo(mx, y + depth * (0.55 + j * 0.6));
    ctx.lineTo(x, y + (i < n ? depth * 0.1 * j : 0));
  }
}

function strokeCurve(ctx, pts, color, w, alpha = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  curve(ctx, pts); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------
// LANTERNMAN: a hunched Hollowmere villager in a ragged hooded robe,
// possessed by borrowed light: ember eyes in the hood, lantern held out front.
// ---------------------------------------------------------------
function drawLanternman(cv, pose, frameIndex, key = 'lanternman') {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2 - 4;
  const ROBE = '#2e1618', ROBE_HI = '#4a2224', ROBE_SH = '#170a0c', DARK = '#0d0708', ROPE = '#6a5034';

  if (pose.mode === 'down') {
    // collapsed in a heap of robe, the hood fallen forward, the light gone out
    ctx.fillStyle = ROBE;
    ctx.beginPath();
    ctx.moveTo(cx - 36, base);
    ctx.quadraticCurveTo(cx - 30, base - 13, cx - 8, base - 15);
    ctx.quadraticCurveTo(cx + 14, base - 16, cx + 24, base - 10);
    ctx.lineTo(cx + 30, base);
    raggedTo(ctx, cx + 30, base, cx - 36, base, 6, -3, 0, 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = ROBE_SH;
    blob(ctx, [[cx + 20, base - 2], [cx + 22, base - 13], [cx + 32, base - 15], [cx + 42, base - 8], [cx + 40, base]], 0.5);
    ctx.fill();
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.ellipse(cx + 37, base - 6, 4, 4.5, 0, 0, TAU); ctx.fill();
    strokeCurve(ctx, [[cx - 6, base - 13], [cx + 2, base - 9], [cx + 6, base - 2]], ROPE, 1.6, 0.8);
    limb(ctx, cx + 10, base - 6, cx + 34, base - 2, 4.5, 3.5);
    rimLight(cv, '#8fa0d8', 0.45, 0, 2, 1);
    rec(key, frameIndex, { hand: { x: 40, y: -6 }, eye: { x: 28, y: -8 }, head: { x: 28, y: -8 } });
    return;
  }

  const lean = pose.lean ?? 0.3;
  const L1 = 25, L2 = 24, TOR = 34;
  const g = pose.g;
  const legs = placeLegs(g, cx, base, L1, L2, 3);
  const { hx, hy } = legs;
  const sx = hx + Math.sin(lean) * TOR, sy = hy - Math.cos(lean) * TOR;
  const headX = sx + 8 + (pose.headDX ?? 0), headY = sy - 9 + (pose.headDY ?? 0);
  const t = (pose.t ?? 0) * TAU;

  // far arm, a ragged sleeve
  ctx.fillStyle = ROBE_SH;
  const af = armChain(sx - 3, sy + 4, g.armFar.up, g.armFar.lo, 18, 17);
  limb(ctx, sx - 3, sy + 4, af.ex, af.ey, 8, 7);
  limb(ctx, af.ex, af.ey, af.hx, af.hy, 7, 6);
  ctx.fillStyle = DARK;
  ctx.beginPath(); ctx.arc(af.hx, af.hy + 1, 2.6, 0, TAU); ctx.fill();
  // legs wrapped in dark cloth
  limb(ctx, hx - 2, hy, legs.far.kx, legs.far.ky, 8, 6);
  limb(ctx, legs.far.kx, legs.far.ky, legs.far.ax, legs.far.ay, 6, 4.5);
  foot(ctx, legs.far.ax, legs.far.ay, 10, 4, legs.far.sh * 0.3);
  limb(ctx, hx + 2, hy, legs.near.kx, legs.near.ky, 8.5, 6.5);
  limb(ctx, legs.near.kx, legs.near.ky, legs.near.ax, legs.near.ay, 6.5, 4.8);
  foot(ctx, legs.near.ax, legs.near.ay, 10.5, 4, legs.near.sh * 0.3);

  // the robe: hunched back, hanging to mid-shin in torn strips
  const kneeY = Math.max(legs.near.ky, legs.far.ky);
  const fwd = Math.max(legs.near.kx, legs.far.kx);
  const bwd = Math.min(legs.near.kx, legs.far.kx);
  const sway = Math.sin(t) * 2.5;
  const hemY = kneeY + 13;
  const robePath = () => {
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy - 4);
    ctx.quadraticCurveTo(sx + 14, sy + 8, hx + 10, hy - 4);
    ctx.quadraticCurveTo(fwd + 8, hy + 12, fwd + 10, hemY - 2);
    raggedTo(ctx, fwd + 10, hemY - 2, bwd - 15 - sway, hemY - 1 + sway * 0.4, 7, 7, t, 2);
    ctx.quadraticCurveTo(hx - 19, hy + 4, hx - 13, hy - 10);
    ctx.quadraticCurveTo(sx - 21, sy + 10, sx - 12, sy - 4);
    ctx.quadraticCurveTo(sx - 4, sy - 10, sx + 4, sy - 4);
    ctx.closePath();
  };
  ctx.fillStyle = ROBE;
  robePath(); ctx.fill();
  ctx.save();
  robePath(); ctx.clip();
  ctx.fillStyle = hgrad(ctx, bwd - 16, fwd + 12, [[0, ROBE_SH], [0.55, ROBE], [1, ROBE_HI]]);
  ctx.fillRect(0, 0, W, H);
  // folds hanging from the belt
  for (let k = 0; k < 4; k++) {
    const fx = hx - 10 + k * 6;
    strokeCurve(ctx, [[fx, hy - 2], [fx - 1 + sway * 0.2, hy + 16], [fx - 3 + (k - 1.5) * 3 + sway * 0.5, hemY + 4]], ROBE_SH, 1.8, 0.7);
  }
  ctx.restore();

  // rope belt with a knotted end hanging at the hip
  strokeCurve(ctx, [[hx - 13, hy - 9], [hx, hy - 4], [hx + 10, hy - 7]], ROPE, 2.2, 0.95);
  const kx = hx + 4 + sway * 0.5, ky = hy + 14;
  strokeCurve(ctx, [[hx + 3, hy - 5], [hx + 4 + sway * 0.2, hy + 4], [kx, ky]], ROPE, 1.6, 0.9);
  ctx.fillStyle = ROPE;
  ctx.beginPath(); ctx.arc(kx, ky, 1.8, 0, TAU); ctx.fill();

  // a torn shoulder cape
  ctx.fillStyle = ROBE_SH;
  ctx.beginPath();
  ctx.moveTo(sx + 9, sy - 2);
  ctx.quadraticCurveTo(sx + 13, sy + 6, sx + 10, sy + 14);
  raggedTo(ctx, sx + 10, sy + 14, sx - 19 - sway * 0.5, sy + 15, 5, 5, t, 5);
  ctx.quadraticCurveTo(sx - 20, sy + 2, sx - 10, sy - 7);
  ctx.quadraticCurveTo(sx, sy - 10, sx + 9, sy - 2);
  ctx.closePath(); ctx.fill();

  // the hood: drooping forward, a peak falling behind; it turns when he looks back
  const lookBack = pose.lookBack ?? 0;
  const turn = Math.cos(lookBack * Math.PI);
  ctx.save();
  ctx.translate(headX, headY);
  ctx.scale(turn, 1);
  ctx.fillStyle = ROBE;
  blob(ctx, [[10, -3], [4, -12], [-7, -13], [-15, -7], [-22 + sway * 0.4, 2], [-15, 6], [-10, 14], [2, 13], [9, 8]], 0.5);
  ctx.fill();
  ctx.fillStyle = hgrad(ctx, -20, 10, [[0, 'rgba(23,10,12,0.8)'], [1, 'rgba(23,10,12,0)']]);
  ctx.fill();
  ctx.fillStyle = '#030102';
  ctx.beginPath(); ctx.ellipse(5, 1.5, 5.4, 7.6, 0.15, 0, TAU); ctx.fill();
  ctx.restore();

  // ember eyes burning in the hood
  const ex = headX + 4 * turn - (1 - Math.abs(turn)) * 2, ey = headY + 0.5;
  eyeGlint(ctx, ex, ey, '#ffc070', '#ff6a1c', 1.5, 1.3);
  eyeGlint(ctx, ex - 3.5 * turn, ey + 0.4, '#e89048', '#ff6a1c', 1.1, 1.1);

  // near arm holds the lantern out front, sleeve hanging in tatters
  const an = armChain(sx + 3, sy + 4, g.armNear.up, g.armNear.lo, 18, 17);
  ctx.fillStyle = ROBE;
  limb(ctx, sx + 3, sy + 4, an.ex, an.ey, 9, 8);
  limb(ctx, an.ex, an.ey, an.hx - 2, an.hy, 8, 8);
  ctx.fillStyle = ROBE_SH;
  ctx.beginPath();
  ctx.moveTo(an.ex - 2, an.ey);
  ctx.lineTo(an.hx - 3, an.hy - 3);
  ctx.lineTo(an.hx - 3, an.hy + 4);
  raggedTo(ctx, an.hx - 3, an.hy + 4, an.ex, an.ey + 8, 3, 5, t, 7);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = DARK;
  limb(ctx, an.hx - 2, an.hy, an.hx + 1.5, an.hy + 1, 4.5, 3.6);

  rimLight(cv, '#8fa0d8', 0.55, 1, 2, 0.9);
  // the lantern's warmth catching the front of the robe
  rimLight(cv, '#ff9a50', 0.28, -2, -1, 1.2);
  rec(key, frameIndex, {
    hand: { x: an.hx - W / 2, y: an.hy - base },
    eye: { x: ex - W / 2, y: ey - base },
    head: { x: headX - W / 2, y: headY - base },
  });
}

// ---------------------------------------------------------------
// GUARDIAN: a tall armoured keeper of the Hall, great helm with a crest and a
// gold-burning visor, tabard marked with the hourglass, a lamp on a staff.
// ---------------------------------------------------------------
function drawGuardian(cv, pose, frameIndex) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2 - 8;
  const STEEL = '#1a2030', STEEL2 = '#2a3348', STEEL_HI = '#5a6a8c', TAB = '#24142a', CAPE = '#120c18', GOLD = '#b08a42', GOLD_HI = '#f0d080';
  const lean = pose.lean ?? 0.06;
  const L1 = 36, L2 = 35, TOR = 46;
  const g = pose.g;
  const legs = placeLegs(g, cx, base, L1, L2, 4);
  const { hx, hy } = legs;
  const sx = hx + Math.sin(lean) * TOR, sy = hy - Math.cos(lean) * TOR;
  const headX = sx + 4, headY = sy - 15;
  const t = (pose.t ?? 0) * TAU;
  const sway = Math.sin(t) * 3;

  // a faint gold halo behind the helm, like the saints the Hall keeps
  ctx.save();
  ctx.strokeStyle = GOLD_HI; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2;
  ctx.shadowColor = '#e8c372'; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(headX - 2, headY - 4, 19, 0, TAU); ctx.stroke();
  ctx.restore();

  // long cape behind, torn at the hem
  ctx.fillStyle = CAPE;
  ctx.beginPath();
  ctx.moveTo(sx - 10, sy - 4);
  ctx.quadraticCurveTo(sx - 28, sy + 40, hx - 28 - sway, base - 24);
  raggedTo(ctx, hx - 28 - sway, base - 24, hx - 2, base - 30, 4, 6, t, 4);
  ctx.quadraticCurveTo(hx - 6, hy, sx + 2, sy + 2);
  ctx.closePath();
  ctx.fill();

  // far arm
  ctx.fillStyle = STEEL;
  const af = armChain(sx - 8, sy + 6, g.armFar.up, g.armFar.lo, 24, 22);
  limb(ctx, sx - 8, sy + 6, af.ex, af.ey, 10, 8);
  limb(ctx, af.ex, af.ey, af.hx, af.hy, 8, 7);
  ctx.beginPath(); ctx.arc(af.hx, af.hy, 4.5, 0, TAU); ctx.fill();

  // armoured legs: cuisses, knee cops, greaves, sabatons
  const drawLeg = (l, w, near) => {
    ctx.fillStyle = near ? STEEL : '#141927';
    limb(ctx, hx, hy, l.kx, l.ky, 12 * w, 9 * w);
    limb(ctx, l.kx, l.ky, l.ax, l.ay, 9.5 * w, 7 * w);
    foot(ctx, l.ax, l.ay, 15, 6, l.sh * 0.25);
    ctx.fillStyle = near ? STEEL2 : '#1c2232';
    ctx.beginPath(); ctx.ellipse(l.kx + 2, l.ky, 6.5, 5.5, 0, 0, TAU); ctx.fill();
    if (near) {
      ctx.strokeStyle = STEEL_HI; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(l.kx + 3, l.ky + 6); ctx.lineTo(l.ax + 3, l.ay - 4); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(l.kx + 3, l.ky, 1.4, 0, TAU); ctx.fill();
    }
  };
  drawLeg(legs.far, 1, false);

  // tabard panels that follow the thighs
  const panel = (thigh, len, color, emblem) => {
    ctx.save();
    ctx.translate(hx, hy - 2);
    ctx.rotate(-thigh * 0.85);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(11, 0);
    ctx.lineTo(10, len);
    raggedTo(ctx, 10, len, -10, len, 3, 4, t, 6);
    ctx.closePath();
    ctx.fill();
    if (emblem) {
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, len - 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };
  panel(g.far.th, 44, '#180e1c', false);
  drawLeg(legs.near, 1.08, true);

  // breastplate with a cold sheen, and the fauld at the waist
  const chest = () => {
    ctx.beginPath();
    ctx.moveTo(sx - 13, sy - 2);
    ctx.quadraticCurveTo(sx, sy - 7, sx + 13, sy - 3);
    ctx.quadraticCurveTo(sx + 19, sy + 18, hx + 11, hy);
    ctx.lineTo(hx - 11, hy);
    ctx.quadraticCurveTo(sx - 17, sy + 16, sx - 13, sy - 2);
    ctx.closePath();
  };
  ctx.fillStyle = hgrad(ctx, sx - 16, sx + 18, [[0, '#121726'], [0.6, STEEL2], [0.85, '#3a4662'], [1, STEEL]]);
  chest(); ctx.fill();
  ctx.save();
  chest(); ctx.clip();
  ctx.strokeStyle = STEEL_HI; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.7;
  curve(ctx, [[sx + 7, sy - 2], [sx + 12, sy + 14], [hx + 8, hy - 8]]); ctx.stroke();
  ctx.globalAlpha = 1;
  // the tabard over the chest with the gold hourglass of the Hall
  ctx.fillStyle = TAB;
  ctx.beginPath();
  ctx.moveTo(sx - 4, sy + 2); ctx.lineTo(sx + 10, sy + 1); ctx.lineTo(hx + 9, hy); ctx.lineTo(hx - 6, hy); ctx.closePath();
  ctx.fill();
  const mx = (sx + 3 + hx + 1.5) / 2, my = (sy + hy) / 2 + 2;
  ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(mx - 4, my - 7); ctx.lineTo(mx + 4, my - 7); ctx.lineTo(mx - 4, my + 7); ctx.lineTo(mx + 4, my + 7); ctx.closePath();
  ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 2; k++) {
    ctx.fillStyle = k ? STEEL : STEEL2;
    ctx.beginPath(); ctx.ellipse(hx, hy - 1 + k * 5, 13, 4, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#2a2230';
  ctx.fillRect(hx - 12, hy - 4, 24, 4);
  ctx.fillStyle = GOLD;
  ctx.fillRect(hx + 3, hy - 4.5, 5, 5);
  panel(-g.near.th * 0.6, 46, TAB, true);

  // layered pauldron edged in gold
  ctx.fillStyle = STEEL2;
  ctx.beginPath(); ctx.ellipse(sx - 6, sy + 1, 13.5, 8.5, -0.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.ellipse(sx - 6, sy + 1, 13.5, 8.5, -0.25, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = STEEL;
  ctx.beginPath(); ctx.ellipse(sx - 6, sy + 8, 11, 6, -0.25, 0, TAU); ctx.fill();
  // gorget
  ctx.fillStyle = STEEL2;
  ctx.beginPath(); ctx.ellipse(headX - 1, headY + 13, 10, 4.5, 0, 0, TAU); ctx.fill();

  // great helm with a crest fin and a horsehair tail
  ctx.strokeStyle = '#2a1f2e'; ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    ctx.lineWidth = 2.8 - k * 0.4;
    curve(ctx, [[headX - 5, headY - 14], [headX - 15 - k, headY - 12 + k * 2 + sway * 0.3], [headX - 22 - k * 2, headY - 1 + k * 3 + sway * 0.6]]);
    ctx.stroke();
  }
  const helm = () => {
    ctx.beginPath();
    ctx.moveTo(headX - 10, headY + 12);
    ctx.lineTo(headX - 11, headY - 6);
    ctx.quadraticCurveTo(headX - 6, headY - 15, headX + 4, headY - 14);
    ctx.quadraticCurveTo(headX + 12, headY - 10, headX + 12, headY + 2);
    ctx.lineTo(headX + 9, headY + 13);
    ctx.closePath();
  };
  ctx.fillStyle = hgrad(ctx, headX - 11, headX + 12, [[0, '#121726'], [0.65, STEEL2], [1, '#3a4662']]);
  helm(); ctx.fill();
  // a ridge down the face of the helm, and breathing holes
  ctx.strokeStyle = STEEL_HI; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(headX + 10, headY - 9); ctx.quadraticCurveTo(headX + 13, headY + 2, headX + 9, headY + 12); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#05060a';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(headX + 6 + (k % 2), headY + 5 + k * 2.4, 0.8, 0, TAU); ctx.fill(); }
  // crest fin, gold-edged
  ctx.fillStyle = '#0f121b';
  ctx.beginPath();
  ctx.moveTo(headX - 6, headY - 13);
  ctx.quadraticCurveTo(headX - 2, headY - 30, headX + 14, headY - 34);
  ctx.quadraticCurveTo(headX + 4, headY - 24, headX + 4, headY - 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.moveTo(headX - 5, headY - 14); ctx.quadraticCurveTo(headX - 1, headY - 29, headX + 14, headY - 34); ctx.stroke();
  ctx.globalAlpha = 1;
  // the visor slit burns gold
  ctx.fillStyle = '#04050a';
  ctx.fillRect(headX + 1, headY - 2.2, 11.5, 3.4);
  ctx.save();
  ctx.shadowColor = '#ffb840'; ctx.shadowBlur = 6;
  ctx.fillStyle = '#e8b850';
  ctx.fillRect(headX + 2.5, headY - 1.2, 9.5, 1.4);
  ctx.restore();
  const ex = headX + 7, ey = headY - 0.5;
  eyeGlint(ctx, ex, ey, '#fff2c8', '#e8c372', 1.3, 1.8);

  // near arm and the staff with its lamp hook
  const an = armChain(sx + 6, sy + 6, g.armNear.up, g.armNear.lo, 24, 22);
  const staffTopX = an.hx + 3, staffTopY = an.hy - 60;
  ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(an.hx - 2, an.hy + 54); ctx.lineTo(staffTopX, staffTopY); ctx.stroke();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 4.6;
  for (const f of [0.15, 0.55, 0.95]) {
    const bx = an.hx - 2 + (staffTopX - an.hx + 2) * f, by = an.hy + 54 + (staffTopY - an.hy - 54) * f;
    ctx.beginPath(); ctx.moveTo(bx, by - 1); ctx.lineTo(bx, by + 1); ctx.stroke();
  }
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(staffTopX, staffTopY); ctx.quadraticCurveTo(staffTopX + 14, staffTopY - 8, staffTopX + 13, staffTopY + 4); ctx.stroke();
  ctx.fillStyle = GOLD_HI;
  ctx.beginPath(); ctx.arc(staffTopX, staffTopY - 1, 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = STEEL;
  limb(ctx, sx + 6, sy + 6, an.ex, an.ey, 11, 9);
  limb(ctx, an.ex, an.ey, an.hx, an.hy, 9, 8);
  ctx.fillStyle = STEEL2;
  ctx.beginPath(); ctx.ellipse(an.ex, an.ey, 5.5, 4.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = STEEL;
  ctx.beginPath(); ctx.arc(an.hx, an.hy, 5.2, 0, TAU); ctx.fill();

  rimLight(cv, '#9fb0e0', 0.6, 1, 2, 0.9);
  rec('guardian', frameIndex, {
    hand: { x: staffTopX + 13 - W / 2, y: staffTopY + 6 - base },
    eye: { x: ex - W / 2, y: ey - base },
    head: { x: headX - W / 2, y: headY - base },
  });
}

// ---------------------------------------------------------------
// ACOLYTE: a hooded figure in violet, kneeling in prayer, a faint light
// between its clasped hands.
// ---------------------------------------------------------------
function drawAcolyte(cv, pose, frameIndex) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2;
  const ROBE = '#2c1a42', ROBE_HI = '#4a2f6a', ROBE_SH = '#150c22', TRIM = '#8a6ab8';
  if (pose.mode === 'down') {
    ctx.fillStyle = ROBE;
    ctx.beginPath();
    ctx.moveTo(cx - 32, base);
    ctx.quadraticCurveTo(cx - 24, base - 11, cx + 2, base - 13);
    ctx.quadraticCurveTo(cx + 20, base - 13, cx + 26, base - 7);
    ctx.lineTo(cx + 32, base);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = ROBE_SH;
    blob(ctx, [[cx + 16, base - 1], [cx + 18, base - 11], [cx + 28, base - 12], [cx + 34, base - 4], [cx + 32, base]], 0.5);
    ctx.fill();
    strokeCurve(ctx, [[cx - 28, base - 2], [cx - 4, base - 6], [cx + 22, base - 3]], TRIM, 1.2, 0.6);
    rimLight(cv, '#8fa0d8', 0.4, 0, 2, 1);
    rec('acolyte', frameIndex, { eye: { x: 20, y: -8 }, head: { x: 20, y: -8 } });
    return;
  }
  const t = (pose.t ?? 0) * TAU;
  const bow = Math.sin(t) * 1.5;
  // kneeling body: robe pooled behind over the heels, knee forward on the ground
  const body = [
    [cx - 26, base], [cx - 25, base - 10], [cx - 16, base - 22], [cx - 12, base - 32], [cx - 4, base - 42 + bow],
    [cx + 8, base - 44 + bow], [cx + 15, base - 36 + bow], [cx + 13, base - 20], [cx + 22, base - 12], [cx + 25, base],
  ];
  ctx.fillStyle = ROBE;
  blob(ctx, body, 0.5);
  ctx.fill();
  ctx.save();
  blob(ctx, body, 0.5);
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, cx - 26, cx + 24, [[0, ROBE_SH], [0.6, ROBE], [1, ROBE_HI]]);
  ctx.fillRect(0, 0, W, H);
  strokeCurve(ctx, [[cx - 6, base - 38], [cx - 12, base - 20], [cx - 20, base - 2]], ROBE_SH, 1.6, 0.8);
  strokeCurve(ctx, [[cx + 2, base - 14], [cx + 12, base - 10], [cx + 24, base - 3]], ROBE_SH, 1.4, 0.7);
  strokeCurve(ctx, [[cx - 25, base - 2], [cx - 2, base - 2.5], [cx + 24, base - 2]], TRIM, 1.3, 0.75);
  ctx.restore();
  // hood bowed forward, a peak behind
  const hx = cx + 10, hy = base - 46 + bow * 1.4;
  ctx.fillStyle = ROBE;
  blob(ctx, [[hx - 10, hy + 4], [hx - 16, hy - 6], [hx - 6, hy - 10], [hx + 4, hy - 9], [hx + 11, hy - 1], [hx + 10, hy + 7], [hx, hy + 10]], 0.5);
  ctx.fill();
  ctx.fillStyle = '#05030a';
  ctx.beginPath(); ctx.ellipse(hx + 6, hy + 3, 3.6, 5, 0.3, 0, TAU); ctx.fill();
  strokeCurve(ctx, [[hx + 2, hy - 8], [hx + 10, hy - 2], [hx + 10, hy + 7]], TRIM, 1.1, 0.7);
  // the sleeve and the clasped hands
  const sleeve = [[cx - 3, base - 38 + bow], [cx + 5, base - 37 + bow], [cx + 15, base - 31 + bow], [cx + 17, base - 25 + bow],
    [cx + 9, base - 19 + bow], [cx, base - 24 + bow]];
  ctx.fillStyle = hgrad(ctx, cx - 3, cx + 17, [[0, ROBE], [1, ROBE_HI]]);
  blob(ctx, sleeve, 0.5);
  ctx.fill();
  strokeCurve(ctx, [[cx + 15, base - 31 + bow], [cx + 17, base - 25 + bow], [cx + 9, base - 19 + bow]], TRIM, 1, 0.6);
  ctx.fillStyle = '#120c18';
  ctx.beginPath(); ctx.ellipse(cx + 18, base - 28 + bow, 3, 4.5, 0.3, 0, TAU); ctx.fill();
  eyeGlint(ctx, hx + 6, hy + 2, '#ffcf8a', '#ff9a40', 1.1, 1.2);
  rimLight(cv, '#8fa0d8', 0.45, 1, 2, 1);
  // a faint violet light between the hands
  const pulse = 0.75 + Math.sin(t) * 0.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = radial(ctx, cx + 19, base - 30 + bow, 10, [[0, `rgba(200,150,255,${0.55 * pulse})`], [0.4, `rgba(140,90,230,${0.25 * pulse})`], [1, 'rgba(120,70,220,0)']]);
  ctx.fillRect(cx + 5, base - 44 + bow, 28, 28);
  ctx.restore();
  rec('acolyte', frameIndex, { eye: { x: hx + 6 - cx, y: hy + 2 - base }, head: { x: hx - cx, y: hy - base } });
}

export const DEFS = {
  lanternman: {
    w: 118, h: 140, base: 6,
    anims: {
      idle: { n: 10, rate: 7, pose: (t) => ({ g: { ...standing(Math.sin(t * TAU)), armNear: { up: 0.72 + Math.sin(t * TAU) * 0.04, lo: 1.5 } }, t, lean: 0.3 + Math.sin(t * TAU) * 0.02 }) },
      walk: { n: 12, rate: 10, pose: (t) => { const g = gait(t, { amp: 0.38, bend: [0.1, 0.55], armAmp: 0.3, elbow: 0.2 }); g.armNear = { up: 0.72 + Math.sin(t * TAU * 2) * 0.05, lo: 1.5 }; return { g, t, lean: 0.32 }; } },
      run: { n: 10, rate: 16, pose: (t) => { const g = gait(t, { amp: 0.7, bend: [0.2, 1.0], armAmp: 0.7, elbow: 0.8 }); g.armNear = { up: 0.9 + Math.sin(t * TAU) * 0.15, lo: 1.6 }; return { g, t: t * 2, lean: 0.48, hatTilt: -0.1 }; } },
      look: { n: 12, rate: 8, pose: (t) => ({ g: { ...standing(0), armNear: { up: 0.75, lo: 1.5 } }, t, lean: 0.24, lookBack: Math.max(0, Math.sin(t * TAU)), headDX: -Math.max(0, Math.sin(t * TAU)) * 2, hatTilt: -Math.max(0, Math.sin(t * TAU)) * 0.15 }) },
      down: { n: 1, rate: 1, pose: () => ({ mode: 'down' }) },
    },
    draw: (cv, pose, i) => drawLanternman(cv, pose, i),
  },
  guardian: {
    w: 140, h: 196, base: 6,
    anims: {
      idle: { n: 8, rate: 6, pose: (t) => ({ g: { ...standing(Math.sin(t * TAU)), armNear: { up: 0.6, lo: -0.1 } }, t, lean: 0.06 }) },
      walk: { n: 12, rate: 9, pose: (t) => { const g = gait(t, { amp: 0.3, bend: [0.08, 0.45], armAmp: 0.2, elbow: 0.15 }); g.armNear = { up: 0.6 + Math.sin(t * TAU) * 0.05, lo: -0.1 }; return { g, t, lean: 0.08 }; } },
      run: { n: 10, rate: 13, pose: (t) => { const g = gait(t, { amp: 0.55, bend: [0.15, 0.85], armAmp: 0.5, elbow: 0.6 }); g.armNear = { up: 0.7, lo: 0 }; return { g, t: t * 2, lean: 0.2 }; } },
      look: { n: 8, rate: 6, pose: (t) => ({ g: { ...standing(0), armNear: { up: 0.6, lo: -0.1 } }, t, lean: 0.03 }) },
    },
    draw: (cv, pose, i) => drawGuardian(cv, pose, i),
  },
  acolyte: {
    w: 88, h: 70, base: 6,
    anims: {
      idle: { n: 8, rate: 5, pose: (t) => ({ t }) },
      down: { n: 1, rate: 1, pose: () => ({ mode: 'down' }) },
    },
    draw: (cv, pose, i) => drawAcolyte(cv, pose, i),
  },
};
