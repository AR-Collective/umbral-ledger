// Dev tool: paints every character sheet, cutscene panel, and scenery texture onto a plain page,
// so art can be checked without playing to the right spot.
import { paintSheets } from '../art/characters.js';
import cutFire from '../assets/cutscenes/fire.jpg';
import cutDoorway from '../assets/cutscenes/doorway.jpg';
import cutSplit from '../assets/cutscenes/split.jpg';
import cutLamp from '../assets/cutscenes/lamp.jpg';
import cutTitle from '../assets/cutscenes/title.jpg';
import cutFragment from '../assets/cutscenes/fragment.jpg';
import cutMemory from '../assets/cutscenes/memory.jpg';
import cutResist from '../assets/cutscenes/resist.jpg';
import cutAbility from '../assets/cutscenes/ability.jpg';

const out = document.getElementById('out');
const params = new URLSearchParams(location.search);
const only = params.get('only');
const zoom = Number(params.get('zoom') || 2);

function section(title, canvases) {
  const h = document.createElement('h2');
  h.textContent = title;
  out.appendChild(h);
  const row = document.createElement('div');
  row.className = 'row';
  for (const c of canvases) row.appendChild(c);
  out.appendChild(row);
}

// Close-ups: the frames of each animation, enlarged, on a mid-tone backdrop.
function closeups(sheet, def) {
  const cols = Math.floor(sheet.width / def.w);
  const list = [];
  let i = 0;
  for (const [name, a] of Object.entries(def.anims)) {
    const step = Math.max(1, Math.floor(a.n / 4));
    for (let k = 0; k < a.n; k += step) {
      const idx = i + k;
      const c = document.createElement('canvas');
      c.width = def.w * zoom; c.height = def.h * zoom;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#3a3a52';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#555';
      ctx.fillRect(0, (def.h - def.base) * zoom, c.width, 1);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sheet, (idx % cols) * def.w, Math.floor(idx / cols) * def.h, def.w, def.h, 0, 0, def.w * zoom, def.h * zoom);
      c.title = `${name} ${k}`;
      list.push(c);
    }
    i += a.n;
  }
  if (!Object.keys(def.anims).length) {
    const c = document.createElement('canvas');
    c.width = def.w * zoom; c.height = def.h * zoom;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a3a52'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(sheet, 0, 0, def.w, def.h, 0, 0, def.w * zoom, def.h * zoom);
    list.push(c);
  }
  return list;
}

if (!only || only === 'cutscenes') {
  const cutscenes = [
    ['fire', cutFire],
    ['doorway', cutDoorway],
    ['split', cutSplit],
    ['lamp', cutLamp],
    ['title', cutTitle],
    ['fragment', cutFragment],
    ['memory', cutMemory],
    ['resist', cutResist],
    ['ability', cutAbility],
  ];
  const nodes = cutscenes.map(([name, url]) => {
    const img = document.createElement('img');
    img.src = url;
    img.title = name;
    img.alt = name;
    img.style.width = '392px';
    img.style.height = '208px';
    img.style.border = '2px solid #e9e2f5';
    return img;
  });
  section('Cutscene panels', nodes);
}

if (!only || only === 'chars') {
  const sheets = paintSheets();
  for (const [key, { sheet, def }] of Object.entries(sheets)) {
    if (params.get('char') && params.get('char') !== key) continue;
    section(key, closeups(sheet, def));
  }
}

import('../art/scenery.js').then((m) => {
  if (only === 'chars' || only === 'cutscenes' || !m.previewScenery) { document.body.dataset.ready = '1'; return; }
  for (const [title, canvases] of m.previewScenery(params)) section(title, canvases);
  document.body.dataset.ready = '1';
}).catch((e) => { console.error(e); document.body.dataset.ready = '1'; });
