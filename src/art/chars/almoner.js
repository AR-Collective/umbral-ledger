// THE ALMONER: the entity, the kind voice with the lamp. And the statues,
// which share its exact silhouette (design doc 3.4: it casts no shadow, they do).
//
// Look: a tall, serene, floating figure in pale violet-white robes trimmed in
// gold, a deep hood with long white hair spilling out, a calm pale face half in
// the hood's shadow, and a thin gold halo marked like a clock face (it is the
// Horologer). One arm reaches out with the lamp on its chain.

import { blob, canvasTex, curve, grain, hgrad, limb, makeCanvas, mottle, radial, rgba, rimLight, vgrad } from '../paint.js';
import { TAU, rec } from '../rig.js';

// Palettes: the living entity, and the same figure carved in stone.
const LIVE = {
  live: true,
  robeLit: '#ddd6ea', robeMid: '#a197bc', robeShade: '#4a4066', robeDeep: '#2a2240', fold: '#3e3458', foldHi: '#f2ecf8',
  trim: '#d8b264', trimHi: '#ffe6a2',
  hair: '#f3f0fb', hairShade: '#a9a3cc',
  face: '#f1e7ea', faceShade: '#7d6f96', void: '#120d20', eye: '#2a1e30',
  hand: '#efe2e2', chain: '#d8b264',
  halo: '#ffd98a', haloGlow: '#e8b850', haloW: 1.7,
};
const STONE = {
  live: false,
  robeLit: '#74708a', robeMid: '#545066', robeShade: '#35323f', robeDeep: '#25232e', fold: '#2a2833', foldHi: '#7a7888',
  trim: '#5a5866', trimHi: '#76748a',
  hair: '#625f70', hairShade: '#3e3c4a',
  face: '#6e6c7c', faceShade: '#3a3846', void: '#16151c', eye: '#24222c',
  hand: '#64626f', chain: '#4a4855',
  halo: '#5e5c6c', haloGlow: null, haloW: 3,
};

