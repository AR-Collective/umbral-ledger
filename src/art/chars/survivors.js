// SURVIVORS: Maren and Edrin, the people hiding in Hollowmere's chapel.
// Face RIGHT; Phaser flips them for facing left.

import { limb, rimLight, shadeBottom } from '../paint.js';
import { TAU, armChain, foot, gait, placeLegs, rec, standing } from '../rig.js';

// ---------------------------------------------------------------
// SURVIVORS: Maren (shawl, long skirt) and Edrin (cap, coat)
// ---------------------------------------------------------------
function drawSurvivor(cv, pose, frameIndex, who) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2;
  const maren = who === 'maren';
  // Muted, dark colours: they are people hiding at night, not cartoon figures.
  const SKIN = '#4a3c3a', HAIR = maren ? '#1a1110' : '#120e0c';
  const TOP = maren ? '#2e2620' : '#1c251d', BOTTOM = maren ? '#2a1519' : '#15171d', SHOE = '#0b0909';
  const SHAWL = '#3a3029', LIMB = maren ? '#221b18' : '#161d17';
  const crouch = pose.crouch ?? 0;
  const lean = (pose.lean ?? 0.04) + crouch * 0.55;
  const L1 = 21, L2 = 21, TOR = 28;
  const g = pose.g;
  const legs = placeLegs(g, cx, base, L1, L2, 2, 0, crouch > 0);
  const { hx, hy } = legs;
  const sx = hx + Math.sin(lean) * TOR, sy = hy - Math.cos(lean) * TOR;
  const headX = sx + Math.sin(lean) * 8 + 2, headY = sy - 10 + crouch * 2;
  const t = (pose.t ?? 0) * TAU;

  // far arm
  ctx.fillStyle = LIMB;
  const af = armChain(sx - 2, sy + 3, g.armFar.up, g.armFar.lo, 14, 13);
  limb(ctx, sx - 2, sy + 3, af.ex, af.ey, 5.5, 4.5);
  limb(ctx, af.ex, af.ey, af.hx, af.hy, 4.5, 3.8);
  // legs
  ctx.fillStyle = maren ? '#170e10' : BOTTOM;
  limb(ctx, hx, hy, legs.far.kx, legs.far.ky, 7, 5);
  limb(ctx, legs.far.kx, legs.far.ky, legs.far.ax, legs.far.ay, 5, 4);
  ctx.fillStyle = SHOE; foot(ctx, legs.far.ax, legs.far.ay, 8, 3.5, legs.far.sh * 0.3);
  ctx.fillStyle = maren ? '#1c1214' : '#1b1d25';
  limb(ctx, hx, hy, legs.near.kx, legs.near.ky, 7.5, 5.5);
  limb(ctx, legs.near.kx, legs.near.ky, legs.near.ax, legs.near.ay, 5.5, 4.2);
  ctx.fillStyle = SHOE; foot(ctx, legs.near.ax, legs.near.ay, 8.5, 3.5, legs.near.sh * 0.3);

  if (maren) {
    // long skirt that swings with the legs
    ctx.fillStyle = BOTTOM;
    const kneeY = Math.max(legs.near.ky, legs.far.ky);
    const f = Math.max(legs.near.kx, legs.far.kx), b = Math.min(legs.near.kx, legs.far.kx);
    const footY = Math.max(legs.near.ay, legs.far.ay);
    const sw = Math.sin(t) * 2;
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 7);
    ctx.lineTo(hx + 8, hy - 7);
    ctx.quadraticCurveTo(f + 7, kneeY, f + 6 + sw, Math.min(footY - 5, kneeY + 18));
    ctx.quadraticCurveTo((f + b) / 2, Math.min(footY - 2, kneeY + 22), b - 6 + sw, Math.min(footY - 4, kneeY + 18));
    ctx.quadraticCurveTo(b - 8, kneeY - 2, hx - 8, hy - 7);
    ctx.closePath();
    ctx.fill();
  }
  // torso
  ctx.fillStyle = TOP;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(lean);
  ctx.beginPath();
  ctx.moveTo(-8, maren ? -5 : 6);
  ctx.quadraticCurveTo(-10, -TOR / 2, -8, -TOR - 1);
  ctx.quadraticCurveTo(0, -TOR - 4, 8, -TOR);
  ctx.quadraticCurveTo(10, -TOR / 2, 8, maren ? -5 : 6);
  ctx.closePath();
  ctx.fill();
  if (maren) {
    // shawl over the shoulders
    ctx.fillStyle = SHAWL;
    ctx.beginPath();
    ctx.moveTo(-10, -TOR - 1);
    ctx.quadraticCurveTo(0, -TOR - 5, 10, -TOR);
    ctx.quadraticCurveTo(11, -TOR + 9, 2, -TOR + 15);
    ctx.quadraticCurveTo(-8, -TOR + 12, -11, -TOR + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // head: hair or cap does most of the work; just a sliver of face
  ctx.fillStyle = SKIN;
  ctx.beginPath(); ctx.ellipse(headX + 1, headY, 5.6, 6.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = HAIR;
  if (maren) {
    ctx.beginPath(); ctx.ellipse(headX - 1.5, headY - 1, 5.8, 7.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(headX - 6.5, headY - 3, 3.8, 0, TAU); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(headX - 1, headY - 1, 5.5, 6.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(headX, headY - 5, 7.5, 3.6, -0.1, Math.PI, TAU); ctx.fill();
    ctx.fillRect(headX, headY - 6, 10, 2.5); // cap brim
  }
  // near arm
  ctx.fillStyle = maren ? '#2a221d' : '#1f2a20';
  const an = armChain(sx + 2, sy + 3, g.armNear.up, g.armNear.lo, 14, 13);
  limb(ctx, sx + 2, sy + 3, an.ex, an.ey, 6, 5);
  limb(ctx, an.ex, an.ey, an.hx, an.hy, 5, 4);

  rimLight(cv, '#a8b4e0', 0.55, 1, 2, 0.8);
  shadeBottom(cv, 0.55, 0.35);
  rec(who, frameIndex, { head: { x: headX - cx, y: headY - base }, eye: { x: headX + 3 - cx, y: headY - base } });
}

export const DEFS = {
  maren: {
    w: 80, h: 104, base: 6,
    anims: {
      idle: { n: 8, rate: 6, pose: (t) => ({ g: standing(Math.sin(t * TAU)), t }) },
      walk: { n: 10, rate: 13, pose: (t) => ({ g: gait(t, { amp: 0.5, bend: [0.12, 0.8], armAmp: 0.45, elbow: 0.4 }), t: t * 2, lean: 0.1 }) },
      crouch: { n: 6, rate: 6, pose: (t) => ({ g: { near: { th: 1.35, bend: 1.6 }, far: { th: 1.1, bend: 1.4 }, armNear: { up: 0.9, lo: 1.5 }, armFar: { up: 0.6, lo: 1.2 } }, t, crouch: 1, lean: 0.05 + Math.sin(t * TAU) * 0.02 }) },
      crouchWalk: { n: 8, rate: 10, pose: (t) => { const g = gait(t, { amp: 0.3, bend: [1.15, 0.45], armAmp: 0.2, elbow: 0.8 }); g.near.th += 1.0; g.far.th += 1.0; return { g, t, crouch: 1, lean: 0.1 }; } },
    },
    draw: (cv, pose, i) => drawSurvivor(cv, pose, i, 'maren'),
  },
  edrin: {
    w: 80, h: 108, base: 6,
    anims: {
      idle: { n: 8, rate: 6, pose: (t) => ({ g: standing(Math.sin(t * TAU)), t }) },
      walk: { n: 10, rate: 13, pose: (t) => ({ g: gait(t, { amp: 0.52, bend: [0.12, 0.8], armAmp: 0.5, elbow: 0.4 }), t: t * 2, lean: 0.12 }) },
      crouch: { n: 6, rate: 6, pose: (t) => ({ g: { near: { th: 1.35, bend: 1.6 }, far: { th: 1.1, bend: 1.4 }, armNear: { up: 0.9, lo: 1.5 }, armFar: { up: 0.6, lo: 1.2 } }, t, crouch: 1, lean: 0.05 + Math.sin(t * TAU) * 0.02 }) },
      crouchWalk: { n: 8, rate: 10, pose: (t) => { const g = gait(t, { amp: 0.3, bend: [1.15, 0.45], armAmp: 0.2, elbow: 0.8 }); g.near.th += 1.0; g.far.th += 1.0; return { g, t, crouch: 1, lean: 0.1 }; } },
    },
    draw: (cv, pose, i) => drawSurvivor(cv, pose, i, 'edrin'),
  },
};
