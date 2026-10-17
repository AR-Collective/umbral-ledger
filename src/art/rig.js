// =====================================================================
// RIG: the shared skeleton every character is painted on.
//
// A pose is a handful of angles (thighs, shins, arms, lean). A walk cycle is
// just those angles as sine waves over one step. placeLegs() solves where each
// joint lands and keeps the lowest foot on the ground (which gives a natural
// bob). The per-character painters in art/chars/ build on these.
// =====================================================================

import { makeCanvas } from './paint.js';

export const TAU = Math.PI * 2;

export const ANCHORS = {};   // key -> [{ hand, eye, head }] per frame (x from centre, y from feet; up is negative)

// ---------------------------------------------------------------
// Kinematics
// ---------------------------------------------------------------
export function legChain(hx, hy, th, bend, L1, L2) {
  const kx = hx + Math.sin(th) * L1, ky = hy + Math.cos(th) * L1;
  const sh = th - bend;
  const ax = kx + Math.sin(sh) * L2, ay = ky + Math.cos(sh) * L2;
  return { kx, ky, ax, ay, sh };
}

export function armChain(sx, sy, up, lo, L1, L2) {
  const ex = sx + Math.sin(up) * L1, ey = sy + Math.cos(up) * L1;
  const hx = ex + Math.sin(lo) * L2, hy = ey + Math.cos(lo) * L2;
  return { ex, ey, hx, hy };
}

// One step of a gait. p is 0..1 through the cycle.
export function gait(p, { amp = 0.42, bend = [0.1, 0.6], armAmp = 0.35, elbow = 0.25 } = {}) {
  const s = Math.sin(p * TAU), c = Math.cos(p * TAU);
  return {
    near: { th: amp * s, bend: bend[0] + bend[1] * Math.max(0, c) },
    far: { th: -amp * s, bend: bend[0] + bend[1] * Math.max(0, -c) },
    armNear: { up: -armAmp * s, lo: -armAmp * s + elbow },
    armFar: { up: armAmp * s, lo: armAmp * s + elbow },
  };
}

export function standing(breath = 0) {
  return {
    near: { th: 0.06, bend: 0.06 }, far: { th: -0.08, bend: 0.05 },
    armNear: { up: 0.05 + breath * 0.03, lo: 0.18 }, armFar: { up: -0.05 - breath * 0.03, lo: 0.1 },
  };
}

// Solves legs and places the lowest foot on the ground line.
export function placeLegs(g, cx, base, L1, L2, footH, lift = 0, centerFeet = false) {
  const n = legChain(0, 0, g.near.th, g.near.bend, L1, L2);
  const f = legChain(0, 0, g.far.th, g.far.bend, L1, L2);
  const lowest = Math.max(n.ay, f.ay);
  const hx = centerFeet ? cx - (n.ax + f.ax) / 2 : cx, hy = base - footH - lowest - lift;
  const abs = (l) => ({ kx: l.kx + hx, ky: l.ky + hy, ax: l.ax + hx, ay: l.ay + hy, sh: l.sh });
  return { hx, hy, near: abs(n), far: abs(f) };
}

export function foot(ctx, ax, ay, len, h, angle = 0) {
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-len * 0.3, -h * 0.4);
  ctx.quadraticCurveTo(len * 0.9, -h * 0.6, len, h * 0.45);
  ctx.lineTo(-len * 0.35, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function eyeGlint(ctx, x, y, color, glow, r = 1.6, stretch = 1.6) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r * stretch, r * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function rec(key, frame, o) {
  (ANCHORS[key] ||= [])[frame] = o;
}

export function dashSmear(cv, draw) {
  // draw the pose, then smear copies behind it for a motion streak
  const tmp = makeCanvas(cv.width, cv.height);
  draw(tmp);
  const ctx = cv.getContext('2d');
  ctx.globalAlpha = 0.18; ctx.drawImage(tmp, -18, 0);
  ctx.globalAlpha = 0.35; ctx.drawImage(tmp, -9, 0);
  ctx.globalAlpha = 1; ctx.drawImage(tmp, 0, 0);
}