// A clock-marked ring: twelve hour ticks and small minute dots between them.
function drawHalo(ctx, x, y, r, P, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = P.halo; ctx.fillStyle = P.halo; ctx.lineCap = 'round';
  if (P.haloGlow) { ctx.shadowColor = P.haloGlow; ctx.shadowBlur = 7; }
  ctx.lineWidth = P.haloW;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = P.live ? 0.5 : 0.9;
  ctx.lineWidth = P.haloW * 0.55;
  ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.rotate(rot);
  for (let k = 0; k < 12; k++) {
    const a = (k * TAU) / 12, c = Math.cos(a), s = Math.sin(a);
    ctx.lineWidth = P.haloW * (P.live ? 0.95 : 0.8);
    ctx.beginPath(); ctx.moveTo(c * (r - 5), s * (r - 5)); ctx.lineTo(c * (r + 4), s * (r + 4)); ctx.stroke();
    const b = a + TAU / 24;
    ctx.beginPath(); ctx.arc(Math.cos(b) * (r + 2), Math.sin(b) * (r + 2), P.haloW * 0.45, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// One flowing hair strand, stroked.
function strand(ctx, pts, w, color, alpha = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  curve(ctx, pts); ctx.stroke();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------
// THE ALMONER (and the statues, which share its exact silhouette)
// ---------------------------------------------------------------
function drawRobed(cv, pose, frameIndex, key, P) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, base = H - 6, cx = W / 2 - 6;
  const u = pose.t ?? 0, t = u * TAU;
  const float = Math.sin(t) * 3;
  const top = base - 196 + float;
  const wv = (ph, a = 1) => Math.sin(t + ph) * a;      // a small breeze

  // the clock halo behind the hood (turns one hour-mark per loop)
  drawHalo(ctx, cx + 5, top + 19, 30, P, P.live ? (u * TAU) / 12 : 0);

  // long white hair falling down the back, under the hood
  ctx.fillStyle = P.hairShade;
  blob(ctx, [[cx - 12, top + 30], [cx - 22, top + 50], [cx - 28 + wv(0.5, 2), top + 84], [cx - 34 + wv(1, 3), top + 118],
    [cx - 26 + wv(1.4, 2), top + 112], [cx - 16, top + 80], [cx - 6, top + 46]], 0.5);
  ctx.fill();
  for (let k = 0; k < 4; k++) {
    strand(ctx, [[cx - 10 - k * 2, top + 34], [cx - 20 - k * 3, top + 70 + k * 3], [cx - 28 - k * 2 + wv(1 + k * 0.4, 3), top + 112 - k * 4]], 1.6, P.hair, 0.8);
  }

  // the robe: a tall bell from narrow shoulders to a floating, drifting hem
  const hem = [];
  for (let i = 0; i <= 10; i++) {
    const v = i / 10;
    const x = cx + 38 - v * 82 + wv(v * 4, 3) - v * v * 6;
    const y = base - 6 + float * 0.4 + Math.sin(t * 2 + i * 1.3) * 2.5 + (i % 2) * 5 - v * 2;
    hem.push([x, y]);
  }
  const robe = [[cx - 16, top + 42], [cx + 14, top + 40], [cx + 21, top + 70], [cx + 21, top + 108], [cx + 30, top + 156],
    ...hem, [cx - 38, top + 156], [cx - 27, top + 108], [cx - 25, top + 66]];
  ctx.fillStyle = P.robeMid;
  blob(ctx, robe, 0.4);
  ctx.fill();
  ctx.save();
  blob(ctx, robe, 0.4);
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, cx - 40, cx + 34, [[0, P.robeShade], [0.45, P.robeMid], [1, P.robeLit]]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = vgrad(ctx, top + 90, base, [[0, rgba(P.robeDeep, 0)], [1, rgba(P.robeDeep, 0.75)]]);
  ctx.fillRect(0, 0, W, H);
  // long folds
  for (let k = 0; k < 5; k++) {
    const fx = cx - 28 + k * 12;
    ctx.lineWidth = 3;
    strand(ctx, [[fx + 6, top + 96], [fx + 2 + wv(k, 1.5), top + 150], [fx - 2 - k + wv(k + 1, 3), base - 2]], 2.6, P.fold, 0.45);
    strand(ctx, [[fx + 9, top + 100], [fx + 5 + wv(k, 1.5), top + 150], [fx + 1 - k + wv(k + 1, 3), base - 4]], 1, P.foldHi, 0.25);
  }
  // gold band down the front and along the hem
  ctx.strokeStyle = P.trim; ctx.lineWidth = 2.2;
  curve(ctx, [[cx + 15, top + 90], [cx + 20, top + 130], [cx + 30 + wv(3, 2), base - 6 + float * 0.4]]);
  ctx.stroke();
  ctx.lineWidth = 2;
  curve(ctx, hem.map(([x, y]) => [x, y - 7]));
  ctx.stroke();
  ctx.restore();

  // the mantle over the shoulders, gold-edged, ending in a soft point at the front
  const mantle = [[cx - 18, top + 38], [cx + 14, top + 38], [cx + 24, top + 62], [cx + 22, top + 96], [cx + 6, top + 90 + wv(2, 1)],
    [cx - 12, top + 96 + wv(2.5, 1.5)], [cx - 30, top + 90], [cx - 28, top + 60]];
  ctx.fillStyle = P.robeMid;
  blob(ctx, mantle, 0.5);
  ctx.fill();
  ctx.save();
  blob(ctx, mantle, 0.5);
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, cx - 30, cx + 24, [[0, P.robeShade], [0.5, P.robeMid], [1, P.robeLit]]);
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = P.trim; ctx.lineWidth = 2.4;
  curve(ctx, [[cx - 32, top + 88], [cx - 12, top + 94 + wv(2.5, 1.5)], [cx + 6, top + 88 + wv(2, 1)], [cx + 24, top + 94]]);
  ctx.stroke();
  ctx.restore();

  // the deep hood
  const hood = [[cx - 20, top + 46], [cx - 25, top + 18], [cx - 12, top - 1], [cx + 8, top - 3], [cx + 22, top + 10],
    [cx + 25, top + 30], [cx + 20, top + 48]];
  ctx.fillStyle = P.robeMid;
  blob(ctx, hood, 0.5);
  ctx.fill();
  ctx.save();
  blob(ctx, hood, 0.5);
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, cx - 25, cx + 22, [[0, P.robeShade], [0.6, P.robeMid], [1, P.robeLit]]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // the opening, in shadow
  ctx.fillStyle = radial(ctx, cx + 15, top + 28, 17, [[0, P.robeDeep], [0.6, P.void], [1, P.void]]);
  blob(ctx, [[cx + 3, top + 6], [cx + 14, top + 4], [cx + 22, top + 14], [cx + 24, top + 32], [cx + 19, top + 44], [cx + 6, top + 42], [cx + 1, top + 24]], 0.6);
  ctx.fill();

  // a pale, calm face in profile, its brow lost in the hood's shadow
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx + 6, top + 13);
  ctx.lineTo(cx + 16, top + 14);
  ctx.quadraticCurveTo(cx + 18.5, top + 19, cx + 18.5, top + 22.5);
  ctx.lineTo(cx + 21.3, top + 27.2);
  ctx.lineTo(cx + 18.8, top + 28.6);
  ctx.quadraticCurveTo(cx + 20, top + 30.6, cx + 18.6, top + 31.8);
  ctx.quadraticCurveTo(cx + 19.2, top + 34, cx + 17.4, top + 36.2);
  ctx.quadraticCurveTo(cx + 12, top + 39.5, cx + 6, top + 37);
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, top + 12, top + 34, [[0, P.faceShade], [0.55, P.face], [1, P.face]]);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, cx + 4, cx + 14, [[0, rgba(P.void, 0.85)], [1, rgba(P.void, 0)]]);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // closed, serene eye and the faint line of the mouth
  ctx.strokeStyle = P.eye; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 13.8, top + 22.6); ctx.quadraticCurveTo(cx + 15.6, top + 24, cx + 17.4, top + 22.9); ctx.stroke();
  ctx.globalAlpha = 0.5; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx + 16.6, top + 30.4); ctx.lineTo(cx + 18.8, top + 30.2); ctx.stroke();
  ctx.globalAlpha = 1;

  // white hair spilling from the hood over the face and down the chest
  ctx.fillStyle = P.hairShade;
  blob(ctx, [[cx + 7, top + 30], [cx + 16, top + 36], [cx + 22, top + 60], [cx + 24 + wv(1, 1.5), top + 90], [cx + 22 + wv(1.5, 2.5), top + 112],
    [cx + 14 + wv(1.2, 2), top + 96], [cx + 9, top + 64]], 0.5);
  ctx.fill();
  strand(ctx, [[cx + 15, top + 9], [cx + 16, top + 18], [cx + 13, top + 32], [cx + 12, top + 46]], 2.4, P.hair, 0.95);
  for (let k = 0; k < 6; k++) {
    const x0 = cx + 8 + k * 1.6, y0 = top + 30 + k * 2;
    strand(ctx, [[x0, y0], [x0 + 3 + k, top + 56], [x0 + 2 + k * 1.4 + wv(k * 0.7, 2), top + 82 + k * 4], [x0 - 1 + k * 1.5 + wv(k * 0.7 + 1, 3), top + 104 + k * 3]],
      k % 2 ? 1.4 : 2.4, k % 3 === 2 ? P.hairShade : P.hair, 0.95);
  }
  // gold edge along the hood's lip
  ctx.strokeStyle = P.trim; ctx.lineWidth = 2.2;
  curve(ctx, [[cx + 4, top - 1], [cx + 20, top + 6], [cx + 25, top + 26], [cx + 21, top + 46]]);
  ctx.stroke();

  // the arm reaching out, a wide sleeve hanging from it, the lamp on its chain
  const shX = cx + 10, shY = top + 54;
  const ex = cx + 25, ey = top + 77;
  const hx = cx + 45, hy = top + 74 + Math.sin(t) * 1.5;
  ctx.fillStyle = P.robeMid;
  limb(ctx, shX, shY, ex, ey, 15, 12);
  limb(ctx, ex, ey, hx - 6, hy + 1, 12, 10);
  const sleeve = [[ex - 6, ey - 4], [hx - 6, hy - 5], [hx - 3, hy + 6], [hx - 8, hy + 24 + wv(1, 2)], [hx - 13, hy + 34 + wv(1.3, 3)], [ex - 2, ey + 12]];
  ctx.fillStyle = hgrad(ctx, ex - 6, hx, [[0, P.robeShade], [1, P.robeLit]]);
  blob(ctx, sleeve, 0.5);
  ctx.fill();
  ctx.strokeStyle = P.trim; ctx.lineWidth = 2;
  curve(ctx, [[hx - 5, hy - 5], [hx - 2, hy + 6], [hx - 8, hy + 24 + wv(1, 2)], [hx - 13, hy + 34 + wv(1.3, 3)]]);
  ctx.stroke();
  // pale hand, fingers curled round the chain
  ctx.fillStyle = P.hand;
  ctx.beginPath(); ctx.ellipse(hx, hy + 1, 4.2, 3.2, 0.5, 0, TAU); ctx.fill();
  limb(ctx, hx + 1, hy + 1, hx + 4, hy + 4, 2.4, 1.8);
  // the chain: small alternating links down to the lamp
  const cy0 = hy + 3, cy1 = hy + 23;
  ctx.strokeStyle = P.chain; ctx.lineWidth = 1.1;
  for (let k = 0; k < 6; k++) {
    const y = cy0 + ((cy1 - cy0) * (k + 0.5)) / 6;
    ctx.beginPath();
    if (k % 2) ctx.ellipse(hx + 3, y, 0.8, 2, 0, 0, TAU);
    else ctx.ellipse(hx + 3, y, 1.6, 2, 0, 0, TAU);
    ctx.stroke();
  }

  if (P.live) {
    rimLight(cv, '#c9c6ff', 0.55, 1, 2, 1);
    rimLight(cv, '#ffd890', 0.5, -2, 0, 1);
    // the hem fades into nothing: it floats, and casts no shadow
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = vgrad(ctx, base - 30, base + 4, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
    ctx.fillRect(0, base - 30, W, 40);
    ctx.restore();
    // a soft gold aura behind the whole figure
    const aura = makeCanvas(W, H);
    const a = aura.getContext('2d');
    a.drawImage(cv, 0, 0);
    a.globalCompositeOperation = 'source-in';
    a.fillStyle = '#e8c372';
    a.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalAlpha = 0.35;
    ctx.filter = 'blur(5px)';
    ctx.drawImage(aura, 0, 0);
    ctx.restore();
  } else {
    mottle(ctx, 0, 0, W, H, '#5d5a6c', 0.4, { seed: 5, cells: 6 });
    mottle(ctx, 0, 0, W, H, '#22212a', 0.25, { seed: 11, cells: 14, contrast: 2.2 });
    grain(ctx, 0, 0, W, H, 0.035, 9);
    // a weathering crack or two
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.strokeStyle = 'rgba(16,15,22,0.6)'; ctx.lineWidth = 0.9;
    curve(ctx, [[cx - 4, top + 100], [cx - 8, top + 124], [cx - 3, top + 140], [cx - 9, top + 168]]); ctx.stroke();
    curve(ctx, [[cx - 20, top + 58], [cx - 16, top + 70], [cx - 19, top + 80]]); ctx.stroke();
    ctx.restore();
    rimLight(cv, '#c8ccec', 0.6, 1, 2, 1);
  }
  rec(key, frameIndex, { hand: { x: hx + 3 - W / 2, y: cy1 + 4 - base }, head: { x: cx + 12 - W / 2, y: top + 25 - base } });
}

