// The sound switch: off until the player turns it on, remembered between visits.
//
// One switch, shown in the top-right of the title, the HUD and cutscenes. The
// M key and the Settings menu flip the same switch, so every copy stays in step.

import { AUDIO } from './audio.js';
import { bus } from './bus.js';

const KEY = 'umbral-ledger-sound';

export function loadSoundOn() {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
}

// Turn sound on or off. Turning it on is always a click or key press, which is
// the user gesture browsers require before audio can start.
export function setSound(registry, on) {
  const s = registry.get('settings');
  s.muted = !on;
  if (on) AUDIO.unlock();
  AUDIO.setMuted(!on);
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* storage blocked */ }
  bus.emit('sound:changed', on);
}

export function toggleSound(registry) {
  setSound(registry, registry.get('settings').muted);
}

// A speaker icon that flips the switch. scale: 2 in the 2x cutscene framebuffer.
export function addSoundToggle(scene, x, y, scale = 1) {
  makeIcons(scene);
  const on = () => !scene.registry.get('settings').muted;
  const icon = scene.add.image(x, y, on() ? 'icon_sound_on' : 'icon_sound_off')
    .setScale(scale).setDepth(200).setAlpha(0.75).setInteractive({ useHandCursor: true });
  icon.on('pointerover', () => icon.setAlpha(1));
  icon.on('pointerout', () => icon.setAlpha(0.75));
  icon.on('pointerdown', (pointer, lx, ly, event) => { event?.stopPropagation?.(); toggleSound(scene.registry); });
  const sync = (v) => icon.setTexture(v ? 'icon_sound_on' : 'icon_sound_off');
  bus.on('sound:changed', sync);
  scene.events.once('shutdown', () => bus.off('sound:changed', sync));
  return icon;
}

function makeIcons(scene) {
  if (scene.textures.exists('icon_sound_on')) return;
  for (const [key, on] of [['icon_sound_on', true], ['icon_sound_off', false]]) {
    const tex = scene.textures.createCanvas(key, 30, 26);
    const ctx = tex.getContext();
    ctx.fillStyle = on ? '#e8c372' : '#8f8aa3';
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath(); ctx.moveTo(2, 9); ctx.lineTo(8, 9); ctx.lineTo(14, 3); ctx.lineTo(14, 23); ctx.lineTo(8, 17); ctx.lineTo(2, 17); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (on) {
      ctx.beginPath(); ctx.arc(15, 13, 5, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(15, 13, 10, -0.9, 0.9); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(19, 8); ctx.lineTo(28, 18); ctx.moveTo(28, 8); ctx.lineTo(19, 18); ctx.stroke();
    }
    tex.refresh();
  }
}
