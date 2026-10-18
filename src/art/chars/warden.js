// The Sun-Warden: the Last Noon's boss. A giant knight who holds the sun in
// place. Faces LEFT (he waits at the east end of his throne and looks west at
// you). Three painted poses, animated in the scene with tweens:
//   stand   the lance upright at his side
//   raise   the lance lifted to call down a sun-lance
//   kneel   his braziers are out, his shield is down: the core in his chest shows
// His halo (the stopped sun) and his chest core are separate images so they
// can burn, crack and go dark on their own.

import { makeCanvas, vgrad, radial, rimLight, grain, addCanvasTexture } from '../paint.js';
import { paintHalo } from '../powers.js';

const TAU = Math.PI * 2;
const W = 380, H = 470;
const METAL = '#17131d', METAL_HI = '#2c2536', GOLD = '#c9a24a', GOLD_HI = '#f2dc9a';

function plate(ctx, pts, fill = METAL, trim = GOLD) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (trim) { ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.stroke(); }
}

function lance(ctx, x0, y0, x1, y1) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.translate(x0, y0); ctx.rotate(a);
  const len = Math.hypot(x1 - x0, y1 - y0);
  ctx.fillStyle = '#211a14'; ctx.fillRect(0, -4, len, 8);
  ctx.fillStyle = GOLD; for (const k of [0.3, 0.55, 0.8]) ctx.fillRect(len * k, -5, 6, 10);
  // the head: a long sunlit blade
  ctx.fillStyle = vgrad(ctx, -16, 16, [[0, GOLD_HI], [0.5, '#fff8e0'], [1, GOLD]]);
  ctx.beginPath(); ctx.moveTo(len, -12); ctx.lineTo(len + 74, 0); ctx.lineTo(len, 12); ctx.lineTo(len + 10, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = GOLD; ctx.fillRect(len - 6, -14, 8, 28);
  ctx.restore();
}