export const DEFS = {
  almoner: {
    w: 140, h: 236, base: 6,
    anims: {
      idle: { n: 12, rate: 6, pose: (t) => ({ t }) },
    },
    draw: (cv, pose, i) => drawRobed(cv, pose, i, 'almoner', LIVE),
  },
};

// Statues: the Almoner's exact silhouette, in stone. They cast shadows; it does not.
export const STATUE = {
  w: 140, h: 236, base: 6,
  draw: (cv, i) => drawRobed(cv, { t: 0 }, i, 'statue', STONE),
};

// ---------------------------------------------------------------
// PORTRAIT: a cinematic close-up for the cutscene panels
// ---------------------------------------------------------------

// A tapered, curved lock of hair from a root (width w) to a point.
function lock(ctx, x0, y0, x1, y1, w, bend) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
  ctx.beginPath();
  ctx.moveTo(x0 - nx * w / 2, y0 - ny * w / 2);
  ctx.quadraticCurveTo(mx - nx * w * 0.3, my - ny * w * 0.3, x1, y1);
  ctx.quadraticCurveTo(mx + nx * w * 0.3, my + ny * w * 0.3, x0 + nx * w / 2, y0 + ny * w / 2);
  ctx.closePath();
  ctx.fill();
}

function paintHaloBack(b, W, H, X, GOLD) {
  // soft gold light from behind, fading to nothing at the edges
  b.fillStyle = radial(b, X, 250, 300, [[0, 'rgba(255,214,140,0.42)'], [0.45, 'rgba(232,180,90,0.16)'], [1, 'rgba(232,180,90,0)']]);
  b.fillRect(0, 0, W, H);

  // the clock halo
  b.save();
  b.translate(X, 236);
  b.strokeStyle = GOLD; b.fillStyle = GOLD; b.lineCap = 'round';
  b.shadowColor = '#ffc860'; b.shadowBlur = 18;
  b.lineWidth = 5; b.beginPath(); b.arc(0, 0, 214, 0, TAU); b.stroke();
  b.shadowBlur = 8;
  b.globalAlpha = 0.7; b.lineWidth = 2; b.beginPath(); b.arc(0, 0, 192, 0, TAU); b.stroke();
  b.globalAlpha = 0.45; b.lineWidth = 1.2; b.beginPath(); b.arc(0, 0, 226, 0, TAU); b.stroke();
  b.globalAlpha = 1;
  for (let k = 0; k < 60; k++) {
    const a = (k * TAU) / 60 - TAU / 4, c = Math.cos(a), s = Math.sin(a);
    const hour = k % 5 === 0;
    b.lineWidth = hour ? 4 : 1.6;
    b.beginPath(); b.moveTo(c * (hour ? 186 : 196), s * (hour ? 186 : 196)); b.lineTo(c * (hour ? 220 : 208), s * (hour ? 220 : 208)); b.stroke();
  }
  // a small diamond at twelve
  b.beginPath(); b.moveTo(0, -238); b.lineTo(8, -226); b.lineTo(0, -214); b.lineTo(-8, -226); b.closePath(); b.fill();
  b.restore();

}

