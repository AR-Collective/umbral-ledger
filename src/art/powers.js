// =====================================================================
// POWERS: textures for the returned abilities, their skill-bar icons, and
// the Last Noon's pickups.
//
// Colour rule (5.2): the shadow's own powers are violet and black; the sun
// and everything that serves it is white-gold. You can tell whose power a
// flash on screen belongs to at a glance.
// =====================================================================

import { makeCanvas, radial, addCanvasTexture } from './paint.js';

const TAU = Math.PI * 2;

// A teardrop of black flame with a violet rim, pointing right.
function paintEmberBolt() {
  const c = makeCanvas(72, 32);
  const ctx = c.getContext('2d');
  const tongue = (scale, color, blur) => {
    ctx.save();
    ctx.filter = blur ? `blur(${blur}px)` : 'none';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(70 - (1 - scale) * 6, 16);
    ctx.bezierCurveTo(52, 16 - 13 * scale, 30, 16 - 12 * scale, 6 + (1 - scale) * 20, 16 - 3 * scale);
    ctx.quadraticCurveTo(14, 16, 6 + (1 - scale) * 20, 16 + 3 * scale);
    ctx.bezierCurveTo(30, 16 + 12 * scale, 52, 16 + 13 * scale, 70 - (1 - scale) * 6, 16);
    ctx.fill();
    ctx.restore();
  };
  tongue(1, 'rgba(154,92,255,0.75)', 3);
  tongue(0.8, '#c9a8ff', 0);
  tongue(0.62, '#1a0b2e', 0);
  tongue(0.4, '#05020a', 0);
  return c;
}

// The black sun the Corona leaves behind: a dark disc inside a white-gold ring.
function paintEclipseDisc() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = radial(ctx, 128, 128, 128, [[0, 'rgba(255,241,192,0)'], [0.5, 'rgba(255,241,192,0)'], [0.56, 'rgba(255,250,230,0.95)'], [0.66, 'rgba(255,214,140,0.5)'], [1, 'rgba(180,140,255,0)']]);
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#030106';
  ctx.beginPath(); ctx.arc(128, 128, 68, 0, TAU); ctx.fill();
  return c;
}

// A crescent cut, for the Shadow Dash.
function paintSlash() {
  const c = makeCanvas(140, 70);
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = 'rgba(154,92,255,0.8)';
  ctx.beginPath(); ctx.ellipse(70, 40, 66, 20, -0.25, Math.PI * 1.05, Math.PI * 1.95); ctx.ellipse(70, 46, 60, 12, -0.25, Math.PI * 1.95, Math.PI * 1.05, true); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#f4ecff';
  ctx.beginPath(); ctx.ellipse(70, 40, 62, 16, -0.25, Math.PI * 1.1, Math.PI * 1.9); ctx.ellipse(70, 44, 58, 11, -0.25, Math.PI * 1.9, Math.PI * 1.1, true); ctx.fill();
  return c;
}

// A crown of sun-rays: worn by Sunguards, carried by the Warden.
export function paintHalo(size = 128, rays = 16) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const m = size / 2;
  ctx.fillStyle = radial(ctx, m, m, m, [[0, 'rgba(255,230,160,0)'], [0.55, 'rgba(255,230,160,0.15)'], [0.7, 'rgba(255,214,140,0.35)'], [1, 'rgba(255,214,140,0)']]);
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#ffe6a8'; ctx.lineWidth = size * 0.035;
  ctx.beginPath(); ctx.arc(m, m, size * 0.33, 0, TAU); ctx.stroke();
  ctx.lineWidth = size * 0.012;
  ctx.beginPath(); ctx.arc(m, m, size * 0.4, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#fff4d0';
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU, long = i % 2 === 0;
    const r0 = size * 0.36, r1 = size * (long ? 0.49 : 0.44);
    ctx.beginPath();
    ctx.moveTo(m + Math.cos(a - 0.06) * r0, m + Math.sin(a - 0.06) * r0);
    ctx.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1);
    ctx.lineTo(m + Math.cos(a + 0.06) * r0, m + Math.sin(a + 0.06) * r0);
    ctx.fill();
  }
  return c;
}