// pose: { kneel: 0..1, armUp: 0..1 }
function drawWarden(cv, pose) {
  const ctx = cv.getContext('2d');
  const k = pose.kneel ?? 0, up = pose.armUp ?? 0;
  const base = H - 10;
  const drop = k * 96;                // the whole upper body sinks when he kneels
  const cx = 216;

  // cape, behind everything, falling to the ground
  ctx.fillStyle = vgrad(ctx, 120, base, [[0, '#4a1010'], [1, '#160404']]);
  ctx.beginPath();
  ctx.moveTo(cx - 40, 140 + drop);
  ctx.bezierCurveTo(cx + 40, 180 + drop, cx + 120, 300, cx + 130 - k * 10, base);
  ctx.lineTo(cx + 70, base - 10); ctx.lineTo(cx + 40, base); ctx.lineTo(cx + 10, base - 14);
  ctx.bezierCurveTo(cx + 20, 330, cx, 240 + drop, cx - 40, 160 + drop);
  ctx.closePath(); ctx.fill();

  // legs: greaves and sabatons
  const leg = (hx, hy, kx, ky, fx, fy, front) => {
    ctx.strokeStyle = front ? METAL_HI : METAL; ctx.lineCap = 'round';
    ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(kx, ky, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = METAL; ctx.beginPath(); ctx.arc(kx, ky, 8, 0, TAU); ctx.fill();
    plate(ctx, [[fx - 30, fy + 8], [fx - 26, fy - 12], [fx + 14, fy - 14], [fx + 16, fy + 8]], METAL, GOLD);
  };
  if (k < 0.5) {
    leg(cx + 22, 300, cx + 34, 372, cx + 30, base - 10, false);
    leg(cx - 18, 300, cx - 30, 372, cx - 34, base - 10, true);
  } else {
    // one knee down, the other leg bent in front
    leg(cx + 20, 300 + drop * 0.7, cx + 60, base - 18, cx + 104, base - 10, false);
    leg(cx - 20, 300 + drop * 0.7, cx - 70, 330 + drop * 0.5, cx - 74, base - 10, true);
  }

  ctx.save();
  ctx.translate(0, drop);
  // tassets (the plated skirt)
  for (let i = 0; i < 4; i++) {
    const x = cx - 52 + i * 26;
    plate(ctx, [[x, 250], [x + 28, 250], [x + 30, 306], [x + 2, 312]], i % 2 ? METAL_HI : METAL, GOLD);
  }
  // breastplate
  ctx.fillStyle = vgrad(ctx, 130, 260, [[0, METAL_HI], [1, METAL]]);
  ctx.beginPath();
  ctx.moveTo(cx - 62, 140); ctx.quadraticCurveTo(cx, 124, cx + 62, 140);
  ctx.lineTo(cx + 50, 258); ctx.quadraticCurveTo(cx, 272, cx - 50, 258); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
  // a sunburst worked into the plate, around the socket where the core sits
  ctx.strokeStyle = 'rgba(242,220,154,0.55)'; ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 22, 190 + Math.sin(a) * 22); ctx.lineTo(cx + Math.cos(a) * 40, 190 + Math.sin(a) * 40); ctx.stroke();
  }
  ctx.fillStyle = '#0a070c'; ctx.beginPath(); ctx.arc(cx, 190, 19, 0, TAU); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
  // belt
  ctx.fillStyle = '#2a1c12'; ctx.fillRect(cx - 54, 244, 108, 12);
  ctx.fillStyle = GOLD; ctx.fillRect(cx - 9, 242, 18, 16);

  // far arm (behind): rests on the hip
  ctx.strokeStyle = METAL; ctx.lineWidth = 26; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 58, 160); ctx.lineTo(cx + 78, 222); ctx.lineTo(cx + 50, 250); ctx.stroke();

  // helm: a tall great-helm with a crest blade and a burning visor slit
  const hx = cx - 6, hy = 82 + k * 14;
  ctx.save();
  ctx.translate(hx, hy); ctx.rotate(-k * 0.35);
  plate(ctx, [[-32, 50], [-36, -10], [-22, -40], [0, -48], [24, -40], [34, -10], [30, 50], [0, 58]], METAL_HI, GOLD);
  plate(ctx, [[-4, -46], [0, -96], [6, -46]], GOLD, null);
  ctx.fillStyle = '#fff4d0';
  ctx.save(); ctx.shadowColor = '#ffd27a'; ctx.shadowBlur = 12;
  ctx.fillRect(-30, 4, 46, 5); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
  for (const y of [22, 32, 42]) { ctx.beginPath(); ctx.moveTo(-28, y); ctx.lineTo(-6, y); ctx.stroke(); }
  ctx.restore();

  // pauldrons
  for (const [px, py, r] of [[cx + 52, 146, 36], [cx - 56, 146, 40]]) {
    ctx.fillStyle = vgrad(ctx, py - r, py + r, [[0, METAL_HI], [1, METAL]]);
    ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.72, 0, Math.PI, TAU); ctx.lineTo(px + r, py + 10); ctx.lineTo(px - r, py + 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(242,220,154,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, py + 4, r * 0.7, r * 0.45, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }

  // near arm and the lance
  const sx = cx - 60, sy = 160;
  if (up > 0.5) {
    // the lance lifted overhead, its blade aimed down at you
    const hxx = sx - 30, hyy = 84;
    ctx.strokeStyle = METAL_HI; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 36, 126); ctx.lineTo(hxx, hyy); ctx.stroke();
    lance(ctx, hxx + 140, hyy + 70, hxx - 40, hyy - 24);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(hxx, hyy, 14, 0, TAU); ctx.fill();
  } else {
    const hxx = sx - 44, hyy = 236;
    ctx.strokeStyle = METAL_HI; ctx.lineWidth = 28;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 30, 204); ctx.lineTo(hxx, hyy); ctx.stroke();
    lance(ctx, hxx + 2, base - drop + 4, hxx - 4, 92 - drop * 0.6);
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(hxx, hyy, 14, 0, TAU); ctx.fill();
  }
  ctx.restore();

  rimLight(cv, '#ffcf8a', 0.55, -1, 2, 0.9);
  grain(ctx, 0, 0, W, H, 0.04, 77);
}

export function buildWardenTextures(scene) {
  for (const [key, pose] of [['warden_stand', {}], ['warden_raise', { armUp: 1 }], ['warden_kneel', { kneel: 1 }]]) {
    const cv = makeCanvas(W, H);
    drawWarden(cv, pose);
    addCanvasTexture(scene, key, cv);
  }
  addCanvasTexture(scene, 'warden_halo', paintHalo(300, 24));
  // the core: the piece of noon he keeps in his chest
  const core = makeCanvas(64, 64);
  const ctx = core.getContext('2d');
  ctx.fillStyle = radial(ctx, 32, 32, 32, [[0, '#ffffff'], [0.3, '#fff1c0'], [0.6, 'rgba(255,190,90,0.6)'], [1, 'rgba(255,150,60,0)']]);
  ctx.fillRect(0, 0, 64, 64);
  addCanvasTexture(scene, 'warden_core', core);
}

export const WARDEN_SIZE = { w: W, h: H, coreY: 190, coreX: 216, headY: 82 };