function paintPortrait(ctx, W, H) {
  const X = W / 2;
  const HAIR = '#f2f0fb', HAIR_SH = '#a8a2cc', HAIR_DEEP = '#6d6696';
  const ROBE = '#cfc7e0', ROBE_SH = '#5a4f7a', GOLD = '#dcb466', GOLD_HI = '#fff0b8';
  const SKIN = '#f3e8ea', SKIN_SH = '#b7a3bd';

  // long hair behind the hood, falling past the shoulders
  ctx.fillStyle = vgrad(ctx, 200, 600, [[0, HAIR_SH], [1, HAIR_DEEP]]);
  blob(ctx, [[X - 150, 260], [X - 190, 420], [X - 230, 600], [X + 230, 600], [X + 190, 420], [X + 150, 260], [X, 200]], 0.5);
  ctx.fill();

  // the hood: ivory outside, gold-edged, deep inside
  const hood = [[X, 34], [X + 120, 70], [X + 178, 200], [X + 196, 360], [X + 250, 520], [X + 290, 600], [X - 290, 600], [X - 250, 520],
    [X - 196, 360], [X - 178, 200], [X - 120, 70]];
  ctx.save();
  blob(ctx, hood, 0.5);
  ctx.fillStyle = ROBE; ctx.fill();
  ctx.clip();
  ctx.fillStyle = hgrad(ctx, X - 290, X + 290, [[0, ROBE_SH], [0.3, '#9c92b8'], [0.62, ROBE], [1, '#e9e2ef']]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = vgrad(ctx, 380, 600, [[0, 'rgba(30,22,52,0)'], [1, 'rgba(30,22,52,0.55)']]);
  ctx.fillRect(0, 0, W, H);
  // folds
  ctx.lineCap = 'round';
  for (const [x0, y0, x1, y1] of [[X - 150, 140, X - 200, 470], [X - 110, 120, X - 160, 380], [X + 150, 140, X + 205, 470], [X + 116, 120, X + 168, 380]]) {
    strand(ctx, [[x0, y0], [(x0 + x1) / 2 + (x0 < X ? -12 : 12), (y0 + y1) / 2], [x1, y1]], 6, '#4a4068', 0.28);
  }
  ctx.restore();

  // the shadowed opening of the hood
  const open = [[X, 94], [X + 76, 110], [X + 120, 190], [X + 132, 320], [X + 136, 460], [X + 152, 650], [X - 152, 650], [X - 136, 460], [X - 132, 320], [X - 120, 190], [X - 76, 110]];
  const lip = [[X - 152, 650], [X - 136, 460], [X - 132, 320], [X - 120, 190], [X - 76, 110], [X, 94], [X + 76, 110], [X + 120, 190], [X + 132, 320], [X + 136, 460], [X + 152, 650]];
  ctx.fillStyle = radial(ctx, X, 320, 230, [[0, '#2d2448'], [0.7, '#150f26'], [1, '#0b0816']]);
  blob(ctx, open, 0.5);
  ctx.fill();

  // hair inside the hood, framing the face
  ctx.fillStyle = vgrad(ctx, 120, 520, [[0, HAIR_SH], [1, '#8a84b4']]);
  blob(ctx, [[X, 108], [X + 104, 150], [X + 120, 300], [X + 112, 480], [X + 60, 470], [X + 84, 300], [X, 190], [X - 84, 300], [X - 60, 470], [X - 112, 480], [X - 120, 300], [X - 104, 150]], 0.5);
  ctx.fill();

  // neck and the high collar
  ctx.fillStyle = vgrad(ctx, 330, 470, [[0, SKIN_SH], [1, '#d8c6d2']]);
  ctx.beginPath(); ctx.moveTo(X - 40, 330); ctx.lineTo(X + 40, 330); ctx.lineTo(X + 48, 470); ctx.lineTo(X - 48, 470); ctx.closePath(); ctx.fill();
  ctx.fillStyle = vgrad(ctx, 420, 600, [[0, '#d9d1e6'], [1, '#7a6f9a']]);
  blob(ctx, [[X - 150, 600], [X - 120, 470], [X - 52, 430], [X, 470], [X + 52, 430], [X + 120, 470], [X + 150, 600]], 0.4);
  ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 5;
  curve(ctx, [[X - 118, 476], [X - 52, 438], [X, 478], [X + 52, 438], [X + 118, 476]]);
  ctx.stroke();
  // the gold clasp
  ctx.save();
  ctx.shadowColor = '#ffc860'; ctx.shadowBlur = 14;
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(X, 492, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = GOLD_HI; ctx.beginPath(); ctx.arc(X - 3, 488, 6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    const a = (k * TAU) / 12;
    ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * 18, 492 + Math.sin(a) * 18); ctx.lineTo(X + Math.cos(a) * 23, 492 + Math.sin(a) * 23); ctx.stroke();
  }

  // the face: soft anime oval, pointed chin
  const face = new Path2D();
  face.moveTo(X - 80, 190);
  face.bezierCurveTo(X - 84, 250, X - 80, 300, X - 58, 330);
  face.quadraticCurveTo(X - 26, 366, X, 372);
  face.quadraticCurveTo(X + 26, 366, X + 58, 330);
  face.bezierCurveTo(X + 80, 300, X + 84, 250, X + 80, 190);
  face.quadraticCurveTo(X, 140, X - 80, 190);
  ctx.fillStyle = SKIN;
  ctx.fill(face);
  ctx.save();
  ctx.clip(face);
  // the hood's shadow over the brow, cool shade on the far cheek, lamp-warmth below
  ctx.fillStyle = vgrad(ctx, 150, 290, [[0, 'rgba(40,28,70,0.75)'], [0.6, 'rgba(60,44,96,0.25)'], [1, 'rgba(60,44,96,0)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = hgrad(ctx, X - 90, X + 20, [[0, 'rgba(110,90,150,0.55)'], [1, 'rgba(110,90,150,0)']]);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = radial(ctx, X + 20, 400, 120, [[0, 'rgba(255,200,120,0.35)'], [1, 'rgba(255,200,120,0)']]);
  ctx.fillRect(0, 0, W, H);
  // blush
  ctx.fillStyle = 'rgba(230,140,160,0.16)';
  ctx.beginPath(); ctx.ellipse(X - 48, 306, 22, 10, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(X + 48, 306, 22, 10, 0, 0, TAU); ctx.fill();
  ctx.restore();

  // calm, half-lidded eyes of pale gold
  const eye = (ex, dir) => {
    const lid = new Path2D();
    lid.moveTo(ex - 30 * dir, 268);
    lid.quadraticCurveTo(ex - 4 * dir, 252, ex + 26 * dir, 262);
    lid.quadraticCurveTo(ex + 2 * dir, 292, ex - 30 * dir, 268);
    ctx.fillStyle = '#e8e2f0';
    ctx.fill(lid);
    ctx.save();
    ctx.clip(lid);
    ctx.fillStyle = vgrad(ctx, 252, 286, [[0, '#4a3418'], [0.55, '#c8963c'], [1, '#ffe08a']]);
    ctx.beginPath(); ctx.ellipse(ex + 2 * dir, 273, 14, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,20,0.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(ex + 2 * dir, 273, 5, 8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,170,0.6)';
    ctx.beginPath(); ctx.ellipse(ex + 4 * dir, 284, 6, 3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(40,24,60,0.45)';                      // the lid's shadow on the eye
    ctx.fillRect(ex - 34, 250, 68, 12);
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.arc(ex - 4 * dir, 266, 3, 0, TAU); ctx.fill();
    ctx.restore();
    // heavy upper lash line, light lower one
    ctx.strokeStyle = '#22182c'; ctx.lineCap = 'round';
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(ex - 32 * dir, 270); ctx.quadraticCurveTo(ex - 4 * dir, 250, ex + 28 * dir, 261); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(ex + 26 * dir, 261); ctx.lineTo(ex + 33 * dir, 266); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(ex - 22 * dir, 280); ctx.quadraticCurveTo(ex + 2 * dir, 290, ex + 20 * dir, 274); ctx.stroke();
    // the crease of the lid, and a thin calm brow
    ctx.lineWidth = 1.6; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(ex - 26 * dir, 256); ctx.quadraticCurveTo(ex - 2 * dir, 242, ex + 24 * dir, 250); ctx.stroke();
    ctx.strokeStyle = '#8a82ac'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(ex - 28 * dir, 232); ctx.quadraticCurveTo(ex - 2 * dir, 222, ex + 26 * dir, 228); ctx.stroke();
    ctx.globalAlpha = 1;
  };
  eye(X - 40, -1);
  eye(X + 40, 1);
  // nose and a faint, gentle mouth
  ctx.strokeStyle = 'rgba(130,100,130,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(X + 4, 296); ctx.quadraticCurveTo(X + 8, 312, X + 2, 316); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,90,110,0.75)'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(X - 14, 340); ctx.quadraticCurveTo(X, 345, X + 14, 339); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,90,110,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(X - 7, 350); ctx.quadraticCurveTo(X, 352, X + 7, 350); ctx.stroke();

  // bangs falling from under the hood across the brow
  const bangs = [
    [X - 6, 120, X - 42, 262, 34, -10], [X + 6, 120, X + 30, 250, 32, 8], [X - 30, 124, X - 86, 250, 34, -12], [X + 34, 124, X + 84, 256, 34, 12],
    [X - 60, 134, X - 100, 330, 30, -14], [X + 64, 134, X + 104, 330, 30, 14], [X - 2, 124, X - 10, 232, 22, 4], [X + 16, 124, X + 54, 240, 22, 6],
    [X - 20, 126, X - 64, 236, 24, -6],
  ];
  ctx.save();
  ctx.clip(face);
  ctx.fillStyle = 'rgba(58,40,96,0.32)';
  ctx.filter = 'blur(3px)';
  for (const [x0, y0, x1, y1, w, b] of bangs) lock(ctx, x0 + 5, y0 + 10, x1 + 5, y1 + 12, w, b);
  ctx.restore();
  for (const [x0, y0, x1, y1, w, b] of bangs) {
    ctx.fillStyle = vgrad(ctx, y0, y1, [[0, HAIR_SH], [0.35, HAIR], [1, '#e2def4']]);
    lock(ctx, x0, y0, x1, y1, w, b);
  }
  // long locks down the sides of the face, over the collar
  const sides = [[X - 92, 180, X - 112, 520, 34, -16], [X - 78, 230, X - 86, 470, 22, -10], [X + 92, 180, X + 114, 520, 34, 16], [X + 78, 230, X + 90, 470, 22, 10],
    [X - 104, 160, X - 150, 560, 30, -22], [X + 104, 160, X + 152, 560, 30, 22]];
  for (const [x0, y0, x1, y1, w, b] of sides) {
    ctx.fillStyle = hgrad(ctx, Math.min(x0, x1) - 20, Math.max(x0, x1) + 20, x0 < X ? [[0, HAIR_SH], [1, HAIR]] : [[0, HAIR], [1, '#c8c2e2']]);
    lock(ctx, x0, y0, x1, y1, w, b);
  }
  // fine strands and highlights
  const r = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let k = 0; k < 40; k++) {
    const side = k % 2 ? 1 : -1;
    const x0 = X + side * (84 + r() * 40), y0 = 150 + r() * 60;
    const x1 = x0 + side * (10 + r() * 40), y1 = y0 + 160 + r() * 260;
    strand(ctx, [[x0, y0], [x0 + side * r() * 30, (y0 + y1) / 2], [x1, y1]], 0.8 + r() * 1.2, r() < 0.6 ? '#ffffff' : HAIR_DEEP, 0.35 + r() * 0.35);
  }
  // the gold edge of the hood's lip
  ctx.strokeStyle = GOLD; ctx.lineWidth = 7;
  ctx.save();
  ctx.shadowColor = '#ffc860'; ctx.shadowBlur = 10;
  curve(ctx, lip);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = GOLD_HI; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
  curve(ctx, lip);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // moonlit rim on the left, warm lamp rim on the right
  const cv = ctx.canvas;
  rimLight(cv, '#b8c0ff', 0.6, 4, 3, 2);
  rimLight(cv, '#ffd890', 0.55, -4, -1, 2);

  // the halo and its glow sit behind everything
  const back = makeCanvas(W, H);
  paintHaloBack(back.getContext('2d'), W, H, X, GOLD);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.drawImage(back, 0, 0);
  ctx.restore();

  // the bust fades out at the bottom so it sits softly in a panel
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = vgrad(ctx, 470, 600, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,1)']]);
  ctx.fillRect(0, 470, W, 130);
  ctx.restore();

  // a few drifting motes of gold
  ctx.save();
  ctx.shadowColor = '#ffc860'; ctx.shadowBlur = 8;
  for (let k = 0; k < 18; k++) {
    const a = r() * TAU, d = 160 + r() * 130;
    ctx.fillStyle = `rgba(255,230,160,${0.35 + r() * 0.5})`;
    ctx.beginPath(); ctx.arc(X + Math.cos(a) * d, 260 + Math.sin(a) * d * 0.9, 1 + r() * 2.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Cutscene close-up of the Almoner, registered as the 'almoner_portrait' texture (600x600).
export function buildAlmonerPortrait(scene) {
  canvasTex(scene, 'almoner_portrait', 600, 600, (ctx, w, h) => paintPortrait(ctx, w, h));
}
