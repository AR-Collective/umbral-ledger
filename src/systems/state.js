// The one saveable object for a run (the design doc calls it WorldState).
//
// Rules this file enforces:
//  * Dying restores "flags" to what they were when you touched the last Stillpoint.
//  * Branch outcomes are NOT restored. Once rolled, they stay rolled (anti save-scum).
//  * Threads are not restored either. That is the whole point of Threads.
//  * "seenLines" survives death so tutorial dialogue does not repeat every reload.

import { TUNING } from '../tuning.js';
import { newSeed } from './rng.js';

const SAVE_KEY = 'umbral-ledger-save-v1';

function storage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function freshState(seed = newSeed()) {
  return {
    version: 1,
    seed,
    world: 'prologue',
    threads: TUNING.threads.perWorld,
    sand: 0,
    sandMax: 0,              // grows as the Prologue hands you Sand; full from World 1 on
    fragments: 0,            // also the light resistance level
    hourShards: {},          // world id -> true
    branches: {},            // branch id -> { choice, outcome, odds, attempt }
    badLuck: 0,
    reweaves: {},            // world id -> uses left
    ledger: [],              // plain-language lines the player can read in the pause menu
    codex: [],               // discovered combos
    seenLines: [],
    flags: {},               // live world flags since the last Stillpoint
    checkpoint: null,        // { world, id, flags }
    fractured: {},           // world id -> number of times failed
    stats: { deaths: 0, seen: 0, takedowns: 0, foresights: 0 },
  };
}

class GameState {
  constructor() {
    this.data = freshState();
  }

  // ---------- run lifecycle ----------
  newRun() {
    this.data = freshState();
    this.save();
  }

  hasSave() {
    const s = storage();
    try { return !!(s && s.getItem(SAVE_KEY)); } catch { return false; }
  }

  load() {
    const s = storage();
    if (!s) return false;
    let raw = null;
    try { raw = s.getItem(SAVE_KEY); } catch { return false; }
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version !== 1) return false;
      this.data = { ...freshState(parsed.seed), ...parsed };
      return true;
    } catch {
      return false;
    }
  }

  // Saving can fail (private windows, sandboxed pages). The game keeps running either way.
  save() {
    const s = storage();
    try { if (s) s.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch { /* not saved this time */ }
  }

  wipe() {
    const s = storage();
    try { if (s) s.removeItem(SAVE_KEY); } catch { /* nothing to remove */ }
    this.data = freshState();
  }

  // ---------- worlds ----------
  enterWorld(worldId) {
    const d = this.data;
    d.world = worldId;
    d.threads = TUNING.threads.perWorld;
    d.flags = {};
    d.checkpoint = null;
    if (d.reweaves[worldId] === undefined) d.reweaves[worldId] = 1;
    if (worldId !== 'prologue') d.sandMax = Math.max(d.sandMax, TUNING.sand.max);
    this.save();
  }

  // ---------- flags ----------
  flag(name) { return this.data.flags[name]; }
  setFlag(name, value = true) { this.data.flags[name] = value; }

  // ---------- Stillpoints ----------
  touchStillpoint(worldId, stillpointId) {
    const d = this.data;
    d.sand = d.sandMax;
    d.checkpoint = { world: worldId, id: stillpointId, flags: clone(d.flags) };
    this.save();
  }

  // Called after a death. Returns false if the world is out of Threads.
  loseThread() {
    const d = this.data;
    d.stats.deaths += 1;
    d.threads = Math.max(0, d.threads - 1);
    this.restoreCheckpointFlags();
    this.save();
    return d.threads > 0;
  }

  restoreCheckpointFlags() {
    const d = this.data;
    d.flags = d.checkpoint ? clone(d.checkpoint.flags) : {};
    if (d.sand < 1) d.sand = Math.min(1, d.sandMax);
  }

  // ---------- small helpers ----------
  addLedger(text) {
    if (!this.data.ledger.includes(text)) this.data.ledger.push(text);
    this.save();
  }

  markLineSeen(id) {
    if (!this.data.seenLines.includes(id)) this.data.seenLines.push(id);
  }

  lineSeen(id) { return this.data.seenLines.includes(id); }

  discoverCombo(name) {
    if (this.data.codex.includes(name)) return false;
    this.data.codex.push(name);
    this.save();
    return true;
  }
}

// One shared instance. Every scene imports this same object.
export const GAME = new GameState();
