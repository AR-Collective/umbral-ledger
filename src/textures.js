// =====================================================================
// TEXTURES: every image in the game is painted with code at boot.
//
// Why procedural art: no copyright risk (the jam disqualifies copied assets),
// nothing to download, and an artist can later replace any key with a real
// PNG by loading it under the same key in BootScene. Nothing else changes.
//
// This file paints the small things (particles, glows, HUD icons, pickups).
// The characters live in art/characters.js and the scenery in art/scenery.js.
// =====================================================================

import { canvasTex, radial, vgrad } from './art/paint.js';
import { buildCharacters } from './art/characters.js';
import { buildScenery } from './art/scenery.js';

export const PALETTE = {
  violet: '#9a6bff',
  ember: '#ff8a3d',
  fire: '#ff5a1f',
  gold: '#e8c372',
  cold: '#9fc6ff',
};

export function generateTextures(scene) {
  // ---------------- particles and glows ----------------
  canvasTex(scene, 'px', 2, 2, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); });
  canvasTex(scene, 'dot', 32, 32, (ctx) => {
    ctx.fillStyle = radial(ctx, 16, 16, 16, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 32, 32);
  });
  canvasTex(scene, 'spark', 8, 8, (ctx) => {
    ctx.fillStyle = radial(ctx, 4, 4, 4, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 8, 8);
  });
  canvasTex(scene, 'ember', 6, 12, (ctx) => {
    ctx.fillStyle = vgrad(ctx, 0, 12, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0.2)']]);
    ctx.beginPath(); ctx.ellipse(3, 6, 2.2, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  });
  canvasTex(scene, 'smoke', 64, 64, (ctx) => {
    ctx.fillStyle = radial(ctx, 32, 32, 32, [[0, 'rgba(255,255,255,0.5)'], [0.5, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 64, 64);
  });
  canvasTex(scene, 'softglow', 128, 128, (ctx) => {
    ctx.fillStyle = radial(ctx, 64, 64, 64, [[0, 'rgba(255,255,255,0.9)'], [0.2, 'rgba(255,255,255,0.45)'], [0.55, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 128, 128);
  });
  canvasTex(scene, 'flare', 128, 128, (ctx) => {
    ctx.fillStyle = radial(ctx, 64, 64, 64, [[0, 'rgba(255,255,255,1)'], [0.08, 'rgba(255,255,255,0.8)'], [0.25, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
    ctx.fillRect(0, 0, 128, 128);
  });
  // red edges of the screen for the burn-tick pulse (works without shaders)
  canvasTex(scene, 'vignette_red', 640, 360, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, 'rgba(160,10,4,0)');
    g.addColorStop(0.6, 'rgba(170,14,6,0.35)');
    g.addColorStop(1, 'rgba(190,20,8,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // ---------------- carried and hanging lights ----------------
  canvasTex(scene, 'lantern', 20, 34, (ctx) => {
    ctx.fillStyle = '#1a1310'; ctx.fillRect(8, 0, 4, 5);
    ctx.strokeStyle = '#1a1310'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(10, 4, 4, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#2a1d14';
    ctx.beginPath(); ctx.moveTo(2, 9); ctx.lineTo(10, 4); ctx.lineTo(18, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = vgrad(ctx, 9, 29, [[0, '#fff6d0'], [0.5, '#ffc062'], [1, '#e07a2a']]);
    ctx.fillRect(4, 9, 12, 20);
    ctx.fillStyle = '#2a1d14';
    ctx.fillRect(3, 9, 2, 20); ctx.fillRect(15, 9, 2, 20); ctx.fillRect(9, 9, 2, 20);
    ctx.fillRect(2, 28, 16, 4);
  });
  canvasTex(scene, 'chain_lamp', 18, 28, (ctx) => {
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(1, 2, 16, 3); ctx.fillRect(1, 23, 16, 3);
    ctx.fillStyle = vgrad(ctx, 5, 23, [[0, '#fff3c8'], [0.5, '#ffb85a'], [1, '#e0782a']]);
    ctx.fillRect(3, 5, 12, 18);
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(8, 5, 2, 18);
  });
  canvasTex(scene, 'candle', 10, 26, (ctx) => {
    ctx.fillStyle = '#d8ccb0'; ctx.fillRect(3, 9, 4, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(3, 9, 1.5, 17);
  });
  canvasTex(scene, 'flame', 16, 28, (ctx) => {
    ctx.fillStyle = radial(ctx, 8, 18, 10, [[0, 'rgba(255,255,240,1)'], [0.35, 'rgba(255,200,90,0.95)'], [1, 'rgba(255,90,20,0)']]);
    ctx.beginPath(); ctx.moveTo(8, 1); ctx.quadraticCurveTo(15, 16, 8, 27); ctx.quadraticCurveTo(1, 16, 8, 1); ctx.fill();
  });

  // ---------------- pickups and places ----------------
  canvasTex(scene, 'stillpoint', 44, 70, (ctx) => {
    ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 12;
    const g = ctx.createLinearGradient(0, 0, 44, 70);
    g.addColorStop(0, '#f6fbff'); g.addColorStop(0.5, '#a8ccff'); g.addColorStop(1, '#5a7fc4');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(22, 4); ctx.lineTo(37, 32); ctx.lineTo(22, 66); ctx.lineTo(7, 32); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(22, 8); ctx.lineTo(29, 32); ctx.lineTo(22, 37); ctx.closePath(); ctx.fill();
  });
  canvasTex(scene, 'sand', 16, 16, (ctx) => {
    ctx.fillStyle = radial(ctx, 8, 8, 8, [[0, '#fff4cf'], [0.35, '#e8c372'], [1, 'rgba(232,195,114,0)']]);
    ctx.fillRect(0, 0, 16, 16);
  });
  canvasTex(scene, 'hourshard', 28, 44, (ctx) => {
    ctx.shadowColor = '#ffe6a8'; ctx.shadowBlur = 10;
    const g = ctx.createLinearGradient(0, 0, 28, 44);
    g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#c9953f');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(24, 15); ctx.lineTo(14, 41); ctx.lineTo(4, 15); ctx.closePath(); ctx.fill();
  });
  canvasTex(scene, 'portal', 150, 210, (ctx) => {
    const flame = (s, color) => {
      ctx.beginPath();
      ctx.moveTo(75, 210 - 206 * s);
      ctx.bezierCurveTo(75 + 74 * s, 210 - 126 * s, 75 + 64 * s, 210 - 22 * s, 75, 208);
      ctx.bezierCurveTo(75 - 64 * s, 210 - 22 * s, 75 - 74 * s, 210 - 126 * s, 75, 210 - 206 * s);
      ctx.fillStyle = color; ctx.fill();
    };
    ctx.filter = 'blur(7px)'; flame(0.96, 'rgba(232,195,114,0.5)');
    ctx.filter = 'blur(2px)'; flame(0.82, 'rgba(255,214,140,0.7)');
    ctx.filter = 'none'; flame(0.64, 'rgba(30,18,40,0.95)');
    flame(0.46, 'rgba(8,4,14,1)');
  });

  // ---------------- HUD icons ----------------
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
  // Light state glyphs: shape, not just colour (accessibility rule from the doc).
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

  buildCharacters(scene);
  buildScenery(scene);
}