// A Remnant: a splinter of shadow with a gold heart. Picking one up is a level-up.
function paintRemnant() {
  const c = makeCanvas(44, 60);
  const ctx = c.getContext('2d');
  ctx.save(); ctx.filter = 'blur(4px)'; ctx.fillStyle = 'rgba(154,92,255,0.7)';
  ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(36, 30); ctx.lineTo(22, 56); ctx.lineTo(8, 30); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#0a0612';
  ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(33, 30); ctx.lineTo(22, 54); ctx.lineTo(11, 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = radial(ctx, 22, 30, 9, [[0, '#fff4d0'], [0.5, '#e8c372'], [1, 'rgba(232,195,114,0)']]);
  ctx.beginPath(); ctx.arc(22, 30, 9, 0, TAU); ctx.fill();
  return c;
}

// ---------------- skill-bar icons (36 x 36, drawn on a dark tile by the HUD) ----------------
function icon(draw) {
  const c = makeCanvas(36, 36);
  draw(c.getContext('2d'));
  return c;
}

const ICONS = {
  strike: (ctx) => {
    ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const dx of [-6, 0, 6]) { ctx.beginPath(); ctx.moveTo(10 + dx, 8); ctx.quadraticCurveTo(24 + dx, 16, 18 + dx, 30); ctx.stroke(); }
  },
  dash: (ctx) => {
    ctx.fillStyle = '#9a6bff';
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.3 + i * 0.35; ctx.beginPath(); ctx.moveTo(6 + i * 7, 8); ctx.lineTo(16 + i * 7, 18); ctx.lineTo(6 + i * 7, 28); ctx.lineTo(10 + i * 7, 18); ctx.fill(); }
    ctx.globalAlpha = 1;
  },
  ember: (ctx) => {
    ctx.fillStyle = '#9a5cff';
    ctx.beginPath(); ctx.moveTo(18, 3); ctx.bezierCurveTo(30, 16, 28, 31, 18, 33); ctx.bezierCurveTo(8, 31, 6, 18, 14, 10); ctx.quadraticCurveTo(15, 18, 19, 19); ctx.quadraticCurveTo(14, 11, 18, 3); ctx.fill();
    ctx.fillStyle = '#05020a';
    ctx.beginPath(); ctx.moveTo(18, 14); ctx.bezierCurveTo(24, 21, 23, 30, 18, 30); ctx.bezierCurveTo(13, 30, 12, 23, 18, 14); ctx.fill();
  },
  echo: (ctx) => {
    ctx.fillStyle = 'rgba(154,92,255,0.45)';
    ctx.beginPath(); ctx.arc(23, 11, 5, 0, TAU); ctx.fill(); ctx.fillRect(18, 16, 10, 16);
    ctx.fillStyle = '#c9a8ff';
    ctx.beginPath(); ctx.arc(13, 11, 5, 0, TAU); ctx.fill(); ctx.fillRect(8, 16, 10, 16);
  },
  eclipse: (ctx) => {
    ctx.fillStyle = radial(ctx, 18, 18, 17, [[0.55, 'rgba(255,241,192,0)'], [0.62, 'rgba(255,248,224,1)'], [1, 'rgba(255,214,140,0)']]);
    ctx.fillRect(0, 0, 36, 36);
    ctx.fillStyle = '#05020a'; ctx.beginPath(); ctx.arc(18, 18, 9.5, 0, TAU); ctx.fill();
  },
  cling: (ctx) => {
    ctx.fillStyle = '#8f8aa3'; ctx.fillRect(26, 3, 6, 30);
    ctx.strokeStyle = '#c9a8ff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const y of [10, 18, 26]) { ctx.beginPath(); ctx.moveTo(25, y); ctx.lineTo(12, y + 3); ctx.stroke(); }
  },
};

export function buildPowerTextures(scene) {
  const add = (key, canvas) => addCanvasTexture(scene, key, canvas);
  add('ember_bolt', paintEmberBolt());
  add('eclipse_disc', paintEclipseDisc());
  add('slash_fx', paintSlash());
  add('halo_ring', paintHalo(128, 16));
  add('remnant', paintRemnant());
  for (const [k, draw] of Object.entries(ICONS)) add(`ab_${k}`, icon(draw));
}
