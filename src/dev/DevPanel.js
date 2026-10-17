// =====================================================================
// DEV PANEL (press ` to toggle). A plain HTML overlay, not part of the game.
//
// Why HTML: sliders, checkboxes and dropdowns come for free and are easy to
// extend. Everything here only changes TUNING, DEV flags or the save state,
// the same values the game already reads.
//
// Workflow it is built for: jump to the checkpoint you are tuning, drag a
// slider until it feels right, press "Copy tuning" and paste the numbers into
// src/tuning.js so they become permanent.
// =====================================================================

import { TUNING, resistanceFor } from '../tuning.js';
import { DEV, saveDev } from './devFlags.js';
import { LEVELS } from '../levels/index.js';
import { GAME } from '../systems/state.js';

const CSS = `
#devpanel { position: fixed; top: 0; right: 0; width: 340px; max-height: 100vh; overflow-y: auto; z-index: 9999;
  background: rgba(10, 9, 16, 0.94); color: #d8d0e6; font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
  border-left: 1px solid #3a3450; padding: 10px 12px 40px; box-sizing: border-box; display: none; }
#devpanel h3 { margin: 14px 0 6px; color: #e8c372; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
#devpanel button { background: #1c1928; color: #d8d0e6; border: 1px solid #4a4458; border-radius: 3px; padding: 4px 6px;
  margin: 2px 2px 2px 0; cursor: pointer; font: inherit; text-align: left; }
#devpanel button:hover { border-color: #e8c372; color: #fff; }
#devpanel .jump { display: block; width: 100%; }
#devpanel label { display: flex; align-items: center; gap: 6px; margin: 3px 0; cursor: pointer; }
#devpanel .row { display: grid; grid-template-columns: 132px 1fr 46px; gap: 6px; align-items: center; margin: 4px 0; }
#devpanel input[type=range] { width: 100%; }
#devpanel select { background: #1c1928; color: #d8d0e6; border: 1px solid #4a4458; font: inherit; }
#devpanel .read { white-space: pre; color: #9fffb0; background: #050408; padding: 6px; border-radius: 3px; }
#devpanel .note { color: #7f7894; }
`;

