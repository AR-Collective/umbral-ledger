// Dev-only switches. Systems read these; the dev panel writes them.
// They are saved in the browser so they survive a page reload while you iterate.

const KEY = 'umbral-ledger-dev';

export const DEV = {
  god: false,             // no light damage, cannot be grabbed
  invisible: false,       // watchers cannot see or hear you
  infiniteSand: false,
  infiniteThreads: false,
  lightDebug: false,      // grid of light samples over the screen
  aiDebug: false,         // always show cones, meters and noise rings
  colliders: false,       // physics boxes
  noclip: false,          // fly through walls with the arrow keys
  forceBell: 'random',    // random | favorable | mixed | unfavorable
  forceFork: 'random',    // random | high | low
  skipCutscenes: false,
  autoResume: false,      // reload straight back to the last dev jump
  lastJump: null,
};

export function loadDev() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(DEV, JSON.parse(raw));
  } catch { /* storage blocked: defaults are fine */ }
}

export function saveDev() {
  try { localStorage.setItem(KEY, JSON.stringify(DEV)); } catch { /* ignore */ }
}
