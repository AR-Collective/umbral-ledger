// =====================================================================
// HUD: everything drawn on top of the world. Runs as its own scene so it
// stays crisp, keeps working while the Game scene is paused, and never
// moves with the camera.
//
// Minimal by default (design doc 5.2): Threads, Sand and a light-state glyph.
// Substance is shown on the player's fraying edge; press H for a full HUD bar.
// =====================================================================

import Phaser from 'phaser';
import { TUNING, resistanceFor } from '../tuning.js';
import { GAME } from '../systems/state.js';
import { AUDIO } from '../systems/audio.js';
import { bus } from '../systems/bus.js';
import { SPEAKERS, CONTROLS, GAMEPAD_CONTROLS, LEDGER_TEXT, COMBOS, FRAGMENT_LEDGER } from '../story.js';
import * as BR from '../systems/branches.js';
import { addSoundToggle, toggleSound } from '../systems/soundToggle.js';

const SERIF = '"Cormorant Garamond", Georgia, serif';
const TITLE = 'Cinzel, Georgia, serif';
const SANS = 'Inter, Arial, sans-serif';
const GOLD = '#e8c372';

export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  create() {
    const { width: W, height: H } = TUNING.view;
    this.W = W; this.H = H;
    this.queue = [];
    this.current = null;
    this.worldLines = [];

    // ---- status cluster (top left) ----
    this.threadIcons = [];
    for (let i = 0; i < 3; i++) this.threadIcons.push(this.add.image(34 + i * 22, 36, 'icon_thread'));
    this.sandIcons = [];
    for (let i = 0; i < 3; i++) this.sandIcons.push(this.add.image(34 + i * 22, 78, 'icon_sand'));
    this.glyph = this.add.image(W - 40, 38, 'glyph_shade').setScale(1.2);
    this.soundIcon = addSoundToggle(this, W - 84, 38);
    // Substance: shown whenever you are hurt. The notches mark one burn tick each,
    // so you can count how many seconds of light you can still survive.
    this.barGfx = this.add.graphics();
    this.barAlpha = 0;
    this.barFlash = 0;
    // red pulse at the screen edges for every burn tick
    this.redPulse = this.add.image(0, 0, 'vignette_red').setOrigin(0).setDisplaySize(W, H).setAlpha(0).setDepth(-1);

    // ---- subtitles (bottom center) ----
    this.subName = this.add.text(W / 2, H - 104, '', { fontFamily: TITLE, fontSize: '15px', color: GOLD, letterSpacing: 4 }).setOrigin(0.5);
    this.subText = this.add.text(W / 2, H - 86, '', {
      fontFamily: SERIF, fontStyle: 'italic', fontSize: '29px', color: '#f1e6cf', align: 'center',
      wordWrap: { width: 900 }, stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5, 0);

    // ---- hint (bottom left) ----
    // Hints wait their turn (two in a row would otherwise replace each other at
    // once), and the backing grows upward with the text.
    this.hintQueue = [];
    this.hintBg = this.add.rectangle(20, H - 13, 10, 34, 0x000000, 0.55).setOrigin(0, 1).setAlpha(0);
    this.hint = this.add.text(36, H - 21, '', { fontFamily: SANS, fontSize: '16px', color: '#cfc9de', wordWrap: { width: 640 }, lineSpacing: 3 }).setOrigin(0, 1).setAlpha(0);

    // ---- toast (top center) ----
    this.toastText = this.add.text(W / 2, 40, '', {
      fontFamily: SERIF, fontSize: '24px', color: '#e9e2f5', align: 'center', stroke: '#000', strokeThickness: 4, wordWrap: { width: 820 },
    }).setOrigin(0.5, 0).setAlpha(0);

    // ---- interaction prompt (follows the world) ----
    this.promptText = this.add.text(0, 0, '', {
      fontFamily: SANS, fontSize: '15px', color: '#f4ecd8', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setVisible(false);

    // ---- Foresight overlay ----
    this.foreFrame = this.add.graphics().setVisible(false);
    this.foreLabel = this.add.text(W / 2, 22, '', { fontFamily: TITLE, fontSize: '18px', color: '#cfe2ff', letterSpacing: 6 }).setOrigin(0.5, 0).setVisible(false);

    // ---- death overlay ----
    this.deathShade = this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setAlpha(0);
    this.deathText = this.add.text(W / 2, H / 2 - 30, '', { fontFamily: SERIF, fontSize: '42px', color: '#efe3d0' }).setOrigin(0.5).setAlpha(0);
    this.threadText = this.add.text(W / 2, H / 2 + 30, '', { fontFamily: SERIF, fontStyle: 'italic', fontSize: '26px', color: '#d9cbb0' }).setOrigin(0.5).setAlpha(0);

    this.buildPowerHud();
    this.buildBranchPanel();
    this.buildPauseMenu();

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,E,ENTER,ESC,R,SPACE,TAB');

    const handlers = {
      'hud:reset': () => this.resetOverlays(),
      line: (l) => this.onLine(l),
      toast: (t, ms) => this.showToast(t, ms),
      death: (t) => this.showDeath(t),
      thread: (t) => this.showThread(t),
      'foresight:start': (s) => this.showForesight(true, s),
      'foresight:time': (tp, h) => this.foreLabel.setText(`FORESIGHT   +${tp.toFixed(1)}s / ${h}s`),
      'foresight:end': () => this.showForesight(false),
      'branch:open': (d) => this.openBranch(d),
      'branch:result': (r) => this.branchResult(r),
      'pause:open': (tab) => this.openPause(tab),
      burnTick: () => this.onBurnTick(),
      levelup: (it) => this.showLevelUp(it),
      ledgerIntro: () => this.showFragmentLedger(),
      boss: (b) => this.onBoss(b),
      'eclipse:ready': () => this.showToast('Eclipse is ready (I).', 1600),
    };
    for (const [k, fn] of Object.entries(handlers)) bus.on(k, fn);
    this.events.once('shutdown', () => { for (const [k, fn] of Object.entries(handlers)) bus.off(k, fn); });
  }

  gs() { return this.scene.get('Game'); }

  // ------------------------------------------------------------------
  // The final world's power HUD: skill bar, level-ups, the fragment ledger, the boss
  // ------------------------------------------------------------------
  buildPowerHud() {
    const { W, H } = this;
    // skill bar, bottom right: [J strike] [K dash] [L ember] [U echo] [I eclipse]
    this.skillSlots = ['strike', 'dash', 'ember', 'echo', 'eclipse'].map((id, i, all) => {
      const x = W - 36 - (all.length - 1 - i) * 58, y = 104;     // top right, under the light glyph
      const icon = this.add.image(x, y, `ab_${id}`).setScale(1.05);
      const key = this.add.text(x + 18, y + 16, { strike: 'J', dash: 'K', ember: 'L', echo: 'U', eclipse: 'I' }[id], {
        fontFamily: SANS, fontSize: '12px', fontStyle: 'bold', color: '#efe6ff', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
      return { id, x, y, icon, key };
    });
    this.skillGfx = this.add.graphics().setDepth(-0.5);
    this.skillFx = this.add.graphics();
    this.skillSlots.forEach((sl) => { sl.icon.setDepth(1); sl.key.setDepth(2); });
    this.skillVisible = false;

    // LEVEL UP banner, centre
    this.lvl = this.add.container(W / 2, 250).setAlpha(0).setDepth(50);
    const streak = this.add.image(0, 6, 'slash_fx').setScale(5.5, 1.4).setAlpha(0.55).setBlendMode('ADD');
    this.lvlHead = this.add.text(0, -36, 'LEVEL UP', { fontFamily: TITLE, fontSize: '54px', color: '#f6e7c1', letterSpacing: 12 }).setOrigin(0.5).setShadow(0, 0, '#9a5cff', 24, true, true);
    this.lvlTitle = this.add.text(0, 22, '', { fontFamily: TITLE, fontSize: '24px', color: GOLD, letterSpacing: 5 }).setOrigin(0.5);
    this.lvlText = this.add.text(0, 58, '', { fontFamily: SERIF, fontStyle: 'italic', fontSize: '24px', color: '#efe6ff', align: 'center', wordWrap: { width: 760 }, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 0);
    this.lvl.add([streak, this.lvlHead, this.lvlTitle, this.lvlText]);

    // The Ledger of Fragments, left of centre
    this.frag = this.add.container(70, 150).setAlpha(0).setDepth(49);
    const bg = this.add.rectangle(-30, -30, 560, 420, 0x06030c, 0.82).setOrigin(0).setStrokeStyle(1, 0xe8c372, 0.5);
    const head = this.add.text(0, -10, 'THE LEDGER OF FRAGMENTS', { fontFamily: TITLE, fontSize: '22px', color: GOLD, letterSpacing: 5 });
    const sub = this.add.text(0, 22, 'Six of seven pieces of him have come home.', { fontFamily: SERIF, fontStyle: 'italic', fontSize: '20px', color: '#cfc6e0' });
    this.frag.add([bg, head, sub]);
    this.fragRows = FRAGMENT_LEDGER.map(([num, world, power, what], i) => {
      const y = 66 + i * 46;
      const row = this.add.container(0, y).setAlpha(0);
      const last = i === FRAGMENT_LEDGER.length - 1;
      row.add(this.add.text(0, 0, num, { fontFamily: TITLE, fontSize: '18px', color: last ? '#6f6a82' : GOLD }).setOrigin(0, 0));
      row.add(this.add.text(44, 0, world, { fontFamily: SERIF, fontSize: '20px', color: last ? '#8f8aa3' : '#e9e2f5' }));
      row.add(this.add.text(250, -2, power, { fontFamily: TITLE, fontSize: '17px', color: last ? '#6f6a82' : '#c9a8ff', letterSpacing: 2 }));
      row.add(this.add.text(250, 20, what, { fontFamily: SERIF, fontStyle: 'italic', fontSize: '15px', color: '#9f98b5' }));
      this.frag.add(row);
      return row;
    });

    // Boss bar, top centre
    this.bossBox = this.add.container(W / 2, 30).setAlpha(0).setDepth(48);
    this.bossName = this.add.text(0, 0, '', { fontFamily: TITLE, fontSize: '20px', color: '#fff1c0', letterSpacing: 8 }).setOrigin(0.5, 0).setShadow(0, 0, '#ff9a40', 14, true, true);
    this.bossState = this.add.text(0, 58, '', { fontFamily: SANS, fontSize: '13px', color: '#e8c372', letterSpacing: 2 }).setOrigin(0.5, 0);
    this.bossGfx = this.add.graphics();
    // a dark backing: the boss bar sits right over the white sun in the sky
    const back = this.add.rectangle(0, 38, 420, 86, 0x0a0406, 0.62).setStrokeStyle(1, 0xe8c372, 0.35);
    this.bossBox.add([back, this.bossGfx, this.bossName, this.bossState]);
    this.boss = null;
  }

  showLevelUp(it) {
    this.tweens.killTweensOf(this.lvl);
    const levelUp = !/AWAKENED/.test(it.title ?? '');
    this.lvlHead.setText(levelUp ? 'LEVEL UP' : 'AWAKENED');
    this.lvlTitle.setText((it.title ?? '').replace('ABILITY AWAKENED: ', ''));
    this.lvlText.setText(it.text ?? '');
    this.lvl.setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.lvl, alpha: 1, scale: 1, duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.lvl, alpha: 0, duration: 600, delay: 4200 });
  }

  showFragmentLedger() {
    this.tweens.killTweensOf(this.frag);
    this.frag.setAlpha(0).setX(40);
    this.tweens.add({ targets: this.frag, alpha: 1, x: 70, duration: 500, ease: 'Cubic.easeOut' });
    this.fragRows.forEach((row, i) => {
      row.setAlpha(0).setX(-20);
      this.tweens.add({ targets: row, alpha: 1, x: 0, duration: 300, delay: 600 + i * 420, onStart: () => AUDIO.play(i < 6 ? 'ui' : 'uiSelect') });
    });
    this.tweens.add({ targets: this.frag, alpha: 0, duration: 800, delay: 600 + FRAGMENT_LEDGER.length * 420 + 2600 });
  }

  onBoss(b) {
    this.boss = b;
    const show = b.state !== 'idle' && b.state !== 'dead';
    this.tweens.killTweensOf(this.bossBox);
    this.tweens.add({ targets: this.bossBox, alpha: show ? 1 : 0, duration: show ? 400 : 1500, delay: b.state === 'dying' ? 1500 : 0 });
    this.bossName.setText(b.name);
    this.bossState.setText(b.state === 'stagger' ? 'HE KNEELS. STRIKE THE CORE!' : b.shield ? `SHIELD: ${b.lit} BRAZIER${b.lit === 1 ? '' : 'S'} BURNING` : b.state === 'dying' ? 'THE SUN IS BREAKING' : '')
      .setColor(b.state === 'stagger' ? '#ffffff' : '#e8c372');
    const g = this.bossGfx;
    g.clear();
    for (let i = 0; i < b.total; i++) {
      const x = (i - (b.total - 1) / 2) * 40, y = 42;
      const done = i < b.cracks;
      g.fillStyle(done ? 0x2a1810 : 0xfff1c0, done ? 0.9 : 0.95);
      g.fillPoints([{ x, y: y - 11 }, { x: x + 11, y }, { x, y: y + 11 }, { x: x - 11, y }], true);
      g.lineStyle(2, 0xe8c372, 1);
      g.strokePoints([{ x, y: y - 11 }, { x: x + 11, y }, { x, y: y + 11 }, { x: x - 11, y }], true);
      if (done) { g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(x - 6, y - 4, x + 5, y + 5); }
    }
  }

  drawSkillBar(gs) {
    const ab = gs.abilities;
    const want = !!ab && GAME.data.abilities.length > 0;
    if (want !== this.skillVisible) {
      this.skillVisible = want;
      this.skillSlots.forEach((sl) => { sl.icon.setVisible(want); sl.key.setVisible(want); });
    }
    const g = this.skillGfx, fx = this.skillFx;
    g.clear(); fx.clear();
    if (!want) return;
    const st = ab.status();
    const p = gs.player;
    st.strike = { have: true, ready: p.strikeCd <= 0, k: 1 - Math.max(0, p.strikeCd) / TUNING.player.strikeCooldown };
    for (const sl of this.skillSlots) {
      const v = st[sl.id];
      const show = v.have;
      sl.icon.setVisible(show); sl.key.setVisible(show);
      if (!show) continue;
      g.fillStyle(0x06030c, 0.78);
      g.fillRoundedRect(sl.x - 24, sl.y - 24, 48, 48, 8);
      g.lineStyle(2, v.active ? 0xfff1c0 : v.ready ? 0x9a6bff : 0x3a3450, v.ready ? 1 : 0.8);
      g.strokeRoundedRect(sl.x - 24, sl.y - 24, 48, 48, 8);
      sl.icon.setAlpha(v.ready ? 1 : 0.45);
      if (!v.ready && v.k < 1) {
        // cooldown: the slot fills from the bottom as it comes back
        const h = 44 * (1 - Math.max(0, v.k));
        fx.fillStyle(0x000000, 0.55);
        fx.fillRect(sl.x - 22, sl.y - 22, 44, h);
      }
      if (sl.id === 'eclipse') {
        // the Eclipse charge: one pip per kill
        const n = TUNING.abilities.eclipse.killsToCharge;
        for (let i = 0; i < n; i++) {
          fx.fillStyle(i < Math.round(v.k * n) ? 0xfff1c0 : 0x2a2438, 1);
          fx.fillCircle(sl.x - 15 + i * 10, sl.y + 32, 3);
        }
        if (v.ready && !v.active) { fx.lineStyle(2, 0xfff1c0, 0.4 + Math.sin(this.time.now / 160) * 0.3); fx.strokeRoundedRect(sl.x - 28, sl.y - 28, 56, 56, 10); }
      }
    }
  }

  onBurnTick() {
    this.tweens.killTweensOf(this.redPulse);
    this.redPulse.setAlpha(0.9);
    this.tweens.add({ targets: this.redPulse, alpha: 0, duration: TUNING.light.flashTime * 1000, ease: 'Quad.easeOut' });
    this.barFlash = 1;
    this.barAlpha = 1;
  }

  drawSubstanceBar(dt, p, y) {
    const health = Math.max(0, p.substance / TUNING.player.maxSubstance);
    const want = health < 0.995 || p.burnVis > 0.05 || this.gs()?.settings?.fullHud ? 1 : 0;
    this.barAlpha += (want - this.barAlpha) * Math.min(1, dt * (want ? 8 : 1.5));
    this.barFlash = Math.max(0, this.barFlash - dt * 3);
    const g = this.barGfx;
    g.clear();
    if (this.barAlpha < 0.01) return;
    const x = 24, w = 168, h = 7;
    g.fillStyle(0x000000, 0.6 * this.barAlpha);
    g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
    const col = p.burnVis > 0.05 ? 0xff7a3a : 0x9a6bff;
    g.fillStyle(col, this.barAlpha);
    g.fillRoundedRect(x, y, Math.max(2, w * health), h, 3);
    if (this.barFlash > 0) {
      g.fillStyle(0xffffff, this.barFlash * 0.8 * this.barAlpha);
      g.fillRoundedRect(x, y, Math.max(2, w * health), h, 3);
    }
    const tick = resistanceFor(GAME.data.fragments).tick;
    g.fillStyle(0x000000, 0.8 * this.barAlpha);
    for (let v = tick; v < TUNING.player.maxSubstance; v += tick) g.fillRect(x + (w * v) / TUNING.player.maxSubstance - 1, y - 1, 2, h + 2);
  }

  resetOverlays() {
    this.tweens.killTweensOf([this.deathShade, this.deathText, this.threadText, this.hint, this.hintBg, this.redPulse]);
    this.redPulse.setAlpha(0);
    this.barAlpha = 0;
    this.tweens.killTweensOf(this.toastText); this.toastText.setAlpha(0);
    this.hint.setAlpha(0); this.hintBg.setAlpha(0); this.hintTimer = 0; this.hintQueue = [];
    this.lvl?.setAlpha(0); this.frag?.setAlpha(0); this.bossBox?.setAlpha(0);
    this.deathShade.setAlpha(0); this.deathText.setAlpha(0); this.threadText.setAlpha(0);
    this.showForesight(false);
    this.branchPanel.setVisible(false);
    this.pausePanel.setVisible(false);
    for (const wl of this.worldLines) wl.text.destroy();
    this.worldLines = [];
    this.queue = [];
    this.current = null;
    this.subText.setText(''); this.subName.setText('');
  }

  // ------------------------------------------------------------------
  // Lines and messages
  // ------------------------------------------------------------------
  // Queued lines (a conversation) play strictly in order, whoever speaks.
  // Unqueued lines (barks, one-off whispers) appear at once.
  onLine(l) {
    if (l.queue) { this.queue.push(l); return; }
    if (l.speaker === 'entity') { this.queue.unshift(l); this.current = null; this.subText.setText(''); return; }
    this.showWorldLine(l);
  }

  showWorldLine(l) {
    if (l.speaker === 'hint') { this.showHint(l.text); return 0; }
    // Whisper and survivors speak in the world, near whoever is talking.
    const sp = SPEAKERS[l.speaker] ?? SPEAKERS.hint;
    const isWhisper = l.speaker === 'whisper';
    const t = this.add.text(0, 0, isWhisper ? l.text : `${l.text}`, {
      fontFamily: SERIF, fontStyle: isWhisper ? 'italic' : 'normal', fontSize: isWhisper ? '24px' : '21px',
      color: sp.color, stroke: '#000000', strokeThickness: 4, align: 'center', wordWrap: { width: 380 },
    }).setOrigin(0.5, 1).setAlpha(0);
    const life = 2.4 + l.text.length / 22;
    // replace older lines from the same speaker
    for (const wl of this.worldLines) if (wl.speaker === l.speaker) wl.t = Math.max(wl.t, wl.life - 0.3);
    this.worldLines.push({ text: t, follow: l.follow, speaker: l.speaker, t: 0, life, drift: isWhisper ? (Math.random() - 0.5) * 60 : 0 });
    return life;
  }

  showHint(text) {
    if (this.hintTimer > 0) { if (!this.hintQueue.includes(text) && this.hint.text !== text) this.hintQueue.push(text); return; }
    this.tweens.killTweensOf([this.hint, this.hintBg]);
    this.hint.setText(text);
    this.hintBg.setSize(this.hint.width + 32, this.hint.height + 16);
    this.hintTimer = 4 + text.length / 22;
    this.tweens.add({ targets: [this.hint, this.hintBg], alpha: 1, duration: 300 });
  }

  showToast(text, ms = 3200) {
    this.toastText.setText(text).setAlpha(0);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 1, duration: 250, hold: ms, yoyo: true });
  }

  showDeath(text) {
    this.deathText.setText(text);
    this.tweens.add({ targets: this.deathShade, alpha: 0.55, duration: 700 });
    this.tweens.add({ targets: this.deathText, alpha: 1, duration: 700, delay: 200 });
  }

  showThread(text) {
    this.threadText.setText(text);
    this.tweens.add({ targets: this.threadText, alpha: 1, duration: 500 });
    this.tweens.add({ targets: this.deathShade, alpha: 0.85, duration: 1200 });
  }

  showForesight(on, seconds) {
    this.foreFrame.setVisible(on);
    this.foreLabel.setVisible(on);
    if (on) {
      const g = this.foreFrame;
      g.clear();
      g.fillStyle(0x000000, 0.55);
      g.fillRect(0, 0, this.W, 54);
      g.fillRect(0, this.H - 54, this.W, 54);
      g.lineStyle(2, 0x9fc6ff, 0.35);
      g.strokeRect(6, 60, this.W - 12, this.H - 120);
      this.foreLabel.setText(`FORESIGHT   +0.0s / ${seconds}s`);
    }
  }

  // ------------------------------------------------------------------
  // Per frame
  // ------------------------------------------------------------------
  update(time, delta) {
    const dt = delta / 1000;
    const gs = this.gs();
    if (!gs || !gs.player || !gs.sys.isActive() && !gs.sys.isPaused()) return;
    const d = GAME.data;
    const p = gs.player;

    // Threads (only in worlds that use them) and Sand
    const showThreads = !gs.level?.noThreads;
    this.threadIcons.forEach((ic, i) => ic.setVisible(showThreads).setTexture(i < d.threads ? 'icon_thread' : 'icon_thread_cut'));
    this.sandIcons.forEach((ic, i) => ic.setVisible(i < d.sandMax).setTexture(i < d.sand ? 'icon_sand' : 'icon_sand_empty'));
    if (!showThreads) this.sandIcons.forEach((ic) => ic.setY(36)); else this.sandIcons.forEach((ic) => ic.setY(78));
    const st = p.lightInfo.state;
    this.glyph.setTexture(st === 'light' ? 'glyph_light' : st === 'dim' ? 'glyph_dim' : 'glyph_shade');
    this.drawSubstanceBar(dt, p, showThreads ? 104 : 62);
    this.drawSkillBar(gs);

    // The conversation queue. Entity lines are subtitles with a typewriter;
    // anyone else speaks in the world and the queue waits for them.
    if (!this.current && this.queue.length) {
      const next = this.queue.shift();
      if (next.speaker === 'entity') {
        this.current = { ...next, shown: 0, hold: 0 };
        this.subName.setText(SPEAKERS.entity.name);
      } else {
        const life = this.showWorldLine(next);
        this.current = { world: true, wait: life * 0.8 };
      }
    }
    if (this.current && this.current.world) {
      this.current.wait -= dt;
      if (this.current.wait <= 0) this.current = null;
    } else if (this.current) {
      const c = this.current;
      c.shown = Math.min(c.text.length, c.shown + dt * 48);
      this.subText.setText(c.text.slice(0, Math.floor(c.shown)));
      if (c.shown >= c.text.length) {
        c.hold += dt;
        if (c.hold > 1.6 + c.text.length / 30) { this.current = null; this.subText.setText(''); this.subName.setText(''); }
      }
    }

    // World-anchored lines
    const cam = gs.cameras.main;
    for (const wl of this.worldLines) {
      wl.t += dt;
      const f = wl.follow;
      const fx = f ? f.x : cam.worldView.centerX;
      const fy = f ? (f.body ? f.body.top : f.y) : cam.worldView.centerY;
      const rise = wl.speaker === 'whisper' ? wl.t * 10 : 0;
      wl.text.setPosition(fx - cam.worldView.x + wl.drift, fy - cam.worldView.y - 24 - rise);
      const a = wl.t < 0.3 ? wl.t / 0.3 : wl.t > wl.life - 0.5 ? Math.max(0, (wl.life - wl.t) / 0.5) : 1;
      wl.text.setAlpha(a * (wl.speaker === 'whisper' ? 0.9 + Math.sin(wl.t * 9) * 0.1 : 1));
    }
    this.worldLines = this.worldLines.filter((wl) => { if (wl.t > wl.life) { wl.text.destroy(); return false; } return true; });

    // Hint timer
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) {
        if (this.hintQueue.length) this.showHint(this.hintQueue.shift());
        else this.tweens.add({ targets: [this.hint, this.hintBg], alpha: 0, duration: 500 });
      }
    }

    // Prompt
    if (gs.prompt && !gs.modal) {
      this.promptText.setText(gs.prompt.text).setPosition(gs.prompt.x - cam.worldView.x, gs.prompt.y - cam.worldView.y).setVisible(true);
    } else this.promptText.setVisible(false);

    if (this.branchPanel.visible) this.updateBranchInput();
    if (this.pausePanel.visible) this.updatePauseInput();
  }

  // ------------------------------------------------------------------
  // Branch panel
  // ------------------------------------------------------------------
  buildBranchPanel() {
    const { W, H } = this;
    const c = this.add.container(0, 0).setVisible(false).setDepth(100);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0));
    const pw = 920, ph = 640, px = (W - pw) / 2, py = (H - ph) / 2;
    c.add(this.add.rectangle(px, py, pw, ph, 0x0b0a12, 0.97).setOrigin(0).setStrokeStyle(1, 0xe8c372, 0.5));
    this.bTitle = this.add.text(W / 2, py + 26, '', { fontFamily: TITLE, fontSize: '30px', color: GOLD }).setOrigin(0.5, 0);
    this.bSub = this.add.text(W / 2, py + 70, '', { fontFamily: SERIF, fontStyle: 'italic', fontSize: '20px', color: '#a9a3bd' }).setOrigin(0.5, 0);
    c.add([this.bTitle, this.bSub]);
    this.bCards = [];
    for (let i = 0; i < 2; i++) {
      const cx = px + 30 + i * 440, cy = py + 108;
      const card = this.add.rectangle(cx, cy, 420, 290, 0x14121d, 1).setOrigin(0).setStrokeStyle(1, 0x4a4458, 1);
      const label = this.add.text(cx + 18, cy + 14, '', { fontFamily: TITLE, fontSize: '21px', color: '#f1e6cf' });
      const body = this.add.text(cx + 18, cy + 50, '', { fontFamily: SERIF, fontSize: '19px', color: '#d8d0e6', wordWrap: { width: 384 }, lineSpacing: 2 });
      c.add([card, label, body]);
      this.bCards.push({ card, label, body });
    }
    this.bMods = this.add.text(px + 34, py + 414, '', { fontFamily: SERIF, fontSize: '19px', color: '#bdb6cf', lineSpacing: 4 });
    this.bVision = this.add.text(px + 34, py + 504, '', { fontFamily: SERIF, fontStyle: 'italic', fontSize: '20px', color: '#cfe2ff', wordWrap: { width: pw - 68 } });
    this.bFooter = this.add.text(W / 2, py + ph - 30, '', { fontFamily: SANS, fontSize: '15px', color: '#8f8aa3' }).setOrigin(0.5);
    c.add([this.bMods, this.bVision, this.bFooter]);
    this.branchPanel = c;
  }

  // Keys pressed on the frame a panel opens must not also act inside it.
  consumeKeys() {
    for (const key of Object.values(this.keys)) Phaser.Input.Keyboard.JustDown(key);
  }

  openBranch(d) {
    this.consumeKeys();
    this.bData = d;
    this.bSel = 0;
    this.bStage = 'choose';
    this.bTitle.setText(d.text.title);
    this.bSub.setText(d.text.subtitle);
    this.renderBranch();
    this.branchPanel.setVisible(true);
    AUDIO.play('foresightIn');
  }

  futureLines(opt, highlight = null) {
    const d = this.bData;
    const t = d.text.options[opt.id];
    if (!opt.rolled) return `Certain:  ${t.certain}`;
    return BR.OUTCOMES.map((o) => {
      const mark = highlight === o ? '>  ' : '';
      return `${mark}${BR.band(d.odds[o])}:  ${t.futures[o]}`;
    }).join('\n\n');
  }

  renderBranch(highlight = null) {
    const d = this.bData;
    d.options.forEach((opt, i) => {
      const card = this.bCards[i];
      if (!card) return;
      const sel = i === this.bSel;
      card.card.setStrokeStyle(sel ? 2 : 1, sel ? 0xe8c372 : 0x4a4458, 1).setFillStyle(sel ? 0x1c1928 : 0x14121d, 1);
      card.label.setText(d.text.options[opt.id].label).setColor(sel ? GOLD : '#d8d0e6');
      card.body.setText(this.futureLines(opt, i === this.bSel ? highlight : null));
    });
    const modLines = d.mods.map((m) => `${m.active ? '[x]' : '[  ]'}  ${m.label}   (${m.shift > 0 ? '+' : ''}${m.shift} to the good outcome)`);
    this.bMods.setText(`What shifts these odds:\n${modLines.join('\n')}`);
    const opt = d.options[this.bSel];
    if (this.bStage === 'choose') {
      if (opt.rolled) {
        this.bVision.setText(d.hasShard
          ? `A vision, one possible future among these:  ${d.text.options[opt.id].futures[d.vision]}`
          : 'With an Hour-Shard, Foresight would show you a vision of one possible future here.').setColor(d.hasShard ? '#cfe2ff' : '#6f6a82');
      } else this.bVision.setText('');
      this.bFooter.setText('Left / Right  choose        E  commit        Esc  not yet (prepare first)');
    }
  }

  updateBranchInput() {
    const k = this.keys;
    const J = Phaser.Input.Keyboard.JustDown;
    const pad = this.input.gamepad?.total ? this.input.gamepad.getPad(0) : null;
    if (this.bStage === 'choose') {
      if (J(k.LEFT) || J(k.A)) { this.bSel = 0; AUDIO.play('ui'); this.renderBranch(); }
      if (J(k.RIGHT) || J(k.D)) { this.bSel = Math.min(this.bData.options.length - 1, 1); AUDIO.play('ui'); this.renderBranch(); }
      if (J(k.E) || J(k.ENTER) || J(k.SPACE)) {
        AUDIO.play('uiSelect');
        this.bStage = 'rolling';
        bus.emit('branch:choose', this.bData.options[this.bSel].id);
      }
      if (J(k.ESC)) {
        this.branchPanel.setVisible(false);
        this.gs().branch = null;
        bus.emit('branch:close');
      }
    } else if (this.bStage === 'result') {
      if (J(k.E) || J(k.ENTER) || J(k.SPACE)) {
        AUDIO.play('uiSelect');
        this.branchPanel.setVisible(false);
        bus.emit('branch:close');
      }
      if (this.bCanReweave && J(k.R)) {
        this.bCanReweave = false;
        this.bStage = 'rolling';
        bus.emit('branch:reweave');
      }
    }
    void pad;
  }

  branchResult(r) {
    const d = this.bData;
    const opt = d.options.find((o) => o.id === r.choice);
    const results = d.text.results;
    if (!opt.rolled) {
      this.bStage = 'result';
      this.bVision.setText(results.silent).setColor('#e9e2f5');
      this.bFooter.setText('E  continue');
      return;
    }
    // A short roll: the highlight runs over the futures, then settles.
    AUDIO.play('roll');
    let i = 0;
    const order = BR.OUTCOMES;
    this.bVision.setText(r.reweaved ? 'The thread is pulled loose and rewoven...' : 'The future settles...').setColor('#a9a3bd');
    this.bFooter.setText('');
    this.time.addEvent({
      delay: 120, repeat: 9,
      callback: () => {
        i++;
        const h = i >= 10 ? r.outcome : order[i % 3];
        this.renderBranch(h);
        if (i >= 10) {
          this.bStage = 'result';
          this.bCanReweave = r.canReweave;
          this.bVision.setText(results[r.outcome]).setColor(r.outcome === 'favorable' ? '#f1e6cf' : r.outcome === 'mixed' ? '#d9cbb0' : '#ff9a7a');
          this.bFooter.setText(r.canReweave ? 'E  accept        R  Reweave this future (costs a Thread, once per world)' : 'E  continue');
          AUDIO.play(r.outcome === 'unfavorable' ? 'alert' : 'uiSelect');
        }
      },
    });
  }

  // ------------------------------------------------------------------
  // Pause menu, Ledger, Controls
  // ------------------------------------------------------------------
  buildPauseMenu() {
    const { W, H } = this;
    const c = this.add.container(0, 0).setVisible(false).setDepth(110);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.78).setOrigin(0));
    this.pTitle = this.add.text(W / 2, 90, 'PAUSED', { fontFamily: TITLE, fontSize: '34px', color: GOLD, letterSpacing: 8 }).setOrigin(0.5);
    this.pItems = [];
    for (let i = 0; i < 7; i++) {
      const t = this.add.text(W / 2, 180 + i * 48, '', { fontFamily: SERIF, fontSize: '28px', color: '#d8d0e6' }).setOrigin(0.5);
      this.pItems.push(t);
    }
    this.pBody = this.add.text(W / 2, 160, '', { fontFamily: SERIF, fontSize: '22px', color: '#d8d0e6', align: 'left', wordWrap: { width: 900 }, lineSpacing: 6 }).setOrigin(0.5, 0);
    this.pFooter = this.add.text(W / 2, H - 50, '', { fontFamily: SANS, fontSize: '15px', color: '#8f8aa3' }).setOrigin(0.5);
    c.add([this.pTitle, ...this.pItems, this.pBody, this.pFooter]);
    this.pausePanel = c;
  }

  menuEntries() {
    const gs = this.gs();
    const s = gs.settings;
    if (this.pView === 'settings') {
      return [
        ['Sound: ' + (s.muted ? 'off' : 'on'), () => toggleSound(this.registry)],
        ['Screen shake: ' + (s.shake ? 'on' : 'off'), () => { s.shake = !s.shake; }],
        ['Always show Substance: ' + (s.fullHud ? 'on' : 'off'), () => { s.fullHud = !s.fullHud; }],
        ['Back', () => { this.pView = 'menu'; this.pSel = 0; }],
      ];
    }
    const unravelCost = gs.level.noThreads ? '' : '  (costs a Thread)';
    return [
      ['Resume', () => this.closePause()],
      ['Ledger', () => { this.pView = 'ledger'; }],
      ['Controls', () => { this.pView = 'controls'; }],
      ['Settings', () => { this.pView = 'settings'; this.pSel = 0; }],
      [`Unravel to last Stillpoint${unravelCost}`, () => { this.pausePanel.setVisible(false); bus.emit('pause:unravel'); }],
      ['Quit to title', () => { this.pausePanel.setVisible(false); bus.emit('pause:quit'); }],
    ];
  }

  openPause(tab) {
    this.consumeKeys();
    this.pView = tab === 'ledger' ? 'ledger' : 'menu';
    this.pSel = 0;
    this.pausePanel.setVisible(true);
    this.renderPause();
  }

  closePause() {
    this.pausePanel.setVisible(false);
    bus.emit('pause:resume');
  }

  renderPause() {
    const view = this.pView;
    const list = view === 'menu' || view === 'settings';
    this.pItems.forEach((t) => t.setVisible(false));
    this.pBody.setVisible(!list);
    if (list) {
      this.pTitle.setText(view === 'settings' ? 'SETTINGS' : 'PAUSED');
      this.menuEntries().forEach(([label], i) => {
        this.pItems[i].setVisible(true).setText(label).setColor(i === this.pSel ? GOLD : '#a9a3bd').setScale(i === this.pSel ? 1.05 : 1);
      });
      this.pFooter.setText('Up / Down  choose      E  select      Esc  resume');
    } else if (view === 'ledger') {
      const d = GAME.data;
      this.pTitle.setText('THE LEDGER');
      const lines = d.ledger.map((k) => LEDGER_TEXT[k] ?? k);
      const codex = d.codex.length ? d.codex.map((c) => `${c}: ${COMBOS[c]}`).join('\n') : 'None yet.';
      this.pBody.setText(
        `${lines.length ? lines.join('\n') : 'Nothing has been written yet.'}\n\n` +
        `Threads: ${d.threads}      Sand: ${d.sand}/${d.sandMax}      Hour-Shard: ${d.hourShards.hollowmere ? 'found' : 'not found'}\n\n` +
        `COMBO CODEX\n${codex}`,
      );
      this.pFooter.setText('Esc  back');
    } else if (view === 'controls') {
      this.pTitle.setText('CONTROLS');
      this.pBody.setText(CONTROLS.map(([a, b]) => `${a.padEnd(26, ' ')}${b}`).join('\n') + `\n\n${GAMEPAD_CONTROLS}`).setFontFamily('Inter, Arial, sans-serif').setFontSize(19);
      this.pFooter.setText('Esc  back');
    }
    if (view !== 'controls') this.pBody.setFontFamily(SERIF).setFontSize(22);
  }

  updatePauseInput() {
    const k = this.keys;
    const J = Phaser.Input.Keyboard.JustDown;
    const view = this.pView;
    if (view === 'menu' || view === 'settings') {
      const entries = this.menuEntries();
      if (J(k.UP) || J(k.W)) { this.pSel = (this.pSel + entries.length - 1) % entries.length; AUDIO.play('ui'); this.renderPause(); }
      if (J(k.DOWN) || J(k.S)) { this.pSel = (this.pSel + 1) % entries.length; AUDIO.play('ui'); this.renderPause(); }
      if (J(k.E) || J(k.ENTER) || J(k.SPACE)) {
        AUDIO.play('uiSelect');
        entries[this.pSel][1]();
        if (this.pausePanel.visible) this.renderPause();
      }
      if (J(k.ESC)) {
        if (view === 'settings') { this.pView = 'menu'; this.pSel = 3; this.renderPause(); }
        else this.closePause();
      }
    } else if (J(k.ESC) || J(k.TAB) || J(k.E)) {
      this.pView = 'menu';
      this.renderPause();
    }
  }
}
