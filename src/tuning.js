// =====================================================================
// TUNING: every gameplay number lives here.
//
// Why one file: when a playtester says "the light kills me too fast" or
// "the Lanternmen are too easy", you should change ONE number in ONE place
// and see the result on the next reload. Nothing else in the code hardcodes
// these values. The dev menu (press the ` key) also edits many of them live.
// =====================================================================

export const TUNING = {
  // Screen size the game is designed for. The canvas scales to fit any window.
  view: { width: 1280, height: 720 },

  physics: {
    gravity: 1600,       // pixels per second squared
    maxFall: 900,        // terminal falling speed
  },

  player: {
    bodyW: 26, bodyH: 52,         // collision box while standing
    mergedH: 30,                  // collision box height while merged into the shade
    runSpeed: 240,
    mergedSpeed: 70,
    groundAccel: 2200, groundDecel: 2800, airAccel: 1400,
    jumpVelocity: 680,            // about 144 px high, about 200 px across at full speed
    jumpCutVelocity: 430,         // releasing jump early cuts the arc here (a tap still hops about 58 px)
    coyoteTime: 0.10,             // you can still jump this long after walking off a ledge
    jumpBuffer: 0.12,             // pressing jump this early before landing still counts
    dashSpeed: 560, dashTime: 0.16, dashCooldown: 0.9,
    strikeRange: 46, strikeCooldown: 0.5,
    ambushWindow: 0.35,           // striking within this many seconds of leaving Merge counts as an Ambush
    maxSubstance: 100,
    interactRange: 70,
  },

  // Light damage. "resistance" is indexed by how many soul fragments have returned.
  // Level 0 is the very start: the shadow has almost no tolerance for light.
  // Each returned fragment moves one step down the table.
  light: {
    ambient: { prologue: 0.07, hollowmere: 0.12 },
    darkMax: 0.8,           // how strongly an unlit area is darkened on screen (0 to 1)
    shadeMax: 0.28,         // light value below this is Shade
    dimMax: 0.55,           // below this is Dim, at or above is Light
    lightmapScale: 0.5,     // light is rendered at half resolution (soft edges, cheaper)
    resistance: [
      // grace: seconds in Light before burning starts
      // dpsStart/dpsMax: burn per second at the start of exposure and after rampTime
      // dimDps: Dim also hurts while resistance is this low
      { grace: 0.30, dpsStart: 26, dpsMax: 62, rampTime: 1.4, dimDps: 7, fireMult: 1.6 },
      { grace: 0.40, dpsStart: 22, dpsMax: 52, rampTime: 1.6, dimDps: 4, fireMult: 1.5 },
      { grace: 0.50, dpsStart: 18, dpsMax: 44, rampTime: 1.8, dimDps: 0, fireMult: 1.5 },
      { grace: 0.60, dpsStart: 15, dpsMax: 36, rampTime: 2.0, dimDps: 0, fireMult: 1.4 },
      { grace: 0.70, dpsStart: 12, dpsMax: 30, rampTime: 2.2, dimDps: 0, fireMult: 1.4 },
      { grace: 0.80, dpsStart: 10, dpsMax: 25, rampTime: 2.4, dimDps: 0, fireMult: 1.3 },
      { grace: 0.90, dpsStart: 8,  dpsMax: 20, rampTime: 2.6, dimDps: 0, fireMult: 1.3 },
      { grace: 1.00, dpsStart: 6,  dpsMax: 16, rampTime: 2.8, dimDps: 0, fireMult: 1.2 },
    ],
    regenDelay: 1.0,        // seconds without damage before Substance regrows in Shade
    regenPerSec: 22,
  },

  stealth: {
    // How far a watcher can see you, by the light YOU are standing in.
    range: { light: 380, dim: 250, shade: 130 },
    adjacent: 40,                // they notice you this close even outside the cone (needs line of sight)
    cone: 38, alertCone: 65,     // half-angle of the vision cone in degrees
    // Merging changes how visible you are, per light state. 0 means invisible.
    merge: { light: 0.9, dim: 0.55, shade: 0.0 },
    // Seconds to fill the detection meter at medium distance, per light state.
    fillTime: { light: 0.55, dim: 1.1, shade: 1.8 },
    movingMult: 1.25, stillMult: 0.8,
    searchMult: 1.5,             // already-searching watchers spot you faster
    suspiciousAt: 0.35,          // meter level that triggers the "?" state
    doubleTake: 0.35,            // seconds the meter pauses at "?" so you can react (fairness valve)
    decay: 0.25,                 // meter drain per second when they cannot see you
    loseTime: 1.3,               // alert watchers who lose sight this long start searching
    searchTime: 10,
    lookTime: 3.2,               // suspicious watchers look around this long before giving up
    callRadius: 340,             // an alert watcher wakes others this close
    fogVision: 0.45,             // full fog cuts vision range by this fraction
    survivorCrouchMult: 0.55,
    coneShowDistance: 420,       // vision cones are drawn when you are this close to a watcher
  },

  noise: {
    step: 60, landSoft: 70, landHard: 150, dash: 90, whiff: 130, takedown: 140, bell: 2400,
  },

  enemies: {
    lanternman: {
      walk: 62, chase: 270, eyeH: 58, grab: 30, killable: true,
      lantern: { radius: 270, intensity: 0.92, spread: 42, glowRadius: 95, glowIntensity: 0.72 },
    },
    guardian: {
      walk: 55, chase: 175, eyeH: 74, grab: 32, killable: false,
      lantern: { radius: 300, intensity: 0.9, spread: 36, glowRadius: 110, glowIntensity: 0.7 },
    },
    acolyte: {
      walk: 40, chase: 150, eyeH: 40, grab: 26, killable: true, lantern: null,
    },
  },

  wickMother: {
    // She walks a little slower than you run, but her lunges make her faster
    // on average. Shade Step (dash) is how you keep your lead.
    speed: 205, catchUpSpeed: 270, catchUpDistance: 520,
    lungeEvery: [3.5, 5.5], lungeTell: 0.8, lungeDistance: 230, lungeTime: 0.5,
    lungeRange: 560,
    lightRadius: 420, lightIntensity: 0.85, coneRadius: 700, coneSpread: 30, coneIntensity: 0.95, coneDir: 48,
    startBehind: 430, startBehindUnlucky: 320,
  },

  survivor: { walk: 190, crouchWalk: 70, followGap: 52, hop: 560, giveUpDistance: 700 },

  foresight: {
    sipSeconds: 3,          // how far ahead a Sip looks
    glimpseSeconds: 6,      // with the Hollowmere Hour-Shard
    playbackSpeed: 2,       // the ghost replay loops this many times faster than real time
    desaturate: 0.85,
  },

  dawn: {
    startElevation: 12, endElevation: 45,  // sun angle in degrees during the chase
    duration: 26,                          // seconds from first light to full morning
    sunIntensity: 0.9,
  },

  threads: { perWorld: 3 },
  sand: { max: 3 },

  // Heavy branch odds rules
  branches: {
    minChance: 5,           // no outcome is ever pushed below 5%
    badLuckBonus: 10,       // each unlucky Heavy roll adds this to the next Favorable
  },

  // Dev mode: set enabled to false for the trailer or judging build.
  dev: { enabled: true },
};

// Returns the resistance row for a given fragment count, clamped to the table.
export function resistanceFor(level) {
  const table = TUNING.light.resistance;
  return table[Math.max(0, Math.min(table.length - 1, level))];
}