export class DevPanel {
  constructor(game) {
    this.game = game;
    this.base = JSON.parse(JSON.stringify(TUNING));
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.el = document.createElement('div');
    this.el.id = 'devpanel';
    document.body.appendChild(this.el);
    this.build();
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') { e.preventDefault(); this.toggle(); }
    });
    setInterval(() => this.refresh(), 150);
  }

  gs() {
    const s = this.game.scene.getScene('Game');
    return s && (s.sys.isActive() || s.sys.isPaused()) ? s : null;
  }

  toggle() {
    const open = this.el.style.display !== 'block';
    this.el.style.display = open ? 'block' : 'none';
  }

  build() {
    const el = this.el;
    el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><b style="color:#e8c372">UMBRAL LEDGER DEV</b><span class="note">` to close</span></div>';

    // ---------------- live readout ----------------
    this.readout = this.add('div', { className: 'read' });

    // ---------------- checkpoint jumps ----------------
    this.section('Jump to checkpoint');
    for (const [id, level] of Object.entries(LEVELS)) {
      this.add('div', { className: 'note', textContent: level.name });
      const points = [
        ...(level.stillpoints ?? []).map((sp) => ({ id: sp.id, label: `Stillpoint: ${sp.name}${sp.hidden ? ' (hidden)' : ''}`, x: sp.x })),
        ...(level.spawns ?? []).map((sp) => ({ id: sp.id, label: sp.label, x: sp.x })),
      ].sort((a, b) => a.x - b.x);
      for (const p of points) this.button(p.label, () => this.jump(id, p.id), 'jump');
    }

    // ---------------- cheats and debug views ----------------
    this.section('Switches');
    this.check('god', 'God mode (no burn, no grabs)');
    this.check('invisible', 'Invisible to watchers');
    this.check('infiniteSand', 'Infinite Sand');
    this.check('infiniteThreads', 'Infinite Threads');
    this.check('noclip', 'Noclip (fly with arrows)');
    this.check('lightDebug', 'Show light grid (what the game computes)');
    this.check('aiDebug', 'Show all cones, meters, noise rings');
    this.check('colliders', 'Show physics boxes', () => this.gs()?.colliderDebug(DEV.colliders));
    this.check('skipCutscenes', 'Skip cutscenes');
    this.check('autoResume', 'On page reload, resume at last jump');

    this.section('Force branch outcomes');
    this.select('forceBell', 'Bell (Heavy)', ['random', 'favorable', 'mixed', 'unfavorable']);
    this.select('forceFork', 'Fork patrol (Light)', ['random', 'high', 'low']);
    this.add('div', { className: 'note', textContent: 'Fork applies on the next jump or reload. Bell applies when you ring it.' });

    // ---------------- live tuning ----------------
    this.section('Live tuning');
    this.slider('Time scale', 0.2, 2, 0.05, () => this.game.registry.get('timeScale') ?? 1, (v) => this.game.registry.set('timeScale', v));
    this.slider('Light resistance lvl', 0, 7, 1, () => GAME.data.fragments, (v) => { GAME.data.fragments = v; });
    this.slider('Grace in light (s)', 0, 2, 0.05, () => resistanceFor(GAME.data.fragments).grace, (v) => { resistanceFor(GAME.data.fragments).grace = v; });
    this.slider('Damage per tick', 2, 100, 1, () => resistanceFor(GAME.data.fragments).tick, (v) => { resistanceFor(GAME.data.fragments).tick = v; });
    this.slider('Seconds per tick', 0.3, 2, 0.05, () => resistanceFor(GAME.data.fragments).interval, (v) => { resistanceFor(GAME.data.fragments).interval = v; });
    this.slider('Detection speed x', 0.3, 3, 0.05, () => this.base.stealth.fillTime.light / TUNING.stealth.fillTime.light, (v) => {
      for (const k of ['light', 'dim', 'shade']) TUNING.stealth.fillTime[k] = this.base.stealth.fillTime[k] / v;
    });
    this.slider('Vision range x', 0.4, 2, 0.05, () => TUNING.stealth.range.light / this.base.stealth.range.light, (v) => {
      for (const k of ['light', 'dim', 'shade']) TUNING.stealth.range[k] = this.base.stealth.range[k] * v;
    });
    this.slider('Lanternman chase', 120, 420, 5, () => TUNING.enemies.lanternman.chase, (v) => { TUNING.enemies.lanternman.chase = v; });
    this.slider('Lanternman walk', 20, 160, 2, () => TUNING.enemies.lanternman.walk, (v) => { TUNING.enemies.lanternman.walk = v; });
    this.slider('Fog vision cut', 0, 0.9, 0.05, () => TUNING.stealth.fogVision, (v) => { TUNING.stealth.fogVision = v; });
    this.slider('Player run speed', 120, 420, 5, () => TUNING.player.runSpeed, (v) => { TUNING.player.runSpeed = v; });
    this.slider('Dawn duration (s)', 15, 150, 1, () => TUNING.dawn.duration, (v) => { TUNING.dawn.duration = v; });
    this.slider('Wick-Mother speed', 40, 260, 2, () => TUNING.wickMother.speed, (v) => { TUNING.wickMother.speed = v; });

    // ---------------- actions ----------------
    this.section('Actions');
    this.button('Refill Sand and Substance', () => { GAME.data.sand = GAME.data.sandMax; const g = this.gs(); if (g) g.player.substance = TUNING.player.maxSubstance; });
    this.button('Reset Threads to 3', () => { GAME.data.threads = TUNING.threads.perWorld; GAME.save(); });
    this.button('Toggle Hour-Shard', () => { const w = GAME.data.world; GAME.data.hourShards[w] = !GAME.data.hourShards[w]; GAME.save(); });
    this.button('Forget branch rolls (new seed)', () => { GAME.data.branches = {}; GAME.data.seed = (Math.random() * 4294967296) >>> 0; GAME.save(); });
    this.button('Kill player (test death)', () => this.gs()?.killPlayer('burned'));
    this.button('Reload current spot', () => { const g = this.gs(); if (g) g.devJump(g.worldId, g.currentSpawn.id); });
    this.button('Wipe save', () => { GAME.wipe(); });
    this.button('Copy tuning (paste into tuning.js)', () => this.copyTuning());
  }

  // ---------------- small DOM helpers ----------------
  add(tag, props = {}) {
    const n = document.createElement(tag);
    Object.assign(n, props);
    this.el.appendChild(n);
    return n;
  }

  section(title) { this.add('h3', { textContent: title }); }

  button(label, fn, cls = '') {
    const b = this.add('button', { textContent: label, className: cls });
    b.addEventListener('click', () => { fn(); b.blur(); });
    return b;
  }

  check(key, label, after) {
    const l = this.add('label');
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = !!DEV[key];
    c.addEventListener('change', () => { DEV[key] = c.checked; saveDev(); after?.(); c.blur(); });
    l.appendChild(c);
    l.appendChild(document.createTextNode(label));
  }

  select(key, label, options) {
    const l = this.add('label');
    l.appendChild(document.createTextNode(label + ' '));
    const s = document.createElement('select');
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      s.appendChild(opt);
    }
    s.value = DEV[key];
    s.addEventListener('change', () => { DEV[key] = s.value; saveDev(); s.blur(); });
    l.appendChild(s);
  }

  slider(label, min, max, step, get, set) {
    const row = this.add('div', { className: 'row' });
    const name = document.createElement('span');
    name.textContent = label;
    const r = document.createElement('input');
    r.type = 'range'; r.min = min; r.max = max; r.step = step;
    const val = document.createElement('span');
    const sync = () => { const v = get(); r.value = v; val.textContent = Number(v).toFixed(step < 1 ? 2 : 0); };
    r.addEventListener('input', () => { set(Number(r.value)); val.textContent = Number(r.value).toFixed(step < 1 ? 2 : 0); });
    r.addEventListener('change', () => r.blur());
    row.append(name, r, val);
    sync();
    (this.syncers ??= []).push(sync);
  }

  jump(world, spawnId) {
    const g = this.gs();
    if (g) { g.devJump(world, spawnId); return; }
    // From the title screen or end screen: start the Game scene directly.
    if (!GAME.load()) GAME.newRun();
    const mgr = this.game.scene;
    for (const key of ['Title', 'Cutscene', 'End']) if (mgr.isActive(key)) mgr.stop(key);
    const level = LEVELS[world];
    const spawn = (level.spawns ?? []).find((s) => s.id === spawnId);
    if (GAME.data.world !== world) GAME.enterWorld(world);
    GAME.data.flags = { ...(spawn?.flags ?? {}) };
    GAME.data.checkpoint = { world, id: spawnId, flags: { ...GAME.data.flags } };
    GAME.data.sandMax = Math.max(GAME.data.sandMax, TUNING.sand.max);
    GAME.data.sand = GAME.data.sandMax;
    GAME.data.threads = TUNING.threads.perWorld;
    GAME.save();
    DEV.lastJump = { world, spawn: spawnId };
    saveDev();
    mgr.start('Game', { world, spawn: spawnId, fromDeath: true });
  }

  // Shows the current numbers in a box you can copy from. Some browsers and
  // embedded views refuse clipboard access, so the box is the reliable path.
  copyTuning() {
    const text = `export const TUNING = ${JSON.stringify(TUNING, null, 2)};`;
    console.log(text);
    if (!this.tuningBox) {
      this.tuningBox = this.add('textarea', { readOnly: true, rows: 10 });
      Object.assign(this.tuningBox.style, { width: '100%', boxSizing: 'border-box', background: '#050408', color: '#9fffb0', border: '1px solid #3a3450', font: 'inherit' });
    }
    this.tuningBox.value = text;
    this.tuningBox.select();
    try { navigator.clipboard?.writeText(text).catch(() => {}); } catch { /* the box above still works */ }
  }

  refresh() {
    if (this.el.style.display !== 'block') return;
    const g = this.gs();
    const fps = this.game.loop.actualFps.toFixed(0);
    if (!g || !g.player) { this.readout.textContent = `fps ${fps}\n(no level running)`; return; }
    const p = g.player;
    const near = g.watchers.filter((w) => Math.abs(w.x - p.x) < 700).map((w) => `  ${w.id} ${w.mode}`).join('\n');
    this.readout.textContent =
      `fps ${fps}   world ${g.worldId}\n` +
      `x ${p.x.toFixed(0)}  feet ${p.feetY.toFixed(0)}  ${p.merged ? 'MERGED' : ''}${p.inCover ? ' IN COVER' : ''}\n` +
      `light ${p.lightInfo.value.toFixed(2)} ${p.lightInfo.state}${p.lightInfo.fire ? ' FIRE' : ''}\n` +
      `substance ${p.substance.toFixed(0)}  threads ${GAME.data.threads}  sand ${GAME.data.sand}\n` +
      `branches ${Object.entries(GAME.data.branches).map(([k, v]) => `${k.split('.')[1]}=${v.outcome}`).join(' ') || 'none'}\n` +
      (near ? `watchers near:\n${near}` : 'no watchers near');
  }
}
